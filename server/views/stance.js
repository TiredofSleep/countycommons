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
<h2>The whole stance in one breath</h2>
<p><b>${esc(stance.closing)}</b></p>
</section>`;

  return layout({
    title: `${stance.title} — ${county.platform_name}`, current: null, body, county,
    description: 'The one position this platform holds openly: residents should see the money, speak directly, and be able to check the count — with the evidence behind that belief.'
  });
}

module.exports = { stancePage };
