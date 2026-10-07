const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');

// Your tax bill, explained. A household enters its assessed value; the page
// splits the property tax across every government that levies it, then across
// what each one spends money on, and shows the gap to each government's
// published "no-raise" (rolled-back) rate. Arithmetic on cited rates only —
// it never says what a rate should be.

const cents = (x) => '$' + x.toFixed(2);
const dollars = (x) => '$' + Math.round(x).toLocaleString('en-US');

function compute(b, value, homestead) {
  const taxable = (kind) => Math.max(0, value - (homestead ? (b.exemptions[kind] || 0) : 0));
  const govs = b.authorities.map(a => {
    const tv = taxable(a.kind);
    const parts = a.parts || [{ label: null, mills: a.mills, slices: a.slices, slices_note: a.slices_note }];
    let tax = 0;
    const slices = [];
    for (const p of parts) {
      const t = tv * p.mills / 1000;
      tax += t;
      const w = p.slices.reduce((s, x) => s + x[1], 0);
      for (const [name, weight, tag] of p.slices) slices.push({ name, tag, part: p.label, amount: w ? t * weight / w : 0 });
    }
    const rb = (a.rollback !== null && a.rollback !== undefined) ? tv * a.rollback / 1000 : null;
    return { a, parts, taxable: tv, tax, slices, rbTax: rb, extra: rb === null ? null : tax - rb };
  });
  const total = govs.reduce((s, g) => s + g.tax, 0);
  const byTag = {};
  for (const g of govs) for (const s of g.slices) byTag[s.tag] = (byTag[s.tag] || 0) + s.amount;
  return { govs, total, byTag };
}

