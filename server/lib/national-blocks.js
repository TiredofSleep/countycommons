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

function housing(c) {
  const h = c.housing; if (!h || !h.areas.length) return '';
  const BR = ['Studio', '1 bedroom', '2 bedrooms', '3 bedrooms', '4 bedrooms'];
  const a0 = h.areas[0], two = a0.rent[2], need = two * 12 / 0.3;
  const mhi = c.health && c.health['Median Household Income'];
  const chg = (a, i) => a.prev && a.prev[i] ? (a.rent[i] === a.prev[i] ? 'same' : `${a.rent[i] > a.prev[i] ? '+' : '−'}$${num(Math.abs(a.rent[i] - a.prev[i]))}`) : '';
  const table = (a) => `<table class="plain"><thead><tr><th>Size</th><th class="num">Rent a month, FY${h.fy}</th><th class="num">Change from FY${h.fy - 1}</th></tr></thead><tbody>${a.rent.map((r, i) => `<tr><td>${BR[i]}</td><td class="num">$${num(r)}</td><td class="num">${chg(a, i)}</td></tr>`).join('')}</tbody></table>`;
  const many = h.areas.length > 1;
  return `
<section id="housing">
<h2>Housing costs <span class="sub">— what rent runs, FY${h.fy}</span></h2>
<p>A modest two-bedroom rental in ${esc(c.name)} runs about <b>$${num(two)} a month</b>, including utilities${many ? ` in ${esc(a0.area)}, the area with the most people` : ''}. To pay that with no more than 30% of income — the line HUD uses for “affordable” — a household needs about <b>$${num(Math.round(need / 100) * 100)} a year</b>.${mhi ? ` The county's median household earns about $${num(mhi)}, so that rent would take about ${Math.round(two * 12 / mhi * 100)}% of its income.` : ''}</p>
${many ? h.areas.map(a => `<h3 style="margin-top:12px">${esc(a.area)}${a.towns ? ` <span class="sub">— ${a.towns} town${a.towns === 1 ? '' : 's'} in ${esc(c.name)}</span>` : ''}</h3>${table(a)}`).join('') + (h.more ? `<p class="src">And ${h.more} smaller rent areas in the county.</p>` : '') : table(a0)}
<p class="src" style="max-width:none">Source: <a href="https://www.huduser.gov/portal/datasets/fmr.html" rel="noopener">U.S. Department of Housing and Urban Development, Fair Market Rents</a>, FY${h.fy} (in effect since Oct. 1, ${h.fy - 1}) and FY${h.fy - 1}${!many && a0.metro ? `; ${esc(c.name)} is priced as part of the ${esc(a0.area)}` : ''}. A fair market rent is HUD's estimate of rent plus utilities for a standard, modest unit — about the 40th percentile of what recent movers paid. It sets how much a housing voucher (Section 8) will cover. ${mhi ? 'Median income: County Health Rankings 2025. ' : ''}For help with rent, call 211 or find your <a href="https://www.hud.gov/contactus/public-housing-contacts" rel="noopener">local public housing agency</a>.</p>
</section>`;
}

// Voting, from the state's own file (data/corpus/elections-<state>.json), read
// when the page is made so each date shows as passed, open now, or days away.
const elCache = {};
function stateElections(name) {
  const p = require('path').join(__dirname, '..', '..', 'data', 'corpus', 'elections-' + String(name).toLowerCase().replace(/\s+/g, '-') + '.json');
  const fs = require('fs');
  let m; try { m = fs.statSync(p).mtimeMs; } catch (e) { return null; }
  if (!elCache[p] || elCache[p].m !== m) { try { elCache[p] = { m, d: JSON.parse(fs.readFileSync(p, 'utf8')) }; } catch (e) { return null; } }
  return elCache[p].d;
}
function voting(stateName, placeName) {
  const e = stateElections(stateName);
  const now = new Date(), today = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const next = e && (e.elections || []).filter(x => x.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return `
<section id="voting">
<h2>Voting</h2>
<p>Registration deadlines, early voting and polling places for ${esc(stateName)} are on the federal site <a href="https://vote.gov/" rel="noopener">vote.gov</a>, which links to the state's official election office.</p>
</section>`;
  const D = (s) => new Date(s + 'T12:00:00');
  const fmt = (s) => D(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const days = (s) => Math.round((D(s) - D(today)) / 86400000);
  const mark = (d) => { const end = d.end || d.date; if (end < today) return '<span class="chip">passed</span>'; if (d.date <= today) return `<span class="chip c-ok">${d.end ? 'open now' : 'today'}</span>`; const n = days(d.date); return `<span class="chip c-part">in ${n} day${n === 1 ? '' : 's'}</span>`; };
  const cite = (s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.url)}</a>`;
  const togo = days(next.date);
  return `
<section id="voting">
<h2>Voting <span class="sub">— ${esc(/^[A-Z][a-z]+( [a-z]+)*$/.test(next.name) ? next.name.toLowerCase() : next.name)},${esc(D(next.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}${togo > 0 ? ` · ${togo} day${togo === 1 ? '' : 's'} away` : togo === 0 ? ' · today' : ''}</span></h2>
${next.hours ? `<p>Polls are open <b>${esc(next.hours)}</b>.${e.intro ? ` ${esc(e.intro)}` : ''}</p>` : e.intro ? `<p>${esc(e.intro)}</p>` : ''}
${(next.dates || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map(d => `
<div class="issue" style="display:block">
  <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">${mark(d)} <span class="eyebrow">${esc(fmt(d.date))}${d.end ? ` – ${esc(fmt(d.end))}` : ''}</span></div>
  <b style="display:block;margin-top:4px">${esc(d.label)}</b>
  ${d.detail ? `<p style="font-size:14px;margin:4px 0 0">${esc(d.detail)}</p>` : ''}
  ${(d.src || []).length ? `<p class="src" style="max-width:none;margin-top:4px">Source: ${d.src.map(cite).join(' · ')}</p>` : ''}
</div>`).join('')}
${e.id_rule ? `<p><b>What to bring:</b> ${esc(e.id_rule.text)}</p>` : ''}
${(e.check || []).length ? `<p class="src" style="max-width:none">Check your registration and find your polling place: ${e.check.map(x => x.url ? `<a href="${esc(x.url)}" rel="noopener">${esc(x.label || x.text)}</a>` : esc(x.text)).join(' · ')}.</p>` : ''}
<p class="src" style="max-width:none">${esc(stateName)} dates gathered ${esc(e.updated || '')} from the state's election office. Dates can change and local election offices set some hours and sites — they have the final word${placeName ? ` for ${esc(placeName)}` : ''}. This site never rates candidates or takes sides on ballot measures.</p>
</section>`;
}

