// Open a county's information petitions now, instead of waiting for the first
// signature: one copy of each ask whose transparency-meter box the county
// doesn't meet yet (not met, partly, or not checked). Idempotent.
//   node pipeline/asks.js <geoid> [<geoid> ...]          dry run
//   node pipeline/asks.js <geoid> [<geoid> ...] --post   open them
// Used for the home counties (Clark 05019, Garland 05051) so their own sites
// list every ask; every other county's copy opens with its first signature.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const A = require('../server/lib/asks');
const T = require('../server/lib/transparency');
const N = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
const post = process.argv.includes('--post');
for (const g of process.argv.slice(2).filter(a => /^\d{5}$/.test(a))) {
  const c = N.counties.find(x => x.geoid === g); if (!c) { console.log(g + ': no such county'); continue; }
  const S = (N.states[c.st] || {}).name || c.st;
  const it = T.get(c).items, seen = new Set(), out = [];
  for (const [k] of T.ITEMS) {
    if (it[k] && it[k].v === 'yes') continue;
    const camp = A.askFor(k); if (!camp || seen.has(camp.id)) continue; seen.add(camp.id);
    const have = A.existing(c, camp.id);
    if (have) { out.push(`  open already: ${camp.id}`); continue; }
    if (!post) { out.push(`  would open: ${camp.id} (box: ${k})`); continue; }
    const p = A.ensure(c, camp, S); out.push(p ? `  opened: ${A.urlOf(p)}` : `  BLOCKED: ${camp.id}`);
  }
  console.log(`${c.name}, ${S}:\n${out.join('\n')}`);
}
