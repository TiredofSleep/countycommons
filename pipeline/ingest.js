// Ingestion pipeline v1 — the permanent shape is: extract → propose → human
// confirms → verifier gates publication. Nothing this script does ever writes
// to the corpus directly; it writes review files a human approves by hand
// (editing data/corpus/*.json), after which `npm run verify` must pass.
//
// Modes:
//   node pipeline/ingest.js extract <inbox-file>
//     Page-by-page text extraction; lines containing dollar amounts become
//     candidates. Output: data/review/<file>-draft.json
//
//   node pipeline/ingest.js pin <doc-id>
//     For every money-trail node, search the stored PDF for its exact amount
//     and propose page references. Output: data/review/<doc-id>-pins.json
//     A proposal with exactly one page hit is a strong pin candidate; multiple
//     hits mean a human must look. Nothing is applied automatically.

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const ROOT = path.join(__dirname, '..');
const REVIEW = path.join(ROOT, 'data', 'review');
const MONEY_RE = /\$?\d{1,3}(?:,\d{3})+(?:\.\d{2})?/g;

async function pagesOf(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const result = await parser.getText();
  const pages = (result.pages || []).map(p => p.text || '');
  await parser.destroy();
  return pages;
}

async function extract(file) {
  const fp = path.isAbsolute(file) ? file : path.join(ROOT, file);
  const pages = await pagesOf(fp);
  const draft = pages.map((text, i) => {
    const candidates = [];
    for (const line of text.split('\n')) {
      const amounts = (line.match(MONEY_RE) || [])
        .map(a => Number(a.replace(/[$,]/g, ''))).filter(n => n >= 100);
      if (amounts.length) candidates.push({ line: line.trim().slice(0, 160), amounts });
    }
    return { page: i + 1, candidate_lines: candidates.length, candidates };
  }).filter(p => p.candidate_lines > 0);

  fs.mkdirSync(REVIEW, { recursive: true });
  const out = path.join(REVIEW, path.basename(file).replace(/\.pdf$/i, '') + '-draft.json');
  fs.writeFileSync(out, JSON.stringify({
    source_file: file, extracted_at: new Date().toISOString(),
    total_pages: pages.length,
    note: 'DRAFT — machine-extracted candidates. A human converts accepted lines into corpus nodes; the verifier gates publication.',
    pages: draft
  }, null, 2));
  console.log(`${pages.length} pages scanned, ${draft.length} pages with money lines → ${path.relative(ROOT, out)}`);
}

async function pin(docId) {
  const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'corpus', 'budget-2026.json'), 'utf8'));
  const docs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'corpus', 'documents.json'), 'utf8'));
  const doc = docs.documents.find(d => d.id === docId);
  if (!doc || !doc.local_file) {
    console.error(`Document "${docId}" not found or has no stored file.`);
    process.exit(1);
  }
  const pages = await pagesOf(path.join(ROOT, doc.local_file));
  // Normalize page text: strip whitespace variance around digits so
  // "2,118,755" matches even when the text layer splits oddly.
  const norm = pages.map(t => t.replace(/\s+/g, ' '));

  const proposals = [];
  for (const n of corpus.nodes) {
    if (n.amount === null) continue;
    const needle = n.amount.toLocaleString('en-US');
    const hits = [];
    norm.forEach((t, i) => { if (t.includes(needle)) hits.push(i + 1); });
    proposals.push({
      node: n.id, name: n.name, amount: n.amount,
      current_page: n.source ? n.source.page : null,
      found_on_pages: hits,
      confidence: hits.length === 1 ? 'single-hit' : hits.length === 0 ? 'not-found' : 'multiple-hits'
    });
  }
  fs.mkdirSync(REVIEW, { recursive: true });
  const out = path.join(REVIEW, `${docId}-pins.json`);
  const single = proposals.filter(p => p.confidence === 'single-hit').length;
  const multi = proposals.filter(p => p.confidence === 'multiple-hits').length;
  const none = proposals.filter(p => p.confidence === 'not-found').length;
  fs.writeFileSync(out, JSON.stringify({
    document: docId, searched_at: new Date().toISOString(),
    note: 'PROPOSALS — page references suggested by exact-amount search. A human applies accepted pins to budget-2026.json (source.page) and may re-point source.doc to this document. Never applied automatically.',
    summary: { nodes_searched: proposals.length, single_hit: single, multiple_hits: multi, not_found: none },
    proposals
  }, null, 2));
  console.log(`${proposals.length} amounts searched in ${doc.id}: ${single} single-hit, ${multi} multiple-hit, ${none} not found → ${path.relative(ROOT, out)}`);
}

const [mode, arg] = process.argv.slice(2);
if (mode === 'extract' && arg) extract(arg).catch(die);
else if (mode === 'pin' && arg) pin(arg).catch(die);
else { console.log('Usage: node pipeline/ingest.js extract <inbox-file> | pin <doc-id>'); process.exit(1); }
function die(e) { console.error(e.message); process.exit(1); }
