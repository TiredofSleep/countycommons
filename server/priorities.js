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
// (no campaigning, nothing about non-elected staff) like every resident submission.

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

// Propose a priority. Returns { id } or { error, flags? }. Priorities publish
// to the public board immediately (no human queue like question-submissions),
// so a bright-line hit is a hard stop here, not just a flag for a reviewer.
// The funnel levels a priority can live at: the whole nation, a state, a county,
// or a specific city. Each level is its own space with its own set of votes and
// its own count — people toggle through the funnel to move between them.
function propose({ tenant, kind, title, why, node_ref, participant, county, target, level, state, by, campaign }) {
  title = String(title || '').trim().slice(0, 120);
  why = String(why || '').trim().slice(0, 600);
  kind = KINDS.has(kind) ? kind : 'prioritize';
  // `level` is the funnel level (national|state|county|city-<slug>); `target`
  // is kept as an alias so a level id doubles as the routing target.
  level = String(level || target || 'county').slice(0, 60);
  target = level;
  state = state || (county && county.state) || null;
  if (!title || !why) return { error: 'missing' };
  // Scanners and empty posts never reach the board.
  const junk = require('./lib/spam').petitionProblem(title, why);
  if (junk) return { error: junk };
  // The charter bright lines are a bone (NEVER.md): no campaigning, no live
  // ballot measures, no naming or conduct posts about non-elected staff.
  // Elected officials and candidates may be named. Anything flagged is
  // refused, never published.
  const text = title + ' ' + why;
  const flags = require('./submissions').screen(text, county);
  if (flags.length) return { error: 'bright-line', flags };

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'priority';
  const now = new Date().toISOString();
  const s = load();
  // Never reuse an id: shared petitions put the same title in ~90 counties.
  let id;
  do { id = `${slug}-${crypto.randomBytes(3).toString('hex')}`; } while (s.priorities[id]);
  s.priorities[id] = {
    id, tenant, kind, title, why,
    node_ref: node_ref || null,
    level, target: level, state: state || null,
    created_at: now,
    // The proposer is the first backer; keyed by token, never shown.
    supporters: participant ? { [participant]: { at: now } } : {},
    status: 'open',
    // Who started it, when it isn't an anonymous resident (stated on the page).
    ...(by ? { by: String(by).slice(0, 160) } : {}),
    // A shared petition: the same ask open in many counties (config/campaigns.json).
    ...(campaign ? { campaign: String(campaign).slice(0, 60) } : {})
  };
  chain.append('priority', { id, tenant, kind });
  save(s);
  return { id };
}

