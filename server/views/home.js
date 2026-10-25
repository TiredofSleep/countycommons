const { esc, money, copyText } = require('../lib/corpus');
const { deliveryThreshold, deliveryInfo } = require('../lib/threshold');
const { tourBlock } = require('./tour');
const { layout } = require('./layout');
const { tally } = require('../tally');
const { registrationForm } = require('./register-box');
const { rulesButton, rulesDialog } = require('./rules');

// The front door. Institutional, live, and calm: every number on this page
// is computed fresh from the corpus at render time — the establishment feel
// comes from the platform being demonstrably real, not from copy.

function nextMeeting(calendar) {
  if (!calendar) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let add = 0; add < 40; add++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + add);
    for (const ev of calendar.recurring) {
      if (d.getDay() === ev.rule.weekday && ev.rule.nth.includes(Math.ceil(d.getDate() / 7))) {
        return { date: d, ev };
      }
    }
  }
  return null;
}

// Open petitions, first thing after the headline: the clipboard at the door.
function petitionStrip(data, list) {
  const PT = require('./petitions'), PV = require('./priorities');
  const county = data.county;
  if (!list.length) return `
<section style="margin-top:6px"><div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <b>Petitions to ${esc(PT.addressee(data, PT.levelOf(data, null, 'county')))}</b>
  <p style="margin:4px 0 6px">Like the clipboard at the courthouse door: one sentence saying what we want, and a line to sign. None are open yet — <a href="/petitions#start">start the first one</a>.</p>
</div></section>`;
  return `
<section style="margin-top:6px">
<h2 style="margin-top:0">Petitions <span class="sub">— sign what you agree with, share it with neighbors</span></h2>
${list.map(p => {
    const lvl = PT.levelOf(data, null, p.level), goal = PV.levelThreshold(lvl, county);
    return `<div class="issue" style="display:block"><a href="/petitions/${esc(p.id)}" style="color:inherit;text-decoration:none"><b>${esc(p.title)}</b></a>${PV.progressBar(p.support, goal, null)}<p style="margin:6px 0 0"><a href="/petitions/${esc(p.id)}#sign">Read and sign →</a></p></div>`;
  }).join('')}
<p class="src"><a href="/petitions">All petitions</a> · <a href="/petitions#start">Start one</a> · ${esc(PT.honest(county))}</p>
</section>`;
}

