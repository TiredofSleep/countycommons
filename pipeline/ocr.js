// OCR for scanned minutes: extracts each page's embedded scan image and runs
// tesseract.js over it. Output goes to data/review/<name>-ocr.txt for human
// review — OCR text is a research aid, never corpus truth by itself.
//
// Usage: node pipeline/ocr.js inbox/minutes/<file>.pdf

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { ocrReadyPng } = require('./lib-ocr');

const ROOT = path.join(__dirname, '..');
const REVIEW = path.join(ROOT, 'data', 'review');

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node pipeline/ocr.js <pdf>'); process.exit(1); }
  const fp = path.isAbsolute(file) ? file : path.join(ROOT, file);

  const buf = fs.readFileSync(fp);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const imgs = await parser.getImage();
  const pages = imgs.pages || [];
  console.log(`${pages.length} pages of scan images; running OCR...`);

  const worker = await createWorker('eng');
  let out = '';
  for (const pg of pages) {
    for (const im of (pg.images || [])) {
      if (!im.dataUrl) continue;
      const { data } = await worker.recognize(ocrReadyPng(im));
      out += `\n===== page ${pg.pageNumber} =====\n${data.text}\n`;
      process.stdout.write(`  p${pg.pageNumber} done (${data.text.length} chars)\n`);
    }
  }
  await worker.terminate();
  await parser.destroy();

  fs.mkdirSync(REVIEW, { recursive: true });
  const outPath = path.join(REVIEW, path.basename(file).replace(/\.pdf$/i, '') + '-ocr.txt');
  fs.writeFileSync(outPath, out.trim());
  console.log(`OCR text → ${path.relative(ROOT, outPath)}`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
