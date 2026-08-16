// Resident question submissions — the open front door of the voice layer.
// Charter pipeline: raw submission → neutrality/wording review → human
// review against the bright lines → opens as a question. Nothing publishes
// automatically; this module only receives and queues.
//
// Privacy: the store is gitignored operational data. Contact info is
// optional, used only to follow up on the submission, and never rendered
// anywhere public. The activity chain logs that a submission happened —
// never its text or submitter.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chain = require('./lib/chain');

const STORE = path.join(__dirname, '..', 'data', 'civic-submissions.json');

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { return { submissions: [] }; }
}

// RULE 8 in a code path, not just policy: screen every submission against the
// charter bright lines and flag matches for the human reviewer. This never
// auto-rejects — a person still decides — but the risk is surfaced by code, so
// a candidate/ballot-measure/conduct question can't slip through unnoticed.
const BRIGHT_LINES = [
  { flag: 'possible-candidate', re: /\b(candidate|vote for|elect|re-?elect|running for|for (sheriff|judge|mayor|office))\b/i },
  { flag: 'possible-ballot-measure', re: /\b(ballot measure|referendum|initiative|proposition|on the ballot|millage vote|bond issue)\b/i },
  { flag: 'possible-named-conduct', re: /\b(corrupt|crook|resign|fired|stole|lying|incompetent|should be removed)\b/i }
];

function screen(question) {
  const flags = [];
  for (const b of BRIGHT_LINES) if (b.re.test(question)) flags.push(b.flag);
  // Election blackout window (from config/county.json), if one is set.
  try {
    const county = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'county.json'), 'utf8'));
    const now = new Date().toISOString().slice(0, 10);
    for (const w of ((county.calendar || {}).election_blackouts || [])) {
      if (w.start && w.end && now >= w.start && now <= w.end) flags.push('in-election-blackout');
    }
  } catch (e) { /* no config or no windows set */ }
  return flags;
}

function submit({ question, name, contact }) {
  const store = loadStore();
  const q = String(question).slice(0, 1000);
  const flags = screen(q);
  const entry = {
    id: crypto.randomBytes(8).toString('hex'),
    ts: new Date().toISOString(),
    question: q,
    name: name ? String(name).slice(0, 120) : null,
    contact: contact ? String(contact).slice(0, 200) : null,
    status: 'received',
    // Charter bright-line flags for the human reviewer; empty is the norm.
    bright_line_flags: flags
  };
  // Chain first, store second (integrity-first; see vote.js for the doctrine).
  chain.append('question-submitted', { id: entry.id });
  store.submissions.push(entry);
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE);
  return entry;
}

function queueCount() {
  return loadStore().submissions.filter(s => s.status === 'received').length;
}

module.exports = { submit, queueCount, screen };
