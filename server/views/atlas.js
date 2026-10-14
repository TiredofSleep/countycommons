const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const nat = require('../lib/national');
const B = require('../lib/national-blocks');

// Your county by the numbers: the national-data layers (schools, health,
// disaster risk, bridges, federal grants) for a County Commons site, the same
// blocks its countycommons.us/us page shows.
function atlasPage(data) {
  const { county } = data;
  const c = nat.forCounty(county);
  const N = nat.meta();
  const body = c ? `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · by the numbers</div>
  <h1>${esc(c.name)} by the numbers</h1>
  <div class="src">Schools, health, disaster risk, bridges and federal grants for ${esc(c.name)}, from national public records — each with its source. ${county.name !== c.name ? `${esc(county.name)} sits in ${esc(c.name)}, so these figures are countywide. ` : ''}The same page for every U.S. county is at <a href="${esc(c.url)}">countycommons.us/us</a>.</div>
</header>
${require('../lib/national-ranks').keyFacts(c, N)}
${B.schools(c, N)}
${B.health(c, N)}
${B.risk(c)}
${B.bridges(c)}
${B.housing(c)}
${B.grants(c, N)}
${B.arpa(c)}
${B.places(c)}
<section><p class="src">Related: <a href="/budget">The money trail</a> · <a href="/mybill">Your tax bill, explained</a> · <a href="/water">Water</a> · <a href="/justice">Jails & prisons</a> · <a href="/grants">Grants</a>. Spot an error? <a href="/feedback">Report it</a>.</p></section>`
    : `
<header class="page"><div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · by the numbers</div><h1>By the numbers</h1>
<div class="src">National county figures aren't matched to ${esc(county.name)} yet — not gathered, never hidden.</div></header>`;
  return layout({
    title: `${county.name}, ${county.state} by the numbers: schools, health, rent, disaster risk, bridges and grants · County Commons`,
    current: '/atlas', body, county,
    description: c ? `${c.name}, ${county.state}: school district budgets and spending per student, health and broadband, FEMA disaster risk, bridge conditions and federal grants — from national public records.` : undefined
  });
}

module.exports = { atlasPage };
