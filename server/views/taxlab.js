const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');
const { readInputs, run, NOW } = require('../lib/taxlab');

// The tax lab page. A plain GET form (works with no JavaScript, fast on old
// phones): move a tax up or down, then see the household bill, the budget
// effect, what the money could do or what a cut is the size of, and where the
// law draws the line. It shows consequences both ways and recommends neither.

const m = (x) => {
  const a = Math.abs(x), s = x < 0 ? '−' : '';
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)} billion`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1)} million`;
  return `${s}${money(Math.round(a))}`;
};
const signed = (x) => (x > 0 ? '+' : '') + m(x);
const pct = (x) => `${(x * 100).toFixed(Math.abs(x) < 0.1 ? 1 : 0)}%`;

function fmtRate(L, v) {
  if (L.kind === 'sales') return `${Number(v.toFixed(3))}%`;
  if (L.unit === 'mills') return `${Number(v.toFixed(2))} mills`;
  return `${Number(v.toFixed(4))}¢ per $100`;
}
function fmtStep(L, d) {
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
  const a = Math.abs(d);
  if (L.kind === 'sales') return `${sign}${Number(a.toFixed(3))}%`;
  if (L.unit === 'mills') return `${sign}${Number(a.toFixed(2))} mill${a === 1 ? '' : 's'}`;
  return `${sign}${Number(a.toFixed(2))}¢`;
}

