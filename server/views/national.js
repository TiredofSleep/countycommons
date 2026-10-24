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

// Help keep this honest — on every national page too.
function honestBand(canonical) {
  const here = String(canonical || '').replace(/^https?:\/\/[^/]+/, '') || '/us';
  if (/^\/us\/(feedback|building)/.test(here)) return '';
  const btn = 'font-family:var(--mono);font-size:13.5px;font-weight:600;padding:8px 12px;border:1.5px solid var(--ink);color:var(--ink);background:var(--paper);text-decoration:none;white-space:nowrap';
  const fb = (k) => `/us/feedback?kind=${k}&from=${encodeURIComponent(here)}`;
  let last = null; try { last = require('../lib/building').lastUpdated(); } catch (e) { /* no history */ }
  return `<aside aria-label="Help keep this honest" style="border:1.5px dashed var(--ink);padding:14px 16px;margin:18px 0 0">
  <div style="font-family:var(--mono);font-weight:600;font-size:15px">Help keep this honest</div>
  <p class="src" style="margin:4px 0 10px;max-width:62ch">See something wrong, out of date, or missing on this page? Tell us — a person reads every note, and fixes are logged in public. County Commons is built out furthest for Clark County, Arkansas, but it’s for every county, and we build more for any county on request.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><a href="${fb('correction')}" style="${btn}">Correct something</a><a href="${fb('add')}" style="${btn}">Add information</a><a href="${fb('document')}" style="${btn}">Send a document</a><a href="${fb('request')}" style="${btn}">Request more for this county</a><a href="/us/building" style="${btn};border-style:dashed">What's new${last ? ` · updated ${esc(last)}` : ''}</a></div>
</aside>`;
}

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
${honestBand(canonical)}
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
  const QA = require('../lib/national-local').faq(c);
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
${petitionsBlock(S.name, `/us/${st.toLowerCase()}/${slug}`, c.name, c.geoid, c.site)}
${require('../lib/national-local').finance(c)}
${require('../lib/national-local').audit(c)}
${require('../lib/national-local').proptax(c)}
${require('../lib/national-local').labor(c)}

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
${B.housing(c)}
${B.grants(c, N)}
${B.arpa(c)}
${B.places(c)}
${require('../lib/national-local').libraries(c)}
${require('../lib/national-local').healthAccess(c)}
${require('../lib/peers').block(c, N, { more: '/us/what-works' })}
${require('./whatworks').improveBlock(c, N, { more: '/us/what-works' })}

${require('../lib/national-local').faqSection(QA, c)}
${B.voting(S.name, c.name)}

<section>
<h2>Not here yet — ask for it</h2>
<p>The budget line by line, property tax rates, audits, local officials and offices for ${esc(c.name)} come from the county's own records, which we haven't gathered yet — not gathered, never hidden. County Commons is built out furthest for <a href="https://clarkar.countycommons.us/">Clark County, Arkansas</a> — see what a full county site looks like — but it's for every county, and we build more on request. <a href="/us/feedback?kind=request&from=${encodeURIComponent('/us/' + st.toLowerCase() + '/' + c.slug)}"><b>Request a full site for ${esc(c.name)}</b></a> — each request is counted, and the most-requested counties go first.</p>
<p class="src">More of ${esc(S.name)}: <a href="/us/${esc(st.toLowerCase())}">the state government and every county in ${esc(S.name)}</a>.</p>
${RK.neighbors(c, N)}
</section>`;

  return page({
    title: `${place}: county spending, property tax, audit, jobs, schools, health, ARPA and voting · County Commons`,
    description: (() => { const sm = require('../lib/national-local').summary(c); return `${place}${c.pop2024 ? ` (${num(c.pop2024)} people)` : ''}: ${sm ? sm + ' — plus ' : ''}schools, health, water, the jail, petitions and how to vote, from official public records with sources.`; })(),
    canonical, body,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'AdministrativeArea', name: place, identifier: c.geoid,
      containedInPlace: { '@type': 'State', name: S.name }, url: canonical,
      geo: c.lat ? { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lon } : undefined }, require('../lib/national-local').faqLd(QA)].filter(Boolean)
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
${petitionsBlock(S.name, null, null)}
${B.voting(S.name)}
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

function whatWorksPage() {
  const N = nat();
  const body = `
<header class="page">
  <div class="eyebrow">County Commons · the United States</div>
  <h1>What has worked: local options with a track record</h1>
  <div class="src">Overdose deaths, the uninsured, doctor shortages, child poverty, hunger, housing, jails, bridges, broadband, jobs, schools, water, disaster losses and voter turnout — for each, approaches that cities, counties, schools and health departments have tried and evaluators have measured. Every county page shows how it compares with counties like it, and the options for where it's furthest behind.</div>
