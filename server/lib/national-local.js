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

const OPINION = { unmodified_opinion: 'a clean (“unmodified”) opinion', qualified_opinion: 'a qualified opinion — the auditor couldn’t sign off on something material (the report says what)', adverse_opinion: 'an adverse opinion — the auditor found the statements, or that part of them, don’t fairly present the finances (the report says why)', disclaimer_of_opinion: 'a disclaimer — the auditor couldn’t form an opinion (the report says why)' };
// The auditor's opinion, in plain words. Two cautions it must carry:
//  - Many counties keep their books on a cash or state-prescribed ("regulatory")
//    basis rather than GAAP. Their auditors report "not GAAP", and often an
//    "adverse" opinion on GAAP — which only says the books aren't kept the GAAP
//    way, not that they're wrong.
//  - Several opinions at once are opinions on different parts (funds or units)
//    of the statements.
function opinionLine(raw) {
  const set = new Set(String(raw || '').split(',').map(s => s.trim()).filter(Boolean));
  if (!set.size) return '';
  const special = set.has('not_gaap');
  if (special) {
    const rest = [...set].filter(o => o !== 'not_gaap' && !(o === 'adverse_opinion'));
    return `Its financial statements are kept on a special basis (cash or a state-prescribed method) rather than generally accepted accounting principles (GAAP), which is common for counties${set.has('adverse_opinion') ? ' — so the auditor’s “adverse” opinion on the GAAP basis means only that the books aren’t kept the GAAP way, not that they’re wrong' : ''}.${rest.length ? ` On the parts kept the standard way, the auditor gave ${rest.map(o => OPINION[o] || o.replace(/_/g, ' ')).join(' and ')}.` : ''}`;
  }
  const ops = [...set].map(o => OPINION[o] || o.replace(/_/g, ' '));
  return set.size === 1 ? `Its auditor gave its financial statements ${ops[0]}.` : `Its auditor gave different parts of its financial statements different opinions: ${ops.join('; ')}.`;
}

