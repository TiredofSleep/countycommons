// Resident-created questions, across three levels: local (a county), state
// (every county in a state), national (every county). This is where a resident
// proposes a question; others support it; at a threshold it goes live for
// Tier-0 voting like any other question. Votes aggregate through the same
// global one-vote gate, so a state or national question tallies across every
// county at once.
//
// The frame holds at every level: advisory signal to the body that decides —
// local to the quorum court / city board, state to the legislature, national
// to Congress. It informs the republic; it never replaces it. And the same
// charter bright lines apply — no candidates, no ballot measures, no questions
// about a named person's conduct — screened in code before a proposal is made.
//
// Store is gitignored operational data (like votes/signatures). Chain-first.

const fs = require('fs');
const path = require('path');
const chain = require('./lib/chain');
const { screen } = require('./submissions');

const STORE = path.join(__dirname, '..', 'data', 'shared-questions.json');
const PROMOTE_AT = 10; // supporters needed to put a proposal to a live vote
const SCOPES = new Set(['local', 'state', 'national']);

function load() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { return { questions: [] }; }
}
function save(store) {
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE);
}
function today() { return new Date().toISOString().slice(0, 10); }

// A resident proposes a question at a level. Returns {id} or {error, flags}.
function ask({ scope, state, tenant, wording, context, participant }) {
  scope = SCOPES.has(scope) ? scope : 'local';
  wording = String(wording || '').trim().slice(0, 300);
  if (!wording) return { error: 'empty' };
  const flags = screen(wording);
  if (flags.length) return { error: 'bright-line', flags };
  const id = wording.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36)
    + '-' + Math.abs(hash(wording + Date.now())).toString(36).slice(0, 4);
  const q = {
    id, scope,
    state: scope === 'national' ? null : (state || null),
    tenant: scope === 'local' ? (tenant || null) : null,
    final_wording: wording,
    context: String(context || '').trim().slice(0, 600) || null,
    status: 'proposed',
    supporters: participant ? [participant] : [],
    opened: null,
    created_by: 'resident',
    created_ts: new Date().toISOString()
  };
  const store = load();
  store.questions.push(q);
  chain.append('question-proposed', { id, scope });
  save(store);
  return { id };
}

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return h; }

// Support a proposal. Auto-promotes to a live vote at the threshold.
function support(participant, id) {
  const store = load();
  const q = store.questions.find(x => x.id === id);
  if (!q || q.status !== 'proposed') return null;
  if (!participant) return { count: q.supporters.length };
  if (!q.supporters.includes(participant)) q.supporters.push(participant);
  let promoted = false;
  if (q.supporters.length >= PROMOTE_AT) {
    q.status = 'open-tier0'; q.opened = today(); promoted = true;
    chain.append('question-opened', { id: q.id, scope: q.scope });
  }
  save(store);
  return { count: q.supporters.length, promoted };
}

// Host/owner: promote a proposal now, close a live one, or remove a question.
function setStatus(id, status) {
  const store = load();
  const q = store.questions.find(x => x.id === id);
  if (!q) return false;
  if (status === 'open-tier0' && q.status === 'proposed') { q.opened = today(); chain.append('question-opened', { id, scope: q.scope }); }
  q.status = status;
  save(store);
  return true;
}
function remove(id) {
  const store = load();
  const before = store.questions.length;
  store.questions = store.questions.filter(x => x.id !== id);
  if (store.questions.length !== before) { chain.append('question-removed', { id }); save(store); return true; }
  return false;
}

// Questions visible to a given county: its own local ones, its state's, and
// national ones. Caller splits by status (open vs proposed).
function visibleFor(tenant, state) {
  return load().questions.filter(q =>
    q.scope === 'national'
    || (q.scope === 'state' && q.state === state)
    || (q.scope === 'local' && q.tenant === tenant));
}

module.exports = { ask, support, setStatus, remove, visibleFor, PROMOTE_AT };
