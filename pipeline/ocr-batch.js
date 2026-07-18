// Batch OCR over every scanned PDF in a directory. Skips non-PDFs and files
// already OCR'd (existing -ocr.txt in data/review). Writes a summary JSON so
// the run is resumable and auditable.
//
// Usage: node pipeline/ocr-batch.js inbox/minutes

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { ocrReadyPng } = require('./lib-ocr');

const ROOT = path.join(__dirname, '..');
const REVIEW = path.join(ROOT, 'data', 'review');

async function main() {
  const dir = process.argv[2] || 'inbox/minutes';
  const abs = path.join(ROOT, dir);
  const files = fs.readdirSync(abs).filter(f => f.toLowerCase().endsWith('.pdf'));
  fs.mkdirSync(REVIEW, { recursive: true });

  const worker = await createWorker('eng');
  const summary = [];
  for (const f of files) {
    const outPath = path.join(REVIEW, f.replace(/\.pdf$/i, '') + '-ocr.txt');
    if (fs.existsSync(outPath)) { summary.push({ file: f, status: 'already-done' }); continue; }
    const buf = fs.readFileSync(path.join(abs, f));
    if (buf.slice(0, 5).toString() !== '%PDF-') { summary.push({ file: f, status: 'not-a-pdf' }); continue; }
    try {
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const imgs = await parser.getImage();
      let out = '', chars = 0, pages = 0;
      for (const pg of (imgs.pages || [])) {
        for (const im of (pg.images || [])) {
          if (!im.dataUrl) continue;
          const { data } = await worker.recognize(ocrReadyPng(im));
          out += `\n===== page ${pg.pageNumber} =====\n${data.text}\n`;
          chars += data.text.length; pages++;
        }
      }
      await parser.destroy();
      fs.writeFileSync(outPath, out.trim());
      summary.push({ file: f, status: 'ok', pages, chars });
      console.log(`ok   ${f} — ${pages} images, ${chars} chars`);
    } catch (e) {
      summary.push({ file: f, status: 'error', error: e.message });
      console.log(`FAIL ${f} — ${e.message}`);
    }
  }
  await worker.terminate();
  fs.writeFileSync(path.join(REVIEW, 'ocr-batch-summary.json'), JSON.stringify({ run_at: new Date().toISOString(), dir, summary }, null, 2));
  const ok = summary.filter(s => s.status === 'ok').length;
  console.log(`\nDone: ${ok} OCR'd, ${summary.filter(s => s.status === 'already-done').length} already done, ${summary.filter(s => s.status !== 'ok' && s.status !== 'already-done').length} skipped/failed.`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
