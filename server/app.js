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
// Caddy is the single reverse proxy in front of us; trust exactly one hop so
// req.ip reflects the real client for the per-IP write throttle.
app.set('trust proxy', 1);
const { throttle } = require('./lib/throttle');
const writeLimit = throttle({ windowMs: 60000, max: 30 }); // votes/registrations
const heavyLimit = throttle({ windowMs: 60000, max: 8 });  // submissions/feedback

// ---- multi-county host routing (CLAUDE.md rule 7, made physical) ----
const tenant = require('./lib/tenant');

// Privacy-preserving traffic counter: page views per county per day, no IPs,
// no cookies, no per-person data. Aggregate-only, publishable (see /traffic).
const traffic = require('./lib/traffic');
traffic.start();

// Caddy queries this before it mints an on-demand TLS certificate for a host,
// so the box only gets certs for counties we actually serve. Ungated on
// purpose (registered before the site-password gate): it must answer Caddy.
app.get('/tls-check', (req, res) =>
  tenant.isKnownHost(req.query.domain || '') ? res.status(200).send('ok') : res.status(404).send('no'));

function comingSoonPage(sub) {
  const s = esc(String(sub || '').slice(0, 40));
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>County Commons — not live yet</title><link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.svg">
<meta name="robots" content="noindex"></head><body><div class="wrap">
<header class="page" style="max-width:560px;margin:10vh auto 0">
  <div class="eyebrow">County Commons</div>
  <h1>“${s}” isn't live yet</h1>
  <p class="src">County Commons is a free civic-transparency platform, county by county. This one hasn't been set up yet — no budget has been ingested and no questions are open here.</p>
  <p class="src">The first county is live now: <a href="https://clarkar.countycommons.us">Clark County, Arkansas</a>. If you'd like to bring your county on, that's exactly what this project is for.</p>
</header></div></body></html>`;
}

// Route every request to its county by the Host header. Bare apex and www go
// to the flagship; an unknown subdomain gets the honest "not live yet" page.
app.use((req, res, next) => {
  const r = tenant.resolveHost(req.headers.host);
  if (r.action === 'redirect') return res.redirect(301, `https://${r.to}${req.originalUrl}`);
  if (r.action === 'unknown') return res.status(404).send(comingSoonPage(r.sub));
  req.tenantKey = r.key;
  next();
});

// ---- access: PIN router (view + admin), per county ----
const access = require('./lib/access');
const { registry: tenantRegistry } = tenant;
function hostFor(tenantKey) {
  try { return tenantRegistry().tenants[tenantKey].host; } catch (e) { return null; }
}

// The access cookie is scoped to the PARENT domain, so one PIN opens the whole
// network: a resident who's been let in anywhere can walk every county's public
// pages (the "navigate other counties and the whole site" rule). Omit Domain in
// local dev, where there's no dotted base to share across. The per-sitting
// participant/vote cookie stays host-only on purpose — nothing follows you home.
function accessCookieDomain(req) {
  let base = null;
  try { base = tenantRegistry().baseDomain; } catch (e) { /* dev */ }
  const host = String(req.headers.host || '').toLowerCase().split(':')[0];
  return (base && (host === base || host.endsWith('.' + base))) ? `; Domain=.${base}` : '';
}

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
  res.type('text').send(access.gateConfigured() ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n');
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

function safeDest(next) {
  return (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) ? next : '/';
}

// The front door: type a PIN, it takes you to your county. A 4-digit view PIN
// opens the public site; an 8-char admin code opens the admin for that county.
function gatePage(msg, next) {
  const dest = safeDest(next);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>County Commons — enter your PIN</title>
<link rel="stylesheet" href="/style.css?v=5"><link rel="icon" href="/favicon.svg">
<meta name="robots" content="noindex"></head><body><div class="wrap">
<header class="page" style="max-width:480px;margin:10vh auto 0">
  <div class="eyebrow">County Commons</div>
  <h1>Enter your PIN</h1>
  <p class="src">Type the PIN for your county and you're in. A resident PIN opens your county's site; a host code opens its admin.</p>
  <p class="src">County Commons is an independent community project — <b>not a government website</b>.</p>
  ${msg ? `<p class="src" style="color:var(--dead)">${esc(msg)}</p>` : ''}
  <form method="POST" action="/gate" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
    <input type="password" name="pin" autofocus required aria-label="County PIN" autocomplete="off"
      style="font-family:var(--mono);font-size:15px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);flex:1;min-width:160px">
    <input type="hidden" name="next" value="${esc(dest)}">
    <button type="submit" style="font-family:var(--mono);font-size:13px;padding:8px 14px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer">Enter</button>
  </form>
</header></div></body></html>`;
}

app.get('/gate', (req, res) => res.send(gatePage(null, req.query.next || '/')));
app.post('/gate', writeLimit, express.urlencoded({ extended: false }), (req, res) => {
  const ip = req.ip || 'unknown';
  const lock = access.lockState(ip);
  if (lock.locked) {
    const mins = Math.ceil((lock.until - Date.now()) / 60000);
    return res.status(429).send(gatePage(`Too many attempts. Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`, safeDest(req.body && req.body.next)));
  }
  const given = (req.body && req.body.pin) || '';
  const dest = safeDest(req.body && req.body.next);
  const hit = access.lookupPin(given);
  if (!hit) {
    access.noteFailure(ip);
    return res.status(401).send(gatePage('That PIN did not match.', dest));
  }
  access.noteSuccess(ip);
  res.setHeader('Set-Cookie',
    `cc_access=${access.cookieValue(hit.tenant, hit.role, hit.name || '')}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Lax${accessCookieDomain(req)}`);
  // The PIN decides the county. If we're not on that county's host, send them
  // there; otherwise open the site (admins land on the admin dashboard).
  const landing = hit.role === 'owner' ? '/owner' : (hit.role === 'admin' ? '/admin' : dest);
  // The owner is county-agnostic; view/admin get taken to their county's host.
  if (hit.role !== 'owner') {
    const wantHost = hostFor(hit.tenant);
    const hereHost = tenant.resolveHost(req.headers.host);
    if (wantHost && hereHost.action === 'serve' && hereHost.key !== hit.tenant) {
      return res.redirect(`https://${wantHost}${landing}`);
    }
  }
  res.redirect(landing);
});

