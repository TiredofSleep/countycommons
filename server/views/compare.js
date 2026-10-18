const fs = require('fs');
const path = require('path');
const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const peers = require('../lib/peers');
const RK = require('../lib/national-ranks');

// How a county compares: computed facts only — the county beside counties like
// it, its rank in its state, its general fund beside the state's other counties,
// and its population and school spending beside similar counties. Every
// sentence is arithmetic on cited public data; nothing here is an opinion, and
// "ahead"/"behind" only ever means a measured difference of more than 15%.

const ROOT = path.join(__dirname, '..', '..');
const num = (x) => Math.round(x).toLocaleString('en-US');
const d0 = (x) => '$' + num(x);
const median = (a) => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const perPupil = (c) => { const d = (c.schools && c.schools.districts) || []; const e = d.reduce((s, x) => s + (x.enroll || 0), 0); return e > 0 ? d.reduce((s, x) => s + (x.current || 0), 0) / e : null; };

// Every county in the same state with a five-year general fund from its audit:
// months of spending its year-end balance would cover. Cached by state.
const fundCache = {};
function stateFunds(state) {
  if (fundCache[state] && Date.now() - fundCache[state].at < 3600e3) return fundCache[state].list;
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tenants.json'), 'utf8')).tenants;
  const list = [];
  for (const [key, t] of Object.entries(T)) {
    let cfg, af;
    try { cfg = JSON.parse(fs.readFileSync(path.join(ROOT, t.configPath), 'utf8')); } catch (e) { continue; }
    if (cfg.state !== state) continue;
    try { af = JSON.parse(fs.readFileSync(path.join(ROOT, t.corpusDir, 'audit-findings.json'), 'utf8')); } catch (e) { continue; }
    const f = af.fiscal; if (!f || !f.years || !(f.spending[0] > 0)) continue;
    list.push({ key, name: cfg.name, year: f.years[0], months: f.balance[0] / (f.spending[0] / 12), change: f.balance[0] - f.balance[f.years.length - 1] });
  }
  fundCache[state] = { at: Date.now(), list };
  return list;
}

