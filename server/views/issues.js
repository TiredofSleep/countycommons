const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const { tally, myVote } = require('../vote');

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
  <p class="src">Opened ${esc(d.opened)} · ${t.below_floor ? `fewer than ${t.floor} responses so far` : `${t.total} responses`} · open sentiment (Tier 0) · <a href="/issues/${esc(d.id)}#share">share it</a></p>
</div>`;
  }).join('');

  const queued = queueCount();
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)}</div>
  <h1>Open questions</h1>
  <div class="src">Questions put to residents, answered by residents. No account needed, one voice per browser, changeable until close. Counts are open sentiment — the verification tiers that make results citable arrive with the full voting layer, and every count will always show its tier.</div>
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

function issuePage(data, draft, participant, justVoted) {
  const { county } = data;
  const t = tally(draft.id);
  const mine = participant ? myVote(participant, draft.id) : null;

  const results = t.below_floor
    ? `<p class="src">Fewer than ${t.floor} responses so far. Exact counts display once ${t.floor} is reached — the same small-town privacy floor every result on this platform will use.</p>`
    : `<table class="plain"><thead><tr><th>Answer</th><th>Count</th></tr></thead><tbody>
<tr><td>Yes</td><td class="num">${t.counts.yes}</td></tr>
<tr><td>No</td><td class="num">${t.counts.no}</td></tr>
<tr><td>Skip</td><td class="num">${t.counts.skip}</td></tr>
</tbody></table>
<p class="src">${t.total} total · all Tier 0 (open sentiment) · all via web</p>`;

  const btn = (v, label) => `<button type="submit" name="value" value="${v}"
    style="font-family:var(--mono);font-size:14px;padding:10px 22px;cursor:pointer;border:2px solid var(--ink);
    background:${mine && mine.value === v ? 'var(--ink)' : 'var(--card)'};color:${mine && mine.value === v ? 'var(--paper)' : 'var(--ink)'}">${label}</button>`;

  const body = `
<div class="crumb"><a href="/issues">Open questions</a></div>
<header class="page">
  <div class="eyebrow">${esc(county.name)} · open question · Tier 0 sentiment · opened ${esc(draft.opened)}</div>
  <h1 style="font-size:clamp(18px,3.5vw,26px)">${esc(draft.final_wording)}</h1>
  ${justVoted ? `<p class="src" style="color:var(--sourced)"><b>Got it — you answered ${esc(justVoted.toUpperCase())}.</b> You can change your answer any time until the question closes.</p>` : ''}
</header>

<section>
<h2>Answer <span class="sub">— no account needed; one voice per browser; changeable until close</span></h2>
<form method="POST" action="/issues/${esc(draft.id)}/vote" style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0">
  ${btn('yes', 'YES')} ${btn('no', 'NO')} ${btn('skip', 'SKIP')}
</form>
${mine && !justVoted ? `<p class="src">Your current answer: <b>${esc(mine.value.toUpperCase())}</b>.</p>` : ''}
</section>

<section>
<h2>The count so far <span class="sub">— aggregate only, always</span></h2>
${results}
<p class="src">Tier 0 means open sentiment: it shows how visitors lean, and it is never cited as verified resident opinion. Phone, residency, and voter verification tiers arrive with the full voting layer — and results will always display every tier's count separately.</p>
</section>

<section id="share">
<h2>Share it <span class="sub">— a question travels farther than a website</span></h2>
<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
  <img src="/issues/${esc(draft.id)}/qr.svg" alt="QR code linking to this question" width="140" height="140" style="border:1.5px solid var(--ink);background:#fff;padding:6px;flex:none">
  <div style="flex:1;min-width:220px">
    <p style="margin-top:0">Point a phone camera at the code, or copy the link. Print it, tape it to the counter, put it in the church bulletin — the question works anywhere a neighbor can scan or tap.</p>
    <p class="src">The traction rule: at 100 responses, the result gets printed and hand-delivered to the relevant body, and the delivery is stamped on the <a href="/docket">docket</a>. ${t.below_floor ? `This question is at fewer than ${t.floor} — every share moves it.` : `${t.total} of 100 and counting.`}</p>
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