// The gate. Open when no PINs are configured. Otherwise ANY valid access cookie
// lets you through, on ANY county — one PIN is a key to the whole network, so a
// resident let in anywhere can navigate every county and the whole site. The
// cookie still records which county+role you entered as; that scoping is
// enforced where it matters (editing), not at the view gate.
app.use((req, res, next) => {
  if (!access.gateConfigured()) return next();
  const acc = access.verifyCookie(cookies(req).cc_access);
  if (acc) { req.access = acc; return next(); }
  res.status(401).send(gatePage(null, req.originalUrl));
});

// Admin guard: for /admin routes, require an admin cookie for THIS county.
// Now that the view gate admits any resident to any county, the county scope of
// a host's edit rights is enforced HERE — an admin code edits only its own
// county. The owner may act as admin anywhere.
function requireAdmin(req, res, next) {
  if (req.access && (req.access.role === 'owner' ||
      (req.access.role === 'admin' && req.access.tenant === req.tenantKey))) return next();
  res.status(403).send(gatePage('That area needs a host code for this county.', '/admin'));
}

// Owner guard: for /owner routes, require the owner credential.
function requireOwner(req, res, next) {
  if (req.access && req.access.role === 'owner') return next();
  res.status(403).send(gatePage('That area needs the owner code.', '/owner'));
}

// Downgrade any pre-existing persistent participant cookie to session scope:
// re-issuing it without Max-Age makes the browser forget it when the window
// closes — the nothing-follows-you-home rule, applied retroactively.
app.use((req, res, next) => {
  const p = participantOf(req);
  if (p) res.setHeader('Set-Cookie', `cc_participant=${p}; Path=/; HttpOnly; SameSite=Lax`);
  next();
});

// Count the page view — a county and a day, nothing else. Only extensionless
// GET pages (not assets, not /files downloads); the gate's own pages are served
// before this point, so gate bounces aren't counted, only real reads.
app.use((req, res, next) => {
  if (req.method === 'GET' && req.tenantKey
      && !req.path.startsWith('/files') && !/\.[a-z0-9]+$/i.test(req.path)) {
    traffic.note(req.tenantKey);
  }
  next();
});

// ---- the document archive (behind the gate) ----
// Every stored source document, served from our hashed archive.
app.use('/files', express.static(path.join(__dirname, '..', 'inbox'), { maxAge: '1d', index: false }));

// ---- pages ----
const { homePage } = require('./views/home');
app.get('/', (req, res) => {
  const participant = participantOf(req);
  const data = load(req.tenantKey);
  const open = (data.issueDrafts.drafts || []).filter(d => d.status === 'open-tier0');
  res.send(homePage(data, {
    registeredFields: participant ? require('./identity').fieldsOf(participant) : [],
    justRegistered: req.query.registered === '1',
    announceChecked: !!(participant && open.length && require('./signatures').mySignature(participant, open[0].id))
  }));
});
app.get('/budget', (req, res) => res.send(treePage(load(req.tenantKey), { pbOpen: !!require('./pb').openExerciseFor(req.tenantKey) })));

