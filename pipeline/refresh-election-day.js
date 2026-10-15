// Daily until the election: every Arkansas county's Election Day polling places
// and vote centers, from the State Board of Election Commissioners' public map.
//   node pipeline/refresh-election-day.js            (writes the live copy, gitignored)
//   node pipeline/refresh-election-day.js --snapshot (writes the committed snapshot)
// Pages read the live copy when it exists (server/lib/election-day.js), and the
// run is appended to data/refresh-log.json, published at /refresh-log.json.
const fs = require('fs');
const path = require('path');
const { LIVE, SNAPSHOT, ELECTION, ELECTION_DATE, LAYER, MAP } = require('../server/lib/election-day');
// After Election Day there's nothing left to refresh; the cron line can stay until the next election.
if (new Date().toISOString().slice(0, 10) > ELECTION_DATE && !process.argv.includes('--snapshot')) { console.log('election passed; nothing to refresh'); process.exit(0); }
const LOG = path.join(__dirname, '..', 'data', 'refresh-log.json');

async function build() {
  const q = `${LAYER}/query?where=1%3D1&outFields=USER_Polling_Location,USER_Address,USER_City,USER_Zip_Code,County,General_elect_day,Action_note,Vote_Center&returnGeometry=false&resultRecordCount=2000&f=json`;
  const r = await fetch(q);
  if (!r.ok) throw new Error('layer HTTP ' + r.status);
  const j = await r.json();
  if (!j.features || !j.features.length) throw new Error('layer returned no sites');
  const counties = {};
  for (const { attributes: x } of j.features) {
    if (x.General_elect_day !== 'yes' || /not used/i.test(x.Action_note || '')) continue;
    const c = (counties[x.County.trim()] = counties[x.County.trim()] || { vote_centers: x.Vote_Center === 'Yes', sites: [] });
    const k = (x.USER_Polling_Location + '|' + x.USER_Address).toLowerCase().replace(/[^a-z0-9|]/g, '');
    if ((c.seen = c.seen || new Set()).has(k)) continue;
    c.seen.add(k);
    c.sites.push({ name: x.USER_Polling_Location.trim().replace(/\s+/g, ' '), address: (x.USER_Address || '').trim(), city: [(x.USER_City || '').trim(), x.USER_Zip_Code || ''].filter(Boolean).join(' ') });
  }
  for (const c of Object.values(counties)) delete c.seen, c.sites.sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
  return { state: 'Arkansas', election: ELECTION, fetched: new Date().toISOString(),
    source: { url: MAP, label: 'Arkansas State Board of Election Commissioners, 2026 general election polling locations' }, counties };
}

(async () => {
  const file = process.argv.includes('--snapshot') ? SNAPSHOT : LIVE;
  const run = { at: new Date().toISOString(), job: 'Arkansas Election Day polling places (State Board of Election Commissioners)' };
  try {
    const d = await build();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(d, null, file === SNAPSHOT ? 1 : 0));
    fs.renameSync(file + '.tmp', file);
    const n = Object.values(d.counties).reduce((s, c) => s + c.sites.length, 0);
    Object.assign(run, { ok: true, counties: Object.keys(d.counties).length, sites: n });
    console.log(`${Object.keys(d.counties).length} counties, ${n} sites → ${path.relative(process.cwd(), file)}`);
  } catch (e) {
    Object.assign(run, { ok: false, error: String(e.message || e) });
    console.error('refresh failed:', run.error);
    process.exitCode = 1;
  }
  if (file === SNAPSHOT) return;
  let log = []; try { log = JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch (e) { /* first run */ }
  log.push(run);
  fs.writeFileSync(LOG, JSON.stringify(log.slice(-200), null, 1));
})();
