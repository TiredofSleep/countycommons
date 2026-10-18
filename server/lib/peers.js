// How a county is doing, beside counties like it: same metro/rural status (HUD's
// fair market rent areas), a similar population (half to double) and a similar
// median household income (within 15%, widened if too few match). For each
// measure: the county's value, the typical similar county, where it stands
// nationally, and the similar counties doing best — all computed, nothing judged
// beyond "lower is better" on measures where that's plain (deaths, poverty).
const { esc } = require('./corpus');

const num = (x) => Math.round(x).toLocaleString('en-US');
const PCT = (x) => (x * 100).toFixed(1) + '%';
const H = (k) => (c) => c.health && c.health[k] > 0 ? c.health[k] : null;
// [key (what-works topic), label, value fn, lower is better?, format]
const MEASURES = [
  ['overdose', 'Drug overdose deaths per 100,000', H('Drug Overdose Deaths'), true, (x) => x.toFixed(1)],
  ['premature_death', 'Life expectancy', H('Life Expectancy'), false, (x) => x.toFixed(1) + ' years'],
  ['uninsured', 'Adults under 65 without health insurance', H('Uninsured'), true, PCT],
  ['primary_care', 'Residents per primary care doctor', H('Primary Care Physicians'), false, (x) => num(1 / x)],
  ['mental_health', 'Residents per mental health provider', H('Mental Health Providers'), false, (x) => num(1 / x)],
  ['child_poverty', 'Children in poverty', H('Children in Poverty'), true, PCT],
  ['food_insecurity', 'Food insecurity', H('Food Insecurity'), true, PCT],
  ['housing', 'Households with severe housing problems', H('Severe Housing Problems'), true, PCT],
  ['unemployment', 'Unemployment', H('Unemployment'), true, PCT],
  ['broadband', 'Households with broadband internet', H('Broadband Access'), false, PCT],
  ['jail', 'Jail population per 100,000 residents 15–64', (c) => c.jail && c.jail.rate > 0 && c.jail.year >= 2015 ? c.jail.rate : null, true, (x) => num(x)],
  ['bridges', 'Bridges rated poor', (c) => c.bridges && c.bridges.total >= 10 ? c.bridges.poor / c.bridges.total : null, true, PCT]
];

const metro = (c) => !!(c.housing && c.housing.areas[0] && c.housing.areas[0].metro);
const income = (c) => c.health && c.health['Median Household Income'];

function prepare(N) {
  if (N._peersBuilt) return;
  // metro and non-metro counties, each sorted by population, so a population
  // window is a slice found by binary search
  const groups = { true: [], false: [] };
  for (const c of N.counties) if (c.pop2024 && income(c)) groups[metro(c)].push(c);
  for (const g of Object.values(groups)) g.sort((a, b) => a.pop2024 - b.pop2024);
  const first = (g, p) => { let lo = 0, hi = g.length; while (lo < hi) { const m = (lo + hi) >> 1; if (g[m].pop2024 < p) lo = m + 1; else hi = m; } return lo; };
  for (const g of Object.values(groups)) for (const c of g) {
    const p = c.pop2024, inc = income(c);
    let peers = [];
    for (const [pr, ir] of [[1.5, 0.10], [2, 0.15], [3, 0.25], [5, 0.4], [10, 0.6]]) {
      peers = [];
      for (let i = first(g, p / pr); i < g.length && g[i].pop2024 <= p * pr; i++) if (g[i] !== c && Math.abs(income(g[i]) - inc) / inc <= ir) peers.push(g[i]);
      if (peers.length >= 25) break;
    }
    c._peers = peers;
  }
  // national position on each measure
  for (const [key, , fn] of MEASURES) {
    const vals = N.counties.map(fn).filter(v => v !== null).sort((a, b) => a - b);
    N['_dist_' + key] = vals;
  }
  N._peersBuilt = true;
}

const median = (a) => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const below = (sorted, v) => { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; } return lo / sorted.length; };

// One row per measure the county has: value, typical similar county, national
// standing, gap (positive = behind similar counties), best similar counties.
function compare(c, N) {
  prepare(N);
  c = N.counties.find(x => x.geoid === c.geoid) || c;
  const peers = c._peers || [];
  if (peers.length < 8) return null;
  const rows = [];
  for (const [key, label, fn, lower, fmt] of MEASURES) {
    const v = fn(c); if (v === null) continue;
    const pv = peers.map(o => [o, fn(o)]).filter(x => x[1] !== null);
    if (pv.length < 6) continue;
    const med = median(pv.map(x => x[1]));
    const gap = med ? (lower ? (v - med) / med : (med - v) / med) : 0;
    const best = pv.sort((a, b) => lower ? a[1] - b[1] : b[1] - a[1]).slice(0, 3).map(([o, x]) => ({ name: o.name, st: o.st, slug: o.slug, v: fmt(x) }));
    const pBelow = below(N['_dist_' + key], v);
    rows.push({ key, label, v: fmt(v), med: fmt(med), gap, better: lower ? 1 - pBelow : pBelow, best, n: pv.length });
  }
  return { peers: peers.length, metro: metro(c), income: income(c), rows };
}

const statusChip = (g) => g > 0.15 ? '<span class="chip c-dead">behind similar counties</span>' : g < -0.15 ? '<span class="chip c-ok">ahead of similar counties</span>' : '<span class="chip">about the same</span>';

// The block on county pages. linkBase: '' on tenant sites (links go to the
// national pages), the full apex URL is used for neighbors either way.
function block(c, N, opts = {}) {
  const cmp = compare(c, N); if (!cmp || !cmp.rows.length) return '';
  const S = (N.states[c.st] || {}).name || c.st;
  const href = (b) => `https://countycommons.us/us/${b.st.toLowerCase()}/${b.slug}`;
  const rows = cmp.rows.map(r => `<tr><td>${esc(r.label)}<br>${statusChip(r.gap)}</td><td class="num"><b>${esc(r.v)}</b></td><td class="num">${esc(r.med)}</td><td style="font-size:12.5px">${r.best.map(b => `<a href="${href(b)}">${esc(b.name)}, ${esc(b.st)}</a> ${esc(b.v)}`).join('<br>')}</td></tr>`).join('');
  const behind = cmp.rows.filter(r => r.gap > 0.15).sort((a, b) => b.gap - a.gap);
  return `
<section id="compared">
<h2>How ${esc(c.name)} compares <span class="sub">— beside ${cmp.peers} counties like it</span></h2>
<p>“Counties like it” means ${cmp.metro ? 'other counties in a metro area' : 'other counties outside metro areas'} with a similar number of people and a similar median household income (about $${num(cmp.income)} here). Comparing with them, instead of the whole country, shows what similar places have managed.${behind.length ? ` ${esc(c.name)} is furthest behind on <b>${behind.slice(0, 3).map(r => esc(r.label.toLowerCase())).join('</b>, <b>')}</b>.` : ''}</p>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>Measure</th><th class="num">${esc(c.name)}</th><th class="num">Typical similar county</th><th>Doing best among similar counties</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="src" style="max-width:none">“Behind” or “ahead” means more than 15% worse or better than the typical (median) similar county; small differences can be noise. Sources: County Health Rankings 2025 (health, money and internet), Vera Institute (jail, latest year from 2015 on), FHWA National Bridge Inventory 2025, HUD (metro areas), Census 2024 population. ${opts.more ? `<a href="${opts.more}">What has worked elsewhere</a> on each of these.` : ''}</p>
</section>`;
}

module.exports = { compare, block, MEASURES };
