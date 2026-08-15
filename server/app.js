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

function gatePage(msg, next) {
  const dest = (next && next.startsWith('/') && !next.startsWith('//')) ? next : '/';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clark Commons — early access</title>
<link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.svg">
<meta name="robots" content="noindex"></head><body><div class="wrap">
<header class="page" style="max-width:480px;margin:10vh auto 0">
  <div class="eyebrow">Clark Commons · Clark County, Arkansas</div>
  <h1>Early access</h1>
  <p class="src">This site is in a quiet launch. If someone gave you the password, enter it once and you're in.</p>
  <p class="src">Clark Commons is an independent community project — <b>not a government website</b>. The official Clark County site is <a href="https://www.clarkcountyar.gov" rel="noopener">clarkcountyar.gov</a>.</p>
  ${msg ? `<p class="src" style="color:var(--dead)">${esc(msg)}</p>` : ''}
  <form method="POST" action="/gate" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
    <input type="password" name="password" autofocus required aria-label="Site password"
      style="font-family:var(--mono);font-size:15px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);flex:1;min-width:160px">
    <input type="hidden" name="next" value="${esc(dest)}">
    <button type="submit" style="font-family:var(--mono);font-size:13px;padding:8px 14px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer">Enter</button>
  </form>
</header></div></body></html>`;
}

app.get('/gate', (req, res) => res.send(gatePage(null, req.query.next || '/')));
app.post('/gate', express.urlencoded({ extended: false }), (req, res) => {
  const pw = sitePassword();
  const given = (req.body && req.body.password) || '';
  const next = (req.body && req.body.next) || '/';
  const dest = (next.startsWith('/') && !next.startsWith('//')) ? next : '/';
  if (pw && given === pw) {
    res.setHeader('Set-Cookie',
      `cc_gate=${gateToken(pw)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Lax`);
    return res.redirect(dest);
  }
  res.status(401).send(gatePage('That password did not match.', dest));
});

app.use((req, res, next) => {
  const pw = sitePassword();
  if (!pw) return next();
  if (cookies(req).cc_gate === gateToken(pw)) return next();
  // A shared link lands here first: remember where they were headed, so the
  // door opens onto the page they were sent — not the lobby.
  res.status(401).send(gatePage(null, req.originalUrl));
});

// Downgrade any pre-existing persistent participant cookie to session scope:
// re-issuing it without Max-Age makes the browser forget it when the window
// closes — the nothing-follows-you-home rule, applied retroactively.
app.use((req, res, next) => {
  const p = participantOf(req);
  if (p) res.setHeader('Set-Cookie', `cc_participant=${p}; Path=/; HttpOnly; SameSite=Lax`);
  next();
});

// ---- the document archive (behind the gate) ----
// Every stored source document, served from our hashed archive.
app.use('/files', express.static(path.join(__dirname, '..', 'inbox'), { maxAge: '1d', index: false }));

// ---- pages ----
const { homePage } = require('./views/home');
app.get('/', (req, res) => {
  const participant = participantOf(req);
  res.send(homePage(load(), {
    registeredFields: participant ? require('./identity').fieldsOf(participant) : [],
    justRegistered: req.query.registered === '1'
  }));
});
app.get('/budget', (req, res) => res.send(treePage(load())));

app.get('/line/:id', (req, res) => {
  const data = load();
  const node = data.byId.get(req.params.id);
  if (!node) return res.status(404).send(notFound(data, 'No line with that id exists in the corpus.'));
  res.send(nodePage(data, node));
});

// /story renders THE-STORY.md — canonical front-door copy per the handoff —
// followed by the claims ledger: every promise in the story is either live
// or tracked to the milestone that makes it true. The plain-words guide
// lives at /guide.
app.get('/story', (req, res) => {
  const data = load();
  const { layout } = require('./views/layout');
  const { mdToHtml } = require('./lib/md');
  const md = fs.readFileSync(path.join(__dirname, '..', 'THE-STORY.md'), 'utf8')
    .split('\n').slice(4).join('\n'); // drop the internal header block above the first ---
  const ledger = `
<section style="margin-top:26px">
<h2>The claims ledger <span class="sub">— every promise above, tracked honestly</span></h2>
<table class="plain"><thead><tr><th>Promise</th><th>Status</th></tr></thead><tbody>
<tr><td>A budget you can walk, cited to source pages, arithmetic checked</td><td><span class="chip c-ok">✓ live</span> — <a href="/budget">the money trail</a>, <a href="/verify">the receipt</a></td></tr>
<tr><td>Open questions with plain yes/no answers</td><td><span class="chip c-ok">✓ live</span> — <a href="/issues">question № 1 is open</a> (anonymous tier)</td></tr>
<tr><td>Verify residency, or put your name on the record</td><td><span class="chip c-part">◐ coming</span> — ships with the verification tiers (M2/M5)</td></tr>
<tr><td>Works by text on any phone</td><td><span class="chip c-part">◐ coming</span> — the text channel is milestone M3</td></tr>
<tr><td>Help finding help</td><td><span class="chip c-part">◐ coming</span> — ships with the AI layer (M1)</td></tr>
<tr><td>AI that answers budget questions, costs posted nightly</td><td><span class="chip c-part">◐ coming</span> — same milestone; the cost log starts with the first AI call</td></tr>
<tr><td>Ozark's own books posted monthly</td><td><span class="chip c-part">◐ coming</span> — Open Books v1 is in build at the shop</td></tr>
<tr><td>The full list of nevers, published</td><td><span class="chip c-ok">✓ live</span> — <a href="/never">read it</a>, and <a href="/security">how this is secured</a></td></tr>
<tr><td>Corrections published, not buried</td><td><span class="chip c-ok">✓ live</span> — the <a href="/docket">docket</a> and activity log are the running record; a dedicated corrections page lands before the gate comes down</td></tr>
</tbody></table>
</section>`;
  res.send(layout({
    title: `Our story — ${data.county.platform_name}`, current: '/story', county: data.county,
    description: 'Where your money goes, who built this, and why — the front door, written for neighbors.',
    body: `<div style="max-width:72ch">${mdToHtml(md)}</div>${ledger}`
  }));
});

app.get('/guide', (req, res) => res.send(storyPage(load())));

const { stancePage } = require('./views/stance');
const { participatePage } = require('./views/participate');
app.get('/stance', (req, res) => res.send(stancePage(load())));

const { casesPage, casePage } = require('./views/cases');
const { researchPage } = require('./views/research');
app.get('/research', (req, res) => res.send(researchPage(load())));
app.get('/cases', (req, res) => res.send(casesPage(load())));
app.get('/cases/:id', (req, res) => {
  const data = load();
  const c = data.cases.cases.find(x => x.id === req.params.id);
  if (!c) return res.status(404).send(notFound(data, 'No case study with that id.'));
  res.send(casePage(data, c));
});
app.get('/participate', (req, res) => res.send(participatePage(load())));

const { helpPage } = require('./views/help');
app.get('/help', (req, res) => res.send(helpPage(load())));

const { calendarPage } = require('./views/calendar');
app.get('/calendar', (req, res) => res.send(calendarPage(load())));
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
app.get('/documents', (req, res) => res.send(documentsPage(load(), req.query.q)));
app.get('/verify', (req, res) => res.send(verifyPage(load())));
app.get('/methodology', (req, res) => res.send(methodologyPage(load())));

// Charter documents rendered as public pages (SECURITY.md §14; NEVER.md).
const { mdToHtml } = require('./lib/md');
function charterPage(file, current, description) {
  return (req, res) => {
    const data = load();
    const { layout } = require('./views/layout');
    const md = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    res.send(layout({
      title: `${file.replace('.md', '')} — ${data.county.platform_name}`,
      current, county: data.county, description,
      body: `<div style="max-width:72ch">${mdToHtml(md)}</div>`
    }));
  };
}
app.get('/security', charterPage('SECURITY.md', null, 'The platform\'s public threat model and integrity protocols, including the hash-chained activity log anyone can verify.'));
app.get('/never', charterPage('NEVER.md', null, 'What this project will never do — written down before anyone was watching, on purpose.'));

// ---- issues: Tier 0 sentiment polling (the M2 seed) ----
function participantOf(req) { return cookies(req).cc_participant || null; }

app.get('/issues', (req, res) => res.send(issuesPage(load(), req.query.submitted === '1')));

app.post('/issues/submit', express.urlencoded({ extended: false }), (req, res) => {
  const q = (req.body && req.body.question || '').trim();
  if (!q) return res.redirect('/issues#ask');
  const { submit } = require('./submissions');
  submit({ question: q, name: (req.body.name || '').trim() || null, contact: (req.body.contact || '').trim() || null });
  res.redirect('/issues?submitted=1#ask');
});

app.get('/issues/:id/qr.svg', (req, res) => {
  const data = load();
  const draft = data.issueDrafts.drafts.find(d => d.id === req.params.id && d.status === 'open-tier0');
  if (!draft) return res.status(404).type('text').send('not found');
  const url = `${req.protocol}://${req.headers.host}/issues/${draft.id}`;
  require('qrcode').toString(url, { type: 'svg', margin: 1, width: 280 }, (err, svg) => {
    if (err) return res.status(500).type('text').send('qr error');
    res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(svg);
  });
});

