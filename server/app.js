// Clark Commons — server. One process, server-rendered pages, no external
// requests, no user data collected. Routes /issues, /results, /ask are
// reserved for later milestones.
//
// Soft-launch gate: if a site password is configured (SITE_PASSWORD env var,
// or config/site-password file — gitignored), every page requires it once per
// browser. No password configured = site is open. The gate is a doorman for a
// quiet launch, not a vault; the site holds only public records.

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { load, esc } = require('./lib/corpus');
const { treePage } = require('./views/tree');
const { nodePage } = require('./views/node');
const { docketPage, documentsPage, verifyPage, methodologyPage } = require('./views/pages');
const { comparePage } = require('./views/compare');
const { storyPage } = require('./views/story');
const { vendorsPage } = require('./views/vendors');
const { auditsPage } = require('./views/audits');
const { spendingPage } = require('./views/spending');
const { issuesPage, issuePage } = require('./views/issues');
const { castVote } = require('./vote');

const app = express();
app.disable('x-powered-by');

// ---- site password (soft launch) ----
function sitePassword() {
  if (process.env.SITE_PASSWORD) return process.env.SITE_PASSWORD;
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'config', 'site-password'), 'utf8').trim() || null;
  } catch (e) { return null; }
}
const gateToken = pw => crypto.createHash('sha256').update('clark-commons-gate:' + pw).digest('hex').slice(0, 32);

// ---- headers ----
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin'
  });
  next();
});

// ---- always-open utility routes ----
app.get('/health', (req, res) => res.type('text').send('ok'));
app.get('/robots.txt', (req, res) => {
  // While the gate is up, ask crawlers to stay out. Open site = crawl away.
  res.type('text').send(sitePassword() ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n');
});

// Static assets are public (styles for the gate page; no data in them).
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

// ---- the gate ----
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

function gatePage(msg) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clark Commons — early access</title>
<link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.svg">
<meta name="robots" content="noindex"></head><body><div class="wrap">
<header class="page" style="max-width:480px;margin:10vh auto 0">
  <div class="eyebrow">Clark Commons · Clark County, Arkansas</div>
  <h1>Early access</h1>
  <p class="src">This site is in a quiet launch. If someone gave you the password, enter it once and you're in.</p>
  ${msg ? `<p class="src" style="color:var(--dead)">${esc(msg)}</p>` : ''}
  <form method="POST" action="/gate" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
    <input type="password" name="password" autofocus required aria-label="Site password"
      style="font-family:var(--mono);font-size:15px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);flex:1;min-width:160px">
    <input type="hidden" name="next" value="/">
    <button type="submit" style="font-family:var(--mono);font-size:13px;padding:8px 14px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer">Enter</button>
  </form>
</header></div></body></html>`;
}

app.get('/gate', (req, res) => res.send(gatePage(null)));
app.post('/gate', express.urlencoded({ extended: false }), (req, res) => {
  const pw = sitePassword();
  const given = (req.body && req.body.password) || '';
  if (pw && given === pw) {
    res.setHeader('Set-Cookie',
      `cc_gate=${gateToken(pw)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Lax`);
    return res.redirect('/');
  }
  res.status(401).send(gatePage('That password did not match.'));
});

app.use((req, res, next) => {
  const pw = sitePassword();
  if (!pw) return next();
  if (cookies(req).cc_gate === gateToken(pw)) return next();
  res.status(401).send(gatePage(null));
});

// ---- the document archive (behind the gate) ----
// Every stored source document, served from our hashed archive.
app.use('/files', express.static(path.join(__dirname, '..', 'inbox'), { maxAge: '1d', index: false }));

// ---- pages ----
app.get('/', (req, res) => res.send(treePage(load())));

app.get('/line/:id', (req, res) => {
  const data = load();
  const node = data.byId.get(req.params.id);
  if (!node) return res.status(404).send(notFound(data, 'No line with that id exists in the corpus.'));
  res.send(nodePage(data, node));
});

app.get('/story', (req, res) => res.send(storyPage(load())));
app.get('/vendors', (req, res) => res.send(vendorsPage(load())));
app.get('/audits', (req, res) => res.send(auditsPage(load())));

app.get('/compare/spending', (req, res) => res.send(spendingPage(load())));

app.get('/compare/:id', (req, res) => {
  const data = load();
  const cmp = data.comparisons.comparisons.find(c => c.id === req.params.id);
  if (!cmp) return res.status(404).send(notFound(data, 'No comparison with that id exists.'));
  res.send(comparePage(data, cmp));
});

app.get('/docket', (req, res) => res.send(docketPage(load())));
app.get('/documents', (req, res) => res.send(documentsPage(load())));
app.get('/verify', (req, res) => res.send(verifyPage(load())));
app.get('/methodology', (req, res) => res.send(methodologyPage(load())));

// ---- issues: Tier 0 sentiment polling (the M2 seed) ----
function participantOf(req) { return cookies(req).cc_participant || null; }

app.get('/issues', (req, res) => res.send(issuesPage(load())));

app.get('/issues/:id', (req, res) => {
  const data = load();
  const draft = data.issueDrafts.drafts.find(d => d.id === req.params.id && d.status === 'open-tier0');
  if (!draft) return res.status(404).send(notFound(data, 'No open question with that id.'));
  const voted = req.query.voted && ['yes', 'no', 'skip'].includes(req.query.voted) ? req.query.voted : null;
  res.send(issuePage(data, draft, participantOf(req), voted));
});

app.post('/issues/:id/vote', express.urlencoded({ extended: false }), (req, res) => {
  const data = load();
  const draft = data.issueDrafts.drafts.find(d => d.id === req.params.id && d.status === 'open-tier0');
  if (!draft) return res.status(404).send(notFound(data, 'No open question with that id.'));
  const value = (req.body && req.body.value) || '';
  if (!['yes', 'no', 'skip'].includes(value)) return res.redirect(`/issues/${draft.id}`);
  let participant = participantOf(req);
  if (!participant) {
    participant = crypto.randomBytes(12).toString('hex');
    res.setHeader('Set-Cookie',
      `cc_participant=${participant}; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; SameSite=Lax`);
  }
  castVote(participant, draft.id, value, 'web');
  res.redirect(`/issues/${draft.id}?voted=${value}`);
});

// Reserved for later milestones — honest about it rather than 404.
for (const route of ['/results', '/ask']) {
  app.get(route, (req, res) => {
    const data = load();
    res.status(404).send(notFound(data,
      'This part of the platform is not built yet. The budget engine comes first; issues, results, and Q&A follow.'));
  });
}

app.use((req, res) => res.status(404).send(notFound(load(), 'That page does not exist.')));

// Errors never leak internals; the corpus is checked by the verifier, so a
// failure here is an operations problem, not a reader problem.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('html').send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Something broke</title><link rel="stylesheet" href="/style.css"></head><body><div class="wrap">
<header class="page"><h1>Something broke on our end</h1>
<div class="src">The error is logged and nothing you did caused it. <a href="/">Back to the money trail</a>.</div>
</header></div></body></html>`);
});

function notFound(data, msg) {
  const { layout } = require('./views/layout');
  return layout({
    title: `Not here — ${data.county.platform_name}`, current: null, county: data.county,
    body: `<header class="page"><h1>Not here</h1><div class="src">${msg} <a href="/">Back to the money trail</a>.</div></header>`
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Clark Commons listening on http://localhost:${PORT}${sitePassword() ? ' (gated)' : ' (open)'}`));
