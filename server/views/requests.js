// "Take it further" pages: the printable letter to a county's elected
// officials, and the one precise public records request per county and
// petition, with its public status and the state's escalation steps.
const { esc } = require('../lib/corpus');
const R = require('../lib/requests');
const A = require('../lib/asks');
const T = require('../lib/transparency');

const PRINT_CSS = `<style>
.letter{border:1px solid var(--rule);background:var(--card);padding:22px 26px;max-width:680px;font-size:15px;line-height:1.5}
.letter p{margin:0 0 12px}.letter .blank{display:inline-block;min-width:220px;border-bottom:1px solid var(--ink)}
@media print{body *{visibility:hidden}.letter,.letter *{visibility:visible}.letter{position:absolute;left:0;top:0;border:0;padding:0;max-width:none;background:#fff;color:#000}}
</style>`;
const nice = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const lc1 = (s) => String(s).charAt(0).toLowerCase() + String(s).slice(1);

function officialsTo(c) {
  if (c.st === 'AR') {
    let judge = null; try { const O = require('../../data/corpus/officials-arkansas.json'); const k = c.name.replace(/ County$/, ''); const o = (O.counties || {})[k]; judge = o && (o.officials || []).find(x => x.office === 'Judge'); } catch (e) { /* none */ }
    return `County Judge${judge ? ' ' + judge.name : ''} and the Justices of the Peace of the ${c.name} Quorum Court`;
  }
  if (c.st === 'TX') return `the County Judge and Commissioners of the ${c.name} Commissioners Court`;
  return A.addressee(c).replace(/^the /, 'The ');
}

// What the meter found, as letter lines.
function findings(c, camp) {
  const it = T.get(c).items;
  return camp.meter.map(k => { const def = T.ITEMS.find(x => x[0] === k); if (!def) return ''; const o = it[k];
    return `<li><b>${esc(def[1])}:</b> ${o ? `${{ yes: 'Yes', partly: 'Partly', no: 'No' }[o.v]}. ${esc(o.note || '')}` : 'Not checked yet.'}</li>`; }).join('');
}

function officialsLetter(c, camp, ctx) {
  const d = A.draft(c, camp, ctx.stateName);
  const best = T.ITEMS.find(x => x[0] === camp.meter[0]);
  return `
<header class="page"><div class="eyebrow">County Commons · take it further</div>
<h1>Your letter to ${esc(c.name)}’s elected officials</h1>
<div class="src" style="font-size:15px">Print it, sign it, and mail it or hand it in. One letter from a resident to the people who vote on county policy is the most direct way to ask. Use your browser’s Print command; only the letter prints.</div></header>
<section>${PRINT_CSS}
<div class="letter">
<p>Date: <span class="blank"></span></p>
<p>To ${esc(officialsTo(c))}<br>${esc(c.name)}, ${esc(ctx.stateName)}</p>
<p><b>Re: ${esc(d.title)}</b></p>
<p>I live in <span class="blank"></span>, in ${esc(c.name)}, and I ask you to ${esc(lc1(d.title.replace(/\.$/, '')))}.</p>
<p>${esc(d.why)}</p>
<p>The County Commons transparency meter found this about ${esc(c.name)}:</p>
<ul>${findings(c, camp)}</ul>
${best ? `<p>The standard: ${esc(best[2])}${best[4] ? ` Who already does it: ${esc(best[4].text)}.` : ''}</p>` : ''}
<p>Please put this on an agenda, adopt a policy that makes it routine, and let me know your answer. The petition is at ${esc(ctx.petitionUrl)}.</p>
<p>Sincerely,</p>
<p>Signature: <span class="blank"></span><br>Printed name: <span class="blank"></span><br>Address: <span class="blank"></span><br>Phone or email: <span class="blank"></span></p>
</div>
<p class="src" style="max-width:none;margin-top:12px">Where to send it: the county’s official mailing address, or hand it in at a regular meeting during public comment. Keep a copy. ${ctx.requestUrl ? `<a href="${esc(ctx.requestUrl)}">The records request for the same information →</a>` : ''}</p>
</section>`;
}