function taxLabPage(data, query, ctx) {
  const { county, taxLab: lab, documents } = data;
  const docs = new Map(documents.documents.map(d => [d.id, d]));
  const cite = (s) => {
    if (!s) return '';
    const d = docs.get(s.doc);
    if (d) return `<a href="/documents#${esc(d.id)}">${esc(d.title)}</a>${s.page ? `, ${esc(s.page)}` : ''}`;
    if (s.url) return `<a href="${esc(s.url)}">${esc(s.label || s.url)}</a>`;
    return '';
  };
  const inputs = readInputs(lab, query);
  const r = run(lab, inputs, ctx);
  const field = 'font-family:var(--mono);font-size:14px;padding:7px 9px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);box-sizing:border-box;max-width:100%';

  const control = (L) => {
    const opts = [];
    for (let v = L.min_change; v <= L.max_change + 1e-9; v += L.step) {
      const x = Number(v.toFixed(4));
      opts.push(`<option value="${x}"${Math.abs(x - inputs.changes[L.id]) < 1e-9 ? ' selected' : ''}>${x === 0 ? 'No change' : fmtStep(L, x)} → ${fmtRate(L, L.base + x)}</option>`);
    }
    return `<label class="src" style="max-width:none;display:block;margin:0 0 10px">${esc(L.name)} <span class="soft">— now ${fmtRate(L, L.base)}</span><br>
      <select name="d_${esc(L.id)}" style="${field};margin-top:3px;width:100%">${opts.join('')}</select></label>`;
  };
  const prop = lab.layers.filter(L => L.kind === 'property');
  const sales = lab.layers.filter(L => L.kind === 'sales');

  const form = `
<form method="GET" action="/taxlab" class="issue" style="display:block">
  <input type="hidden" name="run" value="1">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 18px">
    <div><div class="eyebrow" style="margin:0 0 8px">Property tax</div>${prop.map(control).join('')}</div>
    <div><div class="eyebrow" style="margin:0 0 8px">Sales tax</div>${sales.map(control).join('')}</div>
  </div>
  <div class="eyebrow" style="margin:6px 0 8px">Your household</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px 18px;align-items:flex-end">
    <label class="src" style="max-width:none">Home value ($)<br><input name="home" type="number" min="0" step="1000" value="${inputs.home}" style="${field};margin-top:3px;width:150px"></label>
    <label class="src" style="max-width:none">Taxable purchases a year ($)<br><input name="spend" type="number" min="0" step="500" value="${inputs.spend}" style="${field};margin-top:3px;width:150px"></label>
    ${lab.household.homestead_credit ? `<label class="src" style="max-width:none"><input type="checkbox" name="hs" value="1"${inputs.homestead ? ' checked' : ''}> It’s my homestead ($${lab.household.homestead_credit} credit)</label>` : ''}
    <button type="submit" style="font-family:var(--mono);font-size:14px;padding:9px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer">Run it</button>
    <a class="src" href="/taxlab">Reset</a>
  </div>
  <p class="src" style="margin:10px 0 0">${esc(lab.household.where)}</p>
</form>`;

  const h = r.household;
  const hDiff = h.after - h.before;
  const householdCard = `
<section id="household">
<h2>Your household <span class="sub">— a ${m(inputs.home)} home, ${m(inputs.spend)} of taxable purchases a year</span></h2>
<table class="plain"><tbody>
<tr><td>Property tax a year${h.credit ? ` (after the $${h.credit} homestead credit)` : ''}</td><td class="num">${m(h.propBefore)}</td><td class="num">→ ${m(h.propAfter)}</td></tr>
<tr><td>Local sales tax a year</td><td class="num">${m(h.salesBefore)}</td><td class="num">→ ${m(h.salesAfter)}</td></tr>
<tr><td><b>Change</b></td><td></td><td class="num"><b>${hDiff === 0 ? 'no change' : `${signed(hDiff)} a year`}</b>${hDiff !== 0 ? `<br><span class="soft" style="font-size:12px">${signed(hDiff / 12)} a month</span>` : ''}</td></tr>
</tbody></table>
<p class="src">${esc(lab.household.note)}</p>
</section>`;

  // When nothing has moved yet: what one step of each tax is worth.
  const primer = `
<section id="per-step">
<h2>What one step is worth <span class="sub">— before you change anything</span></h2>
${r.layers.map(({ L }) => {
    const one = L.kind === 'sales' ? L.step * L.per_point : L.step * L.per_unit;
    return `<div style="border-bottom:1px solid var(--rule-soft);padding:9px 0">
  <b>${esc(L.name)}</b> <span class="soft">— now ${fmtRate(L, L.base)}</span>
  <div style="font-size:14px">${fmtStep(L, L.step)} raises about <b>${m(one)}</b> a year.${L.budget ? ` That’s ${pct(one / L.budget.amount)} of ${esc(L.budget.label)}.` : ''}</div>
  <div class="src">${esc(L.base_note || '')} ${cite(L.source)}</div>
</div>`;
  }).join('')}
</section>`;

  const layerCards = r.layers.filter(x => x.d !== 0).map(x => {
    const L = x.L;
    const lines = [];
    if (x.share !== undefined) lines.push(`That’s ${pct(Math.abs(x.share))} of ${esc(L.budget.label)} (${m(L.budget.amount)}).`);
    if (x.revenue > 0) {
      if (x.payoff && x.payoff.years > 0) lines.push(`Put toward debt, it could pay off the ${m(x.payoff.owed)} still owed by about <b>${x.payoff.sooner}</b> instead of ${x.payoff.normal} — if the bonds can be paid early.`);
      for (const p of x.projects || []) lines.push(`Saved up, it would pay cash for ${esc(p.name)} (${m(p.amount)}) in about <b>${p.years < 1 ? 'under a year' : `${p.years.toFixed(1)} years`}</b>.`);
    }
    if (x.revenue < 0) {
      if (x.size && x.size.below) lines.push(`A cut this size is more than the whole budget for <b>${esc(x.size.below.name)}</b> (${m(x.size.below.amount)})${x.size.above ? `, and less than ${esc(x.size.above.name)} (${m(x.size.above.amount)})` : ''}.`);
      else if (x.size && x.size.above) lines.push(`A cut this size is smaller than the smallest listed budget line, ${esc(x.size.above.name)} (${m(x.size.above.amount)}).`);
      if (x.reserveYears) lines.push(`Paid from savings instead of cuts, it would use up ${esc(L.reserve.label)} (${m(L.reserve.amount)}) in about <b>${x.reserveYears.toFixed(1)} years</b>.`);
    }
    const flags = x.flags.map(f => `<p style="margin:6px 0 0"><span class="chip ${f.kind === 'limit' ? 'c-dead' : 'c-part'}">${f.kind === 'limit' ? 'the law doesn’t allow this' : 'needs a vote of the people'}</span> ${esc(f.text)} ${cite(f.source)}</p>`).join('');
    return `
<div style="border-bottom:1px solid var(--rule-soft);padding:10px 0">
  <b>${esc(L.name)}</b>: ${fmtRate(L, L.base)} → <b>${fmtRate(L, x.next)}</b>
  <div style="font-family:var(--mono);font-size:18px;margin:4px 0">${signed(x.revenue)} a year <span class="soft" style="font-family:var(--sans);font-size:13px">to ${esc(L.gov)}</span></div>
  <div style="font-size:14px">${lines.join(' ')}</div>
  ${flags}
</div>`;
  }).join('');

  const results = r.changed ? `
<section id="budget">
<h2>What it does to the budget <span class="sub">— ${signed(r.totalRevenue)} a year in all</span></h2>
${layerCards}
</section>` : primer;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · tax lab</div>
  <h1>Change the taxes. See what happens.</h1>
  <div class="src">${esc(lab.intro)} Updated ${esc(lab.updated)}.</div>
</header>

<section>
<h2>Turn the dials <span class="sub">— up or down</span></h2>
${form}
</section>
${householdCard}
${results}

<section id="the-lines">
<h2>Where the law draws the lines</h2>
<ul>${lab.law.map(x => `<li>${esc(x.text)} ${cite(x.source)}</li>`).join('')}</ul>
</section>

<section id="limits">
<h2>What this doesn’t show <span class="sub">— the honest limits</span></h2>
<ul>${lab.limits.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p class="src">See also: <a href="/whatif">What if we saved instead of borrowing?</a> · <a href="/budget">The money trail</a>. This page computes and cites; it doesn’t recommend raising or cutting anything. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `Tax lab — ${county.platform_name}`, current: '/taxlab', body, county,
    description: `Raise or lower ${county.name}'s property and sales taxes and see the effect on a household bill, the budget, debt, and savings — every rate and tax base cited.`
  });
}

module.exports = { taxLabPage };
