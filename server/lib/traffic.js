// Privacy-preserving traffic counter (CLAUDE.md: aggregate-only, no surveillance).
//
// The ONLY thing recorded is a count: how many page views each county got, per
// day. No IP addresses. No cookies. No user agents. No per-person anything —
// there is nothing here that could be traced to a reader, by us or by anyone
// who seizes the file. It answers "which counties are people looking at?" and
// refuses to answer "who looked?" — on purpose. Publishable by design.
//
// Kept in memory and flushed to data/traffic.json every minute (and on exit),
// so it costs a Map increment per request, not a disk write.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '..', 'data', 'traffic.json');
const FLUSH_MS = 60 * 1000;

// Shape: { since, updated, days: { "YYYY-MM-DD": { total, byCounty: {key:n} } },
//          totalsByCounty: { key: n }, lifetimeTotal }
let store = null;
let dirty = false;

function blank() {
  return { since: null, updated: null, days: {}, totalsByCounty: {}, lifetimeTotal: 0 };
}

function load() {
  try { store = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (e) { store = blank(); }
  if (!store.days) store = blank();
}

function today() { return new Date().toISOString().slice(0, 10); }

// Record one page view for a county. `tenantKey` is the county; nothing else
// about the request is passed in, so nothing else can be recorded.
function note(tenantKey) {
  if (!store) load();
  if (!tenantKey) return;
  const d = today();
  if (!store.since) store.since = d;
  store.updated = new Date().toISOString();
  const day = store.days[d] || (store.days[d] = { total: 0, byCounty: {} });
  day.total++;
  day.byCounty[tenantKey] = (day.byCounty[tenantKey] || 0) + 1;
  store.totalsByCounty[tenantKey] = (store.totalsByCounty[tenantKey] || 0) + 1;
  store.lifetimeTotal = (store.lifetimeTotal || 0) + 1;
  dirty = true;
}

function flush() {
  if (!store || !dirty) return;
  try {
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
    fs.renameSync(tmp, FILE);
    dirty = false;
  } catch (e) { /* a missed flush is not worth crashing over */ }
}

// A copy for rendering. Days sorted newest-first, capped so the page stays small.
function summary(maxDays = 30) {
  if (!store) load();
  const days = Object.keys(store.days).sort().reverse().slice(0, maxDays)
    .map(d => ({ date: d, total: store.days[d].total, byCounty: store.days[d].byCounty }));
  return {
    since: store.since, updated: store.updated,
    lifetimeTotal: store.lifetimeTotal || 0,
    totalsByCounty: store.totalsByCounty || {},
    days
  };
}

function start() {
  load();
  const t = setInterval(flush, FLUSH_MS);
  if (t.unref) t.unref(); // never hold the process open just to flush
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => { flush(); process.exit(0); });
  }
  process.on('exit', flush);
}

module.exports = { start, note, flush, summary };
