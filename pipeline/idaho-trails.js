// Install Idaho county money trails: each county's filed budget PDF read fund by
// fund (and office by office), every number tied to its PDF page, checked against
// the total the county reported to the State Controller.
//
// Usage: node pipeline/idaho-trails.js <folder>
//   <folder>/trail/<File-YYYY>.json   one per county (format below)
//   <folder>/counties.tsv             file, county, geoid, fy, controller totals, PDF url
// → data/national/idaho-trails.json, shown on /us/id/<county> under "Follow the money".
//
// Trail format: { county, geoid, fy, file, basis: adopted|proposed, title, total,
//   funds: [{ name, amount, page, depts?: [{ name, amount, page }], depts_note? }],
//   notes?: [], corrections?: [], controller_note? }  or { ..., unusable: "why" }.
// Departments must add to their fund and funds to the total; the script refuses
// any county that doesn't.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'national', 'idaho-trails.json');

const dir = process.argv[2];
if (!dir) { console.error('Usage: node pipeline/idaho-trails.js <folder>'); process.exit(1); }
const ID = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'idaho.json'), 'utf8'));
const rows = fs.readFileSync(path.join(dir, 'counties.tsv'), 'utf8').trim().split(/\r?\n/).slice(1).map(l => l.split('\t'));
const ocrFiles = new Set(fs.readdirSync(path.join(dir, 'txt')).filter(f => /===\s*PAGE 1\s*===/.test(fs.readFileSync(path.join(dir, 'txt', f), 'utf8').slice(0, 200))).map(f => f.replace(/\.txt$/, '')));

const out = { how: 'Read by hand from each county’s budget PDF as filed with the Idaho State Controller (Transparent Idaho). Scanned filings were read with text recognition and corrected using their own column totals. Every fund and department carries the PDF page it came from; funds are summed and compared with the total the county reported to the Controller.', built: new Date().toISOString().slice(0, 10), counties: {} };
const skipped = [];
// Built but not published: the trail doesn't reconcile closely enough to show.
const HOLD = { 'Butte-2024': 'line-item detail with no fund names; sums to about twice the Controller total' };
for (const [file, county, geoid, fy, ctl, , url] of rows) {
  const fp = path.join(dir, 'trail', file + '.json');
  if (!fs.existsSync(fp)) { skipped.push(`${file}: not built`); continue; }
  const t = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (t.unusable) { skipped.push(`${file}: ${t.unusable}`); continue; }
  const sum = t.funds.reduce((s, f) => s + f.amount, 0);
  if (Math.abs(sum - t.total) > 1) { skipped.push(`${file}: funds don't add to total`); continue; }
  const badFund = t.funds.find(f => f.depts && f.depts.length && !f.depts_note && Math.abs(f.depts.reduce((s, d) => s + d.amount, 0) - f.amount) > 1);
  if (badFund) { skipped.push(`${file}: ${badFund.name} departments don't add`); continue; }
  if (!ID.counties[geoid]) { skipped.push(`${file}: unknown geoid ${geoid}`); continue; }
  if (HOLD[file]) { skipped.push(`${file}: held back — ${HOLD[file]}`); continue; }
  if (out.counties[geoid]) { skipped.push(`${file}: a second trail for ${county}; kept the first`); continue; }
  out.counties[geoid] = {
    county, fy: Number(t.fy || fy), url, basis: t.basis || 'adopted', title: t.title || null, total: Math.round(t.total * 100) / 100,
    controller_total: (ID.counties[geoid].years[Number(t.fy || fy)] || {}).expense_budget || null, ocr: ocrFiles.has(file) || undefined,
    funds: t.funds.slice().sort((a, b) => b.amount - a.amount).map(f => ({ name: f.name, amount: f.amount, page: f.page, depts: f.depts && f.depts.length ? f.depts.map(d => ({ name: d.name, amount: d.amount, page: d.page })) : undefined, depts_note: f.depts_note || undefined })),
    notes: t.notes && t.notes.length ? t.notes : undefined, corrections: t.corrections && t.corrections.length ? t.corrections : undefined,
    controller_note: t.controller_note || undefined
  };
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
const n = Object.keys(out.counties).length;
const matched = Object.values(out.counties).filter(t => t.controller_total && Math.abs(t.total - t.controller_total) / t.controller_total <= 0.005).length;
console.log(`${n} county trails → ${path.relative(ROOT, OUT)} (${matched} match the Controller's total within 0.5%)`);
for (const s of skipped) console.log('  skipped ' + s);
