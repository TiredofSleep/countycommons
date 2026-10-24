// Local-government sections for every U.S. county: what the county government
// takes in and spends (Census of Governments 2022), its latest federal single
// audit (Federal Audit Clearinghouse), property tax homeowners pay (ACS),
// unemployment this month (BLS), and its public libraries (IMLS). Each reads
// its file when first needed and re-reads it when the file changes.
const fs = require('fs');
const path = require('path');
const { esc } = require('./corpus');

const DIR = path.join(__dirname, '..', '..', 'data', 'national');
const cache = {};
function read(f) {
  const p = path.join(DIR, f);
  let m; try { m = fs.statSync(p).mtimeMs; } catch (e) { return null; }
  if (!cache[f] || cache[f].m !== m) { try { cache[f] = { m, d: JSON.parse(fs.readFileSync(p, 'utf8')) }; } catch (e) { return null; } }
  return cache[f].d;
}
const num = (x) => Math.round(x).toLocaleString('en-US');
const big = (x) => x >= 1e9 ? '$' + (x / 1e9).toFixed(2) + ' billion' : x >= 1e6 ? '$' + (x / 1e6).toFixed(1) + ' million' : '$' + num(x);
const src = (s, extra) => `<p class="src" style="max-width:none">Source: <a href="${esc(s.url)}" rel="noopener">${esc(s.source)}</a>${extra ? '. ' + extra : '.'}</p>`;

const PURPOSE = [
  ['jail', 'Jail and corrections'], ['police', 'Sheriff and police'], ['courts', 'Courts and legal'], ['roads', 'Roads and highways'],
  ['health', 'Public health'], ['hospitals', 'Hospitals'], ['welfare', 'Public welfare'], ['fire', 'Fire protection'],
  ['parks', 'Parks and recreation'], ['libraries', 'Libraries'], ['trash', 'Trash and recycling'], ['sewer', 'Sewers'],
  ['housing', 'Housing and community development'], ['schools', 'Schools and colleges'], ['admin', 'Running the government (finance, staff, buildings)'],
  ['utilities', 'Utilities (water, power, transit)'], ['other', 'Everything else']
];

