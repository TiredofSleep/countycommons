const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const { myVote } = require('../vote');
const { tally } = require('../tally');
const { registrationForm } = require('./register-box');
const { rulesButton, rulesDialog } = require('./rules');

// The voice layer's front door, Tier 0 edition. The platform computes and
// cites; the question is the residents' to answer. No verdicts here either —
// just the ask, the context, the disclosure, and the count.

function openIssues(data) {
  return (data.issueDrafts.drafts || []).filter(d => d.status === 'open-tier0');
}

function issuesPage(data, submitted) {
  const { county } = data;
  const { queueCount } = require('../submissions');
  const items = openIssues(data).map(d => {
    const t = tally(d.id);
    return `
<div class="issue" style="display:block">
  <b><a href="/issues/${esc(d.id)}">${esc(d.final_wording || d.neutral_framing)}</a></b>
  <p class="src">Opened ${esc(d.opened)} · ${t.total} response${t.total === 1 ? '' : 's'} · open sentiment (Tier 0) · <a href="/issues/${esc(d.id)}#share">share it</a></p>
</div>`;
  }).join('');

  const queued = queueCount();
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)}</div>
  <h1>Open questions</h1>
  <div class="src"><b>This is the county's counting room — where what residents want becomes a number with receipts.</b> Questions put to residents, answered by residents: no account needed, one voice per sitting, changeable while your window stays open — and nothing follows you home from a shared computer. Today's counts are open sentiment; the verification tiers that make a number impossible to wave off arrive with the full voting layer — and every count, always, shows exactly how verified it is. That honesty is what makes the number powerful.</div>
</header>
${items || '<p class="src">No questions are open right now.</p>'}

<section>
<h2>The traction rule <span class="sub">— what enough responses guarantees</span></h2>
<p>Borrowed from the UK Parliament's petition site, where 10,000 signatures obligates a government response: <b>when a question here reaches 100 responses, we print the result packet and hand-deliver it to the relevant body</b> — quorum court, city board, or school board — and stamp the delivery publicly on the docket. Officials aren't obligated to act. They are guaranteed to receive — and what they do next becomes part of the public record either way.</p>
</section>

<section id="ask">
<h2>Ask your own question <span class="sub">— the front door is open</span></h2>
${submitted ? `<p style="color:var(--sourced)"><b>Received.</b> Your question is in the review queue${queued > 1 ? ` with ${queued - 1} other${queued > 2 ? 's' : ''}` : ''}. Every question is checked against the platform's bright lines (no candidates, no ballot measures, no named individuals), offered a neutral wording you approve, and then opened — with your raw words and the final wording both logged.</p>` : `
<p>Anything Clark County decides is fair game — money, roads, buildings, services. Your question goes through wording review (you keep the final say), gets checked against the <a href="/never">bright lines</a>, and opens for the whole county to answer.</p>
<form method="POST" action="/issues/submit" style="display:flex;flex-direction:column;gap:8px;max-width:60ch">
  <textarea name="question" required maxlength="1000" rows="3" placeholder="What should the county be working on? Ask it in your own words — polishing is our job, the position stays yours."
    style="font-family:var(--sans);font-size:14px;padding:10px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink)"></textarea>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <input type="text" name="name" maxlength="120" placeholder="Name (optional)"
      style="font-size:13px;padding:8px;border:1.5px solid var(--rule);background:var(--card);color:var(--ink);flex:1;min-width:140px">
    <input type="text" name="contact" maxlength="200" placeholder="Phone or email (optional — only to follow up)"
      style="font-size:13px;padding:8px;border:1.5px solid var(--rule);background:var(--card);color:var(--ink);flex:2;min-width:180px">
  </div>
  <button type="submit" style="font-family:var(--mono);font-size:13px;padding:10px 18px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer;align-self:flex-start">Submit for review</button>
  <p class="src">Contact info is optional, used only to follow up on your question, and never published. ${queued > 0 ? `${queued} question${queued > 1 ? 's' : ''} currently in review.` : ''}</p>
</form>`}
</section>`;

  return layout({ title: `Open questions — ${county.platform_name}`, current: '/issues', body, county });
}

function issuePage(data, draft, participant, justVoted, registeredFields = [], justRegistered = false, signState = null) {
  const { county } = data;
  const t = tally(draft.id);
  const mine = participant ? myVote(participant, draft.id) : null;
  const { listFor, mySignature } = require('../signatures');
  const sigs = listFor(draft.id);
  const mySig = participant ? mySignature(participant, draft.id) : null;

  const results = `<table class="plain"><thead><tr><th>Answer</th><th>Count</th></tr></thead><tbody>
