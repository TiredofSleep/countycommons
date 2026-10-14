// Cities and towns in the county: each one's latest state audit, in the
// auditors' words — the same reading as the county's own report.
const { esc } = require('./corpus');

function block(cities, countyName) {
  if (!cities || !cities.length) return '';
  const chip = (v) => v === 'findings' ? '<span class="chip c-dead">● findings reported</span>' : '<span class="chip c-ok">✓ no findings reported</span>';
  const withF = cities.filter(c => c.verdict === 'findings').length;
  return `
<section id="cities">
<h2>Cities and towns in ${esc(countyName)} <span class="sub">— each one's latest state audit</span></h2>
<p>${cities.length} town${cities.length === 1 ? '' : 's'} with a report on file; the auditors reported findings in ${withF}. Each line quotes the auditors and links the full report.</p>
${cities.map(c => `
<div class="issue" style="display:block" id="city-${esc(c.id)}">
  <b>${esc(c.name)}</b> <span class="code">FY${esc(c.year)}</span> ${chip(c.verdict)}
  ${c.quote ? `<p style="font-size:13.5px;margin:6px 0 2px">“${esc(c.quote)}”</p>` : ''}
  <p class="src">${c.type === 'audit' ? 'A full audit.' : 'A limited “financial and compliance” review (its financial statements are unaudited).'}${c.more ? ' The report says more; parts about staff positions are left to it, since this site doesn’t single out non-elected staff.' : ''} <a href="${esc(c.url)}" rel="noopener">Arkansas Legislative Audit report ${esc(c.id)}</a>${c.page ? `, page ${esc(c.page)}` : ''}.</p>
</div>`).join('')}
</section>`;
}
module.exports = { block };