function finance(c) {
  const L = read('local.json'); const F = L && L.finance; if (!F) return '';
  const r = F.counties[c.geoid]; if (!r) return '';
  const loc = r.local, u = loc.units;
  const parts = [u.city && `${u.city} cit${u.city === 1 ? 'y or town' : 'ies and towns'}`, u.township && `${u.township} township${u.township === 1 ? '' : 's'}`, u.school && `${u.school} school district${u.school === 1 ? '' : 's'}`, u.special && `${u.special} special district${u.special === 1 ? '' : 's'} (water, fire, hospital, housing and others)`].filter(Boolean);
  const localLine = `<p>Counting every local government in ${esc(c.name)} — ${u.county ? 'the county, ' : ''}${parts.join(', ')} — they spent <b>${big(loc.spend)}</b> in ${F.year}${loc.schools ? `, ${big(loc.schools)} of it on schools` : ''}.</p>`;
  const g = r.gov;
  if (!g) return `
<section id="county-money">
<h2>Local government money <span class="sub">— ${F.year}</span></h2>
<p>${esc(c.name)} has no county government of its own in the Census of Governments; local services are run by its cities, towns and districts.</p>
${localLine}
${src(F)}
</section>`;
  const pop = g.pop || c.pop2024 || null;
  const per = (x) => pop ? ` <span class="soft" style="font-size:12.5px">· $${num(x / pop)} per resident</span>` : '';
  const rv = g.rev || {};
  const sources = [['Property tax', rv.property], ['Sales taxes', rv.sales], ['Other taxes', rv.other_tax], ['From the state', rv.state], ['From the federal government', rv.federal], ['From other local governments', rv.local], ['Charges and fees', rv.charges], ['Interest, fines and other', rv.misc]]
    .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const spend = PURPOSE.map(([k, l]) => [l, (g.fn || {})[k] || 0]).concat([['Interest on debt', g.interest || 0], ['Passed to other local governments', g.to_local || 0]])
    .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const row = ([l, v], tot) => `<tr><td>${esc(l)}</td><td class="num">${big(v)}</td><td class="num">${tot ? Math.round(v / tot * 100) + '%' : ''}</td></tr>`;
  return `
<section id="county-money">
<h2>The county government’s money <span class="sub">— ${F.year}, every county the same way</span></h2>
${g.estimated >= 50 ? `<p class="src" style="max-width:none;color:var(--dead)"><b>Rough estimates:</b> ${esc(c.name)}’s government didn’t report to the Census Bureau for ${F.year}, so most of these figures (${g.estimated}%) are the Bureau’s estimates. Treat them as rough — the county’s own budget and audit are the better source.</p>` : ''}
<p>In ${F.year}, ${esc(c.name)}’s government took in <b>${big(g.revenue)}</b>${per(g.revenue)} and spent <b>${big(g.spend)}</b>${per(g.spend)}.${g.debt > 0 ? ` It owed ${big(g.debt)} in debt at the end of the year.` : ''}${(g.fn || {}).jail ? ` The jail and corrections cost ${big(g.fn.jail)}.` : ''}</p>
<div style="display:flex;gap:16px;flex-wrap:wrap">
<div style="flex:1;min-width:260px"><h3 style="margin-top:4px">Where the money came from</h3><table class="plain"><tbody>${sources.map(s => row(s, g.revenue)).join('')}</tbody></table></div>
<div style="flex:1;min-width:260px"><h3 style="margin-top:4px">What it was spent on</h3><table class="plain"><tbody>${spend.map(s => row(s, g.spend)).join('')}</tbody></table></div>
</div>
${localLine}
${src(F, `The Census Bureau sorts every government’s money into the same national categories, so counties can be compared — these totals won’t match the county’s own budget line for line (different year, funds and categories). Amounts are for ${F.year}${g.estimated ? `; ${g.estimated}% of this county’s figures were estimated by the Census Bureau because the county didn’t report them` : ''}. Water, power and transit utilities and insurance trust funds are kept separate from general revenue.`)}
</section>`;
}

const OPINION = { unmodified_opinion: 'a clean (“unmodified”) opinion', qualified_opinion: 'a qualified opinion — the auditor found something material it couldn’t sign off on', adverse_opinion: 'an adverse opinion — the statements were materially misstated', disclaimer_of_opinion: 'a disclaimer — the auditor couldn’t form an opinion' };
function audit(c) {
  const A = read('audits-fac.json'); if (!A) return '';
  const a = A.counties[c.geoid];
  if (!a) return `
<section id="federal-audit">
<h2>Federal audit</h2>
<p>No federal single audit for ${esc(c.name)}’s government was found for ${A.years.join(' or ')}. Counties that spend less than $750,000 of federal money in a year don’t have to file one, and some file under a different name. <a href="${esc(A.url)}" rel="noopener">Search the Federal Audit Clearinghouse</a>.</p>
</section>`;
  const ops = String(a.opinion || '').split(',').map(o => OPINION[o.trim()] || o.replace(/_/g, ' ')).filter(Boolean);
  const f = a.findings;
  const flags = [a.weakness && 'a material weakness in internal control', a.noncompliance && 'material noncompliance', a.going_concern && 'doubt about whether it can keep operating (a “going concern” warning)'].filter(Boolean);
  return `
<section id="federal-audit">
<h2>Federal audit <span class="sub">— fiscal year ending ${esc(a.fy_end || String(a.year))}</span></h2>
<p>${esc(c.name)}’s government spent <b>${a.expended ? big(a.expended) : 'an unreported amount'}</b> in federal money that year${ops.length ? `, and its auditor gave its financial statements ${ops.join('; ')}` : ''}.${flags.length ? ` The audit disclosed ${flags.join(', ')}.` : ''}</p>
<p>${f.n ? `<b>${f.n} finding${f.n === 1 ? '' : 's'}</b> on its federal programs${[f.mw && `${f.mw} material weakness${f.mw === 1 ? '' : 'es'}`, f.repeat && `${f.repeat} repeated from an earlier year`, f.questioned && `${f.questioned} with questioned costs`].filter(Boolean).length ? ` — ${[f.mw && `${f.mw} material weakness${f.mw === 1 ? '' : 'es'}`, f.repeat && `${f.repeat} repeated from an earlier year`, f.questioned && `${f.questioned} with questioned costs`].filter(Boolean).join(', ')}` : ''}.` : 'No findings on its federal programs.'} <a href="https://app.fac.gov/dissemination/summary/${esc(a.report_id)}" rel="noopener">Read the audit</a>.</p>
<p class="src" style="max-width:none">Source: <a href="${esc(A.url)}" rel="noopener">${esc(A.source)}</a>, report ${esc(a.report_id)}${a.firm ? `, audited by ${esc(a.firm)}` : ''}. A single audit is required when a government spends $750,000 or more of federal money in a year. A “material weakness” means a control problem serious enough that a big error could slip through; it isn’t a finding of wrongdoing.</p>
</section>`;
}

