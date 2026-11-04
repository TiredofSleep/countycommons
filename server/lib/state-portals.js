// States that publish every county's own budget in one place. Idaho's State
// Controller collects each county's adopted budget, its actual revenue and
// spending, its audit, and the budgets of every city and district inside it
// (Transparent Idaho). Built by pipeline/refresh-idaho.js → data/national/idaho.json.
//
// These are the county's own reported numbers, so they differ from the Census
// Bureau's national categories shown elsewhere on the page.
const { esc } = require('./corpus');
const { read } = require('./national-local');

const PORTALS = {
  ID: { file: 'idaho.json', trails: 'idaho-trails.json', fy: (y) => `Oct ${y - 1} – Sep ${y}` }
};

const num = (x) => Math.round(x).toLocaleString('en-US');
const big = (x) => x >= 1e9 ? '$' + (x / 1e9).toFixed(2) + ' billion' : x >= 1e6 ? '$' + (x / 1e6).toFixed(1) + ' million' : '$' + num(x);
const KIND = { Budget: 'budget', Audit: 'audit', Actual: 'actual report' };

function data(st) { const p = PORTALS[st]; return p ? read(p.file) : null; }
function county(c) { const D = data(c.st); return D && D.counties[c.geoid] ? { D, r: D.counties[c.geoid], P: PORTALS[c.st] } : null; }
const yearsOf = (r) => Object.keys(r.years).map(Number).sort((a, b) => a - b);
const latestBudget = (r) => yearsOf(r).filter(y => r.years[y].expense_budget).pop();
const latestActual = (r) => yearsOf(r).filter(y => r.years[y].expense_actual).pop();
// The feed lists statewide boards (commodity commissions, risk pools, the
// highway technical council) under every county. Anything listed in nearly every
// county is statewide: shown once on the state page, never as a county's own.
const statewideCache = new WeakMap();
function statewide(D) {
  if (!statewideCache.has(D)) {
    const n = {}, cs = Object.values(D.counties);
    for (const c of cs) for (const d of new Set(c.districts.map(x => x.name))) n[d] = (n[d] || 0) + 1;
    statewideCache.set(D, new Set(Object.keys(n).filter(k => n[k] >= cs.length * 0.9)));
  }
  return statewideCache.get(D);
}
const docLinks = (docs) => (docs || []).map(d => `<a href="${esc(d.url)}" rel="noopener">${esc(KIND[d.kind] || d.kind.toLowerCase())}</a>`).join(' · ');

// The money trail: the county's own budget PDF read fund by fund, each number
// linked to the page it came from, and the sum checked against the total the
// county reported to the Controller. Built from the filed PDFs (see
// data/national/idaho-trails.json, "how" field).
function trailBlock(c, r, P) {
  const T = P.trails && read(P.trails); const t = T && T.counties && T.counties[c.geoid];
  if (!t || !t.funds || !t.funds.length) return '';
  const href = (pg) => esc(encodeURI(t.url) + '#page=' + pg);
  const pg = (n) => `<a href="${href(n)}" rel="noopener" class="soft" style="font-size:12px">p.${n}</a>`;
  const ctl = (r.years[t.fy] || {}).expense_budget;
  const match = ctl && Math.abs(t.total - ctl) / ctl <= 0.005;
  const check = !ctl ? '' : match
    ? `<p><b>✓ It adds up.</b> These ${t.funds.length} funds total <b>${big(t.total)}</b>, the same as the ${big(ctl)} the county reported to the State Controller${t.total === ctl ? '' : ' (within half a percent)'}.</p>`
    : `<p><b>These ${t.funds.length} funds total ${big(t.total)}.</b> The county reported ${big(ctl)} to the State Controller, a difference of ${big(Math.abs(t.total - ctl))}.${t.controller_note ? ' ' + esc(t.controller_note) : ''}</p>`;
  const funds = t.funds.map(f => {
    const share = t.total ? Math.round(f.amount / t.total * 1000) / 10 : 0;
    const head = `<b>${esc(f.name)}</b> <span class="num">${big(f.amount)}</span> <span class="soft" style="font-size:12.5px">· ${share}%</span>`;
    if (!f.depts || !f.depts.length) return `<div style="margin:4px 0;padding-left:18px">${head} ${pg(f.page)}</div>`;
    return `<details style="margin:4px 0"><summary>${head} <span class="soft" style="font-size:12.5px">· ${f.depts.length} offices and departments</span></summary>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${f.depts.slice().sort((a, b) => b.amount - a.amount).map(d => `<tr><td>${esc(d.name)}</td><td class="num">${big(d.amount)}</td><td class="src">${pg(d.page)}</td></tr>`).join('')}</tbody></table></div>${f.depts_note ? `<p class="src" style="max-width:none">${esc(f.depts_note)}</p>` : ''}</details>`;
  }).join('');
  const notes = [].concat(t.notes || [], t.corrections || []);
  return `
<h3 id="money-trail" style="margin-top:16px">Follow the money: fiscal ${t.fy}, fund by fund <span class="sub">— from the county’s own budget filing</span></h3>
${check}
<p>Open a fund to see the offices and departments inside it. Each page number opens that page of the official budget.${t.basis === 'proposed' ? ' <b>This filing shows the proposed budget</b>; the adopted figures may differ.' : ''}</p>
${funds}
<p class="src" style="max-width:none">Source: <a href="${esc(encodeURI(t.url))}" rel="noopener">${esc(t.title || c.name + ' fiscal ' + t.fy + ' budget')}</a>, filed with the Idaho State Controller.${t.fy !== latestBudget(r) ? ` This is the fiscal ${t.fy} budget, the latest one the county filed as a document.` : ''}${notes.length ? ' ' + notes.map(esc).join(' ') : ''} Read from the filed PDF by County Commons${t.ocr ? ' (a scanned document, read with text recognition and checked against its own column totals)' : ''}; if you find a number that doesn’t match the page, use the box below to tell us.</p>`;
}