app.get('/line/:id', (req, res) => {
  const data = load(req.tenantKey);
  const node = data.byId.get(req.params.id);
  if (!node) return res.status(404).send(notFound(data, 'No line with that id exists in the corpus.'));
  res.send(nodePage(data, node));
});

// /story renders THE-STORY.md — canonical front-door copy per the handoff —
// followed by the claims ledger: every promise in the story is either live
// or tracked to the milestone that makes it true. The plain-words guide
// lives at /guide.
app.get('/story', (req, res) => {
  const data = load(req.tenantKey);
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

app.get('/guide', (req, res) => res.send(storyPage(load(req.tenantKey))));

const { stancePage } = require('./views/stance');
const { participatePage } = require('./views/participate');
app.get('/stance', (req, res) => res.send(stancePage(load(req.tenantKey))));

const { casesPage, casePage } = require('./views/cases');
const { researchPage } = require('./views/research');
app.get('/research', (req, res) => res.send(researchPage(load(req.tenantKey))));
app.get('/cases', (req, res) => res.send(casesPage(load(req.tenantKey))));
app.get('/cases/:id', (req, res) => {
  const data = load(req.tenantKey);
  const c = data.cases.cases.find(x => x.id === req.params.id);
  if (!c) return res.status(404).send(notFound(data, 'No case study with that id.'));
  res.send(casePage(data, c));
});
app.get('/participate', (req, res) => res.send(participatePage(load(req.tenantKey))));

// Kindred work: nonpartisan groups that teach the how of self-government.
// Platform doctrine, identical on every county (reads config/kindred.json).
const { kindredPage } = require('./views/kindred');
app.get('/kindred', (req, res) => res.send(kindredPage(load(req.tenantKey))));

const { helpPage } = require('./views/help');
app.get('/help', (req, res) => res.send(helpPage(load(req.tenantKey))));

const { calendarPage } = require('./views/calendar');
app.get('/calendar', (req, res) => res.send(calendarPage(load(req.tenantKey))));
app.get('/vendors', (req, res) => res.send(vendorsPage(load(req.tenantKey))));
app.get('/audits', (req, res) => res.send(auditsPage(load(req.tenantKey))));

app.get('/compare/spending', (req, res) => res.send(spendingPage(load(req.tenantKey))));

// Cross-county comparison, per resident, by function, with AR/US benchmarks.
// Registered before /compare/:id so it isn't caught as a comparison id.
const { compute: computeCountyCompare } = require('./lib/countycompare');
const { compareCountiesPage } = require('./views/comparecounties');
app.get('/compare/counties', (req, res) => res.send(compareCountiesPage(load(req.tenantKey), computeCountyCompare())));

// The county directory: every county on the network, live or awaiting a host.
// Reachable once you're inside — this is how a resident navigates the whole
// site, not just their own county.
const { countiesPage } = require('./views/counties');
app.get('/counties', (req, res) => res.send(countiesPage(load(req.tenantKey), tenant.registry())));

app.get('/compare/:id', (req, res) => {
  const data = load(req.tenantKey);
  const cmp = data.comparisons.comparisons.find(c => c.id === req.params.id);
  if (!cmp) return res.status(404).send(notFound(data, 'No comparison with that id exists.'));
  res.send(comparePage(data, cmp));
});

app.get('/docket', (req, res) => res.send(docketPage(load(req.tenantKey))));
app.get('/documents', (req, res) => res.send(documentsPage(load(req.tenantKey), req.query.q)));
app.get('/verify', (req, res) => res.send(verifyPage(load(req.tenantKey))));
app.get('/methodology', (req, res) => res.send(methodologyPage(load(req.tenantKey))));

// Charter documents rendered as public pages (SECURITY.md §14; NEVER.md).
const { mdToHtml } = require('./lib/md');
function charterPage(file, current, description) {
  return (req, res) => {
    const data = load(req.tenantKey);
    const { layout } = require('./views/layout');
    const md = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    res.send(layout({
      title: `${path.basename(file).replace('.md', '')} — ${data.county.platform_name}`,
      current, county: data.county, description,
      body: `<div style="max-width:72ch">${mdToHtml(md)}</div>`
    }));
  };
}
// The traffic log — published on purpose (aggregate-only; no IPs, no cookies).
const { trafficPage } = require('./views/traffic');
app.get('/traffic', (req, res) => res.send(trafficPage(load(req.tenantKey), traffic.summary(), tenant.registry())));

app.get('/security', charterPage('SECURITY.md', null, 'The platform\'s public threat model and integrity protocols, including the hash-chained activity log anyone can verify.'));
app.get('/never', charterPage('NEVER.md', null, 'What this project will never do — written down before anyone was watching, on purpose.'));
app.get('/field', charterPage('docs/FIELD.md', '/field', 'An honest map of where this platform sits among civic-democracy organizations — where it leads, where it is early by design, and what it refuses to become.'));

// ---- issues: Tier 0 sentiment polling (the M2 seed) ----
// The participant token is a 24-hex string we minted (randomBytes(12)). Read
// it back STRICTLY: anything else — a forged cookie, "__proto__", "constructor"
// — is rejected to null so it can never become an object key in the stores
// (prototype-pollution guard). ensureParticipant then mints a fresh valid one.
const TOKEN_RE = /^[a-f0-9]{24}$/;
function participantOf(req) {
  const t = cookies(req).cc_participant || '';
  return TOKEN_RE.test(t) ? t : null;
}

app.get('/issues', (req, res) => res.send(issuesPage(load(req.tenantKey), {
  asked: req.query.asked === '1', blocked: req.query.blocked || null, submitted: req.query.submitted === '1'
})));

// A resident proposes a question at a level (county / state / national).
app.post('/issues/ask', writeLimit, express.urlencoded({ extended: false }), (req, res) => {
  const participant = ensureParticipant(req, res);
  const data = load(req.tenantKey);
  const scope = (req.body && req.body.scope) || 'local';
  const r = require('./questions').ask({
    scope, state: data.county && data.county.state, tenant: req.tenantKey,
    wording: req.body && req.body.wording, context: req.body && req.body.context, participant
  });
  if (r.error === 'bright-line') return res.redirect('/issues?blocked=' + encodeURIComponent((r.flags || []).join(', ')) + '#ask');
  if (r.error) return res.redirect('/issues#ask');
  res.redirect('/issues?asked=1#proposed');
});

// Support a proposal; it auto-opens for a live vote at the threshold.
app.post('/issues/:id/support', writeLimit, express.urlencoded({ extended: false }), (req, res) => {
  const participant = ensureParticipant(req, res);
  require('./questions').support(participant, req.params.id);
  res.redirect('/issues#proposed');
});

app.post('/issues/submit', heavyLimit, express.urlencoded({ extended: false }), (req, res) => {
  const q = (req.body && req.body.question || '').trim();
  if (!q) return res.redirect('/issues#ask');
  const { submit } = require('./submissions');
  submit({ question: q, name: (req.body.name || '').trim() || null, contact: (req.body.contact || '').trim() || null });
  res.redirect('/issues?submitted=1#ask');
});

app.get('/issues/:id/qr.svg', (req, res) => {
  const data = load(req.tenantKey);
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
  const data = load(req.tenantKey);
  const draft = data.issueDrafts.drafts.find(d => d.id === req.params.id && d.status === 'open-tier0');
  if (!draft) return res.status(404).send(notFound(data, 'No open question with that id.'));
  const voted = req.query.voted && ['yes', 'no', 'skip'].includes(req.query.voted) ? req.query.voted : null;
  const participant = participantOf(req);
  res.send(issuePage(data, draft, participant, voted,
    participant ? identity.fieldsOf(participant) : [], req.query.registered === '1',
    req.query.sign || null));
});

app.post('/issues/:id/vote', writeLimit, express.urlencoded({ extended: false }), (req, res) => {
  const data = load(req.tenantKey);
  const draft = data.issueDrafts.drafts.find(d => d.id === req.params.id && d.status === 'open-tier0');
  if (!draft) return res.status(404).send(notFound(data, 'No open question with that id.'));
  const value = (req.body && req.body.value) || '';
  if (!['yes', 'no', 'skip'].includes(value)) return res.redirect(`/issues/${draft.id}`);
  const participant = ensureParticipant(req, res);
  castVote(participant, draft.id, value, 'web', (req.body && req.body.connection) || '');
  // Keep any public signature in sync — a petition line must show the
  // signer's CURRENT answer, never the one they later changed away from.
  require('./signatures').reflectVote(participant, draft.id, value);
  res.redirect(`/issues/${draft.id}?voted=${value}#register`);
});

app.post('/issues/:id/register', writeLimit, express.urlencoded({ extended: false }), (req, res) => {
  const data = load(req.tenantKey);
  const draft = data.issueDrafts.drafts.find(d => d.id === req.params.id && d.status === 'open-tier0');
  if (!draft) return res.status(404).send(notFound(data, 'No open question with that id.'));
  const participant = ensureParticipant(req, res);
  const saved = identity.register(participant, req.body || {});
  const sigState = applyAnnouncement(participant, draft.id, req.body);
  res.redirect(`/issues/${draft.id}?${saved ? 'registered=1&' : ''}${sigState ? `sign=${sigState}` : ''}#${sigState === 'ok' || sigState === 'removed' ? 'sign' : 'register'}`);
});

// The announce box, resolved: checked + a vote + a registered name → the
// name, town, and answer go on the question page; unchecked with an existing
// announcement → it comes down. States: ok, removed, novote, noname, null.
function applyAnnouncement(participant, issueId, body) {
  const on = !!(body && body.announce);
  const sigs = require('./signatures');
  if (!on) return sigs.mySignature(participant, issueId) && sigs.unsign(participant, issueId) ? 'removed' : null;
  const vote = require('./vote').myVote(participant, issueId);
  if (!vote) return 'novote';
  const vals = identity.publicValuesOf(participant);
  if (!vals.name) return 'noname';
  sigs.sign(participant, issueId, vote.value, vals.name, vals.city);
  return 'ok';
}

app.post('/register', writeLimit, express.urlencoded({ extended: false }), (req, res) => {
  const participant = ensureParticipant(req, res);
  const saved = identity.register(participant, req.body || {});
  const open = (load(req.tenantKey).issueDrafts.drafts || []).filter(d => d.status === 'open-tier0');
  const sigState = open.length ? applyAnnouncement(participant, open[0].id, req.body) : null;
  // An announcement outcome belongs on the page where the name appears (or
  // where the missing step is) — send them there to see it.
  if (sigState) return res.redirect(`/issues/${open[0].id}?${saved ? 'registered=1&' : ''}sign=${sigState}#sign`);
  res.redirect(`/${saved ? '?registered=1' : ''}#register`);
});

// ---- participatory budgeting (advisory allocation; docs/PARTICIPATORY-BUDGETING.md) ----
const pb = require('./pb');
const { pbPage, pbEmptyPage } = require('./views/pb');

app.get('/yourbudget', (req, res) => {
  const data = load(req.tenantKey);
  const ex = pb.openExerciseFor(req.tenantKey);
  if (!ex) return res.send(pbEmptyPage(data));
  const participant = participantOf(req);
  const myAlloc = participant ? pb.myAllocation(participant, ex.id) : null;
  res.send(pbPage(data, ex, participant, myAlloc, pb.tallyPB(ex), {
    submitted: req.query.placed === '1',
    error: req.query.error === 'sum' ? `Your tokens must add up to exactly ${ex.tokens}. Nothing was saved — try again.` : null
  }));
});

// One allocation gate. Options come in as t_<optionId> fields; the tradeoff
// constraint (sum === tokens) is enforced in pb.castAllocation, not here.
app.post('/yourbudget/:id', writeLimit, express.urlencoded({ extended: false }), (req, res) => {
  const ex = pb.getExercise(req.params.id);
  if (!ex || ex.tenant !== req.tenantKey || ex.status !== 'open') return res.redirect('/yourbudget');
  const participant = ensureParticipant(req, res);
  const allocation = {};
  for (const op of ex.options) allocation[op.id] = parseInt((req.body && req.body['t_' + op.id]) || '0', 10) || 0;
  try {
    pb.castAllocation(participant, ex.id, allocation, 'web');
  } catch (e) {
    if (e.code === 'BAD_SUM') return res.redirect('/yourbudget?error=sum');
    throw e;
  }
  res.redirect('/yourbudget?placed=1');
});

// ---- community priorities (voice to the budget-writers; server/priorities.js) ----
const priorities = require('./priorities');
const { prioritiesPage } = require('./views/priorities');

app.get('/priorities', (req, res) => {
  const data = load(req.tenantKey);
  const items = priorities.listFor(req.tenantKey);
  const participant = participantOf(req);
  res.send(prioritiesPage(data, items, {
    proposed: req.query.proposed === '1',
    supported: req.query.supported === '1',
    blocked: req.query.blocked || null,
    mine: priorities.supportedBy(participant, req.tenantKey)
  }));
});

app.post('/priorities/propose', writeLimit, express.urlencoded({ extended: false }), (req, res) => {
  const participant = ensureParticipant(req, res);
  const b = req.body || {};
  const r = priorities.propose({ tenant: req.tenantKey, kind: b.kind, title: b.title, why: b.why, node_ref: b.node_ref, participant, county: load(req.tenantKey).county });
  if (r.error === 'bright-line') return res.redirect('/priorities?blocked=' + encodeURIComponent((r.flags || []).join(', ')));
  if (r.error) return res.redirect('/priorities');
  res.redirect('/priorities?proposed=1');
});

app.post('/priorities/:id/support', writeLimit, express.urlencoded({ extended: false }), (req, res) => {
  const participant = ensureParticipant(req, res);
  priorities.support(participant, req.params.id, (req.body && req.body.why) || '');
  res.redirect('/priorities?supported=1');
});

// The accountability loop, in public: what the county did with each priority.
const { outcomesPage } = require('./views/outcomes');
app.get('/outcomes', (req, res) => res.send(outcomesPage(load(req.tenantKey), priorities.listFor(req.tenantKey))));

// ---- owner console (owner code; create counties, mint PINs) ----
const { ownerConsole } = require('./views/owner');
const { createCounty } = require('./lib/scaffold');

function ownerData(reg) {
  const pinsByTenant = {};
  for (const key of Object.keys(reg.tenants)) pinsByTenant[key] = access.pinsForTenant(key);
  return { reg, pinsByTenant };
}
function logOwner(req, what) {
  try { require('./lib/chain').append('owner-action', { by: req.access.name || 'owner', what }); }
  catch (e) { /* optional */ }
}

app.get('/owner', requireOwner, (req, res) => {
  const { reg, pinsByTenant } = ownerData(tenant.registry());
  const opts = {};
  if (req.query.created) { try { opts.created = JSON.parse(Buffer.from(req.query.created, 'base64').toString('utf8')); } catch (e) {} }
  if (req.query.minted) { try { opts.minted = JSON.parse(Buffer.from(req.query.minted, 'base64').toString('utf8')); } catch (e) {} }
  if (req.query.error) opts.error = String(req.query.error).slice(0, 200);
  res.send(ownerConsole(reg, pinsByTenant, require('./questions').all(), priorities.listAll(), opts));
});

// Owner is the network-wide backstop: remove any community priority, any county.
app.post('/owner/priorities/remove', requireOwner, express.urlencoded({ extended: false }), (req, res) => {
  const id = (req.body && req.body.id) || '';
  if (priorities.get(id)) { priorities.remove(id); logOwner(req, `removed community priority ${id}`); }
  res.redirect('/owner');
});

// Owner moderates any resident question (any scope).
function ownerModerate(action, verb) {
  return (req, res) => {
    const Q = require('./questions');
    const id = (req.body && req.body.id) || '';
    if (Q.get(id)) {
      if (action === 'remove') Q.remove(id);
      else Q.setStatus(id, action === 'open' ? 'open-tier0' : 'closed');
      logOwner(req, `${verb} question ${id}`);
    }
    res.redirect('/owner');
  };
}
app.post('/owner/questions/open', requireOwner, express.urlencoded({ extended: false }), ownerModerate('open', 'opened'));
app.post('/owner/questions/close', requireOwner, express.urlencoded({ extended: false }), ownerModerate('close', 'closed'));
app.post('/owner/questions/remove', requireOwner, express.urlencoded({ extended: false }), ownerModerate('remove', 'removed'));

app.post('/owner/pins/mint', requireOwner, express.urlencoded({ extended: false }), (req, res) => {
  const t = String((req.body && req.body.tenant) || '');
  if (!tenant.registry().tenants[t]) return res.redirect('/owner?error=' + encodeURIComponent('Unknown county.'));
  const minted = access.mintFor(t, String((req.body && req.body.name) || '').trim().slice(0, 80));
  logOwner(req, `rotated PINs for ${t}`);
  res.redirect('/owner?minted=' + Buffer.from(JSON.stringify({ tenant: t, view: minted.view, admin: minted.admin })).toString('base64'));
});

app.post('/owner/county/create', requireOwner, express.urlencoded({ extended: false }), (req, res) => {
  const b = req.body || {};
  try {
    const c = createCounty({ key: b.key, name: b.name, state: b.state, sub: b.sub, platformName: b.platformName });
    const minted = access.mintFor(c.key, String(b.hostName || '').trim().slice(0, 80));
    logOwner(req, `created county ${c.key}`);
    const payload = { name: b.name + ', ' + b.state, host: c.host, view: minted.view, admin: minted.admin };
    res.redirect('/owner?created=' + Buffer.from(JSON.stringify(payload)).toString('base64'));
  } catch (e) {
    res.redirect('/owner?error=' + encodeURIComponent(e.message || 'Could not create the county.'));
  }
});

// ---- county admin (host code; edits scoped to this county's overlay) ----
// Every route is guarded by requireAdmin, writes only to req.access.tenant's
// overlay, and chains an admin-edit event by the host's name. See COUNTY-CODE.md.
const overlay = require('./lib/overlay');
const chain = require('./lib/chain');
const { adminDashboard, adminCalendar, adminQuestions, adminPriorities, adminHelp, adminCopy } = require('./views/admin');
const submissions = require('./submissions');
const { COPY_SLOTS } = require('./lib/copyslots');

function logAdminEdit(req, section) {
  try { chain.append('admin-edit', { tenant: req.access.tenant, by: req.access.name || 'host', section }); }
  catch (e) { /* chain optional in dev */ }
}

app.get('/admin', requireAdmin, (req, res) =>
  res.send(adminDashboard(load(req.tenantKey), req.access.name)));

app.get('/admin/calendar', requireAdmin, (req, res) =>
  res.send(adminCalendar(load(req.tenantKey), { saved: req.query.saved === '1' })));

// Host moderates community priorities for THIS county only. Bright-line screening
// refuses the worst at the door; this is the takedown for anything else.
app.get('/admin/priorities', requireAdmin, (req, res) =>
  res.send(adminPriorities(load(req.tenantKey), priorities.listFor(req.access.tenant),
    { removed: req.query.removed === '1', recorded: req.query.recorded === '1' })));

app.post('/admin/priorities/remove', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const id = (req.body && req.body.id) || '';
  const p = priorities.get(id);
  // Ownership check: a host can only remove a priority in their own county.
  if (p && p.tenant === req.access.tenant) { priorities.remove(id); logAdminEdit(req, 'removed a community priority'); }
  res.redirect('/admin/priorities?removed=1');
});

// Record an accountability-loop step (delivered / answered / acted), cited.
app.post('/admin/priorities/outcome', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const b = req.body || {};
  const p = priorities.get(b.id || '');
  if (p && p.tenant === req.access.tenant) {
    priorities.addOutcome(b.id, {
      stage: b.stage, at: b.at, note: b.note,
      source: { url: b.source_url, label: b.source_label }, by: req.access.name || 'host'
    });
    logAdminEdit(req, `recorded a priority outcome (${String(b.stage || '').slice(0, 20)})`);
  }
  res.redirect('/admin/priorities?recorded=1');
});

