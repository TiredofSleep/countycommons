const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Surveillance tools in local government — what is in use, what the law
// allows, what studies and records report, and the oversight rules some places
// have adopted. The page never says "for" or "against" a tool, and recommends nothing.
// Shared guide: data/corpus/surveillance-guide.json. Local facts (optional):
// <corpus>/surveillance.json  { updated, items:[{tool, agency, what, src[]}], notes }.

const cite = (list) => (list && list.length) ? `<p class="src" style="max-width:none;margin-top:4px">Source: ${list.map(s => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`).join(' · ')}</p>` : '';
const SIDE_DEFAULT = { effect: 'study found an effect', noclear: 'study found no clear effect', mixed: 'study found effects on some measures, not others', record: 'audit or court record reported a problem' };

function surveillancePage(data, tenantKey) {
  const { county, surveillanceGuide: g, surveillance: local } = data;
  const st = (g.states || {})[county.state];
  const portals = (g.flock_portals || []).filter(p => p.county_key === tenantKey || p.county_key === county.slug);
  const items = (local && local.items) || [];

  const here = items.length || portals.length ? `
${items.map(i => `
<div class="issue" style="display:block">
  <b>${esc(i.tool)}</b>${i.agency ? ` <span class="soft">· ${esc(i.agency)}</span>` : ''}
  <p style="margin:4px 0 0">${esc(i.what)}</p>
  ${cite(i.src)}
</div>`).join('')}
${portals.map(p => `
<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <b>${esc(p.agency)} publishes a public camera and search log.</b>
  <p class="src" style="max-width:none;margin:4px 0 0">It shows how many license plate cameras it runs, how long it keeps the data, and how often officers search it. <a href="${esc(p.url)}" rel="noopener">Open the agency's transparency portal ↗</a></p>
</div>`).join('')}` : `
<p>We haven't gathered what ${esc(county.name)}'s agencies use yet — not gathered, not hidden. The fastest way to find out is to ask: the sheriff's office and city police can say which tools they run, what their written policies are, and how long they keep the data. Purchases may also appear in county and city budgets and meeting minutes.</p>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · surveillance tools</div>
  <h1>Surveillance tools in local government: what is in use and the rules around them</h1>
  <div class="src">Cameras, plate readers and data tools are now part of local government almost everywhere. This page does not say whether any tool is good or bad. It lists what is in use, what the law allows, what studies find, and what rules some places have adopted.</div>
</header>

<section>
<h2>In use here <span class="sub">— ${esc(county.name)}</span></h2>
${here}
</section>

<section>
<h2>The tools <span class="sub">— what each one does and keeps</span></h2>
${(g.tools || []).map(t => `
<details class="issue" style="display:block">
  <summary style="cursor:pointer"><b>${esc(t.name)}</b></summary>
  <p style="margin:6px 0 0">${esc(t.what)}</p>
  ${t.common_retention ? `<p class="src" style="max-width:none">How long data is kept: ${esc(t.common_retention)}</p>` : ''}
  ${cite(t.src)}
</details>`).join('')}
</section>

<section>
<h2>What the law says <span class="sub">— ${esc(county.state)}</span></h2>
${st ? `<p>${esc(st.summary)}</p>${cite(st.src)}` : `<p>We haven't gathered ${esc(county.state)}'s surveillance laws yet — not gathered, not hidden.</p>`}
</section>

<section>
<h2>What studies and records report <span class="sub">— each labeled by what the source found</span></h2>
${(g.evidence || []).map(e => {
    const label = ((g.side_labels || SIDE_DEFAULT)[e.side]) || SIDE_DEFAULT.mixed;
    return `
<div class="issue" style="display:block">
  <span class="chip c-cite">${esc(label)}</span> ${esc(e.claim)}
  ${cite(e.src)}
</div>`;
  }).join('')}
</section>

<section>
<h2>Oversight rules some places have adopted</h2>
<p class="src" style="max-width:none">${esc(g.oversight_note || '')}</p>
${(g.oversight || []).map(o => `
<div class="issue" style="display:block">
  <b>${esc(o.tool)}</b>
  <p style="margin:4px 0 0">${esc(o.what)}</p>
  ${o.example ? `<p class="src" style="max-width:none">Example: ${esc(o.example)}</p>` : ''}
  ${cite(o.src)}
</div>`).join('')}
</section>

<section>
<h2>What public records can answer</h2>
<ul>
<li>Which tools each local agency uses: budget lines, county and city meeting minutes, and purchase approvals.</li>
<li>Written policies for each tool: who can search the data, and for what.</li>
<li>How long data is kept, and which other agencies, states or companies can see it.</li>
<li>Search logs and any audits of them, where an agency keeps or publishes them.</li>
<li>What each tool costs each year, in the <a href="/budget">budget</a>.</li>
</ul>
<p class="src">These records can be requested under the state open-records law. Bring a document to the <a href="/docket">docket</a>. Spot an error here? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `Surveillance tools in ${county.name}, ${county.state}: what is in use and the rules · County Commons`,
    current: '/surveillance', body, county,
    description: `License plate readers, cameras, facial recognition and drones in ${county.name}, ${county.state}: what's in use, what ${county.state} law allows, what studies and records report, and the oversight rules some places have adopted.`
  });
}

module.exports = { surveillancePage };
