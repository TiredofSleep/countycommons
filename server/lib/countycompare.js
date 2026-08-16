// Cross-county spending comparison — per resident, by function, with state
// (Arkansas) and national (US) benchmark lines.
//
// Honesty first (the whole point of this platform): the county bars are each
// county's 2026 BUDGET APPROPRIATIONS, all funds, from its own ordinance —
// exactly comparable to each other. The AR/US benchmarks are a DIFFERENT
// measure: the Census's FY2022 "direct general expenditure" (actual money
// spent, on a narrower basis, two years earlier). So the two counties compare
// apples-to-apples; the benchmark lines are for shape and scale, not an exact
// gap. Every figure cites its source.

const { load } = require('./corpus');

// Which nodes make up each function, per county. Explicit ids = transparent
// and correct; the page shows exactly what's included in each bar.
const COUNTIES = [
  { key: 'clarkar', name: 'Clark County', host: 'clarkar.countycommons.us', pop: 21000, pop_src: 'U.S. Census estimate' },
  { key: 'garlandar', name: 'Garland County', host: 'garlandar.countycommons.us', pop: 100180, pop_src: '2020 U.S. Census' }
];
const CROSSWALK = {
  clarkar: {
    public_safety: ['gf-sheriff', 'gf-jail', 'jail-funds'],
    roads: ['road-fund', 'motor-fuel'],
    solid_waste: ['sanitation'],
    library: ['library']
  },
  garlandar: {
    public_safety: ['gf-sheriff', 'jail', 'gar-detention-reserve', 'gar-jail-op-maintenance', 'gar-sheriff-commissary'],
    roads: ['road'],
    solid_waste: ['gar-solid-waste', 'gar-sw-cedar-glades', 'gar-sw-stormwater', 'gar-sw-house-to-house'],
    library: ['gar-library']
  }
};
// Garland's separate one-time capital road fund — shown as a footnote, not
// mixed into operating roads, so the road comparison stays fair.
const GARLAND_ROAD_CAPITAL = 16000000;

// Census 2022 Census of Governments — Finance (FY2022). Per-capita = Census
// dollar aggregates ÷ Census 2022 population.
const BENCH = {
  source: '2022 Census of Governments — Finance (FY2022), U.S. Census Bureau',
  source_url: 'https://www.census.gov/data/datasets/2022/econ/local/public-use-datasets.html',
  total: { ar: 466, us: 1480 },
  fn: {
    public_safety: { ar: 132, us: 207 },
    roads: { ar: 90, us: 89 },
    solid_waste: { ar: 17, us: 23 },
    library: { ar: 11, us: 11 }
  }
};

const METRICS = [
  { key: 'total', label: 'Total county spending' },
  { key: 'public_safety', label: 'Public safety (sheriff + jail)' },
  { key: 'roads', label: 'Roads (operating)' },
  { key: 'solid_waste', label: 'Solid waste' },
  { key: 'library', label: 'Library' }
];

function sumByIds(budget, ids) {
  const by = new Map(budget.nodes.map(n => [n.id, n]));
  return ids.reduce((a, id) => a + ((by.get(id) || {}).amount || 0), 0);
}

function compute() {
  const rows = METRICS.map(m => ({ key: m.key, label: m.label, counties: {}, bench: m.key === 'total' ? BENCH.total : BENCH.fn[m.key] }));
  const meta = {};
  for (const c of COUNTIES) {
    const data = load(c.key);
    meta[c.key] = { name: c.name, host: c.host, pop: c.pop, pop_src: c.pop_src, grand_total: data.budget.meta.grand_total };
    for (const m of METRICS) {
      const total = m.key === 'total' ? data.budget.meta.grand_total : sumByIds(data.budget, CROSSWALK[c.key][m.key] || []);
      const row = rows.find(r => r.key === m.key);
      row.counties[c.key] = { total, perCap: total / c.pop };
    }
  }
  return { rows, meta, bench: BENCH, garlandRoadCapitalPerCap: GARLAND_ROAD_CAPITAL / 100180, countyOrder: COUNTIES.map(c => c.key) };
}

module.exports = { compute, COUNTIES, BENCH };