function countyBlock(c) {
  const x = county(c); if (!x) return '';
  const { D, r, P } = x;
  const yb = latestBudget(r), ya = latestActual(r);
  const pop = c.pop2024;
  const per = (v) => pop ? ` <span class="soft" style="font-size:12.5px">· $${num(v / pop)} per resident</span>` : '';
  const lead = yb ? `<p>${esc(c.name)}’s adopted budget for fiscal ${yb} (${P.fy(yb)}) was <b>${big(r.years[yb].expense_budget)}</b>${per(r.years[yb].expense_budget)}, as reported to the State Controller.${ya ? ` In fiscal ${ya} it budgeted ${big(r.years[ya].expense_budget || 0)} and actually spent <b>${big(r.years[ya].expense_actual)}</b>${r.years[ya].expense_budget ? ` (${Math.round(r.years[ya].expense_actual / r.years[ya].expense_budget * 100)}% of its budget)` : ''}.` : ''}</p>` : '';
  const rows = yearsOf(r).slice().reverse().map(y => { const v = r.years[y]; return `<tr><td>${y}</td><td class="num">${v.expense_budget ? big(v.expense_budget) : '—'}</td><td class="num">${v.expense_actual ? big(v.expense_actual) : '—'}</td><td class="num">${v.revenue_actual ? big(v.revenue_actual) : '—'}</td><td class="src">${docLinks(v.docs) || '—'}</td></tr>`; }).join('');

  // Cities and districts: the latest year each one reported.
  const groups = {};
  const SW = statewide(D);
  const local = r.districts.filter(d => !SW.has(d.name));
  for (const d of local) {
    const ys = Object.keys(d.years).map(Number).sort((a, b) => b - a);
    const y = ys.find(k => d.years[k].expense_budget) || ys[0];
    const v = d.years[y] || {}, prev = d.years[y - 1] || {};
    (groups[d.type] = groups[d.type] || []).push({ name: d.name, y, budget: v.expense_budget || 0, spent: prev.expense_actual || null, docs: (v.docs || []).concat(prev.docs || []) });
  }
  const gl = Object.entries(groups).map(([t, l]) => ({ t, l: l.sort((a, b) => b.budget - a.budget), sum: l.reduce((s, d) => s + d.budget, 0) })).sort((a, b) => b.sum - a.sum);
  const nDist = local.length;
  const districts = nDist ? `
<h3 style="margin-top:14px">Cities and districts in ${esc(c.name)} <span class="sub">— ${nDist} that report to the State Controller</span></h3>
<p>Besides the county, these cities and districts each set their own budget. Open a group to see each one.</p>
${gl.map(g => `<details style="margin:4px 0"><summary><b>${esc(g.t)}</b> <span class="soft">— ${g.l.length}, budgets adding to ${big(g.sum)}</span></summary>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>Name</th><th class="num">Budget</th><th class="num">Spent the year before</th><th>Documents</th></tr></thead><tbody>
${g.l.map(d => `<tr><td>${esc(d.name)}</td><td class="num">${d.budget ? big(d.budget) + ` <span class="soft" style="font-size:12px">FY${d.y}</span>` : '—'}</td><td class="num">${d.spent ? big(d.spent) : '—'}</td><td class="src">${docLinks(d.docs) || '—'}</td></tr>`).join('')}
</tbody></table></div></details>`).join('')}
<p class="src" style="max-width:none">A city or district that crosses county lines is listed in each county it serves, with its whole budget. Statewide boards and programs (commodity commissions, the counties’ risk pool and others) are on the <a href="/us/${esc(c.st.toLowerCase())}#statewide">${esc(c.st === 'ID' ? 'Idaho' : c.st)} page</a>.</p>` : '';

  return `
<section id="county-budget">
<h2>${esc(c.name)}’s own budget <span class="sub">— as reported to the Idaho State Controller</span></h2>
${lead}
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>Fiscal year</th><th class="num">Budgeted to spend</th><th class="num">Actually spent</th><th class="num">Actually took in</th><th>Official documents</th></tr></thead><tbody>${rows}</tbody></table></div>
${trailBlock(c, r, P)}
${districts}
<p class="src" style="max-width:none">Source: <a href="${esc(r.url)}" rel="noopener">${esc(D.source.label)}</a>, retrieved ${esc(D.retrieved)}. Idaho counties’ fiscal year runs October 1 to September 30. Counties report each year’s numbers to the Controller, who posts them in January; a dash means nothing was reported for that year. “Budgeted” is the adopted budget for all funds; “actually spent” is what the county reported after the year closed. These are the county’s own figures, so they won’t match the Census Bureau’s national categories above.</p>
</section>`;
}