// One participant token per SITTING, created on first participation of any
// kind (vote or registration) — the same token keys both stores, which is
// what lets tally-time verification join them in memory later (M5).
// Deliberately a session cookie (no Max-Age): the moment the browser window
// closes, this device forgets who was here — nothing personal persists on a
// shared computer. The trade, stated in the public rules: one voice per
// sitting, and cross-session dedup waits for the verification tiers, where
// it belongs.
function ensureParticipant(req, res) {
  let participant = participantOf(req);
  if (!participant) {
    participant = crypto.randomBytes(12).toString('hex');
    res.setHeader('Set-Cookie',
      `cc_participant=${participant}; Path=/; HttpOnly; SameSite=Lax`);
  }
  return participant;
}

const identity = require('./identity');

app.get('/issues/:id', (req, res) => {
  const data = load();
  const draft = data.issueDrafts.drafts.find(d => d.id === req.params.id && d.status === 'open-tier0');
  if (!draft) return res.status(404).send(notFound(data, 'No open question with that id.'));
  const voted = req.query.voted && ['yes', 'no', 'skip'].includes(req.query.voted) ? req.query.voted : null;
  const participant = participantOf(req);
  res.send(issuePage(data, draft, participant, voted,
    participant ? identity.fieldsOf(participant) : [], req.query.registered === '1'));
});