function statusBox(st, s, L, ctx) {
  if (!s) return `<div class="issue" style="display:block;border-left:3px solid var(--partial)"><b>Not filed yet.</b> <span class="src">One resident files this request; everyone else adds their support below, so the county gets one clear request, not hundreds of copies.</span></div>`;
  const parts = [`<b>Filed ${esc(nice(s.filed_at))}</b> by a resident.`];
  if (s.answered_at) parts.push(`<b style="color:var(--sourced)">Answered ${esc(nice(s.answered_at))}.</b> ${esc(s.answer || '')}${s.answer_url ? ` <a href="${esc(s.answer_url)}" rel="noopener">See the records →</a>` : ''}`);
  else if (s.overdue) parts.push(`<b>No answer has been reported here yet.</b> The legal deadline was about ${esc(nice(s.due))}. The county answers the person who filed, so this doesn’t mean the county didn’t answer. If you filed it, tell us what came back with the box below; if nothing came, the next steps are below.`);
  else if (!s.due) parts.push(esc(L.deadline));
  else if (s.due) parts.push(`An answer, or a written date, is due by about <b>${esc(nice(s.due))}</b> (${L.deadline_days} ${L.deadline_unit === 'calendar' ? 'calendar days' : (L.deadline_unit || (st === 'AR' ? 'working' : 'business')) + ' days, not counting weekends; holidays can add days'}).`);
  parts.push(`${s.supporters.toLocaleString('en-US')} other resident${s.supporters === 1 ? ' supports' : 's support'} it.`);
  return `<div class="issue" style="display:block;border-left:3px solid ${s.answered_at ? 'var(--sourced)' : s.overdue ? 'var(--partial)' : 'var(--accent)'}">${parts.join(' ')}</div>`;
}