// The state page: every county side by side.
function stateBlock(st, list) {
  const D = data(st); if (!D) return '';
  const P = PORTALS[st];
  const rows = list.map(c => ({ c, r: D.counties[c.geoid] })).filter(x => x.r);
  if (!rows.length) return '';
  const yb = Math.max(...rows.map(x => latestBudget(x.r) || 0));
  const ya = Math.max(...rows.map(x => latestActual(x.r) || 0));
  const body = rows.map(({ c, r }) => {
    const b = (r.years[yb] || {}).expense_budget, a = r.years[ya] || {};
    return `<tr><td><a href="/us/${st.toLowerCase()}/${esc(c.slug)}#county-budget">${esc(c.name)}</a></td><td class="num">${b ? big(b) : '—'}</td><td class="num">${b && c.pop2024 ? '$' + num(b / c.pop2024) : '—'}</td><td class="num">${a.expense_actual && a.expense_budget ? Math.round(a.expense_actual / a.expense_budget * 100) + '%' : '—'}</td></tr>`;
  }).join('');
  return `
<section id="county-budgets">
<h2>Every county’s budget <span class="sub">— as reported to the State Controller</span></h2>
<p>Each of ${esc(rows.length)} counties’ adopted budget for fiscal ${yb} (${P.fy(yb)}), per resident, and how much of its fiscal ${ya} budget it actually spent.</p>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>County</th><th class="num">FY${yb} budget</th><th class="num">Per resident</th><th class="num">FY${ya}: share of budget spent</th></tr></thead><tbody>${body}</tbody></table></div>
<p class="src" style="max-width:none">Source: <a href="${esc(D.source.url)}" rel="noopener">${esc(D.source.label)}</a>, retrieved ${esc(D.retrieved)}. Budgets cover all county funds. Per-resident figures use the Census Bureau’s 2024 population estimate. A dash means the county hasn’t reported that year.</p>
</section>${statewideBlock(D)}`;
}

function statewideBlock(D) {
  const SW = statewide(D); if (!SW.size) return '';
  const seen = new Map();
  for (const c of Object.values(D.counties)) for (const d of c.districts) if (SW.has(d.name) && !seen.has(d.name)) seen.set(d.name, d);
  const rows = [...seen.values()].map(d => {
    const ys = Object.keys(d.years).map(Number).sort((a, b) => b - a);
    const y = ys.find(k => d.years[k].expense_budget) || ys[0];
    const v = d.years[y] || {}, prev = d.years[y - 1] || {};
    return { d, y, budget: v.expense_budget || 0, spent: prev.expense_actual || null, docs: (v.docs || []).concat(prev.docs || []) };
  }).sort((a, b) => b.budget - a.budget);
  return `
<section id="statewide">
<h2>Statewide boards and programs <span class="sub">— ${rows.length} that report to the State Controller</span></h2>
<p>These serve the whole state rather than one county: commodity commissions, the counties’ shared insurance pool, the highway technical council and others.</p>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>Name</th><th class="num">Budget</th><th class="num">Spent the year before</th><th>Documents</th></tr></thead><tbody>
${rows.map(x => `<tr><td>${esc(x.d.name)} <span class="soft" style="font-size:12px">${esc(x.d.type)}</span></td><td class="num">${x.budget ? big(x.budget) + ` <span class="soft" style="font-size:12px">FY${x.y}</span>` : '—'}</td><td class="num">${x.spent ? big(x.spent) : '—'}</td><td class="src">${docLinks(x.docs) || '—'}</td></tr>`).join('')}
</tbody></table></div>
<p class="src" style="max-width:none">Source: <a href="${esc(D.source.url)}" rel="noopener">${esc(D.source.label)}</a>. Listed here because the Controller’s data lists each of them under nearly every county.</p>
</section>`;
}

function faq(c) {
  const x = county(c); if (!x) return [];
  const { r, P } = x; const yb = latestBudget(r); if (!yb) return [];
  const ya = latestActual(r);
  return [{ q: `What is ${c.name}’s budget?`, a: `${c.name} adopted a budget of ${big(r.years[yb].expense_budget)} for fiscal ${yb} (${P.fy(yb)})${c.pop2024 ? `, about $${num(r.years[yb].expense_budget / c.pop2024)} per resident` : ''}, as reported to the Idaho State Controller.${ya ? ` In fiscal ${ya} it actually spent ${big(r.years[ya].expense_actual)}.` : ''}`, href: '#county-budget' }];
}

function summary(c) {
  const x = county(c); if (!x) return '';
  const yb = latestBudget(x.r);
  return yb ? `FY${yb} county budget ${big(x.r.years[yb].expense_budget)}` : '';
}

module.exports = { countyBlock, stateBlock, faq, summary };
