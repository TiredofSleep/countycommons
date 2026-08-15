const { esc, money } = require('../lib/corpus');
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
  const vOk = verification && verification.summary.failed === 0;

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

  const body = `
<header class="page" style="text-align:left">
  <div class="eyebrow">${esc(county.platform_name)} · countycommons.us · ${esc(county.name)}, ${esc(county.state)}</div>
  <h1 style="font-size:clamp(22px,4.6vw,36px);max-width:30ch;text-wrap:balance">A home for community collaboration, expression, and funding — the checkable middle layer government sites don't build.</h1>
  <p style="font-size:clamp(15px,2.6vw,19px);max-width:56ch;margin:10px 0 4px"><b>Power in verified local numbers.</b> It's your money — <b>${money(budget.meta.grand_total)} a year</b>. See it to the receipt. Weigh in on it. Turn what this county wants into <b>a number nobody can wave off</b>.</p>
  <p style="font-family:var(--mono);font-size:clamp(12px,2vw,14px);letter-spacing:.04em;margin:10px 0 2px"><b>SEE THE MONEY · ASK THE QUESTION · CHECK THE COUNT</b></p>
  <p class="src" style="max-width:60ch">Every dollar cited to its source document. Every voice counted honestly by tier. Every claim checkable by anyone — including this one.</p>
  ${vOk ? `<div class="stamp">Verified ✓ ${verification.summary.passed}/${verification.summary.total_checks}</div>` : ''}
  <div style="margin:16px 0 2px">
    <a href="${openQs.length ? `/issues/${esc(openQs[0].id)}` : '/issues'}" style="display:inline-block;font-family:var(--mono);font-size:clamp(15px,2.4vw,18px);font-weight:600;padding:16px 26px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);text-decoration:none;text-wrap:balance">Put yourself on the record — answer the open question${openQs.length === 1 ? '' : 's'} →</a>
  </div>
</header>

<div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0">
  ${stat(money(budget.meta.grand_total), 'county dollars mapped', '/budget')}
  ${stat(String(documents.documents.length), 'source documents, hashed', '/documents')}
  ${stat(nm ? nm.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—', nm ? 'next public meeting' : 'calendar', '/calendar')}
  ${stat(String(openQs.length), openQs.length === 1 ? 'question open now' : 'questions open now', '/issues')}
</div>

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
  ${door('The document shelf', `${documents.documents.length} public documents — budgets, audits, minutes, ordinances — hashed, archived, and searchable down to the words inside the pages.`, '/documents', 'Search the documents')}
  ${door('Why this exists', 'The story, the creed, and a ledger of every claim this platform makes about itself — each one checkable.', '/story', 'Read the story')}
  ${door('Make it travel', 'Share a question with a neighbor, put a QR code on a corkboard, bring this to your church or your shop. Traction is the product.', '/participate', 'Get involved')}
</div>
<p class="src" style="margin-top:10px">More rooms: <a href="/vendors">who gets paid</a> · <a href="/audits">what the auditors reported</a> · <a href="/compare/spending">how ${esc(county.name)} compares</a> · <a href="/cases">the precedents</a> · <a href="/research">the research shelf</a> · <a href="/stance">where we stand</a> · <a href="/verify">the receipt</a> · <a href="/security">how it's secured</a> · <a href="/guide">the plain-words tour</a>.</p>
</section>

<section>
<h2>The power of a verified number <span class="sub">— why counting here counts</span></h2>
<p style="max-width:66ch">A town hall shout is one voice. A social media storm is noise with no names. But <b>"214 verified ${esc(county.name)} residents said yes"</b> is a fact — checkable, tiered, arithmetic-audited — and a fact like that changes what's possible: an official can <i>cite</i> it and survive the argument; a skeptic can inspect it and find only math. That's the whole trade this platform offers on your shared funds: your voice, made heavy enough to sit on a courthouse desk.</p>
<p style="max-width:66ch">The machinery is deliberate: anonymous answers count as open sentiment, verified residents count as the number officials cite, and — coming with the verification tiers — putting your name on the record counts like signing a petition. At <b>100 responses, any question's result gets printed and hand-delivered to the body that decides</b>, with the delivery stamped publicly. The UK Parliament made thresholds like this law; here, the platform binds itself — and the full <a href="/cases">library of precedents</a>, from town meetings to Taiwan, shows this working everywhere it's been tried honestly. What officials do with a number they can't dispute becomes part of the record either way.</p>
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
    title: `${county.platform_name} — see the money, ask the question, check the count`,
    current: '/', body, county,
    description: `${county.name}'s civic commons: every public dollar mapped to its source, every voice counted honestly, everything checkable — including us.`
  });
}

module.exports = { homePage };
