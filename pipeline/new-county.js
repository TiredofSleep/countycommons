// Creates a new county from the command line — the same starter the owner
// console makes: a blank config and an honest, empty corpus, registered in the
// gitignored local registry (config/tenants.local.json).
//
// Usage: node pipeline/new-county.js <key> "<County name>" "<State>" ["<Site name>"]
//   e.g. node pipeline/new-county.js polkar "Polk County" "Arkansas"
//
// Then fill in data/tenants/<key>/county.json (see config/county.example.json),
// put the county's PDFs in inbox/<key>/, and run node pipeline/register.js <key>.

const { createCounty } = require('../server/lib/scaffold');

const [key, name, state, platformName] = process.argv.slice(2);
if (!key || !name || !state) { console.error('Usage: node pipeline/new-county.js <key> "<County name>" "<State>" ["<Site name>"]'); process.exit(1); }
try {
  const r = createCounty({ key, name, state, platformName });
  console.log(`Created ${name}, ${state} as "${r.key}" → ${r.host}`);
  console.log(`  settings: data/tenants/${r.key}/county.json   data: data/tenants/${r.key}/corpus/`);
  console.log(`  on your own computer, open http://${r.key}.localhost:3000 after npm start`);
} catch (e) { console.error(e.message); process.exit(1); }
