// Posts a county's own starter petitions from config/petitions/<key>.json —
// asks that only that county or its towns can act on. Idempotent by title.
//
// Usage: node pipeline/seed-petitions.js <county-key> [--post]   (dry run without --post)
//
// File shape: { "by": "Name, role", "petitions": [ { level, title, why, src: [{ url, label }] } ] }
// level is "county" or "city-<slug>". Each petition's text goes through the same
// screens as any petition started on the site.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require('../server/priorities');

const key = process.argv[2];
if (!key || key.startsWith('--')) { console.error('Usage: node pipeline/seed-petitions.js <county-key> [--post]'); process.exit(1); }
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tenants.json'), 'utf8')).tenants;
if (!T[key]) { console.error(`No county "${key}" in config/tenants.json.`); process.exit(1); }
const county = JSON.parse(fs.readFileSync(path.join(ROOT, T[key].configPath), 'utf8'));
const file = path.join(ROOT, 'config', 'petitions', key + '.json');
const { by, petitions: items } = JSON.parse(fs.readFileSync(file, 'utf8'));

let store = { priorities: {} };
try { store = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'priorities.json'), 'utf8')); } catch (e) { /* none yet */ }
const have = new Set(Object.values(store.priorities).filter(p => p.tenant === key).map(p => p.title));
const fresh = items.filter(i => !have.has(i.title)).map(i => ({ ...i, tenant: key, state: county.state, county, by, campaign: null }));
if (!process.argv.includes('--post')) { console.log(`would post ${fresh.length} ${county.name} petitions (${items.length - fresh.length} already there)`); process.exit(0); }
const r = P.bulkPropose(fresh);
console.log(`posted ${r.posted} ${county.name} petitions`); if (r.blocked.length) console.log('blocked:\n  ' + r.blocked.join('\n  '));
