const { esc, money, copyText } = require('../lib/corpus');
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

function homePage(data, opts = {}) {
  const { registeredFields = [], justRegistered = false, announceChecked = false } = opts;
  const { county, budget, documents, verification, docket, calendar, issueDrafts } = data;
  const openQs = (issueDrafts.drafts || []).filter(d => d.status === 'open-tier0');
  const nm = nextMeeting(calendar);
  const stamps = docket.issues.filter(i => i.stamped).slice(-3).reverse();
  const vOk = verification && verification.summary.failed === 0 && verification.summary.total_checks > 0;

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
  <p class="src" style="max-width:60ch">Every dollar cited to its source document. Every voice counted honestly by tier. Every claim checkable by anyone — including this one.</p>
  ${vOk ? `<a href="/verify" style="text-decoration:none"><div class="stamp" title="Every branch of the budget re-adds to its stated total">${verification.summary.passed}/${verification.summary.total_checks} budget checks pass ✓</div></a>` : ''}
  <div style="margin:16px 0 2px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    <a href="/priorities" style="display:inline-block;font-family:var(--mono);font-size:clamp(15px,2.4vw,18px);font-weight:600;padding:16px 26px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);text-decoration:none;text-wrap:balance">Raise your voice — put a priority on the record →</a>
    ${openQs.length ? `<a href="/issues/${esc(openQs[0].id)}" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:14px 18px;border:2px solid var(--ink);color:var(--ink);text-decoration:none">or answer the open question →</a>` : ''}
  </div>
</header>

