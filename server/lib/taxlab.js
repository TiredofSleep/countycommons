// The tax lab: turn a tax up or down and see what it does — to a household's
// bill, to the budget, and to what the government could pay for or would have
// to give up. Arithmetic only; every rate and tax base comes from taxlab.json,
// which cites the document each came from. It never says which way to turn.

const NOW = 2026;

const round = (x, step) => Math.round(x / step) * step;

// Reads the visitor's choices from the query string, clamped to each layer's
// allowed range so the page can't be pushed into nonsense.
function readInputs(lab, q) {
  const inputs = { changes: {}, home: lab.household.home_default, spend: lab.household.spend_default, homestead: true };
  for (const L of lab.layers) {
    let v = Number(q['d_' + L.id]);
    if (!Number.isFinite(v)) v = 0;
    v = Math.min(L.max_change, Math.max(L.min_change, round(v, L.step)));
    inputs.changes[L.id] = Number(v.toFixed(4));
  }
  const home = Number(q.home), spend = Number(q.spend);
  if (Number.isFinite(home) && home >= 0) inputs.home = Math.min(5e6, Math.round(home));
  if (Number.isFinite(spend) && spend >= 0) inputs.spend = Math.min(1e6, Math.round(spend));
  if (q.run === '1') inputs.homestead = q.hs === '1';
  return inputs;
}

// Property tax on a home for one layer, at a given rate.
function homeTax(lab, L, rate, home, homestead) {
  if (homestead && L.homestead_exempt) home = Math.max(0, home - L.homestead_exempt);   // e.g. Texas school exemption
  if (L.unit === 'mills') return home * lab.household.assess_ratio * rate / 1000;   // Arkansas: mills on assessed value
  return home / 100 * rate / 100;                                                    // Texas: cents per $100 of value
}

// Extra money a year applied to what's owed: the first year the remaining
// scheduled payments are covered. (Early payoff assumes bonds can be called.)
function payoffWith(pay, extra) {
  const future = pay.filter(p => p.year > NOW).sort((a, b) => a.year - b.year);
  if (!future.length) return null;
  const owed = future.reduce((s, p) => s + p.amount, 0);
  const normal = future[future.length - 1].year;
  let cum = 0;
  for (const p of future) {
    cum += p.amount + extra;
    if (cum >= owed - 1) return { owed, normal, sooner: p.year, years: normal - p.year };
  }
  return { owed, normal, sooner: normal, years: 0 };
}

// What a cut is the size of: the biggest budget line it covers, and the next one up.
function sizeOf(list, amount) {
  const a = Math.abs(amount);
  const sorted = list.slice().sort((x, y) => x.amount - y.amount);
  const below = sorted.filter(x => x.amount <= a).pop() || null;
  const above = sorted.find(x => x.amount > a) || null;
  return { below, above };
}

function run(lab, inputs, ctx) {
  const layers = lab.layers.map(L => {
    const d = inputs.changes[L.id];
    const next = Number((L.base + d).toFixed(4));
    const perUnit = L.kind === 'sales' ? L.per_point : L.per_unit;     // $ per 1% of sales tax, or per mill / per 1¢
    const revenue = d * perUnit;
    const flags = (L.caps || []).filter(c =>
      (c.above !== undefined && next > c.above + 1e-9) || (c.below !== undefined && next < c.below - 1e-9));
    const out = { L, d, next, revenue, flags };
    if (L.kind === 'property' && L.on_home) {
      out.homeBefore = homeTax(lab, L, L.base, inputs.home, inputs.homestead);
      out.homeAfter = homeTax(lab, L, next, inputs.home, inputs.homestead);
    }
    if (L.kind === 'sales' && L.on_spend) {
      out.spendBefore = inputs.spend * L.base / 100;
      out.spendAfter = inputs.spend * next / 100;
    }
    if (L.budget) out.share = revenue / L.budget.amount;
    if (revenue > 0) {
      if (L.debt_gov && ctx.debt[L.debt_gov]) out.payoff = payoffWith(ctx.debt[L.debt_gov], revenue);
      out.projects = (L.projects || []).map(p => ({ ...p, years: p.amount / revenue }));
    }
    if (revenue < 0) {
      const list = ctx.compare[L.compare] || [];
      if (list.length) out.size = sizeOf(list, revenue);
      if (L.reserve) out.reserveYears = L.reserve.amount / -revenue;
    }
    return out;
  });

  // The household: property layers that apply to the chosen home, sales layers
  // that apply to the chosen spending, and the homestead credit where it exists.
  const credit = inputs.homestead ? (lab.household.homestead_credit || 0) : 0;
  const propBefore = layers.reduce((s, x) => s + (x.homeBefore || 0), 0);
  const propAfter = layers.reduce((s, x) => s + (x.homeAfter || 0), 0);
  const salesBefore = layers.reduce((s, x) => s + (x.spendBefore || 0), 0);
  const salesAfter = layers.reduce((s, x) => s + (x.spendAfter || 0), 0);
  const household = {
    propBefore: Math.max(0, propBefore - credit), propAfter: Math.max(0, propAfter - credit),
    salesBefore, salesAfter, credit
  };
  household.before = household.propBefore + household.salesBefore;
  household.after = household.propAfter + household.salesAfter;
  const totalRevenue = layers.reduce((s, x) => s + x.revenue, 0);
  const changed = layers.some(x => x.d !== 0);
  return { layers, household, totalRevenue, changed };
}

module.exports = { readInputs, run, NOW };
