// Section blocks built from the national base data — schools, health,
// disaster risk, bridges and federal grants — shared by the /us county pages
// and every County Commons site's /atlas page. Each block cites its source and
// renders nothing when the county has no figure ("not gathered", never invented).
const { esc } = require('./corpus');

const num = (x) => Math.round(x).toLocaleString('en-US');
const big = (x) => x >= 1e9 ? '$' + (x / 1e9).toFixed(1).replace(/\.0$/, '') + ' billion' : x >= 1e6 ? '$' + (x / 1e6).toFixed(1).replace(/\.0$/, '') + ' million' : '$' + num(x);
const row = (l, r) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--rule-soft)"><span>${l}</span><span class="num">${r}</span></div>`;

function schools(c, N) {
  const s = c.schools; if (!s || !s.districts.length) return '';
  const src = N.schoolSrc || {};
  return `
<section id="schools">
<h2>Public schools <span class="sub">— district budgets, fiscal ${esc(s.year)}</span></h2>
<p>${s.districts.length} school district${s.districts.length === 1 ? ' has its' : 's have their'} office in ${esc(c.name)}. School taxes are usually the largest part of a property tax bill.</p>
${s.districts.slice(0, 8).map(d => `
<div class="issue" style="display:block">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(d.name)}</b><span class="num">${num(d.enroll)} students</span></div>
  <p class="src" style="max-width:none;margin:4px 0 0">Spent ${big(d.spend)} — ${big(d.current)} to run schools, about <b>$${num(d.current / d.enroll)} per student</b>${d.capital ? `, plus ${big(d.capital)} on buildings and equipment` : ''}. Money in: ${big(d.local)} local (mostly property tax), ${big(d.state)} state, ${big(d.fed)} federal.${d.debt ? ` Long-term debt: ${big(d.debt)}.` : ''}</p>
</div>`).join('')}
${s.districts.length > 8 ? `<p class="src">And ${s.districts.length - 8} more.</p>` : ''}
<p class="src" style="max-width:none">Source: <a href="${esc(src.table || 'https://www.census.gov/programs-surveys/school-finances.html')}" rel="noopener">${esc(src.source || 'U.S. Census Bureau, Annual Survey of School System Finances')}</a>. Districts are listed by the county of their main office; some serve neighboring counties too.</p>
</section>`;
}

const PCT = (x) => (x * 100).toFixed(1) + '%';
const HEALTH = [
  ['Life expectancy', 'Life Expectancy', (x) => x.toFixed(1) + ' years'],
  ['Adults under 65 without health insurance', 'Uninsured', PCT],
  ['Children in poverty', 'Children in Poverty', PCT],
  ['Households without enough food (food insecurity)', 'Food Insecurity', PCT],
  ['Households with broadband internet', 'Broadband Access', PCT],
  ['Households with severe housing problems', 'Severe Housing Problems', PCT],
  ['Drug overdose deaths per 100,000', 'Drug Overdose Deaths', (x) => x.toFixed(1)],
  ['Residents per primary care doctor', 'Primary Care Physicians', (x) => num(1 / x)],
  ['Residents per mental health provider', 'Mental Health Providers', (x) => num(1 / x)],
  ['Unemployment', 'Unemployment', PCT],
  ['Median household income', 'Median Household Income', (x) => '$' + num(x)]
];
function health(c, N) {
  const h = c.health; if (!h) return '';
  const st = (N.chrState || {})[c.geoid.slice(0, 2)] || {};
  const S = (N.states[c.st] || {}).name || c.st;
  const rows = HEALTH.filter(([, k]) => h[k] !== null && h[k] !== undefined && h[k] > 0)
    .map(([l, k, f]) => row(esc(l), `<b>${f(h[k])}</b>${st[k] ? ` <span class="soft" style="font-size:12.5px">· ${esc(S)} ${f(st[k])}</span>` : ''}`));
  if (!rows.length) return '';
  const src = N.healthSrc || {};
  return `
<section id="health">
<h2>Health, money and internet at home <span class="sub">— ${esc(c.name)} beside ${esc(S)}</span></h2>
${rows.join('')}
<p class="src" style="max-width:none">Source: <a href="${esc(src.url || 'https://www.countyhealthrankings.org/')}" rel="noopener">${esc(src.source || 'County Health Rankings & Roadmaps')}</a>, which gathers federal data (CDC, Census, and others); measures cover different recent years. Blank lines aren't reported for small counties.</p>
</section>`;
}

