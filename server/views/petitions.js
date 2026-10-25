const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const reqctx = require('../lib/reqctx');
const PV = require('./priorities');

// Petitions — the digital clipboard. The same thing neighbors have always done
// at the courthouse door: one sentence saying what we want, who it's going to,
// and a line to sign. Each petition is a community priority (server/priorities.js)
// with a named addressee, a goal sized to real petition law (lib/threshold.js),
// a signature that takes a name and a town like paper, and a delivery promise
// kept in public on /outcomes. Public pages show counts and towns, never names;
// a signer's name goes on the copy handed to officials only if they ask.

const HONEST = 'This is a petition to your elected officials — like the clipboard at the courthouse door. It does not put anything on the ballot; in Arkansas and most states that takes ink signatures from registered voters.';
const HONEST_GENERIC = 'This is a petition to your elected officials — like the clipboard at the courthouse door. It does not put anything on the ballot; that takes the state’s official petition process.';
const honest = (county) => county.state === 'Arkansas' ? HONEST : HONEST_GENERIC;

// Who a petition at a level goes to, by name where we have it.
function addressee(data, lvl) {
  const c = data.county;
  if (!lvl) return PV.govBody(c);
  if (lvl.kind === 'national') return 'your members of Congress';
  if (lvl.kind === 'state') return `${c.state} state legislators and the governor`;
  if (lvl.kind === 'county') {
    const dir = data.stateOfficials && data.stateOfficials.counties && data.stateOfficials.counties[c.name.replace(/ County$/, '')];
    const judge = (c.officials || []).find(o => /county judge/i.test(o.office) && o.name) || (dir && dir.officials.find(o => o.office === 'Judge' && o.name));
    if (c.state === 'Arkansas' && judge) return `County Judge ${judge.name} and the ${c.name} Quorum Court${dir && dir.justices.length ? ` (${dir.justices.length} justices of the peace)` : ''}`;
    return /^the /i.test(lvl.body) ? lvl.body : `the ${c.name} ${lvl.body}`;
  }
  return new RegExp(lvl.label, 'i').test(lvl.body) ? `the ${lvl.body}` : `the ${lvl.label} ${lvl.body}`;
}

function levelOf(data, places, id) {
  const { levels } = PV.funnelLevels(data.county, places);
  return levels.find(l => l.id === id) || levels.find(l => l.kind === 'county') || levels.find(l => l.kind === 'city' || l.kind === 'town') || levels[0];
}

// County site key -> "Clark County, Arkansas", for shared-petition roll-ups.
let SITES = null;
function siteNames() {
  if (SITES) return SITES;
  const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..', '..');
  SITES = {};
  try {
    const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tenants.json'), 'utf8')).tenants;
    for (const [k, t] of Object.entries(T)) { try { const c = JSON.parse(fs.readFileSync(path.join(ROOT, t.configPath), 'utf8')); SITES[k] = { name: c.name, state: c.state }; } catch (e) {} }
  } catch (e) {}
  return SITES;
}
function placeName(key) {
  const S = siteNames();
  if (/^us:\d{5}$/.test(String(key))) { const c = require('./national').countyByGeoid(String(key).slice(3)); return c ? `${c.name}, ${c.state}` : null; }
  if (S[key]) return `${S[key].name}, ${S[key].state}`;
  const m = /^\/us\/([a-z]{2})\/([a-z0-9-]+)$/.exec(String(key));
  if (m) { try { return require('./national').countyName(m[1], m[2]); } catch (e) { return null; } }
  return null;
}
const siteUrl = (key, id) => `https://${key}.countycommons.us/petitions/${id}`;

