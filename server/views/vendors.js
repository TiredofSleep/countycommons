const { esc, money, STATUS } = require('../lib/corpus');
const { layout } = require('./layout');

// Layer three, made navigable: every payee a public document names,
// the pools no document names yet, and the records request that would
// complete the picture. Documents transactions; accuses no one.

function vendorsPage(data) {
  const { county, documents, vendors } = data;

  // A county whose layer-three trail hasn't been ingested yet: honest empty
  // state, not a crash. A dead end means "not yet ingested," never "hidden."
  if (!vendors || !vendors.named) {
    return layout({
      title: `Who gets paid — ${county.platform_name}`, current: '/vendors', county,
      body: `<header class="page"><div class="eyebrow">${esc(county.name)}, ${esc(county.state)}</div>
<h1>Who gets paid</h1>
<div class="src">This page names the companies and people that public documents show receiving ${esc(county.name)} money — and marks the pools where no document names a payee yet. For ${esc(county.name)}, this layer isn't ingested yet: the budget shows the funds on the <a href="/budget">money trail</a>, but the checks, contracts, and bid awards that name the actual payees are the next pull — from quorum court minutes, bid records, and the check register. Not hidden; not yet navigable.</div></header>`,
      description: `${county.name}: who receives public money, as documents name them.`
    });
  }

  const namedRows = vendors.named.map(v => {
    const s = STATUS[v.status];
    const doc = v.source ? documents.documents.find(d => d.id === v.source.doc) : null;
    return `
<div class="issue" style="display:block">
  <b>${esc(v.who)}</b>
  ${v.amount ? `<span class="amt" style="margin-left:8px">${money(v.amount)}</span>` : ''}
  <span class="chip ${s.cls}" style="margin-left:8px">${s.mark} ${esc(s.label)}</span>
  <p style="font-size:13px;margin:6px 0 2px">${esc(v.what)}</p>
  <p class="src">${esc(v.when)}.${v.note ? ' ' + esc(v.note) : ''}
  ${doc ? ` Source: <a href="/documents#${esc(doc.id)}">${esc(doc.title)}</a>${v.source.page ? `, page ${v.source.page}` : ''}.` : ''}</p>
</div>`;
  }).join('');

  const poolRows = vendors.unnamed_pools.map(p => `
<tr>
  <td><a href="/line/${esc(p.node)}">${esc(p.line)}</a></td>
  <td class="num">${money(p.amount)}</td>
  <td><span class="chip c-dead">✖ payees unnamed</span></td>
</tr>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · layer three — who gets paid</div>
  <h1>Who gets paid</h1>
  <div class="src">${esc(vendors.intro)}</div>
</header>

<section>
<h2>Payees named in public documents <span class="sub">— so far</span></h2>
${namedRows}
</section>

<section>
<h2>The pools no document names yet <span class="sub">— bought yearly from real companies</span></h2>
<table class="plain">
<thead><tr><th>Budget line (2026)</th><th>Appropriated</th><th>Who receives it</th></tr></thead>
<tbody>${poolRows}</tbody>
</table>
<p class="src">These are appropriations — the authorization to spend. The names live in bid records and the check register.</p>
</section>

<section>
<h2>How this becomes knowable <span class="sub">— the records exist; they're just not posted</span></h2>
${vendors.how_it_becomes_knowable.map(h => `<p class="src">· ${esc(h)}</p>`).join('')}
</section>

<section>
<h2>The records request, ready to send <span class="sub">— any Arkansas citizen can send this</span></h2>
<p class="src">${esc(vendors.foia.law)} Custodian: ${esc(vendors.foia.custodian)}.</p>
<div class="card"><pre style="white-space:pre-wrap;font-family:var(--mono);font-size:12.5px;margin:0">${esc(vendors.foia.template)}</pre></div>
<p class="src">When the responsive records arrive, they go in the corpus like everything else — cited, hashed, and navigable. The open requests are tracked on <a href="/docket">the docket</a>.</p>
</section>`;

  return layout({ title: `Who gets paid — ${county.platform_name}`, current: '/vendors', body, county });
}

module.exports = { vendorsPage };
