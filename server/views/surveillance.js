const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Who's watching — the surveillance tools local government uses, what the law
// allows, what the evidence says on both sides, and how communities steer it.
// The page never says "for" or "against" a tool. It holds the watchers to the
// same rule as the rest of the platform (stance tenet 7): power works in the
// light — every camera, search and retention rule known, logged and auditable.
// Shared guide: data/corpus/surveillance-guide.json. Local facts (optional):
// <corpus>/surveillance.json  { updated, items:[{tool, agency, what, src[]}], notes }.

const cite = (list) => (list && list.length) ? `<p class="src" style="max-width:none;margin-top:4px">Source: ${list.map(s => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`).join(' · ')}</p>` : '';
const SIDE = { benefit: ['c-ok', 'reported benefit'], concern: ['c-dead', 'reported concern'], mixed: ['c-part', 'mixed findings'] };

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
<p>We haven't gathered what ${esc(county.name)}'s agencies use yet — not gathered, not hidden. The fastest way to find out is to ask: the sheriff's office and city police can say which tools they run, what their written policies are, and how long they keep the data. Purchases above a set amount also appear in county and city budgets and meeting minutes.</p>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · who's watching</div>
  <h1>Who's watching — and who watches the watchers</h1>
  <div class="src">Cameras, plate readers and data tools are now part of local government almost everywhere. This page doesn't say whether any tool is good or bad. It lays out what's in use, what the law allows, what studies find on both sides, and how communities set the rules. Our own rule applies here too: <a href="/stance">power should work in the light</a> — every camera, search and retention limit known, logged and open to audit.</div>
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
<h2>What the evidence says <span class="sub">— both sides, as studies and reporting find them</span></h2>
${(g.evidence || []).map(e => {
    const [cls, label] = SIDE[e.side] || SIDE.mixed;
    return `
<div class="issue" style="display:block">
  <span class="chip ${cls}">${label}</span> ${esc(e.claim)}
  ${cite(e.src)}
</div>`;
  }).join('')}
</section>

<section>
<h2>How communities steer it <span class="sub">— the oversight tools in use today</span></h2>
${(g.oversight || []).map(o => `
<div class="issue" style="display:block">
  <b>${esc(o.tool)}</b>
  <p style="margin:4px 0 0">${esc(o.what)}</p>
  ${o.example ? `<p class="src" style="max-width:none">Example: ${esc(o.example)}</p>` : ''}
  ${cite(o.src)}
</div>`).join('')}
</section>

<section>
<h2>Questions any resident can ask</h2>
<ul>
<li>Which surveillance tools does each local agency use, and who approved buying them?</li>
<li>Is there a written policy for each one — who can search the data, and for what?</li>
<li>How long is the data kept, and who else (other agencies, other states, companies) can see it?</li>
<li>Is every search logged, and is that log ever audited or published?</li>
<li>What does each tool cost each year, and where is that in the <a href="/budget">budget</a>?</li>
</ul>
<p class="src">Ask them on the <a href="/priorities">priorities board</a>, or bring a document to the <a href="/docket">docket</a>. Spot an error here? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `Who's watching in ${county.name}, ${county.state}: cameras, plate readers and the rules · County Commons`,
    current: '/surveillance', body, county,
    description: `License plate readers, cameras, facial recognition and drones in ${county.name}, ${county.state}: what's in use, what ${county.state} law allows, what studies find on both sides, and how communities set the rules.`
  });
}

module.exports = { surveillancePage };
