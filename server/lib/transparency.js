// Transparency meter: a short checklist of what a county itself makes public
// about its budget. Every answer is a fact with a link; anything not checked
// stays "not checked yet" and never counts against the county.
//
// Answers come from what County Commons has already read (budget books in
// data/national/county-trails.json, state reports in state-finance.json, Idaho
// filings, Arkansas tenant corpora, federal single audits) and from hand or
// agent checks of county websites in data/national/transparency-checks.json,
// which win over anything derived here.
const fs = require('fs');
const path = require('path');
const { esc } = require('./corpus');
const { read } = require('./national-local');
const ROOT = path.join(__dirname, '..', '..');

// A perfect score is the goal the meter measures toward: every dollar traced
// to its receipt, and every action of the government on the record.
const LEVELS = [
  ['plan', 'The plan', 'the budget'],
  ['open', 'Open format', 'can people and tools use it'],
  ['results', 'What happened', 'what really came in and went out'],
  ['dollars', 'Every dollar', 'down to the receipt'],
  ['activity', 'Every action', 'meetings and votes on the record'],
];
const ITEMS = [
  ['posted', 'Posted', 'An adopted budget is free to read online.', 'plan'],
  ['current', 'Current', 'The budget for the fiscal year now under way is posted.', 'plan'],
  ['by_office', 'By office', 'Spending is shown department by department.', 'plan'],
  ['line_items', 'Line items', 'Inside each office, it shows what the money buys, like salaries, supplies and contracts.', 'plan'],
  ['adds_up', 'Adds up', 'The parts add to the total the county prints. County Commons checks this itself.', 'plan'],
  ['searchable', 'Searchable', 'The budget is text or a spreadsheet, not a scanned picture.', 'open'],
  ['open_to_tools', 'Open to tools', 'It downloads without a bot check, so apps and research tools can read it.', 'open'],
  ['open_data', 'Open data', 'Budget or spending numbers come as a spreadsheet or data feed anyone can download.', 'open'],
  ['actual', 'Actual spending', 'What the county really spent is public too, not just the plan.', 'results'],
  ['revenue', 'Where money comes from', 'Each tax, fee and grant the county takes in is shown.', 'results'],
  ['audit', 'Audit', 'An independent audit or state review is public.', 'results'],
  ['payments', 'Every payment', 'Each check or payment is listed: who was paid, how much, when, and for what.', 'dollars'],
  ['contracts', 'Contracts', 'Contracts and bids are posted, with the company and the amount.', 'dollars'],
  ['pay', 'Pay by job', 'What each county job pays is public.', 'dollars'],
  ['receipts', 'Receipts', 'The invoice or receipt behind each payment can be seen.', 'dollars'],
  ['meetings', 'Meetings', 'Agendas and minutes of the governing body’s meetings are posted.', 'activity'],
  ['votes', 'Votes', 'How each elected official voted is recorded and posted.', 'activity'],
  ['video', 'Video', 'Meetings are streamed or recorded, and the recordings are posted.', 'activity'],
];

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// Is the fiscal year described by this label under way today? null = can't tell.
function inProgress(label, fy) {
  const m = [...String(label || '').matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.? (\d{4})/gi)];
  let start, end;
  if (m.length >= 2) { start = new Date(+m[0][2], MON[m[0][1].toLowerCase()], 1); const e = m[m.length - 1]; end = new Date(+e[2], MON[e[1].toLowerCase()] + 1, 0); }
  else if (/^\s*\d{4}\s*$/.test(String(label || '')) && fy) { start = new Date(+fy, 0, 1); end = new Date(+fy, 11, 31); }
  else return null;
  const now = new Date();
  return now >= start && now <= end;
}

const num = (x) => Math.round(x).toLocaleString('en-US');
const big = (x) => x >= 1e9 ? '$' + (x / 1e9).toFixed(2) + ' billion' : x >= 1e6 ? '$' + (x / 1e6).toFixed(1) + ' million' : '$' + num(x);
const encOnce = (u) => { try { return encodeURI(decodeURI(u)); } catch (e) { return u; } };