// Back a priority (optionally with your own reason). One per participant.
// As a petition signature it can also carry the signer's town (shown only as a
// count by town) and whether they want their name on the copy handed to
// officials — the name itself lives in the identity store, never here.
function support(participant, id, why, sig) {
  if (!participant) return null;
  const s = load();
  const p = s.priorities[id];
  if (!p || p.status !== 'open') return null;
  p.supporters = p.supporters || {};
  const entry = { at: new Date().toISOString() };
  const w = String(why || '').trim().slice(0, 400);
  if (w) entry.why = w;
  if (sig) {
    const town = String(sig.town || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (town) entry.town = town;
    if (sig.deliver) entry.deliver = true;
    if (sig.site) entry.site = String(sig.site).slice(0, 40); // which county site it was signed on
    entry.signed = true;
  }
  p.supporters[participant] = entry;
  chain.append('priority-support', { id });
  save(s);
  return p;
}

// The accountability loop. A priority moves: raised (residents post it) →
// delivered (someone carries it to the body that decides) → answered (an
// official/body responds) → acted (something actually happens). Each step is a
// dated, CITED event recorded by the host — the platform never invents an
// outcome, it records what officials did with a source, like every number here.
// The honest teeth: when a delivered ask sits unanswered, the days are shown.
const STAGES = new Set(['delivered', 'answered', 'acted']);

function phaseOf(p) {
  return (p.timeline && p.timeline.length) ? p.timeline[p.timeline.length - 1].stage : 'raised';
}

function addOutcome(id, { stage, at, note, source, by }) {
  if (!STAGES.has(stage)) return { error: 'bad-stage' };
  const s = load();
  const p = s.priorities[id];
  if (!p || p.status !== 'open') return { error: 'not-found' };
  p.timeline = p.timeline || [];
  const ev = {
    stage,
    at: (String(at || '').match(/^\d{4}-\d{2}-\d{2}$/) ? at : new Date().toISOString().slice(0, 10)),
    note: String(note || '').trim().slice(0, 400),
    by: String(by || '').slice(0, 80) || null
  };
  const url = String((source && source.url) || '').trim().slice(0, 300);
  const label = String((source && source.label) || '').trim().slice(0, 120);
  // A cited source is the whole point — a link, or at least a plain reference.
  if (url && /^https?:\/\//.test(url)) ev.source = { url, label: label || url.replace(/^https?:\/\/(www\.)?/, '') };
  else if (label) ev.source = { label };
  p.timeline.push(ev);
  chain.append('priority-outcome', { id, stage });
  save(s);
  return { ok: true };
}

// Undo the most recent outcome event (mis-entry). Host/owner only.
function undoOutcome(id) {
  const s = load();
  const p = s.priorities[id];
  if (!p || !p.timeline || !p.timeline.length) return { error: 'nothing' };
  p.timeline.pop();
  chain.append('priority-outcome-undo', { id });
  save(s);
  return { ok: true };
}

function get(id) { return load().priorities[id] || null; }
function setStatus(id, status) { const s = load(); if (s.priorities[id]) { s.priorities[id].status = status; save(s); } }
function remove(id) { const s = load(); if (s.priorities[id]) { delete s.priorities[id]; save(s); } }
function mySupport(participant, id) { const p = get(id); return !!(p && p.supporters && p.supporters[participant]); }

// The set of priorities this participant already backs — one load, so the board
// can mark them without re-reading the store per card. Not level-scoped: a token
// marks everything it has backed, which is all the board needs to show "you're in."
function supportedBy(participant, tenant) {
  const set = new Set();
  if (!participant) return set;
  for (const p of Object.values(load().priorities)) {
    if (p.status === 'open' && p.supporters && p.supporters[participant]) set.add(p.id);
  }
  return set;
}

function levelOf(p) { return p.level || p.target || 'county'; }

// Signatures by town — the public face of who signed, never names. Towns with
// fewer than 3 signers fold into "other towns" so no one stands out.
function townCounts(p) {
  const raw = {};
  for (const x of Object.values(p.supporters || {})) {
    const t = x.town ? x.town.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : 'Town not given';
    raw[t] = (raw[t] || 0) + 1;
  }
  const out = {}; let other = 0;
  for (const [t, n] of Object.entries(raw)) { if (n >= 3 || t === 'Town not given') out[t] = n; else other += n; }
  if (other) out['Other towns'] = other;
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}
const real = (p) => require('./lib/spam').looksReal(p);

function enrich(p) {
  return {
    id: p.id, kind: p.kind, title: p.title, why: p.why, node_ref: p.node_ref,
    level: levelOf(p), target: p.target || levelOf(p), state: p.state || null,
    tenant: p.tenant, created_at: p.created_at, by: p.by || null, campaign: p.campaign || null, goal: p.goal || null, to: p.to || null,
    support: Object.keys(p.supporters || {}).length,
    reasons: Object.values(p.supporters || {}).filter(x => x.why).map(x => x.why),
    towns: townCounts(p),
    timeline: p.timeline || [], phase: phaseOf(p)
  };
}

// Priorities at ONE funnel level — its own space, its own set of votes:
//   national         -> shared across the whole network
//   state            -> shared across every county in that state
//   county           -> this county's own board
//   city-<slug>      -> this specific city's own board
// County/city are scoped to this tenant; national/state pool across tenants so a
// statewide or nationwide push gathers voices from every host at once.
function listByLevel({ tenant, state, level }) {
  level = level || 'county';
  return Object.values(load().priorities)
    .filter(p => p.status === 'open' && real(p))
    .filter(p => {
      const lv = levelOf(p);
      if (level === 'national') return lv === 'national';
      if (level === 'state') return lv === 'state' && p.state === state;
      if (level === 'county') return p.tenant === tenant && lv === 'county';
      return p.tenant === tenant && lv === level; // city-<slug>
    })
    .map(enrich)
    .sort((a, b) => b.support - a.support || String(b.created_at).localeCompare(String(a.created_at)));
}

// The ranked community voice for a county (county-level only, back-compat).
function listFor(tenant) {
  return Object.values(load().priorities)
    .filter(p => p.status === 'open' && real(p) && p.tenant === tenant && levelOf(p) === 'county')
    .map(enrich)
    .sort((a, b) => b.support - a.support || String(b.created_at).localeCompare(String(a.created_at)));
}

// Every open priority across the network — the owner's backstop view.
function listAll() {
  return Object.values(load().priorities)
    .filter(p => p.status === 'open')
    .map(p => ({ id: p.id, tenant: p.tenant, kind: p.kind, title: p.title, why: p.why, created_at: p.created_at, support: Object.keys(p.supporters || {}).length, phase: phaseOf(p), timeline: p.timeline || [] }))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

// A shared petition across the network: every open copy, its signatures, and
// how many counties and states they span. Each copy still counts toward its own
// county's goal; this only shows that the same ask is rising elsewhere.
function campaignRollup(campaign) {
  const copies = Object.values(load().priorities).filter(p => p.campaign === campaign && p.status === 'open' && real(p));
  const by = {}; let total = 0;
  for (const p of copies) {
    for (const s of Object.values(p.supporters || {})) {
      const site = (levelOf(p) === 'county' || /^city-/.test(levelOf(p))) ? p.tenant : (s.site || 'elsewhere'); // county copies count where they live (a site key or us:<geoid>)
      by[site] = (by[site] || 0) + 1; total++;
    }
  }
  return { campaign, copies: copies.map(enrich), total, bySite: Object.entries(by).sort((a, b) => b[1] - a[1]), sitesSigning: Object.keys(by).filter(k => k !== 'elsewhere').length };
}
function findCampaignCopy(campaign, { tenant, level, state }) {
  return Object.values(load().priorities).find(p => p.campaign === campaign && levelOf(p) === level &&
    (level === 'national' || (level === 'state' ? p.state === state : p.tenant === tenant))) || null;
}

// Post many shared-petition copies at once (thousands of counties): the same
// screens as propose(), one write. items: [{ id, tenant, title, why, level, state, county, by, campaign, goal, to }]
function bulkPropose(items) {
  const s = load(); const now = new Date().toISOString();
  const spam = require('./lib/spam'); const sub = require('./submissions');
  let posted = 0; const blocked = [];
  for (const it of items) {
    if (s.priorities[it.id]) continue;
    const junk = spam.petitionProblem(it.title, it.why);
    // Screen the words of the ask, not the county's own name ("Crook County" isn't an accusation).
    const nameRe = it.county && it.county.name ? new RegExp(it.county.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
    const text = (it.title + ' ' + it.why).replace(nameRe || /$^/, 'the county');
    const flags = junk ? [junk] : sub.screen(text, it.county);
    if (flags.length) { blocked.push(`${it.id}: ${flags.join(', ')}`); continue; }
    s.priorities[it.id] = { id: it.id, tenant: it.tenant, kind: 'prioritize', title: it.title, why: it.why, node_ref: null, level: it.level, target: it.level, state: it.state || null,
      created_at: now, supporters: {}, status: 'open', by: it.by, campaign: it.campaign, ...(it.goal ? { goal: it.goal } : {}), ...(it.to ? { to: it.to } : {}) };
    posted++;
  }
  if (posted) { chain.append('priority-bulk', { campaign: items[0] && items[0].campaign, posted }); save(s); }
  return { posted, blocked };
}

// Link an existing petition into a shared campaign (e.g. one a resident started first).
function tagCampaign(id, campaign) { const s = load(); if (!s.priorities[id]) return false; s.priorities[id].campaign = campaign; save(s); return true; }

function getPublic(id) { const p = get(id); return p && p.status === 'open' && real(p) ? enrich(p) : null; }

module.exports = { bulkPropose, tagCampaign, campaignRollup, findCampaignCopy, getPublic, propose, support, addOutcome, undoOutcome, phaseOf, get, setStatus, remove, mySupport, supportedBy, listFor, listByLevel, listAll };