function grants(c, N, opts = {}) {
  const cur = require('./grants-open').current(N.grantsOpen);
  const g = c.fedgrants, open = cur.list;
  if (!g && !open.length) return '';
  return `
<section id="federal-grants">
<h2>Federal grants <span class="sub">— the money that came in, and what's open now</span></h2>
${g ? `<p>Federal grants paid for <b>${big(g.amount)}</b> of work in ${esc(c.name)} in fiscal ${g.fy}${g.per_capita ? `, about $${num(g.per_capita)} per resident` : ''} — to the county, cities, schools, hospitals, nonprofits and others.</p>
<p class="src" style="max-width:none">Source: <a href="https://www.usaspending.gov/search" rel="noopener">USAspending.gov</a>, grants by place of performance, fiscal ${g.fy} (Oct. ${g.fy - 1} to Sept. ${g.fy}). Search it by county to see each award.</p>` : ''}
${open.length ? `<h3 style="margin-top:12px">Open now: federal grants county governments can apply for</h3>
<table class="plain"><tbody>${open.slice(0, opts.limit || 12).map(o => `<tr><td><a href="https://www.grants.gov/search-results-detail/${esc(o.id)}" rel="noopener">${esc(o.title)}</a><br><span class="soft" style="font-size:12px">${esc(o.agency)} · ${esc(o.number)}</span></td><td class="num">closes ${esc(o.close)}</td></tr>`).join('')}</tbody></table>
<p class="src" style="max-width:none">From <a href="https://www.grants.gov/search-grants" rel="noopener">Grants.gov</a>: posted grants listing county governments as eligible, soonest deadline first; research-only and overseas programs left out${cur.fetched ? `; list updated ${esc(cur.fetched.slice(0, 10))}, refreshed weekly` : ''}. ${open.length > (opts.limit || 12) ? `${open.length} are open in all. ` : ''}Cities, towns, school districts and nonprofits have their own lists there.</p>` : ''}
</section>`;
}

module.exports = { schools, health, risk, bridges, housing, grants, voting, stateElections, big, num };