function myBillPage(data, query) {
  const { county, myBill: b, documents } = data;
  if (!b) {
    return layout({ title: `Your tax bill, explained — ${county.platform_name}`, current: '/mybill', county, body: `
<header class="page"><div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · your tax bill</div>
<h1>Your tax bill, explained</h1>
<div class="src">Not built for ${esc(county.name)} yet — not gathered, not hidden. It needs every tax rate on a local bill, each government’s published rates, and its budget. Try the <a href="/taxlab">tax lab</a> or the <a href="/budget">money trail</a> meanwhile.</div></header>` });
  }
  const docs = new Map(documents.documents.map(d => [d.id, d]));
  const cite = (s) => {
    if (!s) return '';
    const d = s.doc && docs.get(s.doc);
    if (d) return `<a href="/documents#${esc(d.id)}">${esc(d.title)}</a>${s.page ? `, ${esc(s.page)}` : ''}`;
    if (s.url) return `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.url)}</a>`;
    return '';
  };
  let value = Number(query.value);
  if (!Number.isFinite(value) || value < 0) value = b.home_default;
  value = Math.min(20e6, Math.round(value));
  const homestead = query.run === '1' ? query.hs === '1' : true;
  const r = compute(b, value, homestead);
  const per100 = (x) => r.total ? x / r.total * 100 : 0;
  const bar = (pct) => `<div style="background:var(--rule-soft);height:9px;max-width:300px;margin:3px 0 0"><div style="width:${Math.min(100, pct)}%;height:9px;background:var(--accent)"></div></div>`;

  const form = `
<form method="GET" action="/mybill" class="issue" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
  <input type="hidden" name="run" value="1">
  <label class="src" style="max-width:none">Assessed value (from your TRIM notice or bcpao.us)<br>
    <input name="value" type="number" min="0" step="1000" value="${value}" style="font-family:var(--mono);font-size:15px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);margin-top:3px;width:11em;max-width:100%"></label>
  <label class="src" style="max-width:none;display:flex;gap:6px;align-items:center"><input type="checkbox" name="hs" value="1"${homestead ? ' checked' : ''}> It’s my homestead</label>
  <button type="submit" style="font-family:var(--mono);font-size:14px;padding:9px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer">Explain my bill</button>
</form>`;

  const govRows = r.govs.slice().sort((x, y) => y.tax - x.tax).map(g => `
<div style="padding:7px 0;border-bottom:1px solid var(--rule-soft)">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span><b>${esc(g.a.name)}</b></span><span class="num"><b>${cents(per100(g.tax))}</b> <span class="soft" style="font-size:12.5px">· ${dollars(g.tax)} a year</span></span></div>
  ${bar(per100(g.tax))}
</div>`).join('');

  const tagRows = Object.entries(r.byTag).reduce((acc, [tag, amt]) => {
    const label = b.tags[tag] || tag;
    acc[label] = (acc[label] || 0) + amt;
    return acc;
  }, {});
  const tagList = Object.entries(tagRows).sort((x, y) => y[1] - x[1]).map(([label, amt]) => `
<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--rule-soft)${/Interest|debt/i.test(label) ? ';background:var(--part-bg,transparent)' : ''}"><span>${esc(label)}</span><span class="num"><b>${cents(per100(amt))}</b> <span class="soft" style="font-size:12.5px">· ${dollars(amt)}</span></span></div>`).join('');

  const rbGovs = r.govs.filter(g => g.extra !== null);
  const extraTotal = rbGovs.reduce((s, g) => s + g.extra, 0);
  const rbRows = rbGovs.slice().sort((x, y) => y.extra - x.extra).map(g => `
<tr><td><b>${esc(g.a.name)}</b><br><span class="soft" style="font-size:12px">${g.a.mills.toFixed(4)} mills vs. no-raise ${g.a.rollback.toFixed(4)}</span></td>
<td class="num">${g.extra >= 0 ? '+' : '−'}${cents(Math.abs(g.extra))}</td></tr>`).join('');

  const detail = r.govs.map(g => {
    const sl = g.slices.slice().sort((x, y) => y.amount - x.amount);
    const grouped = g.parts.length > 1
      ? g.parts.map(p => `<p class="src" style="margin:8px 0 2px;max-width:none"><b>${esc(p.label)}</b> — ${esc(p.slices_note || '')}</p>${sl.filter(s => s.part === p.label).map(s => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:14px;padding:3px 0"><span>${esc(s.name)}</span><span class="num">${dollars(s.amount)}</span></div>`).join('')}`).join('')
      : (sl.length > 1 ? `<p class="src" style="margin:6px 0 2px;max-width:none">${esc(g.a.slices_note || '')}</p>` : '') + sl.map(s => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:14px;padding:3px 0"><span>${esc(s.name)}</span><span class="num">${dollars(s.amount)}</span></div>`).join('');
    return `
<details class="issue" style="display:block">
  <summary style="cursor:pointer"><b>${esc(g.a.name)}</b> — ${dollars(g.tax)} a year</summary>
  <p class="src" style="max-width:none">${g.a.mills.toFixed(4)} mills on ${dollars(g.taxable)} of taxable value · ${esc(g.a.status)} · ${cite(g.a.src)}${g.a.link ? ` · <a href="${esc(g.a.link)}">its budget →</a>` : ''}</p>
  ${g.a.note ? `<p class="src" style="max-width:none">${esc(g.a.note)}</p>` : ''}
  ${grouped}
</details>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · your tax bill</div>
  <h1>Your tax bill, explained</h1>
  <div class="src">${esc(b.where)} Enter your own assessed value to see where every dollar of your property tax goes — and how it compares with each government’s “no-raise” rate. Updated ${esc(b.updated)}.</div>
</header>
${form}

<section>
<h2>${dollars(r.total)} a year <span class="sub">— about ${dollars(r.total / 12)} a month</span></h2>
<p class="src" style="max-width:none">On an assessed value of ${dollars(value)}${homestead ? ', with the homestead exemption' : ', without a homestead exemption'}. An estimate from published rates — your own TRIM notice and tax bill are the final word.</p>
<h3 style="margin-top:14px">Of every $100 you pay</h3>
${govRows}
</section>

<section>
<h2>Where it ends up <span class="sub">— every government’s share, by what it pays for</span></h2>
${tagList}
<p class="src" style="max-width:none">Each government’s share is spread the way its own budget spends money. Open a government below to see its lines and sources.</p>
</section>

<section id="no-raise">
<h2>The “no-raise” rate <span class="sub">— the rolled-back rate</span></h2>
<p>${esc(b.rollback_note)}</p>
${rbGovs.length ? `<p style="font-size:15px">At these rates you pay <b>${extraTotal >= 0 ? cents(extraTotal) + ' more' : cents(-extraTotal) + ' less'}</b> a year than you would at every government’s no-raise rate.</p>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${rbRows}</tbody></table></div>` : ''}
<p class="src" style="max-width:none">${esc(b.hearing)} Districts without a published no-raise rate here aren’t in the comparison. Meetings are on the <a href="/calendar">calendar</a>.</p>
</section>

<section>
<h2>Each government, line by line</h2>
${detail}
</section>

<section>
<h2>What this doesn’t show <span class="sub">— the honest limits</span></h2>
<ul>
<li>Fees and assessments on the same bill — stormwater, trash, street lights and others — aren’t property taxes and aren’t included.</li>
<li>${esc(b.exemptions.note)} Senior, veteran, widow and disability exemptions aren’t modeled.</li>
<li>Some rates are the July proposals; the final rates were set in September. Each line says which.</li>
<li>Spreading a government’s tax across its whole budget is a fair picture, not a receipt: most budgets also run on other money (sales tax, state aid, fees).</li>
</ul>
<p class="src">Related: <a href="/taxlab">Tax lab — change the rates</a> · <a href="/budget">The money trail</a> · <a href="/whatif">What if we saved?</a>. This page computes and cites; it doesn’t say what any rate should be. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `Your tax bill, explained — ${county.platform_name}`, current: '/mybill', body, county,
    description: `Enter your assessed value and see where every dollar of your ${county.name} property tax goes — by government and by what it pays for — and how it compares with each government’s no-raise rate.`
  });
}

module.exports = { myBillPage, compute };
