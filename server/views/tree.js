const { esc, money, pct, STATUS } = require('../lib/corpus');
const { layout } = require('./layout');

function chip(node) {
  const s = STATUS[node.status];
  return `<a class="chip ${s.cls}" href="/line/${esc(node.id)}" title="${esc(s.label)} — click for the citation">${s.mark} ${esc(s.label)}</a>`;
}

function amountLink(node) {
  if (node.amount === null) return '';
  return `<a class="amt" href="/line/${esc(node.id)}" title="Where this number comes from">${money(node.amount)}</a>`;
}

function renderNode(node, ctx, depth) {
  const kids = ctx.childrenOf.get(node.id) || [];
  const code = node.code ? `<span class="code">${esc(node.code)}</span>` : '';
  let share = '';
  if (depth === 0 && node.amount && ctx.grandTotal) {
    const p = pct(node.amount, ctx.grandTotal);
    if (p >= 1) share = `<span class="pct">${p}%</span>`;
  } else if (depth === 1 && node.amount && node.parentAmount) {
    const p = pct(node.amount, node.parentAmount);
    if (p >= 25) share = `<span class="pct">${p}% of fund</span>`;
  }
  const note = node.note ? `<div class="note">${esc(node.note)}</div>` : '';
  const row = `<span class="tw">▶</span><span class="nm">${esc(node.name)}</span>${code}<span class="lead"></span>${amountLink(node)}${share}${chip(node)}`;
  if (kids.length === 0) {
    return `<div class="leaf">${row}</div>${note}`;
  }
  for (const k of kids) k.parentAmount = node.amount;
  const open = node.id === 'general-fund' ? ' open' : '';
  return `<details class="node"${open}><summary>${row}</summary>${note}${kids.map(k => renderNode(k, ctx, depth + 1)).join('')}</details>`;
}

function treePage(data) {
  const { budget, county, verification, childrenOf } = data;
  const roots = s => budget.nodes.filter(n => n.parent === null && n.section === s);
  const ctx = { childrenOf, grandTotal: budget.meta.grand_total };

  const vOk = verification && verification.summary.failed === 0;
  const vStamp = verification
    ? (vOk
      ? `<div class="stamp">Cross-foots ✓ ${verification.summary.passed}/${verification.summary.total_checks}</div>`
      : `<div class="stamp" style="border-color:var(--dead);color:var(--dead);background:var(--dead-bg)">${verification.summary.failed} check(s) failing</div>`)
    : '';

  const legend = Object.values(STATUS).map(s =>
    `<span class="chip ${s.cls}">${s.mark} ${esc(s.label)}</span>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · Appropriation Ordinance 2025-21</div>
  <h1>${esc(budget.meta.title)}</h1>
  <div class="total"><a class="amt" href="/verify" title="See the arithmetic check">${money(budget.meta.grand_total)}</a></div>
  <div class="src">${esc(budget.meta.grand_total_note)} Click any number to see exactly where it comes from. Where the trail goes dark, it becomes a numbered issue in the <a href="/docket">docket</a>. New here? <a href="/story">Start with the plain-words tour</a>.</div>
  ${vStamp}
</header>

<div class="bar">
  ${legend}
  <button type="button" data-act="open">Expand all</button>
  <button type="button" data-act="close">Collapse all</button>
</div>

<section>
<h2>Where it comes from <span class="sub">— the thinner half of the record</span></h2>
${roots('revenue').map(n => renderNode(n, ctx, 0)).join('')}
</section>

<section>
<h2>Where it goes <span class="sub">— ${money(budget.meta.grand_total)} appropriated</span></h2>
${roots('appropriations').map(n => renderNode(n, ctx, 0)).join('')}
</section>

<section>
<h2>Beside the county <span class="sub">— separate governments, separate ledgers</span></h2>
${roots('adjacent').map(n => renderNode(n, ctx, 0)).join('')}
</section>

<script>
document.querySelectorAll('.bar button').forEach(function(b){
  b.addEventListener('click',function(){
    var open=b.dataset.act==='open';
    document.querySelectorAll('details.node').forEach(function(d){d.open=open;});
  });
});
</script>`;

  return layout({ title: budget.meta.title, current: '/', body, county });
}

module.exports = { treePage };
