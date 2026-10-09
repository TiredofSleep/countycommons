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

// RULE 8 in a code path, not just policy (NEVER.md, October 2026 amendment).
// Elected officials and candidates may be named and their conduct raised;
// non-elected staff may not; nobody campaigns here, and no resident vote picks
// a race's winner or decides a live ballot measure. Priorities and solutions
// treat a flag as a hard stop; the question box flags for a human reviewer.
const people = require('./lib/people');

const CAMPAIGN = /\b(vote for|vote against|unseat|defeat|elect|re-?elect|endorse|campaign (for|against))\b/i;
const BALLOT_MEASURE = /\b(ballot measure|referendum|initiative|proposition|on the ballot|millage vote|bond issue)\b/i;
const CONDUCT = /\b(corrupt|crook|resign|fired|stole|lying|incompetent|should be removed)\b/i;
// Conduct words next to these are aimed at staff, even under an elected office's name.
const STAFF = /\b(deput(y|ies)|employees?|staff(ers?)?|dispatchers?|jailers?|officers?|secretar(y|ies)|assistants?|workers?)\b/i;

function defaultCounty() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'county.json'), 'utf8')); }
  catch (e) { return null; }
}

// screen(text, county, { vote }) → flags ([] when clean). `vote` marks text
// that would become a resident yes/no vote, which may never name a candidate
// in a live race (that would be polling the race).
function screen(text, county, opts) {
  county = county || defaultCounty();
  const vote = !!(opts && opts.vote);
  const t = String(text || '');
  const flags = [];
  const r = people.roster(county);
  if (CAMPAIGN.test(t)) flags.push('campaigning');
  if (BALLOT_MEASURE.test(t)) flags.push('possible-ballot-measure');
  if (people.named(t, r.appointed).length) flags.push('names-non-elected-staff');
  if (CONDUCT.test(t)) {
    const atElected = people.named(t, r.elected).length || people.ELECTED_TITLE.test(t);
    if (!atElected) flags.push('conduct-not-aimed-at-an-elected-office');
    else if (STAFF.test(t)) flags.push('conduct-aimed-at-staff');
  }
  if (vote && people.named(t, r.candidates).length) flags.push('names-a-candidate-in-a-live-race');
  // Election blackout window (from the county's config), if one is set.
  const now = new Date().toISOString().slice(0, 10);
  for (const w of (((county || {}).calendar || {}).election_blackouts || [])) {
    if (w.start && w.end && now >= w.start && now <= w.end) flags.push('in-election-blackout');
  }
  return flags;
}

function submit({ question, name, contact }) {
  const store = loadStore();
  const q = String(question).slice(0, 1000);
  const flags = screen(q, null, { vote: true });
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
