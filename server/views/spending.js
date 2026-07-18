const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');

// Per-resident spending comparison + the outlier list. Ballpark by design,
// caveats first, every outlier linked to its line and its docket number.

function perRes(amount, pop) {
  if (amount === null) return '—';
  return '$' + Math.round(amount / pop).toLocaleString('en-US');
}

function spendingPage(data) {
  const { county, spending, docket } = data;
  const P = spending.populations;

  const headRows = spending.headline_rows.map(r => `
<tr>
  <td><b>${esc(r.label)}</b></td>
  <td class="num">${r.clark !== null ? money(r.clark) : '—'}<br><span class="pct">${perRes(r.clark, P.clark)}/res</span></td>
  <td class="num">${r.garland !== null ? money(r.garland) : '—'}<br><span class="pct">${perRes(r.garland, P.garland)}/res</span></td>
  <td class="num">${r.ouachita !== null ? money(r.ouachita) : '—'}<br><span class="pct">${r.ouachita !== null ? perRes(r.ouachita, P.ouachita) + '/res' : 'not comparable'}</span></td>
</tr>
<tr><td colspan="4" class="soft" style="font-size:12px;color:var(--ink-soft);border-bottom:1px solid var(--rule)">${esc(r.note)}</td></tr>`).join('');

  const twinRows = spending.twin_rows.map(r => `
<tr>
  <td>${esc(r.label)}${r.flag ? ' <span class="chip c-part">◐ outlier</span>' : ''}</td>
  <td class="num">${money(r.clark)}</td>
  <td class="num">${money(r.ouachita)}</td>
  <td class="num">${r.clark > r.ouachita ? '+' : ''}${money(r.clark - r.ouachita).replace('$-', '−$')}</td>
</tr>`).join('');

  const outliers = spending.outliers.map(o => {
    const issue = docket.issues.find(i => i.num === o.docket);
    return `
<div class="issue" style="display:block">
  <b>${esc(o.title)}</b>
  <p style="font-size:13px;margin:6px 0 2px">${esc(o.body)}</p>
  <p class="src"><a href="${esc(o.link)}">See the line</a>${issue ? ` · <a href="/docket#i${o.docket}">Docket #${o.docket} — ${esc(issue.title)}</a>` : ''}</p>
</div>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · spending, beside the neighbors</div>
  <h1>Where the money stands out</h1>
  <div class="src">${esc(spending.intro)}</div>
</header>

<section>
<h2>Per resident, beside the neighbors <span class="sub">— from each county's own 2026 filing</span></h2>
<div class="tblwrap" style="overflow-x:auto">
<table class="plain">
<thead><tr><th></th><th>Clark (~${P.clark.toLocaleString()})</th><th>Garland (~${P.garland.toLocaleString()})</th><th>Ouachita (~${P.ouachita.toLocaleString()})</th></tr></thead>
<tbody>${headRows}</tbody>
</table></div>
</section>

<section>
<h2>Office by office against the twin <span class="sub">— Ouachita County, nearly the same size</span></h2>
<p class="src">${esc(spending.twin_note)}</p>
<table class="plain">
<thead><tr><th>Office</th><th>Clark 2026</th><th>Ouachita 2026 request</th><th>Difference</th></tr></thead>
<tbody>${twinRows}</tbody>
</table>
</section>

<section>
<h2>The categories that need further insight <span class="sub">— each one is a question with a document that answers it</span></h2>
${outliers}
</section>

<section>
<h2>The honest arithmetic <span class="sub">— what this does and doesn't show</span></h2>
<p>${esc(spending.summary)}</p>
</section>`;

  return layout({
    title: `Where the money stands out — ${county.platform_name}`, current: null, body, county,
    description: "Clark County's spending per resident beside its neighbors, and the categories that need a closer look — each linked to its source and its docket item."
  });
}

module.exports = { spendingPage };