</header>
${require('./whatworks').fullBody(null, N)}`;
  return page({ title: 'What works for local government: evidence-rated options on overdoses, health, poverty, housing, jails and more · County Commons',
    description: 'Local options with a measured track record — naloxone, crisis teams, tutoring, pretrial reminders, home visiting, hazard mitigation and more — with each clearinghouse rating, where it was done, and its limits.',
    canonical: 'https://countycommons.us/us/what-works', body });
}

function usPage() {
  const N = nat();
  const sts = Object.keys(N.byState).sort((a, b) => (N.states[a] || {}).name.localeCompare((N.states[b] || {}).name));
  const body = `
<header class="page">
  <div class="eyebrow">County Commons · the United States</div>
  <h1>Every state and county in the United States</h1>
  <div class="src">${num(N.counties.length)} counties and county equivalents, each with a page of national public records — population, drinking water, the county jail and how to vote — and ${N.counties.filter(c => c.site).length} with a full County Commons site — built out furthest for <a href="https://clarkar.countycommons.us/">Clark County, Arkansas</a>. It's for every county, and we build more for any county on request: <a href="/us/feedback?kind=request&from=/us">ask for yours</a>; the <a href="/us/building#requested">most-requested</a> go next. Each state has its own page too: what the state government collects and spends, its official offices, and how to vote. Pick a state.</div>
</header>
<section><ul style="columns:3 160px;padding-left:18px">${sts.map(s => `<li><a href="/us/${esc(s.toLowerCase())}">${esc((N.states[s] || {}).name || s)}</a> <span class="soft" style="font-size:12px">${N.byState[s].length}</span></li>`).join('')}</ul></section>
<section><p class="src">Sources: U.S. Census Bureau (population estimates, gazetteer), U.S. EPA SDWIS (public water systems), Vera Institute of Justice (jail data), and state election offices. Built ${esc(N.generated || '')}.</p></section>`;
  return page({ title: 'Every U.S. state and county: budgets, public records and voting · County Commons',
    description: 'Public records for every county in the United States: population, drinking water systems, county jail figures and how to vote — each cited to its source.',
    canonical: 'https://countycommons.us/us', body });
}

function sitemapUrls() {
  const N = nat();
  const out = ['https://countycommons.us/us', 'https://countycommons.us/us/what-works'];
  for (const st of Object.keys(N.byState)) {
    out.push(`https://countycommons.us/us/${st.toLowerCase()}`);
    for (const c of N.byState[st]) out.push(`https://countycommons.us/us/${st.toLowerCase()}/${c.slug}`);
  }
  return out;
}

