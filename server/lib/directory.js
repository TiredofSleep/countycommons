// The public directory — which tenants are substantive enough to feature on the
// front door. A site is featured if it has a real budget (grand_total > 0) or is
// an honest no-government page explicitly flagged featured (Middlesex, Kalawao,
// Fairfield). The ~70 empty Arkansas starter counties are NOT featured: they stay
// reachable by their own link/PIN, but the public "select your county or city"
// page shows only sites with real content. Cached for the process lifetime.

const fs = require('fs');
const path = require('path');
const { registry } = require('./tenant');

const ROOT = path.join(__dirname, '..', '..');
let _cache = null;

function build() {
  const reg = registry();
  const out = [];
  for (const [key, t] of Object.entries((reg && reg.tenants) || {})) {
    let name = t.name || key, state = '', featured = false, kind = 'county';
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, t.configPath), 'utf8'));
      name = cfg.name || name;
      state = cfg.state || '';
      if (cfg.featured) featured = true;
      const j = (cfg.jurisdictions || [])[0];
      if (j && /city|town/i.test(j.name + ' ' + (j.kind || ''))) kind = 'city';
      try {
        const gt = JSON.parse(fs.readFileSync(path.join(ROOT, t.corpusDir, 'budget-2026.json'), 'utf8')).meta.grand_total;
        if (gt && gt > 0) featured = true;
      } catch (e) { /* no budget */ }
    } catch (e) { continue; }
    if (featured) out.push({ key, name, state, host: t.host, kind });
  }
  out.sort((a, b) => (a.state || '').localeCompare(b.state || '') || a.name.localeCompare(b.name));
  return out;
}

// [{key,name,state,host,kind}], featured only, sorted by state then name.
function featured() {
  if (!_cache) _cache = build();
  return _cache;
}
// Grouped: [{state, places:[...]}], for the selector UI.
function byState() {
  const groups = {};
  for (const t of featured()) (groups[t.state] = groups[t.state] || []).push(t);
  return Object.keys(groups).sort().map(state => ({ state, places: groups[state] }));
}

module.exports = { featured, byState };
