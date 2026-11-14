// "Ask for it": every transparency-meter box a county doesn't meet links to a
// petition asking that county to publish the information. The asks are the
// county campaigns in config/campaigns.json that carry a `meter` list.
//
// A county's copy of an ask is created only when its first real signature
// arrives (POST), never by a page view, so crawlers can't fill the store with
// thousands of empty petitions. Until then the ask page shows the petition as
// it will read, with a sign form.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

// The governing body a county petition is addressed to (same table as
// pipeline/campaigns.js --everywhere).
const BODY = { AR: 'Quorum Court', TX: 'Commissioners Court', KY: 'Fiscal Court', LA: 'Parish Council or Police Jury', TN: 'County Commission', AL: 'County Commission', WV: 'County Commission', MO: 'County Commission', OK: 'Board of County Commissioners', GA: 'Board of Commissioners', CA: 'Board of Supervisors', AZ: 'Board of Supervisors', IA: 'Board of Supervisors', MS: 'Board of Supervisors', VA: 'Board of Supervisors', WI: 'Board of Supervisors', NJ: 'Board of County Commissioners', FL: 'Board of County Commissioners', OH: 'Board of County Commissioners', SC: 'County Council', DE: 'County Council', HI: 'County Council', AK: 'Borough Assembly' };
const addressee = (c) => `the ${c.name} ${/ city$/i.test(c.name) ? 'City Council' : (BODY[c.st] || 'County Commission (its governing board)')}`;

let CAMP = { m: 0, d: null };
function campaigns() {
  const f = path.join(ROOT, 'config', 'campaigns.json');
  try { const m = fs.statSync(f).mtimeMs; if (m !== CAMP.m) CAMP = { m, d: JSON.parse(fs.readFileSync(f, 'utf8')) }; } catch (e) { return { campaigns: [] }; }
  return CAMP.d;
}
const askFor = (item) => campaigns().campaigns.find(c => c.level === 'county' && !c.hold && (c.meter || []).includes(item)) || null;
const byId = (id) => campaigns().campaigns.find(c => c.id === id && c.level === 'county' && !c.hold && (c.meter || c.common)) || null;

// Does this county have a county government to deliver a petition to?
function deliverable(c) {
  try { const L = require('./national-local').read('local.json'); const f = L && L.finance && L.finance.counties[c.geoid]; return !(f && !f.gov); } catch (e) { return true; }
}

// The tenant a county's copy lives under: its full County Commons site if it
// has one (the site's key), else its national page ("us:<geoid>").
const tenantOf = (c) => c.site ? String(c.site).split('.')[0] : 'us:' + c.geoid;

function existing(c, campId) {
  const P = require('../priorities');
  for (const t of [tenantOf(c), 'us:' + c.geoid]) { const p = P.findCampaignCopy(campId, { tenant: t, level: 'county' }); if (p && p.status === 'open') return p; }
  return null;
}
const urlOf = (p) => /^us:/.test(String(p.tenant)) ? `/us/petitions/${p.id}` : `https://${p.tenant}.countycommons.us/petitions/${p.id}`;

function draft(c, camp, stateName) {
  const fill = (t) => String(t).replace(/\{county\}/g, c.name).replace(/\{state\}/g, stateName);
  const county = { name: c.name, state: stateName, population: c.pop2024 };
  let goal = 100; try { goal = require('./threshold').deliveryInfo(county).value || 100; } catch (e) { /* default */ }
  return { id: `${camp.id}-${c.geoid}`, tenant: tenantOf(c), level: 'county', state: stateName, county, by: campaigns().started_by, campaign: camp.id,
    to: addressee(c), title: fill(camp.title), why: fill(camp.why), goal, src: camp.src };
}

// Create the county's copy (first signature). Returns the stored petition or null.
function ensure(c, camp, stateName) {
  const P = require('../priorities');
  const have = existing(c, camp.id); if (have) return have;
  const d = draft(c, camp, stateName);
  const r = P.bulkPropose([d]);
  return r.posted ? P.get(d.id) : (P.get(d.id) || null);
}

module.exports = { campaigns, askFor, byId, existing, ensure, draft, urlOf, addressee, deliverable, tenantOf };