app.post('/admin/priorities/outcome/undo', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const id = (req.body && req.body.id) || '';
  const p = priorities.get(id);
  if (p && p.tenant === req.access.tenant) { priorities.undoOutcome(id); logAdminEdit(req, 'undid a priority outcome'); }
  res.redirect('/admin/priorities');
});

app.post('/admin/calendar/intro', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const intro = String((req.body && req.body.intro) || '').slice(0, 600);
  overlay.setSection(req.access.tenant, 'calendar_intro', intro);
  logAdminEdit(req, 'calendar intro');
  res.redirect('/admin/calendar?saved=1');
});

app.post('/admin/calendar/event/add', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 120);
  if (!name) return res.redirect('/admin/calendar');
  const ev = {
    name,
    date: String(b.date || '').trim().slice(0, 80),
    place: String(b.place || '').trim().slice(0, 120),
    note: String(b.note || '').trim().slice(0, 240)
  };
  const cur = overlay.read(req.access.tenant).calendar_community
    || ((load(req.tenantKey).calendar.community || {}).listings) || [];
  const next = cur.concat([ev]).slice(0, 100);
  overlay.setSection(req.access.tenant, 'calendar_community', next);
  logAdminEdit(req, 'added community event');
  res.redirect('/admin/calendar?saved=1');
});

