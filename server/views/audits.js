const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// What the state's auditors actually said — quoted, cited, with the
// regulatory-basis explainer up front so nobody misreads boilerplate
// as scandal (or clean books as a reason to stop asking questions).

function auditsPage(data) {
  const { county, documents, auditFindings } = data;
  const chip = v => v === 'clean'
    ? '<span class="chip c-ok">✓ clean</span>'
    : '<span class="chip c-part">◐ clean (machine-read)</span>';

  const rows = auditFindings.verdicts.map(v => {
    const doc = v.source ? documents.documents.find(d => d.id === v.source.doc) : null;
    return `
<div class="issue" style="display:block">
  <b>${esc(v.entity)}</b> <span class="code">${esc(v.year)}</span> ${chip(v.verdict)}
  ${v.quote ? `<p style="font-size:13.5px;margin:6px 0 2px">“${esc(v.quote)}”</p>` : ''}
  ${v.detail ? `<p class="src">${esc(v.detail)}</p>` : ''}
  ${doc ? `<p class="src">Source: <a href="/documents#${esc(doc.id)}">${esc(doc.title)}</a>${v.source.page ? `, page ${v.source.page}` : ''}.</p>` : ''}
</div>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · what the auditors flagged</div>
  <h1>Is anything actually wrong?</h1>
  <div class="src">${esc(auditFindings.intro)}</div>
</header>

<section>
<h2>Read this first <span class="sub">— the phrase that gets misread</span></h2>
<p class="src">${esc(auditFindings.regulatory_basis_note)}</p>
</section>

<section>
<h2>The verdicts <span class="sub">— quoted from the reports</span></h2>
${rows}
</section>

<section>
<h2>${esc(auditFindings.rebate.title)} <span class="sub">— the scary number, explained</span></h2>
<p>${esc(auditFindings.rebate.body)}</p>
<p class="src">${esc(auditFindings.rebate.status)}</p>
</section>

<section>
<h2>From the minutes <span class="sub">— first OCR result</span></h2>
<p>${esc(auditFindings.minutes_finding)}</p>
</section>

<section>
<h2>What audits cannot tell you <span class="sub">— the honest limits</span></h2>
${auditFindings.limits.map(l => `<p class="src">· ${esc(l)}</p>`).join('')}
</section>`;

  return layout({ title: `What the auditors flagged — ${county.platform_name}`, current: '/audits', body, county });
}

module.exports = { auditsPage };
