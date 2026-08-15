// The counting house — and the ONLY module allowed to see both stores at
// once (CLAUDE.md rule 1). Votes (civic) and registrations (identity) join
// here, in memory, at tally time; the join is never persisted, logged, or
// rendered. One purpose: the one-person-one-voice rule. When registered
// votes share an email or a phone, only the newest survives the count —
// double votes clear themselves the moment the tally is computed.
//
// What renders is aggregate only, plus one honest number: how many
// duplicates were collapsed. Never which ones, never whose.

const fs = require('fs');
const path = require('path');

const VOTES = path.join(__dirname, '..', 'data', 'civic-votes.json');
const IDENTS = path.join(__dirname, '..', 'data', 'identity-registrations.json');

// Reserved for the verified tiers (M5): small verified counts render as
// ranges. Tier 0 counts are anonymous and display exactly, instantly.
const FLOOR = 20;

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return fallback; }
}

const normEmail = e => String(e || '').trim().toLowerCase();
const normPhone = p => String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

function tally(issue) {
  const votes = loadJson(VOTES, { votes: {} }).votes[issue] || {};
  const regs = loadJson(IDENTS, { registrations: {} }).registrations || {};

  // Oldest-first, so a later vote from the same registered person takes the
  // contact key and knocks the earlier vote out — last voice wins, same as
  // within a sitting.
  const entries = Object.entries(votes)
    .sort((a, b) => String(a[1].cast_at).localeCompare(String(b[1].cast_at)));
  const keep = new Map(entries);
  const owner = new Map();
  let removed = 0;
  for (const [part, v] of entries) {
    const r = regs[part] || {};
    const keys = [];
    if (normEmail(r.email)) keys.push('e:' + normEmail(r.email));
    if (normPhone(r.phone)) keys.push('p:' + normPhone(r.phone));
    for (const key of keys) {
      const prev = owner.get(key);
      if (prev && prev !== part && keep.has(prev)) { keep.delete(prev); removed++; }
      owner.set(key, part);
    }
  }

  const counts = { yes: 0, no: 0, skip: 0 };
  const connections = { resident: 0, 'works-here': 0, 'family-here': 0, elsewhere: 0, unsaid: 0 };
  for (const v of keep.values()) {
    counts[v.value]++;
    connections[connections[v.connection] !== undefined ? v.connection : 'unsaid']++;
  }
  return { total: keep.size, floor: FLOOR, counts, connections, duplicates_removed: removed };
}

module.exports = { tally, FLOOR };
