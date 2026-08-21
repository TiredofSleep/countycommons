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

// The level a question speaks to, and the body it signals. Base/overlay
// (host) questions carry no scope → they're local to the county.
function titleCaseSlug(s) {
  return String(s || '').split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function scopeBadge(q, county) {
  if (q.scope === 'national') return '<span class="chip c-ok">National</span>';
  if (q.scope === 'state') return `<span class="chip c-part">State · ${esc(q.state || county.state)}</span>`;
  if (q.scope === 'city') return `<span class="chip c-part">City · ${esc(titleCaseSlug(q.city))}</span>`;
  return `<span class="chip">Local · ${esc(county.name)}</span>`;
}
function scopeBody(scope, county, q) {
  if (scope === 'national') return 'the U.S. Congress';
  if (scope === 'state') return `the ${esc(county.state)} Legislature`;
  if (scope === 'city') return `${esc(titleCaseSlug(q && q.city))} — its city council or town meeting`;
  return 'your county — the quorum court, city board, or school board';
}

function issuesPage(data, opts) {
  opts = opts || {};
  const { county } = data;
  const { funnelLevels, levelThreshold, levelFunnel } = require('./priorities');
  const { PROMOTE_AT, levelOf } = require('../questions');
  const { levels, hasCountyGov } = funnelLevels(county, opts.places);
  const defaultLevel = hasCountyGov ? 'county' : ((levels.find(l => l.kind === 'city' || l.kind === 'town') || {}).id || 'state');
  const current = levels.find(l => l.id === opts.level) || levels.find(l => l.id === defaultLevel) || levels[0];
  const threshold = levelThreshold(current, county);
  const isLocal = current.kind === 'county' || current.kind === 'city' || current.kind === 'town';

  // Only this level's questions — its own board, its own count. Base/overlay
  // drafts have no scope, so levelOf() reads them as the county level.
  const atLevel = q => levelOf(q) === current.id;

  const items = openIssues(data).filter(atLevel).map(d => {
    const t = tally(d.id);
    return `
<div class="issue" style="display:block">
  <b><a href="/issues/${esc(d.id)}">${esc(d.final_wording || d.neutral_framing)}</a></b>
  <p class="src">Opened ${esc(d.opened)} · ${t.total} response${t.total === 1 ? '' : 's'} · open sentiment (Tier 0) · <a href="/issues/${esc(d.id)}#share">share it</a></p>
</div>`;
  }).join('');

  const proposals = (data.proposals || []).filter(atLevel).slice().sort((a, b) => (b.supporters || []).length - (a.supporters || []).length);
  const propItems = proposals.map(p => {
    const n = (p.supporters || []).length;
    return `
<div class="issue" style="display:block">
  <b>${esc(p.final_wording)}</b>
  <p class="src">${n} of ${PROMOTE_AT} supporters — ${PROMOTE_AT - n > 0 ? `${PROMOTE_AT - n} more puts it to a live vote` : 'ready to open'}. Signals <b>${esc(current.body)}</b>.</p>
  <form method="POST" action="/issues/${esc(p.id)}/support" style="margin:6px 0 0"><input type="hidden" name="level" value="${esc(current.id)}"><button type="submit" class="chip c-ok" style="cursor:pointer;border:1.5px solid var(--sourced);background:var(--sourced-bg)">Support this →</button></form>
</div>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)}</div>
  <h1>Open questions — at every level</h1>
  <div class="src"><b>The counting room — where what residents want becomes a number with receipts.</b> There's a question board for every level of government, from your town up to the nation. Each one is advisory signal carried to the body that decides — and it informs the government we have; it never replaces it. No account needed, one voice per sitting, changeable while your window stays open.</div>
</header>

<div id="board">${levelFunnel(levels, current.id, '')}</div>

<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <div class="eyebrow" style="color:var(--accent)">the <b>${esc(current.label)}</b> questions — their own count, their own votes</div>
  <p class="src" style="margin:4px 0 0">These are questions for what ${current.kind === 'national' ? 'the country' : current.kind === 'state' ? esc(county.state) : esc(current.label)} should do. Each is answered by ${isLocal ? 'people here' : 'people across the whole network'}, and at <b>${threshold}</b> responses the result is carried to <b>${esc(current.body)}</b>.${!isLocal ? ' National and state boards pool answers from every county on the platform.' : ''}</p>
</div>

${items || `<p class="src">No questions are open on the <b>${esc(current.label)}</b> board yet — ask the first one below.</p>`}

<section id="ask">
<h2>Ask a question <span class="sub">— on the ${esc(current.label)} board</span></h2>
${opts.asked ? `<p style="color:var(--sourced)"><b>Proposed ✓</b> — your question is up for support below. When it reaches ${PROMOTE_AT} supporters, it opens for a live vote.</p>` : ''}
${opts.blocked ? `<div class="issue" style="display:block;border-color:var(--dead)"><b style="color:var(--dead)">That question can't be asked.</b><p class="src" style="margin:6px 0 0">A charter bright line was matched (${esc(opts.blocked)}). County Commons never runs questions about candidates, active ballot measures, or a named person's conduct — those belong to elections and the courts. Ask about a policy or a dollar, not a person or a race.</p></div>` : ''}
<p>Ask it in your own words. It's checked against the <a href="/never">bright lines</a>, then goes up for support; at ${PROMOTE_AT} supporters it opens for the whole level to answer.</p>
<form method="POST" action="/issues/ask" style="display:flex;flex-direction:column;gap:8px;max-width:60ch">
  <input type="hidden" name="level" value="${esc(current.id)}">
  <p class="src" style="margin:0;border-left:3px solid var(--accent);padding-left:10px">Asking on the <b>${esc(current.label)}</b> board — aimed at ${esc(current.body)}. ${levels.length > 1 ? `<a href="#board">Switch level above.</a>` : ''}</p>
  <textarea name="wording" required maxlength="300" rows="3" placeholder="Should every government dollar be publicly traceable to the receipt?"
    style="font-family:var(--sans);font-size:14px;padding:10px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink)"></textarea>
  <textarea name="context" maxlength="600" rows="2" placeholder="Context (optional) — why it matters. No verdicts."
    style="font-family:var(--sans);font-size:13px;padding:8px;border:1.5px solid var(--rule);background:var(--card);color:var(--ink)"></textarea>
  <button type="submit" style="font-family:var(--mono);font-size:13px;padding:10px 18px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer;align-self:flex-start">Propose the question</button>
</form>
</section>

${proposals.length ? `<section id="proposed">
<h2>Proposed on this board — support to put them to a vote <span class="sub">— ${proposals.length}</span></h2>
${propItems}
</section>` : ''}

<section>
<h2>The traction rule <span class="sub">— what enough responses guarantees</span></h2>
<p>Borrowed from the UK Parliament's petition site, where a signature count obligates a government response: <b>when a live question reaches its threshold of responses, we print the result packet and hand-deliver it to the body that decides</b> — for a city question the city council or town meeting, for a county question the ${esc(hasCountyGov ? govBodyName(county) : 'county board')}, for a state question the ${esc(county.state)} legislative delegation, for a national one the district's members of Congress — and stamp the delivery publicly. The threshold is sized to the level, the way real petitions are: a share of the electorate there. Officials aren't obligated to act. They are guaranteed to receive — and what they do next becomes part of the record either way.</p>
</section>`;

  return layout({ title: `Open questions — ${county.platform_name}`, current: '/issues', body, county });
}

function govBodyName(county) {
  const j = (county.jurisdictions || []).find(x => x.kind === 'county') || (county.jurisdictions || [])[0];
  return (j && j.governing_body) || 'the county governing body';
}

function issuePage(data, draft, participant, justVoted, registeredFields = [], justRegistered = false, signState = null, places = null) {
  const { county } = data;
  // Size the delivery threshold to the question's own funnel level — a city
  // question to that city, a state question to the state, and so on.
  const { funnelLevels, levelThreshold } = require('./priorities');
  const { levelOf } = require('../questions');
  const _lvl = funnelLevels(county, places).levels.find(l => l.id === levelOf(draft));
  const threshold = _lvl ? levelThreshold(_lvl, county) : require('../lib/threshold').deliveryThreshold(county);
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

  const bigBtn = (v, label) => `<button type="submit" name="value" value="${v}"
    style="font-family:var(--mono);font-size:clamp(17px,3.4vw,22px);font-weight:600;padding:18px 10px;cursor:pointer;border:2px solid var(--ink);flex:1;min-width:90px;
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
  <p style="margin:6px 0 0">${scopeBadge(draft, county)} <span class="src">— advisory signal to ${scopeBody(draft.scope, county, draft)}.</span></p>
  ${justVoted ? `<div class="stamp" style="position:static;display:inline-block;transform:none;margin-top:10px">Counted ✓ — you answered ${esc(justVoted.toUpperCase())}</div>` : ''}
</header>

${(draft.requested_documents && draft.requested_documents.length) ? `
<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <div class="eyebrow" style="color:var(--accent)">what a “yes” would put on the record</div>
  <p class="src" style="margin:4px 0 8px">This isn't an abstract question. A yes means the county requires these specific things it doesn't show today — each a real gap you can see on the money trail:</p>
  ${draft.requested_documents.map(rd => `<div style="margin:6px 0"><b>${esc(rd.title)}</b>${rd.node ? ` — <a href="/line/${esc(rd.node)}">see it on the money trail</a>` : ''}<p class="src" style="margin:2px 0 0">${esc(rd.why)}</p></div>`).join('')}
  <p class="src" style="margin:8px 0 0">The more of these the county shows, the stronger every vote here becomes — you're not asking for a feeling, you're asking for these documents.</p>
</div>` : ''}

<section>
<h2>Your answer <span class="sub">— fifteen seconds, no account, nothing asked</span> ${rulesButton()}</h2>
${registeredFields.length ? `<p class="src" style="color:var(--sourced)"><b>You're on the record ✓</b> — on file (never published): <b>${registeredFields.map(esc).join(', ')}</b>. Your answer counts as a registered voice.</p>` : ''}
<form method="POST" action="/issues/${esc(draft.id)}/vote" style="margin:12px 0;max-width:520px">
  <div style="display:flex;gap:10px;flex-wrap:wrap">${bigBtn('yes', 'YES')} ${bigBtn('no', 'NO')} ${bigBtn('skip', 'SKIP')}</div>
</form>
${mine ? `<p class="src">Your current answer: <b>${esc(mine.value.toUpperCase())}</b> — change it anytime; your last answer counts.</p>` : `<p class="src">Tap an answer. No account, nothing asked — change it anytime while your window is open.</p>`}
${rulesDialog(county)}
</section>

<section>
<h2>The count so far <span class="sub">— aggregate only, always</span></h2>
${results}
<div style="max-width:520px;margin:6px 0 10px">${require('./priorities').progressBar(t.total, threshold, 'the body that decides')}</div>
<p class="src" style="margin:0">Every answer moves this bar in real time — including yours. At <b>${threshold}</b>, the result is printed and hand-delivered.</p>${justVoted ? '<p class="src" style="color:var(--sourced);margin:4px 0 0"><b>Your vote is in the count above.</b></p>' : ''}
<p class="src">Tier 0 means open sentiment: it shows how visitors lean, and it is never cited as verified resident opinion. Phone, residency, and voter verification tiers arrive with the full voting layer — and results will always display every tier's count separately.</p>
<p class="src">These counts are unofficial: gathered by an independent community platform, not by any government. This is not an election, a referendum, or a legal petition — its only weight is that the counting is published and checkable.</p>
<p class="src"><b>Plainly:</b> because a Tier 0 answer takes no verification, a determined person can pad this number — that is exactly the weakness the verification tiers (phone, residency, voter-file) are built to close. Until then, treat these as open sentiment, never proof, and weigh the public signatures — real names, by choice — more heavily than the raw count.</p>
</section>

<section id="register">
<h2>Make it count for more <span class="sub">— optional, always</span></h2>
<p style="max-width:60ch">Your answer is <b>already counted</b>, anonymously. If you want it to weigh more, tell us who's answering — and, if you like, put your name on it like a petition. All optional.</p>
${mine ? `
<form method="POST" action="/issues/${esc(draft.id)}/vote" style="border:1.5px solid var(--ink);background:var(--card);padding:12px 14px;max-width:580px;margin:10px 0">
  <input type="hidden" name="value" value="${esc(mine.value)}">
  <div style="font-family:var(--mono);font-size:13px;font-weight:600;margin-bottom:8px">Are you a ${esc(county.name)} resident? <span class="src" style="font-weight:400">(self-reported, not verified)</span></div>
  <div style="display:flex;flex-direction:column;gap:6px">${connRadios}</div>
  <button type="submit" style="margin-top:10px;font-family:var(--mono);font-size:13px;padding:8px 16px;background:var(--card);color:var(--ink);border:1.5px solid var(--ink);cursor:pointer">Save who's answering</button>
</form>` : `<p class="src">Answer the question above first — then this opens up.</p>`}
<details id="registerbox" class="envelope" style="border:1.5px dashed var(--ink);padding:10px 14px;max-width:580px"${justVoted || justRegistered || signState === 'ok' ? ' open' : ''}>
  <summary style="cursor:pointer;font-family:var(--mono);font-size:13px;font-weight:600">${registeredFields.length ? "You're on the record ✓ — open to update or sign" : 'Put your name on it — optional, petition-style'}</summary>
  <p class="src" style="margin:10px 0 0">A registered answer is the kind an official can't wave off. Every field is optional — leave what you like.</p>
  ${registrationForm({ county, action: `/issues/${esc(draft.id)}/register`, registeredFields, justRegistered, announce: { show: true, checked: !!mySig } })}
</details>
</section>

<section id="sign">
<h2>Signed publicly <span class="sub">— the loud version: optional, always</span></h2>
<p class="src" style="max-width:60ch">The count above is anonymous and stays that way. Signing is the separate, louder act — your name and your answer, on the page, like a petition on a counter. ${mine ? '' : 'Answer the question first, then sign it if you want to be heard by name.'}</p>
${signState === 'ok' ? `<p class="src" style="color:var(--sourced)"><b>Announced ✓</b> — your name is on the page below. Uncheck the announce box any time to take it down.</p>` : ''}
${signState === 'removed' ? `<p class="src" style="color:var(--sourced)"><b>Announcement taken down</b> — your name is off the page. The withdrawal is on the public log, without the name.</p>` : ''}
${signState === 'novote' ? `<p class="src" style="color:var(--dead)"><b>Answer first</b> — an announcement announces your answer, and you haven't cast one this sitting. Vote above, then check the box again.</p>` : ''}
${signState === 'noname' ? `<p class="src" style="color:var(--dead)"><b>An announcement needs a name</b> — add at least a name in the envelope above, keep the box checked, and register again.</p>` : ''}
${mine ? `<p class="src" style="max-width:60ch">To put your name here, check <b>Announce me publicly</b> in the envelope above — registering and announcing are one motion.</p>` : ''}
${sigs.length ? (() => {
  const sigLine = s => `<p style="margin:4px 0;font-size:14px"><b>${esc(s.name)}</b>${s.city ? `, ${esc(s.city)}` : ''} — <span style="font-family:var(--mono);font-weight:600">${esc((s.value || '').toUpperCase())}</span> <span class="src">${esc(String(s.ts).slice(0, 10))}</span></p>`;
  return `
<div style="margin-top:14px;border:1.5px solid var(--ink);background:var(--card);padding:12px 14px;max-width:580px">
  <div class="eyebrow" style="margin-bottom:6px">${sigs.length} public signature${sigs.length === 1 ? '' : 's'} · self-signed, unverified</div>
  ${sigs.slice(0, 10).map(sigLine).join('')}
  ${sigs.length > 10 ? `
  <details style="margin-top:8px">
    <summary class="src" style="cursor:pointer;font-family:var(--mono)"><b>Show all ${sigs.length} signatures</b> — ${sigs.length - 10} more</summary>
    ${sigs.slice(10).map(sigLine).join('')}
  </details>` : ''}
</div>`;
})() : ''}
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
    <p class="src">The traction rule: at ${threshold} responses, the result gets printed and hand-delivered to the relevant body, and the delivery is stamped on the <a href="/docket">docket</a>. ${t.total} of ${threshold} and counting — every share moves it.</p>
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
