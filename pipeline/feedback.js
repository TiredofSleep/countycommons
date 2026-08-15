#!/usr/bin/env node
// Read the support drop-box. Run on the server box:
//   ssh -i ~/.ssh/countycommons root@134.209.120.2 'cd /opt/countycommons && node pipeline/feedback.js'
// Screenshots referenced below live in data/feedback/ — scp them down to view.

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'data', 'feedback');
if (!fs.existsSync(dir)) {
  console.log('No feedback directory yet — no messages.');
  process.exit(0);
}
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
if (!files.length) {
  console.log('No messages.');
  process.exit(0);
}
console.log(`${files.length} message(s), oldest first:\n`);
for (const f of files) {
  let r;
  try { r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
  catch (e) { console.log(`— ${f}: unreadable (${e.message})\n`); continue; }
  console.log(`— ${r.ts}${r.page ? `  ·  ${r.page}` : ''}`);
  if (r.contact) console.log(`  reach them: ${r.contact}`);
  if (r.screenshot) console.log(`  screenshot: data/feedback/${r.screenshot}`);
  if (r.ua) console.log(`  browser: ${r.ua}`);
  console.log(`  ${String(r.message || '').replace(/\n/g, '\n  ')}\n`);
}