<tr><td>Yes</td><td class="num">${t.counts.yes}</td></tr>
<tr><td>No</td><td class="num">${t.counts.no}</td></tr>
<tr><td>Skip</td><td class="num">${t.counts.skip}</td></tr>
</tbody></table>
<p class="src">${t.total} total · all Tier 0 (open sentiment) · all via web · updates instantly${t.duplicates_removed ? ` · ${t.duplicates_removed} double vote${t.duplicates_removed === 1 ? '' : 's'} cleared by registered email or phone` : ''}</p>
${t.connections ? `<p class="src">Who's answering, self-reported (not verified): ${t.connections.resident} live in ${esc(county.name)} · ${t.connections['works-here']} work here · ${t.connections['family-here']} have family here · ${t.connections.elsewhere + t.connections.unsaid} other or unsaid</p>` : ''}`;

  const btn = (v, label) => `<button type="submit" name="value" value="${v}"
    style="font-family:var(--mono);font-size:14px;padding:10px 22px;cursor:pointer;border:2px solid var(--ink);
    background:${mine && mine.value === v ? 'var(--ink)' : 'var(--card)'};color:${mine && mine.value === v ? 'var(--paper)' : 'var(--ink)'}">${label}</button>`;

  const CONN_OPTS = [
    ['resident', `I live in ${county.name}`],
    ['works-here', `I work in ${county.name}, live elsewhere`],
    ['family-here', `Family of mine lives in ${county.name}`],
    ['elsewhere', 'None of those — just weighing in']
  ];
  const connRadios = CONN_OPTS.map(([v, label]) => `
    <label style="display:flex;gap:8px;align-items:baseline;font-size:14.5px;cursor:pointer">
      <input type="radio" name="connection" value="${v}"${mine && mine.connection === v ? ' checked' : ''}> ${esc(label)}
    </label>`).join('');


  const body = `
<div class="crumb"><a href="/issues">Open questions</a></div>
<header class="page">
  <div class="eyebrow">${esc(county.name)} · open question · Tier 0 sentiment · opened ${esc(draft.opened)}</div>
  <h1 style="font-size:clamp(18px,3.5vw,26px)">${esc(draft.final_wording)}</h1>
  ${justVoted ? `<p class="src" style="color:var(--sourced)"><b>Got it — you answered ${esc(justVoted.toUpperCase())}.</b> You can change your answer any time until the question closes. One more step makes it count for more: <a href="#register">add yourself to the record</a> below.</p>` : ''}
</header>

<section>
<h2>Answer <span class="sub">— no account needed; one voice per sitting; changeable while your window is open</span> ${rulesButton()}</h2>
${registeredFields.length ? `<p class="src" style="color:var(--sourced)"><b>You're on the record ✓</b> — on file with your answers (never published): <b>${registeredFields.map(esc).join(', ')}</b>. Your answer here counts as a registered voice.</p>` : ''}
<form method="POST" action="/issues/${esc(draft.id)}/vote" style="display:flex;flex-direction:column;gap:12px;max-width:580px;margin:10px 0">

  <fieldset style="border:1.5px solid var(--ink);background:var(--card);padding:12px 14px;margin:0">
    <legend style="font-family:var(--mono);font-size:13px;font-weight:600;padding:0 8px">First — are you a ${esc(county.name)} resident?</legend>
    <p class="src" style="margin:0 0 8px">Everyone can answer. This just lets the count say who's who — self-reported, and always labeled that way.</p>
    <div style="display:flex;flex-direction:column;gap:6px">${connRadios}</div>
  </fieldset>

  <div style="display:flex;gap:10px;flex-wrap:wrap">${btn('yes', 'YES')} ${btn('no', 'NO')} ${btn('skip', 'SKIP')}</div>
  <p class="src" style="margin:0">One person, one voice — please vote once. Registered votes that share an email or phone are automatically collapsed to the newest one at count time.</p>
