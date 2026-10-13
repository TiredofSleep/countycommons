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
  <div class="src">What national public records say about ${esc(c.name)} — people, drinking water, the jail, and how to vote — each with its source. ${c.site ? '' : `A full County Commons site (the budget line by line, your tax bill, audits, local offices) isn't built for ${esc(c.name)} yet — not gathered, never hidden.`}</div>
  ${facts.length ? `<p style="margin-top:10px">${facts.join('<br>')}</p>` : ''}
</header>

${c.site ? `<section><div class="issue" style="display:block;border-left:3px solid var(--accent)"><b>${esc(c.name)} has a full County Commons site.</b> <span class="src">The budget line by line, your tax bill explained, audits, local offices and elections: <a href="https://${esc(c.site)}/">${esc(c.site)} →</a></span></div></section>` : ''}

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

<section>
<h2>Voting</h2>
${el ? `<p><b>${esc(el.name)}: ${esc(el.date_long)}.</b> ${el.lines.map(esc).join(' ')}</p><p class="src">Source: ${el.src.map(s => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>`
    : `<p>Registration deadlines, early voting and polling places for ${esc(S.name)} are on the federal site <a href="https://vote.gov/" rel="noopener">vote.gov</a>, which links to the state's official election office.</p>`}
</section>

<section>
<h2>Not here yet</h2>
<p>The budget, property tax rates, audits, local officials and offices for ${esc(c.name)} come from the county's own records, which we haven't gathered — not gathered, never hidden. <a href="https://clarkar.countycommons.us/">See what a full county site looks like</a>, or ask to have ${esc(c.name)} built: brayden.ozark@gmail.com.</p>
<p class="src">More of ${esc(S.name)}: <a href="/us/${esc(st.toLowerCase())}">every county in ${esc(S.name)}</a>.</p>
</section>`;

  return page({
    title: `${place}: population, drinking water, jail and voting — public records · County Commons`,
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
  const built = list.filter(c => c.site).length;
  const body = `
<header class="page">
  <div class="eyebrow">County Commons · ${esc(S.name)}</div>
  <h1>Every county in ${esc(S.name)}</h1>
  <div class="src">${list.length} counties. Each page gathers national public records — population, drinking water systems, the county jail and voting${built ? `; ${built} also ${built === 1 ? 'has' : 'have'} a full County Commons site (★) with the budget line by line` : ''}.</div>
</header>
<section><ul style="columns:2 220px;padding-left:18px">${list.map(c => `<li><a href="/us/${esc(st.toLowerCase())}/${esc(c.slug)}">${esc(c.name)}</a>${c.site ? ' ★' : ''} <span class="soft" style="font-size:12px">${c.pop2024 ? num(c.pop2024) : ''}</span></li>`).join('')}</ul></section>
<section><p class="src"><a href="/us">Every state</a></p></section>`;
  return page({ title: `${S.name} counties: public records for all ${list.length} · County Commons`,
    description: `Public records for every county in ${S.name}: population, drinking water systems, county jail figures and how to vote, each cited.`,
    canonical: `https://countycommons.us/us/${st.toLowerCase()}`, body });
}

function usPage() {
  const N = nat();
  const sts = Object.keys(N.byState).sort((a, b) => (N.states[a] || {}).name.localeCompare((N.states[b] || {}).name));
  const body = `
<header class="page">
  <div class="eyebrow">County Commons · the United States</div>
  <h1>Every county in the United States</h1>
  <div class="src">${num(N.counties.length)} counties and county equivalents, each with a page of national public records — population, drinking water, the county jail and how to vote — and ${N.counties.filter(c => c.site).length} with a full County Commons site. Pick a state.</div>
</header>
<section><ul style="columns:3 160px;padding-left:18px">${sts.map(s => `<li><a href="/us/${esc(s.toLowerCase())}">${esc((N.states[s] || {}).name || s)}</a> <span class="soft" style="font-size:12px">${N.byState[s].length}</span></li>`).join('')}</ul></section>
<section><p class="src">Sources: U.S. Census Bureau (population estimates, gazetteer), U.S. EPA SDWIS (public water systems), Vera Institute of Justice (jail data), and state election offices. Built ${esc(N.generated || '')}.</p></section>`;
  return page({ title: 'Every U.S. county: public records for all 3,000+ · County Commons',
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
