// The one vote gate. Every channel — today web, later SMS/email/paper —
// converges on castVote(participant, issue, value, channel). No side doors.
//
// Tier 0 only for now: participants are anonymous browser tokens; no identity
// data exists anywhere. The store is a gitignored JSON file (votes are not
// corpus); it migrates to data/civic.db when the full voting layer (M2)
// arrives. Aggregate-only rendering with the sub-20 floor happens in tally().

const fs = require('fs');
const path = require('path');

const STORE = path.join(__dirname, '..', 'data', 'civic-votes.json');
const VALUES = new Set(['yes', 'no', 'skip']);

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { return { votes: {} }; }
}

function castVote(participant, issue, value, channel) {
  if (!VALUES.has(value)) throw new Error('invalid vote value');
  const store = loadStore();
  if (!store.votes[issue]) store.votes[issue] = {};
  // Last write wins until close; every vote channel-tagged.
  store.votes[issue][participant] = { value, channel, cast_at: new Date().toISOString() };
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE);
  return store.votes[issue][participant];
}

// Aggregates only. Below the privacy floor, exact counts are withheld and a
// range renders instead — the same rule the full platform will apply per tier.
const FLOOR = 20;

function tally(issue) {
  const store = loadStore();
  const votes = Object.values(store.votes[issue] || {});
  const counts = { yes: 0, no: 0, skip: 0 };
  for (const v of votes) counts[v.value]++;
  const total = votes.length;
  return {
    total,
    floor: FLOOR,
    below_floor: total < FLOOR,
    counts: total < FLOOR ? null : counts
  };
}

function myVote(participant, issue) {
  const store = loadStore();
  return (store.votes[issue] || {})[participant] || null;
}

module.exports = { castVote, tally, myVote };
