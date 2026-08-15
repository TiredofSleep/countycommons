// The one vote gate. Every channel — today web, later SMS/email/paper —
// converges on castVote(participant, issue, value, channel). No side doors.
//
// Tier 0 only for now: participants are anonymous browser tokens; no identity
// data exists anywhere. The store is a gitignored JSON file (votes are not
// corpus); it migrates to data/civic.db when the full voting layer (M2)
// arrives. Aggregate-only rendering with the sub-20 floor happens in tally().

const fs = require('fs');
const path = require('path');
const chain = require('./lib/chain');

const STORE = path.join(__dirname, '..', 'data', 'civic-votes.json');
const VALUES = new Set(['yes', 'no', 'skip']);
// Self-reported connection to the county, asked first on every vote.
// Everyone can answer — the count just says who's who. Not verified;
// always labeled that way. Verification tiers replace this at M5.
const CONNECTIONS = new Set(['resident', 'works-here', 'family-here', 'elsewhere']);

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { return { votes: {} }; }
}

function castVote(participant, issue, value, channel, connection) {
  if (!VALUES.has(value)) throw new Error('invalid vote value');
  const conn = CONNECTIONS.has(connection) ? connection : 'unsaid';
  // Chain FIRST, store second — the deliberate inverse of the POS doctrine
  // ("archiving must never break a save"). In a civic system the log is the
  // product: if the chain cannot record a vote, the vote must not happen.
  // If the store write fails after the chain append, the recount observer
  // (pipeline/recount.js) surfaces the orphan as an incident.
  chain.append('vote', { issue, participant, value, channel, connection: conn });
  const store = loadStore();
  if (!store.votes[issue]) store.votes[issue] = {};
  // Last write wins until close; every vote channel-tagged.
  store.votes[issue][participant] = { value, channel, connection: conn, cast_at: new Date().toISOString() };
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE);
  return store.votes[issue][participant];
}

// Tallying lives in server/tally.js — the one module allowed to join votes
// with registrations (in memory, at tally time) to clear double votes.

function myVote(participant, issue) {
  const store = loadStore();
  return (store.votes[issue] || {})[participant] || null;
}

module.exports = { castVote, myVote };