// "The same ask is open in 92 counties in 12 states — 1,240 signatures in all."
function sharedStrip(p) {
  if (!p.campaign) return '';
  const r = require('../priorities').campaignRollup(p.campaign);
  const S = siteNames();
  if (p.level === 'national' || p.level === 'state') {
    const rows = r.bySite.map(([k, n]) => [placeName(k), n]).filter(([k]) => k).slice(0, 12);
    return `<div class="issue" style="display:block;border-left:3px solid var(--accent)"><b>Signed from ${r.sitesSigning} count${r.sitesSigning === 1 ? 'y' : 'ies'} so far</b>${rows.length ? `<p class="src" style="max-width:none;margin:4px 0 0">${rows.map(([k, n]) => `${esc(k)} <b>${n}</b>`).join(' · ')}</p>` : '<p class="src" style="margin:4px 0 0">Be the first from your county.</p>'}</div>`;
  }
  const states = new Set(r.copies.map(c => (S[c.tenant] || {}).state || (/^us:/.test(c.tenant) ? (require('./national').countyByGeoid(c.tenant.slice(3)) || {}).state : null)).filter(Boolean));
  return `<div class="issue" style="display:block;border-left:3px solid var(--accent)"><b>The same ask is open in ${r.copies.length} counties in ${states.size} state${states.size === 1 ? '' : 's'}</b> — ${r.total.toLocaleString('en-US')} signature${r.total === 1 ? '' : 's'} across all of them. Each county's petition goes to its own officials and counts toward its own goal; together they show how many places want the same thing. <a href="/petitions/shared/${esc(p.campaign)}">See every county →</a></div>`;
}

// A petition's sources: its own, or its shared campaign's (config/campaigns.json).
let CAMP = { m: 0, d: null };
function sourcesOf(p) {
  if (p.src && p.src.length) return p.src;
  if (!p.campaign) return [];
  const f = require('path').join(__dirname, '..', '..', 'config', 'campaigns.json');
  try { const m = require('fs').statSync(f).mtimeMs; if (m !== CAMP.m) CAMP = { m, d: JSON.parse(require('fs').readFileSync(f, 'utf8')) }; } catch (e) { return []; }
  const c = (CAMP.d.campaigns || []).find(x => x.id === p.campaign);
  return (c && c.src) || [];
}
function sourcesLine(p) {
  const s = sourcesOf(p);
  return s.length ? `<p class="src" style="max-width:none">Sources for the facts above: ${s.map(x => `<a href="${esc(x.url)}" rel="noopener">${esc(x.label || x.url)}</a>`).join(' · ')}</p>` : '';
}

const signers = (n) => `${n.toLocaleString('en-US')} ${n === 1 ? 'signature' : 'signatures'}`;

function card(data, p, places, mine) {
  const lvl = levelOf(data, places, p.level);
  const goal = PV.levelThreshold(lvl, data.county);
  return `
<div class="issue" style="display:block">
  ${p.campaign ? '<span class="chip c-part" style="font-size:11px">shared across counties</span><br>' : ''}<a href="/petitions/${esc(p.id)}" style="text-decoration:none;color:inherit"><b style="font-size:17px">${esc(p.title)}</b></a>
  <p class="src" style="max-width:none;margin:4px 0 0">To ${esc(addressee(data, lvl))}</p>
  ${PV.progressBar(p.support, goal, null)}
  ${PV.statusLine(p)}
  <p style="margin:8px 0 0"><a href="/petitions/${esc(p.id)}#sign" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:8px 14px;background:${mine ? 'var(--card)' : 'var(--ink)'};color:${mine ? 'var(--ink)' : 'var(--paper)'};border:1.5px solid var(--ink);text-decoration:none">${mine ? '✓ You signed — share it' : 'Read and sign →'}</a></p>
</div>`;
}

function startForm(data, lvl, opts) {
  const err = { 'title-too-short': 'Say what you’re asking for in a full sentence — at least a few words.', 'why-too-short': 'Add a sentence or two about why it matters to you.', junk: 'That didn’t look like a real petition.', missing: 'Both boxes are needed.' }[opts.error] || '';
  return `
<section id="start">
<h2>Start a petition</h2>
${opts.blocked ? `<p class="src" style="color:var(--dead)">That one can’t go up here: ${esc(opts.blocked)}. Petitions here can’t campaign for or against candidates or ballot measures, or single out county staff by name — <a href="/never">the lines this site holds</a>. Elected officials can be named.</p>` : ''}
${err ? `<p class="src" style="color:var(--dead)">${esc(err)}</p>` : ''}
<form method="post" action="/petitions/start" style="display:grid;gap:8px;max-width:640px">
  <input type="hidden" name="level" value="${esc(lvl.id)}">
  <label><b>We ask ${esc(addressee(data, lvl))} to:</b><br>
    <input name="title" required maxlength="120" value="${esc(opts.idea || '')}" placeholder="publish the check register online every month" style="width:100%;font-size:16px;padding:8px"></label>
  <label><b>Why it matters</b><br>
    <textarea name="why" required maxlength="600" rows="4" placeholder="What it would change for your family, your street, or your town." style="width:100%;font-size:15px;padding:8px"></textarea></label>
  <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave this empty <input name="website" tabindex="-1" autocomplete="off"></label></div>
  <button type="submit" style="justify-self:start;font-family:var(--mono);font-size:15px;font-weight:600;padding:10px 18px;background:var(--ink);color:var(--paper);border:0;cursor:pointer">Start the petition</button>
  <p class="src" style="margin:0">You’ll be its first signer — next you add your name and town. Aim it at a decision these officials can actually make. Not sure which level? Pick it above: county, a city or town, the state, or the nation.</p>
</form>
</section>`;
}

