// Corpus loader + helpers. Reads the JSON corpus fresh on every request —
// trivially cheap at this scale, and edits to the corpus show up on reload.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TENANTS_PATH = path.join(ROOT, 'config', 'tenants.json');

// Resolve which county's files to read from the tenant key set by the
// host-routing middleware. Falls back to the default county, so load() with
// no argument keeps serving the flagship (Clark) exactly as before.
function reg() {
  try { return require('./tenant').registry(); }
  catch (e) { return { default: 'clarkar', tenants: { clarkar: { corpusDir: 'data/corpus', configPath: 'config/county.json' } } }; }
}

function tenantPaths(tenantKey) {
  const r = reg();
  const key = (tenantKey && r.tenants[tenantKey]) ? tenantKey : r.default;
  const t = r.tenants[key];
  const def = r.tenants[r.default];
  return {
    corpusDir: path.join(ROOT, t.corpusDir), configPath: path.join(ROOT, t.configPath),
    defaultCorpusDir: path.join(ROOT, def.corpusDir)
  };
}

function load(tenantKey) {
  const { corpusDir: CORPUS_DIR, configPath: CONFIG_PATH, defaultCorpusDir: DEF_CORPUS } = tenantPaths(tenantKey);
  // Shared platform doctrine (same on every county) falls back to the default
  // county's copy when a new county hasn't got its own — so doctrine pages
  // render for a freshly-created county with no corpus of its own yet.
  const sharedRead = (name) => {
    try { return JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, name), 'utf8')); }
    catch (e) {
      try { return JSON.parse(fs.readFileSync(path.join(DEF_CORPUS, name), 'utf8')); }
      catch (e2) { return null; }
    }
  };
  const budget = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'budget-2026.json'), 'utf8'));
  const docket = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'docket.json'), 'utf8'));
  const documents = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'documents.json'), 'utf8'));
  const county = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  let verification = null;
  try {
    verification = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'verification.json'), 'utf8'));
  } catch (e) { /* verifier not run yet; site says so */ }
  let comparisons = { comparisons: [] };
  try {
    comparisons = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'comparisons.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  let vendors = null;
  try {
    vendors = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'vendors.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  let auditFindings = null;
  try {
    auditFindings = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'audit-findings.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  let spending = null;
  try {
    spending = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'spending.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  // Shared platform doctrine — identical across counties; a new county inherits
  // the default county's copy until it has its own.
  const stance = sharedRead('stance.json');
  const cases = sharedRead('cases.json');
  const research = sharedRead('research.json');
  let help = null;
  try {
    help = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'help.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  let calendar = null;
  try {
    calendar = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'calendar.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  let issueDrafts = { drafts: [] };
  try {
    issueDrafts = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'issue-drafts.json'), 'utf8'));
  } catch (e) { /* none yet */ }

  const byId = new Map(budget.nodes.map(n => [n.id, n]));
  const childrenOf = new Map();
  for (const n of budget.nodes) {
    if (n.parent !== null) {
      if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, []);
      childrenOf.get(n.parent).push(n);
    }
  }
  const verifyByNode = new Map();
  if (verification) {
    for (const c of verification.checks) verifyByNode.set(c.node, c);
  }
  const data = { budget, docket, documents, county, verification, comparisons, vendors, auditFindings, spending, stance, cases, help, calendar, research, issueDrafts, byId, childrenOf, verifyByNode };
  // Lay this county's writable overlay (a local host's edits) on top of the
  // git-seeded corpus. Only whitelisted sections merge (see overlay.js); the
  // bones are never touched. Resolve to the default county when unkeyed.
  const r = reg();
  const okey = (tenantKey && r.tenants[tenantKey]) ? tenantKey : r.default;
  try { require('./overlay').apply(data, okey); } catch (e) { data.copy = data.copy || {}; }
  // Resident-created questions (local/state/national) visible to this county:
  // open ones join the votable drafts; proposals surface for support.
  try {
    const vis = require('../questions').visibleFor(okey, data.county && data.county.state);
    data.issueDrafts = data.issueDrafts || { drafts: [] };
    data.issueDrafts.drafts = (data.issueDrafts.drafts || []).concat(vis.filter(x => x.status === 'open-tier0'));
    data.proposals = vis.filter(x => x.status === 'proposed');
  } catch (e) { data.proposals = data.proposals || []; }
  return data;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Per-county copy: a host's overlay override for a slot, else its default.
// Placeholders stay live; the result is always escaped, so host text can never
// inject markup. Defaults live in lib/copyslots.js.
const { COPY_SLOTS } = require('./copyslots');
const SLOT_DEFAULT = Object.fromEntries(COPY_SLOTS.map(s => [s.key, s.default]));
function fillPlaceholders(v, data) {
  const total = (data.budget && data.budget.meta) ? '$' + data.budget.meta.grand_total.toLocaleString('en-US') : '';
  return String(v)
    .replace(/\{total\}/g, total)
    .replace(/\{county\}/g, (data.county && data.county.name) || '')
    .replace(/\{state\}/g, (data.county && data.county.state) || '')
    .replace(/\{platform\}/g, (data.county && data.county.platform_name) || '')
    .replace(/\{docs\}/g, data.documents ? String(data.documents.documents.length) : '');
}
function copyText(data, key) {
  const ov = data.copy && data.copy[key];
  const raw = (ov !== undefined && ov !== null && ov !== '') ? ov : (SLOT_DEFAULT[key] || '');
  return esc(fillPlaceholders(raw, data));
}

function money(n) {
  if (n === null || n === undefined) return '—';
  return '$' + n.toLocaleString('en-US');
}

function pct(part, whole) {
  if (!part || !whole) return null;
  return Math.round((part / whole) * 100);
}

const STATUS = {
  sourced:   { mark: '✓', label: 'Sourced',   cls: 'c-ok',
    plain: 'This number is transcribed from the source document.' },
  partial:   { mark: '◐', label: 'Partial',   cls: 'c-part',
    plain: 'The total is sourced, but the detail beneath it has not been ingested yet.' },
  ambiguous: { mark: '⚠', label: 'Ambiguous', cls: 'c-amb',
    plain: 'This number is derived or uncertain. The note on this line says exactly why.' },
  dead_end:  { mark: '✖', label: 'Dead end',  cls: 'c-dead',
    plain: 'No document for this exists in the corpus yet. Dead end means "not yet ingested and navigable" — never "hidden."' }
};

module.exports = { load, esc, money, pct, STATUS, copyText };
