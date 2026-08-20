// Municipalities layer — for counties (like Middlesex, MA) where the real
// budgets live in the cities and towns, not at the county. Reads a per-tenant
// municipalities.json index and per-city budget files under <corpusDir>/cities/.
// Generic: any county can grow this layer; most simply won't have the files.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function corpusDir(tenantKey) {
  const r = require('./tenant').registry();
  const t = r.tenants[tenantKey] || r.tenants[r.default];
  return path.join(ROOT, t.corpusDir);
}

function placesFor(tenantKey) {
  try { return JSON.parse(fs.readFileSync(path.join(corpusDir(tenantKey), 'municipalities.json'), 'utf8')); }
  catch (e) { return null; }
}

function cityBudget(tenantKey, slug) {
  if (!/^[a-z0-9-]{1,40}$/.test(String(slug || ''))) return null;
  try { return JSON.parse(fs.readFileSync(path.join(corpusDir(tenantKey), 'cities', slug + '.json'), 'utf8')); }
  catch (e) { return null; }
}

module.exports = { placesFor, cityBudget };