function listPage(data, items, opts) {
  const o = opts || {};
  const { county } = data;
  const lvl = levelOf(data, o.places, o.level);
  const { levels } = PV.funnelLevels(county, o.places);
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · petitions</div>
  <h1>Petitions in ${esc(county.name)}</h1>
  <div class="src">Sign what you agree with, start what’s missing, and share it with your neighbors. When a petition reaches its goal, it’s printed with the count by town and handed to the officials it names at a public meeting — and their answer is posted on <a href="/outcomes">what came of it</a>. ${esc(honest(county))}</div>
</header>
<section id="board">
${PV.levelFunnel(levels, lvl.id, o.idea).replace(/\/priorities\?/g, '/petitions?').replace('the funnel — pick a level, each is its own board', 'who it goes to — pick a level')}
<h2>${esc(lvl.label)} <span class="sub">— petitions to ${esc(addressee(data, lvl))}</span></h2>
${items.length ? items.map(p => card(data, p, o.places, o.mine && o.mine.has(p.id))).join('') : `<p>No petitions here yet. <a href="#start">Start the first one</a> — it takes a minute.</p>`}
${o.wider ? o.wider : ''}
</section>
${startForm(data, lvl, o)}
<section><p class="src">Every petition here goes through the same lines as everything else on this site: no campaigning for candidates or ballot measures, and no naming county staff. Signatures are counted, not verified — one per browser — and the copy handed to officials removes duplicates. <a href="/outcomes">What came of past petitions</a>.</p></section>`;
  return layout({
    title: `Petitions in ${county.name}, ${county.state}: sign, start and share · County Commons`,
    current: '/petitions', body, county,
    description: `Sign or start a petition to ${county.name} officials. Each one goes to named elected officials when it reaches its goal, and their answer is posted publicly.`
  });
}

function shareBlock(data, p, goal) {
  const link = reqctx.url(`/petitions/${p.id}`);
  const msg = `I signed: ${p.title} — ${p.support} ${data.county.name} neighbors so far, goal ${goal}. Sign it here:`;
  return `
<div id="share" class="issue" style="display:block;border-left:3px solid var(--accent)">
  <b>Share it — petitions grow one neighbor at a time</b>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">
    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link + '?via=fb')}" rel="noopener" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:8px 14px;background:var(--ink);color:var(--paper);text-decoration:none">Share on Facebook</a>
    <a href="sms:?&body=${encodeURIComponent(msg + ' ' + link + '?via=text')}" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:8px 14px;border:1.5px solid var(--ink);color:var(--ink);text-decoration:none">Text it</a>
    <a href="mailto:?subject=${encodeURIComponent('Sign: ' + p.title)}&body=${encodeURIComponent(msg + ' ' + link + '?via=email')}" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:8px 14px;border:1.5px solid var(--ink);color:var(--ink);text-decoration:none">Email it</a>
    <a href="/petitions/${esc(p.id)}/flyer" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:8px 14px;border:1.5px solid var(--ink);color:var(--ink);text-decoration:none">Print a flyer</a>
  </div>
  <label class="src">Or copy the link: <input readonly value="${esc(link + '?via=fb')}" style="width:100%;max-width:520px;font-size:14px;padding:6px"></label>
