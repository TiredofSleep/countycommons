// Common ground: a few county asks that people across the spectrum can sign —
// clean water, an open checkbook, grants shown start to finish, and conditions
// before any data center is approved. The site doesn't claim everyone agrees;
// the signatures, counted by county, show how many do. Each ask is a petition
// started by the founder (config/campaigns.json, `common`), opened in a county
// on its first signature through the ask routes.
const { esc } = require('./corpus');

const THEMES = [
  { key: 'water', name: 'Clean water', camp: 'clean-water-online' },
  { key: 'transparency', name: 'Every dollar in the open', camp: 'open-checkbook' },
  { key: 'grants', name: 'Grants, start to finish', camp: 'grants-online' },
  { key: 'data-centers', name: 'Data centers: the facts before the vote', camp: 'data-center-conditions' }
];

const num = (n) => Math.round(n).toLocaleString('en-US');
const big = (n) => n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + ' billion' : n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + ' million' : '$' + num(n);

// One plain fact for this county, from data already on its page.
function fact(key, c) {
  if (key === 'water') return c.water && c.water.systems ? `${num(c.water.systems)} community water system${c.water.systems === 1 ? '' : 's'} serve ${esc(c.name)}, reporting ${num(c.water.pop_served)} people served (U.S. EPA).` : '';
  if (key === 'transparency') { try { const it = require('./transparency').get(c).items.payments; return it ? `Every payment online: ${{ yes: 'yes', partly: 'partly', no: 'not yet' }[it.v]}, from the transparency meter.` : 'Whether every payment is online hasn’t been checked yet.'; } catch (e) { return ''; } }
  if (key === 'grants') return c.fedgrants ? `Federal grants paid for ${big(c.fedgrants.amount)} of work in ${esc(c.name)} in fiscal ${c.fedgrants.fy} (USAspending.gov).` : '';
  if (key === 'data-centers') return 'U.S. data centers used about 4.4% of the country’s electricity in 2023, and may use 6.7% to 12% by 2028 (U.S. Department of Energy).';
  return '';
}

function camps() { const A = require('./asks'); return THEMES.map(t => Object.assign({}, t, { c: A.byId(t.camp) })).filter(t => t.c); }

// On a county page: one form signs all four, then each ask with this county's
// fact, its examples, and where its petition stands (as the next milestone).
function block(c, opts) {
  const o = opts || {};
  const A = require('./asks'); if (!A.deliverable(c)) return '';
  const M = require('./milestone'); const P = require('../priorities');
  const base = `/us/${c.st.toLowerCase()}/${c.slug}`;
  const abs = o.abs ? 'https://countycommons.us' : '';
  const sn = require('../views/national').stateName(c.st);
  const rows = camps().map(t => {
    const p = A.existing(c, t.camp);
    const title = t.c.title.replace(/\{county\}/g, c.name);
    const n = p ? P.getPublic(p.id).support : 0;
    const goal = (p && p.goal) || A.draft(c, t.c, sn).goal || 100;
    return `<div class="issue" style="display:block"><div class="eyebrow" style="margin:0 0 2px">${esc(t.name)}</div><a href="${abs}${base}/ask/${esc(t.camp)}" style="color:inherit;text-decoration:none"><b>${esc(title)}</b></a>${fact(t.key, c) ? `<p class="src" style="margin:4px 0 0;max-width:none">${fact(t.key, c)}</p>` : ''}${(t.c.best || []).length ? `<p class="src" style="margin:4px 0 0;max-width:none">Already done in ${esc(t.c.best.slice(0, 3).map(b => b.name).join('; '))}${t.c.best.length > 3 ? ' and more' : ''}.</p>` : ''}<p style="margin:6px 0 0"><a href="${abs}${base}/ask/${esc(t.camp)}" style="font-weight:600">Read it or sign just this one →</a> <span class="soft" style="font-size:13px">${esc(M.phrase(n, goal))}</span></p></div>`;
  }).join('');
  const f = 'font-size:16px;padding:8px;width:100%;box-sizing:border-box';
  const err = { name: 'Please add your name — like signing a paper petition.', town: 'Please add your town.', junk: 'That didn’t look like a real signature.' }[o.cg] || '';
  const link = `https://countycommons.us${base}#common-ground`;
  const btn = 'font-family:var(--mono);font-size:14px;font-weight:600;padding:8px 14px;border:1.5px solid var(--ink);color:var(--ink);text-decoration:none';
  const form = o.cg === 'signed'
    ? `<div class="issue" style="display:block;border-left:3px solid var(--sourced)"><b>✓ Thank you. You signed all four for ${esc(c.name)}.</b> <span class="src">Each is counted here and delivered at its goal. The fastest way to reach it: send this to a few neighbors.</span>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link.replace('#', '?via=fb#'))}" rel="noopener" style="${btn};background:var(--ink);color:var(--paper)">Share on Facebook</a><a href="sms:?&body=${encodeURIComponent('Four things most of us in ' + c.name + ' can agree on. Takes a minute: ' + link.replace('#', '?via=text#'))}" style="${btn}">Text it</a><a href="${abs}${base}/post" style="${btn}">Get the image to post</a></div></div>`
    : `<form method="post" action="${abs}${base}/common-ground/sign" style="display:grid;gap:8px;max-width:520px;border:2px solid var(--ink);background:var(--card);padding:14px 16px">
  <b style="font-size:18px">Sign all four for ${esc(c.name)}</b>
  ${err ? `<p class="src" style="color:var(--dead);margin:0">${esc(err)}</p>` : ''}
  <label><b>Your name</b><input name="name" required maxlength="60" autocomplete="name" style="${f}"></label>
  <label><b>Your town</b> <span class="soft">(in ${esc(c.name)})</span><input name="town" required maxlength="60" autocomplete="address-level2" style="${f}"></label>
  <label>Email <span class="soft">(optional — to hear when they’re delivered and answered)</span><input name="email" type="email" maxlength="120" style="${f}"></label>
  <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="deliver" value="1" style="margin-top:4px"> <span>Put my name and town on the copies delivered to officials. <span class="soft">(Unchecked: counted by town only.)</span></span></label>
  <div style="position:absolute;left:-9999px" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
  <button type="submit" style="justify-self:start;font-family:var(--mono);font-size:16px;font-weight:600;padding:12px 22px;background:var(--ink);color:var(--paper);border:0">Sign all four</button>
  <p class="src" style="margin:0">Your name, town and email are never shown, sold or shared. Or sign just the ones you want, below.</p>
</form>`;
  return `
<section id="common-ground">
<h2>Common ground <span class="sub">— asks people of every party can sign</span></h2>
<p class="src" style="max-width:none">Four petitions to ${esc(A.addressee(c))}: clean water, every dollar in the open, grants shown start to finish, and the facts before any data center vote. Each is counted in ${esc(c.name)} and delivered at its goal, with the answer posted. <a href="${abs}/us/common-ground">Across the country →</a></p>
${form}
${rows}
</section>`;
}

