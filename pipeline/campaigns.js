// Posts the shared petitions in config/campaigns.json: one copy per county site
// (addressed to that county's own officials), one per state, one national.
// Idempotent — a copy that already exists is left alone — so it can be rerun
// whenever a county site or a campaign is added.
//   node pipeline/campaigns.js            dry run: what would be posted
//   node pipeline/campaigns.js --post     post them
// Every copy goes through the same bright-line screen as a resident's petition.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require('../server/priorities');
const PV = require('../server/views/priorities');
const places = require('../server/lib/places');

const post = process.argv.includes('--post');

// --everywhere <campaign>: the county petition in EVERY U.S. county, not just
// county sites — one copy per county (tenant "us:<geoid>"), signable from its
// national page, addressed to that county's governing body and delivered by
// mail and email at its goal. Counties with no county government are skipped.
const everyIdx = process.argv.indexOf('--everywhere');
if (everyIdx > 0) {
  const campId = process.argv[everyIdx + 1];
  const Cf = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'campaigns.json'), 'utf8'));
  const camp = Cf.campaigns.find(c => c.id === campId && c.level === 'county');
  if (!camp) { console.error('no county campaign ' + campId); process.exit(1); }
  const N = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
  let L = null; try { L = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'local.json'), 'utf8')); } catch (e) { /* no finance layer */ }
  const nat = require('../server/lib/national');
  // counties already covered by a county site's own copy
  const covered = new Set();
  const Tn = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tenants.json'), 'utf8')).tenants;
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'priorities.json'), 'utf8')).priorities;
  for (const p of Object.values(all)) {
    if (p.campaign !== campId || p.level !== 'county' || !Tn[p.tenant]) continue;
    try { const c = nat.forCounty(JSON.parse(fs.readFileSync(path.join(ROOT, Tn[p.tenant].configPath), 'utf8'))); if (c) covered.add(c.geoid); } catch (e) { /* skip */ }
  }
  const BODY = { AR: 'Quorum Court', TX: 'Commissioners Court', KY: 'Fiscal Court', LA: 'Parish Council or Police Jury', TN: 'County Commission', AL: 'County Commission', WV: 'County Commission', MO: 'County Commission', GA: 'Board of Commissioners', CA: 'Board of Supervisors', AZ: 'Board of Supervisors', IA: 'Board of Supervisors', MS: 'Board of Supervisors', VA: 'Board of Supervisors', WI: 'Board of Supervisors', NJ: 'Board of County Commissioners', FL: 'Board of County Commissioners', OH: 'Board of County Commissioners', SC: 'County Council', DE: 'County Council', HI: 'County Council', AK: 'Borough Assembly' };
  const thr = require('../server/lib/threshold');
  const fillC = (t, c) => String(t).replace(/{county}/g, c.name).replace(/{state}/g, c.state);
  const items = []; let skipped = 0;
  for (const c of N.counties) {
    if (covered.has(c.geoid)) continue;
    const f = L && L.finance && L.finance.counties[c.geoid];
    if (f && !f.gov) { skipped++; continue; } // no county government to deliver it to
    const S = (N.states[c.st] || {}).name || c.st;
    const body = / city$/i.test(c.name) ? 'City Council' : (BODY[c.st] || 'County Commission (its governing board)');
    const to = `the ${c.name} ${body}`;
    const county = { name: c.name, state: S, population: c.pop2024 };
    items.push({ id: `${campId}-${c.geoid}`, tenant: `us:${c.geoid}`, level: 'county', state: S, county, by: Cf.started_by, campaign: campId, to,
      title: fillC(camp.title, county), why: fillC(camp.why, county), goal: thr.deliveryInfo(county).value });
  }
  const fresh = items.filter(it => !all[it.id]).length;
  if (!post) { console.log(`would post ${fresh} county copies of ${campId} (${items.length - fresh} already there; ${covered.size} counties already have a county site's copy; ${skipped} have no county government)`); process.exit(0); }
  const r = P.bulkPropose(items);
  console.log(`posted ${r.posted} county copies of ${campId}; ${covered.size} already on county sites; ${skipped} counties with no county government skipped`);
  if (r.blocked.length) console.log('blocked:\n  ' + r.blocked.slice(0, 20).join('\n  '));
  process.exit(0);
}
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'campaigns.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tenants.json'), 'utf8')).tenants;
const counties = Object.entries(T).map(([key, t]) => {
  try { return { key, county: JSON.parse(fs.readFileSync(path.join(ROOT, t.configPath), 'utf8')) }; } catch (e) { return null; }
}).filter(Boolean);
const fill = (s, c) => String(s).replace(/\{county\}/g, c.name || '').replace(/\{state\}/g, c.state || '');

const report = { posted: 0, existing: 0, skipped: [], blocked: [], adopted: 0 };
function make(camp, { tenant, county, level, state }) {
  const title = fill(camp.title, county), why = fill(camp.why, county);
  if (P.findCampaignCopy(camp.id, { tenant, level, state })) { report.existing++; return; }
  if (!post) { report.posted++; return; }
  const r = P.propose({ tenant, kind: 'prioritize', title, why, level, state, participant: null, county, by: C.started_by, campaign: camp.id });
  if (r.error) report.blocked.push(`${camp.id} @ ${tenant}: ${r.error}${r.flags ? ' (' + r.flags.join(', ') + ')' : ''}`);
  else report.posted++;
}

for (const camp of C.campaigns) {
  if (camp.hold) { report.skipped.push(`${camp.id}: on hold`); continue; }
  if (camp.level === 'county') {
    for (const { key, county } of counties) {
      // A petition a resident already started on the same ask becomes this county's copy.
      const adopt = camp.adopt && camp.adopt[key];
      if (adopt && P.get(adopt)) { if (!P.get(adopt).campaign) { if (post) P.tagCampaign(adopt, camp.id); report.adopted++; } continue; }
      const { levels } = PV.funnelLevels(county, places.placesFor(key));
      const lvl = levels.find(l => l.kind === 'county') || (!camp.county_only && levels.find(l => l.kind === 'city' || l.kind === 'town'));
      if (!lvl) { report.skipped.push(`${camp.id} @ ${key}: no county government`); continue; }
      make(camp, { tenant: key, county, level: lvl.id, state: county.state });
    }
  } else if (camp.level === 'state') {
    // Every state and D.C. — signable from every national county page, and from
    // any county site in that state.
    const byState = {};
    for (const x of counties) if (x.county.state && !byState[x.county.state]) byState[x.county.state] = x;
    let states = Object.keys(byState);
    try { states = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8')).states).map(s => s.name); } catch (e) { /* sites only */ }
    for (const state of states) {
      const x = byState[state] || { key: '__us__', county: { name: state, state } };
      make(camp, { tenant: x.key, county: x.county, level: 'state', state });
    }
  } else if (camp.level === 'national') {
    const x = counties.find(c => c.key === 'clarkar') || counties[0];
    make(camp, { tenant: x.key, county: x.county, level: 'national', state: null });
  }
}
console.log(`${post ? 'posted' : 'would post'} ${report.posted} · already there ${report.existing} · linked ${report.adopted}`);
if (report.blocked.length) console.log('blocked by the screen:\n  ' + report.blocked.join('\n  '));
const sk = {}; for (const s of report.skipped) { const k = s.split(':').slice(-1)[0].trim(); sk[k] = (sk[k] || 0) + 1; }
if (report.skipped.length) console.log('skipped:', JSON.stringify(sk));