function proptax(c) {
  const L = read('local.json'); const P = L && L.proptax; if (!P) return '';
  const t = P.counties[c.geoid]; if (!t) return '';
  const pct = t.median_value ? (t.median_tax / t.median_value * 100) : null;
  return `
<section id="property-tax">
<h2>Property tax <span class="sub">— what homeowners here pay</span></h2>
<p>The typical (median) homeowner in ${esc(c.name)} pays <b>$${num(t.median_tax)} a year</b> in property tax${t.median_value ? `, on a median home value of $${num(t.median_value)} — about ${pct.toFixed(2)}% of the home’s value` : ''}.${t.with_mortgage && t.without_mortgage ? ` With a mortgage: $${num(t.with_mortgage)}; without: $${num(t.without_mortgage)}.` : ''}</p>
${src(P, `${P.years}, from what homeowners reported (margin of error ±$${num(t.moe || 0)}). The percentage is a rough guide — the rate on your own bill depends on your city, school district and exemptions`)}
</section>`;
}

function labor(c) {
  const B = read('labor.json'); if (!B) return '';
  const r = B.counties[c.geoid]; if (!r) return '';
  const mon = (k) => new Date(k + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const d = r.prior != null ? r.rate - r.prior : null;
  return `
<section id="jobs">
<h2>Jobs <span class="sub">— unemployment, ${esc(mon(B.month))}</span></h2>
<p><b>${r.rate.toFixed(1)}%</b> of ${esc(c.name)}’s labor force was out of work and looking${r.unemployed != null ? ` — about ${num(r.unemployed)} people out of ${num(r.labor_force)}` : ''}.${d != null ? ` A year earlier (${esc(mon(B.prior_month))}) it was ${r.prior.toFixed(1)}%, so it’s ${Math.abs(d) < 0.05 ? 'about the same' : d < 0 ? `down ${Math.abs(d).toFixed(1)} points` : `up ${d.toFixed(1)} points`}.` : ''}</p>
${src(B, `Updated monthly; refreshed ${esc(String(B.fetched).slice(0, 10))}`)}
</section>`;
}

function libraries(c) {
  const L = read('local.json'); const I = L && L.libraries; if (!I) return '';
  const r = I.counties[c.geoid]; if (!r) return '';
  return `
<section id="libraries">
<h2>Public libraries <span class="sub">— free internet, help and a place to meet</span></h2>
<p>${esc(c.name)} has <b>${r.n}</b> public librar${r.n === 1 ? 'y' : 'ies'}${r.mobile ? ` and ${r.mobile} bookmobile${r.mobile === 1 ? '' : 's'}` : ''}.</p>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${r.list.map(x => `<tr><td>${esc(x.name)}<br><span class="soft" style="font-size:12px">${esc([x.address, x.city].filter(Boolean).join(', '))} · ${esc(x.type)}</span></td><td class="num">${x.hours_week ? `about ${x.hours_week} hours a week` : ''}</td></tr>`).join('')}</tbody></table></div>
${r.more ? `<p class="src">And ${r.more} more.</p>` : ''}
${src(I, 'Hours are the yearly total divided by weeks open — check with the library before you go')}
</section>`;
}

module.exports = { finance, audit, proptax, labor, libraries, read };
