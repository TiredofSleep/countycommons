const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The research shelf: a bibliography of published research on civic
// participation and public-budget transparency, findings attributed to the
// studies cited. Companion to /cases (the stories).

function researchPage(data) {
  const { county, research } = data;
  const themes = research.themes.map(t => `
<section>
<h2>${esc(t.claim)}</h2>
<p>${esc(t.summary)}</p>
<p class="src">${t.citations.map(c => `<a href="${esc(c.url)}" rel="noopener">${esc(c.label)}</a>`).join(' · ')}</p>
</section>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · the bibliography</div>
  <h1>${esc(research.title)}</h1>
  <div class="src">${esc(research.intro)}</div>
</header>
${themes}
<section>
<h2>Summary</h2>
<p>${esc(research.closing)} <a href="/cases">The evidence library</a>.</p>
</section>`;

  return layout({
    title: `${research.title} — ${county.platform_name}`, current: null, body, county,
    description: 'Published research on civic participation and public-budget transparency: history, trust, transparency studies, deliberation, participation platforms, and documented problems.'
  });
}

module.exports = { researchPage };
