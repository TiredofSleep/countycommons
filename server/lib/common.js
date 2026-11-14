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

// On a county page: the four asks, this county's fact, and where its petition stands.
function block(c) {
  const A = require('./asks'); if (!A.deliverable(c)) return '';
  const base = `/us/${c.st.toLowerCase()}/${c.slug}`;
  const rows = camps().map(t => {
    const p = A.existing(c, t.camp);
    const title = t.c.title.replace(/\{county\}/g, c.name);
    const n = p ? require('../priorities').getPublic(p.id).support : 0; const count = n ? `${num(n)} signed here` : 'Be the first to sign here';
    return `<div class="issue" style="display:block"><div class="eyebrow" style="margin:0 0 2px">${esc(t.name)}</div><a href="${base}/ask/${esc(t.camp)}" style="color:inherit;text-decoration:none"><b>${esc(title)}</b></a>${fact(t.key, c) ? `<p class="src" style="margin:4px 0 0;max-width:none">${fact(t.key, c)}</p>` : ''}<p style="margin:6px 0 0"><a href="${base}/ask/${esc(t.camp)}" style="font-weight:600">Sign →</a> <span class="soft" style="font-size:13px">${count}</span></p></div>`;
  }).join('');
  return `
<section id="common-ground">
<h2>Common ground <span class="sub">— asks people of every party can sign</span></h2>
<p class="src" style="max-width:none">Four petitions to ${esc(A.addressee(c))}. Each is counted in ${esc(c.name)} and delivered at its goal, with the answer posted. Signatures are counted, not verified, and names are never shown. <a href="/us/common-ground">How many have signed across the country →</a></p>
${rows}
</section>`;
}

// The national page: each ask, its signatures across the country, and a way in.
function page(nv) {
  const P = require('../priorities'); const C = require('../lib/asks').campaigns();
  const N = nv.stateList();
  const f = 'font-size:16px;padding:8px;box-sizing:border-box';
  const gen = (t) => String(t).replace(/\{county\}’s/g, 'your county’s').replace(/\{county\}/g, 'your county');
  let all = 0, places = new Set();
  const sections = camps().map(t => {
    const r = P.campaignRollup(t.camp); all += r.total; for (const x of r.copies) if (x.support > 0) places.add(x.tenant);
    const signed = r.copies.filter(x => x.support > 0).length;
    return `<section class="cg"><div class="eyebrow">${esc(t.name)}</div><h2 style="font-size:clamp(20px,3.6vw,25px);line-height:1.2;margin:4px 0 6px">${esc(gen(t.c.title))}</h2>
<p>${esc(gen(t.c.why))}</p>${require('../views/petitions').sourcesLine({ src: t.c.src })}
<p><b>${num(r.total)}</b> signature${r.total === 1 ? '' : 's'} in <b>${num(signed)}</b> count${signed === 1 ? 'y' : 'ies'} so far.${signed ? ` <a href="/us/petitions/shared/${esc(t.camp)}">By county →</a>` : ''}</p>
<form method="get" action="/us/ask/${esc(t.camp)}" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">
<label style="display:grid;gap:3px"><b style="font-size:14px">Sign for your county</b><select name="st" required style="${f}"><option value="">State…</option>${N.map(s => `<option value="${esc(s.st)}">${esc(s.name)}</option>`).join('')}</select></label>
<input name="county" required maxlength="60" placeholder="County, like “Pulaski”" aria-label="County" style="${f};min-width:180px">
<button type="submit" style="font-family:var(--mono);font-size:15px;font-weight:600;padding:9px 16px;background:var(--ink);color:var(--paper);border:0">Go</button></form></section>`;
  }).join('');
  const body = `<style>.cg{margin:28px 0 0;padding-top:16px;border-top:2px solid var(--ink)}</style>
<header class="page"><div class="eyebrow">County Commons · common ground</div>
<h1>What we can agree on, county by county</h1>
<div class="src" style="font-size:15.5px">Four asks people of every party can sign: clean water, every dollar in the open, grants shown start to finish, and the facts before any data center vote. Each one is a petition to your own county’s governing body, counted in your county and delivered at its goal, with the answer posted. The signatures show how much common ground there is: <b>${num(all)}</b> so far, in <b>${num(places.size)}</b> count${places.size === 1 ? 'y' : 'ies'}. Started by ${esc(C.started_by)}.</div></header>
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
    return block(c).replace(/href="\/us\//g, 'href="https://countycommons.us/us/');
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