function audit(c) {
  const A = read('audits-fac.json'); if (!A) return '';
  const a = A.counties[c.geoid];
  if (!a) return `
<section id="federal-audit">
<h2>Federal audit</h2>
<p>No federal single audit for ${esc(c.name)}’s government was found for ${A.years.join(' or ')}. Counties that spend less than $750,000 of federal money in a year don’t have to file one, and some file under a different name. <a href="${esc(A.url)}" rel="noopener">Search the Federal Audit Clearinghouse</a>.</p>
</section>`;
  const f = a.findings;
  const flags = [a.weakness && 'a material weakness in internal control', a.noncompliance && 'material noncompliance', a.going_concern && 'doubt about whether it can keep operating (a “going concern” warning)'].filter(Boolean);
  return `
<section id="federal-audit">
<h2>Federal audit <span class="sub">— fiscal year ending ${esc(a.fy_end || String(a.year))}</span></h2>
<p>${esc(c.name)}’s government spent <b>${a.expended ? big(a.expended) : 'an unreported amount'}</b> in federal money that year. ${opinionLine(a.opinion)}${flags.length ? ` The audit disclosed ${flags.join(', ')}.` : ''}</p>
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

// Health care access: community health centers (anyone can go; fees by income)
// and official doctor / mental-health shortage designations.
function healthAccess(c) {
  const L = read('local.json'); const H = L && L.health; if (!H) return '';
  const r = H.counties[c.geoid] || { n: 0, centers: [], pc: null, mh: null };
  const short = (x, what) => !x ? '' : `${x.whole ? `All of ${esc(c.name)}` : `Parts of ${esc(c.name)}${x.low_income ? ', or its low-income residents,' : ''}`} ${x.whole ? 'is' : 'are'} officially short of ${what} (shortage score ${x.score} on a 0–25 scale; higher means a worse shortage).`;
  return `
<section id="health-care">
<h2>Health care access <span class="sub">— low-cost clinics and shortages</span></h2>
${r.n ? `<p>${esc(c.name)} has <b>${r.n}</b> community health center site${r.n === 1 ? '' : 's'}. Anyone can go, insured or not; fees slide down with income.</p>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${r.centers.map(x => `<tr><td>${esc(x.name)}<br><span class="soft" style="font-size:12px">${esc([x.address, x.city].filter(Boolean).join(', '))}${x.org && x.org !== x.name ? ` · run by ${esc(x.org)}` : ''}</span></td><td class="num" style="white-space:nowrap">${x.phone ? `<a href="tel:${esc(x.phone.replace(/[^\d]/g, ''))}">${esc(x.phone)}</a>` : ''}${x.hours_week ? `<br><span class="soft" style="font-size:12px">${x.hours_week} hours a week</span>` : ''}</td></tr>`).join('')}</tbody></table></div>
${r.n > r.centers.length ? `<p class="src">And ${r.n - r.centers.length} more — <a href="https://findahealthcenter.hrsa.gov/" rel="noopener">find the nearest one</a>.</p>` : ''}`
    : `<p>No community health center site is listed in ${esc(c.name)}. The nearest may be in a neighboring county — <a href="https://findahealthcenter.hrsa.gov/" rel="noopener">find one</a>.</p>`}
${r.pc || r.mh ? `<p>${[short(r.pc, 'primary care doctors'), short(r.mh, 'mental health providers')].filter(Boolean).join(' ')} These designations let clinics here recruit through federal loan-repayment programs.</p>` : ''}
${src(H, `Health center sites and Health Professional Shortage Areas, pulled ${esc(H.fetched)}. Shortage designations that cover a single facility (such as a prison or clinic) are left out`)}
</section>`;
}

// The questions people search, answered from the same data as the sections
// above — plain text, each with a link to its section. Used for a visible Q&A
// and FAQPage structured data on national county pages, and on county sites' /faq.
function faq(c, base = '') {
  const out = [];
  const add = (q, a, anchor) => out.push({ q, a, href: `${base}#${anchor}` });
  const L = read('local.json');
  const F = L && L.finance && L.finance.counties[c.geoid];
  if (F && F.gov) {
    const g = F.gov, yr = L.finance.year, pop = g.pop || c.pop2024;
    const top = PURPOSE.map(([k, l]) => [l.toLowerCase(), (g.fn || {})[k] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    add(`How much does ${c.name} spend?`, `In ${yr}, ${c.name}'s government spent ${big(g.spend)}${pop ? ` (about $${num(g.spend / pop)} per resident)` : ''} and took in ${big(g.revenue)}. The biggest areas: ${top.map(([l, v]) => `${l} ${big(v)}`).join('; ')}.${g.estimated >= 50 ? ' Most of these figures are Census Bureau estimates because the county didn’t report.' : ''}`, 'county-money');
    if ((g.fn || {}).jail) add(`How much does ${c.name} spend on its jail?`, `${c.name}'s government spent ${big(g.fn.jail)} on its jail and corrections in ${yr}, and ${big((g.fn || {}).police || 0)} on the sheriff and police, by the Census Bureau's national categories.`, 'county-money');
  }
  const P = L && L.proptax && L.proptax.counties[c.geoid];
  if (P) add(`What is the property tax in ${c.name}?`, `The typical homeowner in ${c.name} pays about $${num(P.median_tax)} a year in property tax${P.median_value ? `, on a median home value of $${num(P.median_value)} (about ${(P.median_tax / P.median_value * 100).toFixed(2)}% of its value)` : ''}, according to the Census Bureau's American Community Survey (${L.proptax.years}).`, 'property-tax');
  const B = read('labor.json'); const r = B && B.counties[c.geoid];
  if (r) { const mon = new Date(B.month + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); add(`What is the unemployment rate in ${c.name}?`, `${r.rate.toFixed(1)}% in ${mon}${r.prior != null ? `, compared with ${r.prior.toFixed(1)}% a year earlier` : ''}, according to the Bureau of Labor Statistics (not seasonally adjusted).`, 'jobs'); }
  const A = read('audits-fac.json'); const a = A && A.counties[c.geoid];
  if (a) add(`Did ${c.name} pass its audit?`, `${opinionLine(a.opinion)} Its federal single audit for the year ending ${a.fy_end || a.year} reported ${a.findings.n ? `${a.findings.n} finding${a.findings.n === 1 ? '' : 's'} on its federal programs${a.findings.mw ? `, including ${a.findings.mw} material weakness${a.findings.mw === 1 ? '' : 'es'}` : ''}` : 'no findings on its federal programs'}.`, 'federal-audit');
  const HC = L && L.health && L.health.counties[c.geoid];
  if (HC && HC.n) add(`Where can I get low-cost health care in ${c.name}?`, `${c.name} has ${HC.n} community health center site${HC.n === 1 ? '' : 's'}, open to anyone with fees based on income, including ${HC.centers.slice(0, 3).map(x => `${x.name} (${x.city})`).join(', ')}.`, 'health-care');
  const I = L && L.libraries && L.libraries.counties[c.geoid];
  if (I && I.list.length) add(`Where are the public libraries in ${c.name}?`, `${c.name} has ${I.n} public librar${I.n === 1 ? 'y' : 'ies'}${I.mobile ? ` and ${I.mobile} bookmobile${I.mobile === 1 ? '' : 's'}` : ''}, including ${I.list.slice(0, 3).map(x => `${x.name} (${x.city})`).join(', ')}.`, 'libraries');
  return out;
}

// One line of headline numbers, for search-result descriptions.
function summary(c) {
  const L = read('local.json'); const parts = [];
  const g = L && L.finance && (L.finance.counties[c.geoid] || {}).gov;
  if (g && g.estimated < 50) parts.push(`county government spent ${big(g.spend)} in ${L.finance.year}`);
  const P = L && L.proptax && L.proptax.counties[c.geoid]; if (P) parts.push(`typical property tax $${num(P.median_tax)} a year`);
  const B = read('labor.json'); const r = B && B.counties[c.geoid];
  if (r) parts.push(`unemployment ${r.rate.toFixed(1)}% (${new Date(B.month + '-15T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`);
  return parts.join(', ');
}

function faqSection(items, c) {
  if (!items.length) return '';
  return `
<section id="questions">
<h2>Questions people ask about ${esc(c.name)}</h2>
${items.map(x => `<div class="issue" style="display:block"><b>${esc(x.q)}</b><p style="margin:4px 0 0;font-size:14.5px">${esc(x.a)} <a href="${esc(x.href)}">More</a></p></div>`).join('')}
</section>`;
}
const faqLd = (items) => items.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) } : null;

module.exports = { healthAccess, finance, audit, proptax, labor, libraries, read, opinionLine, faq, faqSection, faqLd, summary };
