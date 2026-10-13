// Weekly: refresh the open federal grants list from Grants.gov.
//   node pipeline/refresh-grants.js
// Writes data/national/grants-open.json (pages pick it up without a restart)
// and appends the run to data/refresh-log.json, published at /refresh-log.json.
const fs = require('fs');
const path = require('path');
const { fetchOpen, FILE } = require('../server/lib/grants-open');
const LOG = path.join(__dirname, '..', 'data', 'refresh-log.json');

(async () => {
  const run = { at: new Date().toISOString(), job: 'grants.gov open grants for county governments' };
  try {
    const g = await fetchOpen();
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(g));
    fs.renameSync(FILE + '.tmp', FILE);
    Object.assign(run, { ok: true, posted_for_counties: g.posted_for_counties, kept: g.list.length });
    console.log(`kept ${g.list.length} of ${g.posted_for_counties} posted grants`);
  } catch (e) {
    Object.assign(run, { ok: false, error: String(e.message || e) });
    console.error('refresh failed:', run.error);
    process.exitCode = 1;
  }
  let log = []; try { log = JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch (e) { /* first run */ }
  log.push(run);
  fs.writeFileSync(LOG, JSON.stringify(log.slice(-200), null, 1));
})();
