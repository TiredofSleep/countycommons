// Search and research metadata: the titles, descriptions and schema.org
// Dataset records a searcher (or a research crawler) sees, plus the CSV/JSON
// downloads the Dataset record points to. Every figure comes from the corpus.
const reqctx = require('./reqctx');

const short = (x) => {
  const a = Math.abs(x);
  if (a >= 1e9) return '$' + (x / 1e9).toFixed(1).replace(/\.0$/, '') + ' billion';
  if (a >= 1e6) return '$' + (x / 1e6).toFixed(1).replace(/\.0$/, '') + ' million';
  return '$' + Math.round(x).toLocaleString('en-US');
};
const full = (x) => '$' + Math.round(x).toLocaleString('en-US');
const place = (c) => `${c.name}, ${c.state}`;
const year = (d) => (d.budget.meta && d.budget.meta.year) || 2026;
const tops = (d) => d.budget.nodes.filter(n => n.parent === null && n.section === 'appropriations' && n.amount > 0)
  .sort((a, b) => b.amount - a.amount);
const sourceDocs = (d) => {
  const used = new Set(d.budget.nodes.map(n => n.source && n.source.doc).filter(Boolean));
  return d.documents.documents.filter(x => used.has(x.id));
};
const hasBudget = (d) => !!(d.budget.meta && d.budget.meta.grand_total > 0);

function budgetTitle(d) {
  const c = d.county;
  return hasBudget(d) ? `${place(c)} ${year(d)} budget: ${short(d.budget.meta.grand_total)}, every dollar cited · County Commons`
    : `${place(c)} budget · County Commons`;
}
function budgetDescription(d) {
  const c = d.county;
  if (!hasBudget(d)) return `${place(c)}'s public budget on County Commons — not ingested yet; the source document and what's missing are listed.`;
  const t = tops(d);
  const lead = t.slice(0, 3).map(n => `${n.name} (${short(n.amount)})`).join(', ');
  return `${place(c)}, ${year(d)} budget: ${full(d.budget.meta.grand_total)} across ${t.length} funds. Largest: ${lead}. Walk it fund by fund and line by line, each amount cited to the page of the official document. Free CSV and JSON downloads.`;
}
function budgetDataset(d) {
  if (!hasBudget(d)) return [];
  const c = d.county, base = reqctx.url('');
  const docs = sourceDocs(d);
  return [{
    '@context': 'https://schema.org', '@type': 'Dataset',
    name: `${place(c)} ${year(d)} budget (appropriations, by fund, department and category)`,
    description: budgetDescription(d) + ' Parent totals are checked against their parts to the cent; disagreements in the source are kept as printed and labeled. Compiled by County Commons, an independent, nonpartisan civic project — not a government website.',
    url: base + '/budget',
    keywords: [`${c.name} budget`, `${c.name} ${year(d)} budget`, `${c.state} county budget`, 'appropriations', 'public finance', 'local government budget'],
    temporalCoverage: String(year(d)),
    spatialCoverage: { '@type': 'Place', name: place(c) },
    creator: { '@type': 'Organization', name: 'County Commons', url: 'https://countycommons.us/' },
    isAccessibleForFree: true,
    isBasedOn: docs.map(x => x.source_url || x.url).filter(Boolean),
    variableMeasured: 'Appropriated amount (US dollars)',
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: base + '/budget.csv' },
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: base + '/budget.json' }
    ]
  }];
}

function chain(d, node) {
  const out = []; let cur = node;
  while (cur && cur.parent !== null) { cur = d.byId.get(cur.parent); if (cur) out.unshift(cur); }
  return out;
}
function lineTitle(d, node) {
  const up = chain(d, node).map(n => n.name);
  const where = up.length ? ` (${up.slice(-2).join(', ')})` : '';
  return `${node.name}${where}: ${full(node.amount)} — ${place(d.county)} ${year(d)} budget · County Commons`;
}
function lineDescription(d, node) {
  const up = chain(d, node).map(n => n.name);
  const kids = d.childrenOf.get(node.id) || [];
  const doc = node.source && d.documents.documents.find(x => x.id === node.source.doc);
  const split = kids.length ? ` Split into ${kids.slice().sort((a, b) => b.amount - a.amount).slice(0, 3).map(k => `${k.name} (${short(k.amount)})`).join(', ')}${kids.length > 3 ? ' and more' : ''}.` : '';
  return `${place(d.county)} budgeted ${full(node.amount)} for ${node.name}${up.length ? ` in ${up.join(' › ')}` : ''} in ${year(d)}.${split}${doc ? ` Source: ${doc.title}${node.source.page ? ', ' + node.source.page : ''}.` : ''}`;
}

function csv(d) {
  const q = (v) => v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const docs = new Map(d.documents.documents.map(x => [x.id, x]));
  const rows = [['id', 'parent_id', 'level', 'path', 'name', 'code', 'amount', 'section', 'year', 'status', 'children_add_up', 'source_document', 'source_page', 'source_url', 'note']];
  for (const n of d.budget.nodes) {
    const up = chain(d, n);
    const doc = n.source && docs.get(n.source.doc);
    rows.push([n.id, n.parent, up.length, up.map(x => x.name).concat(n.name).join(' > '), n.name, n.code, n.amount, n.section, n.year || year(d), n.status,
      n.children_complete === undefined ? '' : n.children_complete, doc ? doc.title : (n.source && n.source.doc), n.source && n.source.page, doc && (doc.source_url || doc.url), n.note]);
  }
  return '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n') + '\r\n';
}
function json(d) {
  const used = sourceDocs(d);
  return { about: `${place(d.county)} ${year(d)} budget, compiled by County Commons (independent, nonpartisan; not a government website). Every amount cites its source document and page.`,
    page: reqctx.url('/budget'), meta: d.budget.meta, documents: used, verification: d.verification ? d.verification.summary : null, nodes: d.budget.nodes };
}

module.exports = { sourceDocs, short, full, place, year, tops, hasBudget, budgetTitle, budgetDescription, budgetDataset, lineTitle, lineDescription, csv, json, chain };