function fromTrail(t, it) {
  const url = t.url;
  // Only an adopted book proves anything here; a proposed one we happened to
  // read says nothing about what else the county posted (a website check does).
  if (t.basis === 'adopted') {
    it.posted = { v: 'yes', note: `Its ${t.title || 'adopted budget'} is on the county’s website.`, url };
    if (inProgress(t.fy_label, t.fy)) it.current = { v: 'yes', note: `It covers ${t.fy_label}, the fiscal year now under way.`, url };
  }
  if (t.stated_total) {
    const off = Math.abs(t.total - t.stated_total) / t.stated_total;
    it.adds_up = off <= 0.005
      ? { v: 'yes', note: `The ${t.grouped_by === 'department' ? 'departments' : 'groups'} add to ${big(t.total)}, the total it prints${t.stated_page ? ' on page ' + t.stated_page : ''}.`, url: t.stated_page ? encOnce(url) + '#page=' + t.stated_page : url }
      : { v: 'partly', note: t.stated_note || `The parts add to ${big(t.total)}; the printed total is ${big(t.stated_total)}.`, url: t.stated_page ? encOnce(url) + '#page=' + t.stated_page : url };
  }
  if (t.grouped_by === 'department' || t.funds.some(g => g.depts && g.depts.length)) {
    const allFunds = /^all funds/i.test(t.scope || '');
    const pg = (t.funds.find(g => g.depts && g.depts.length) || t.funds[0]).page;
    it.by_office = { v: 'yes', note: `It lists the budget office by office${allFunds ? '' : ` (${t.scope})`}.`, url: pg ? encOnce(url) + '#page=' + pg : url };
  }
}

function fromState(r, S, it) {
  const yr = r.fy_label || (r.fy ? `fiscal ${r.fy}` : S.fy_label || 'fiscal ' + S.fy);
  // Kentucky's numbers are the final budgets printed in each fiscal court's
  // state audit, so they prove the audit and the actuals, not a posted budget.
  if (r.st === 'KY') {
    it.audit = { v: 'yes', note: `Its audit for ${yr}, by the ${S.agency}, is public.`, url: r.url };
    it.actual = { v: 'yes', note: `That audit shows what the county actually spent in ${yr}.`, url: r.url };
    return;
  }
  if (S.kind === 'actual') it.actual = { v: 'yes', note: `Its spending in ${yr} is posted by the ${S.agency}.`, url: r.url || S.source_page };
  else {
    it.posted = it.posted || { v: 'yes', note: `Its budget for ${yr} is posted by the ${S.agency}.`, url: r.url || S.source_page };
    const ip = inProgress(r.fy_label || S.fy_label, r.fy || S.fy);
    if (ip && !it.current) it.current = { v: 'yes', note: `The ${yr} budget, the year now under way, is posted by the ${S.agency}.`, url: r.url || S.source_page };
  }
}

function fromIdaho(t, it) {
  it.posted = it.posted || { v: 'yes', note: `Its fiscal ${t.fy} budget is posted on Transparent Idaho by the State Controller.`, url: encOnce(t.url) };
}