function requestPage(c, camp, ctx) {
  const L = R.law(c.st); const rec = R.recordFor(camp.id, c.st); const s = R.status(c.geoid, camp.id);
  const f = 'font-size:16px;padding:8px;width:100%;box-sizing:border-box';
  const btn = 'justify-self:start;font-family:var(--mono);font-size:16px;font-weight:600;padding:12px 22px;background:var(--ink);color:var(--paper);border:0';
  const office = rec.office && rec.office[c.st];
  const msg = { filed: 'Thank you. The request is now shown as filed, and others will add their support instead of filing copies.', supported: 'Thank you — your support is counted.', date: 'Please give the date you sent it (within the last 60 days).', email: 'Please add your email, so we can ask what the county sent back. It’s never shown.', name: 'Please add your name.', town: 'Please add your town.', junk: 'That didn’t look like a real name.', already: 'Someone already filed this one — your support was added instead.' }[ctx.msg] || '';
  return `
<header class="page"><div class="eyebrow">County Commons · take it further</div>
<h1>Public records request to ${esc(c.name)}</h1>
<p style="margin:4px 0 0"><b>For the petition:</b> ${esc(A.draft(c, camp, ctx.stateName).title)}</p>
<div class="src" style="font-size:15px">A precise request under the ${esc(L.law)} for records the county already keeps. Filed once for ${esc(c.name)}; everyone else adds their support. The answer is posted here for everyone.</div></header>
<section>
${msg ? `<p class="src" style="color:${/^Thank/.test(msg) || ctx.msg === 'already' ? 'var(--sourced)' : 'var(--dead)'}"><b>${esc(msg)}</b></p>` : ''}
${statusBox(c.st, s, L, ctx)}
</section>
<section>
<h2>The request</h2>
<p class="src" style="max-width:none">Use your browser’s Print command; only the letter prints. ${esc(L.send_note)}</p>
${PRINT_CSS}
${s ? '<details><summary><b>Print your own copy</b> — usually not needed</summary><p class="src" style="max-width:none">The county already has this request, so a second copy usually adds work without adding anything; add your support above instead. Print your own if the first request went unanswered past the deadline, or if you want the records sent to you too.</p>' : ''}
<div class="letter">
<p>Date: <span class="blank"></span></p>
<p>${esc(L.addressed_to)}${office ? `<br>Office of the ${esc(office)}` : ''}<br>${esc(c.name)}, ${esc(ctx.stateName)}</p>
<p><b>Re: Request under the ${esc(L.law)}, ${esc(L.cite)}</b></p>
<p>Under the ${esc(L.law)}, I request copies of the following public records:</p>
<p style="padding-left:16px;border-left:3px solid var(--rule)">${esc(rec.what(c.st))}</p>
${L.lines.map(x => `<p>${esc(x)}</p>`).join('')}
${L.residency_line ? `<p>${esc(L.residency_line)}</p>` : ''}
<p>Thank you.</p>
<p>Signature: <span class="blank"></span><br>Printed name: <span class="blank"></span><br>Mailing address: <span class="blank"></span><br>Email or phone: <span class="blank"></span></p>
</div>
${s ? '</details>' : ''}
</section>
<section id="report">
${s ? `${s.answered_at ? '' : `<h2>Support this request</h2><form method="post" action="${esc(ctx.base)}/support"><input type="hidden" name="x" value="1"><div style="position:absolute;left:-9999px" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div><button type="submit" style="${btn}">Add my support</button></form><p class="src">Counted, not sent again. Your name is never shown.</p>`}` : `
<h2>Did you send it? Tell us, so nobody files a copy</h2>
<form method="post" action="${esc(ctx.base)}/filed" style="display:grid;gap:8px;max-width:520px">
  <label><b>The date you sent it</b><input name="filed_on" type="date" required style="${f}"></label>
  <label><b>Your name</b> <span class="soft">(never shown)</span><input name="name" required maxlength="60" autocomplete="name" style="${f}"></label>
  <label><b>Your town</b><input name="town" required maxlength="60" autocomplete="address-level2" style="${f}"></label>
  <label><b>Your email</b> <span class="soft">(never shown — so we can ask what the county sent back; the answer comes to you, not to us)</span><input name="email" type="email" required maxlength="120" style="${f}"></label>
  <div style="position:absolute;left:-9999px" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
  <button type="submit" style="${btn}">I sent it</button>
</form>`}
<p class="src" style="max-width:none">When the county answers, send what you got with the “Help keep this honest” box below, and we’ll post the records here and update the county’s transparency meter.</p>
</section>
<section>
<h2>The rules, and what to do if there’s no answer</h2>
<p><b>Who can ask:</b> ${esc(L.who)}. <b>How:</b> ${esc(L.how)}</p>
<p><b>Deadline:</b> ${esc(L.deadline)}</p>
<p><b>Fees:</b> ${esc(L.fees)}</p>
<ol>${L.escalate.map(e => `<li><b>${esc(e.step)}:</b> ${esc(e.do)}</li>`).join('')}</ol>
<p class="src" style="max-width:none">Source: <a href="${esc(L.source.url)}" rel="noopener">${esc(L.source.label)}</a>. This page explains the law in plain words; it isn’t legal advice. <a href="${esc(ctx.letterUrl)}">Also write to your elected officials →</a> · <a href="${esc(ctx.petitionUrl)}">The petition →</a></p>
</section>`;
}

// The box under an information petition: the two things a signer can print.
function takeFurther(c, camp, { abs } = {}) {
  if (!c || !camp) return '';
  const base = `${abs ? 'https://countycommons.us' : ''}/us/${c.st.toLowerCase()}/${c.slug}/ask/${camp.id}`;
  const rec = R.recordFor(camp.id, c.st); const s = rec ? R.status(c.geoid, camp.id) : null;
  return `
<section id="further">
<h2>Take it further</h2>
<div class="issue" style="display:block"><b><a href="${esc(base)}/letter">Print your letter to ${esc(c.name)}’s elected officials →</a></b><p class="src" style="margin:4px 0 0">Addressed, with what County Commons found and the standard. Sign it and mail it or hand it in.</p></div>
${rec ? `<div class="issue" style="display:block"><b><a href="${esc(base)}/request">${s ? 'See the public records request and add your support →' : 'Print the public records request →'}</a></b><p class="src" style="margin:4px 0 0">${s ? `Filed ${esc(nice(s.filed_at))}${s.answered_at ? ` · answered ${esc(nice(s.answered_at))}` : s.overdue ? ' · no answer reported here yet' : ` · due about ${esc(nice(s.due))}`} · ${s.supporters} supporting.` : `One precise request under ${esc(R.law(c.st).law)}, filed once for ${esc(c.name)}. Be the one to send it.`}</p></div>` : ''}
</section>`;
}