app.post('/admin/calendar/event/remove', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const i = parseInt((req.body && req.body.index), 10);
  const cur = overlay.read(req.access.tenant).calendar_community
    || ((load(req.tenantKey).calendar.community || {}).listings) || [];
  if (Number.isInteger(i) && i >= 0 && i < cur.length) {
    cur.splice(i, 1);
    overlay.setSection(req.access.tenant, 'calendar_community', cur);
    logAdminEdit(req, 'removed community event');
  }
  res.redirect('/admin/calendar?saved=1');
});

// --- admin: questions (the republic-alongside frame is enforced here) ---
app.get('/admin/questions', requireAdmin, (req, res) =>
  res.send(adminQuestions(load(req.tenantKey), overlay.read(req.access.tenant).questions || [],
    require('./questions').forTenantLocal(req.access.tenant),
    { opened: req.query.opened === '1', closed: req.query.closed === '1', blocked: req.query.blocked || null, moderated: req.query.moderated || null })));

// Host moderates a LOCAL resident question for THIS county only. State and
// national questions span counties and are the owner's to moderate — the
// ownership check below refuses anything that isn't this county's local one.
function moderateResident(action, verb) {
  return (req, res) => {
    const Q = require('./questions');
    const id = (req.body && req.body.id) || '';
    const item = Q.get(id);
    if (item && item.scope === 'local' && item.tenant === req.access.tenant) {
      if (action === 'remove') Q.remove(id);
      else Q.setStatus(id, action === 'open' ? 'open-tier0' : 'closed');
      logAdminEdit(req, `${verb} a resident question`);
    }
    res.redirect('/admin/questions?moderated=' + verb);
  };
}
app.post('/admin/questions/resident/open', requireAdmin, express.urlencoded({ extended: false }), moderateResident('open', 'opened'));
app.post('/admin/questions/resident/close', requireAdmin, express.urlencoded({ extended: false }), moderateResident('close', 'closed'));
app.post('/admin/questions/resident/remove', requireAdmin, express.urlencoded({ extended: false }), moderateResident('remove', 'removed'));