function fromArkansas(c, it) {
  if (c.st !== 'AR' || !c.site) return;
  let t = null; try { t = Object.values(require('./tenant').registry().tenants).find(x => x.host === c.site); } catch (e) { /* none */ }
  if (!t) return;
  const dir = path.join(ROOT, t.corpusDir);
  let docs, B, A;
  try { const d = JSON.parse(fs.readFileSync(path.join(dir, 'documents.json'), 'utf8')); docs = d.documents || d; } catch (e) { return; }
  try { B = JSON.parse(fs.readFileSync(path.join(dir, 'budget-2026.json'), 'utf8')); } catch (e) { B = null; }
  try { A = JSON.parse(fs.readFileSync(path.join(dir, 'audit-findings.json'), 'utf8')); } catch (e) { A = null; }
  const b = docs.find(x => B && B.meta && x.id === B.meta.document) || docs.find(x => /-budget-2026$/.test(x.id));
  if (b && B) {
    const weak = /proposed|requested/i.test(b.title);
    const where = /artransparency\.gov/.test(b.source_url) ? 'the state’s Arkansas Transparency site' : 'the county’s website';
    it.posted = { v: 'yes', note: `Its 2026 budget is posted on ${where}.`, url: b.source_url };
    it.current = weak ? { v: 'partly', note: `The 2026 budget it filed with the state shows ${/proposed/i.test(b.title) ? 'proposed' : 'requested'} amounts, not adopted ones.`, url: b.source_url }
      : { v: 'yes', note: 'The 2026 budget (Arkansas counties budget by calendar year) is posted.', url: b.source_url };
    it.by_office = { v: 'yes', note: 'It lists the budget office by office.', url: b.source_url };
    const kids = {}; for (const n of B.nodes) if (n.parent) kids[n.parent] = (kids[n.parent] || 0) + 1;
    const depth = (id, d) => { const n = B.nodes.find(x => x.id === id); return n && n.parent ? depth(n.parent, d + 1) : d; };
    const leaf = B.nodes.find(n => n.parent && !kids[n.id] && depth(n.id, 0) >= 2);
    if (leaf) it.line_items = { v: 'yes', note: 'Each office’s budget is broken into lines or categories, such as salaries and supplies.', url: b.source_url };
    const txt = (b.note || '') + ' ' + (b.source_note || '') + ' ' + ((B.meta && B.meta.note) || '');
    if (/\bOCR text layer\b|\btext layer\b.{0,40}\bscan|\bscan\b.{0,40}\btext layer\b/i.test(txt)) it.searchable = { v: 'partly', note: `The copy posted on ${where} is a scan with a rough text layer, so searching it is unreliable.`, url: b.source_url };
    else if (/\bscan(ned)?\b|\bOCR\b/i.test(txt)) it.searchable = { v: 'no', note: `The copy posted on ${where} is a scan, so its text can’t be searched or copied.`, url: b.source_url };
  }
  const v = A && A.verdicts && A.verdicts[0];
  const ld = v && v.source && docs.find(x => x.id === v.source.doc);
  if (ld && ld.source_url) {
    const full = !/limited review|financial and compliance/i.test((v.detail || '') + ' ' + ld.title);
    it.audit = { v: 'yes', note: `Arkansas Legislative Audit’s ${v.year} report on the county is public${full ? '' : ' (a limited review that year; the state alternates full audits and reviews)'}.`, url: ld.source_url };
    it.actual = { v: 'yes', note: `That report shows what the county actually took in and spent in ${v.year}.`, url: ld.source_url };
  }
}

function fromFAC(c, it) {
  const A = read('audits-fac.json'); const a = A && A.counties && A.counties[c.geoid];
  if (a && !it.audit) it.audit = { v: 'yes', note: `Its fiscal ${a.year} single audit, by an independent auditor, is on the Federal Audit Clearinghouse.`, url: `https://app.fac.gov/dissemination/summary/${a.report_id}` };
}

// The state's own role: does a state agency post every county's budget or spending?
function stateRow(st) {
  const X = read('transparency-checks.json');
  if (X && X.states && X.states[st]) return X.states[st];
  const SF = read('state-finance.json'); const S = SF && SF.states && SF.states[st];
  if (S) return { v: 'yes', note: `The ${S.agency} posts every county’s ${S.kind === 'actual' ? 'spending' : 'budget'} in one place.`, url: S.source_page };
  if (st === 'AR') return { v: 'yes', note: 'The state’s Arkansas Transparency site posts every county’s budget, and Arkansas Legislative Audit reviews every county.', url: 'https://artransparency.gov' };
  if (st === 'ID') return { v: 'yes', note: 'The State Controller posts every county’s budget on Transparent Idaho.', url: 'https://transparent.idaho.gov' };
  return null;
}

function get(c) {
  const it = {};
  const SF = read('state-finance.json'), CT = read('county-trails.json'), ID = read('idaho-trails.json');
  fromArkansas(c, it);
  const r = SF && SF.counties && SF.counties[c.geoid];
  if (r && SF.states[r.st]) fromState(r, SF.states[r.st], it);
  const idt = ID && ID.counties && ID.counties[c.geoid];
  if (idt) fromIdaho(idt, it);
  const t = CT && CT.counties && CT.counties[c.geoid];
  if (t) fromTrail(t, it);
  fromFAC(c, it);
  const X = read('transparency-checks.json'); const x = X && X.counties && X.counties[c.geoid];
  let checked = null;
  if (x) { Object.assign(it, x.items); checked = x.checked; }
  return { items: it, checked, state: stateRow(c.st) };
}

