const { esc, money, pct, STATUS } = require('../lib/corpus');
const { layout } = require('./layout');

const LAYERS = {
  appropriation: 'Layer one: what the quorum court authorized to be spent. What was actually spent is layer two (audit and treasurer reports); which vendor got which check is layer three (check register).',
  actual: 'Layer two: what was actually spent, from audit and treasurer reports.',
  transaction: 'Layer three: transaction-level detail — which vendor got which check.',
  reference: 'Reference material: state publications and directories that explain the numbers (millage books, salary surveys) rather than authorize or record spending.'
};

function ancestors(node, byId) {
  const chain = [];
  let cur = node;
  while (cur.parent !== null) { cur = byId.get(cur.parent); chain.unshift(cur); }
  return chain;
}

function nodePage(data, node) {
  const { byId, childrenOf, documents, docket, county, verifyByNode } = data;
  const s = STATUS[node.status];
  const kids = childrenOf.get(node.id) || [];
  const doc = node.source ? documents.documents.find(d => d.id === node.source.doc) : null;
  const issue = node.docket_ref !== null ? docket.issues.find(i => i.num === node.docket_ref) : null;
  const parent = node.parent ? byId.get(node.parent) : null;

  const crumb = [`<a href="/">Money trail</a>`]
    .concat(ancestors(node, byId).map(a => `<a href="/line/${esc(a.id)}">${esc(a.name)}</a>`))
    .join(' → ');

  // Verification state: this node's own cross-foot check, or membership in its parent's.
  let verify;
  const own = verifyByNode.get(node.id);
  const parentCheck = parent ? verifyByNode.get(parent.id) : null;
  if (own && own.kind === 'children-sum') {
    verify = own.ok
      ? `Cross-foots ✓ — the ${kids.length} lines beneath this sum to this total exactly. <a href="/verify">Full report</a>.`
      : `⚠ Fails cross-footing: ${esc(own.detail)} <a href="/verify">Full report</a>.`;
  } else if (parentCheck && parentCheck.kind === 'children-sum' && parentCheck.ok) {
    verify = `Counted ✓ — this line is part of ${esc(parent.name)}'s verified total. <a href="/verify">Full report</a>.`;
  } else {
    verify = 'Not independently checkable yet — no complete set of sub-lines exists in the corpus to sum against.';
  }

  let share = '';
  if (node.amount && parent && parent.amount) {
    share = `${pct(node.amount, parent.amount)}% of ${esc(parent.name)} (${money(parent.amount)})`;
  } else if (node.amount && !parent && node.section === 'appropriations') {
    share = `${pct(node.amount, data.budget.meta.grand_total)}% of all county appropriations (${money(data.budget.meta.grand_total)})`;
  }

  const sourceRow = doc
    ? `<a href="/documents#${esc(doc.id)}">${esc(doc.title)}</a>`
    : 'No source document in the corpus yet.';
  const pageRow = doc
    ? (node.source.page !== null
      ? `Page ${esc(String(node.source.page))}`
      : 'Page not yet pinned — the transcription predates storing the source PDF. Pinning every number to its page is part of <a href="/docket#i7">Docket #7</a>.')
    : null;

  const kidRows = kids.map(k => {
    const ks = STATUS[k.status];
    return `<tr>
      <td><a href="/line/${esc(k.id)}">${esc(k.name)}</a></td>
      <td class="num">${k.amount !== null ? `<a class="amt" href="/line/${esc(k.id)}">${money(k.amount)}</a>` : '—'}</td>
      <td><a class="chip ${ks.cls}" href="/line/${esc(k.id)}">${ks.mark} ${esc(ks.label)}</a></td>
    </tr>`;
  }).join('');

  const body = `
<div class="crumb">${crumb}</div>
<header class="page card">
  <div class="eyebrow">${esc(county.name)} · ${node.section === 'revenue' ? 'projected revenue' : node.section === 'adjacent' ? 'separate government' : 'appropriation'} · ${data.budget.meta.year}${node.code ? ' · dept/fund ' + esc(node.code) : ''}</div>
  <h1>${esc(node.name)}</h1>
  ${node.amount !== null ? `<div class="total">${money(node.amount)}</div>` : ''}
  <span class="chip ${s.cls}">${s.mark} ${esc(s.label)}</span>
  <p>${esc(s.plain)}</p>
</header>

<dl class="prov">
  <dt>Source</dt><dd>${sourceRow}</dd>
  ${pageRow ? `<dt>Page</dt><dd>${pageRow}</dd>` : ''}
  <dt>Layer</dt><dd>${esc(node.layer)} — ${esc(LAYERS[node.layer])}</dd>
  <dt>Checked</dt><dd>${verify}</dd>
  ${share ? `<dt>Share</dt><dd>${share}</dd>` : ''}
  ${issue ? `<dt>Docket</dt><dd><a href="/docket#i${issue.num}">Issue #${issue.num} — ${esc(issue.title)}</a> (${esc(issue.status.replace('_', ' '))})</dd>` : ''}
  ${doc ? `<dt>Retrieved</dt><dd>${esc(doc.retrieved_at)} — ${esc(doc.status_note)}</dd>` : ''}
</dl>

${node.note ? `<section><h3>Note on this line</h3><p>${esc(node.note)}</p></section>` : ''}

${(data.comparisons.comparisons || []).filter(c => c.related_nodes.includes(node.id)).map(c =>
    `<section><h3>Side-by-side</h3><p><a href="/compare/${esc(c.id)}">${esc(c.title)}</a> — built from the filed documents of ${c.rows.length} counties.</p></section>`).join('')}

${kids.length ? `<section><h3>What's inside this number</h3>
<table class="plain"><thead><tr><th>Line</th><th>Amount</th><th>Status</th></tr></thead><tbody>${kidRows}</tbody></table>
${node.children_complete ? '' : '<p class="src">This list is not yet complete — more lines exist in the source document than have been ingested.</p>'}
</section>` : ''}`;

  return layout({ title: `${node.name} — ${money(node.amount)} — ${data.budget.meta.title}`, current: null, body, county });
}

module.exports = { nodePage };