app.post('/admin/questions/open', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const wording = String((req.body && req.body.wording) || '').trim().slice(0, 300);
  if (!wording) return res.redirect('/admin/questions');
  // The charter bright lines are a bone: no candidates, no ballot measures, no
  // named-individual conduct. A host cannot open a question that trips them.
  const flags = submissions.screen(wording);
  if (flags.length) return res.redirect('/admin/questions?blocked=' + encodeURIComponent(flags.join(', ')));
  const slug = wording.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    || 'question';
  const id = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
  const q = {
    id, final_wording: wording, opened: new Date().toISOString().slice(0, 10),
    status: 'open-tier0', created_by: req.access.name || 'host',
    context: String((req.body && req.body.context) || '').trim().slice(0, 600) || null
  };
  const cur = overlay.read(req.access.tenant).questions || [];
  overlay.setSection(req.access.tenant, 'questions', cur.concat([q]).slice(0, 200));
  logAdminEdit(req, 'opened a question');
  res.redirect('/admin/questions?opened=1');
});

app.post('/admin/questions/close', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const id = String((req.body && req.body.id) || '');
  const cur = overlay.read(req.access.tenant).questions || [];
  const q = cur.find(x => x.id === id);
  if (q) { q.status = 'closed'; overlay.setSection(req.access.tenant, 'questions', cur); logAdminEdit(req, 'closed a question'); }
  res.redirect('/admin/questions?closed=1');
});