// The national page: pick your county first (it goes straight to the one-form
// sign-up on its page), then each ask with its signatures across the country.
function page(nv) {
  const P = require('../priorities'); const C = require('../lib/asks').campaigns();
  const N = nv.stateList();
  const f = 'font-size:16px;padding:8px;box-sizing:border-box';
  const gen = (t) => String(t).replace(/\{county\}’s/g, 'your county’s').replace(/\{county\}/g, 'your county');
  let all = 0, places = new Set();
  const sections = camps().map(t => {
    const r = P.campaignRollup(t.camp); all += r.total; for (const x of r.copies) if (x.support > 0) places.add(x.tenant);
    const signed = r.copies.filter(x => x.support > 0).length;
    return `<section class="cg"><div class="eyebrow">${esc(t.name)}</div><h2 style="font-family:var(--sans);text-transform:none;letter-spacing:0;font-size:clamp(19px,3.6vw,23px);line-height:1.25;margin:4px 0 6px">${esc(gen(t.c.title))}</h2>
<p>${esc(gen(t.c.why))}</p>${require('../views/petitions').sourcesLine({ src: t.c.src, campaign: t.camp })}
<p>${r.total ? `<b>${num(r.total)}</b> signature${r.total === 1 ? '' : 's'} in <b>${num(signed)}</b> count${signed === 1 ? 'y' : 'ies'} so far. <a href="/us/petitions/shared/${esc(t.camp)}">By county →</a>` : '<b>Be one of the first to sign.</b>'} <a href="#pick">Sign for your county ↑</a></p></section>`;
  }).join('');
  const body = `<style>.cg{margin:28px 0 0;padding-top:16px;border-top:2px solid var(--ink)}</style>
<header class="page"><div class="eyebrow">County Commons · common ground</div>
<h1>What we can agree on, county by county</h1>
<div class="src" style="font-size:15.5px">Four asks people of every party can sign: clean water, every dollar in the open, grants shown start to finish, and the facts before any data center vote. Each one is a petition to your own county’s governing body, counted in your county and delivered at its goal, with the answer posted.${all ? ` <b>${num(all)}</b> signatures so far, in <b>${num(places.size)}</b> count${places.size === 1 ? 'y' : 'ies'}.` : ''} Started by ${esc(C.started_by)}.</div></header>
<section id="pick"><form method="get" action="/us/go" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;border:2px solid var(--ink);background:var(--card);padding:14px 16px">
<input type="hidden" name="to" value="cg">
<label style="display:grid;gap:3px"><b style="font-size:16px">Sign all four for your county</b><select name="st" required style="${f}"><option value="">State…</option>${N.map(s => `<option value="${esc(s.st.toLowerCase())}">${esc(s.name)}</option>`).join('')}</select></label>
<input name="county" required maxlength="60" placeholder="County, like “Pulaski”" aria-label="County" style="${f};min-width:180px">
<button type="submit" style="font-family:var(--mono);font-size:15px;font-weight:600;padding:9px 16px;background:var(--ink);color:var(--paper);border:0">Go</button></form>
<p class="src" style="max-width:none">It opens your county’s page, where one short form signs all four.</p></section>
${sections}
<section class="cg"><p class="src" style="max-width:none">Signatures are counted, not verified: one per browser, names never shown. County Commons doesn’t take sides on candidates or ballot measures. <a href="/us/ask">More asks for your county →</a> · <a href="/us/petitions">Every petition →</a></p></section>`;
  return nv.page({ title: 'Common ground: clean water, open budgets, grants and data centers — petitions for every county · County Commons', description: 'Four county petitions people of every party can sign: clean water, every payment online, every grant shown, and the facts before any data center vote. Counted county by county.', canonical: 'https://countycommons.us/us/common-ground', body });
}

