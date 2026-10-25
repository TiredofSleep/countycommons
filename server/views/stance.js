const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// How this site works: what the platform does and does not do, what a result
// means, how counts and privacy work, and where the method has been used. It
// describes the platform; it argues nothing. Opinions live only in petitions.

function stancePage(data) {
  const { county, stance } = data;

  const defs = stance.definitions.map(d => `
<div class="issue" style="display:block">
  <b style="font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em">${esc(d.word)}</b>
  <p style="font-size:13.5px;margin:6px 0 0">${esc(d.meaning)}</p>
</div>`).join('');

  const tenets = stance.tenets.map((t, i) => `
<section>
<h2>${i + 1} · ${esc(t.claim)}</h2>
<p>${esc(t.evidence)}</p>
<p class="src">Sources: ${t.sources.map(s =>
    `<a href="${esc(s.url)}"${s.url.startsWith('/') ? '' : ' rel="noopener"'}>${esc(s.label)}</a>`).join(' · ')}</p>
</section>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · how this site works</div>
  <h1>${esc(stance.title)}</h1>
  <div class="src">${esc(stance.preamble)}</div>
</header>

<section>
<h2>${esc(stance.definitions_title || 'What the words mean on this platform')}</h2>
${defs}
</section>

${tenets}

<section>
<h2>${esc(stance.tradition_title || 'Background reading')}</h2>
${(stance.tradition || []).map(t => `
<div class="issue" style="display:block">
  <b>${esc(t.thinker)}</b>
  <p style="font-size:13.5px;margin:6px 0 4px">${esc(t.idea)}</p>
  <p class="src">Source: <a href="${esc(t.source.url)}" rel="noopener">${esc(t.source.label)}</a></p>
</div>`).join('')}
</section>

<section>
<h2>${esc(stance.counterarguments_title || 'Known limits of this method')}</h2>
${(stance.counterarguments || []).map(c => `
<div class="issue" style="display:block">
  <b>${esc(c.objection)}</b>
  <p style="font-size:13.5px;margin:6px 0 0">${esc(c.answer)}</p>
</div>`).join('')}
</section>

<section>
<h2>The evidence library</h2>
<p>Each case has its own page — what happened, what the evidence shows, and the caveat: <a href="/cases">where this has been tried</a>. The complete bibliography, claim by claim with weak spots stated, is <a href="/research">the research shelf</a>.</p>
</section>

<section>
<h2>Where opinions go</h2>
<p>${esc(stance.closing)} See <a href="/petitions">petitions</a>.</p>
</section>`;

  return layout({
    title: `${stance.title} — ${county.platform_name}`, current: null, body, county,
    description: 'How County Commons counts, verifies and publishes results: what the site does and does not do, what a result means, and what is public.'
  });
}

module.exports = { stancePage };
