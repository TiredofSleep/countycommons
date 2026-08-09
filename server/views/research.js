const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The research shelf: the full citation base for the stance, claim by claim,
// weak spots stated. Companion to /stance (the argument) and /cases (the
// stories); this page is the bibliography.

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
<h2>The shelf in one breath</h2>
<p><b>${esc(research.closing)}</b> <a href="/cases">The evidence library</a> · <a href="/stance">the stance</a>.</p>
</section>`;

  return layout({
    title: `${research.title} — ${county.platform_name}`, current: null, body, county,
    description: 'Every citation behind the stance: the republic\'s room for participation, the trust crisis, transparency-plus-voice evidence, and the failure modes with their design answers.'
  });
}

module.exports = { researchPage };