const MARK = { yes: ['✓', 'Yes', 'var(--sourced)', 'var(--sourced-bg)'], partly: ['◐', 'Partly', 'var(--partial)', 'var(--partial-bg)'], no: ['✗', 'No', 'var(--dead)', 'var(--dead-bg)'] };

function block(c) {
  const { items, checked, state } = get(c);
  const n = { yes: 0, partly: 0, no: 0 }; for (const k of Object.keys(items)) if (n[items[k].v] !== undefined) n[items[k].v]++;
  const done = n.yes + n.partly + n.no, open = ITEMS.length - done;
  const cell = (k, label) => { const m = items[k] && MARK[items[k].v]; return `<span title="${esc(label)}" style="flex:1;height:12px;${m ? `background:${m[2]};opacity:${items[k].v === 'partly' ? 0.55 : items[k].v === 'no' ? 0.25 : 1}` : 'border:1px dashed var(--rule)'}"></span>`; };
  const seg = LEVELS.map(([lv, name]) => `<span style="display:flex;gap:2px;flex:${ITEMS.filter(i => i[3] === lv).length}" title="${esc(name)}">${ITEMS.filter(i => i[3] === lv).map(([k, label]) => cell(k, label)).join('')}</span>`).join('');
  const link = (o) => o.url ? ` <a href="${esc(o.page ? encOnce(o.url).split('#')[0] + '#page=' + o.page : o.url)}" rel="noopener" class="soft" style="font-size:12px">source</a>` : '';
  const row = ([k, label, what]) => {
    const o = items[k], m = o && MARK[o.v];
    return `<tr><td style="white-space:nowrap;vertical-align:top"><span aria-hidden="true" style="display:inline-block;width:1.4em;color:${m ? m[2] : 'var(--ink-soft)'}">${m ? m[0] : '–'}</span><b>${esc(label)}</b></td><td style="vertical-align:top">${m ? `<b style="color:${m[2]}">${m[1]}.</b> ${esc(o.note || '')}${link(o)}` : `<span class="soft">Not checked yet.</span>`}<br><span class="soft" style="font-size:12.5px">${esc(what)}</span></td></tr>`;
  };
  const rows = LEVELS.map(([lv, name, sub], i) => `<tr><td colspan="2" style="padding-top:${i ? 12 : 4}px"><b>${i + 1}. ${esc(name)}</b> <span class="soft" style="font-size:12.5px">— ${esc(sub)}</span></td></tr>${ITEMS.filter(x => x[3] === lv).map(row).join('')}`).join('');
  const summary = done
    ? `${n.yes} of ${done} checked item${done === 1 ? '' : 's'} met${n.partly ? `, ${n.partly} partly` : ''}${n.no ? `, ${n.no} not met` : ''}.${open ? ` ${open} not checked yet.` : ''}`
    : `Not checked yet for ${c.name}.`;
  const sm = state && MARK[state.v];
  return `
<section id="transparency">
<h2>Transparency meter <span class="sub">— what ${esc(c.name)} puts online about its money and its work</span></h2>
<p><b>${esc(summary)}</b> <span class="soft">A perfect score is all ${ITEMS.length}: every dollar traced to its receipt, and every meeting and vote on the record.</span></p>
<div role="img" aria-label="${esc(summary)}" style="display:flex;gap:8px;max-width:520px;margin:6px 0 2px">${seg}</div>
<div aria-hidden="true" class="soft" style="display:flex;gap:8px;max-width:520px;font-size:11px;margin-bottom:12px">${LEVELS.map(([lv, name]) => `<span style="flex:${ITEMS.filter(i => i[3] === lv).length};overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(name)}</span>`).join('')}</div>
<details><summary>See each item</summary>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${rows}</tbody></table></div>
</details>
${state ? `<p style="margin-top:10px"><b>The state’s part:</b> ${sm ? `<span style="color:${sm[2]}">${sm[0]}</span> ` : ''}${esc(state.note)}${link(state)} <span class="soft" style="font-size:12.5px">(This is about the state, so it isn’t counted above.)</span></p>` : ''}
<p class="src" style="max-width:none">Each item is a fact with a link, not a grade. “Not checked yet” never counts against a county. ${checked ? `County website checked ${esc(checked)}. ` : ''}A county that publishes something we missed can show us with the box below, and we’ll fix it.</p>
</section>`;
}

module.exports = { get, block, ITEMS, LEVELS, inProgress };
