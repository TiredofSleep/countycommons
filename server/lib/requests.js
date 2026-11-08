// "Take it further": after signing an information petition, a signer can
// print (1) a letter to the county's elected officials, and (2) where the
// state's records law is verified (config/records-law.json), one precise
// public records request for the existing records — filed once per county and
// item, with everyone else adding their support instead of filing duplicates,
// and the status (filed, due, answered) shown in public.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const STORE = path.join(ROOT, 'data', 'records-requests.json');

let LAW = { m: 0, d: null };
function law(st) {
  const f = path.join(ROOT, 'config', 'records-law.json');
  try { const m = fs.statSync(f).mtimeMs; if (m !== LAW.m) LAW = { m, d: JSON.parse(fs.readFileSync(f, 'utf8')) }; } catch (e) { return null; }
  return (LAW.d.states || {})[st] || null;
}

// What to ask for, per information petition: records that already exist (a
// records law doesn't make anyone create a new record). `office` is the
// likeliest custodian in Arkansas; a custodian who isn't must say who is.
const YEAR = () => new Date().getFullYear();
const RECORDS = {
  'open-checkbook': { office: { AR: 'County Clerk' }, what: (st) => `${st === 'AR' ? 'The register of warrants (checks)' : 'The check register or list of payments'} issued from all county funds from January 1, ${YEAR()}, through the date of this request, showing for each payment the date, payee, amount, fund and purpose or account.` },
  'post-contracts': { office: { AR: 'County Judge' }, what: () => `Copies of each contract and agreement worth $25,000 or more that the county entered into from January 1, ${YEAR()}, through the date of this request, and any existing register, log or list of the county’s contracts for that period.` },
  'card-spending': { office: { AR: 'County Judge' }, what: () => `The monthly statements for every county credit card and purchasing card account from January 1, ${YEAR()}, through the date of this request.` },
  'pay-by-job': { office: { AR: 'County Clerk' }, what: (st) => st === 'AR' ? 'The current county salary ordinance or salary schedule showing the pay for each county position.' : 'The current salary schedule or pay plan showing the pay or pay range for each county job title.' },
  'monthly-budget-reports': { office: { AR: 'County Treasurer' }, what: () => `Each monthly report of revenues and expenditures compared with the budget that was presented to the county’s governing body from January 1, ${YEAR()}, through the date of this request.` },
  'proposed-budget-first': { office: { AR: 'County Judge' }, what: (st) => st === 'AR' ? `The proposed ${YEAR() + 1} county budget in its current form, and any budget requests submitted by county offices for ${YEAR() + 1}.` : 'The most recent proposed county budget, and the department budget requests submitted for it.' },
  'officials-filings-online': { states: ['AR'], office: { AR: 'County Clerk' }, what: () => 'The most recent Statement of Financial Interest filed by each elected county official.' },
  'tax-deals': { office: { AR: 'County Judge' }, what: () => 'Every tax abatement, payment-in-lieu-of-taxes and economic development incentive agreement the county has in effect, including the company, the value, and the jobs or investment promised.' },
  'receipts-online': { office: { AR: 'County Clerk' }, what: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); const mon = d.toLocaleString('en-US', { month: 'long', year: 'numeric' }); return `The invoices or receipts supporting each payment of $5,000 or more made from the county general fund in ${mon}.`; } },
  'meetings-online': { office: { AR: 'County Clerk' }, what: () => `The agenda and the minutes of each meeting of the county’s governing body held from July 1, ${YEAR()}, through the date of this request.` },
  'record-every-vote': { office: { AR: 'County Clerk' }, what: () => `The minutes of each meeting of the county’s governing body held from July 1, ${YEAR()}, through the date of this request, including any record of how each member voted.` },
  'annual-report-online': { office: { AR: 'County Treasurer' }, what: () => 'The county’s most recent annual financial report and its most recent audit or state review.' },
  'budget-online': { office: { AR: 'County Judge' }, what: () => `The adopted ${YEAR()} county budget, including the line-item detail for each office.` },
};
const recordFor = (campId, st) => { const r = RECORDS[campId]; return r && law(st) && (!r.states || r.states.includes(st)) ? r : null; };

// ---- the public tracker: one request per county and petition ----
let CACHE = { m: -1, d: null };
function load() { let m = 0; try { m = fs.statSync(STORE).mtimeMs; } catch (e) { return { requests: {} }; } if (m !== CACHE.m) { try { CACHE = { m, d: JSON.parse(fs.readFileSync(STORE, 'utf8')) }; } catch (e) { return { requests: {} }; } } return JSON.parse(JSON.stringify(CACHE.d)); }
function save(s) { const t = STORE + '.tmp'; fs.writeFileSync(t, JSON.stringify(s, null, 1)); fs.renameSync(t, STORE); }
const key = (geoid, campId) => `${geoid}:${campId}`;
const hash = (p) => crypto.createHash('sha256').update('cc-req:' + p).digest('hex').slice(0, 16);

// Add business days (weekends skipped; holidays can add more).
function addBusinessDays(d, n) { const x = new Date(d); let left = n; while (left > 0) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) left--; } return x; }
const iso = (d) => d.toISOString().slice(0, 10);

function status(geoid, campId) {
  const r = load().requests[key(geoid, campId)]; if (!r) return null;
  const out = Object.assign({}, r, { supporters: Object.keys(r.support || {}).length });
  delete out.support; delete out.filer;
  out.overdue = !r.answered_at && r.due && iso(new Date()) > r.due;
  return out;
}
function markFiled(geoid, campId, st, participant, filedOn) {
  const s = load(); const k = key(geoid, campId);
  if (s.requests[k]) return { already: true };
  const L = law(st); const d = /^\d{4}-\d{2}-\d{2}$/.test(filedOn || '') ? new Date(filedOn + 'T12:00:00') : new Date();
  if (iso(d) > iso(new Date()) || iso(d) < iso(new Date(Date.now() - 60 * 864e5))) return { error: 'date' };
  s.requests[k] = { geoid, campaign: campId, st, filed_at: iso(d), due: L ? iso(addBusinessDays(d, L.deadline_days)) : null, filer: hash(participant), support: {}, answered_at: null, answer: null, answer_url: null };
  save(s); return { ok: true };
}
function addSupport(geoid, campId, participant) {
  const s = load(); const r = s.requests[key(geoid, campId)]; if (!r) return false;
  r.support = r.support || {}; r.support[hash(participant)] = 1; save(s); return true;
}
// Record the county's answer (admin: pipeline/requests.js).
function answer(geoid, campId, { note, url, at }) {
  const s = load(); const r = s.requests[key(geoid, campId)]; if (!r) return false;
  r.answered_at = at || iso(new Date()); r.answer = note || null; r.answer_url = url || null; save(s); return true;
}

module.exports = { law, recordFor, status, markFiled, addSupport, answer, RECORDS };
