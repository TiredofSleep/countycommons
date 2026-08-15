// The identity side of the two-store rule (CLAUDE.md rule 1), in seed form.
//
// Voters may volunteer as much or as little about themselves as they want —
// name, email, phone, city, zip. It lands here, keyed by the same anonymous
// participant token the vote uses, and NOWHERE else:
//   - gitignored, never served over HTTP, never rendered on any page
//   - never joined to votes except in memory at tally time (server/tally.js,
//     when the verification tiers arrive at M5)
//   - the chain records THAT a registration happened and WHICH fields were
//     volunteered — never the values; identity data stays out of the log,
//     because the log's public anchor must never witness a person
// This JSON file migrates to the encrypted data/identity.db at M2.
// Removal on request: delete the participant's entry; the chain keeps only
// the fact that a registration event occurred.

const fs = require('fs');
const path = require('path');
const chain = require('./lib/chain');

const STORE = path.join(__dirname, '..', 'data', 'identity-registrations.json');
const FIELDS = ['name', 'email', 'phone', 'city', 'zip'];

function register(participant, body) {
  const given = {};
  for (const f of FIELDS) {
    const v = String((body && body[f]) || '').trim().slice(0, 120);
    if (v) given[f] = v;
  }
  if (!Object.keys(given).length) return null;
  chain.append('registration', { participant, fields: Object.keys(given) });
  let store;
  try { store = JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { store = { registrations: {} }; }
  store.registrations[participant] = Object.assign(
    store.registrations[participant] || {}, given,
    { updated_at: new Date().toISOString() });
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE);
  return Object.keys(given);
}

// How much has been volunteered, without exposing any of it — lets a page
// say "you've shared your email" without ever rendering the email.
function fieldsOf(participant) {
  try {
    const store = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    const rec = store.registrations[participant];
    return rec ? FIELDS.filter(f => rec[f]) : [];
  } catch (e) { return []; }
}

module.exports = { register, fieldsOf };
