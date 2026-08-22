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

// Where a view came from — derived from the Referer header ONLY. We keep the
// source bucket (a word like "Facebook"), never the full URL, never an IP.
function classifySource(referer, host) {
  if (!referer) return 'Direct';
  let h = '';
  try { h = new URL(referer).hostname.toLowerCase(); } catch (e) { return 'Other'; }
  const bare = String(host || '').replace(/^www\./, '');
  if (bare && (h === bare || h.endsWith('.' + bare))) return 'Internal';
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me|facebook\.net)$/.test(h)) return 'Facebook';
  if (/(^|\.)google\./.test(h)) return 'Google';
  if (/(^|\.)(twitter\.com|x\.com|t\.co)$/.test(h)) return 'X/Twitter';
  if (/(^|\.)instagram\.com$/.test(h)) return 'Instagram';
  if (/(^|\.)reddit\.com$/.test(h)) return 'Reddit';
  if (/(^|\.)nextdoor\.com$/.test(h)) return 'Nextdoor';
  if (/(^|\.)(bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(h)) return 'Search (other)';
  if (/(^|\.)(youtube\.com|linkedin\.com|lnkd\.in)$/.test(h)) return 'Social (other)';
  return 'Other';
}
// Known crawlers/scrapers/tools — counted separately so human numbers stay clean.
function isBot(ua) {
  return /bot\b|crawl|spider|slurp|facebookexternalhit|facebot|bingpreview|headless|python-requests|curl|wget|httpx|go-http|Googlebot|APIs-Google|AhrefsBot|SemrushBot|DotBot|PetalBot|YandexBot|Applebot|Bytespider|GPTBot|ClaudeBot|CCBot|meta-externalagent|Discordbot|Slackbot|WhatsApp|TelegramBot|Twitterbot|LinkedInBot|Pinterest/i.test(ua || '');
}

// Record one page view for a county. `req` supplies ONLY the Referer and
// User-Agent headers (for source + bot bucketing) — never an IP, never a cookie,
// never a per-person identifier. tenantKey === '__network__' for the apex landing.
function note(tenantKey, req) {
  if (!store) load();
  if (!tenantKey) return;
  const d = today();
  if (!store.since) store.since = d;
  store.updated = new Date().toISOString();
  const day = store.days[d] || (store.days[d] = { total: 0, byCounty: {}, bySource: {}, bots: 0 });
  if (!day.bySource) day.bySource = {};
  if (day.bots == null) day.bots = 0;
  day.total++;
  day.byCounty[tenantKey] = (day.byCounty[tenantKey] || 0) + 1;
  store.totalsByCounty[tenantKey] = (store.totalsByCounty[tenantKey] || 0) + 1;
  store.lifetimeTotal = (store.lifetimeTotal || 0) + 1;
  const ua = req && req.headers && req.headers['user-agent'];
  const ref = req && req.headers && req.headers.referer;
  const host = req && req.headers && String(req.headers.host || '').split(':')[0];
  if (isBot(ua)) {
    day.bots++;
    store.botTotal = (store.botTotal || 0) + 1;
  } else {
    const s = classifySource(ref, host);
    day.bySource[s] = (day.bySource[s] || 0) + 1;
    store.totalsBySource = store.totalsBySource || {};
    store.totalsBySource[s] = (store.totalsBySource[s] || 0) + 1;
  }
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
    .map(d => ({ date: d, total: store.days[d].total, byCounty: store.days[d].byCounty, bySource: store.days[d].bySource || {}, bots: store.days[d].bots || 0 }));
  return {
    since: store.since, updated: store.updated,
    lifetimeTotal: store.lifetimeTotal || 0,
    totalsByCounty: store.totalsByCounty || {},
    totalsBySource: store.totalsBySource || {},
    botTotal: store.botTotal || 0,
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
