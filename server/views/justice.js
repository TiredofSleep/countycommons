const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// From holding to building — every county gets this page. The shared guide
// (justice-guide.json) carries the world's working ideas, the evidence, the food
// and land section, the guardrails, and the hard edges. A county's own section
// (justice.json) adds its jail's facts and labeled proposals once researched.
// Facts stay neutral; proposals are named as proposals; residents decide.

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
<p>We haven’t pulled ${esc(county.name)}’s jail records yet — not gathered, not hidden. The county budget shows what the jail costs; the ideas below apply anywhere.</p>
</section>`;

  const prisons = pn ? `
<section id="prisons">
<h2>The closest state prisons <span class="sub">— the nearest by distance (the state assigns prisons by classification, not distance)</span></h2>
<table class="plain"><tbody>
${pn.nearest.map(x => `<tr><td><a href="${esc(x.url)}" rel="noopener">${esc(x.name)}</a><br><span class="soft" style="font-size:12.5px">${esc(x.city)} · ${esc(x.type)}</span></td><td class="num">${x.miles} miles</td></tr>`).join('')}
</tbody></table>
<p class="src" style="max-width:none">${esc(pn.method)} Sources: ${cites(pn.src)}</p>
</section>` : `
<section id="prisons">
<h2>The closest state prisons</h2>
<p>Not mapped yet for ${esc(county.state)} — not gathered, not hidden.</p>
</section>`;

  const proposals = j && j.proposals ? `
<section id="proposals">
<h2>Our proposals <span class="sub">— proposed by County Commons</span></h2>
${j.proposals.map(p => `
<div class="issue" style="display:block;border-left:3px solid var(--accent);margin-bottom:12px">
  <b style="font-size:17px">${esc(p.title)}</b>
  <p>${esc(p.summary)}</p>
  ${p.why_here ? `<p style="font-size:14px"><b>Why here:</b> ${esc(p.why_here)}</p>` : ''}
  ${p.math ? `<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${p.math.map(r => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>` : ''}
  ${p.limits ? `<p style="font-size:14px;margin-bottom:4px"><b>The honest limits:</b></p><ul>${p.limits.map(x => `<li style="font-size:14px">${esc(x)}</li>`).join('')}</ul>` : ''}
  ${p.first_step ? `<p style="font-size:14px"><b>First step:</b> ${esc(p.first_step)}</p>` : ''}
  ${p.src ? `<p class="src" style="max-width:none">${cites(p.src)}</p>` : ''}
  ${p.ask ? `<p><a href="${esc(p.ask.href)}">${esc(p.ask.label)} →</a></p>` : ''}
</div>`).join('')}
<p class="src" style="max-width:none">These are proposals, labeled as ones. The facts above stand on their own; what to do is for residents and the people they elect to decide.</p>
</section>` : '';

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · from holding to building</div>
  <h1>From holding to building</h1>
  <div class="src">${esc(g.intro)} Updated ${esc((j && j.updated) || g.updated)}.</div>
</header>

<section id="why">
<h2>Why it matters</h2>
<ul>${g.why.map(li).join('')}</ul>
</section>
${local}
${prisons}
${proposals}

<section id="world">
<h2>What works around the world <span class="sub">— and what each is good for</span></h2>
${g.ideas.map(grp => `
<h3 style="margin-top:16px">${esc(grp.group)}</h3>
<ul>${grp.items.map(li).join('')}</ul>`).join('')}
</section>

<section id="food">
<h2>${esc(g.food.title)} <span class="sub">— how the land pays the community back</span></h2>
<p>${esc(g.food.lead)}</p>
<ul>${g.food.items.map(li).join('')}</ul>
</section>

<section id="evidence">
<h2>The evidence on education and work</h2>
<ul>${g.evidence.map(li).join('')}</ul>
<p style="font-size:14px">${esc(g.jails.text)} <span class="src">${cites(g.jails.src)}</span></p>
</section>

<section id="lines">
<h2>The lines that keep it honest</h2>
<ul>${g.guardrails.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p style="font-size:14px;margin-bottom:4px"><b>The hard edges:</b></p>
<ul>${g.edges.map(li).join('')}</ul>
<p class="src">Related: <a href="/commonwealth">Commonwealth</a> · <a href="/growops">Grow-ops</a> · <a href="/water">Our water</a>. This page shows facts, evidence, and labeled proposals; it doesn’t decide for anyone. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `From holding to building — ${county.platform_name}`, current: '/justice', body, county,
    description: `Jails that give people something to do: ${county.name}'s jail facts, what works around the world, food and land that pay the community back, and labeled proposals — every figure sourced.`
  });
}

module.exports = { justicePage };