</div>`;
}

function petitionPage(data, p, opts) {
  const o = opts || {};
  const { county } = data;
  const lvl = levelOf(data, o.places, p.level);
  const to = addressee(data, lvl);
  const goal = PV.levelThreshold(lvl, county);
  const towns = (o.places && o.places.places || []).map(x => x.name);
  const err = { name: 'Please add your name — like signing a paper petition.', town: 'Please add the town you live in.', junk: 'That didn’t look like a real signature.' }[o.error] || '';
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · petition</div>
  <h1 style="margin-bottom:6px">${esc(p.title)}</h1>
  <div class="src" style="font-size:15px">A petition to <b>${esc(to)}</b>, started by ${p.by ? esc(p.by) : 'a resident'} on ${esc(String(p.created_at).slice(0, 10))}.</div>
</header>
<section>
${PV.progressBar(p.support, goal, null)}
<p class="src" style="margin:4px 0 0">${p.support >= goal ? 'The goal is reached — this petition is ready to be printed and delivered.' : `At ${goal.toLocaleString('en-US')} signatures it’s printed, with the count by ${lvl.kind === 'national' || lvl.kind === 'state' ? 'county' : 'town'}, and ${lvl.kind === 'national' || lvl.kind === 'state' ? `delivered to the offices of ${esc(to)}` : `handed to ${esc(to)} at a public meeting`}.`}</p>
${sharedStrip(p)}
<h2 style="margin-top:16px">Why it matters</h2>
<p style="white-space:pre-line">${esc(p.why)}</p>
${sourcesLine(p)}
${p.reasons.length ? `<h3>What signers added</h3>${p.reasons.slice(-6).reverse().map(r => `<p class="src" style="max-width:none;border-left:2px solid var(--rule);padding-left:10px">“${esc(r)}”</p>`).join('')}` : ''}
</section>
${o.signed || o.mine ? shareBlock(data, p, goal) : ''}
<section id="sign">
${o.mine ? `<p><b>✓ You’ve signed this petition.</b> ${o.signed ? 'Thank you — now pass it on.' : ''}</p>` : `
<h2>Sign</h2>
${err ? `<p class="src" style="color:var(--dead)">${esc(err)}</p>` : ''}
<form method="post" action="/petitions/${esc(p.id)}/sign" style="display:grid;gap:8px;max-width:520px">
  <label><b>Your name</b><br><input name="name" required maxlength="60" autocomplete="name" style="width:100%;font-size:16px;padding:8px"></label>
  <label><b>Your town</b><br><input name="town" required maxlength="60" list="towns" autocomplete="address-level2" style="width:100%;font-size:16px;padding:8px"></label>
  <datalist id="towns">${towns.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
  <label>Email <span class="soft">(optional — to hear when it’s delivered and answered)</span><br><input name="email" type="email" maxlength="120" autocomplete="email" style="width:100%;font-size:16px;padding:8px"></label>
  <label>A sentence of your own <span class="soft">(optional)</span><br><input name="why" maxlength="300" style="width:100%;font-size:15px;padding:8px"></label>
  <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="deliver" value="1" style="margin-top:4px"> <span>Put my name and town on the copy handed to the officials. <span class="soft">(Leave it unchecked and you’re counted by town only.)</span></span></label>
  <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave this empty <input name="website" tabindex="-1" autocomplete="off"></label></div>
  <button type="submit" style="justify-self:start;font-family:var(--mono);font-size:16px;font-weight:600;padding:12px 22px;background:var(--ink);color:var(--paper);border:0;cursor:pointer">Sign the petition</button>
  <p class="src" style="margin:0">Your name, town and email are never shown on this site, sold or shared. The public sees only how many signed and from which towns. One signature per person.</p>
</form>`}
</section>
${!(o.signed || o.mine) ? shareBlock(data, p, goal) : ''}
<section>
<h2>Who has signed <span class="sub">— by town</span></h2>
${p.towns.length ? `<p>${p.towns.map(([t, n]) => `${esc(t)} <b>${n}</b>`).join(' · ')}</p>` : '<p>No signatures yet.</p>'}
<p class="src">Towns with fewer than 3 signers are grouped together so no one stands out.</p>
</section>
<section>
<h2>What’s happened</h2>
${PV.trailHtml(p)}
<p class="src" style="max-width:none">${esc(honest(county))} Signatures are counted, not verified — one per browser; the delivered copy removes duplicates. Like everything here, petitions can’t campaign for candidates or ballot measures, or name county staff. <a href="/petitions">All petitions</a> · <a href="/outcomes">What came of past ones</a>.</p>
</section>`;
  return layout({
    title: `Sign: ${p.title}`,
    current: '/petitions', body, county,
    description: p.support < 5
      ? `A petition to ${to}. Be one of the first ${county.name} residents to sign — at ${goal.toLocaleString('en-US')} signatures it’s delivered at a public meeting.`
      : `${p.support.toLocaleString('en-US')} ${county.name} residents have signed this petition to ${to}. Goal: ${goal.toLocaleString('en-US')}. Add your name.`
  });
}

