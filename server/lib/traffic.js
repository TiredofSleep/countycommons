// Privacy-preserving traffic counter (CLAUDE.md: aggregate-only, no surveillance).
//
// The ONLY thing recorded is a count: how many page views each county got, per
// day, plus one-word buckets for where a view came from and what kind of
// software asked (a label from a fixed list, like "Safari · phone" or
// "Googlebot" — never the user-agent string). No IP addresses. No cookies.
// No per-person anything —
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
// A shared link can say where it was posted with ?via=<word> (e.g. a Facebook
// post as ?via=fb). Only these words count; anything else is ignored. It names
// the place a link was posted, never the person who clicked it.
const VIA = { fb: 'Facebook post', facebook: 'Facebook post', text: 'Text message', sms: 'Text message', email: 'Email', flyer: 'Flyer or poster', qr: 'QR code', nextdoor: 'Nextdoor post', x: 'X/Twitter post', reddit: 'Reddit post', news: 'News story' };
function viaSource(url) {
  const m = String(url || '').match(/[?&]via=([a-z]+)/i);
  return m ? VIA[m[1].toLowerCase()] || null : null;
}

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
  return /bot\b|crawl|spider|slurp|facebookexternalhit|facebot|bingpreview|headless|python-requests|curl|wget|httpx|go-http|Googlebot|APIs-Google|AhrefsBot|SemrushBot|DotBot|PetalBot|YandexBot|Applebot|Bytespider|GPTBot|ClaudeBot|CCBot|meta-externalagent|Discordbot|Slackbot|WhatsApp|TelegramBot|Twitterbot|LinkedInBot|Pinterest|Yeti|Seznam|Baiduspider|Sogou|MJ12|Qwant|Mojeek|Exabot|ia_archiver|archive.org|Scrapy|node-fetch|axios|okhttp|Java\/|libwww|PhantomJS|Lighthouse|GoogleOther|Google-InspectionTool|Feedfetcher|Google-Read-Aloud|Amazonbot|ImagesiftBot|Barkrowler|BLEXBot|DataForSeo|serpstat|SEOkicks|Neevabot|YisouSpider|360Spider|coccoc|Daum|Yahoo! Slurp|^$/i.test(ua || '');
}

// What kind of software asked for the page, as one label from a fixed list —
// the user-agent string itself is never kept, nor any version beyond "old".
// AI assistants that fetch a page because a person asked them something come
// first, since they don't call themselves bots; an in-app browser (Facebook,
// Instagram) usually sends no referrer, so it explains some "Direct" visits.
function agentFamily(ua) {
  const u = String(ua || '');
  if (!u) return 'No browser named';
  const ai = [[/ChatGPT-User|OAI-SearchBot/i, 'ChatGPT (fetching for a user)'], [/Perplexity/i, 'Perplexity'], [/Claude-User|Claude-SearchBot|Claude-Web/i, 'Claude (fetching for a user)'],
    [/MistralAI-User/i, 'Mistral (fetching for a user)'], [/DuckAssistBot/i, 'DuckDuckGo assistant'], [/Meta-ExternalFetcher/i, 'Meta AI (fetching for a user)'], [/cohere-ai|YouBot|Copilot/i, 'Other AI assistant']];
  for (const [re, l] of ai) if (re.test(u)) return l;
  const crawl = [[/Googlebot|Google-InspectionTool|GoogleOther|APIs-Google|Feedfetcher/i, 'Googlebot'], [/bingbot|BingPreview|msnbot/i, 'Bingbot'], [/YandexBot/i, 'Yandex'],
    [/GPTBot/i, 'GPTBot (OpenAI training)'], [/ClaudeBot/i, 'ClaudeBot (Anthropic training)'], [/Applebot/i, 'Applebot'], [/Bytespider/i, 'Bytespider (ByteDance)'], [/meta-externalagent/i, 'Meta crawler'],
    [/AhrefsBot|SemrushBot|DotBot|MJ12|DataForSeo|serpstat|Barkrowler|BLEXBot/i, 'SEO crawler'], [/facebookexternalhit|facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Pinterest/i, 'Link preview'],
    [/python|curl|wget|httpx|go-http|node-fetch|axios|okhttp|Java\/|libwww|Scrapy|headless|PhantomJS/i, 'Script or tool']];
  for (const [re, l] of crawl) if (re.test(u)) return l;
  if (isBot(u)) return 'Other crawler';
  const phone = /Mobile|Android|iPhone|iPod/i.test(u), tablet = /iPad|Tablet/i.test(u);
  const dev = phone ? 'phone' : tablet ? 'tablet' : 'computer';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(u)) return 'Facebook app · ' + dev;
  if (/Instagram/i.test(u)) return 'Instagram app · ' + dev;
  if (/; wv\)|GSA\//i.test(u)) return 'Other in-app browser · ' + dev;
  const ch = u.match(/(?:Chrome|CriOS)\/(\d+)/);
  if (/Edg\//.test(u)) return 'Edge · ' + dev;
  if (/SamsungBrowser/.test(u)) return 'Samsung Internet · ' + dev;
  if (/OPR\/|Opera/.test(u)) return 'Opera · ' + dev;
  if (/Firefox\/|FxiOS/.test(u)) return 'Firefox · ' + dev;
  if (ch) return +ch[1] < 120 ? 'Chrome, 2023 or older · ' + dev : 'Chrome · ' + dev;
  if (/Safari\//.test(u) && /Version\//.test(u)) return 'Safari · ' + dev;
  return 'Other browser · ' + dev;
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
  const fam = agentFamily(ua);
  day.byAgent = day.byAgent || {};
  day.byAgent[fam] = (day.byAgent[fam] || 0) + 1;
  if (isBot(ua)) {
    day.bots++;
    store.botTotal = (store.botTotal || 0) + 1;
  } else {
    const s = viaSource(req.originalUrl || req.url) || classifySource(ref, host);
    day.bySource[s] = (day.bySource[s] || 0) + 1;
    store.totalsBySource = store.totalsBySource || {};
    store.totalsBySource[s] = (store.totalsBySource[s] || 0) + 1;
    if (s === 'Direct') { day.directByAgent = day.directByAgent || {}; day.directByAgent[fam] = (day.directByAgent[fam] || 0) + 1; }
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
    .map(d => ({ date: d, total: store.days[d].total, byCounty: store.days[d].byCounty, bySource: store.days[d].bySource || {}, bots: store.days[d].bots || 0, byAgent: store.days[d].byAgent || null, directByAgent: store.days[d].directByAgent || null }));
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

module.exports = { start, note, flush, summary, agentFamily };
