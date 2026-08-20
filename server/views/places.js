const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');

// The municipalities index + per-city budget pages. Where county government was
// abolished (Middlesex, MA), this is where the money that actually governs
// people lives. Same rules as the county money trail: every figure cited.

const cap = v => '$' + Math.round(v).toLocaleString('en-US');
const pctOf = (part, whole) => whole ? Math.round((part / whole) * 1000) / 10 : 0;

function placesPage(data, index) {
  const { county } = data;
  const places = (index.places || []).slice().sort((a, b) => (b.pop || 0) - (a.pop || 0));
  const ingested = places.filter(p => p.ingested);

  const row = (p) => `
<tr>
  <td>${p.ingested ? `<a href="/places/${esc(p.slug)}"><b>${esc(p.name)}</b></a> <span class="chip c-ok">✓ walk it here</span>` : `<b>${esc(p.name)}</b>`}</td>
  <td class="src">${esc(p.kind)}</td>
  <td class="num">${(p.pop || 0).toLocaleString('en-US')}</td>
  <td class="src">${p.budget_url ? `<a href="${esc(p.budget_url)}" rel="noopener">its budget →</a>` : (p.website ? `<a href="${esc(p.website)}" rel="noopener">official site</a>` : '')}</td>
</tr>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · where the money really is</div>
  <h1>The cities and towns of Middlesex</h1>
  <div class="src">${esc(index.note || '')}</div>
</header>

${ingested.length ? `<section>
<h2>Walk a budget here <span class="sub">— ingested and cross-footed</span></h2>
${ingested.map(p => `<a class="issue" style="display:block;text-decoration:none;border-left:3px solid var(--accent)" href="/places/${esc(p.slug)}"><b style="font-size:16px">${esc(p.name)}</b> <span class="src">· ${esc(p.kind)} · ${(p.pop || 0).toLocaleString('en-US')} residents · walk the budget →</span></a>`).join('')}
</section>` : ''}

<section>
<h2>Every municipality <span class="sub">— ${places.length} of ${index.total_municipalities || places.length} listed</span></h2>
<table class="plain">
<thead><tr><th>Place</th><th>Type</th><th class="num">Residents (2020)</th><th>Budget</th></tr></thead>
<tbody>${places.map(row).join('')}</tbody>
</table>
<p class="src">Populations are the 2020 U.S. Census. More cities and towns — and more ingested budgets — are being added. Want yours walked next? <a href="/priorities">Say so on the priorities board</a>.</p>
</section>`;

  return layout({
    title: `Cities & towns — ${county.platform_name}`, current: '/places', body, county,
    description: `The cities and towns of ${county.name}, ${county.state} — where the real budgets live. Populations sourced, budgets linked, some walkable line-by-line.`
  });
}

function cityBudgetPage(data, city) {
  const { county } = data;
  const m = city.meta;
  const depts = (city.departments || []).slice().sort((a, b) => b.amount - a.amount);
  const gf = m.general_fund || depts.reduce((a, d) => a + d.amount, 0);
  const max = depts.reduce((a, d) => Math.max(a, d.amount), 1);
  const check = depts.reduce((a, d) => a + d.amount, 0);
  const foots = Math.round(check) === Math.round(gf);

  const bar = (d) => `
<div class="issue" style="display:block">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline">
    <b>${esc(d.name)}</b>
    <span style="white-space:nowrap"><a class="amt" href="${esc(m.source.url)}" rel="noopener" title="${esc(m.source.title)}${m.source.page ? ', ' + m.source.page : ''}">${cap(d.amount)}</a> <span class="src">· ${pctOf(d.amount, gf)}%</span></span>
  </div>
  ${d.what ? `<p class="src" style="margin:4px 0 6px">${esc(d.what)}</p>` : ''}
  <div style="background:var(--rule);border-radius:2px;height:9px;overflow:hidden"><div style="width:${pctOf(d.amount, max).toFixed(1)}%;height:100%;background:var(--accent)"></div></div>
</div>`;

  const fact = (f) => `<li style="margin:5px 0">${esc(f)}</li>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(m.city)}, ${esc(county.state)} · ${esc(m.fiscal_year)} adopted budget${m.kind ? ' · ' + esc(m.kind) : ''}</div>
  <h1>${esc(m.city)} — the money trail</h1>
  <div class="total"><a class="amt" href="${esc(m.source.url)}" rel="noopener">${cap(gf)}</a></div>
  <div class="src">${esc(m.note || '')} Click any number to open the source. ${foots ? '<b>The departments add up to the General Fund total exactly.</b>' : ''}</div>
  <div class="crumb" style="margin-top:8px"><a href="/places">← all Middlesex cities & towns</a> · <a href="/budget">the county page</a></div>
</header>

<div class="bar" style="gap:14px;flex-wrap:wrap">
  <span class="src">General Fund <b>${cap(m.general_fund)}</b></span>
  ${m.water_fund ? `<span class="src">· Water (enterprise) ${cap(m.water_fund)}</span>` : ''}
  ${m.capital ? `<span class="src">· Capital ${cap(m.capital)}</span>` : ''}
  ${m.population ? `<span class="src">· ${m.population.toLocaleString('en-US')} residents (2020)</span>` : ''}
</div>

<section>
<h2>Where the General Fund goes <span class="sub">— ${esc(m.fiscal_year)}, by department</span></h2>
${depts.map(bar).join('')}
</section>

${(m.facts && m.facts.length) ? `<section>
<h2>Worth knowing</h2>
<ul style="max-width:70ch;padding-left:22px">${m.facts.map(fact).join('')}</ul>
</section>` : ''}

<section>
<h2>Where these numbers come from</h2>
<p class="src">Every figure is from the <a href="${esc(m.source.url)}" rel="noopener">${esc(m.source.title)}</a>${m.source.page ? ` (${esc(m.source.page)})` : ''}${m.adopted ? `, adopted ${esc(m.adopted)}` : ''}. ${m.source.portal ? `${esc(m.city)} also runs an <a href="${esc(m.source.portal)}" rel="noopener">interactive open-budget portal</a>. ` : ''}This is ${esc(m.city)}'s own budget — set by ${esc(m.governing_body || 'the city')}, not by the county (which no longer governs). The "Other" line is the General Fund total minus the departments shown, so the tree still adds up to the dollar.</p>
</section>`;

  return layout({
    title: `${m.city} budget — ${county.platform_name}`, current: '/places', body, county,
    description: `${m.city}, ${county.state}'s ${m.fiscal_year} adopted budget, department by department — every figure sourced to the adopted budget book.`
  });
}

module.exports = { placesPage, cityBudgetPage };
