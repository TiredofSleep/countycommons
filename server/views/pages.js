const { esc, money, STATUS } = require('../lib/corpus');
const { layout } = require('./layout');

// ---------- Docket ----------
function docketPage(data) {
  const { docket, county } = data;
  const chipFor = st => st === 'complete'
    ? '<span class="chip c-ok">✓ Complete</span>'
    : st === 'in_progress'
      ? '<span class="chip c-part">◐ In progress</span>'
      : '<span class="chip c-dead">Open</span>';
  const items = docket.issues.map(i => `
<div class="issue${i.status === 'complete' ? ' done' : ''}" id="i${i.num}">
  <div class="inum">#${i.num}</div>
  <div class="ibody"><b>${esc(i.title)}.</b>
    <p>${esc(i.detail)}</p>
    ${i.stamped ? `<div class="revealed"><b>${esc(i.stamped.date)} — what this revealed:</b> ${esc(i.stamped.revealed)}</div>` : ''}
    ${i.research_notes ? `<div style="margin-top:6px">${i.research_notes.map(n => `<p style="font-size:12.5px;color:var(--ink-soft);margin:3px 0">· ${esc(n)}</p>`).join('')}</div>` : ''}
  </div>
  <div class="ist">${chipFor(i.status)}</div>
</div>`).join('');

  const done = docket.issues.filter(i => i.status === 'complete').length;
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)}</div>
  <h1>First Issues Docket</h1>
  <div class="src">Every dead end in the <a href="/">money trail</a> becomes a numbered pursuit here. When a document is obtained and ingested, the issue gets stamped with the date and what it revealed. ${done} of ${docket.issues.length} complete.</div>
</header>
${items}`;
  return layout({ title: `First Issues Docket — ${county.platform_name}`, current: '/docket', body, county });
}

// ---------- Documents ----------
function documentsPage(data) {
  const { documents, county, budget } = data;
  const counts = {};
  for (const n of budget.nodes) {
    if (n.source) counts[n.source.doc] = (counts[n.source.doc] || 0) + 1;
  }
  const rows = documents.documents.map(d => `
<div class="issue" id="${esc(d.id)}">
  <div class="ibody">
    <b>${esc(d.title)}</b>
    <p>${esc(d.source_note)}</p>
    <dl class="prov">
      <dt>Jurisdiction</dt><dd>${esc(d.jurisdiction)}</dd>
      <dt>Layer</dt><dd>${esc(d.layer)}</dd>
      <dt>Retrieved</dt><dd>${esc(d.retrieved_at)}</dd>
      <dt>Integrity</dt><dd>${d.sha256 ? `SHA-256 <span class="code">${esc(d.sha256)}</span>` : 'Source PDF not yet stored in this corpus — no file hash yet. The hand transcription is the current basis (see status).'}</dd>
      <dt>Status</dt><dd>${esc(d.status)} — ${esc(d.status_note)}</dd>
      <dt>Cited by</dt><dd>${counts[d.id] || 0} lines in the money trail</dd>
      ${d.local_file ? `<dt>Stored copy</dt><dd><a href="/files/${esc(d.local_file.replace(/^inbox\//, ''))}">Read the archived PDF</a>${d.size_bytes ? ` (${(d.size_bytes / 1048576).toFixed(1)} MB)` : ''} — this is the exact file the SHA-256 above fingerprints.</dd>` : ''}
      ${d.source_url ? `<dt>Origin</dt><dd><a href="${esc(d.source_url)}" rel="noopener">${esc(d.source_url)}</a></dd>` : ''}
    </dl>
  </div>
</div>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)}</div>
  <h1>Document library</h1>
  <div class="src">Every document behind the numbers. Nothing on this site is asserted without a document; when a document is missing, the site says so and the gap goes on the <a href="/docket">docket</a>.</div>
</header>
${rows}`;
  return layout({ title: `Document library — ${county.platform_name}`, current: '/documents', body, county });
}

// ---------- Verification report ----------
function verifyPage(data) {
  const { verification, county, budget } = data;
  if (!verification) {
    const body = `<header class="page"><h1>Verification</h1>
<div class="src">The cross-footing verifier has not been run against this corpus yet. Run <span class="code">npm run verify</span>.</div></header>`;
    return layout({ title: `Verification — ${county.platform_name}`, current: '/verify', body, county });
  }
  const rows = verification.checks.map(c => `
