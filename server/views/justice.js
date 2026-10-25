const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Jails and prisons: facts, programs and research — every county gets this page. The shared guide
// (justice-guide.json) carries documented programs elsewhere, the research, the food and land
// section and the legal limits. A county's own section (justice.json) adds its jail's facts.
// Facts only: opinions and proposals live in petitions (/petitions).

function justicePage(data) {
  const { county, justice: j, justiceGuide: g, documents, prisonsNear: pn } = data;
  const docs = new Map(documents.documents.map(d => [d.id, d]));
  const cite = (s) => {
    if (!s) return '';
    const d = s.doc && docs.get(s.doc);
    if (d) return `<a href="/documents#${esc(d.id)}">${esc(d.title)}</a>${s.page ? `, ${esc(s.page)}` : ''}`;
    if (s.url) return `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`;
    return '';
  };
  const cites = (list) => (list || []).map(cite).filter(Boolean).join(' · ');
  const li = (x) => `<li style="font-size:14px">${x.name ? `<b>${esc(x.name)}.</b> ` : ''}${esc(x.text || x.fact)} <span class="src">${cites(x.src)}</span></li>`;

  const local = j ? `
<section id="ours">
<h2>${esc(j.local.title)} <span class="sub">— the facts</span></h2>
<p>${esc(j.local.lead)}</p>
<table class="plain" style="table-layout:fixed;width:100%"><tbody>
${j.local.facts.map(f => `<tr><td style="width:92px"><b>${esc(f.k)}</b></td><td style="overflow-wrap:anywhere">${esc(f.v)}${f.src ? `<br><span class="src">${cites(f.src)}</span>` : ''}</td></tr>`).join('')}
</tbody></table>
</section>` : `
<section id="ours">
<h2>${esc(county.name)}’s jail <span class="sub">— not researched yet</span></h2>
<p>We haven’t pulled ${esc(county.name)}’s jail records yet — not gathered, not hidden. The county budget shows what the jail costs; the programs below are from other places.</p>
</section>`;

  const prisons = pn ? `
<section id="prisons">
<h2>The closest state prisons <span class="sub">— the nearest by straight-line distance</span></h2>
<table class="plain"><tbody>
${pn.nearest.map(x => `<tr><td><a href="${esc(x.url)}" rel="noopener">${esc(x.name)}</a><br><span class="soft" style="font-size:12.5px">${esc(x.city)} · ${esc(x.type)}</span></td><td class="num">${x.miles} miles</td></tr>`).join('')}
</tbody></table>
<p class="src" style="max-width:none">${esc(pn.method)} Sources: ${cites(pn.src)}</p>
</section>` : `
<section id="prisons">
<h2>The closest state prisons</h2>
<p>Not mapped yet for ${esc(county.state)} — not gathered, not hidden.</p>
</section>`;

  const petitionsNote = `
<p style="font-size:14px">Residents have started petitions on ideas like this — see <a href="/petitions">petitions</a>.</p>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · jails and prisons</div>
  <h1>Jails and prisons: facts, programs and research</h1>
  <div class="src">${esc(g.intro)} Updated ${esc((j && j.updated) || g.updated)}.</div>
</header>

<section id="why">
<h2>Key facts on jail deaths and release</h2>
<ul>${g.why.map(li).join('')}</ul>
</section>
${local}
${require("../lib/national").jailBlock(require("../lib/national").forCounty(county))}
${prisons}
${petitionsNote}

<section id="world">
<h2>Programs in other places</h2>
${g.ideas.map(grp => `
<h3 style="margin-top:16px">${esc(grp.group)}</h3>
<ul>${grp.items.map(li).join('')}</ul>`).join('')}
</section>

<section id="food">
<h2>${esc(g.food.title)}</h2>
<p>${esc(g.food.lead)}</p>
<ul>${g.food.items.map(li).join('')}</ul>
</section>

<section id="evidence">
<h2>Research on education and work</h2>
<ul>${g.evidence.map(li).join('')}</ul>
<p style="font-size:14px">${esc(g.jails.text)} <span class="src">${cites(g.jails.src)}</span></p>
</section>

<section id="lines">
<h2>Legal limits and history</h2>
<ul>${g.edges.map(li).join('')}</ul>
<p class="src">Related: <a href="/commonwealth">Commonwealth</a> · <a href="/growops">Grow-ops</a> · <a href="/water">Our water</a>. This page shows facts and sourced research. Petitions on these topics are at <a href="/petitions">/petitions</a>. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `Jails and prisons: facts, programs and research — ${county.platform_name}`, current: '/justice', body, county,
    description: `${county.name}'s jail facts, documented programs in other places, food and land programs, and the research on education and work — every figure sourced.`
  });
}

module.exports = { justicePage };
