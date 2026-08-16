const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

const cap = v => '$' + Math.round(v).toLocaleString('en-US');

// One metric as an inline SVG: a bar per county + dashed benchmark lines for
// the Arkansas and US averages, all on one per-resident axis.
function metricSvg(row) {
  const clark = row.counties.clarkar.perCap;
  const garland = row.counties.garlandar.perCap;
  const ar = row.bench.ar, us = row.bench.us;
  const max = Math.max(clark, garland, ar, us, 1) * 1.22;
  const L = 108, R = 548, W = 660, H = 108;
  const x = v => L + (R - L) * (v / max);
  const bar = (v, y, fill, name) => {
    const w = x(v) - L;
    return `<rect x="${L}" y="${y}" width="${w.toFixed(1)}" height="20" fill="${fill}" rx="2"></rect>
<text x="${L - 8}" y="${y + 14}" text-anchor="end" font-size="12" fill="var(--ink)">${esc(name)}</text>
<text x="${(x(v) + 6).toFixed(1)}" y="${y + 14}" font-size="12" font-weight="600" fill="var(--ink)">${cap(v)}</text>`;
  };
  // AR and US labels sit on two separate rows so they never collide even when
  // the two benchmarks land at nearly the same spot (e.g. roads, library).
  const mark = (v, label, ly) => {
    const px = x(v);
    const anchor = px > (R - 60) ? 'end' : (px < L + 60 ? 'start' : 'middle');
    return `<line x1="${px.toFixed(1)}" y1="8" x2="${px.toFixed(1)}" y2="70" stroke="var(--ink-soft)" stroke-width="1.5" stroke-dasharray="3 3"></line>
<text x="${px.toFixed(1)}" y="${ly}" text-anchor="${anchor}" font-size="10.5" fill="var(--ink-soft)">${esc(label)} ${cap(v)}</text>`;
  };
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:660px;height:auto" role="img" aria-label="${esc(row.label)}: Clark ${cap(clark)}, Garland ${cap(garland)} per resident; Arkansas average ${cap(ar)}, US average ${cap(us)}">
${bar(clark, 12, 'var(--accent)', 'Clark')}
${bar(garland, 40, 'var(--sourced)', 'Garland')}
${mark(ar, 'AR avg', 84)}
${mark(us, 'US avg', 100)}
</svg>`;
}

function compareCountiesPage(data, cmp) {
  const { county } = data;
  const b = cmp.bench;
  const section = (row, whatIncluded, footnote) => `
<section style="margin:18px 0">
<h3 style="margin-bottom:2px">${esc(row.label)} <span class="sub">— per resident</span></h3>
${metricSvg(row)}
<p class="src" style="margin:2px 0 0">${esc(whatIncluded)}${footnote ? ' ' + footnote : ''}</p>
</section>`;

  const r = k => cmp.rows.find(x => x.key === k);
  const body = `
<header class="page">
  <div class="eyebrow">County Commons · comparison</div>
  <h1>How two counties spend, per resident</h1>
  <div class="src">Clark County and Garland County, side by side, dollars per person — with the Arkansas and US county averages as reference lines. Blue is Clark; green is Garland. Every county number is its 2026 budget, cross-footed to its own ordinance; click through to <a href="https://clarkar.countycommons.us/budget" rel="noopener">Clark's</a> or <a href="https://garlandar.countycommons.us/budget" rel="noopener">Garland's</a> money trail to see any figure's source.</div>
</header>

<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <div class="eyebrow" style="color:var(--accent)">read this first — two different yardsticks</div>
  <p class="src" style="margin:4px 0 0">The two <b>county bars compare exactly</b>: both are 2026 budget appropriations, all funds, per resident. The dashed <b>AR and US lines are a different measure</b> — the Census's actual spending for FY2022 ("direct general expenditure," a narrower basis that leaves out reserves, insurance, and capital, two years earlier). So county budgets read higher than the Census actuals by design. Use the benchmark lines for <b>shape and scale</b>, not an exact gap. And the big caveat the Census itself flags: Arkansas gives counties a narrow role (courts, sheriff/jail, records, roads), so its counties spend far less per person than states where counties also run hospitals and welfare.</p>
</div>

${section(r('total'), `Clark ${cap(cmp.meta.clarkar.grand_total)} ÷ ${cmp.meta.clarkar.pop.toLocaleString()} residents; Garland ${cap(cmp.meta.garlandar.grand_total)} ÷ ${cmp.meta.garlandar.pop.toLocaleString()}. County budgets include reserves, employee insurance, and capital that the Census actuals leave out — which is much of why both bars sit above the AR line.`)}

${section(r('public_safety'), 'Clark: Sheriff + jail (operating + maintenance/construction funds). Garland: Sheriff + Detention Fund + detention reserve + jail O&M + commissary. The county corrections role Arkansas assigns is why public safety is a big share in both.')}

${section(r('roads'), 'Operating road funds only.', `<b>Garland also has a separate one-time \$16,000,000 Road & Bridge Improvement fund</b> (≈${cap(cmp.garlandRoadCapitalPerCap)}/resident) not shown here — a capital push Clark doesn't have this year. Even so, rural Clark budgets far more per resident on road operations, the classic small-county pattern: more road miles, fewer people to share the cost.`)}

${section(r('solid_waste'), 'Garland runs a large regional solid-waste operation (landfill + collection + stormwater), which is why its per-resident figure towers over Clark and both averages.')}

${section(r('library'), 'County library funds. Garland funds a notably larger library system per resident than Clark or the state average.')}

<section>
<h2>Where the numbers come from</h2>
<p class="src">County figures: each county's 2026 appropriation ordinance, itemized and cross-footed on its own money trail (Clark's 2025-21; Garland's O-25-25). Benchmarks: <a href="${esc(b.source_url)}" rel="noopener">${esc(b.source)}</a> — Census dollar aggregates divided by 2022 Census population; the national line divides by all US residents, including places with no county government. The Arkansas per-function split and the "narrow county role" caveat are from the same Census release and corroborated by the U. of Arkansas Extension study MP513.</p>
<p class="src">This is the honest version of a comparison chart: exact where the measures match (county to county), clearly caveated where they don't (budget vs. actual, one year vs. another). As more counties come online, each becomes another bar here — same rules, same receipts.</p>
</section>`;

  return layout({ title: `How counties spend — ${county.platform_name}`, current: '/compare/counties', body, county,
    description: 'Clark vs. Garland County spending per resident, by function, with Arkansas and US benchmarks — every figure sourced.' });
}

module.exports = { compareCountiesPage };
