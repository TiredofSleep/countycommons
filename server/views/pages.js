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
  <div class="src">Every dead end in the <a href="/budget">money trail</a> becomes a numbered pursuit here. When a document is obtained and ingested, the issue gets stamped with the date and what it revealed. ${done} of ${docket.issues.length} complete.</div>
</header>
${items}`;
  return layout({ title: `First Issues Docket — ${county.platform_name}`, current: '/docket', body, county });
}

// ---------- Documents ----------
const fs = require('fs');
const path = require('path');

// Full-text search over the OCR'd archive (minutes, ordinances) — the review
// text files are small; a linear scan is instant at this scale.
function searchOcrTexts(q) {
  const dir = path.join(__dirname, '..', '..', 'data', 'review');
  const out = [];
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('-ocr.txt')); } catch (e) { return out; }
  const needle = q.toLowerCase();
  for (const f of files) {
    try {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const idx = text.toLowerCase().indexOf(needle);
      if (idx === -1) continue;
      const snippet = text.slice(Math.max(0, idx - 70), idx + q.length + 90).replace(/\s+/g, ' ').trim();
      const base = f.replace('-ocr.txt', '');
      out.push({ base, snippet, count: text.toLowerCase().split(needle).length - 1 });
    } catch (e) { /* skip unreadable */ }
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 12);
}

function documentsPage(data, q) {
  const { documents, county, budget } = data;
  const counts = {};
  for (const n of budget.nodes) {
    if (n.source) counts[n.source.doc] = (counts[n.source.doc] || 0) + 1;
  }

  q = (q || '').trim().slice(0, 100);
  let docs = documents.documents;
  if (q) {
    const needle = q.toLowerCase();
    docs = docs.filter(d =>
      [d.title, d.jurisdiction, d.source_note, d.status, d.layer, d.id, String(d.year)]
        .join(' ').toLowerCase().includes(needle));
  }

  // Group by jurisdiction for scannability.
  const groups = {};
  for (const d of docs) (groups[d.jurisdiction] = groups[d.jurisdiction] || []).push(d);
  const groupOrder = Object.keys(groups).sort((a, b) =>
    (a === county.slug || a === 'clark-county' ? -1 : b === 'clark-county' ? 1 : a.localeCompare(b)));

  const ocrHits = q ? searchOcrTexts(q) : [];
  const byBase = new Map(documents.documents.filter(d => d.local_file)
    .map(d => [d.local_file.split('/').pop().replace(/\.pdf$/i, ''), d]));

  const rows = d => `
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
</div>`;

  const groupsHtml = groupOrder.map(g => `
<section>
<h2>${esc(g)} <span class="sub">— ${groups[g].length} document${groups[g].length > 1 ? 's' : ''}</span></h2>
${groups[g].map(rows).join('')}
</section>`).join('');

  const ocrHtml = ocrHits.length ? `
<section>
<h2>Found inside the pages <span class="sub">— full-text matches in the OCR'd archive</span></h2>
${ocrHits.map(h => {
    const doc = byBase.get(h.base);
    const label = doc ? doc.title : h.base.replace(/^qc-/, 'Quorum court minutes ').replace(/-/g, ' ');
    const link = doc && doc.local_file ? `/files/${esc(doc.local_file.replace(/^inbox\//, ''))}` : (h.base.startsWith('qc-') ? `/files/minutes/${esc(h.base)}.pdf` : null);
    return `<div class="issue" style="display:block">
  <b>${doc ? `<a href="#${esc(doc.id)}">${esc(label)}</a>` : esc(label)}</b> <span class="code">${h.count} match${h.count > 1 ? 'es' : ''}</span>
  <p class="src">…${esc(h.snippet)}…</p>
  ${link ? `<p class="src"><a href="${link}">Read the archived PDF</a> · machine-read text; verify against the scan before citing.</p>` : ''}
</div>`;
  }).join('')}
