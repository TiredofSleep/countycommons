// The activity log — append-only, hash-chained (SECURITY.md §13).
//
// Every state change becomes an entry carrying the hash of the previous
// entry: any retroactive edit breaks every hash after it, visibly. No
// deletes, no updates; mistakes are corrected by new entries referencing
// the old. The internal log keeps full fidelity and is NOT the public
// export — pipeline/anchor.js publishes the coarsened public anchor
// (head hash + bucketed counts) per §13.5, so integrity transparency
// never becomes a side door around participant privacy.
//
// Honesty note, permanently on the record: this chain begins at commit
// ~30 of the project, not commit 1. History before the chain's genesis
// entry is vouched for by the public git history, not by the chain.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG = path.join(__dirname, '..', '..', 'data', 'activity-log.jsonl');

function entryHash(e) {
  const { hash, ...rest } = e;
  return crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex');
}

function readAll() {
  let text;
  try { text = fs.readFileSync(LOG, 'utf8'); }
  catch (e) { return []; }
  // Parse line-by-line and keep the valid PREFIX. A single truncated final
  // line (a crash mid-append) must never collapse the whole chain to empty —
  // that would let the next append fork a fresh genesis and orphan history.
  // verifyChain() still catches any deeper tampering.
  const out = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); }
    catch (err) { break; }
    out.push(e);
  }
  return out;
}

function head() {
  const all = readAll();
  return all.length ? all[all.length - 1] : null;
}

function append(type, data) {
  const prev = head();
  const entry = {
    seq: prev ? prev.seq + 1 : 0,
    ts: new Date().toISOString(),
    type,
    data,
    prev: prev ? prev.hash : 'genesis'
  };
  entry.hash = entryHash(entry);
  fs.appendFileSync(LOG, JSON.stringify(entry) + '\n');
  return entry;
}

// Walk the full chain; returns { ok, length, head, error? }.
function verifyChain() {
  const all = readAll();
  let prevHash = 'genesis';
  for (let i = 0; i < all.length; i++) {
    const e = all[i];
    if (e.seq !== i) return { ok: false, length: all.length, error: `seq gap at ${i}` };
    if (e.prev !== prevHash) return { ok: false, length: all.length, error: `chain break at seq ${i}` };
    if (entryHash(e) !== e.hash) return { ok: false, length: all.length, error: `hash mismatch at seq ${i}` };
    prevHash = e.hash;
  }
  return { ok: true, length: all.length, head: prevHash === 'genesis' ? null : prevHash };
}

module.exports = { append, head, verifyChain, readAll };
