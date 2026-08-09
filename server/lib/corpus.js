// Corpus loader + helpers. Reads the JSON corpus fresh on every request —
// trivially cheap at this scale, and edits to the corpus show up on reload.

const fs = require('fs');
const path = require('path');

const CORPUS_DIR = path.join(__dirname, '..', '..', 'data', 'corpus');
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'county.json');

function load() {
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
  let stance = null;
  try {
    stance = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'stance.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  let cases = null;
  try {
    cases = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'cases.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  let help = null;
  try {
    help = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'help.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  let calendar = null;
  try {
    calendar = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'calendar.json'), 'utf8'));
  } catch (e) { /* none yet */ }
  let research = null;
  try {
    research = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'research.json'), 'utf8'));
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
  return { budget, docket, documents, county, verification, comparisons, vendors, auditFindings, spending, stance, cases, help, calendar, research, issueDrafts, byId, childrenOf, verifyByNode };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

module.exports = { load, esc, money, pct, STATUS };
