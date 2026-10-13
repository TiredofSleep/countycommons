// What makes each county page its own: where the county ranks among its
// state's counties on each measure, in plain sentences, and its nearest
// neighbors (any state) as links. Computed once from the national file.
const { esc } = require('./corpus');

const num = (x) => Math.round(x).toLocaleString('en-US');
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const perPupil = (c) => {
  const d = (c.schools && c.schools.districts) || [];
  const e = d.reduce((s, x) => s + (x.enroll || 0), 0);
  return e > 0 ? d.reduce((s, x) => s + (x.current || 0), 0) / e : null;
};
// [label, value fn, higher-is-"better"? (only for wording), format]
const MEASURES = [
  ['people', c => c.pop2024, null, v => num(v)],
  ['spending per student in its school districts', perPupil, null, v => '$' + num(v)],
  ['life expectancy', c => c.health && c.health['Life Expectancy'], true, v => v.toFixed(1) + ' years'],
  ['share of adults under 65 without health insurance', c => c.health && c.health.Uninsured, false, v => (v * 100).toFixed(1) + '%'],
  ['child poverty', c => c.health && c.health['Children in Poverty'], false, v => (v * 100).toFixed(1) + '%'],
  ['households with broadband internet', c => c.health && c.health['Broadband Access'], true, v => (v * 100).toFixed(1) + '%'],
  ['median household income', c => c.health && c.health['Median Household Income'], true, v => '$' + num(v)],
  ['share of bridges rated poor', c => c.bridges && c.bridges.total >= 10 ? c.bridges.poor / c.bridges.total : null, false, v => (v * 100).toFixed(1) + '%'],
  ['federal grant dollars per resident', c => c.fedgrants && c.fedgrants.per_capita, null, v => '$' + num(v)],
  ['expected yearly losses from natural hazards', c => c.risk && c.risk.eal, false, v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + ' million' : '$' + num(v)]
];

let built = null;
function prepare(N) {
  if (built === N) return;
  if (!N.byState) { N.byState = {}; for (const c of N.counties) (N.byState[c.st] = N.byState[c.st] || []).push(c); }
  for (const [st, list] of Object.entries(N.byState)) {
    for (const [label, fn] of MEASURES) {
      const vals = list.map(c => [c, fn(c)]).filter(x => Number.isFinite(x[1]) && x[1] !== null);
      vals.sort((a, b) => b[1] - a[1]);
      vals.forEach(([c, v], i) => { (c._rank = c._rank || {})[label] = { rank: i + 1, of: vals.length, v }; });
    }
  }
  // nearest neighbors by straight-line distance (lat/lon), any state
  const all = N.counties.filter(c => c.lat);
  const rad = Math.PI / 180;
  for (const c of all) {
    const near = [];
    for (const o of all) {
      if (o === c) continue;
      const dy = (o.lat - c.lat) * 69, dx = (o.lon - c.lon) * 69 * Math.cos(c.lat * rad);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (near.length < 6 || d < near[near.length - 1][1]) { near.push([o, d]); near.sort((a, b) => a[1] - b[1]); if (near.length > 6) near.pop(); }
    }
    c._near = near.map(([o, d]) => ({ st: o.st, slug: o.slug, name: o.name, miles: Math.round(d) }));
  }
  built = N;
}

function keyFacts(c, N) {
  prepare(N);
  c = (N.byState[c.st] || []).find(x => x.geoid === c.geoid) || c;
  const S = (N.states[c.st] || {}).name || c.st;
  const lines = MEASURES.map(([label, , better, f]) => {
    const r = (c._rank || {})[label]; if (!r || r.of < 3) return '';
    const pos = r.rank === 1 ? 'the highest' : r.rank === r.of ? 'the lowest' : `${ord(r.rank)} highest`;
    return `<li>${esc(f(r.v))} — ${esc(label)}: <b>${pos}</b> of ${r.of} ${esc(S)} counties.</li>`;
  }).filter(Boolean);
  if (!lines.length) return '';
  return `
<section id="ranks">
<h2>How ${esc(c.name)} compares <span class="sub">— against the other counties in ${esc(S)}</span></h2>
<ul>${lines.join('')}</ul>
<p class="src">“Highest” and “lowest” are just order, not grades: a high rank for poverty or hazard losses means more of it. Each figure's source is in its section below.</p>
</section>`;
}

function neighbors(c, N) {
  prepare(N);
  c = (N.byState[c.st] || []).find(x => x.geoid === c.geoid) || c;
  if (!c._near || !c._near.length) return '';
  return `<p class="src">Nearby counties: ${c._near.map(n => `<a href="/us/${esc(n.st.toLowerCase())}/${esc(n.slug)}">${esc(n.name)}${n.st !== c.st ? ', ' + esc(n.st) : ''}</a> (${n.miles} mi)`).join(' · ')}.</p>`;
}

module.exports = { keyFacts, neighbors, prepare };