// A printable one-page flyer: the ask, who it goes to, and a QR code to sign.
function flyerPage(data, p, qrSvg, opts) {
  const { county } = data;
  const lvl = levelOf(data, (opts || {}).places, p.level);
  const to = addressee(data, lvl), goal = PV.levelThreshold(lvl, county);
  const link = reqctx.url(`/petitions/${p.id}`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flyer — ${esc(p.title)}</title>
<style>body{font-family:Georgia,serif;color:#111;background:#fff;max-width:7.5in;margin:0 auto;padding:.5in .4in}h1{font-size:34px;line-height:1.15;margin:.1in 0}.k{font-family:ui-monospace,monospace;font-size:14px;letter-spacing:.08em;text-transform:uppercase}.qr{width:2.6in;height:2.6in}.row{display:flex;gap:.3in;align-items:center;margin-top:.25in}p{font-size:18px;line-height:1.45}.small{font-size:13px;color:#333}@media print{.noprint{display:none}}</style></head><body>
<p class="noprint small"><a href="/petitions/${esc(p.id)}">← back to the petition</a> · print with your browser (Ctrl+P or Share → Print)</p>
<div class="k">Petition · ${esc(county.name)}, ${esc(county.state)}</div>
<h1>${esc(p.title)}</h1>
<p><b>To:</b> ${esc(to)}</p>
<p>${esc(p.why.length > 420 ? p.why.slice(0, 417).replace(/\s+\S*$/, '') + '…' : p.why)}</p>
<div class="row"><div class="qr">${qrSvg}</div><div><p style="font-size:24px;margin:0"><b>Scan to sign</b></p><p class="small" style="word-break:break-all">${esc(link)}</p><p>${p.support.toLocaleString('en-US')} signed so far · goal ${goal.toLocaleString('en-US')}</p></div></div>
<p class="small" style="margin-top:.3in">When it reaches the goal it’s handed to the officials named above at a public meeting, and their answer is posted online. ${esc(honest(county))} Names are never shown publicly. County Commons — an independent, nonpartisan public-records project.</p>
</body></html>`;
}

// The host's printable copy for delivery — the only place names appear.
function packetPage(data, p, packet, opts) {
  const { county } = data;
  const lvl = levelOf(data, (opts || {}).places, p.level);
  const to = addressee(data, lvl);
  const today = new Date().toISOString().slice(0, 10);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Petition for delivery — ${esc(p.title)}</title><meta name="robots" content="noindex">
<style>body{font-family:Georgia,serif;max-width:7.5in;margin:0 auto;padding:.5in .4in;color:#111}h1{font-size:26px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ccc;padding:4px 6px;text-align:left;font-size:14px}.small{font-size:12.5px;color:#333}@media print{.noprint{display:none}}</style></head><body>
<p class="noprint small"><a href="/admin/priorities">← admin</a> · print with your browser (Ctrl+P or Share → Print)</p>
<p class="small">PETITION · ${esc(county.name)}, ${esc(county.state)} · prepared ${today}</p>
<h1>${esc(p.title)}</h1>
<p><b>To:</b> ${esc(to)}</p>
<p><b>From:</b> ${packet.total.toLocaleString('en-US')} people who signed at ${esc(reqctx.url(`/petitions/${p.id}`))}, started ${esc(String(p.created_at).slice(0, 10))}.</p>
<p style="white-space:pre-line">${esc(p.why)}</p>
<h2 style="font-size:18px">Signatures by town</h2>
<table><tbody>${packet.by_town.map(([t, n]) => `<tr><td>${esc(t)}</td><td style="text-align:right">${n}</td></tr>`).join('')}</tbody></table>
<h2 style="font-size:18px">Signers who asked to be named (${packet.names.length})</h2>
${packet.names.length ? `<table><thead><tr><th>Name</th><th>Town</th></tr></thead><tbody>${packet.names.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.town)}</td></tr>`).join('')}</tbody></table>` : '<p class="small">None asked to be named; all are counted by town above.</p>'}
<p class="small" style="margin-top:.3in">How it was counted: one signature per browser, as typed by each signer — not verified against voter rolls. ${packet.duplicates_removed} duplicate${packet.duplicates_removed === 1 ? '' : 's'} (same email, phone, or name and town) removed. Names appear only for signers who checked the box to be named. The officials’ answer will be posted at ${esc(reqctx.url('/outcomes'))}.</p>
</body></html>`;
}

// One shared ask, every county: who's open, how many signed, where.
function sharedPage(data, camp, r) {
  const { county } = data;
  const S = siteNames();
  const rows = r.copies.map(c => { if (/^us:/.test(c.tenant)) { const h = require('./national').countyByGeoid(c.tenant.slice(3)) || {}; return { c, site: { name: h.name || c.tenant, state: h.state || '' }, url: `https://countycommons.us/us/petitions/${c.id}` }; } return { c, site: S[c.tenant] || { name: c.tenant, state: '' } }; })
    .sort((a, b) => b.c.support - a.c.support || a.site.state.localeCompare(b.site.state) || a.site.name.localeCompare(b.site.name));
  const states = {}; for (const x of rows) { const st = x.site.state || '—'; states[st] = states[st] || { n: 0, sig: 0 }; states[st].n++; states[st].sig += x.c.support; }
  const title = (camp.title || '').replace(/{county}/g, 'each county').replace(/{state}/g, 'each state');
  const body = `
<header class="page">
  <div class="eyebrow">County Commons · a shared petition</div>
  <h1>${esc(title)}</h1>
  <div class="src">The same ask, open in <b>${rows.length}</b> counties in <b>${Object.keys(states).length}</b> states — <b>${r.total.toLocaleString('en-US')}</b> signature${r.total === 1 ? '' : 's'} in all. Each county's petition goes to that county's own officials and counts toward its own goal. Started by ${esc(camp.by || 'County Commons')}.</div>
</header>
<section>
<h2>By state</h2>
<p>${Object.entries(states).sort((a, b) => b[1].sig - a[1].sig || a[0].localeCompare(b[0])).map(([st, x]) => `${esc(st)}: ${x.n} count${x.n === 1 ? 'y' : 'ies'}, <b>${x.sig}</b> signed`).join(' · ')}</p>
</section>
<section>
<h2>Every county</h2>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>County</th><th class="num">Signed</th><th>Goes to</th></tr></thead><tbody>
${rows.slice(0, 200).map(x => `<tr><td><a href="${x.url || siteUrl(x.c.tenant, x.c.id)}">${esc(x.site.name)}, ${esc(x.site.state)}</a></td><td class="num">${x.c.support}</td><td class="src">${esc(x.c.phase === 'raised' ? 'not yet delivered' : x.c.phase)}</td></tr>`).join('')}
</tbody></table></div>
${rows.length > 200 ? `<p class="src">Showing the 200 with the most signatures; ${(rows.length - 200).toLocaleString('en-US')} more counties have this petition open — find yours from <a href="https://countycommons.us/us">its county page</a>.</p>` : ''}
<p class="src">${esc(honest(county))} Signatures are counted, not verified — one per browser. <a href="/petitions">Petitions in ${esc(county.name)}</a>.</p>
</section>`;
  return layout({ title: `Shared petition: ${title} · County Commons`, current: '/petitions', body, county,
    description: `The same petition open in ${rows.length} counties in ${Object.keys(states).length} states, ${r.total} signatures so far: ${title}.` });
}

// Under a county's board: the statewide and national petitions it can also sign.
function widerStrip(data, stateItems, nationalItems) {
  const { county } = data;
  const li = (p) => `<li><a href="/petitions/${esc(p.id)}">${esc(p.title)}</a> <span class="soft" style="font-size:12.5px">· ${p.support} signed</span></li>`;
  if (!stateItems.length && !nationalItems.length) return '';
  return `<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  ${stateItems.length ? `<b>All of ${esc(county.state)}</b> <span class="soft" style="font-size:12.5px">— to ${esc(county.state)} lawmakers; every county in the state signs the same one</span><ul style="margin:4px 0 8px">${stateItems.map(li).join('')}</ul>` : ''}
  ${nationalItems.length ? `<b>Nationwide</b> <span class="soft" style="font-size:12.5px">— to Congress; every county signs the same one</span><ul style="margin:4px 0 0">${nationalItems.map(li).join('')}</ul>` : ''}
</div>`;
}

module.exports = { sourcesLine, placeName, sharedPage, widerStrip, listPage, petitionPage, flyerPage, packetPage, addressee, levelOf, honest };