// --- admin: page copy (per-county headline / front-page wording) ---
app.get('/admin/copy', requireAdmin, (req, res) =>
  res.send(adminCopy(load(req.tenantKey), overlay.read(req.access.tenant).copy || {}, { saved: req.query.saved === '1' })));

app.post('/admin/copy', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const b = req.body || {};
  const next = {};
  for (const s of COPY_SLOTS) {
    const v = String(b[s.key] || '').trim().slice(0, 400);
    // Store only real overrides; blank or exactly-the-default reverts to shared.
    if (v && v !== s.default) next[s.key] = v;
  }
  overlay.setSection(req.access.tenant, 'copy', next);
  logAdminEdit(req, 'page copy');
  res.redirect('/admin/copy?saved=1');
});

// --- admin: Help Finder listings ---
app.get('/admin/help', requireAdmin, (req, res) =>
  res.send(adminHelp(load(req.tenantKey), overlay.read(req.access.tenant).help_local || [], { saved: req.query.saved === '1' })));

app.post('/admin/help/add', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 120);
  if (!name) return res.redirect('/admin/help');
  const r = {
    name,
    what: String(b.what || '').trim().slice(0, 160),
    phone: String(b.phone || '').trim().slice(0, 40),
    hours: String(b.hours || '').trim().slice(0, 120),
    address: String(b.address || '').trim().slice(0, 160)
  };
  const cur = overlay.read(req.access.tenant).help_local || [];
  overlay.setSection(req.access.tenant, 'help_local', cur.concat([r]).slice(0, 200));
  logAdminEdit(req, 'added a help listing');
  res.redirect('/admin/help?saved=1');
});