<div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0">
  ${stat(money(budget.meta.grand_total), 'county dollars mapped', '/budget')}
  ${stat(String(documents.documents.length), 'source documents, hashed', '/documents')}
  ${stat(nm ? nm.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—', nm ? 'next public meeting' : 'calendar', '/calendar')}
  ${stat(String(openQs.length), openQs.length === 1 ? 'question open now' : 'questions open now', '/issues')}
</div>

<section>
<h2>This is your petition <span class="sub">— open-ended, and with receipts</span></h2>
<p style="max-width:66ch">Not a one-off signature that disappears into an inbox. A standing place where a community can <b>see what government is doing, say what should change, rally behind it, and hold the outcome to the light</b> — on your town, in your state, and nationally. Every step is public and checkable, and nobody's voice is for sale.</p>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">
  ${step('1', 'See it', 'Walk the budget from the total down to the line — every number cited to its source document.', '/budget', 'The money trail')}
  ${step('2', 'Say it', 'Post what to prioritize — or take a fresh look at — and why. For your town, your state, or the nation.', '/priorities', 'Set a priority')}
  ${step('3', 'Rally', 'Neighbors back what they share, so the strongest-felt priorities rise to the top on their own.', '/priorities', 'Back what matters')}
  ${step('4', 'Hold them to it', 'At the threshold it\'s carried to the officials who decide — and we track, in public, what they actually do.', '/outcomes', 'What came of it')}
</div>
</section>

<section>
<h2>Start where you are <span class="sub">— four doors, no account, no app</span></h2>
<div style="display:flex;gap:10px;flex-wrap:wrap">
  ${door('If you\'re in a hard spot', 'Food, the light bill, rent, benefits — the real local options with phone numbers and hours. This page gives; it never asks.', '/help', 'Find help')}
  ${door('Where the money goes', `${money(budget.meta.grand_total)} across ~40 funds — walk it from the total to the line a deputy's salary lives on. Every number cites its page.`, '/budget', 'Follow the money')}
  ${door('Be counted', openQs.length ? `"${(openQs[0].final_wording || '').slice(0, 90)}…" — answer in fifteen seconds, change your mind until it closes.` : 'Questions put to residents, answered by residents.', '/issues', 'Answer the question')}
  ${door('Show up', nm ? `${nm.ev.name.split('—')[0].trim()} meets ${nm.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, ${nm.ev.time}. Public — and you can speak.` : 'Every public meeting, computed live.', '/calendar', 'See the calendar')}
</div>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
  ${door('The pursuit ledger', 'Every gap in the record, named and numbered — and stamped in public when it gets filled. Watch the record complete itself.', '/docket', 'See the docket')}
  ${door('The document shelf', `${documents.documents.length} public documents — budgets, audits, minutes, ordinances — hashed, archived, and, where the scans are machine-readable, searchable to the words inside.`, '/documents', 'Search the documents')}
  ${door('Why this exists', 'The story, the creed, and a ledger of every claim this platform makes about itself — each one checkable.', '/story', 'Read the story')}
  ${door('Make it travel', 'Share a question with a neighbor, put a QR code on a corkboard, bring this to your church or your shop. Traction is the product.', '/participate', 'Get involved')}
</div>
<p class="src" style="margin-top:10px">More rooms: <a href="/vendors">who gets paid</a> · <a href="/audits">what the auditors reported</a> · <a href="/compare/spending">how ${esc(county.name)} compares</a> · <a href="/cases">the precedents</a> · <a href="/research">the research shelf</a> · <a href="/stance">where we stand</a> · <a href="/verify">the receipt</a> · <a href="/security">how it's secured</a> · <a href="/guide">the plain-words tour</a>.</p>
</section>

<section>
<h2>The power of a verified number <span class="sub">— why counting here counts</span></h2>
<p style="max-width:66ch">A town hall shout is one voice. A social media storm is noise with no names. But a line like <b>"214 verified ${esc(county.name)} residents said yes"</b> — once the verification tiers are live — is a different kind of thing: checkable, tiered, arithmetic-audited, the kind of fact an official can <i>cite</i> and survive the argument, and a skeptic can inspect and find only math. That's the trade this platform is built toward on your shared funds: your voice, made heavy enough to sit on a courthouse desk. <span class="src">(That 214 is an illustration of the mechanism, not today's count — the live tally is on every question page.)</span></p>
<p style="max-width:66ch">The machinery is deliberate: anonymous answers count as open sentiment, verified residents count as the number officials cite, and — coming with the verification tiers — putting your name on the record counts like signing a petition. At <b>100 responses, any question's result gets printed and hand-delivered to the body that decides</b>, with the delivery stamped publicly. The UK Parliament set response thresholds like this in its rules; here, the platform binds itself — and the full <a href="/cases">library of precedents</a>, from town meetings to Taiwan, shows this working where it's been tried, and fraying where it's been neglected. What officials do with a number they can't dispute becomes part of the record either way.</p>
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
<p style="max-width:60ch">Anyone can answer questions here with no account at all. Registering is what turns your answer into the kind an official can't wave off — a count backed by real, reachable people. Every field is optional.</p>
<div class="envelope" style="border:1.5px dashed var(--ink);padding:14px 16px 16px;max-width:580px">
${registrationForm({ county, action: '/register', registeredFields, justRegistered, voteHref: openQs.length ? `/issues/${esc(openQs[0].id)}` : '/issues', announce: { show: openQs.length > 0, checked: announceChecked } })}
</div>
${rulesDialog(county)}
</section>

<section>
<h2>Why you can trust it <span class="sub">— you don't have to; you can check</span></h2>
<p style="max-width:66ch">First, know what this is: <b>an independent, citizen-built project — not a government website</b>. Nothing here is official; the county's own site is <a href="https://www.clarkcountyar.gov" rel="noopener">clarkcountyar.gov</a>. This platform is the layer in between: where the county's money becomes navigable, its questions get counted, and — as it grows — the projects it decides it wants find their footing.</p>
<p style="max-width:66ch">This platform renders no verdicts and takes no sides. Every number links to its source document. The arithmetic <a href="/verify">re-adds itself in public</a>. The activity log is <a href="/security">hash-chained and anchored</a> where we can't rewrite it. The code is <a href="https://github.com/TiredofSleep/countycommons" rel="noopener">public to the last line</a>. And the standard pointed at us first: <a href="/story">our story</a>, <a href="/stance">our stance</a>, <a href="/never">our nevers</a>.</p>
</section>`;

  return layout({
    title: `${county.platform_name} — rally your community to shape what government does`,
    current: '/', body, county,
    description: `${county.name}'s open, nonpartisan petition with receipts: see where public money goes, say what should change — locally, in your state, or nationally — rally your neighbors, and track what officials do.`
  });
}

module.exports = { homePage };
