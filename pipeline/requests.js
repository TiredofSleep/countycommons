// The public records requests residents report filing through "Take it
// further" (data/records-requests.json): list them, and record the county's
// answer once a resident sends what came back. Run on the server.
//   node pipeline/requests.js                     list every request and its status
//   node pipeline/requests.js answer <geoid> <campaign> "<what the county sent>" [<url of the records>]
//   node pipeline/requests.js remove <geoid> <campaign>   (a false or mistaken report)
const fs = require('fs');
const path = require('path');
const RQ = require('../server/lib/requests');
const STORE = path.join(__dirname, '..', 'data', 'records-requests.json');
const [cmd, geoid, camp, note, url] = process.argv.slice(2);
let s = { requests: {} }; try { s = JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch (e) { /* none yet */ }
if (cmd === 'answer') {
  if (!RQ.answer(geoid, camp, { note, url })) { console.error('no such request'); process.exit(1); }
  console.log(`answered: ${geoid}:${camp}`);
} else if (cmd === 'remove') {
  if (!s.requests[`${geoid}:${camp}`]) { console.error('no such request'); process.exit(1); }
  delete s.requests[`${geoid}:${camp}`]; fs.writeFileSync(STORE, JSON.stringify(s, null, 1)); console.log('removed');
} else {
  const today = new Date().toISOString().slice(0, 10);
  for (const r of Object.values(s.requests)) console.log(`${r.geoid} ${r.campaign} filed ${r.filed_at} due ${r.due} ${r.answered_at ? 'ANSWERED ' + r.answered_at : r.due < today ? 'OVERDUE' : 'open'} · ${Object.keys(r.support || {}).length} supporting`);
  if (!Object.keys(s.requests).length) console.log('no requests filed yet');
}
