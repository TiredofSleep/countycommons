// Money in, money out: a county general fund's five years, from the state
// auditors' own schedule. Numbers and plain arithmetic only — no verdict.
const { esc } = require('./corpus');
const d0 = (x) => (x < 0 ? '−$' : '$') + Math.abs(Math.round(x)).toLocaleString('en-US');

function facts(f) {
  const n = f.years.length, last = 0, first = n - 1; // years are newest first
  const change = f.balance[last] - f.balance[first];
  const short = f.years.filter((y, i) => f.spending[i] > f.revenue[i]);
  const months = f.spending[last] > 0 ? f.balance[last] / (f.spending[last] / 12) : null;
  return { change, short, months, from: f.years[first], to: f.years[last] };
}

function block(f, cite) {
  if (!f || !f.years) return '';
  const k = facts(f);
  const tr = (i) => !f.roll || f.roll[i] === null ? '' : Math.abs(f.roll[i]) <= 1 ? ' ✓' : ` <span class="soft" style="font-size:12px">(off ${d0(f.roll[i])})</span>`;
  const rows = f.years.map((y, i) => `<tr><td>${y}</td><td class="num">${d0(f.revenue[i])}</td><td class="num">${d0(f.spending[i])}</td>${f.other ? `<td class="num">${d0(f.other[i])}</td>` : `<td class="num">${d0(f.revenue[i] - f.spending[i])}</td>`}<td class="num"><b>${d0(f.balance[i])}</b>${tr(i)}</td></tr>`).join('');
  return `
<section id="fiscal">
<h2>Money in, money out <span class="sub">— the ${esc(f.fund.toLowerCase())}, ${k.from}–${k.to}</span></h2>
<p>The general fund pays for most county offices. Over these five years its balance — what's left in reserve at year's end — went from <b>${d0(f.balance[f.years.length - 1])}</b> to <b>${d0(f.balance[0])}</b> (${k.change >= 0 ? 'up' : 'down'} ${d0(Math.abs(k.change))}). Spending was more than revenue in ${k.short.length} of the ${f.years.length} years${k.short.length ? ` (${k.short.join(', ')})` : ''}.${k.months !== null ? ` At ${k.to} spending, the year-end balance would cover about <b>${k.months.toFixed(1)} months</b>.` : ''}</p>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>Year</th><th class="num">Money in</th><th class="num">Money out</th><th class="num">${f.other ? 'Transfers & other' : 'Difference'}</th><th class="num">Balance, Dec. 31</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="src" style="max-width:none">Source: ${cite}, “Schedule of Selected Information for the Last Five Years — General Fund” (page ${esc(f.source.page)}; the auditors label this schedule unaudited). “Money in” is net revenue. ${f.other ? 'A ✓ means that year’s balance equals the year before, plus money in, minus money out, plus transfers — to the dollar; “off” shows where the schedule doesn’t reconcile (often an adjustment it doesn’t list). The earliest year can’t be checked. Figures are as printed.' : 'Transfers between funds aren’t listed, so a year’s difference may not equal the change in balance.'} ${f.checked ? '✓ Each year’s assets minus liabilities equals its balance, to the dollar.' : 'This schedule doesn’t print assets and liabilities, so the balances couldn’t be cross-checked.'} A shrinking balance can mean planned spending of savings (a building project, a one-time purchase) or a gap between what comes in and goes out — the county's budget and minutes say which.</p>
</section>`;
}

module.exports = { block, facts };
