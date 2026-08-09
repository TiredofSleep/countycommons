const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The platform's one open position: the process itself. Every tenet carries
// its evidence and sources; the definitions fence the stance off from issue
// advocacy (direct ≠ binding; results are signal, officials decide).

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
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · what this platform stands for</div>
  <h1>${esc(stance.title)}</h1>
  <div class="src">${esc(stance.preamble)}</div>
</header>

<section>
<h2>Three words, defined honestly <span class="sub">— so nobody has to guess what we mean</span></h2>
${defs}
</section>

${tenets}

<section>
<h2>The tradition we stand in <span class="sub">— three thinkers who did the homework</span></h2>
${(stance.tradition || []).map(t => `
<div class="issue" style="display:block">
  <b>${esc(t.thinker)}</b>
  <p style="font-size:13.5px;margin:6px 0 4px">${esc(t.idea)}</p>
  <p class="src">Source: <a href="${esc(t.source.url)}" rel="noopener">${esc(t.source.label)}</a></p>
</div>`).join('')}
</section>

<section>
<h2>The honest counterarguments <span class="sub">— a stance that hides its objections is a pitch</span></h2>
${(stance.counterarguments || []).map(c => `
<div class="issue" style="display:block">
  <b>"${esc(c.objection)}"</b>
  <p style="font-size:13.5px;margin:6px 0 0">${esc(c.answer)}</p>
</div>`).join('')}
</section>

<section>
<h2>The evidence library <span class="sub">— every precedent, in depth</span></h2>
<p>Each case behind this stance has its own page — what happened, what the evidence shows, what it teaches this county, and the honest caveat: <a href="/cases">where this has been tried</a>. And the complete bibliography — every citation, claim by claim, weak spots stated — is <a href="/research">the research shelf</a>.</p>
</section>

<section>
<h2>The whole stance in one breath</h2>
<p><b>${esc(stance.closing)}</b></p>
</section>`;

  return layout({
    title: `${stance.title} — ${county.platform_name}`, current: null, body, county,
    description: 'The one position this platform holds openly: residents should see the money, speak directly, and be able to check the count — with the evidence behind that belief.'
  });
}

module.exports = { stancePage };
