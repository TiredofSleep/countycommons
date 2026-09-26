const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Water — every county gets this page. The local section (water.json) appears
// once a county's own system is researched; until then the page says so plainly
// and shows how to look it up. The shared guide (water-guide.json) grades every
// treatment option honestly: A proven, B piloted, C lab stage.

function waterPage(data) {
  const { county, water: w, waterGuide: g, documents } = data;
  const docs = new Map(documents.documents.map(d => [d.id, d]));
  const cite = (s) => {
    if (!s) return '';
    const d = s.doc && docs.get(s.doc);
    if (d) return `<a href="/documents#${esc(d.id)}">${esc(d.title)}</a>${s.page ? `, ${esc(s.page)}` : ''}`;
    if (s.url) return `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`;
    return '';
  };
  const cites = (list) => (list || []).map(cite).filter(Boolean).join(' · ');
  const gradeChip = (x) => `<span class="chip ${x === 'A' ? 'c-ok' : x === 'B' ? 'c-part' : 'c-cite'}">${esc(x)} · ${esc(g.grades[x].split(' — ')[0])}</span>`;

  const local = w ? `
<section id="ours">
<h2>${esc(w.title)} <span class="sub">— from the utility’s own records</span></h2>
<p>${esc(w.lead)}</p>
<table class="plain" style="table-layout:fixed;width:100%"><tbody>
${w.facts.map(f => `<tr><td style="width:96px"><b>${esc(f.k)}</b></td><td style="overflow-wrap:anywhere">${esc(f.v)}<br><span class="src">${cites(f.src)}</span></td></tr>`).join('')}
</tbody></table>
</section>

<section id="quality">
<h2>What’s in the water <span class="sub">— the latest report</span></h2>
<p>${esc(w.quality.lead)}</p>
<div style="overflow-x:auto;max-width:100%"><table class="plain">
<thead><tr><th>Measure</th><th>Result</th><th>Limit</th></tr></thead><tbody>
${w.quality.rows.map(r => `<tr><td>${esc(r.what)}${r.note ? `<br><span class="soft" style="font-size:12.5px">${esc(r.note)}</span>` : ''}</td><td>${esc(r.value)}</td><td>${esc(r.limit)}</td></tr>`).join('')}
</tbody></table></div>
<p style="font-size:14px">${esc(w.quality.violation)}</p>
<p style="font-size:14px">${esc(w.quality.inspection)}</p>
<p class="src" style="max-width:none">${esc(w.quality.note || '')} Sources: ${cites(w.quality.src)}</p>
</section>

<section id="fits">
<h2>What fits here <span class="sub">— proven options matched to what the records show</span></h2>
${w.fits.map(f => `<div style="border-bottom:1px solid var(--rule-soft);padding:9px 0"><b>${esc(f.name)}</b><div style="font-size:14px">${esc(f.why)}${f.link ? ` <a href="${esc(f.link)}">More →</a>` : ''}</div></div>`).join('')}
<p style="margin-top:12px;border-left:3px solid var(--accent);padding-left:10px"><b>The open question:</b> ${esc(w.question)} <a href="/docket">See the docket</a>.</p>
</section>` : `
<section id="ours">
<h2>${esc(county.name)}’s water <span class="sub">— not researched yet</span></h2>
<p>We haven’t pulled ${esc(county.name)}’s water records yet. That means not yet gathered — not hidden. Every public water system must publish a yearly water-quality report, and violations are public. You can look yours up now:</p>
<ul>${g.find.map(x => `<li>${esc(x.text)} <span class="src">${cites(x.src)}</span></li>`).join('')}</ul>
<p>Found your system’s report? <a href="/feedback">Send it to us</a> and we’ll add it here.</p>
</section>`;

  // A proposal is the platform's own, named as such: evidence, limits, and the
  // question put to residents. The record sections above stay neutral.
  const p = w && w.proposal;
  const proposal = p ? `
<section id="proposal">
<h2>Our proposal <span class="sub">— ${esc(p.by)}</span></h2>
<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <b style="font-size:18px">${esc(p.title)}</b>
  <p>${esc(p.summary)}</p>
  <p style="font-size:14px"><b>Why here:</b> ${esc(p.why_here)} <span class="src">${cites(p.why_src)}</span></p>
  <p style="font-size:14px;margin-bottom:4px"><b>The evidence:</b></p>
  <ul>${p.evidence.map(x => `<li style="font-size:14px">${esc(x.text)} <span class="src">${cites(x.src)}</span></li>`).join('')}</ul>
  <p style="font-size:14px;margin-bottom:4px"><b>The honest limits:</b></p>
  <ul>${p.limits.map(x => `<li style="font-size:14px">${esc(x)}</li>`).join('')}</ul>
  ${p.limits_src ? `<p class="src" style="max-width:none">${cites(p.limits_src)}</p>` : ''}
  <p style="font-size:14px"><b>First step:</b> ${esc(p.first_step)}</p>
  ${p.ask ? `<p><a href="${esc(p.ask.href)}">${esc(p.ask.label)} →</a></p>` : ''}
</div>
<p class="src" style="max-width:none">This is a proposal, labeled as one. The records above are the facts; whether to do this is for residents and the people they elect to decide.</p>
</section>` : '';

  const options = g.options.map(grp => `
<h3 style="margin-top:18px">${esc(grp.group)}</h3>
${grp.items.map(o => `
<div class="issue" style="display:block">
  <div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline"><b>${esc(o.name)}</b> ${gradeChip(o.grade)}</div>
  <p style="font-size:14px;margin:6px 0">${esc(o.what)}${o.example ? ` ${esc(o.example)}` : ''}</p>
  <p class="src" style="max-width:none"><b>Limit:</b> ${esc(o.limit)} ${cites((o.src || []).concat(o.src2 || []))}</p>
</div>`).join('')}`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · water</div>
  <h1>Our water</h1>
  <div class="src">Clean water is the one public service every person uses every day. This page shows ${w ? 'what the records say about ours, and ' : ''}the options for keeping it safe and affordable as we grow — each graded honestly: proven, piloted, or still in the lab. Updated ${esc((w && w.updated) || g.updated)}.</div>
</header>
${local}
${proposal}

<section id="options">
<h2>The options <span class="sub">— graded A (proven), B (piloted), C (lab stage)</span></h2>
${options}
</section>

<section id="own">
<h2>Who owns it, and how it’s paid for</h2>
<ul>${g.ownership.concat(g.funding).map(x => `<li>${esc(x.text)} <span class="src">${cites(x.src)}</span></li>`).join('')}</ul>
${w ? `<p class="src" style="max-width:none">Look up any system yourself: ${g.find.map(x => cites(x.src)).join(' · ')}</p>` : ''}
<p class="src">Related: <a href="/commonwealth">Commonwealth — our own money</a> · <a href="/growops">Grow-ops</a>. This page lays out options and their records; it doesn’t choose for anyone. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `Our water — ${county.platform_name}`, current: '/water', body, county,
    description: `${county.name}'s water: ${w ? 'the source, the test results, the sewer plant, and the money — plus ' : ''}every treatment option graded honestly (proven, piloted, or lab stage), with sources.`
  });
}

module.exports = { waterPage };