// --- American Rescue Plan: the county government's Fiscal Recovery Fund
// allocation and projects (Treasury), its cities' totals, and all ARPA
// dollars that reached recipients in the county (USAspending).
let ARPA = null;
function arpaData() {
  if (!ARPA) { try { ARPA = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'data', 'national', 'arpa.json'), 'utf8')); } catch (e) { ARPA = { counties: {}, cities: {} }; } }
  return ARPA;
}
function arpa(c) {
  const A = arpaData(), g = A.counties[c.geoid], towns = A.cities[c.geoid] || [];
  if (!g && !towns.length && !c.arpa) return '';
  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) + '%' : '';
  return `
<section id="arpa">
<h2>American Rescue Plan money <span class="sub">— how ${esc(c.name)} is spending it</span></h2>
${g ? `<p>The county government was allocated <b>${big(g.allocation)}</b> from the federal Fiscal Recovery Fund. As of its latest report it had committed ${big(g.obligated)} and spent <b>${big(g.spent)}</b> (${pct(g.spent, g.allocation)}) across ${g.n} project${g.n === 1 ? '' : 's'}.</p>
${g.cats.length ? `<h3 style="margin-top:10px">Spent so far, by category</h3>${g.cats.map(([k, v]) => row(esc(k), big(v))).join('')}` : ''}
${g.projects.length ? `<h3 style="margin-top:12px">The largest projects</h3>${g.projects.map(p => `
<div class="issue" style="display:block">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(p.name)}</b><span class="num">${big(p.obligated)} committed · ${big(p.spent)} spent</span></div>
  <p class="src" style="max-width:none;margin:4px 0 0">${esc(p.cat)}${p.status ? ` · ${esc(p.status)}` : ''}${p.desc ? ` — “${esc(p.desc)}${p.desc.length >= 240 ? '…' : ''}”` : ''}</p>
</div>`).join('')}` : ''}` : `<p>No Fiscal Recovery Fund report from the county government is in Treasury's data — not gathered, never hidden.</p>`}
${towns.length ? `<h3 style="margin-top:12px">Cities and towns in ${esc(c.name)}</h3>${towns.slice(0, 15).map(t => row(esc(t.name), `${big(t.allocation)} allocated · ${big(t.spent)} spent`)).join('')}${towns.length > 15 ? `<p class="src">And ${towns.length - 15} more.</p>` : ''}` : ''}
${c.arpa ? `<p class="src" style="max-width:none">All American Rescue Plan programs together — school, hospital, housing, business and other aid as well — sent ${big(c.arpa.amount)} to recipients in ${esc(c.name)} (USAspending.gov, by recipient location).</p>` : ''}
<p class="src" style="max-width:none">Sources: <a href="${esc(A.url || 'https://home.treasury.gov/')}" rel="noopener">${esc(A.source || 'U.S. Treasury Fiscal Recovery Funds reporting data')}</a> — descriptions are the government's own words in its reports; <a href="https://www.usaspending.gov/disaster/covid-19" rel="noopener">USAspending.gov</a>.</p>
</section>`;
}

// --- Cities, towns and communities in the county (Census)
function places(c) {
  const p = c.places; if (!p || !p.length) return '';
  const inc = p.filter(x => x.kind === 'inc'), cdp = p.filter(x => x.kind !== 'inc');
  const li = (x) => `<li>${esc(x.name)}${x.also ? ` <span class="soft" style="font-size:12px">(also in ${esc(x.also.join(', '))})</span>` : ''}</li>`;
  return `
<section id="places">
<h2>Cities and towns in ${esc(c.name)}</h2>
${inc.length ? `<ul style="columns:2 220px;padding-left:18px">${inc.map(li).join('')}</ul>` : `<p>No incorporated cities or towns.</p>`}
${cdp.length ? `<details><summary style="cursor:pointer">Unincorporated communities Census counts (${cdp.length})</summary><ul style="columns:2 220px;padding-left:18px">${cdp.map(li).join('')}</ul></details>` : ''}
<p class="src" style="max-width:none">Source: <a href="https://www.census.gov/library/reference/code-lists/ansi.html" rel="noopener">U.S. Census Bureau, 2020 places by county</a>. A town listed with other counties crosses county lines.</p>
</section>`;
}
module.exports.arpa = arpa;
module.exports.places = places;
module.exports.arpaData = arpaData;
