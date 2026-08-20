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

function treePage(data, opts) {
  const { budget, county, verification, childrenOf } = data;
  const o = opts || {};
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

  // Generic across counties: pull the document label, title, and note from
  // the corpus meta, with sensible fallbacks so any county renders.
  const docLabel = budget.meta.document || (budget.meta.ordinance ? `Appropriation Ordinance ${budget.meta.ordinance}` : '');
  const title = budget.meta.title || `${county.name} — the money trail`;
  const gtNote = budget.meta.grand_total_note || budget.meta.note || '';
  const section = (heading, sub, s) => {
    const r = roots(s);
    if (!r.length) return '';
    return `<section><h2>${heading} <span class="sub">${sub}</span></h2>${r.map(n => renderNode(n, ctx, 0)).join('')}</section>`;
  };

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)}${docLabel ? ' · ' + esc(docLabel) : ''}</div>
  <h1>${esc(title)}</h1>
  <div class="total"><a class="amt" href="/verify" title="See the arithmetic check">${money(budget.meta.grand_total)}</a></div>
  <div class="src">${esc(gtNote)} Click any number to see exactly where it comes from. Where the trail goes dark, it becomes a numbered issue in the <a href="/docket">docket</a>. New here? <a href="/story">Read our story</a> or <a href="/guide">take the plain-words tour</a>.</div>
  ${vStamp}
</header>

${o.hasPlaces ? `<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <b>The real money is in your city or town.</b> <span class="src">With no county government here, the budgets that shape daily life — schools, police, roads, trash — are municipal. <a href="/places">Browse every city and town →</a>, and walk the ones we've ingested line by line.</span>
</div>` : ''}
${budget.meta.grand_total > 0 ? `<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <b>Now you've seen it — say what matters.</b> <span class="src">You don't write the budget; the people you elected do. But this is the record they answer to. Tell them what to lean into, or what to take a fresh look at, and why. <a href="/priorities">Set the priorities</a>.</span>
</div>` : ''}

<div class="bar">
  ${legend}
  <button type="button" data-act="open">Expand all</button>
  <button type="button" data-act="close">Collapse all</button>
</div>

${section('Where it comes from', '— the thinner half of the record', 'revenue')}
${section('Where it goes', `— ${money(budget.meta.grand_total)} appropriated`, 'appropriations')}
${section('Beside the county', '— separate governments, separate ledgers', 'adjacent')}`;

  return layout({ title, current: '/', body, county });
}

module.exports = { treePage };