// On a full county site's home page: the same asks, linking to the network's
// ask routes, which open the petition on this site at its first signature.
function blockForSite(tenantKey) {
  try {
    const t = (require('./tenant').registry().tenants || {})[tenantKey]; if (!t) return '';
    const c = require('../views/national').countyBySite(t.host); if (!c) return '';
    return block(c, { abs: true });
  } catch (e) { return ''; }
}


// A social media post (1080×1350, the feed's 4:5 shape) of a county's common
// ground asks, with its own facts and one QR code. Rendered as a page so any
// county works; pipeline/post-image.js turns it into a PNG with headless Edge.
function postPage(c, stateName, qrSvg, link) {
  const A = require('./asks');
  const short = {
    water: 'Post every water system’s test results and violations online, with the plan to fix each one.',
    transparency: 'Post every county payment online, every month: who was paid, how much, and for what.',
    grants: 'Post every grant the county applies for, wins and spends, and what it got done.',
    'data-centers': 'Before any data center is approved: a public hearing, its water and power use posted, any tax deal posted, and a binding limit on water use.'
  };
  const rows = camps().map(t => `<div class="row"><div class="k">${esc(t.name)}</div><div class="a">${esc(short[t.key])}</div>${fact(t.key, c) ? `<div class="f">${fact(t.key, c)}</div>` : ''}</div>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Common ground post — ${esc(c.name)}</title><meta name="robots" content="noindex">
<style>
*{box-sizing:border-box}html,body{margin:0;background:#F2F5EE}
.post{width:1080px;height:1350px;background:#F2F5EE;color:#1E2A32;font-family:'Segoe UI',system-ui,-apple-system,Roboto,sans-serif;display:flex;flex-direction:column;border:14px solid #1E2A32}
.top{background:#1E2A32;color:#F2F5EE;padding:40px 56px 36px}
.eb{font-family:Consolas,ui-monospace,monospace;font-size:24px;letter-spacing:.12em;text-transform:uppercase;opacity:.85}
h1{font-size:76px;line-height:1.02;margin:14px 0 12px;font-weight:700;letter-spacing:-.01em}
.sub{font-size:28px;line-height:1.3;opacity:.92;margin:0}
.rows{padding:14px 56px 0;flex:1;overflow:hidden}
.row{padding:15px 0 14px;border-bottom:2px solid #C9D6C4}.row:last-child{border-bottom:0}
.k{font-family:Consolas,ui-monospace,monospace;font-size:21px;letter-spacing:.1em;text-transform:uppercase;color:#23557A;font-weight:700}
.a{font-size:31px;line-height:1.25;font-weight:600;margin:6px 0 6px}
.f{font-size:21px;line-height:1.3;color:#4A5B64}
.foot{display:flex;gap:30px;align-items:center;background:#FAFBF7;border-top:4px solid #1E2A32;padding:24px 56px;flex:none}
.qr{width:200px;height:200px;flex:none}.qr svg{width:100%;height:100%}
.cta{font-size:38px;font-weight:700;line-height:1.1}.url{font-family:Consolas,ui-monospace,monospace;font-size:24px;margin:10px 0 8px;color:#23557A;font-weight:700}
.fine{font-size:17px;line-height:1.35;color:#4A5B64}
@media screen and (max-width:1100px){body{zoom:.5}}
</style></head><body><div class="post">
<div class="top"><div class="eb">${esc(c.name)}, ${esc(stateName)} · Common ground</div>
<h1>What we can agree on</h1>
<p class="sub">Four petitions to ${esc(A.addressee(c).replace(/^the /, 'the '))}. Counted here, delivered at the goal, the answer posted.</p></div>
<div class="rows">${rows}</div>
<div class="foot"><div class="qr">${qrSvg}</div><div><div class="cta">Add your voice. It takes a minute.</div><div class="url">${esc(link.replace(/^https:\/\//, ''))}</div><div class="fine">Petitions started by Brayden Sanders, founder of County Commons, an independent, nonpartisan public-records project. Not a government website. Names are never shown.</div></div></div>
</div></body></html>`;
}

module.exports = { THEMES, block, blockForSite, page, postPage, fact };
