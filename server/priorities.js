// Community priorities — voice, not a rival budget.
//
// We do not draw the budget; we elected people to do that. This is where the
// community says what it wants them to weigh — what to lean into, or what to
// take a fresh look at — and WHY. Residents back the ones they share, so the
// list ranks itself into a clear signal the county's budget-writers have to
// reckon with. Their job is to fit our voice in; ours is to make it plain.
//
// Priorities are public advocacy (the text is meant to be seen), so unlike the
// secret-ballot votes this store holds titles and reasons in the open. What
// stays private is who backed what: support is a count keyed by the same
// per-sitting participant token as votes, never a name. Bright-line screened
// (no candidates, no named-individual conduct) like every resident submission.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chain = require('./lib/chain');

const STORE = path.join(__dirname, '..', 'data', 'priorities.json');
const KINDS = new Set(['prioritize', 'reconsider']);

function load() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { return { priorities: {} }; }
}
function save(s) {
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  fs.renameSync(tmp, STORE);
}

// Does the text name a specific official from this county's roster? Priorities
// are about the work and the dollars, never a person — so naming an official
// (by full name) trips the named-individual bright line. Full-name match keeps
// false positives low; common surnames as words (Angle, King) don't fire.
function namesAnOfficial(text, county) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  const roster = [];
  for (const o of (county && county.officials) || []) if (o.name) roster.push(o.name);
  for (const j of (((county && county.quorum_court) || {}).justices) || []) if (j.name) roster.push(j.name);
  return roster.some(full => {
    const name = full.toLowerCase().replace(/["'".]/g, '').trim();
    return name.split(/\s+/).length >= 2 && t.includes(name);
  });
}

// Propose a priority. Returns { id } or { error, flags? }. Priorities publish
// to the public board immediately (no human queue like question-submissions),
// so a bright-line hit is a hard stop here, not just a flag for a reviewer.
function propose({ tenant, kind, title, why, node_ref, participant, county }) {
  title = String(title || '').trim().slice(0, 120);
  why = String(why || '').trim().slice(0, 600);
  kind = KINDS.has(kind) ? kind : 'prioritize';
  if (!title || !why) return { error: 'missing' };
  // The charter bright lines are a bone: no candidates, no active-ballot
  // measures, no named-individual conduct. Keyword screen + this county's
  // official roster; anything flagged is refused, never published.
  const text = title + ' ' + why;
  const flags = require('./submissions').screen(text);
  if (namesAnOfficial(text, county)) flags.push('names-an-official');
  if (flags.length) return { error: 'bright-line', flags };

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'priority';
  const id = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
  const now = new Date().toISOString();
  const s = load();
  s.priorities[id] = {
    id, tenant, kind, title, why,
    node_ref: node_ref || null,
    created_at: now,
    // The proposer is the first backer; keyed by token, never shown.
    supporters: participant ? { [participant]: { at: now } } : {},
    status: 'open'
  };
  chain.append('priority', { id, tenant, kind });
  save(s);
  return { id };
}

// Back a priority (optionally with your own reason). One per participant.
function support(participant, id, why) {
  if (!participant) return null;
  const s = load();
  const p = s.priorities[id];
  if (!p || p.status !== 'open') return null;
  p.supporters = p.supporters || {};
  const entry = { at: new Date().toISOString() };
  const w = String(why || '').trim().slice(0, 400);
  if (w) entry.why = w;
  p.supporters[participant] = entry;
  chain.append('priority-support', { id });
  save(s);
  return p;
}

function get(id) { return load().priorities[id] || null; }
function setStatus(id, status) { const s = load(); if (s.priorities[id]) { s.priorities[id].status = status; save(s); } }
function remove(id) { const s = load(); if (s.priorities[id]) { delete s.priorities[id]; save(s); } }
function mySupport(participant, id) { const p = get(id); return !!(p && p.supporters && p.supporters[participant]); }

// The set of a county's priorities this participant already backs — one load,
// so the board can mark them without re-reading the store per card.
function supportedBy(participant, tenant) {
  const set = new Set();
  if (!participant) return set;
  for (const p of Object.values(load().priorities)) {
    if (p.tenant === tenant && p.status === 'open' && p.supporters && p.supporters[participant]) set.add(p.id);
  }
  return set;
}

// The ranked community voice for a county: most-backed first. Support is a
// count; supporter reasons ride along (without names) as the texture behind it.
function listFor(tenant) {
  return Object.values(load().priorities)
    .filter(p => p.status === 'open' && p.tenant === tenant)
    .map(p => ({
      id: p.id, kind: p.kind, title: p.title, why: p.why, node_ref: p.node_ref, created_at: p.created_at,
      support: Object.keys(p.supporters || {}).length,
      reasons: Object.values(p.supporters || {}).filter(x => x.why).map(x => x.why)
    }))
    .sort((a, b) => b.support - a.support || String(b.created_at).localeCompare(String(a.created_at)));
}

// Every open priority across the network — the owner's backstop view.
function listAll() {
  return Object.values(load().priorities)
    .filter(p => p.status === 'open')
    .map(p => ({ id: p.id, tenant: p.tenant, kind: p.kind, title: p.title, why: p.why, created_at: p.created_at, support: Object.keys(p.supporters || {}).length }))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

module.exports = { propose, support, get, setStatus, remove, mySupport, supportedBy, listFor, listAll };