function comparePage(data) {
  const { county } = data;
  const nat = require('../lib/national');
  const c = nat.forCounty(county), N = nat.meta();
  const cmp = c ? peers.compare(c, N) : null;
  const S = county.state;
  const sections = [];

  // 1. The summary, in sentences built from the numbers.
  if (cmp && cmp.rows.length) {
    const ahead = cmp.rows.filter(r => r.gap < -0.15).sort((a, b) => a.gap - b.gap);
    const behind = cmp.rows.filter(r => r.gap > 0.15).sort((a, b) => b.gap - a.gap);
    const same = cmp.rows.filter(r => Math.abs(r.gap) <= 0.15);
    const line = (r) => `<li><b>${esc(r.label.toLowerCase())}</b>: ${esc(r.v)} here, ${esc(r.med)} for the typical similar county</li>`;
    sections.push(`
<section id="summary">
<h2>In short <span class="sub">— beside ${cmp.peers} counties like it</span></h2>
<p>“Counties like it” are ${cmp.metro ? 'metro-area' : 'non-metro'} counties with a similar population and a median household income near ${esc(county.name)}'s (${d0(cmp.income)}). Ahead or behind means more than 15% better or worse than the typical one.</p>
${ahead.length ? `<p><b>Ahead of similar counties on ${ahead.length} measure${ahead.length === 1 ? '' : 's'}:</b></p><ul>${ahead.map(line).join('')}</ul>` : ''}
${behind.length ? `<p><b>Behind similar counties on ${behind.length} measure${behind.length === 1 ? '' : 's'}:</b></p><ul>${behind.map(line).join('')}</ul>` : ''}
${same.length ? `<p><b>About the same on ${same.length}:</b> ${same.map(r => esc(r.label.toLowerCase())).join(', ')}.</p>` : ''}
</section>`);
  }

  // 2. Population and school spending beside the same similar counties.
  if (c && cmp) {
    const P = (N.counties.find(x => x.geoid === c.geoid) || {})._peers || [];
    const rows = [];
    const ch = (x) => x.pop2020 ? (x.pop2024 - x.pop2020) / x.pop2020 : null;
    if (ch(c) !== null) {
      const pm = median(P.map(ch).filter(v => v !== null));
      rows.push(`<tr><td>Population change, 2020–2024</td><td class="num"><b>${(ch(c) * 100).toFixed(1)}%</b><br><span class="soft" style="font-size:12px">${num(c.pop2020)} → ${num(c.pop2024)}</span></td><td class="num">${(pm * 100).toFixed(1)}%</td></tr>`);
    }
    const pp = perPupil(c);
    if (pp) {
      const pm = median(P.map(perPupil).filter(Boolean));
      rows.push(`<tr><td>School spending per student (day-to-day costs)</td><td class="num"><b>${d0(pp)}</b></td><td class="num">${d0(pm)}</td></tr>`);
    }
    if (rows.length) sections.push(`
<section id="people-schools">
<h2>People and schools <span class="sub">— beside the same similar counties</span></h2>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>Measure</th><th class="num">${esc(county.name)}</th><th class="num">Typical similar county</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
<p class="src" style="max-width:none">Sources: U.S. Census Bureau Vintage 2024 population estimates; Census Annual Survey of School System Finances (school year 2023), current spending divided by enrollment across the districts based in the county.</p>
</section>`);
  }

  // 3. The county's general fund beside the state's other counties.
  const af = data.auditFindings && data.auditFindings.fiscal;
  if (af && af.years) {
    const list = stateFunds(S).sort((a, b) => b.months - a.months);
    const me = list.findIndex(x => x.key === data.tenantKey || x.name === county.name);
    const m = af.balance[0] / (af.spending[0] / 12);
    const med = list.length ? median(list.map(x => x.months)) : null;
    const years = [...new Set(list.map(x => x.year))].sort();
    sections.push(`
<section id="finances">
<h2>County finances <span class="sub">— the general fund, beside ${esc(S)}'s other counties</span></h2>
<p>At the end of ${esc(af.years[0])}, ${esc(county.name)}'s general fund held <b>${d0(af.balance[0])}</b> — enough to cover about <b>${m.toFixed(1)} months</b> of that year's spending. Five years earlier (${esc(af.years[af.years.length - 1])}) it held ${d0(af.balance[af.years.length - 1])}.${list.length > 2 && me >= 0 ? ` Among the ${list.length} ${esc(S)} counties whose state audits include this five-year schedule, that ranks <b>${me + 1} of ${list.length}</b> for months covered; the typical county held about ${med.toFixed(1)} months.` : ''}</p>
<p class="src" style="max-width:none">Source: each county's state audit, “Schedule of Selected Information for the Last Five Years — General Fund” (unaudited schedule). Latest years differ by county (${years.join(', ')}). A larger reserve isn't automatically better or worse — it can be savings for a planned project, or money not yet spent. <a href="/audits#fiscal">The year-by-year table</a>.</p>
</section>`);
  }

  // 4. Peer table and state ranks (the shared blocks).
  if (c) sections.push(peers.block(c, N, { more: '/what-works' }), RK.keyFacts(c, N));

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(S)} · how it compares</div>
  <h1>How ${esc(county.name)} compares</h1>
  <div class="src">${esc(county.name)} measured against counties like it across the country, and against the other counties in ${esc(S)} — health, money, jobs, housing, the jail, bridges, people, schools and county finances. Every figure is computed from public data and cited; “ahead” and “behind” are measured differences, not grades. For what other places have tried on each measure, see <a href="/what-works">what has worked</a>.</div>
</header>
${sections.join('') || `<section><p>Comparison data for ${esc(county.name)} isn't matched yet — not gathered, never hidden.</p></section>`}
<section><p class="src">Related: <a href="/atlas">By the numbers</a> · <a href="/budget">The money trail</a> · <a href="/audits">Audits</a> · <a href="/what-works">What has worked</a>. Spot an error? <a href="/feedback">Report it</a>.</p></section>`;

  const behind = cmp ? cmp.rows.filter(r => r.gap > 0.15).sort((a, b) => b.gap - a.gap).map(r => r.label.toLowerCase()) : [];
  const ahead = cmp ? cmp.rows.filter(r => r.gap < -0.15).sort((a, b) => a.gap - b.gap).map(r => r.label.toLowerCase()) : [];
  return layout({
    title: `How ${county.name}, ${S} compares: similar counties, state rankings and county finances · County Commons`,
    current: '/compare', body, county,
    description: `${county.name}, ${S} beside ${cmp ? cmp.peers : 'similar'} counties like it${ahead.length ? ` — ahead on ${ahead.slice(0, 2).join(' and ')}` : ''}${behind.length ? `, behind on ${behind.slice(0, 2).join(' and ')}` : ''} — plus its rank in ${S} and its county reserve, all from public data.`
  });
}

module.exports = { comparePage };
