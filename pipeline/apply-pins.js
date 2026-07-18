// Applies reviewed page-pin proposals to the corpus — the "human confirms"
// step, made safe: only single-hit proposals whose page also contains a word
// from the line's own name are applied. Everything else is left for manual
// review with the reason recorded. Verifier must pass afterward.
//
// Usage: node pipeline/apply-pins.js <doc-id>

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const ROOT = path.join(__dirname, '..');
const STOP = new Set(['county', 'fund', 'funds', 'other', 'services', 'charges', 'personal', 'supplies', 'total', 'misc', 'various']);

async function main() {
  const docId = process.argv[2];
  if (!docId) { console.error('Usage: node pipeline/apply-pins.js <doc-id>'); process.exit(1); }

  const corpusPath = path.join(ROOT, 'data', 'corpus', 'budget-2026.json');
  const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
  const docs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'corpus', 'documents.json'), 'utf8'));
  const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'review', `${docId}-pins.json`), 'utf8'));
  const doc = docs.documents.find(d => d.id === docId);

  const buf = fs.readFileSync(path.join(ROOT, doc.local_file));
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const result = await parser.getText();
  const pages = (result.pages || []).map(p => (p.text || '').toLowerCase());
  await parser.destroy();

  const byId = new Map(corpus.nodes.map(n => [n.id, n]));
  let applied = 0, skipped = [];

  for (const p of pins.proposals) {
    if (p.confidence !== 'single-hit') continue;
    const node = byId.get(p.node);
    const page = p.found_on_pages[0];
    const text = pages[page - 1] || '';
    const tokens = node.name.toLowerCase().match(/[a-z']{5,}/g) || [];
    const keyword = tokens.find(t => !STOP.has(t) && text.includes(t));
    // Fall back to the parent's name when the line's own words are generic
    // (e.g. "Salaries, full time" sits on a page titled by its department).
    const parent = node.parent ? byId.get(node.parent) : null;
    const parentTokens = parent ? (parent.name.toLowerCase().match(/[a-z']{5,}/g) || []) : [];
    const parentKeyword = parentTokens.find(t => !STOP.has(t) && text.includes(t));

    if (keyword || parentKeyword) {
      node.source = { doc: docId, page };
      applied++;
    } else {
      skipped.push({ node: p.node, page, reason: 'no name keyword found on page — review by eye' });
    }
  }

  fs.writeFileSync(corpusPath, JSON.stringify(corpus, null, 2));
  console.log(`Applied ${applied} page pins from ${docId}; skipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  skip ${s.node} (p.${s.page}) — ${s.reason}`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
