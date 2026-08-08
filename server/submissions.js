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

function submit({ question, name, contact }) {
  const store = loadStore();
  const entry = {
    id: crypto.randomBytes(8).toString('hex'),
    ts: new Date().toISOString(),
    question: String(question).slice(0, 1000),
    name: name ? String(name).slice(0, 120) : null,
    contact: contact ? String(contact).slice(0, 200) : null,
    status: 'received'
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

module.exports = { submit, queueCount };