app.post('/admin/help/remove', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  const i = parseInt((req.body && req.body.index), 10);
  const cur = overlay.read(req.access.tenant).help_local || [];
  if (Number.isInteger(i) && i >= 0 && i < cur.length) {
    cur.splice(i, 1);
    overlay.setSection(req.access.tenant, 'help_local', cur);
    logAdminEdit(req, 'removed a help listing');
  }
  res.redirect('/admin/help?saved=1');
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
const safePath = p => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.includes('\\')) ? p : '';

app.get('/feedback', (req, res) => {
  let from = safePath(req.query.from || '');
  if (!from) { try { from = safePath(new URL(req.headers.referer).pathname); } catch (e) { /* no referer */ } }
  res.send(feedbackPage(load(req.tenantKey).county, { from }));
});

app.post('/feedback', heavyLimit, (req, res) => {
  fbUpload.single('screenshot')(req, res, (err) => {
    const county = load(req.tenantKey).county;
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
    const data = load(req.tenantKey);
    res.status(404).send(notFound(data,
      'This part of the platform is not built yet. The budget engine comes first; issues, results, and Q&A follow.'));
  });
}

app.use((req, res) => res.status(404).send(notFound(load(req.tenantKey), 'That page does not exist.')));

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
app.listen(PORT, () => console.log(`County Commons listening on http://localhost:${PORT}${access.gateConfigured() ? ' (PIN-gated)' : ' (open)'}`));