</form>
${mine && !justVoted ? `<p class="src">Your current answer: <b>${esc(mine.value.toUpperCase())}</b>.</p>` : ''}

<details id="register" class="envelope" style="border:1.5px dashed var(--ink);padding:10px 14px;max-width:580px"${justVoted || justRegistered ? ' open' : ''}>
  <summary style="cursor:pointer;font-family:var(--mono);font-size:13px;font-weight:600">${registeredFields.length ? "You're on the record ✓ — open to update your file" : 'Add yourself to the record — optional, as much or as little as you like'}</summary>
  <p class="src" style="margin:10px 0 0">A registered answer is the kind an official can't wave off. Every field is optional — leave what you like.</p>
  ${registrationForm({ county, action: `/issues/${esc(draft.id)}/register`, registeredFields, justRegistered, announce: { show: true, checked: !!mySig } })}
</details>
${rulesDialog(county)}
</section>

<section>
<h2>The count so far <span class="sub">— aggregate only, always</span></h2>
${results}
<p class="src">Tier 0 means open sentiment: it shows how visitors lean, and it is never cited as verified resident opinion. Phone, residency, and voter verification tiers arrive with the full voting layer — and results will always display every tier's count separately.</p>
<p class="src">These counts are unofficial: gathered by an independent community platform, not by any government. This is not an election, a referendum, or a legal petition — its only weight is that the counting is published and checkable.</p>
</section>

<section id="sign">
<h2>Signed publicly <span class="sub">— the loud version: optional, always</span></h2>
<p class="src" style="max-width:60ch">The count above is anonymous and stays that way. Signing is the separate, louder act — your name and your answer, on the page, like a petition on a counter. ${mine ? '' : 'Answer the question first, then sign it if you want to be heard by name.'}</p>
${signState === 'ok' ? `<p class="src" style="color:var(--sourced)"><b>Announced ✓</b> — your name is on the page below. Uncheck the announce box any time to take it down.</p>` : ''}
${signState === 'removed' ? `<p class="src" style="color:var(--sourced)"><b>Announcement taken down</b> — your name is off the page. The withdrawal is on the public log, without the name.</p>` : ''}
${signState === 'novote' ? `<p class="src" style="color:var(--dead)"><b>Answer first</b> — an announcement announces your answer, and you haven't cast one this sitting. Vote above, then check the box again.</p>` : ''}
${signState === 'noname' ? `<p class="src" style="color:var(--dead)"><b>An announcement needs a name</b> — add at least a name in the envelope above, keep the box checked, and register again.</p>` : ''}
${mine ? `<p class="src" style="max-width:60ch">To put your name here, check <b>Announce me publicly</b> in the envelope above — registering and announcing are one motion.</p>` : ''}
${sigs.length ? `
<div style="margin-top:14px;border:1.5px solid var(--ink);background:var(--card);padding:12px 14px;max-width:580px">
  <div class="eyebrow" style="margin-bottom:6px">${sigs.length} public signature${sigs.length === 1 ? '' : 's'} · self-signed, unverified</div>
  ${sigs.slice(0, 50).map(s => `<p style="margin:4px 0;font-size:14px"><b>${esc(s.name)}</b>${s.city ? `, ${esc(s.city)}` : ''} — <span style="font-family:var(--mono);font-weight:600">${esc((s.value || '').toUpperCase())}</span> <span class="src">${esc(String(s.ts).slice(0, 10))}</span></p>`).join('')}
  ${sigs.length > 50 ? `<p class="src">…and ${sigs.length - 50} more.</p>` : ''}
</div>` : ''}
<p class="src" style="margin-top:10px;max-width:60ch">Signatures are self-given and unverified until the verification tiers arrive. If a signature misuses your name, ${county.contact_email ? `email <a href="mailto:${esc(county.contact_email)}">${esc(county.contact_email)}</a>` : 'email us (see the footer)'} and we will remove it — removals are logged on the public record like everything else.</p>
</section>

