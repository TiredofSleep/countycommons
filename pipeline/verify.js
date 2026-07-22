// Cross-footing verifier for the budget corpus.
//
// Publication gate: the site renders this file's output next to every number.
// A parent marked children_complete must equal the sum of its children, to the
// dollar. The grand total must equal the sum of top-level appropriation funds.
// Mismatches are reported — never hidden — and the explorer labels them.
//
// Usage: node pipeline/verify.js   (writes data/corpus/verification.json)

const fs = require('fs');
const path = require('path');

const CORPUS_DIR = path.join(__dirname, '..', 'data', 'corpus');
const corpus = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'budget-2026.json'), 'utf8'));

const nodes = corpus.nodes;
const byId = new Map(nodes.map(n => [n.id, n]));
const childrenOf = new Map();
for (const n of nodes) {
  if (n.parent !== null) {
    if (!byId.has(n.parent)) {
      console.error(`ERROR: node "${n.id}" references missing parent "${n.parent}"`);
      process.exit(1);
    }
    if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, []);
    childrenOf.get(n.parent).push(n);
  }
}

const checks = [];

// 1. Every children_complete parent must cross-foot exactly.
for (const n of nodes) {
  if (!n.children_complete) continue;
  const kids = childrenOf.get(n.id) || [];
  if (kids.length === 0) {
    checks.push({ node: n.id, name: n.name, kind: 'children-sum', ok: false,
      expected: n.amount, computed: null,
      detail: 'Marked children_complete but has no children in the corpus.' });
    continue;
  }
  const missing = kids.filter(k => k.amount === null);
  if (missing.length > 0) {
    checks.push({ node: n.id, name: n.name, kind: 'children-sum', ok: false,
      expected: n.amount, computed: null,
      detail: `Children without amounts: ${missing.map(k => k.id).join(', ')}` });
    continue;
  }
  const sum = kids.reduce((a, k) => a + k.amount, 0);
  checks.push({ node: n.id, name: n.name, kind: 'children-sum', ok: sum === n.amount,
    expected: n.amount, computed: sum,
    detail: sum === n.amount
      ? `${kids.length} children sum to the parent total exactly.`
      : `Children sum to $${sum.toLocaleString('en-US')}, off by $${(sum - n.amount).toLocaleString('en-US')}.` });
}

// 2. Grand total: top-level appropriation funds must sum to the ordinance total.
const topFunds = nodes.filter(n => n.parent === null && n.section === 'appropriations');
const grandSum = topFunds.reduce((a, n) => a + (n.amount || 0), 0);
checks.push({ node: '__grand_total__', name: 'Ordinance grand total', kind: 'grand-total',
  ok: grandSum === corpus.meta.grand_total,
  expected: corpus.meta.grand_total, computed: grandSum,
  detail: grandSum === corpus.meta.grand_total
    ? `${topFunds.length} top-level funds sum to the ordinance's stated total exactly.`
    : `Top-level funds sum to $${grandSum.toLocaleString('en-US')}, off by $${(grandSum - corpus.meta.grand_total).toLocaleString('en-US')}.` });

// 3. Referential integrity: docket refs and document refs must exist.
const docket = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'docket.json'), 'utf8'));
const docs = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'documents.json'), 'utf8'));
const docketNums = new Set(docket.issues.map(i => i.num));
const docIds = new Set(docs.documents.map(d => d.id));
for (const n of nodes) {
  if (n.docket_ref !== null && !docketNums.has(n.docket_ref)) {
    checks.push({ node: n.id, name: n.name, kind: 'reference', ok: false, expected: null, computed: null,
      detail: `References docket issue #${n.docket_ref}, which does not exist.` });
  }
  if (n.source && !docIds.has(n.source.doc)) {
    checks.push({ node: n.id, name: n.name, kind: 'reference', ok: false, expected: null, computed: null,
      detail: `References document "${n.source.doc}", which is not in the registry.` });
  }
  if (n.status !== 'dead_end' && n.amount === null && (childrenOf.get(n.id) || []).length === 0
      && !n.source && !n.note) {
    checks.push({ node: n.id, name: n.name, kind: 'reference', ok: false, expected: null, computed: null,
      detail: 'Has no amount, no children, no source, and no note — nothing to render or cite.' });
  }
}

// 4. Activity-log chain verification (SECURITY.md §13/§14 — wired into the
// same gate as the arithmetic: a broken chain fails the build).
try {
  const { verifyChain } = require('../server/lib/chain');
  const v = verifyChain();
  checks.push({ node: '__activity_chain__', name: 'Activity log hash chain', kind: 'chain',
    ok: v.ok, expected: null, computed: null,
    detail: v.ok
      ? `Chain verified: ${v.length} entries${v.head ? ', head ' + v.head.slice(0, 16) + '…' : ' (empty)'}`
      : `CHAIN BROKEN: ${v.error} — integrity incident per SECURITY.md §10.` });
} catch (e) {
  checks.push({ node: '__activity_chain__', name: 'Activity log hash chain', kind: 'chain',
    ok: false, expected: null, computed: null, detail: 'Chain verifier failed to run: ' + e.message });
}

const failed = checks.filter(c => !c.ok);
const report = {
  run_at: new Date().toISOString(),
  corpus_year: corpus.meta.year,
  grand_total: corpus.meta.grand_total,
  summary: {
    total_checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length
  },
  checks
};

fs.writeFileSync(path.join(CORPUS_DIR, 'verification.json'), JSON.stringify(report, null, 2));

console.log(`Cross-footing verification — ${report.summary.passed}/${report.summary.total_checks} checks passed`);
for (const c of checks) {
  const mark = c.ok ? 'ok  ' : 'FAIL';
  console.log(`  ${mark}  ${c.kind.padEnd(12)} ${c.name}${c.ok ? '' : ' — ' + c.detail}`);
}
if (failed.length > 0) {
  console.error(`\n${failed.length} check(s) failed. The site will label these; fix the corpus or label the ambiguity.`);
  process.exit(1);
}
console.log('\nThe tree cross-foots. Report written to data/corpus/verification.json');
