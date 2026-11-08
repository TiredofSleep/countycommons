// Install transparency-meter checks of county websites into
// data/national/transparency-checks.json (read by server/lib/transparency.js).
//
// Usage: node pipeline/transparency.js <folder>
//   <folder>/<geoid>.json  { geoid, county, checked: "YYYY-MM-DD",
//                            items: { <item>: { v: yes|partly|no, note, url, page? } } }
// Items: posted, current, by_office, line_items, adds_up, searchable,
// open_to_tools, actual, audit. Re-running replaces those counties and keeps the rest.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'national', 'transparency-checks.json');
const ITEMS = require('../server/lib/transparency').ITEMS.map(i => i[0]);

const dir = process.argv[2];
if (!dir) { console.error('Usage: node pipeline/transparency.js <folder>'); process.exit(1); }
const NAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
const geo = {}; for (const c of NAT.counties) geo[c.geoid] = c;
const out = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const ok = [], bad = [];
for (const f of fs.readdirSync(dir).filter(f => /^\d{5}\.json$/.test(f))) {
  const x = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const id = f.slice(0, 5);
  if (x.geoid !== id || !geo[id]) { bad.push(`${id}: geoid mismatch`); continue; }
  const items = {};
  for (const [k, o] of Object.entries(x.items || {})) {
    if (!ITEMS.includes(k)) { bad.push(`${id}: unknown item ${k}`); continue; }
    if (!['yes', 'partly', 'no'].includes(o.v)) { bad.push(`${id}: ${k} has v=${o.v}`); continue; }
    if (!o.note) { bad.push(`${id}: ${k} has no note`); continue; }
    if (o.url && !/^https:\/\//.test(o.url)) { bad.push(`${id}: ${k} url isn't https`); continue; }
    items[k] = { v: o.v, note: o.note, url: o.url || undefined, page: o.page || undefined };
  }
  out.counties[id] = { county: geo[id].name, st: geo[id].st, checked: x.checked, items };
  ok.push(`${geo[id].name}, ${geo[id].st} (${Object.keys(items).length})`);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`${ok.length} counties checked: ${ok.join('; ')}`);
for (const b of bad) console.log('  problem: ' + b);
