// "What it spent": a county's actual spending as it reported it to its state,
// in the standard categories the state makes every county use
// (data/national/state-finance.json, built by pipeline/state-finance.js).
const { esc } = require('./corpus');
const { read } = require('./national-local');

const num = (x) => Math.round(x).toLocaleString('en-US');
const big = (x) => x >= 1e9 ? '$' + (x / 1e9).toFixed(2) + ' billion' : x >= 1e6 ? '$' + (x / 1e6).toFixed(1) + ' million' : '$' + num(x);

function get(c) {
  const D = read('state-finance.json'); const r = D && D.counties && D.counties[c.geoid];
  return r ? Object.assign({ S: D.states[r.st] }, r) : null;
}

function block(c) {
  const r = get(c); if (!r || !r.S) return '';
  const S = r.S;
  const fyl = r.fy_label || r.fy ? r.fy_label || `fiscal ${r.fy}` : (S.fy_label || 'fiscal ' + S.fy);
  const late = r.fy && !S.heading ? ` This county hasn’t filed fiscal ${S.fy} yet, so these are its fiscal ${r.fy} numbers, the latest it filed.` : '';
  const groups = [];
  for (const l of r.lines) { let g = groups.find(x => x.name === l.category); if (!g) groups.push(g = { name: l.category, amount: 0, lines: [] }); g.amount += l.amount; g.lines.push(l); }
  groups.sort((a, b) => b.amount - a.amount);
  const budget = S.kind === 'budget';
  const src = (l) => `<a href="${esc(l.page ? r.url + '#page=' + l.page : r.url)}" rel="noopener" class="soft" style="font-size:12px">${l.page ? 'p.' + l.page : 'source'}</a>`;
  const rows = groups.map(g => {
    const share = Math.round(g.amount / r.total * 1000) / 10;
    const head = `<b>${esc(g.name)}</b> <span class="num">${big(g.amount)}</span> <span class="soft" style="font-size:12.5px">· ${share}%</span>`;
    if (g.lines.length === 1 && g.lines[0].name.toLowerCase() === g.name.toLowerCase()) return `<div style="margin:4px 0;padding-left:18px">${head} ${src(g.lines[0])}</div>`;
    return `<details style="margin:4px 0"><summary>${head}</summary>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${g.lines.slice().sort((a, b) => b.amount - a.amount).map(l => `<tr><td>${esc(l.name)}</td><td class="num">${big(l.amount)}</td><td class="src">${src(l)}</td></tr>`).join('')}</tbody></table></div></details>`;
  }).join('');
  const LABEL = { capital_projects_applications: 'Capital projects', debt_service_applications: 'Debt payments', enterprise_operations_transfers: 'Utilities and services run as businesses' };
  const other = r.other ? Object.entries(r.other).map(([k, v]) => `${LABEL[k] || k}: ${big(v)}`).join(' · ') : '';
  return `
<section id="state-finance">
<h2>${budget ? esc(S.heading || 'Its budget, as filed with the state') : 'What it spent'} <span class="sub">— ${esc(c.name)}’s ${budget ? esc(S.budgetWord || 'adopted budget for') : 'actual spending in'} ${esc(fyl)}, as reported to the ${esc(S.agency)}</span></h2>
<p><b>${big(r.total)}</b> ${budget ? 'budgeted for' : 'spent on'} ${esc(S.spentOn || S.scope)}, in ${groups.length} areas. ${esc(S.what)}${esc(late)}${groups.some(g => !(g.lines.length === 1 && g.lines[0].name.toLowerCase() === g.name.toLowerCase())) ? ' Open an area to see the lines inside it.' : ''}</p>
${rows}
${other ? `<p class="src" style="max-width:none"><b>Counted separately, not in the total above:</b> ${esc(other)}.</p>` : ''}
<p class="src" style="max-width:none">${esc(S.note)} Source: <a href="${esc(r.title ? r.url : S.source_page)}" rel="noopener">${esc(r.title || (r.fy ? S.title.replace(String(S.fy), String(r.fy)) : S.title))}</a>, ${esc(S.agency)}${r.download || S.download_url ? ` (<a href="${esc(r.download || S.download_url)}" rel="noopener">the state’s spreadsheet</a>)` : ''}. Amounts are copied from that report; ${S.groupByCat ? 'the grouping into areas is County Commons’.' : 'the categories are the state’s.'} If you find a number that doesn’t match, use the box below to tell us. <a href="/us/${esc(c.st.toLowerCase())}/${esc(c.slug)}/compare">See each line beside other counties →</a></p>
</section>`;
}

module.exports = { get, block };
