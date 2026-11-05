// "Follow the money" for counties whose own budget document County Commons has
// read (data/national/county-trails.json, built by pipeline/county-trails.js):
// each group and department, each number linked to the PDF page it came from,
// and the sum checked against the total the document prints.
const { esc } = require('./corpus');
const { read } = require('./national-local');

const num = (x) => Math.round(x).toLocaleString('en-US');
const big = (x) => x >= 1e9 ? '$' + (x / 1e9).toFixed(2) + ' billion' : x >= 1e6 ? '$' + (x / 1e6).toFixed(1) + ' million' : '$' + num(x);
const GROUP = { fund: 'fund by fund', function: 'area by area', department: 'department by department' };

// A URL may arrive already percent-encoded; encode it exactly once.
const enc = (u) => { try { return encodeURI(decodeURI(u)); } catch (e) { return u; } };
function get(c) { const T = read('county-trails.json'); return (T && T.counties && T.counties[c.geoid]) || null; }

function block(c) {
  const t = get(c); if (!t || !t.funds || !t.funds.length) return '';
  const href = (pg) => esc(enc(t.url) + (t.page_anchor === 'pdf2htmlex' ? '#pf' + Number(pg).toString(16) : '#page=' + pg));
  const pg = (n) => `<a href="${href(n)}" rel="noopener" class="soft" style="font-size:12px">p.${n}</a>`;
  const match = t.stated_total && Math.abs(t.total - t.stated_total) / t.stated_total <= 0.005;
  const what = t.grouped_by === 'fund' ? 'funds' : t.grouped_by === 'function' ? 'areas' : 'departments';
  const check = /^no (single )?(grand )?total/i.test(t.stated_label || '')
    ? `<p><b>These ${t.funds.length} ${what} total ${big(t.total)}.</b> The document prints no single grand total to check against: ${esc(t.stated_label.replace(/^no single grand total is printed;?\s*/i, '').replace(/^this is /i, 'this is '))} (${pg(t.stated_page)}).</p>`
    : match
    ? `<p><b>✓ It adds up.</b> These ${t.funds.length} ${what} total <b>${big(t.total)}</b>, the same as the document’s own “${esc(t.stated_label)}” (${big(t.stated_total)}, ${pg(t.stated_page)})${t.total === t.stated_total ? '' : ', within half a percent'}.</p>`
    : `<p><b>These ${t.funds.length} ${what} total ${big(t.total)}.</b> The document prints ${big(t.stated_total)} as its “${esc(t.stated_label)}” (${pg(t.stated_page)}).${t.stated_note ? ' ' + esc(t.stated_note) : ''}</p>`;
  const rows = t.funds.map(g => {
    const share = t.total ? Math.round(g.amount / t.total * 1000) / 10 : 0;
    const head = `<b>${esc(g.name)}</b> <span class="num">${big(g.amount)}</span> <span class="soft" style="font-size:12.5px">· ${share}%</span>`;
    if (!g.depts || !g.depts.length) return `<div style="margin:4px 0;padding-left:18px">${head} ${pg(g.page)}</div>`;
    return `<details style="margin:4px 0"><summary>${head} <span class="soft" style="font-size:12.5px">· ${g.depts.length} departments</span></summary>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${g.depts.slice().sort((a, b) => b.amount - a.amount).map(d => `<tr><td>${esc(d.name)}</td><td class="num">${big(d.amount)}</td><td class="src">${pg(d.page)}</td></tr>`).join('')}</tbody></table></div>${g.depts_note ? `<p class="src" style="max-width:none">${esc(g.depts_note)}</p>` : ''}</details>`;
  }).join('');
  const notes = [].concat(t.notes || [], t.corrections || []);
  const scope = t.scope && !/^all funds/i.test(t.scope) ? ` This covers the ${esc(t.scope)} only, not every fund the county runs.` : '';
  const two = t.years_covered === 2 ? ' This is a two-year budget: the amounts cover both years. Comparisons with other counties use half.' : '';
  return `
<section id="money-trail">
<h2>Follow the money <span class="sub">— ${esc(c.name)}’s budget for ${esc(t.fy_label || 'fiscal ' + t.fy)}, ${GROUP[t.grouped_by] || 'line by line'}</span></h2>
${check}
<p>${t.funds.some(g => g.depts && g.depts.length) ? 'Open an area to see the departments inside it. ' : ''}Each page number opens that page of the county’s official budget.${t.basis !== 'adopted' ? ` <b>This is the ${esc(t.basis)} budget</b>; the adopted figures may differ.` : ''}${scope}${two}</p>
${rows}
<p class="src" style="max-width:none">Source: <a href="${esc(enc(t.url))}" rel="noopener">${esc(t.title)}</a>, from the county’s official website. Read from the PDF by County Commons.${notes.length ? ' ' + notes.map(esc).join(' ') : ''} If you find a number that doesn’t match its page, use the box below to tell us. <a href="/us/${esc(c.st.toLowerCase())}/${esc(c.slug)}/compare">See each line beside other counties →</a></p>
</section>`;
}

module.exports = { get, block };