// The national pages' own drop-box and "still building" page (same private
// store and public fix log as the county sites).
const KINDS = { correction: 'Correct something', add: 'Add information', document: 'Send a document', request: 'Request a full site for a county', problem: 'Something’s broken' };
function feedbackPage({ from, kind, sent, error }) {
  kind = KINDS[kind] ? kind : 'correction';
  const f = 'font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);width:100%;box-sizing:border-box';
  const body = sent ? `<header class="page"><div class="eyebrow">County Commons · help keep this honest</div><h1>Got it — thank you</h1><div class="src">A person reads every note. When one leads to a fix, it’s logged on <a href="/us/building">what’s new</a>.</div></header><section><p><a href="${esc(sent)}">Back to where you were</a></p></section>`
    : `<header class="page"><div class="eyebrow">County Commons · help keep this honest</div><h1>${esc(KINDS[kind])}</h1><div class="src">These pages are built from national public records, and they’re still being built. If something’s wrong, out of date or missing for your county or state, you’re the best fact-checker we have.</div></header>
<section><form method="POST" action="/us/feedback" style="max-width:600px;display:flex;flex-direction:column;gap:14px">
${error ? `<p class="src" style="color:var(--dead)"><b>${esc(error)}</b></p>` : ''}
<fieldset style="border:0;padding:0;margin:0;display:flex;gap:8px;flex-wrap:wrap"><legend class="src" style="margin-bottom:6px">What kind of note?</legend>${Object.entries(KINDS).map(([k, v]) => `<label style="font-size:14px;border:1.5px solid var(--ink);padding:6px 10px"><input type="radio" name="kind" value="${k}"${k === kind ? ' checked' : ''}> ${esc(v)}</label>`).join('')}</fieldset>
<label>What should change, or what’s missing?<textarea name="message" required maxlength="5000" rows="6" style="${f};margin-top:6px;font-family:inherit;font-size:15px"></textarea></label>
<label>Where can we check? <span class="src">(a link to the record or document)</span><input name="source" maxlength="500" style="${f};margin-top:6px"></label>
<label>Which page?<input name="page" value="${esc(from || '')}" maxlength="300" style="${f};margin-top:6px"></label>
<label>How to reach you <span class="src">(optional)</span><input name="contact" maxlength="200" style="${f};margin-top:6px"></label>
<label style="display:flex;gap:8px;align-items:center;font-size:14px;flex-wrap:wrap"><input type="checkbox" name="credit" value="1"> <span>Credit me by name if it leads to a fix:</span> <input name="credit_name" maxlength="80" style="${f};width:auto;flex:1;min-width:160px"></label>
<input type="text" name="website" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:1px;width:1px;overflow:hidden">
<button type="submit" style="font-family:var(--mono);font-size:15px;padding:11px 20px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);align-self:flex-start">Send it</button></form>
<p class="src" style="max-width:62ch">Saved privately on our own server and read by a person; never published or shared. A note is a lead, not an edit — we check it against the record first. Rather email? brayden.ozark@gmail.com.</p></section>`;
  return page({ title: `${KINDS[kind]} · County Commons`, description: 'Correct something, add missing information, or send a document for any county page. A person reads every note.', canonical: 'https://countycommons.us/us/feedback', body });
}
function buildingPage() {
  const B = require('../lib/building');
  const fixes = B.corrections().slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const ups = B.updates().slice(0, 50), notes = B.noteStats();
  const byDay = []; for (const u of ups) { const g = byDay[byDay.length - 1]; if (g && g.date === u.date) g.items.push(u.what); else byDay.push({ date: u.date, items: [u.what] }); }
  const body = `<header class="page"><div class="eyebrow">County Commons · still building</div><h1>Still building — what’s new, and what readers helped fix</h1><div class="src">A small, independent project built in public, one record at a time.${ups.length ? ` Last update: <b>${esc(ups[0].date)}</b>.` : ''} <a href="/us/feedback?kind=correction&from=/us/building">Help keep it honest</a>.</div></header>
<section id="requested">
<h2>Built for every county <span class="sub">— the most-requested go next</span></h2>
<p>County Commons is built out furthest for <a href="https://clarkar.countycommons.us/">Clark County, Arkansas</a>: the budget line by line, audits, petitions, offices and more. Every U.S. county has a starting page, and we build more for any county on request. Each request is counted here; the counties with the most requests get built next.</p>
${(() => { const rows = B.requestRows(); return rows.length ? `<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>County</th><th class="num">Requests</th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="${esc(r.url)}">${esc(r.label)}</a></td><td class="num">${r.n}</td></tr>`).join('')}</tbody></table></div>` : '<p class="src">No requests yet — yours would be the first.</p>'; })()}
<p><a href="/us/feedback?kind=request&from=/us/building" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:9px 14px;border:1.5px solid var(--ink);color:var(--ink);background:var(--card);text-decoration:none">Request more for a county</a></p>
</section>
<section><h2>Fixed thanks to readers <span class="sub">— ${fixes.length}</span></h2>${fixes.length ? fixes.map(x => `<p><b>${esc(x.date)}</b> — ${esc(x.what)} <span class="src">${x.page ? esc(x.page) : ''}${x.credit ? ` · thanks to ${esc(x.credit)}` : ''}</span></p>`).join('') : '<p>None yet — the first one could be yours.</p>'}<p class="src">Notes received across all sites: ${notes.total}. Counts only; notes stay private.</p></section>
<section><h2>Recent updates</h2>${byDay.map(g => `<p style="margin:12px 0 2px"><b>${esc(g.date)}</b></p><ul style="margin:0 0 0 18px">${g.items.map(w => `<li>${esc(w)}</li>`).join('')}</ul>`).join('')}<p class="src">From the project’s public change history: <a href="https://github.com/TiredofSleep/countycommons" rel="noopener">github.com/TiredofSleep/countycommons</a>.</p></section>`;
  return page({ title: 'Still building: what’s new on County Commons', description: 'What changed lately on County Commons, and the corrections readers sent in.', canonical: 'https://countycommons.us/us/building', body });
}

// "/us/ar/clark" -> { name: "Clark County, Arkansas", url: "/us/ar/clark" }
function countyByGeoid(geoid) { const N = nat(); if (!N._byGeo) { N._byGeo = {}; for (const c of N.counties) N._byGeo[c.geoid] = c; } const c = N._byGeo[geoid]; return c ? { name: c.name, state: (N.states[c.st] || {}).name || c.st, path: `/us/${c.st.toLowerCase()}/${c.slug}`, site: c.site || null } : null; }
function countyName(st, slug) { const N = nat(); const c = (N.byState[String(st).toUpperCase()] || []).find(x => x.slug === slug); return c ? `${c.name}, ${(N.states[c.st] || {}).name || c.st}` : null; }

// Petitions anyone can sign from a national page: the national ones and this
// state's. County-level asks need a full county site (someone has to carry
// them to the county's own meeting), so those are offered as a request.
function petitionsBlock(stateName, countyPath, countyLabel, geoid, site) {
  const P = require('../priorities');
  const local = geoid ? P.listByLevel({ tenant: 'us:' + geoid, level: 'county' }) : [];
  const nat = P.listByLevel({ level: 'national' });
  const st = stateName ? P.listByLevel({ level: 'state', state: stateName }) : [];
  if (!nat.length && !st.length) return '';
  const from = countyPath ? `?from=${encodeURIComponent(countyPath)}` : '';
  const li = (p, goal) => `<div class="issue" style="display:block"><a href="/us/petitions/${esc(p.id)}${from}" style="color:inherit;text-decoration:none"><b>${esc(p.title)}</b></a><p class="src" style="margin:4px 0 0">${p.support.toLocaleString('en-US')} signed · goal ${goal.toLocaleString('en-US')} · <a href="/us/petitions/${esc(p.id)}${from}#sign">Read and sign →</a></p></div>`;
  return `