// For any stored information petition (national copy "us:<geoid>" or a county
// site's copy): its county and campaign, and the take-it-further box.
function forPetition(p, opts = {}) {
  if (!p || !p.campaign || p.level !== 'county') return '';
  const camp = A.byId(p.campaign); if (!camp) return '';
  const N = require('../lib/national-local').read('counties.json'); if (!N) return '';
  const t = String(p.tenant);
  const c = /^us:/.test(t) ? N.counties.find(x => x.geoid === t.slice(3)) : N.counties.find(x => x.site && x.site.split('.')[0] === t);
  return c ? takeFurther(c, camp, opts) : '';
}

// For county officials and staff: each box not yet green, what we found,
// and the simplest way to meet it — most with documents already on hand.
function officialsGuide(c, stateName) {
  const { items } = T.get(c);
  const MARK = { yes: '✓ Yes', partly: '◐ Partly', no: '✗ No' };
  const open = T.ITEMS.filter(([k]) => !items[k] || items[k].v !== 'yes');
  const done = T.ITEMS.length - open.length;
  const fb = `/us/feedback?kind=correction&from=${encodeURIComponent('/us/' + c.st.toLowerCase() + '/' + c.slug)}`;
  const reqs = Object.keys(R.RECORDS).map(id => ({ id, s: R.status(c.geoid, id), camp: A.byId(id) })).filter(x => x.s && x.camp);
  return `
<header class="page"><div class="eyebrow">County Commons · for ${esc(c.name)} officials and staff</div>
<h1>How to turn ${esc(c.name)}’s boxes green</h1>
<div class="src" style="font-size:15px">${done} of ${T.ITEMS.length} transparency boxes are green for ${esc(c.name)}, ${esc(stateName)}. Most of the rest turn green by posting documents the county already keeps. When something is posted, tell us and we’ll check it and update the box. Nothing here is a grade of anyone’s work; it’s a list of what’s public.</div></header>
<section>
<p><a href="${esc(fb)}" style="font-weight:600">Tell us something is posted →</a> <span class="soft">(a link to the page or file is all we need)</span></p>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>Box</th><th>What we found</th><th>The simplest way to meet it</th></tr></thead><tbody>${open.map(([k, label, bar]) => { const o = items[k]; return `<tr><td style="vertical-align:top"><b>${esc(label)}</b></td><td style="vertical-align:top">${o ? `${MARK[o.v]}. ${esc(o.note || '')}${o.url ? ` <a href="${esc(o.url)}" rel="noopener" class="soft" style="font-size:12px">source</a>` : ''}` : '<span class="soft">Not checked yet.</span>'}</td><td style="vertical-align:top">${esc(T.HOW[k] || bar)}</td></tr>`; }).join('')}</tbody></table></div>
</section>
${reqs.length ? `<section><h2>Public records requests residents have reported</h2><ul>${reqs.map(x => `<li>${esc(x.camp.title.replace(/{county}/g, c.name))}: filed ${esc(nice(x.s.filed_at))}${x.s.answered_at ? `, answered ${esc(nice(x.s.answered_at))}` : ''}. <a href="/us/${esc(c.st.toLowerCase())}/${esc(c.slug)}/ask/${esc(x.id)}/request">The request →</a></li>`).join('')}</ul><p class="src" style="max-width:none">Posting these records online answers everyone at once, and turns the box green.</p></section>` : ''}
<section><p class="src" style="max-width:none"><a href="/us/transparency">The standard, and a government that meets each bar →</a> · <a href="/us/${esc(c.st.toLowerCase())}/${esc(c.slug)}#transparency">${esc(c.name)}’s page →</a></p></section>`;
}

