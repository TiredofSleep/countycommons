const { esc, money, STATUS } = require('../lib/corpus');
const { layout } = require('./layout');

function payRange(p) {
  if (p.pay_low === null) return '—';
  if (p.pay_high === null || p.pay_high === p.pay_low) return money(p.pay_low);
  return `${money(p.pay_low)} – ${money(p.pay_high)}`;
}

function comparePage(data, cmp) {
  const { county, documents, docket } = data;
  const issue = cmp.docket_ref !== null ? docket.issues.find(i => i.num === cmp.docket_ref) : null;

  const cols = cmp.rows.map(row => {
    const s = STATUS[row.status] || null;
    const doc = row.source ? documents.documents.find(d => d.id === row.source.doc) : null;
    const positions = row.positions.map(p => `
      <tr>
        <td>${esc(p.title)}${p.count ? ` <span class="code">×${p.count}</span>` : ''}</td>
        <td class="num">${payRange(p)}</td>
        <td style="font-size:12px;color:var(--ink-soft)">${p.note ? esc(p.note) : ''}</td>
      </tr>`).join('');
    return `
<div class="issue" style="display:block">
  <h3 style="margin-top:0">${esc(row.county)}
    ${s ? `<span class="chip ${s.cls}" style="margin-left:8px">${s.mark} ${esc(s.label)}</span>` : ''}
  </h3>
  <p class="src">Population ~${row.population_approx.toLocaleString('en-US')} (Census estimate)${row.year ? ` · figures from ${row.year} filing` : ''}</p>
  ${row.positions.length ? `<table class="plain">
    <thead><tr><th>Position</th><th>Stated pay</th><th></th></tr></thead>
    <tbody>${positions}</tbody></table>` : ''}
  <p class="src">${esc(row.note)}
  ${doc ? ` Source: <a href="/documents#${esc(doc.id)}">${esc(doc.title)}</a>${row.source.page !== null ? `, page ${row.source.page}` : ''}.` : ''}</p>
</div>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · side-by-side from filed documents</div>
  <h1>${esc(cmp.title)}</h1>
  <div class="src">${esc(cmp.intro)}</div>
</header>

<section>
<h2>Read this first <span class="sub">— what this table can and cannot say</span></h2>
${cmp.caveats.map(c => `<p class="src">· ${esc(c)}</p>`).join('')}
</section>

<section>
<h2>The counties <span class="sub">— each from its own filed document</span></h2>
${cols}
</section>

${issue ? `<section><p class="src">This comparison is <a href="/docket#i${issue.num}">Docket #${issue.num}</a> (${esc(issue.status.replace('_', ' '))}).</p></section>` : ''}`;

  return layout({ title: `${cmp.title} — ${county.platform_name}`, current: null, body, county });
}

module.exports = { comparePage };
