const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');

// Commonwealth: what a community can do with its own money. Starts from the
// county's real numbers (interest that leaves, money already on deposit, pots
// already pooled), then lays out how a shared fund can grow, what it can own,
// and how it stays honest — every precedent cited, every limit stated. It
// shows options and their track records; residents and their officials choose.

function commonwealthPage(data) {
  const { county, commonwealth: c, documents } = data;
  const docs = new Map(documents.documents.map(d => [d.id, d]));
  const cite = (s) => {
    if (!s) return '';
    const d = s.doc && docs.get(s.doc);
    if (d) return `<a href="/documents#${esc(d.id)}">${esc(d.title)}</a>${s.page ? `, ${esc(s.page)}` : ''}`;
    if (s.url) return `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`;
    return '';
  };
  const cites = (list) => (list || []).map(cite).filter(Boolean).join(' · ');
  const wrap = (table) => `<div style="overflow-x:auto;max-width:100%">${table}</div>`;
  const rowTable = (rows, head) => wrap(`<table class="plain"><thead><tr><th>${esc(head[0])}</th><th>${esc(head[1])}</th></tr></thead><tbody>
${rows.map(r => `<tr><td>${esc(r.what)}${r.note ? `<br><span class="soft" style="font-size:12.5px">${esc(r.note)}</span>` : ''}<br><span class="src" style="overflow-wrap:anywhere">${cites(r.src)}</span></td><td class="num">${money(r.amount)}</td></tr>`).join('')}
</tbody></table>`);

  const lever = (l, i) => `
<div class="issue" style="display:block">
  <div class="eyebrow" style="margin:0 0 4px">Way ${i + 1}</div>
  <b style="font-size:17px">${esc(l.title)}</b>
  <p>${esc(l.body)}</p>
  <ul>${l.precedents.map(p => `<li><b>${esc(p.name)}.</b> ${esc(p.fact)} <span class="src">${cites(p.src)}</span></li>`).join('')}</ul>
  ${l.here ? `<p style="font-size:14px;border-left:3px solid var(--accent);padding-left:10px"><b>Here:</b> ${esc(l.here)}</p>` : ''}
  ${l.limit ? `<p class="src" style="max-width:none"><b>The honest limit:</b> ${esc(l.limit)}</p>` : ''}
</div>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · commonwealth</div>
  <h1>What a community can do with its own money</h1>
  <div class="src">${esc(c.intro)} Updated ${esc(c.updated)}.</div>
</header>

<section id="leaving">
<h2>${esc(c.leaving.title)} <span class="sub">— from the bond papers</span></h2>
<p>${esc(c.leaving.lead)}</p>
${rowTable(c.leaving.rows, ['Interest to lenders', 'Amount'])}
<p><b>${esc(c.leaving.total)}</b></p>
</section>

<section id="already">
<h2>${esc(c.already.title)} <span class="sub">— money that already exists</span></h2>
<p>${esc(c.already.lead)}</p>
${rowTable(c.already.rows, ['Where it sits', 'Amount'])}
<p class="src" style="max-width:none">${esc(c.already.note)}</p>
</section>

<section id="grow">
<h2>How a shared fund grows <span class="sub">— without the stock market</span></h2>
<p>${esc(c.grow_lead)}</p>
${c.levers.map(lever).join('')}
</section>

<section id="honest">
<h2>How a shared fund stays honest</h2>
<p>${esc(c.guardrails.lead)}</p>
<ol>${c.guardrails.principles.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
<p class="src" style="max-width:none">${cites(c.guardrails.src)}</p>
<p><b>For a public fund, that means:</b></p>
<ul>${c.guardrails.rules.map(r => `<li>${esc(r.text)} ${r.src ? `<span class="src">${cites(r.src)}</span>` : ''}</li>`).join('')}</ul>
<p style="font-size:14px"><b>The warning:</b> ${esc(c.guardrails.warning)} <span class="src">${cites(c.guardrails.warning_src)}</span></p>
</section>

<section id="law">
<h2>What the law allows today</h2>
<ul>${c.law.map(x => `<li>${esc(x.text)} <span class="src">${cites(x.src)}</span></li>`).join('')}</ul>
</section>

<section id="you">
<h2>Where residents come in</h2>
<ul>${c.residents.map(x => `<li>${x}</li>`).join('')}</ul>
</section>

<section id="limits">
<h2>What this doesn’t claim <span class="sub">— the honest limits</span></h2>
<ul>${c.limits.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p class="src">Related: <a href="/whatif">What if we saved instead of borrowing?</a> · <a href="/taxlab">Tax lab</a>${county.has_taxes_debt ? ' · <a href="/taxes">Taxes &amp; debt</a>' : ''} · <a href="/commons">The two pots (food)</a> · <a href="/sovereignty">Food sovereignty</a> · <a href="/growops">Grow-ops</a>. This page lays out options and their records; it doesn’t tell anyone what to choose. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `Commonwealth — ${county.platform_name}`, current: '/commonwealth', body, county,
    description: `What ${county.name} could do with its own money: the interest that leaves, the money already pooled, and how a shared fund can grow, what it can own, and how it stays honest — every precedent cited.`
  });
}

module.exports = { commonwealthPage };