<section id="petitions">
<h2>Petitions you can sign${countyLabel ? ` from ${esc(countyLabel)}` : ''} <span class="sub">— counted by county, delivered at the goal</span></h2>
${local.length ? `<h3 style="margin-top:6px">${esc(countyLabel)} <span class="sub">— to ${esc(local[0].to || 'the county’s governing body')}</span></h3>${local.map(p => li(p, p.goal || 100)).join('')}` : ''}
${site ? `<p class="src" style="max-width:none">${esc(countyLabel)} has a full County Commons site with more petitions to its own officials: <a href="https://${esc(site)}/petitions">${esc(site)}/petitions</a>.</p>` : ''}
${st.length ? `<h3 style="margin-top:6px">All of ${esc(stateName)} <span class="sub">— to ${esc(stateName)} lawmakers and the governor</span></h3>${st.map(p => li(p, 2500)).join('')}` : ''}
${nat.length ? `<h3 style="margin-top:10px">Nationwide <span class="sub">— to Congress</span></h3>${nat.map(p => li(p, 5000)).join('')}` : ''}
<p class="src" style="max-width:none">Signatures are counted by the county they come from, so lawmakers can see where people want it. More county petitions — camera rules, court-date reminders, meetings online — run on full county sites, where someone can carry them to the county’s own meeting.${countyPath && !site ? ` <a href="/us/feedback?kind=request&from=${encodeURIComponent(countyPath)}">Request a full site${countyLabel ? ` for ${esc(countyLabel)}` : ''}</a>.` : ''}</p>
</section>`;
}

// The sign page for a state or national petition, on the national pages.
function usPetitionPage(p, { from, mine, signed, error }) {
  const P = require('../priorities');
  const r = p.campaign ? P.campaignRollup(p.campaign) : null;
  const isCounty = p.level === 'county';
  const home = isCounty ? countyByGeoid(String(p.tenant).slice(3)) : null;
  if (home) from = home.path; // a county petition is signed by that county's residents
  const to = isCounty ? (p.to || 'the county’s governing body') : p.level === 'national' ? 'your members of Congress' : `${p.state} state legislators and the governor`;
  const goal = isCounty ? (p.goal || 100) : p.level === 'national' ? 5000 : 2500;
  const m = /^\/us\/([a-z]{2})\/([a-z0-9-]+)$/.exec(from || '');
  const fromName = m ? countyName(m[1], m[2]) : null;
  const link = `https://countycommons.us/us/petitions/${p.id}`;
  const places = r ? r.bySite.map(([k, n]) => [require('./petitions').placeName(k), n]).filter(([k]) => k).slice(0, 15) : [];
  const pct = Math.min(100, Math.round(p.support / goal * 100));
  const f = 'font-size:16px;padding:8px;width:100%;box-sizing:border-box';
  const btn = 'font-family:var(--mono);font-size:14px;font-weight:600;padding:8px 14px;border:1.5px solid var(--ink);color:var(--ink);text-decoration:none';
  const err = { name: 'Please add your name — like signing a paper petition.', town: 'Please add your town.', county: 'Please pick the county you live in from a county page.', junk: 'That didn’t look like a real signature.' }[error] || '';
  const body = `
<header class="page"><div class="eyebrow">County Commons · ${isCounty && home ? esc(home.name + ', ' + home.state) + ' petition' : p.level === 'national' ? 'national petition' : esc(p.state) + ' petition'}</div>
<h1>${esc(p.title)}</h1>
<div class="src" style="font-size:15px">A petition to <b>${esc(to)}</b>, started by ${esc(p.by || 'a resident')}.</div></header>
<section>
<p><b>${p.support.toLocaleString('en-US')}</b> of <b>${goal.toLocaleString('en-US')}</b> signatures · ${pct}%</p>
<div style="background:var(--rule);height:11px;border-radius:3px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--accent)"></div></div>
<p class="src">At ${goal.toLocaleString('en-US')} signatures it’s printed, with the count by ${isCounty ? 'town' : 'county'}, and ${isCounty ? `sent by mail and email to ${esc(to)}` : `delivered to the offices of ${esc(to)}`} — and their answer is posted here.</p>
${places.length ? `<p class="src" style="max-width:none">Signed from: ${places.map(([k, n]) => `${esc(k)} <b>${n}</b>`).join(' · ')}</p>` : ''}
<h2>Why it matters</h2><p style="white-space:pre-line">${esc(p.why)}</p>
</section>
<section id="sign">
${mine ? `<p><b>✓ You’ve signed this petition.</b> ${signed ? 'Thank you — now pass it on.' : ''}</p>` : `
<h2>Sign${fromName ? ` from ${esc(fromName)}` : ''}</h2>
${err ? `<p class="src" style="color:var(--dead)">${esc(err)}</p>` : ''}
${fromName ? `<form method="post" action="/us/petitions/${esc(p.id)}/sign" style="display:grid;gap:8px;max-width:520px">
  <input type="hidden" name="from" value="${esc(from)}">
  <label><b>Your name</b><input name="name" required maxlength="60" autocomplete="name" style="${f}"></label>
  <label><b>Your town</b> <span class="soft">(in ${esc(fromName)})</span><input name="town" required maxlength="60" autocomplete="address-level2" style="${f}"></label>
  <label>Email <span class="soft">(optional — to hear when it’s delivered and answered)</span><input name="email" type="email" maxlength="120" style="${f}"></label>
  <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="deliver" value="1" style="margin-top:4px"> <span>Put my name and town on the copy delivered to officials. <span class="soft">(Unchecked: counted by county only.)</span></span></label>
  <div style="position:absolute;left:-9999px" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
  <button type="submit" style="justify-self:start;font-family:var(--mono);font-size:16px;font-weight:600;padding:12px 22px;background:var(--ink);color:var(--paper);border:0">Sign the petition</button>
  <p class="src" style="margin:0">Your name, town and email are never shown on this site, sold or shared. The public sees only how many signed and from which counties.</p>
</form>` : `<p>To sign, start from your county’s page so your signature counts for your county: <a href="/us">find your county</a>.</p>`}`}
</section>
<section id="share">
<h2>Share it</h2>
<div style="display:flex;gap:8px;flex-wrap:wrap"><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link + '?via=fb')}" rel="noopener" style="${btn};background:var(--ink);color:var(--paper)">Share on Facebook</a><a href="sms:?&body=${encodeURIComponent('Sign: ' + p.title + ' ' + link + '?via=text')}" style="${btn}">Text it</a><a href="mailto:?subject=${encodeURIComponent('Sign: ' + p.title)}&body=${encodeURIComponent(link + '?via=email')}" style="${btn}">Email it</a></div>
<p class="src" style="max-width:none">This is a petition to elected officials. It doesn’t put anything on the ballot. Signatures are counted, not verified — one per browser — and the delivered copy removes duplicates. ${p.campaign ? `<a href="https://clarkar.countycommons.us/petitions/shared/${esc(p.campaign)}">Every place it’s open</a> · ` : ''}<a href="/us">Every county</a></p>
</section>`;
  return page({ title: `Sign: ${p.title} · County Commons`, description: p.support < 5 ? `A petition to ${to}. Be one of the first to sign — counted by county, delivered at ${goal.toLocaleString('en-US')} signatures.` : `${p.support.toLocaleString('en-US')} people have signed this petition to ${to}. Goal: ${goal.toLocaleString('en-US')}.`, canonical: link, body });
}

module.exports = { countyByGeoid, petitionsBlock, usPetitionPage, countyName, feedbackPage, buildingPage, countyPage, statePage, usPage, whatWorksPage, sitemapUrls };
