const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Water — every county gets this page. The local section (water.json) appears
// once a county's own system is researched; until then the page says so plainly
// and shows how to look it up. The shared guide (water-guide.json) catalogs treatment
// options, each labeled by how widely it is used. Facts only: opinions and
// proposals live in petitions (/petitions).

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
  const usedChip = (x) => `<span class="chip c-cite">${esc(g.grades[x])}</span>`;

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
<p style="font-size:14px;border-left:3px solid var(--rule);padding-left:10px"><b>Not yet in the documents:</b> ${esc(w.question)} <a href="/docket">See the docket</a>.</p>
</section>` : `
<section id="ours">
<h2>${esc(county.name)}’s water <span class="sub">— not researched yet</span></h2>
<p>We haven’t pulled ${esc(county.name)}’s water records yet. That means not yet gathered — not hidden. Every public water system must publish a yearly water-quality report, and violations are public. You can look yours up now:</p>
<ul>${g.find.map(x => `<li>${esc(x.text)} <span class="src">${cites(x.src)}</span></li>`).join('')}</ul>
<p>Found your system’s report? <a href="/feedback">Send it to us</a> and we’ll add it here.</p>
</section>`;

  const petitionsNote = `<p style="font-size:14px">Residents have started petitions on water — see <a href="/petitions">petitions</a>.</p>`;

  const options = g.options.map(grp => `
<h3 style="margin-top:18px">${esc(grp.group)}</h3>
${grp.items.map(o => `
<div class="issue" style="display:block">
  <div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline"><b>${esc(o.name)}</b> ${usedChip(o.grade)}</div>
  <p style="font-size:14px;margin:6px 0">${esc(o.what)}${o.example ? ` ${esc(o.example)}` : ''}</p>
  <p class="src" style="max-width:none">${o.limit ? `<b>Limit:</b> ${esc(o.limit)} ` : ''}${cites((o.src || []).concat(o.src2 || []))}</p>
</div>`).join('')}`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · water</div>
  <h1>Water</h1>
  <div class="src">This page shows ${w ? 'what public records say about the water system serving this county, and ' : ''}a catalog of treatment options, each labeled by how widely it is used. Updated ${esc((w && w.updated) || g.updated)}.</div>
</header>
${local}
${require("../lib/national").waterBlock(require("../lib/national").forCounty(county))}
${petitionsNote}

<section id="options">
<h2>Treatment options <span class="sub">— how widely each is used</span></h2>
<p class="src" style="max-width:none">${esc(g.grades_note || '')}</p>
${options}
</section>

<section id="own">
<h2>Who owns it, and how it’s paid for</h2>
<ul>${g.ownership.concat(g.funding).map(x => `<li>${esc(x.text)} <span class="src">${cites(x.src)}</span></li>`).join('')}</ul>
${w ? `<p class="src" style="max-width:none">Look up any system yourself: ${g.find.map(x => cites(x.src)).join(' · ')}</p>` : ''}
<p class="src">Related: <a href="/commonwealth">Commonwealth — our own money</a> · <a href="/growops">Grow-ops</a>. This page lists options and records. Petitions on water are at <a href="/petitions">/petitions</a>. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `Our water — ${county.platform_name}`, current: '/water', body, county,
    description: `${county.name}'s water: ${w ? 'the source, the test results, the sewer plant, and the money — plus ' : ''}treatment options labeled by how widely they are used, with sources.`
  });
}

module.exports = { waterPage };