</section>` : (q ? '<p class="src">No full-text matches inside the OCR\'d archive for that search.</p>' : '');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)}</div>
  <h1>Document library</h1>
  <div class="src">Every document behind the numbers — ${documents.documents.length} filed, hashed, and archived. Search covers titles, jurisdictions, years, and the full machine-read text of the minutes and ordinances. When a document is missing, the gap goes on the <a href="/docket">docket</a>.</div>
  <form method="GET" action="/documents" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
    <input type="search" name="q" value="${esc(q)}" placeholder="Search: ambulance, asphalt, salary, EDCCC, millage…"
      style="font-size:14px;padding:9px 12px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);flex:1;min-width:220px">
    <button type="submit" style="font-family:var(--mono);font-size:13px;padding:9px 16px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer">Search</button>
    ${q ? '<a href="/documents" style="align-self:center;font-size:12.5px">clear</a>' : ''}
  </form>
  ${q ? `<p class="src" style="margin-top:8px">${docs.length} document${docs.length === 1 ? '' : 's'} match "${esc(q)}"${ocrHits.length ? ` · ${ocrHits.length} full-text hit${ocrHits.length > 1 ? 's' : ''} inside the pages` : ''}.</p>` : ''}
</header>
${ocrHtml}
${groupsHtml || '<p class="src">No documents match — try fewer words.</p>'}`;
  return layout({
    title: `Document library — ${county.platform_name}`, current: '/documents', body, county,
    description: 'Every document behind the numbers — searchable by title, year, jurisdiction, and the full text of the OCR\'d minutes and ordinances.'
  });
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
  <div class="src">Budgets are self-auditing: line items must sum to category totals, categories to departments, departments to funds, funds to the ordinance's own grand total of ${money(budget.meta.grand_total)} — to the dollar, no rounding. This page is the arithmetic receipt for the whole <a href="/budget">money trail</a>. Any line that cannot be checked yet says so on its own citation page.</div>
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

<section id="threshold">
<h3>Where the delivery number comes from</h3>
${(() => {
  const { deliveryInfo } = require('../lib/threshold');
  const t = deliveryInfo(county);
  return `<p>When enough residents back the same priority, we print it and carry it to the body that decides. "Enough" isn't a number we invented. In the United States, the count that actually forces a government to act — a ballot initiative or referendum — is a <b>share of the votes cast in the last election</b>, not a share of the population. Arkansas county measures need signatures equal to 15% of the votes for a county office; Texas city charters commonly set 5%; the UK Parliament promises a response at a flat 10,000.</p>
  <p>Ours is an <b>advisory</b> bar — a request to be heard, not a binding measure — so we sit at the low, reachable end: <b>about 5% of the votes cast last election</b>. For ${esc(county.name)} that comes to <b>${t.value.toLocaleString('en-US')}</b>. ${esc(t.note)} A city-level priority is sized to that city's own electorate the same way. Where a real local petition rule sets an exact number, we use that instead — and say so here.</p>`;
})()}
</section>

<section>
<h3>What this site never does</h3>
<p>It never editorializes, never advocates, and never guesses. A dead end means "not yet ingested and navigable" — never "hidden." Where a number could be misread without context (like the county's $45,921 fire pass-through, which is only one slice of how fire departments are funded), the caveat is attached to the number itself.</p>
<p>And it never investigates people, and never renders verdicts — in either direction. This site maps where public money goes, as public documents draw the map. Naming a payee documents a transaction, not a suspicion. Where the map has a missing piece, the site asks for that piece — openly, from the records that hold it — and publishes what the record shows, whatever it shows. The trail and where it stops: that is the entire product.</p>
</section>

<section>
<h3>Independent — and plainly so</h3>
<p><b>${esc(county.platform_name)} is not a government website.</b> It is an independent project built by a resident, with no affiliation with, funding from, or endorsement by ${esc(county.name)}, the City of Arkadelphia, any school district, or any government body. For official business — paying taxes, filing records, contacting offices — use the official sites: <a href="https://www.clarkcountyar.gov" rel="noopener">clarkcountyar.gov</a> for the county and <a href="https://www.arkadelphia.gov" rel="noopener">arkadelphia.gov</a> for the city.</p>
<p><b>The documents here are public records.</b> Ordinances, budgets, minutes, and audit reports are government records, obtained from official sources under the Arkansas Freedom of Information Act (Ark. Code § 25-19-101 et seq.) or from public websites. Government edicts and public records carry no copyright that bars republication; each document page shows where its copy came from and its checksum so you can confirm it is unaltered.</p>
<p><b>Question results are unofficial.</b> Counts on this site are community sentiment gathered by a private platform. They are not an election, not a referendum, not a petition under any statute, and they bind no one. Their only power is that the counting method is published and checkable.</p>
<p><b>Nothing here is professional advice.</b> The Help Finder shares contact information for local programs; each program decides its own eligibility, and hours and rules change — call ahead. Budget figures are transcriptions of public documents, not financial, legal, or tax advice.</p>
<p><b>Names appear only as public records place them.</b> Officials, vendors, and payees are named exactly as ordinances, minutes, and audits name them — documenting transactions and offices, never alleging anything about anyone. If you believe something here misstates a record, say so and we will check it against the source and correct it in public, with the correction logged.</p>
</section>

<section>
<h3>Who pays for this</h3>
<p>${esc(county.platform_name)} is free, carries no ads, and sells nothing. ${esc(county.sponsor_line)}. This site is versioned in a public repository, so every change to every number has a public history.</p>
</section>`;
  return layout({ title: `Methodology — ${county.platform_name}`, current: '/methodology', body, county });
}

module.exports = { docketPage, documentsPage, verifyPage, methodologyPage };