app.post('/issues/:id/vote', express.urlencoded({ extended: false }), (req, res) => {
  const data = load();
  const draft = data.issueDrafts.drafts.find(d => d.id === req.params.id && d.status === 'open-tier0');
  if (!draft) return res.status(404).send(notFound(data, 'No open question with that id.'));
  const value = (req.body && req.body.value) || '';
  if (!['yes', 'no', 'skip'].includes(value)) return res.redirect(`/issues/${draft.id}`);
  const participant = ensureParticipant(req, res);
  castVote(participant, draft.id, value, 'web', (req.body && req.body.connection) || '');
  res.redirect(`/issues/${draft.id}?voted=${value}#register`);
});

app.post('/issues/:id/register', express.urlencoded({ extended: false }), (req, res) => {
  const data = load();
  const draft = data.issueDrafts.drafts.find(d => d.id === req.params.id && d.status === 'open-tier0');
  if (!draft) return res.status(404).send(notFound(data, 'No open question with that id.'));
  const participant = ensureParticipant(req, res);
  const saved = identity.register(participant, req.body || {});
  res.redirect(`/issues/${draft.id}${saved ? '?registered=1' : ''}#register`);
});

app.post('/register', express.urlencoded({ extended: false }), (req, res) => {
  const participant = ensureParticipant(req, res);
  const saved = identity.register(participant, req.body || {});
  res.redirect(`/${saved ? '?registered=1' : ''}#register`);
});

// ---- support drop-box ----
// Notes and screenshots land as private files in data/feedback/ (gitignored,
// never served, never published). Read on the box: node pipeline/feedback.js
const multer = require('multer');
const { feedbackPage } = require('./views/feedback');
const FEEDBACK_DIR = path.join(__dirname, '..', 'data', 'feedback');
fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
const FB_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
const fbId = (req) => {
  if (!req.fbId) req.fbId = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
  return req.fbId;
};
const fbUpload = multer({
  storage: multer.diskStorage({
    destination: FEEDBACK_DIR,
    filename: (req, file, cb) => cb(null, fbId(req) + FB_TYPES[file.mimetype])
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 6 },
  fileFilter: (req, file, cb) => cb(null, Boolean(FB_TYPES[file.mimetype]))
});
const safePath = p => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//')) ? p : '';

app.get('/feedback', (req, res) => {
  let from = safePath(req.query.from || '');
  if (!from) { try { from = safePath(new URL(req.headers.referer).pathname); } catch (e) { /* no referer */ } }
  res.send(feedbackPage(load().county, { from }));
});

app.post('/feedback', (req, res) => {
  fbUpload.single('screenshot')(req, res, (err) => {
    const county = load().county;
    const b = req.body || {};
    if (err) {
      return res.status(400).send(feedbackPage(county, {
        error: 'That image did not go through (8 MB max; PNG, JPG, WebP, or GIF). Your note was not saved — please try again.',
        from: safePath(b.page)
      }));
    }
    if ((b.website || '').trim()) return res.send(feedbackPage(county, { sent: '/' }));
    const message = (b.message || '').trim().slice(0, 5000);
    if (!message) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) { /* already gone */ } }
      return res.status(400).send(feedbackPage(county, { error: 'The message was empty — tell us what happened.', from: safePath(b.page) }));
    }
    const id = fbId(req);
    const rec = {
      id, ts: new Date().toISOString(),
      page: (b.page || '').trim().slice(0, 300),
      message,
      contact: (b.contact || '').trim().slice(0, 200),
      ua: (req.headers['user-agent'] || '').slice(0, 300),
      screenshot: req.file ? req.file.filename : null
    };
    fs.writeFileSync(path.join(FEEDBACK_DIR, id + '.json'), JSON.stringify(rec, null, 2));
    res.send(feedbackPage(county, { sent: safePath(rec.page) || '/' }));
  });
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
<div class="src">The error is logged and nothing you did caused it. <a href="/feedback">Tell us what you were doing</a> and we'll fix it faster. <a href="/">Back home</a>.</div>
</header></div></body></html>`);
});

function notFound(data, msg) {
  const { layout } = require('./views/layout');
  return layout({
    title: `Not here — ${data.county.platform_name}`, current: null, county: data.county,
    body: `<header class="page"><h1>Not here</h1><div class="src">${msg} <a href="/">Back home</a>.</div></header>`
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Clark Commons listening on http://localhost:${PORT}${sitePassword() ? ' (gated)' : ' (open)'}`));
