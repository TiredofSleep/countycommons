// The tour: a walk through one real county's page, stop by stop. Each stop
// shows the actual section from that county's page right now (cut from the
// rendered page, so the tour never goes stale), with a plain explanation and
// a link to the full thing. Clark County, Arkansas by default; anyone can
// switch to their own county.
const { esc } = require('../lib/corpus');

// Cut one <section id="..."> out of a rendered page; strip ids so they don't clash.
function cut(html, id) {
  const a = html.indexOf(`<section id="${id}"`); if (a < 0) return '';
  const b = html.indexOf('</section>', a); if (b < 0) return '';
  return html.slice(a, b + 10).replace(/\sid="[^"]*"/g, '').replace(/<details(?![^>]*open)/, '<details open');
}

function tourPage(c, stateName) {
  const nv = require('./national');
  const st = c.st.toLowerCase(), base = `/us/${st}/${c.slug}`;
  const full = nv.countyPage(c.st, c.slug) || '';
  const N = nv.stateList();
  const f = 'font-size:16px;padding:8px;box-sizing:border-box';
  const screen = (id, open, label) => { const h = cut(full, id); return h ? `<div class="tour-screen" aria-label="${esc(label)}">${h}</div><p class="tour-open"><a href="${open}">${esc(label)} →</a></p>` : `<p class="tour-open"><a href="${open}">${esc(label)} →</a></p>`; };
  const stop = (n, title, lead, inner) => `<section class="tour-stop"><div class="eyebrow">Stop ${n}</div><h2>${title}</h2><p class="tour-lead">${lead}</p>${inner}</section>`;
  const site = c.site ? (require('../lib/directory').byState().flatMap(g => g.places).find(p => p.name === c.name) || null) : null;
  const body = `
<style>
.tour-stop{margin:34px 0 0;padding-top:18px;border-top:2px solid var(--ink)}
.tour-stop h2{font-size:clamp(21px,4vw,27px);line-height:1.15;margin:4px 0 6px}
.tour-lead{font-size:16.5px;max-width:62ch;margin:0 0 12px}
.tour-screen{border:1.5px solid var(--ink);background:var(--paper);padding:2px 14px 0;max-height:360px;overflow:hidden;position:relative;box-shadow:4px 4px 0 var(--rule)}
.tour-screen::after{content:"";position:absolute;left:0;right:0;bottom:0;height:70px;background:linear-gradient(transparent,var(--paper));pointer-events:none}
.tour-screen section{margin:0}
.tour-open{margin:8px 0 0;font-weight:600}
</style>
<header class="page"><div class="eyebrow">County Commons · the tour</div>
<h1>How to use County Commons, shown on ${esc(c.name)}, ${esc(stateName)}</h1>
<div class="src" style="font-size:15.5px">Seven stops. Each box below is the real section from ${esc(c.name)}’s page, as it is right now. Open any stop to see all of it.</div>
<form method="get" action="/us/tour" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:14px 0 0">
  <label style="display:grid;gap:3px"><b style="font-size:14px">Tour your county instead</b><select name="st" required style="${f}"><option value="">State…</option>${N.map(s => `<option value="${esc(s.st.toLowerCase())}"${s.st === c.st ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
  <input name="county" required maxlength="60" placeholder="County, like “Pulaski”" aria-label="County" style="${f};min-width:180px">
  <button type="submit" style="font-family:var(--mono);font-size:15px;font-weight:600;padding:9px 16px;background:var(--ink);color:var(--paper);border:0">Go</button>
</form>
</header>
${stop(1, 'Every county has a page', `All ${nv.countyCount().toLocaleString('en-US')} U.S. counties have one, at an address you can share: <a href="${base}">countycommons.us${base}</a>. It starts with a list of everything on the page, so you can jump straight to what you came for.`,
  `<div class="tour-screen" aria-label="${esc(c.name)}’s page">${(full.match(/<nav aria-label="On this page"[\s\S]*?<\/nav>/) || [''])[0]}</div><p class="tour-open"><a href="${base}">Open ${esc(c.name)}’s page →</a></p>`)}
${stop(2, 'Follow the money', `What the county government takes in and spends, from the state’s or county’s own records, with a link to each source. ${site ? `${esc(c.name)} also has a full site that traces the budget line by line: <a href="https://${esc(site.host)}/budget">the money trail</a>.` : 'Where we have the county’s budget book, every line is listed with the page it came from.'}`,
  screen('county-money', base + '#county-money', 'The county government’s money'))}
${stop(3, 'Check what the county puts online', 'The transparency meter is 30 facts, from “is the budget online?” to “can you see the receipt behind each payment?” Each one links to where we looked. “Not checked yet” never counts against a county.',
  screen('transparency', base + '#transparency', 'The full transparency meter'))}
${stop(4, 'Ask for what’s missing', `Each box that isn’t met yet is a petition asking ${esc(c.name)} to post it. Sign it, share it, and at the goal it’s delivered to the county’s officials, with the answer posted. In ${require('../lib/requests').law(c.st) ? esc(stateName) : 'some states'}, you can also print one precise public records request, filed once for everyone.`,
  screen('petitions', base + '#petitions', 'Petitions you can sign'))}
${stop(5, 'See how it compares', 'Each budget line beside counties of the same size, the rest of the state, the nation and the neighbors, so a number has something to be measured against.',
  screen('ranks', base + '/compare', 'Every line, compared'))}
${stop(6, 'Water, the jail, and how to vote', 'The same page covers the basics every county shares: drinking water violations, the jail’s population and costs, schools, health, disaster risk, and when and where to vote.',
  screen('voting', base + '#voting', 'Voting in ' + c.name))}
${stop(7, 'Help keep it honest', 'Every page has a box to correct something, add a missing record or send a document. A person reads every note, and fixes are logged in public. That’s how pages get deeper.',
  `<p class="tour-open"><a href="/us/feedback?from=${encodeURIComponent(base)}">Correct or add something →</a> · <a href="/us/building">What readers helped fix →</a></p>`)}
<section class="tour-stop"><h2>That’s the tour</h2><p class="tour-lead">Start with <a href="${base}">${esc(c.name)}’s page</a>, <a href="/">find another county</a>, or see <a href="/us/transparency">who meets each transparency bar</a>.</p></section>`;
  return nv.page({ title: `Tour: how to use County Commons, shown on ${c.name}, ${stateName}`, description: `A seven-stop walk through a real county page: the money, the transparency meter, petitions and records requests, comparisons, water, the jail and voting.`, canonical: `https://countycommons.us/us/tour${c.st === 'AR' && c.slug === 'clark' ? '' : `?st=${st}&county=${encodeURIComponent(c.slug)}`}`, body });
}

module.exports = { tourPage };
