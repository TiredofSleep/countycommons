// Publishes the activity log's public anchor (SECURITY.md §13.2 + §13.5):
// verifies the full hash chain, then exports the head hash plus coarsened
// event counts (daily buckets, under-20 floor) to the public corpus.
// Committing the anchor file to the public git repo is the external witness —
// once anchored, rewriting history makes the world's copies disagree.
//
// Usage: node pipeline/anchor.js   (run nightly; also fine ad hoc)

const fs = require('fs');
const path = require('path');
const { verifyChain, readAll } = require('../server/lib/chain');
const { FLOOR } = require('../server/tally');

const OUT = path.join(__dirname, '..', 'data', 'corpus', 'activity-anchor.json');

const v = verifyChain();
if (!v.ok) {
  console.error(`CHAIN VERIFICATION FAILED: ${v.error} — this is an integrity incident (SECURITY.md §10).`);
  process.exit(1);
}

// Coarsen: per-day, per-type counts; vote counts additionally per-issue.
// No participant IDs, no precise timestamps, floor applied to vote counts.
const days = {};
for (const e of readAll()) {
  const day = e.ts.slice(0, 10);
  if (!days[day]) days[day] = { events: {}, votes_by_issue: {} };
  days[day].events[e.type] = (days[day].events[e.type] || 0) + 1;
  if (e.type === 'vote' && e.data && e.data.issue) {
    days[day].votes_by_issue[e.data.issue] = (days[day].votes_by_issue[e.data.issue] || 0) + 1;
  }
}
for (const d of Object.values(days)) {
  for (const [issue, n] of Object.entries(d.votes_by_issue)) {
    if (n < FLOOR) d.votes_by_issue[issue] = `under ${FLOOR}`;
  }
}

fs.writeFileSync(OUT, JSON.stringify({
  anchored_at: new Date().toISOString(),
  chain_length: v.length,
  head_hash: v.head,
  note: 'Public anchor of the append-only activity log. The internal log is hash-chained with full fidelity; this export is coarsened to daily buckets with the under-20 floor so integrity transparency never deanonymizes anyone (SECURITY.md §13.5). Anyone can verify: the chain begins at the genesis entry; any rewrite breaks every hash after it.',
  daily: days
}, null, 2));

console.log(`Chain verified: ${v.length} entries, head ${v.head ? v.head.slice(0, 16) + '…' : '(empty)'} → anchor written to data/corpus/activity-anchor.json`);