// A one-page flyer to hand out: what the county posts, what it doesn't yet,
// and one QR code to the meter, where each missing box has its petition.
const FLY = { proposed: 'The proposed budget, before the vote', posted: 'The adopted budget', current: 'This year’s budget', by_office: 'Spending by office', line_items: 'What each office buys (line items)', adds_up: 'The budget adds up to its total', summary: 'A plain-language budget summary', history: 'Five years of budgets', searchable: 'Budget is searchable text, not a scan', open_to_tools: 'Downloads without a bot check', open_data: 'Numbers as a spreadsheet anyone can download', free_reuse: 'Free to read and reuse, no sign-in', in_year: 'Monthly or quarterly spending reports', actual: 'What was really spent last year', revenue: 'Where the money comes from', audit: 'The audit', debt: 'What the county owes', pensions: 'Retirement promises and funding', payments: 'Every payment: who, how much, when', cards: 'County credit card spending', contracts: 'Contracts and who got them', pay: 'What each job pays', incentives: 'Tax breaks and deals', receipts: 'The receipt behind each payment', meetings: 'Meeting agendas and minutes', votes: 'How each official voted', video: 'Meeting video', records_log: 'A log of records requests', disclosures: 'Officials’ financial filings', realtime: 'Payments posted daily' };
function meterFlyer(c, stateName, qrSvg, link) {
  const { items, checked } = T.get(c);
  const met = T.ITEMS.filter(([k]) => items[k] && items[k].v === 'yes');
  const part = T.ITEMS.filter(([k]) => items[k] && items[k].v === 'partly');
  const no = T.ITEMS.filter(([k]) => items[k] && items[k].v === 'no');
  const unchecked = T.ITEMS.length - met.length - part.length - no.length;
  const li = (arr, mark) => arr.map(([k, label]) => `<li><span aria-hidden="true">${mark}</span> ${esc(FLY[k] || label)}</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flyer — what ${esc(c.name)} puts online</title><meta name="robots" content="noindex">
<style>body{font-family:Georgia,serif;color:#111;background:#fff;max-width:7.5in;margin:0 auto;padding:.4in .4in}h1{font-size:30px;line-height:1.15;margin:.08in 0}.k{font-family:ui-monospace,monospace;font-size:13px;letter-spacing:.08em;text-transform:uppercase}p{font-size:16px;line-height:1.4;margin:.08in 0}.small{font-size:12px;color:#333}.cols{display:grid;grid-template-columns:1fr 1fr;gap:.25in;margin-top:.1in}h2{font-size:17px;margin:.05in 0}ul{list-style:none;padding:0;margin:0;font-size:13.5px;line-height:1.45}li span{display:inline-block;width:1.2em;font-weight:700}.qr{width:2.1in;height:2.1in;flex:none}.row{display:flex;gap:.3in;align-items:center;margin-top:.2in;border-top:2px solid #111;padding-top:.15in}@media print{.noprint{display:none}}@media (max-width:560px){.cols{grid-template-columns:1fr}.row{flex-direction:column;align-items:flex-start}}</style></head><body>
<p class="noprint small"><a href="/us/${esc(c.st.toLowerCase())}/${esc(c.slug)}#transparency">← back to ${esc(c.name)}</a> · print with your browser (Ctrl+P or Share → Print)</p>
<div class="k">County Commons · ${esc(c.name)}, ${esc(stateName)}</div>
<h1>What ${esc(c.name)} puts online about its money and its work</h1>
<p><b>${met.length} of ${T.ITEMS.length}</b> public-information boxes met${part.length ? `, ${part.length} partly` : ''}${no.length ? `, ${no.length} not yet` : ''}${unchecked ? `, ${unchecked} not checked yet` : ''}.${checked ? ` Checked ${esc(checked)}.` : ''} A perfect score means every dollar traced to its receipt, and every meeting and vote on the record.</p>
<div class="cols">
<div><h2>Online now</h2><ul>${li(met, '✓')}${li(part, '◐')}</ul>${part.length ? '<p class="small">◐ = partly</p>' : ''}</div>
<div><h2>Not online yet</h2><ul>${li(no, '✗') || '<li>Nothing found missing.</li>'}</ul></div>
</div>
<div class="row"><div class="qr">${qrSvg}</div><div><p style="font-size:21px;margin:0"><b>Scan to see the sources</b></p><p>Every box links to where we looked. Each box not met yet has a petition asking ${esc(c.name)} to post it. Sign the ones you care about.</p><p class="small" style="word-break:break-all">${esc(link)}</p></div></div>
<p class="small" style="margin-top:.15in">These are facts with links, not a grade of anyone’s work. Most boxes turn green by posting documents the county already keeps. If we missed something that’s posted, tell us on the site and we’ll fix it. County Commons is an independent, nonpartisan public-records project.</p>
</body></html>`;
}

module.exports = { officialsLetter, requestPage, takeFurther, forPetition, officialsGuide, meterFlyer };