<tr>
  <td>${c.node === '__grand_total__' ? '<b>Ordinance grand total</b>' : `<a href="/line/${esc(c.node)}">${esc(c.name)}</a>`}</td>
  <td class="num">${c.expected !== null ? money(c.expected) : '—'}</td>
  <td class="num">${c.computed !== null ? money(c.computed) : '—'}</td>
  <td>${c.ok ? '<span class="chip c-ok">✓ exact</span>' : '<span class="chip c-dead">✖ off</span>'}</td>
  <td style="font-size:12px;color:var(--ink-soft)">${esc(c.detail)}</td>
</tr>`).join('');

  const ok = verification.summary.failed === 0;
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · run ${esc(verification.run_at)}</div>
  <h1>Does the tree add up?</h1>
  <div class="total">${verification.summary.passed}/${verification.summary.total_checks} ${ok ? '✓' : '— checks failing'}</div>
  <div class="src">Budgets are self-auditing: line items must sum to category totals, categories to departments, departments to funds, funds to the ordinance's own grand total of ${money(budget.meta.grand_total)} — to the dollar, no rounding. This page is the arithmetic receipt for the whole <a href="/">money trail</a>. Any line that cannot be checked yet says so on its own citation page.</div>
  ${ok ? '<div class="stamp">Cross-foots ✓</div>' : ''}
</header>
<table class="plain">
<thead><tr><th>Checked line</th><th>Stated</th><th>Sum of parts</th><th>Result</th><th>Detail</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
  return layout({ title: `Verification — ${county.platform_name}`, current: '/verify', body, county });
}

// ---------- Methodology ----------
function methodologyPage(data) {
  const { county } = data;
  const statusList = Object.values(STATUS).map(s =>
    `<tr><td><span class="chip ${s.cls}">${s.mark} ${esc(s.label)}</span></td><td>${esc(s.plain)}</td></tr>`).join('');
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)}</div>
  <h1>How this site works</h1>
  <div class="src">The rules this site holds itself to. They are the product.</div>
</header>

<section>
<h3>Every number is cited or labeled</h3>
<p>Click any dollar amount and you get its citation page: which document it comes from, which page, and whether it has been checked. When a number is derived instead of transcribed, it says so and shows the derivation. When we are not sure, it is labeled ambiguous with the reason. When no document exists in the corpus yet, that is a dead end — and every dead end becomes a numbered issue on the <a href="/docket">docket</a>.</p>
<table class="plain"><tbody>${statusList}</tbody></table>
</section>

<section>
<h3>Three layers of the money trail</h3>
<p><b>Layer one — appropriations:</b> what the quorum court authorized to be spent. That is what this site shows today.
<b>Layer two — actuals:</b> what was really spent, from audit and treasurer reports (docket #8).
<b>Layer three — transactions:</b> which vendor got which check (docket #10).
Every number on this site says which layer it comes from, because mixing them up is how budget arguments go wrong.</p>
</section>

<section>
<h3>The arithmetic is checked</h3>
<p>Budgets are self-auditing: parts must sum to wholes. A verifier re-adds every complete branch of the tree and compares it to the document's own totals, to the dollar. The full receipt is on the <a href="/verify">verification page</a>. A line that cannot be checked yet says so on its citation page — it is never silently presented as checked.</p>
</section>

<section>
<h3>What this site never does</h3>
<p>It never editorializes, never advocates, and never guesses. A dead end means "not yet ingested and navigable" — never "hidden." Where a number could be misread without context (like the county's $45,921 fire pass-through, which is only one slice of how fire departments are funded), the caveat is attached to the number itself.</p>
<p>And it never investigates people. This site maps where public money goes, as public documents draw the map. Naming a payee documents a transaction, not a suspicion. Where the map has a missing piece, the site asks for that piece — openly, from the records that hold it — and publishes whatever the answer turns out to be, including when the answer is "everything is in order." Several trails on this site ended exactly that way, and those pages say so.</p>
</section>

<section>
<h3>Who pays for this</h3>
<p>${esc(county.platform_name)} is free, carries no ads, and sells nothing. ${esc(county.sponsor_line)}. This site is versioned in a public repository, so every change to every number has a public history.</p>
</section>`;
  return layout({ title: `Methodology — ${county.platform_name}`, current: '/methodology', body, county });
}

module.exports = { docketPage, documentsPage, verifyPage, methodologyPage };
