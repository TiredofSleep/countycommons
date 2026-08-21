const { esc } = require('../lib/corpus');

// The solutions layer, rendered under a topic question. A solution is a clear,
// concise, CITED proposal for how to move forward; everyone else clicks yes or
// no — no comment threads, no debate. Ideas rank by how many back them, net of
// the noes. The solution text and its sources are public; who voted is a private
// count. See server/solutions.js.

function citationList(cites) {
  if (!cites || !cites.length) return '';
  const one = c => c.url
    ? `<a href="${esc(c.url)}" rel="noopener nofollow">${esc(c.label || c.url)}</a>`
    : `<span>${esc(c.label)}</span>`;
  return `<div class="src" style="margin:6px 0 0"><b>Sources:</b> ${cites.map(one).join(' · ')}</div>`;
}

// One solution card: the proposal, its sources, the count, and the yes/no vote.
function solutionCard(s, myVote, qid) {
  const btn = (val, label, mark) => {
    const on = myVote === val;
    const good = val === 'yes';
    return `<button type="submit" name="value" value="${val}" style="font-family:var(--mono);font-size:13px;font-weight:600;padding:7px 13px;cursor:pointer;border:1.5px solid var(--ink);white-space:nowrap;background:${on ? 'var(--ink)' : 'var(--card)'};color:${on ? 'var(--paper)' : (good ? 'var(--sourced)' : 'var(--dead)')}">${mark} ${label}${on ? ' ✓' : ''}</button>`;
  };
  return `
<div class="issue" style="display:block">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline">
    <b style="font-size:16px">${esc(s.title)}</b>
    <span class="src" style="white-space:nowrap;font-variant-numeric:tabular-nums"><b style="color:var(--sourced)">▲ ${s.yes}</b> &nbsp; <b style="color:var(--dead)">▼ ${s.no}</b></span>
  </div>
  <p class="src" style="margin:6px 0 2px;white-space:pre-wrap">${esc(s.summary)}</p>
  ${citationList(s.citations)}
  <form method="POST" action="/issues/${esc(qid)}/solutions/${esc(s.id)}/vote" style="margin:10px 0 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    ${btn('yes', 'Yes', '▲')} ${btn('no', 'No', '▼')}
    <span class="src">${s.total} ${s.total === 1 ? 'vote' : 'votes'}${myVote ? ` · you voted <b>${esc(myVote.toUpperCase())}</b> — change it anytime` : ' · yes or no, no comment needed'}</span>
  </form>
</div>`;
}

// The whole section, dropped into a question page. opts: { myVotes, filed,
// blocked, error }. `qid` is the question id the solutions hang from.
function solutionsSection(county, qid, solutions, opts) {
  const o = opts || {};
  const myVotes = o.myVotes || {};
  const list = solutions.length
    ? solutions.map(s => solutionCard(s, myVotes[s.id], qid)).join('')
    : `<p class="src">No solutions filed yet. Be the first — bring a clear, cited proposal for how to move forward.</p>`;

  const flash = o.filed
    ? `<div class="issue" style="display:block;border-color:var(--sourced);background:var(--sourced-bg)"><b>Filed.</b> <span class="src">Your solution is on the board below, with its sources. Neighbors can now weigh it yes or no.</span></div>`
    : o.error === 'uncited'
    ? `<div class="issue" style="display:block;border-color:var(--dead)"><b style="color:var(--dead)">A solution needs at least one source.</b> <span class="src">Add a link or a plain reference — a document, a record, a study. Cited is the whole point.</span></div>`
    : o.blocked
    ? `<div class="issue" style="display:block;border-color:var(--dead)"><b style="color:var(--dead)">That can't be filed as written.</b> <span class="src">A charter bright line was matched (${esc(o.blocked)}). Propose about the policy or the dollars, not a candidate, a ballot measure, or a named person.</span></div>`
    : '';

  return `
<section id="solutions">
<h2>Proposed solutions <span class="sub">— cited, and voted yes or no</span></h2>
<p class="src" style="max-width:66ch">This is where the question turns into proposals. Anyone can file a clear, concise <b>solution moving forward</b> — backed by documents, research, or a worked-out idea, <b>with its sources</b>. Everyone else clicks yes or no. No comment threads: ideas rise on their sources and their count, not on who argues loudest.</p>
${flash}
${list}

<details id="file" style="border:1.5px dashed var(--ink);padding:12px 14px;margin:14px 0 0;max-width:640px"${o.filed || o.error || o.blocked ? ' open' : ''}>
<summary style="cursor:pointer;font-family:var(--mono);font-size:13.5px;font-weight:600">File a solution — clear, concise, cited</summary>
<form method="POST" action="/issues/${esc(qid)}/solutions" style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
  <label class="src" for="s-title">In a line, what's the solution?</label>
  <input id="s-title" name="title" required maxlength="160" placeholder="e.g. Pay procurement from line-attributed accounts, so the check register publishes itself"
    style="font-size:15px;padding:8px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink)">
  <label class="src" for="s-summary">The proposal — clear and concise <span style="opacity:.7">(what to do, and why it works)</span></label>
  <textarea id="s-summary" name="summary" required maxlength="1200" rows="5" placeholder="State it plainly. What changes, who does it, and what it produces."
    style="font-size:15px;padding:8px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink)"></textarea>
  <label class="src" for="s-cites">Your sources — one per line <span style="opacity:.7">(a link, or a plain reference to a document, record, or study — at least one)</span></label>
  <textarea id="s-cites" name="citations" required rows="3" placeholder="https://... a report or record&#10;GSA SmartPay FY2025 statistics&#10;Ohio Checkbook — item-level state spending"
    style="font-size:14px;padding:8px;border:1.5px solid var(--rule);background:var(--card);color:var(--ink);font-family:var(--mono)"></textarea>
  <button type="submit" style="font-family:var(--mono);font-size:13px;padding:9px 16px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer;align-self:flex-start">File the solution</button>
</form>
<p class="src" style="margin:8px 0 0">Filed solutions are public and screened against the <a href="/never">bright lines</a>. Your name isn't attached — it stands on its sources.</p>
</details>
</section>`;
}

module.exports = { solutionsSection };
