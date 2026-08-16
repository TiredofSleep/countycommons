// Scaffold a new county from the owner console (COUNTY-CODE.md): a starter
// config + a minimal, honest corpus (nothing ingested yet — a "dead end,"
// never "hidden"), registered in the gitignored local registry so it never
// fights a deploy. Shared doctrine (stance, cases, research) falls back to the
// default county until this one has its own. The owner ingests real budget
// documents through the pipeline afterward.

const fs = require('fs');
const path = require('path');
const tenant = require('./tenant');

const ROOT = path.join(__dirname, '..', '..');
const KEY_RE = /^[a-z0-9-]{2,40}$/;

function createCounty({ key, name, state, sub, platformName }) {
  key = String(key || '').toLowerCase().trim();
  sub = String(sub || key).toLowerCase().trim();
  name = String(name || '').trim().slice(0, 80);
  state = String(state || '').trim().slice(0, 40);
  if (!KEY_RE.test(key)) throw new Error('County key must be 2–40 chars, lowercase letters/numbers/hyphens.');
  if (!KEY_RE.test(sub)) throw new Error('Subdomain must be 2–40 chars, lowercase letters/numbers/hyphens.');
  if (!name || !state) throw new Error('Name and state are required.');

  const reg = tenant.registry();
  if (reg.tenants[key]) throw new Error(`A county with key "${key}" already exists.`);
  if (Object.values(reg.tenants).some(t => t.sub === sub)) throw new Error(`Subdomain "${sub}" is already taken.`);
  const base = reg.baseDomain;

  const cdir = path.join(ROOT, 'data', 'tenants', key, 'corpus');
  fs.mkdirSync(cdir, { recursive: true });

  // Starter config, cloned from the default county's shape and blanked to this
  // county's specifics. Officials/jurisdictions start empty — the owner fills
  // them, or the host does through their admin as capabilities grow.
  const tmpl = JSON.parse(fs.readFileSync(path.join(ROOT, reg.tenants[reg.default].configPath), 'utf8'));
  const cfg = Object.assign({}, tmpl, {
    name, state, slug: key,
    platform_name: (platformName && platformName.trim()) || 'County Commons',
    jurisdictions: [{ id: key, name, kind: 'county', governing_body: 'Quorum Court', executive: 'County Judge', website: null }],
    peer_counties: [],
    officials: [],
    quorum_court: { source: '', justices: [] },
    records_portals: [],
    calendar: Object.assign({}, tmpl.calendar, { meetings: [] })
  });
  fs.writeFileSync(path.join(ROOT, 'data', 'tenants', key, 'county.json'), JSON.stringify(cfg, null, 2));

  const w = (f, o) => fs.writeFileSync(path.join(cdir, f), JSON.stringify(o, null, 2));
  w('budget-2026.json', {
    meta: { grand_total: 0, year: 2026, note: 'No appropriation document has been ingested for this county yet.' },
    nodes: [{ id: 'root', parent: null, name: `${name} — county budget`, code: null, amount: 0, year: 2026,
      layer: 'appropriation', source: { doc: null, page: null }, status: 'dead_end',
      note: 'No budget document ingested yet. A dead end means "not yet ingested and navigable," never "hidden."' }]
  });
  w('docket.json', { issues: [] });
  w('documents.json', { documents: [] });
  w('calendar.json', {
    intro: `Every public meeting where ${name}'s decisions get made — listed as they're confirmed.`,
    recurring: [], unverified: [], seasonal: { months: [], banner: '' },
    community: { invite: 'Community events belong here too — send them through the question box.', listings: [] }
  });
  w('help.json', {
    intro: 'Real local help, fast — added as your county host lists it.',
    categories: [], verified: 'not yet', verified_note: '', missing: 'Know a local resource that should be here? Send it in.'
  });
  w('issue-drafts.json', { drafts: [] });

  tenant.addLocalTenant(key, {
    sub, host: `${sub}.${base}`, name: `${name}, ${state}`,
    corpusDir: `data/tenants/${key}/corpus`, configPath: `data/tenants/${key}/county.json`
  });

  return { key, sub, host: `${sub}.${base}` };
}

module.exports = { createCounty };