function risk(c) {
  const r = c.risk; if (!r) return '';
  return `
<section id="risk">
<h2>Disaster risk <span class="sub">— FEMA's National Risk Index</span></h2>
<p>Overall risk: <b>${esc(r.rating)}</b> compared with other U.S. counties. FEMA estimates natural hazards cost ${esc(c.name)} about <b>${big(r.eal)} a year</b> on average in buildings, crops and lives. Ability to bounce back (community resilience): ${esc(r.resilience || 'not rated')}; social vulnerability: ${esc(r.sovi || 'not rated')}.</p>
${r.top.length ? `<h3 style="margin-top:10px">The costliest hazards here</h3>${r.top.map(h => row(esc(h.name), `${big(h.eal)} a year <span class="soft" style="font-size:12.5px">· ${esc(h.rating || '')}</span>`)).join('')}` : ''}
<p class="src" style="max-width:none">Source: <a href="https://hazards.fema.gov/nri/" rel="noopener">FEMA National Risk Index</a> (${esc(r.ver || '')}), expected annual loss. Ratings compare counties nationwide; they're estimates, not predictions.</p>
</section>`;
}

function bridges(c) {
  const b = c.bridges; if (!b || !b.total) return '';
  return `
<section id="bridges">
<h2>Bridges <span class="sub">— condition of every public bridge, ${esc(b.year)}</span></h2>
<p><b>${num(b.total)}</b> bridges in ${esc(c.name)}: ${num(b.good)} in good condition, ${num(b.fair)} fair, and <b>${num(b.poor)} poor</b> (${(b.poor / b.total * 100).toFixed(1)}%). “Poor” means a main part — the deck, the beams, or the supports — is rated 4 or lower on the federal 0–9 scale. It doesn't mean unsafe to drive; unsafe bridges are closed.</p>
${b.worst.length ? `<h3 style="margin-top:10px">Busiest bridges rated poor</h3><table class="plain"><tbody>${b.worst.map(w => `<tr><td>${esc(w.road)}<br><span class="soft" style="font-size:12px">over ${esc(w.over)}${w.built ? ` · built ${w.built}` : ''}</span></td><td class="num">${num(w.adt)} vehicles a day</td></tr>`).join('')}</tbody></table>` : ''}
<p class="src" style="max-width:none">Source: <a href="https://www.fhwa.dot.gov/bridge/nbi.cfm" rel="noopener">Federal Highway Administration, National Bridge Inventory</a> (${esc(b.year)} submission). Includes state, county and city bridges.</p>
</section>`;
}

function grants(c, N, opts = {}) {
  const g = c.fedgrants, open = (N.grantsOpen || []).filter(o => o.close >= new Date().toISOString().slice(0, 10));
  if (!g && !open.length) return '';
  return `
<section id="federal-grants">
<h2>Federal grants <span class="sub">— the money that came in, and what's open now</span></h2>
${g ? `<p>Federal grants paid for <b>${big(g.amount)}</b> of work in ${esc(c.name)} in fiscal ${g.fy}${g.per_capita ? `, about $${num(g.per_capita)} per resident` : ''} — to the county, cities, schools, hospitals, nonprofits and others.</p>
<p class="src" style="max-width:none">Source: <a href="https://www.usaspending.gov/search" rel="noopener">USAspending.gov</a>, grants by place of performance, fiscal ${g.fy} (Oct. ${g.fy - 1} to Sept. ${g.fy}). Search it by county to see each award.</p>` : ''}
${open.length ? `<h3 style="margin-top:12px">Open now: federal grants county governments can apply for</h3>
<table class="plain"><tbody>${open.slice(0, opts.limit || 12).map(o => `<tr><td><a href="https://www.grants.gov/search-results-detail/${esc(o.id)}" rel="noopener">${esc(o.title)}</a><br><span class="soft" style="font-size:12px">${esc(o.agency)} · ${esc(o.number)}</span></td><td class="num">closes ${esc(o.close)}</td></tr>`).join('')}</tbody></table>
<p class="src" style="max-width:none">From <a href="https://www.grants.gov/search-grants" rel="noopener">Grants.gov</a>: posted grants listing county governments as eligible, soonest deadline first; research-only and overseas programs left out. ${open.length > (opts.limit || 12) ? `${open.length} are open in all. ` : ''}Cities, towns, school districts and nonprofits have their own lists there.</p>` : ''}
</section>`;
}

module.exports = { schools, health, risk, bridges, grants, big, num };
