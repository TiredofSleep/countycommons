const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// What the state's auditors actually said — quoted, cited, with the
// regulatory-basis explainer up front so nobody misreads boilerplate
// as scandal (or clean books as a reason to stop asking questions).

function auditsPage(data) {
  const { county, documents, auditFindings } = data;

  // No auditor reports ingested for this county yet. Say so plainly — this is a
  // dead end in the platform's sense ("not navigable yet," never "hidden"), not
  // a claim that the books are clean or that no audits exist.
  if (!auditFindings || !Array.isArray(auditFindings.verdicts) || !auditFindings.verdicts.length) {
    const emptyBody = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · auditor reports</div>
  <h1>What the auditors reported</h1>
  <div class="src">No auditor reports have been ingested for ${esc(county.name)} yet.</div>
</header>

<section>
<p class="src" style="max-width:64ch">Most counties are audited by a state agency or an independent firm, and those reports are public record. We haven't yet obtained and machine-read one for ${esc(county.name)} — so this is a <b>dead end</b> in our sense of the word: not navigable here yet, never hidden. When a report is in hand it's quoted and cited on this page, with the regulatory-basis note up front so boilerplate isn't misread as scandal.</p>
<p class="src" style="max-width:64ch">Know where ${esc(county.name)}'s audit lives? <a href="/feedback">Point us to it</a> and it goes in the queue. Meanwhile, follow the money that <em>is</em> mapped on the <a href="/budget">money trail</a>.</p>
</section>`;
    return layout({ title: `What the auditors reported — ${county.platform_name}`, current: '/audits', body: emptyBody, county,
      description: `Auditor reports for ${county.name}, ${county.state} — quoted and cited as they're ingested.` });
  }

  const chip = v => v === 'clean'
    ? '<span class="chip c-ok">✓ no findings reported</span>'
    : '<span class="chip c-part">◐ no findings surfaced in machine read</span>';

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
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · quoted from the reports</div>
  <h1>What the auditors reported</h1>
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

${auditFindings.rebate ? `<section>
<h2>${esc(auditFindings.rebate.title)} <span class="sub">— the scary number, explained</span></h2>
<p>${esc(auditFindings.rebate.body)}</p>
<p class="src">${esc(auditFindings.rebate.status)}</p>
</section>` : ''}

${auditFindings.minutes_finding ? `<section>
<h2>From the minutes <span class="sub">— first OCR result</span></h2>
<p>${esc(auditFindings.minutes_finding)}</p>
</section>` : ''}

${Array.isArray(auditFindings.limits) && auditFindings.limits.length ? `<section>
<h2>What audits cannot tell you <span class="sub">— the honest limits</span></h2>
${auditFindings.limits.map(l => `<p class="src">· ${esc(l)}</p>`).join('')}
</section>` : ''}`;

  return layout({ title: `What the auditors flagged — ${county.platform_name}`, current: '/audits', body, county });
}

module.exports = { auditsPage };
