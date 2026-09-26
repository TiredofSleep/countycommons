// What if we saved instead of borrowing? Replays a government's real bonds
// against real yearly market returns. Pure arithmetic — no advocacy: every plan
// shows what it costs, what it risks, and whether the law allows it today.
//
// The model, kept deliberately simple so anyone can check it:
// - Saving starts on Jan 1 of `start` and adds the same amount every year up to
//   the year of the last project. Each project is paid in cash at the start of
//   its year. The pot earns that calendar year's return.
// - `replay` lets the markets follow a different era: the first saving year
//   earns the returns of `replay`, the next year replay+1, and so on.
// - "Borrow" is what actually happened: the bond payments, year by year.
// - "Invest and borrow" puts the Treasury-bill saver's yearly amount into
//   stocks, borrows exactly as the government did, and pays the bonds from
//   the fund.
// Returns run through 2025; 2026 is counted with no market growth.

const NOW = 2026;
const LAST_RETURN = 2025;

function returnsFor(market, key, year, shift) {
  const y = market.years[String(year + shift)];
  if (!y) return 0;
  if (key === 'mix') return 0.6 * y.stock + 0.4 * y.tbond;
  return y[key];
}

function needsByYear(projects) {
  const need = {};
  for (const p of projects) need[p.year] = (need[p.year] || 0) + p.amount;
  return need;
}

// Replays a savings pot. Returns the balance at the end and the lowest point.
function replay(market, { projects, pay }, D, key, start, shift, mode) {
  const need = needsByYear(projects);
  const last = Math.max(...projects.map(p => p.year));
  const payments = {};
  for (const p of pay) payments[p.year] = p.amount;
  let B = 0, low = 0, dryYear = null;
  for (let y = start; y <= NOW; y++) {
    if (y <= last) B += D;
    B -= mode === 'borrow' ? (payments[y] || 0) : (need[y] || 0);
    if (B < low) { low = B; if (dryYear === null && B < -1) dryYear = y; }
    if (y <= LAST_RETURN) B *= 1 + returnsFor(market, key, y, shift);
  }
  return { end: B, low, dryYear };
}

// The least yearly amount that pays every project in cash on time.
function minDeposit(market, gov, key, start, shift) {
  let lo = 0, hi = 1e9;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (replay(market, gov, mid, key, start, shift, 'cash').low >= -1) hi = mid; else lo = mid;
  }
  return hi;
}

// Every possible replay era for this start year (1928 .. start).
function eras(start) {
  const out = [];
  for (let q = 1928; q <= start; q++) out.push(q);
  return out;
}

function simulate(market, gov, start, replayYear) {
  const shift = replayYear - start;
  const last = Math.max(...gov.projects.map(p => p.year));
  const years = last - start + 1;
  const borrowed = gov.projects.reduce((s, p) => s + p.amount, 0);
  const totalPay = gov.pay.reduce((s, p) => s + p.amount, 0);
  const paidSoFar = gov.pay.filter(p => p.year <= NOW).reduce((s, p) => s + p.amount, 0);
  const owed = totalPay - paidSoFar;
  const payoff = Math.max(...gov.pay.map(p => p.year));

  const plans = {};
  for (const key of ['tbill', 'mix', 'stock']) {
    const D = minDeposit(market, gov, key, start, shift);
    plans[key] = { perYear: D, years, total: D * years };
  }
  // How often a plan fixed at this amount would have come up short, across
  // every market era since 1928 — the price of chasing returns.
  for (const key of ['mix', 'stock']) {
    const D = plans[key].perYear;
    let short = 0, worst = 0;
    const all = eras(start);
    for (const q of all) {
      const r = replay(market, gov, D, key, start, q - start, 'cash');
      if (r.low < -1) { short++; worst = Math.min(worst, r.low); }
    }
    plans[key].shortCount = short;
    plans[key].eraCount = all.length;
    plans[key].worstShort = -worst;
  }
  const Dt = plans.tbill.perYear;
  const smart = replay(market, gov, Dt, 'stock', start, shift, 'borrow');
  const stocksCash = replay(market, gov, Dt, 'stock', start, shift, 'cash');
  plans.smart = { perYear: Dt, years, total: Dt * years, fund: smart.end, owed, net: smart.end - owed,
    dryYear: smart.dryYear, cashInStocks: stocksCash.end };
  return { borrowed, totalPay, interest: totalPay - borrowed, paidSoFar, owed, payoff, years, plans };
}

// Replay eras offered on the page — each a real stretch of market history.
const ERAS = [
  { year: null, label: 'What really happened' },
  { year: 1929, label: 'Like the years from 1929 (the Great Depression)' },
  { year: 1937, label: 'Like the years from 1937 (a second crash, then war)' },
  { year: 1950, label: 'Like the years from 1950 (the postwar boom)' },
  { year: 1966, label: 'Like the years from 1966 (inflation, flat stocks)' },
  { year: 1973, label: 'Like the years from 1973 (oil shock and a crash)' },
  { year: 1982, label: 'Like the years from 1982 (the long boom)' }
];
const STARTS = [1990, 1995, 2000, 2005, 2010];

module.exports = { simulate, ERAS, STARTS, NOW };
