// The national base template: one page for every U.S. county (and county
// equivalent) at countycommons.us/us/<st>/<county>, built only from national
// public datasets (data/national/counties.json, made by pipeline/national.js):
// Census population and area, EPA public water systems, Vera county jail
// data, and the state's election dates where we have them. Counties with a
// full County Commons site link straight to it. A gap is "not gathered yet",
// never hidden.
const fs = require('fs');
const path = require('path');
const { esc } = require('../lib/corpus');
const B = require('../lib/national-blocks');
const RK = require('../lib/national-ranks');

const ROOT = path.join(__dirname, '..', '..');
let NAT = null;
function nat() {
  if (!NAT) {
    try { NAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8')); }
    catch (e) { NAT = { states: {}, counties: [] }; }
    NAT.byState = {};
    for (const c of NAT.counties) (NAT.byState[c.st] = NAT.byState[c.st] || []).push(c);
  }
  return NAT;
}
const num = (x) => Math.round(x).toLocaleString('en-US');
const pct = (a, b) => { const p = (a - b) / b * 100; return (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(1) + '%'; };
const ld = (x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`;

function page({ title, description, canonical, body, jsonld }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website"><meta property="og:site_name" content="County Commons">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
<link rel="canonical" href="${esc(canonical)}">
${jsonld ? ld(jsonld) : ''}
<link rel="stylesheet" href="/style.css?v=6"><link rel="icon" href="/favicon.svg">
</head>
<body><div class="wrap">
<nav class="site" aria-label="Site"><a href="/">County Commons</a><a href="/us">Every county in the U.S.</a></nav>
${body}
<footer><b>County Commons is an independent, citizen-built civic project. It is not a government website</b> and has no affiliation with any government body. It computes and cites public records and never takes sides. A gap means "not gathered yet," never "hidden." Spot an error? brayden.ozark@gmail.com.</footer>
</div></body></html>`;
}

function countyPage(st, slug) {
  const N = nat();
  const c = (N.byState[st] || []).find(x => x.slug === slug);
  if (!c) return null;
  const S = N.states[st] || { name: st };
  const place = `${c.name}, ${S.name}`;
  const canonical = `https://countycommons.us/us/${st.toLowerCase()}/${slug}`;
  const el = c.st && N.elections && N.elections[st];
  const w = c.water, j = c.jail;
  const facts = [
    c.pop2024 ? `<b>${num(c.pop2024)}</b> people (2024 Census estimate${c.pop2020 ? `, ${pct(c.pop2024, c.pop2020)} since 2020` : ''})` : '',
    c.land_sqmi ? `${num(c.land_sqmi)} square miles of land${c.pop2024 ? ` · ${num(c.pop2024 / c.land_sqmi)} people per square mile` : ''}` : ''
  ].filter(Boolean);

  const body = `
<header class="page">
  <div class="eyebrow">${esc(S.name)} · county ${esc(c.geoid)}</div>
  <h1>${esc(place)}: public records at a glance</h1>
  <div class="src">What national public records say about ${esc(c.name)} — people, schools, health, drinking water, bridges, disaster risk, the jail, federal grants and how to vote — each with its source. ${c.site ? '' : `A full County Commons site (the budget line by line, your tax bill, audits, local offices) isn't built for ${esc(c.name)} yet — not gathered, never hidden.`}</div>
  ${facts.length ? `<p style="margin-top:10px">${facts.join('<br>')}</p>` : ''}
</header>

${c.site ? `<section><div class="issue" style="display:block;border-left:3px solid var(--accent)"><b>${esc(c.name)} has a full County Commons site.</b> <span class="src">The budget line by line, your tax bill explained, audits, local offices and elections: <a href="https://${esc(c.site)}/">${esc(c.site)} →</a></span></div></section>` : ''}
${RK.keyFacts(c, N)}

<section>
<h2>Drinking water <span class="sub">— public water systems serving ${esc(c.name)}</span></h2>
${w && w.systems ? `<p><b>${num(w.systems)}</b> active community water system${w.systems === 1 ? '' : 's'} list ${esc(c.name)} in the area they serve, reporting ${num(w.pop_served)} people served in all (a system that crosses county lines counts its whole population).</p>
<table class="plain"><tbody>${w.top.map(s => `<tr><td>${esc(s.name)}<br><span class="soft" style="font-size:12px">${esc(s.source || '')}${s.pwsid ? ' · ' + esc(s.pwsid) : ''}</span></td><td class="num">${num(s.pop)} served</td></tr>`).join('')}</tbody></table>
<p class="src">Source: <a href="https://www.epa.gov/enviro/sdwis-search" rel="noopener">U.S. EPA Safe Drinking Water Information System (SDWIS)</a>, active community systems, ${esc(N.sources.sdwis_date || '')}. Look up any system's violations and test results with EPA's search using its ID.</p>`
    : `<p>No active community water system lists ${esc(c.name)} in EPA's records — not gathered, never hidden.</p>`}
</section>

<section>
<h2>The jail <span class="sub">— people held in the county jail</span></h2>
${j ? `<p>About <b>${num(j.pop)}</b> people were held in ${esc(c.name)}'s jail, in Vera's latest figure (${esc(j.year)})${j.rate ? `, or ${num(j.rate)} per 100,000 residents ages 15–64` : ''}.${j.prev ? ` In ${esc(j.prev.year)} it was about ${num(j.prev.pop)}.` : ''}</p>
<p class="src">Source: <a href="https://github.com/vera-institute/incarceration-trends" rel="noopener">Vera Institute of Justice, Incarceration Trends</a> (built from federal Bureau of Justice Statistics jail surveys). Counties without their own jail, or that share one, may show no figure.</p>`
    : `<p>No county jail figure in the national data for ${esc(c.name)} — not gathered, never hidden. Some counties share a regional jail or have none.</p>`}
</section>

${B.schools(c, N)}
${B.health(c, N)}
${B.risk(c)}
${B.bridges(c)}
${B.grants(c, N)}

<section>
<h2>Voting</h2>
${el ? `<p><b>${esc(el.name)}: ${esc(el.date_long)}.</b> ${el.lines.map(esc).join(' ')}</p><p class="src">Source: ${el.src.map(s => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>`
    : `<p>Registration deadlines, early voting and polling places for ${esc(S.name)} are on the federal site <a href="https://vote.gov/" rel="noopener">vote.gov</a>, which links to the state's official election office.</p>`}
</section>

<section>
<h2>Not here yet</h2>
<p>The budget, property tax rates, audits, local officials and offices for ${esc(c.name)} come from the county's own records, which we haven't gathered — not gathered, never hidden. <a href="https://clarkar.countycommons.us/">See what a full county site looks like</a>, or ask to have ${esc(c.name)} built: brayden.ozark@gmail.com.</p>
<p class="src">More of ${esc(S.name)}: <a href="/us/${esc(st.toLowerCase())}">the state government and every county in ${esc(S.name)}</a>.</p>
${RK.neighbors(c, N)}
</section>`;

  return page({
    title: `${place}: schools, health, water, bridges, disaster risk, grants and voting · County Commons`,
    description: `${place}${c.pop2024 ? ` (${num(c.pop2024)} people)` : ''}: ${w && w.systems ? `${w.systems} public water systems, ` : ''}${j ? `jail population ${num(j.pop)} (${j.year}), ` : ''}and how to vote — each from official public records, with sources.`,
    canonical, body,
    jsonld: { '@context': 'https://schema.org', '@type': 'AdministrativeArea', name: place, identifier: c.geoid,
      containedInPlace: { '@type': 'State', name: S.name }, url: canonical,
      geo: c.lat ? { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lon } : undefined }
  });
}

function statePage(st) {
  const N = nat();
  const list = (N.byState[st] || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  if (!list.length) return null;
  const S = N.states[st] || { name: st };
  const built = list.filter(c => c.site);
  const I = (N.stateInfo || {})[st] || {};
  const g = I.gov, f = I.fin, el = N.elections && N.elections[st];
  const big = (x) => x >= 1e9 ? '$' + (x / 1e9).toFixed(1).replace(/\.0$/, '') + ' billion' : '$' + (x / 1e6).toFixed(1).replace(/\.0$/, '') + ' million';
  // Census state finances: rows are [label, indent, dollars]. Spending by function
  // is the block under "General expenditure, by function:", checked against
  // the general-expenditure total.
  let money = '';
  if (f) {
    const R = f.rows, get = (l) => { const r = R.find(x => x[0] === l); return r ? r[2] : null; };
    const fi = R.findIndex(x => /by function/.test(x[0]));
    const fns = [];
    for (let i = fi + 1; i < R.length && R[i][1] >= 10; i++) if (R[i][2] !== null) fns.push(R[i]);
    const genExp = (R.filter(x => x[0] === 'General expenditure')[0] || [])[2];
    const fnSum = fns.reduce((s, x) => s + x[2], 0);
    const per = (x) => I.pop2024 ? ` · ${'$' + num(x / I.pop2024)} per resident` : '';
    const taxes = [['Individual income tax', 'Individual Income Taxes'], ['General sales tax', 'General Sales and Gross Receipts Taxes'], ['Selective sales taxes (fuel, tobacco, alcohol and others)', 'Selective Sales and Gross Receipts Taxes'], ['Corporate income tax', 'Corporations Net Income Taxes'], ['License taxes (vehicles, businesses, hunting and others)', 'License Taxes'], ['Property tax (state share)', 'Property Taxes'], ['Other taxes (severance, transfer and others)', 'Other Taxes']]
      .map(([l, k]) => [l, get(k)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    const totalExp = get('Total expenditure'), totalRev = get('Total revenue'), totTax = get('Total Taxes');
    money = `
<section id="money">
<h2>The state's money <span class="sub">— ${esc(S.name)} state government, fiscal ${esc(f.year)}</span></h2>
<p>The state government took in <b>${big(totalRev)}</b> and spent <b>${big(totalExp)}</b>${per(totalExp)}. It owed ${big(get('Debt at end of fiscal year') || 0)} in debt at year's end.</p>
<h3 style="margin-top:12px">Of every $100 it spends</h3>
${fns.slice().sort((a, b) => b[2] - a[2]).map(x => `<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--rule-soft)"><span>${esc(x[0])}</span><span class="num"><b>$${(x[2] / fnSum * 100).toFixed(2)}</b> <span class="soft" style="font-size:12.5px">· ${big(x[2])}</span></span></div>`).join('')}
<p class="src" style="max-width:none">${fnSum === genExp ? `✓ These ${fns.length} functions add to the state's general expenditure, ${big(genExp)}, exactly.` : `These functions add to ${big(fnSum)}; the table's general expenditure is ${big(genExp || 0)}.`} “Public welfare” is mostly Medicaid. Money the state passes to counties, cities and school districts is counted in the function it pays for.</p>
<h3 style="margin-top:12px">Where its money comes from</h3>
<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--rule-soft)"><span><b>Taxes</b></span><span class="num"><b>${big(totTax)}</b></span></div>
${taxes.map(([l, v]) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0 4px 14px;border-bottom:1px solid var(--rule-soft);font-size:14.5px"><span>${esc(l)}</span><span class="num">${big(v)}</span></div>`).join('')}
${[['From other governments (mostly federal aid)', 'Intergovernmental revenue'], ['Charges and fees (tuition, tolls, hospital charges)', 'Current charge'], ['Other general revenue (interest, rents, settlements)', 'Miscellaneous general revenue'], ['Pension and insurance trust earnings and contributions', 'Insurance trust revenue']].map(([l, k]) => get(k) ? `<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--rule-soft)"><span>${esc(l)}</span><span class="num">${big(get(k))}</span></div>` : '').join('')}
<p class="src" style="max-width:none">Source: <a href="${esc(f.table)}" rel="noopener">${esc(f.source)}</a>. These are the state government's own books — counties, cities and school districts are separate.</p>
</section>`;
  } else {
    money = `<section id="money"><h2>The state's money</h2><p>The Census Bureau's state government finance survey covers the 50 states; ${esc(S.name)}'s finances aren't in it — not gathered, never hidden.</p></section>`;
  }
  const agencies = g && g.agencies.length ? `<ul>${g.agencies.map(a => `<li><a href="${esc(a.url)}" rel="noopener">${esc(a.name)}</a></li>`).join('')}</ul>` : '';
  const body = `
<header class="page">
  <div class="eyebrow">County Commons · ${esc(S.name)}</div>
  <h1>${esc(S.name)}: state government and every county</h1>
  <div class="src">The state's own money — what it collects and what it spends on — its official offices, how to vote, and a page for each of its ${list.length} counties. Every number from official public records, with sources.</div>
  ${I.pop2024 ? `<p style="margin-top:10px"><b>${num(I.pop2024)}</b> people (2024 Census estimate${I.pop2020 ? `, ${pct(I.pop2024, I.pop2020)} since 2020` : ''}) · ${list.length} counties</p>` : ''}
</header>
${money}
<section id="government">
<h2>State government <span class="sub">— official sites</span></h2>
${g ? `<p>${g.website ? `Official state website: <a href="${esc(g.website)}" rel="noopener">${esc(g.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''}${g.governor ? `<br>Governor: <a href="${esc(g.governor.url)}" rel="noopener">${esc(g.governor.name)}</a>` : ''}</p>${agencies}<p class="src">Source: <a href="${esc(g.src)}" rel="noopener">USA.gov state government directory</a>.</p>` : `<p>Not gathered yet — not hidden.</p>`}
</section>
<section id="voting">
<h2>Voting</h2>
${el ? `<p><b>${esc(el.name)}: ${esc(el.date_long)}.</b> ${el.lines.map(esc).join(' ')}</p><p class="src">Source: ${el.src.map(s => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>`
    : `<p>Registration deadlines, early voting and polling places are on <a href="https://vote.gov/" rel="noopener">vote.gov</a>, which links to ${esc(S.name)}'s official election office.</p>`}
</section>
${built.length ? `<section><h2>Full County Commons sites in ${esc(S.name)}</h2><p>${built.map(c => `<a href="https://${esc(c.site)}/">${esc(c.name)}</a>`).join(' · ')} — the budget line by line, your tax bill, audits, offices and elections.</p></section>` : ''}
<section id="counties">
<h2>Every county in ${esc(S.name)} <span class="sub">— ${list.length}${built.length ? `; ★ has a full site` : ''}</span></h2>
<ul style="columns:2 220px;padding-left:18px">${list.map(c => `<li><a href="/us/${esc(st.toLowerCase())}/${esc(c.slug)}">${esc(c.name)}</a>${c.site ? ' ★' : ''} <span class="soft" style="font-size:12px">${c.pop2024 ? num(c.pop2024) : ''}</span></li>`).join('')}</ul>
<p class="src"><a href="/us">Every state</a></p>
</section>`;
  const desc = f ? (() => { const R = f.rows, gv = (l) => (R.find(x => x[0] === l) || [])[2]; return `${S.name} state government, fiscal ${f.year}: took in ${big(gv('Total revenue'))}, spent ${big(gv('Total expenditure'))} — by function, from Census records — plus official state offices, voting, and pages for all ${list.length} counties.`; })()
    : `${S.name}: official offices, voting, and public-records pages for all ${list.length} counties.`;
  return page({ title: `${S.name} state government: budget, spending, offices and all ${list.length} counties · County Commons`,
    description: desc, canonical: `https://countycommons.us/us/${st.toLowerCase()}`, body,
    jsonld: { '@context': 'https://schema.org', '@type': 'State', name: S.name, url: `https://countycommons.us/us/${st.toLowerCase()}`, containedInPlace: { '@type': 'Country', name: 'United States' } } });
}

function usPage() {
  const N = nat();
  const sts = Object.keys(N.byState).sort((a, b) => (N.states[a] || {}).name.localeCompare((N.states[b] || {}).name));
  const body = `
<header class="page">
  <div class="eyebrow">County Commons · the United States</div>
  <h1>Every state and county in the United States</h1>
  <div class="src">${num(N.counties.length)} counties and county equivalents, each with a page of national public records — population, drinking water, the county jail and how to vote — and ${N.counties.filter(c => c.site).length} with a full County Commons site. Each state has its own page too: what the state government collects and spends, its official offices, and how to vote. Pick a state.</div>
</header>
<section><ul style="columns:3 160px;padding-left:18px">${sts.map(s => `<li><a href="/us/${esc(s.toLowerCase())}">${esc((N.states[s] || {}).name || s)}</a> <span class="soft" style="font-size:12px">${N.byState[s].length}</span></li>`).join('')}</ul></section>
<section><p class="src">Sources: U.S. Census Bureau (population estimates, gazetteer), U.S. EPA SDWIS (public water systems), Vera Institute of Justice (jail data), and state election offices. Built ${esc(N.generated || '')}.</p></section>`;
  return page({ title: 'Every U.S. state and county: budgets, public records and voting · County Commons',
    description: 'Public records for every county in the United States: population, drinking water systems, county jail figures and how to vote — each cited to its source.',
    canonical: 'https://countycommons.us/us', body });
}

function sitemapUrls() {
  const N = nat();
  const out = ['https://countycommons.us/us'];
  for (const st of Object.keys(N.byState)) {
    out.push(`https://countycommons.us/us/${st.toLowerCase()}`);
    for (const c of N.byState[st]) out.push(`https://countycommons.us/us/${st.toLowerCase()}/${c.slug}`);
  }
  return out;
}

module.exports = { countyPage, statePage, usPage, sitemapUrls };
