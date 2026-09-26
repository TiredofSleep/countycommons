const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');

// Taxes & debt: every tax stream in, every loan out, with what each has cost.
// Built from data/corpus/taxes-debt.json; every figure links to its document.
// Computes and cites, never advocates — the arithmetic section states the
// comparison and its limits side by side, the way the fire-funding caveat does.

function taxDebtPage(data) {
  const { county, taxDebt: t, documents } = data;
  const docs = new Map(documents.documents.map(d => [d.id, d]));

  // A source link: the registered document if we hold it, else its URL.
  // `short` swaps the long document title for a compact label in dense tables.
  const cite = (id, page, url, short) => {
    const d = docs.get(id);
    if (d) return `<a href="/documents#${esc(d.id)}" title="${esc(d.title)}">${esc(short || d.title)}</a>${page ? `, ${esc(page)}` : ''}`;
    if (url) return `<a href="${esc(url)}" rel="noopener">${esc(short || url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`;
    return '';
  };
  const wrap = (table) => `<div style="overflow-x:auto;max-width:100%">${table}</div>`;
  const srcCell = 'class="soft" style="overflow-wrap:anywhere;font-size:13px"';

  const salesRows = t.rates.sales.map(r => `
<tr><td>${esc(r.label)}</td><td class="num"><b>${esc(r.rate)}</b></td><td ${srcCell}>${esc(r.note)} · ${cite(r.doc, null, r.url, r.url ? 'Arkansas DFA' : 'DFA rate table, 2025')}</td></tr>`).join('');

  const yearRows = (years, label) => years.map(y => `
<tr><td>${y.year}</td><td class="num">${money(y.amount)}</td><td ${srcCell}>${cite(y.doc, y.page, null, `${label} ${y.year}`)}</td></tr>`).join('');

  const e = t.edccc;
  const budgetedTotal = e.budgeted.reduce((s, b) => s + b.amount, 0);
  const budgetedRows = e.budgeted.map(b => `
<tr><td>${b.year} <span class="chip c-part">budgeted</span></td><td class="num">${money(b.amount)}</td><td ${srcCell}>${cite(b.doc, null, null, `County budget ${b.year}`)}</td></tr>`).join('');

  const debtCards = t.debts.map(d => `
<div class="issue" style="display:block">
  <div class="eyebrow" style="margin:0 0 4px">${esc(d.who)}</div>
  <b>${esc(d.what)}</b>
  <table class="plain" style="margin:8px 0 4px;table-layout:fixed;width:100%">
    <tbody>
      <tr><td style="width:88px">Borrowed</td><td style="overflow-wrap:anywhere">${esc(d.borrowed)}</td></tr>
      <tr><td>Paid from</td><td style="overflow-wrap:anywhere">${esc(d.paid_by)}</td></tr>
      <tr><td>Paid off</td><td style="overflow-wrap:anywhere">${esc(d.payoff)}</td></tr>
      <tr><td>Cost</td><td style="overflow-wrap:anywhere">${esc(d.cost)}</td></tr>
    </tbody>
  </table>
  <p class="src" style="overflow-wrap:anywhere">Sources: ${d.docs.map(x => cite(x.doc, x.page)).filter(Boolean).join(' · ')}</p>
</div>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · taxes &amp; debt</div>
  <h1>What comes in, what we owe</h1>
  <div class="src">${esc(t.intro)} Updated ${esc(t.updated)}.</div>
</header>

<section>
<h2>What you pay <span class="sub">— the rates, from the state's own tables</span></h2>
${wrap(`<table class="plain">
<thead><tr><th>Sales tax</th><th>Rate</th><th>Source</th></tr></thead>
<tbody>${salesRows}
<tr><td><b>Total at an Arkadelphia register</b></td><td class="num"><b>${esc(t.rates.sales_total)}</b></td><td></td></tr>
</tbody>
</table>`)}
<p>${esc(t.rates.property_note)} <span class="src">Source: ${cite(t.rates.property_doc, null, null, 'State millage report, 2025')}.</span></p>
</section>

<section id="edccc">
<h2>The EDCCC half-cent <span class="sub">— every audited year</span></h2>
<p>${esc(e.summary)}</p>
<div style="overflow-x:auto;max-width:100%">
<table class="plain">
<thead><tr><th>Year</th><th>Collected</th><th>Source</th></tr></thead>
<tbody>${yearRows(e.years, 'County audit')}
<tr><td><b>2008–2023, audited</b></td><td class="num"><b>${money(e.total_audited)}</b></td><td></td></tr>
${budgetedRows}
<tr><td><b>Audited + budgeted</b></td><td class="num"><b>${money(e.total_audited + budgetedTotal)}</b></td><td class="soft">The last two years are budget figures, not audited collections.</td></tr>
</tbody>
</table></div>
<p class="src">${esc(e.gaps)} <a href="/docket#i5">Docket #5</a> · <a href="/line/edccc">The line in the money trail</a></p>
</section>

<section id="city-sales">
<h2>The city's sales tax <span class="sub">— General Fund, audited</span></h2>
<p>${esc(t.city_sales.summary)}</p>
${wrap(`<table class="plain">
<thead><tr><th>Year</th><th>Collected</th><th>Source</th></tr></thead>
<tbody>${yearRows(t.city_sales.years, 'City audit')}</tbody>
</table>`)}
</section>

<section id="debt">
<h2>What we owe <span class="sub">— every loan we've documented, and what it costs</span></h2>
${debtCards}
</section>

<section id="arithmetic">
<h2>The honest arithmetic <span class="sub">— what these numbers do and don't show</span></h2>
<p>${esc(t.arithmetic.lead)}</p>
<ul>${t.arithmetic.limits.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
<p><b>${esc(t.arithmetic.decision)}</b></p>
</section>

<section id="unknowns">
<h2>Still unknown <span class="sub">— the next records to pull</span></h2>
<ul>${t.unknowns.map(u => `<li>${esc(u)}</li>`).join('')}</ul>
<p class="src">Every source above is in <a href="/documents">the document library</a>, downloaded and hashed. Spot an error? That's a gift — <a href="/feedback">report it</a>.</p>
</section>`;

  return layout({
    title: `Taxes & debt — ${county.platform_name}`, current: '/taxes', body, county,
    description: `Every tax stream and every loan for Arkadelphia and ${county.name} — the EDCCC half-cent year by year, the city's sales tax, and school, county, city, and water debt — each figure linked to its source.`
  });
}

module.exports = { taxDebtPage };
