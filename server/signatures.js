// Public signatures — the opt-in loud version of a vote. The anonymous
// count answers "how many"; a signature is a resident choosing to be heard
// by name, petition-style. Rules that keep it honest:
//   - strictly opt-in, always a separate act from voting
//   - name + answer only; no free text, so there is nothing to moderate
//     except the name itself
//   - labeled self-signed and unverified until the verification tiers
//   - one signature per participant per issue, newest wins (same as votes)
//   - removal on request: correction entry in the chain + store delete —
//     removals are on the public record like everything else
// Chain FIRST, store second, same as votes: if it can't be logged, it
// doesn't happen.

const fs = require('fs');
const path = require('path');
const chain = require('./lib/chain');

const STORE = path.join(__dirname, '..', 'data', 'civic-signatures.json');

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { return { signatures: [] }; }
}

function sign(participant, issue, value, name, city) {
  const cleanName = String(name || '').trim().slice(0, 80);
  const cleanCity = String(city || '').trim().slice(0, 60);
  if (!cleanName) return null;
  const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  // The chain records THAT a signature happened — its id, issue, and answer —
  // never the name/town, and never the PARTICIPANT token. Dropping the token
  // keeps SECURITY.md §2 literally true: nothing in the append-only log can
  // join a person to how they voted on issues they never signed. Name/town
  // live only in the gitignored store, so unsign truly erases them everywhere.
  chain.append('signature', { id, issue, value });
  const store = loadStore();
  // Newest wins per participant per issue — re-signing replaces.
  store.signatures = store.signatures.filter(s => !(s.issue === issue && s.participant === participant));
  store.signatures.push({ id, issue, participant, value, name: cleanName, city: cleanCity, ts: new Date().toISOString() });
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE);
  return id;
}

function listFor(issue) {
  return loadStore().signatures
    .filter(s => s.issue === issue)
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
}

function mySignature(participant, issue) {
  return loadStore().signatures.find(s => s.issue === issue && s.participant === participant) || null;
}

// Keep a public signature honest when the signer changes their vote. A
// signature is a petition line — it must show the person's CURRENT answer,
// never a stale one. Called from the vote path: if this participant has a
// public signature on this issue, re-point it to the new value and chain the
// change. Returns true if a signature was updated.
function reflectVote(participant, issue, value) {
  const store = loadStore();
  const sig = store.signatures.find(s => s.issue === issue && s.participant === participant);
  if (!sig || sig.value === value) return false;
  chain.append('signature-updated', { id: sig.id, issue, value });
  sig.value = value;
  sig.ts = new Date().toISOString();
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE);
  return true;
}

// Unchecking the announce box takes the name off the page — and like every
// write, the removal is chained first, so the public record shows a
// signature existed and was withdrawn, without keeping the name in the store.
function unsign(participant, issue) {
  const sig = mySignature(participant, issue);
  if (!sig) return false;
  chain.append('signature-removed', { id: sig.id, issue });
  const store = loadStore();
  store.signatures = store.signatures.filter(s => s.id !== sig.id);
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE);
  return true;
}

module.exports = { sign, listFor, mySignature, unsign, reflectVote };
