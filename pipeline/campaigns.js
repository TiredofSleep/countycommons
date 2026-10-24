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