function homePage(data, opts = {}) {
  const { registeredFields = [], justRegistered = false, announceChecked = false } = opts;
  const { county, budget, documents, verification, docket, calendar, issueDrafts } = data;
  const offSite = ((county.jurisdictions || []).find(j => j.kind === 'county') || {}).website || null;
  const offSiteLabel = offSite ? offSite.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
  const tinfo = deliveryInfo(county);
  const threshold = tinfo.value;
  const openQs = (issueDrafts.drafts || []).filter(d => d.status === 'open-tier0');
  const nm = nextMeeting(calendar);
  const stamps = docket.issues.filter(i => i.stamped).slice(-3).reverse();
  // Split the verifier's checks: budget cross-foots (grand-total + node sums)
  // vs. platform-integrity checks (hash chain, vote recount). The home stamp
  // should only make a *budget* claim when there is a real budget to check —
  // otherwise it boasts "budget checks pass" over an empty ordinance.
  const hasBudget = budget.meta && budget.meta.grand_total > 0;
  const fundCount = (budget.nodes || []).filter(n => n.parent === null && n.section === 'appropriations').length;
  const budgetChecks = verification ? verification.checks.filter(c => c.kind !== 'chain' && c.kind !== 'recount') : [];
  const budgetPassed = budgetChecks.filter(c => c.ok !== false).length;
  const vOk = hasBudget && verification && verification.summary.failed === 0 && budgetChecks.length >= 1;
  // Whether this county's documents are actually hash-fingerprinted and archived,
  // or only indexed/transcribed (true only where source files have been stored).
  const anyHashed = documents.documents.some(d => d.sha256);

  const stat = (value, label, href) => `
<a href="${href}" style="text-decoration:none;color:var(--ink);flex:1;min-width:140px;border:1.5px solid var(--ink);background:var(--card);padding:12px 14px;display:block">
  <div style="font-family:var(--mono);font-weight:600;font-size:clamp(16px,2.6vw,22px);font-variant-numeric:tabular-nums">${value}</div>
  <div class="eyebrow" style="margin-top:2px">${esc(label)}</div>
</a>`;

  const door = (title, text, href, cta) => `
<a href="${href}" style="text-decoration:none;color:var(--ink);flex:1;min-width:220px;border:2px solid var(--ink);background:var(--card);padding:16px;display:block">
  <div style="font-family:var(--mono);font-weight:600;font-size:15px;letter-spacing:.02em">${esc(title)}</div>
  <p style="font-size:13px;color:var(--ink-soft);margin:6px 0 8px">${esc(text)}</p>
  <span class="chip c-ok">${esc(cta)} →</span>
</a>`;

  const step = (n, title, text, href, cta) => `
<a href="${href}" style="text-decoration:none;color:var(--ink);flex:1;min-width:200px;border:2px solid var(--ink);background:var(--card);padding:14px;display:block">
  <div class="eyebrow" style="color:var(--accent)">Step ${n}</div>
  <div style="font-family:var(--mono);font-weight:600;font-size:15px;margin-top:2px">${esc(title)}</div>
  <p style="font-size:13px;color:var(--ink-soft);margin:6px 0 8px">${esc(text)}</p>
  <span class="chip c-ok">${esc(cta)} →</span>
</a>`;

  const body = `
<header class="page" style="text-align:left">
  <div class="eyebrow">${copyText(data, 'home.eyebrow')}</div>
  <h1 style="font-size:clamp(22px,4.6vw,36px);max-width:30ch;text-wrap:balance">${copyText(data, 'home.headline')}</h1>
  <p style="font-size:clamp(15px,2.6vw,19px);max-width:56ch;margin:10px 0 4px">${copyText(data, 'home.subhead')}</p>
  <p style="font-family:var(--mono);font-size:clamp(12px,2vw,14px);letter-spacing:.04em;margin:10px 0 2px"><b>${copyText(data, 'home.strip')}</b></p>
  <p class="src" style="max-width:60ch">Every dollar shown where it came from. Every voice counted honestly. Every claim you can check yourself — including this one.</p>
  ${vOk ? `<a href="/verify" style="text-decoration:none"><div class="stamp" title="Every branch of the budget re-adds to its stated total">${budgetPassed}/${budgetChecks.length} budget checks pass ✓</div></a>` : ''}
  <div style="margin:16px 0 2px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    <a href="/petitions" style="display:inline-block;font-family:var(--mono);font-size:clamp(15px,2.4vw,18px);font-weight:600;padding:16px 26px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);text-decoration:none;text-wrap:balance">Sign or start a petition →</a>
    ${openQs.length ? `<a href="/issues/${esc(openQs[0].id)}" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:14px 18px;border:2px solid var(--ink);color:var(--ink);text-decoration:none">or answer the open question →</a>` : ''}
  </div>
</header>
${petitionStrip(data, opts.petitions || [])}

<section style="margin-top:8px">
<h2 style="margin-top:0">See it in two minutes <span class="sub">— what this site lets you do</span></h2>
<p class="src" style="max-width:60ch;margin-bottom:4px">Click through the four moves — see the money, say what you want, share it, track what happens. Or just scroll.</p>
${tourBlock(county)}
</section>

<div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0">
  ${stat(money(budget.meta.grand_total), 'public dollars mapped', '/budget')}
  ${stat(String(documents.documents.length), anyHashed ? 'source documents, hashed' : 'source documents, indexed', '/documents')}
  ${stat(nm ? nm.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—', nm ? 'next public meeting' : 'calendar', '/calendar')}
  ${stat(String(openQs.length), openQs.length === 1 ? 'question open now' : 'questions open now', '/issues')}
</div>

<section>
<h2>Petitions, with receipts <span class="sub">— open-ended</span></h2>
<p style="max-width:66ch">A standing place to <b>see what government is doing, post or sign a petition, and see the recorded outcome</b> — on your town, in your state, and nationally. Every step is public and checkable.</p>
</section>

<section>
<h2>Start where you are <span class="sub">— four doors, no account, no app</span></h2>
<div style="display:flex;gap:10px;flex-wrap:wrap">
  ${door('If you\'re in a hard spot', 'Food, the light bill, rent, benefits — the real local options with phone numbers and hours. This page gives; it never asks.', '/help', 'Find help')}
  ${door('Where the money goes', hasBudget ? `${money(budget.meta.grand_total)}${fundCount ? ` across ${fundCount} funds` : ''} — walk it from the total to the line a deputy's salary lives on. Every number cites its page.` : `No budget ingested for ${county.name} yet — the trail is marked so, never hidden. See what's mapped and what's still owed.`, '/budget', 'Follow the money')}
  ${door('Be counted', openQs.length ? `"${(openQs[0].final_wording || '').slice(0, 90)}…" — answer in fifteen seconds, change your mind until it closes.` : 'Questions put to residents, answered by residents.', '/issues', 'Answer the question')}
  ${door('Show up', nm ? `${nm.ev.name.split('—')[0].trim()} meets ${nm.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, ${nm.ev.time}. Public — and you can speak.` : 'Every public meeting, computed live.', '/calendar', 'See the calendar')}
</div>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
  ${door('The pursuit ledger', 'Every gap in the record, named and numbered — and stamped in public when it gets filled. Watch the record complete itself.', '/docket', 'See the docket')}
  ${door('The document shelf', `${documents.documents.length} public documents — budgets, audits, minutes, ordinances — ${anyHashed ? 'hashed, archived, and, where the scans are machine-readable, searchable to the words inside' : 'indexed and cited, with source files hashed and archived as they\'re obtained'}.`, '/documents', 'Search the documents')}
  ${door('About this project', 'Who runs it, who pays, and its rules.', '/story', 'Read the story')}
  ${door('Share', 'Send a question to a neighbor, print a QR code for a notice board.', '/participate', 'Get involved')}
</div>
<p class="src" style="margin-top:10px">More rooms: <a href="/vendors">who gets paid</a> · <a href="/audits">what the auditors reported</a> · <a href="/compare/spending">how ${esc(county.name)} compares</a> · <a href="/cases">the precedents</a> · <a href="/research">the research shelf</a> · <a href="/stance">how this site works</a> · <a href="/verify">the receipt</a> · <a href="/security">how it's secured</a> · <a href="/guide">the plain-words tour</a>.</p>
</section>

<section>
<h2>How your answer is counted <span class="sub">— and what stays private</span></h2>
<p style="max-width:66ch">You can answer with no account. If you add your name and town, that information is <b>stored in a locked file, shown only to county officials who ask to check that a count is real, and never published unless you choose.</b> Every result shows how many answers came with no account and how many came from verified residents.</p>
<p style="max-width:66ch">When <b>${threshold} neighbors back the same thing</b>, it is printed and handed to the people who decide — your county board, your city council, your school board — and the delivery is stamped in the open. Officials are not required to agree or respond. Each delivery and any response is recorded. Examples of resident-input processes elsewhere, with what each found and its limits, are on <a href="/cases">the cases page</a>.</p>
<p class="src" style="max-width:66ch;margin-top:6px">Why ${threshold}? ${esc(tinfo.note)} The method and the petition rules it follows are on the methodology page: <a href="/methodology#threshold">how the threshold works</a>.</p>
</section>

<section>
<h2>The record so far <span class="sub">— stamped in public, one pursuit at a time</span></h2>
${stamps.map(s => `
<div class="issue" style="display:block">
  <b>#${s.num} · ${esc(s.title)}</b> <span class="chip ${s.status === 'complete' ? 'c-ok' : 'c-part'}">${s.status === 'complete' ? '✓ complete' : '◐ in progress'}</span>
  <p class="src" style="margin-top:4px">${esc(s.stamped.revealed.length > 220 ? s.stamped.revealed.slice(0, 217) + '…' : s.stamped.revealed)}</p>
</div>`).join('')}
<p class="src">The full pursuit ledger — every gap named, every completion dated: <a href="/docket">the docket</a>.</p>
</section>

<section id="register">
<h2>Put yourself on the record <span class="sub">— optional, as much or as little as you like</span> ${rulesButton()}</h2>
<p style="max-width:60ch">Anyone can answer questions here with no account at all. Registering lets a count show how many responses come from verified residents. Every field is optional.</p>
<div class="envelope" style="border:1.5px dashed var(--ink);padding:14px 16px 16px;max-width:580px">
${registrationForm({ county, action: '/register', registeredFields, justRegistered, voteHref: openQs.length ? `/issues/${esc(openQs[0].id)}` : '/issues', announce: { show: openQs.length > 0, checked: announceChecked } })}
</div>
${rulesDialog(county)}
</section>

<section>
<h2>Why you can trust it <span class="sub">— you don't have to; you can check</span></h2>
<p style="max-width:66ch">First, know what this is: <b>an independent, citizen-built project — not a government website</b>. Nothing here is official${offSite ? `; ${esc(county.name)}'s own site is <a href="${esc(offSite)}" rel="noopener">${esc(offSiteLabel)}</a>` : ''}. This platform is the layer in between: where the county's money becomes navigable and its questions get counted.</p>
<p style="max-width:66ch">This platform renders no verdicts and takes no sides. Every number links to its source document. The arithmetic <a href="/verify">re-adds itself in public</a>. The activity log is <a href="/security">hash-chained and anchored</a> where we can't rewrite it. The code is <a href="https://github.com/TiredofSleep/countycommons" rel="noopener">public to the last line</a>. And the standard pointed at us first: <a href="/story">our story</a>, <a href="/stance">how this site works</a>, <a href="/never">our nevers</a>.</p>
</section>`;

  return layout({
    title: `${county.name}, ${county.state}: budget, property taxes, elections and public records · County Commons`,
    current: '/', body, county,
    description: `${county.name}, ${county.state}, in public records: where the money goes line by line, your property tax bill explained, when and how to vote, and what officials do — every number cited, free, nonpartisan. Post or sign a petition.`
  });
}

module.exports = { homePage };