<section id="share">
<h2>Share it <span class="sub">— a question travels farther than a website</span></h2>
<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
  <img src="/issues/${esc(draft.id)}/qr.svg" alt="QR code linking to this question" width="140" height="140" style="border:1.5px solid var(--ink);background:#fff;padding:6px;flex:none">
  <div style="flex:1;min-width:220px">
    <p style="margin-top:0">Send a neighbor straight to this question — they land right here, answer in fifteen seconds, done. Text it, post it, print the code for the counter or the church bulletin.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0">
      <span class="code" id="share-url" style="border:1.5px solid var(--rule);background:var(--card);padding:7px 10px;font-size:12px;user-select:all">countycommons.us/issues/${esc(draft.id)}</span>
      <button type="button" data-copy="https://countycommons.us/issues/${esc(draft.id)}" style="font-family:var(--mono);font-size:12px;padding:7px 12px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);cursor:pointer">Copy link</button>
      <button type="button" data-share-title="A question for Clark County" data-share-url="https://countycommons.us/issues/${esc(draft.id)}" style="font-family:var(--mono);font-size:12px;padding:7px 12px;border:1.5px solid var(--ink);background:var(--ink);color:var(--paper);cursor:pointer">Share…</button>
    </div>
    <p class="src"><b>During early access:</b> the site asks for a door code — send it along with the link (you know it if you're reading this). When they enter it, the door opens onto this exact page.</p>
    <p class="src">The traction rule: at 100 responses, the result gets printed and hand-delivered to the relevant body, and the delivery is stamped on the <a href="/docket">docket</a>. ${t.total} of 100 and counting — every share moves it.</p>
  </div>
</div>
</section>

<section>
<h2>The context <span class="sub">— why this question exists</span></h2>
<p>This platform traced every public dollar it could. Most of the trail is documented: the <a href="/budget">money trail</a> cross-foots to the dollar, and <a href="/audits">what the auditors reported</a> is quoted in full. But parts of the trail stop short of a receipt: <a href="/line/edccc">$1.84M/year in economic development incentives</a> with no public recipient list, <a href="/vendors">commodity purchases no posted document names</a>, and <a href="/compare/spending">about $4M a year that moves without public detail</a>. This question asks whether that should change — not whether anyone did anything wrong.</p>
</section>

<section>
<h2>Disclosures <span class="sub">— the platform holds itself to its own standard</span></h2>
<p class="src">This question was submitted by the platform's founder, who owns Ozark Cleaners — the platform's sponsor; the raw submission and the wording history are logged in the platform's public repository. That double relationship is disclosed here on purpose. Bright lines that apply to every question here: no candidate questions, no active-ballot-measure questions, no questions about named individuals' conduct.</p>
</section>`;

  return layout({
    title: `${draft.final_wording.slice(0, 60)}… — ${county.platform_name}`, current: '/issues', body, county,
    description: 'An open question for Clark County residents: should every government dollar be publicly traceable to the receipt?'
  });
}

module.exports = { issuesPage, issuePage, openIssues };
