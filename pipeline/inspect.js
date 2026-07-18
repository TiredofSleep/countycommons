// Quick corpus-prep utility: page count + text sniff for a PDF in inbox/.
// Usage: node pipeline/inspect.js <file> [searchTerm...]

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function main() {
  const file = process.argv[2];
  const terms = process.argv.slice(3);
  const buf = fs.readFileSync(path.resolve(file));
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const result = await parser.getText();
  const pages = result.pages || [];
  console.log(`${file}: ${pages.length} pages, ${result.text.length} chars of extractable text`);
  if (result.text.length < 100) console.log('NOTE: almost no text layer — likely a pure scan needing OCR.');
  for (const t of terms) {
    const hits = [];
    pages.forEach((p, i) => { if ((p.text || '').toLowerCase().includes(t.toLowerCase())) hits.push(i + 1); });
    console.log(`  "${t}": ${hits.length ? 'pages ' + hits.slice(0, 12).join(', ') : 'NOT FOUND'}`);
  }
  if (!terms.length) console.log('First 400 chars:\n' + result.text.slice(0, 400).replace(/\s+/g, ' '));
  await parser.destroy();
}
main().catch(e => { console.error(e.message); process.exit(1); });
