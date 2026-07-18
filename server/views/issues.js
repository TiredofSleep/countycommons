const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const { tally, myVote } = require('../vote');

// The voice layer's front door, Tier 0 edition. The platform computes and
// cites; the question is the residents' to answer. No verdicts here either —
// just the ask, the context, the disclosure, and the count.

function openIssues(data) {
  return (data.issueDrafts.drafts || []).filter(d => d.status === 'open-tier0');
}

function issuesPage(data) {
  const { county } = data;
  const items = openIssues(data).map(d => {
    const t = tally(d.id);
    return `
<div class="issue" style="display:block">
  <b><a href="/issues/${esc(d.id)}">${esc(d.final_wording || d.neutral_framing)}</a></b>
  <p class="src">Opened ${esc(d.opened)} · ${t.below_floor ? `fewer than ${t.floor} responses so far` : `${t.total} responses`} · open sentiment (Tier 0)</p>
</div>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)}</div>
  <h1>Open questions</h1>
  <div class="src">Questions put to residents, answered by residents. This is the platform's quiet-launch sentiment poll: no account needed, one voice per browser, changeable until close. Counts here are open sentiment — the verification tiers that make results citable arrive with the full voting layer, and every count will always show its tier.</div>
</header>
${items || '<p class="src">No questions are open right now.</p>'}`;

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

<section>
<h2>The context <span class="sub">— why this question exists</span></h2>
<p>This platform traced every public dollar it could. Most of the trail is documented: the <a href="/">money trail</a> cross-foots to the dollar, and <a href="/audits">what the auditors reported</a> is quoted in full. But parts of the trail stop short of a receipt: <a href="/line/edccc">$1.84M/year in economic development incentives</a> with no public recipient list, <a href="/vendors">commodity purchases no posted document names</a>, and <a href="/compare/spending">about $4M a year that moves without public detail</a>. This question asks whether that should change — not whether anyone did anything wrong.</p>
</section>

<section>
<h2>Disclosures <span class="sub">— the platform holds itself to its own standard</span></h2>
<p class="src">This question was submitted by the platform's founder, a Clark County business owner; the raw submission and the wording history are logged in the platform's public repository. The platform is funded by a local business; its operating costs will be published monthly. Bright lines that apply to every question here: no candidate questions, no active-ballot-measure questions, no questions about named individuals' conduct.</p>
</section>`;

  return layout({
    title: `${draft.final_wording.slice(0, 60)}… — ${county.platform_name}`, current: '/issues', body, county,
    description: 'An open question for Clark County residents: should every government dollar be publicly traceable to the receipt?'
  });
}

module.exports = { issuesPage, issuePage, openIssues };
