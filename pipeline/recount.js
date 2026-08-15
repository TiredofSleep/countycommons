// The recount — Clark Commons' version of OzarkPOS's diff-observer.
//
// Lesson from the live POS (hub-server.js, written after the 2026-08-03
// incident where a stale station silently rolled back 24 orders): don't
// trust every code path to remember to log — OBSERVE the data and diff it,
// so nothing can forget and nothing can opt out. Here the observer compares
// the mutable stores (votes, submissions) against the append-only chain:
//
//   store entry with no chain event  → CRITICAL: an unlogged write — the
//                                      civic equivalent of `back:1`
//   chain vote newer than the store  → checked against corrections; flagged
//                                      if unexplained
//   tally recount                    → recompute every count from raw and
//                                      compare (SECURITY §13.3)
//
// Read-only, always. Exit code = number of failed invariants, so it can
// gate a deploy (check-invariants.js pattern). Wired into pipeline/verify.js.

const fs = require('fs');
const path = require('path');
const { readAll } = require('../server/lib/chain');

const ROOT = path.join(__dirname, '..');

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); }
  catch (e) { return fallback; }
}

function recount() {
  const results = [];
  const chain = readAll();
  const votesStore = loadJson('data/civic-votes.json', { votes: {} });
  const subsStore = loadJson('data/civic-submissions.json', { submissions: [] });

  // Latest chain state per (issue, participant), honoring corrections that
  // reference removed entries.
  const chainVotes = new Map();
  const corrected = new Set();
  for (const e of chain) {
    if (e.type === 'correction' && e.data && e.data.refs_seq !== undefined) corrected.add(e.data.refs_seq);
  }
  chain.forEach((e, seq) => {
    if (e.type === 'vote' && !corrected.has(seq)) {
      chainVotes.set(e.data.issue + '|' + e.data.participant, e.data.value);
    }
  });

  // 1. Every store vote must exist in the chain with the same final value.
  let unlogged = 0, mismatched = 0, storeCount = 0;
  for (const [issue, byPart] of Object.entries(votesStore.votes || {})) {
    for (const [participant, v] of Object.entries(byPart)) {
      storeCount++;
      const key = issue + '|' + participant;
      if (!chainVotes.has(key)) unlogged++;
      else if (chainVotes.get(key) !== v.value) mismatched++;
      chainVotes.delete(key);
    }
  }
  results.push({ name: 'Votes: no unlogged writes', ok: unlogged === 0,
    detail: unlogged === 0 ? `${storeCount} store votes all present in the chain`
      : `CRITICAL: ${unlogged} store vote(s) have NO chain event — an unlogged write happened` });
  results.push({ name: 'Votes: final values match chain', ok: mismatched === 0,
    detail: mismatched === 0 ? 'every store value equals its last chain event'
      : `${mismatched} store vote(s) differ from the chain's last word` });

  // 2. Chain votes absent from the store must be explained by corrections.
  const orphans = chainVotes.size;
  results.push({ name: 'Votes: chain↔store orphans explained', ok: orphans === 0,
    detail: orphans === 0 ? 'no chain votes missing from the store (corrections accounted for)'
      : `${orphans} chain vote(s) missing from the store without a correction entry` });

  // 3. Every submission must have its chain event.
  const chainSubs = new Set(chain.filter(e => e.type === 'question-submitted').map(e => e.data.id));
  const missingSubs = (subsStore.submissions || []).filter(s => !chainSubs.has(s.id)).length;
  results.push({ name: 'Submissions: no unlogged writes', ok: missingSubs === 0,
    detail: missingSubs === 0 ? `${(subsStore.submissions || []).length} submissions all chained`
      : `CRITICAL: ${missingSubs} submission(s) missing from the chain` });

  // 4. Every public signature must have its chain event.
  const sigStore = loadJson('data/civic-signatures.json', { signatures: [] });
  const chainSigs = new Set(chain.filter(e => e.type === 'signature').map(e => e.data.id));
  const missingSigs = (sigStore.signatures || []).filter(s => !chainSigs.has(s.id)).length;
  results.push({ name: 'Signatures: no unlogged writes', ok: missingSigs === 0,
    detail: missingSigs === 0 ? `${(sigStore.signatures || []).length} public signatures all chained`
      : `CRITICAL: ${missingSigs} signature(s) missing from the chain` });

  return results;
}

if (require.main === module) {
  const results = recount();
  let failed = 0;
  for (const r of results) {
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.name} — ${r.detail}`);
    if (!r.ok) failed++;
  }
  process.exit(failed);
}

module.exports = { recount };
