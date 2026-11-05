// Install county money trails read from each county's own adopted budget
// document (the big counties with no state portal that collects them): every
// group and department tied to the PDF page it came from, and the sum checked
// against the grand total the document itself prints.
//
// Usage: node pipeline/county-trails.js <folder>
//   <folder>/trail/<geoid>.json   one per county (format below)
// → data/national/county-trails.json, shown on /us/<st>/<county> under
//   "Follow the money" and fed line by line into /us/<st>/<county>/compare.
//   Re-running adds to and replaces counties already in the file; it never
//   drops one that isn't in the folder.
//
// Trail format: { county, geoid, st, fy, fy_label, basis: adopted|recommended|proposed,
//   title, url, years_covered, scope, grouped_by: fund|function|department,
//   stated_total, stated_page, stated_label, total,
//   funds: [{ name, amount, page, depts?: [{ name, amount, page }], depts_note? }],
//   notes?: [], corrections?: [], stated_note? }  or { ..., unusable: "why" }.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'national', 'county-trails.json');

const dir = process.argv[2];
if (!dir) { console.error('Usage: node pipeline/county-trails.js <folder>'); process.exit(1); }
const NAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
const geo = {}; for (const c of NAT.counties) geo[c.geoid] = c;

let out = { counties: {} };
try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
out.how = 'Read from each county’s own adopted budget document, downloaded from the county’s official website. Every group and department carries the PDF page it came from; the groups are summed and compared with the grand total the document prints.';
out.built = new Date().toISOString().slice(0, 10);
const skipped = [], added = [];
for (const f of fs.readdirSync(path.join(dir, 'trail')).filter(f => f.endsWith('.json'))) {
  const t = JSON.parse(fs.readFileSync(path.join(dir, 'trail', f), 'utf8'));
  const id = f.replace(/\.json$/, '');
  if (t.unusable) { skipped.push(`${id} ${t.county || ''}: ${t.unusable}`); continue; }
  if (!geo[t.geoid] || t.geoid !== id) { skipped.push(`${id}: unknown or mismatched geoid`); continue; }
  const sum = t.funds.reduce((s, g) => s + g.amount, 0);
  if (Math.abs(sum - t.total) > 2) { skipped.push(`${id}: groups don't add to the total`); continue; }
  const bad = t.funds.find(g => g.depts && g.depts.length && !g.depts_note && Math.abs(g.depts.reduce((s, d) => s + d.amount, 0) - g.amount) > Math.max(2, g.amount * 0.0005));
  if (bad) { skipped.push(`${id}: ${bad.name} departments don't add`); continue; }
  const off = t.stated_total ? Math.abs(t.total - t.stated_total) / t.stated_total : 1;
  if (off > 0.005 && !t.stated_note) { skipped.push(`${id}: total is ${(off * 100).toFixed(1)}% off the stated total with no explanation`); continue; }
  if (!/^https:\/\//.test(t.url || '')) { skipped.push(`${id}: no https source url`); continue; }
  out.counties[t.geoid] = {
    county: t.county, st: t.st, fy: Number(t.fy), fy_label: t.fy_label, basis: t.basis || 'adopted', title: t.title, url: t.url,
    years_covered: Number(t.years_covered) || 1, page_anchor: t.page_anchor || undefined, scope: t.scope, grouped_by: t.grouped_by,
    stated_total: t.stated_total, stated_page: t.stated_page, stated_label: t.stated_label, total: Math.round(t.total * 100) / 100,
    funds: t.funds.slice().sort((a, b) => b.amount - a.amount).map(g => ({ name: g.name, amount: g.amount, page: g.page, depts: g.depts && g.depts.length ? g.depts.map(d => ({ name: d.name, amount: d.amount, page: d.page })) : undefined, depts_note: g.depts_note || undefined })),
    notes: t.notes && t.notes.length ? t.notes : undefined, corrections: t.corrections && t.corrections.length ? t.corrections : undefined,
    stated_note: t.stated_note || undefined
  };
  added.push(`${t.county}, ${t.st}`);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`${added.length} trails installed (${Object.keys(out.counties).length} in ${path.relative(ROOT, OUT)}): ${added.join('; ')}`);
for (const s of skipped) console.log('  skipped ' + s);
