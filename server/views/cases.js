const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The evidence library: one page per precedent, including the cautionary
// case. Every stance tenet points here; every case cites its sources.

function casesPage(data) {
  const { county, cases } = data;
  const items = cases.cases.map(c => `
<div class="issue" style="display:block">
  <b><a href="/cases/${esc(c.id)}">${esc(c.title)}</a></b>
  <p class="src">${esc(c.place)} · ${esc(c.era)}</p>
  <p style="font-size:13px;margin:4px 0 0">${esc(c.what_it_teaches.split('.')[0])}.</p>
</div>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · the evidence library</div>
  <h1>Where this has been tried</h1>
  <div class="src">${esc(cases.intro)}</div>
</header>
${items}
<p class="src">The argument these cases add up to: <a href="/stance">our stance</a>.</p>`;

  return layout({
    title: `Where this has been tried — ${county.platform_name}`, current: null, body, county,
    description: 'Case studies behind the platform: town meetings, Switzerland, vTaiwan, Porto Alegre, Reykjavik, Barcelona, Stanford, Lahti, a Wisconsin county — and California, the cautionary case.'
  });
}

function casePage(data, c) {
  const { county } = data;
  const body = `
<div class="crumb"><a href="/cases">Evidence library</a></div>
<header class="page">
  <div class="eyebrow">${esc(c.place)} · ${esc(c.era)}</div>
  <h1>${esc(c.title)}</h1>
</header>

<section><h2>What happened</h2><p>${esc(c.what_happened)}</p></section>
<section><h2>What the evidence shows</h2><p>${esc(c.what_evidence_shows)}</p></section>
<section><h2>What it teaches Clark County</h2><p>${esc(c.what_it_teaches)}</p></section>
<section><h2>The honest caveat</h2><p class="src">${esc(c.caveats)}</p></section>
<section><p class="src">Sources: ${c.sources.map(s => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p></section>`;

  return layout({
    title: `${c.title} — ${county.platform_name}`, current: null, body, county,
    description: `${c.place}, ${c.era}: what happened, what the evidence shows, and what it teaches Clark County.`
  });
}

module.exports = { casesPage, casePage };
