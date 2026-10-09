// How complete is each county? One status per pillar, read straight from the
// files a county has. Nothing here is a judgment — it's an inventory, so the
// gaps show as a to-do list (a dead end means "not gathered yet", never hidden).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch (e) { return null; } };

// The pillars, in the order the site reads.
const PILLARS = [
  { id: 'votes', label: 'The votes', href: '/issues' },
  { id: 'elections', label: 'Elections', href: '/elections' },
  { id: 'turnout', label: 'Voter turnout', href: '/turnout' },
  { id: 'budget', label: 'The budget', href: '/budget' },
  { id: 'grants', label: 'Grants', href: '/grants' },
  { id: 'water', label: 'Water', href: '/water' },
  { id: 'jails', label: 'Jails & prisons', href: '/justice' },
  { id: 'docket', label: 'Dead ends & open questions', href: '/docket' },
  { id: 'research', label: 'Research for a better county', href: '/commonwealth' }
];

function forTenant(key, t) {
  const cfg = readJSON(t.configPath) || {};
  const dir = t.corpusDir;
  const budget = readJSON(dir + '/budget-2026.json');
  const ver = readJSON(dir + '/verification.json');
  const drafts = readJSON(dir + '/issue-drafts.json');
  const docket = readJSON(dir + '/docket.json');
  const has = (f) => fs.existsSync(path.join(ROOT, dir, f));

  const open = drafts ? (drafts.drafts || []).filter(d => d.status === 'open-tier0').length : 0;
  const hasBudget = !!(budget && budget.meta && budget.meta.grand_total > 0);
  const checked = hasBudget && ver && ver.summary && ver.summary.failed === 0;
  const issues = docket ? (docket.issues || []) : [];
  const doneItems = issues.filter(i => i.status === 'complete').length;
  const progressItems = issues.filter(i => i.status === 'in_progress').length;
  const openItems = issues.length - doneItems - progressItems;
  const water = has('water.json'), justice = has('justice.json'), prisons = has('prisons-near.json');

  const stateSlug = String(cfg.state || '').toLowerCase().replace(/\s+/g, '-');
  const stTurn = readJSON('data/corpus/turnout-' + stateSlug + '.json');
  const cKey = String(cfg.name || '').replace(/ County$/, '');
  const hasTurnout = !!(stTurn && stTurn.elections.some(e => e.counties[cKey]));
  const stElect = readJSON('data/corpus/elections-' + stateSlug + '.json');
  const today = new Date().toISOString().slice(0, 10);
  const hasDates = !!(stElect && (stElect.elections || []).some(e => e.date >= today));
  const hasStateGrants = fs.existsSync(path.join(ROOT, 'data/corpus/grants-' + stateSlug + '.json'));

  const s = {
    elections: hasDates ? (cfg.election_office ? ['done', 'Dates sourced; local election office listed'] : ['partial', 'State dates sourced; local election office not listed']) : ['none', 'Election dates not gathered yet'],
    turnout: hasTurnout ? ['done', 'Official counts gathered'] : ['none', 'State counts not gathered yet'],
    grants: has('grants.json') ? ['done', 'Matched to local needs'] : hasStateGrants ? ['partial', 'State and federal programs listed; not matched locally'] : ['partial', 'Federal programs only'],
    votes: open ? ['done', `${open} open question${open === 1 ? '' : 's'} + the priorities board`] : ['partial', 'Priorities board open; no county questions yet'],
    budget: hasBudget ? (checked ? ['done', 'Ingested and arithmetic-checked'] : ['partial', 'Ingested; a check needs attention']) : ['none', 'Not ingested yet'],
    water: water ? ['done', 'Local system researched'] : ['partial', 'Options guide only; local system not researched'],
    jails: justice && prisons ? ['done', 'Local jail researched; closest prisons mapped'] : prisons ? ['partial', 'Closest prisons mapped; local jail not researched'] : ['partial', 'World ideas only; local jail not researched'],
    docket: issues.length ? ['done', `${doneItems} complete · ${progressItems} in progress · ${openItems} open`] : ['none', 'No docket yet'],
    research: ['done', 'Shared research pages']
  };
  return { key, name: cfg.name || t.name, state: cfg.state || '', host: t.host, status: s };
}

let cache = null, cachedAt = 0;
function all() {
  if (cache && Date.now() - cachedAt < 60000) return cache;
  const T = readJSON('config/tenants.json');
  cache = Object.entries(T.tenants).map(([k, t]) => forTenant(k, t))
    .sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
  cachedAt = Date.now();
  return cache;
}

module.exports = { PILLARS, all };
