const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const { COPY_SLOTS, PLACEHOLDERS } = require('../lib/copyslots');

// The county admin — where a local host runs their own county. Guarded by
// requireAdmin (an 8-char host code for THIS county). Every save is scoped to
// this tenant's overlay and logged to the public chain by name. This is the
// first slice (calendar / community events); new capabilities follow the same
// pattern per docs/COUNTY-CODE.md.

function shell(county, title, body) {
  return layout({
    title: `${title} — ${county.platform_name} admin`,
    current: '/admin', county,
    body: `<div class="crumb"><a href="/admin">County admin</a> · <a href="/">view the site</a></div>${body}`,
    description: 'County Commons host admin.'
  });
}

// The frame that never moves, shown to every host: this is participation that
// feeds the elected republic, not a parallel government. A county question is
// advisory signal carried to the body that decides — it informs elected
// officials; it does not replace them or bind them.
function republicFrame() {
  return `<div style="border-left:3px solid var(--accent);background:var(--card);padding:10px 14px;margin:0 0 14px;max-width:680px">
  <div class="eyebrow" style="color:var(--accent)">the frame — it doesn't change</div>
  <p style="font-size:13.5px;margin:4px 0 0">Direct participation here works <b>alongside the republic, not instead of it</b>. A question gathers residents' voice and carries it to the body that decides — the quorum court, the city board, the school board. Officials are guaranteed to <i>receive</i> a result; they are never bound by it. That's the whole design: sharper signal into the government we already have, never a replacement for it.</p>
</div>`;
}

function adminDashboard(data, hostName) {
  const { county } = data;
  const tile = (href, name, desc, ready) => `
<a href="${ready ? href : '#'}" style="text-decoration:none;color:var(--ink);flex:1;min-width:220px;border:2px solid var(--ink);background:var(--card);padding:16px;display:block;${ready ? '' : 'opacity:.5;pointer-events:none'}">
  <div style="font-family:var(--mono);font-weight:600;font-size:15px">${esc(name)}</div>
  <p style="font-size:13px;color:var(--ink-soft);margin:6px 0 0">${esc(desc)}</p>
  ${ready ? '<span class="chip c-ok" style="margin-top:8px;display:inline-block">Edit →</span>' : '<span class="chip" style="margin-top:8px;display:inline-block">Soon</span>'}
</a>`;
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)} · host admin</div>
  <h1>Your county</h1>
  <div class="src">You're signed in as a host of ${esc(county.name)}${hostName ? `, ${esc(hostName)}` : ''}. You can shape your county's content here — every change is scoped to your county and stamped in the public record by name. The shared frame (how money is cited, how votes are counted, the privacy rules) stays fixed for everyone.</div>
</header>
${republicFrame()}
<section>
<h2>What you can edit</h2>
<div style="display:flex;gap:10px;flex-wrap:wrap">
  ${tile('/admin/questions', 'Questions', 'Open and close the questions residents vote on. Advisory signal to the body that decides.', true)}
  ${tile('/admin/priorities', 'Community priorities', 'Review what residents posted to prioritize, and remove anything that shouldn\'t be here.', true)}
  ${tile('/admin/calendar', 'Calendar & community events', 'Add local events, edit the calendar intro. Meeting times come from the sourced record.', true)}
  ${tile('/admin/help', 'Help Finder', 'Add local assistance listings — food, rent, utilities, benefits.', true)}
  ${tile('/admin/copy', 'Page copy', 'Reword your county headline and front-page lines. The disclaimers and the frame stay fixed.', true)}
</div>
<p class="src" style="margin-top:12px">More capabilities are being added — each follows the same pattern (see the ground rules). Tell us what your county needs next.</p>
</section>
<section>
<h2>House rules <span class="sub">— the frame everyone builds inside</span></h2>
<p class="src">Your edits live in your county's own space and never touch another county. What you can't change — because it protects everyone — is how numbers are cited to their source, how votes are counted and kept private, and the charter lines (no candidates, no ballot measures, no questions about a named person's conduct). Every save here is logged publicly by your name.</p>
</section>`;
  return shell(county, 'Your county', body);
}

function adminCalendar(data, opts = {}) {
  const { county, calendar } = data;
  const listings = (calendar && calendar.community && calendar.community.listings) || [];
  const intro = (calendar && calendar.intro) || '';
  const field = 'font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);width:100%;box-sizing:border-box';

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)} · host admin · calendar</div>
  <h1>Calendar &amp; community events</h1>
  <div class="src">Add local events neighbors are doing together, and edit the calendar's opening line. Meeting times for the quorum court and city board come from the sourced record and aren't edited here.</div>
</header>
${opts.saved ? `<p class="src" style="color:var(--sourced)"><b>Saved ✓</b> — live on your county's <a href="/calendar">calendar</a> now.</p>` : ''}

<section>
<h2>Calendar intro</h2>
<form method="POST" action="/admin/calendar/intro" style="max-width:640px">
  <textarea name="intro" rows="3" maxlength="600" style="${field}">${esc(intro)}</textarea>
  <button type="submit" style="margin-top:8px;font-family:var(--mono);font-size:13px;padding:8px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer">Save intro</button>
</form>
</section>

<section>
<h2>Community events <span class="sub">— ${listings.length} listed</span></h2>
${listings.length ? listings.map((e, i) => `
<div class="issue" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
  <div><b>${esc(e.name || '')}</b>${e.date ? ` · <span class="src">${esc(e.date)}</span>` : ''}${e.place ? `<br><span class="src">${esc(e.place)}</span>` : ''}${e.note ? `<p class="src" style="margin:4px 0 0">${esc(e.note)}</p>` : ''}</div>
  <form method="POST" action="/admin/calendar/event/remove" style="flex:none"><input type="hidden" name="index" value="${i}"><button type="submit" style="font-family:var(--mono);font-size:12px;padding:6px 10px;border:1.5px solid var(--dead);color:var(--dead);background:var(--card);cursor:pointer">Remove</button></form>
</div>`).join('') : '<p class="src">No community events yet. Add the first one below.</p>'}
</section>

<section>
<h2>Add an event</h2>
<form method="POST" action="/admin/calendar/event/add" style="max-width:640px;display:flex;flex-direction:column;gap:10px">
  <label style="font-size:13.5px">Name<input name="name" required maxlength="120" placeholder="Fall recycling drive" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Date &amp; time<input name="date" maxlength="80" placeholder="Saturday, Oct 18, 9am–1pm" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Place<input name="place" maxlength="120" placeholder="Feaster Park, Arkadelphia" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Note <span class="src">(optional)</span><input name="note" maxlength="240" placeholder="Bring cardboard and electronics." style="${field};margin-top:4px"></label>
  <button type="submit" style="font-family:var(--mono);font-size:13px;padding:9px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer;align-self:flex-start">Add event</button>
</form>
<p class="src" style="margin-top:10px">Listings are free and stay free. Every add or remove is stamped in the public record by your name.</p>
</section>`;
  return shell(county, 'Calendar', body);
}

// One moderation row: wording, status, and the actions allowed by status.
// actionBase is '/admin/questions/resident' (host) or '/owner/questions' (owner).
function modRow(q, actionBase, promoteAt, extraBadge) {
  const btn = (action, label, danger) => `<form method="POST" action="${actionBase}/${action}" style="display:inline;margin-left:6px"><input type="hidden" name="id" value="${esc(q.id)}"><button type="submit" style="font-family:var(--mono);font-size:12px;padding:5px 10px;border:1.5px solid ${danger ? 'var(--dead)' : 'var(--ink)'};color:${danger ? 'var(--dead)' : 'var(--ink)'};background:var(--card);cursor:pointer">${label}</button></form>`;
  const n = (q.supporters || []).length;
  const state = q.status === 'proposed'
    ? `<span class="chip c-part">proposed</span> ${n}/${promoteAt} supporters`
    : (q.status === 'open-tier0' ? '<span class="chip c-ok">live</span>' : '<span class="chip">closed</span>');
  const actions = q.status === 'proposed' ? btn('open', 'Open now') + btn('remove', 'Remove', true)
    : (q.status === 'open-tier0' ? btn('close', 'Close') + btn('remove', 'Remove', true)
    : btn('remove', 'Remove', true));
  return `
<div class="issue" style="display:block">
  <b>${esc(q.final_wording)}</b> ${extraBadge || ''}
  <p class="src" style="margin:4px 0 6px">${state}${q.status === 'open-tier0' ? ` · <a href="/issues/${esc(q.id)}">view</a>` : ''}</p>
  <div>${actions}</div>
</div>`;
}

function adminQuestions(data, hostQuestions, residentQuestions, opts = {}) {
  const { county } = data;
  const { PROMOTE_AT } = require('../questions');
  residentQuestions = residentQuestions || [];
  const field = 'font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);width:100%;box-sizing:border-box';
  const open = hostQuestions.filter(q => q.status === 'open-tier0');
  const closed = hostQuestions.filter(q => q.status !== 'open-tier0');
  const resSection = `
<section>
<h2>Questions your residents asked <span class="sub">— ${residentQuestions.length} local</span></h2>
<p class="src" style="max-width:64ch">Residents propose county questions; at ${PROMOTE_AT} supporters they open on their own. You can open one early, close a live one, or remove one that shouldn't be here. Candidate, ballot-measure, and named-conduct questions are already refused automatically. State and national questions are moderated by the platform owner, not here.</p>
${residentQuestions.length ? residentQuestions.map(q => modRow(q, '/admin/questions/resident', PROMOTE_AT)).join('') : '<p class="src">No resident-asked questions in your county yet.</p>'}
</section>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)} · host admin · questions</div>
  <h1>Questions</h1>
  <div class="src">Open a yes/no question for your county's residents, and close it when it's run its course. Every question travels through the same counting room and the same rules as ours.</div>
</header>
${republicFrame()}
${opts.opened ? `<p class="src" style="color:var(--sourced)"><b>Question opened ✓</b> — live on <a href="/issues">Open questions</a> now.</p>` : ''}
${opts.closed ? `<p class="src" style="color:var(--sourced)"><b>Question closed.</b></p>` : ''}
${opts.blocked ? `<div class="issue" style="display:block;border-color:var(--dead)"><b style="color:var(--dead)">That question can't be opened.</b><p class="src" style="margin:6px 0 0">A charter bright line was matched (${esc(opts.blocked)}). County Commons never runs questions about candidates, active ballot measures, or a named person's conduct — those belong to elections and the courts, not to an advisory poll. Reword it to ask about a policy or a dollar, not a person or a race.</p></div>` : ''}
${opts.moderated ? `<p class="src" style="color:var(--sourced)"><b>Done ✓</b> — the resident question was ${esc(opts.moderated)}.</p>` : ''}
${resSection}

<section>
<h2>Questions you opened <span class="sub">— ${open.length}</span></h2>
${open.length ? open.map(q => `
<div class="issue" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
  <div><b>${esc(q.final_wording)}</b><p class="src" style="margin:4px 0 0">opened ${esc(q.opened)} · <a href="/issues/${esc(q.id)}">view</a></p></div>
  <form method="POST" action="/admin/questions/close" style="flex:none"><input type="hidden" name="id" value="${esc(q.id)}"><button type="submit" style="font-family:var(--mono);font-size:12px;padding:6px 10px;border:1.5px solid var(--ink);color:var(--ink);background:var(--card);cursor:pointer">Close</button></form>
</div>`).join('') : '<p class="src">No questions open from the host yet.</p>'}
</section>

<section>
<h2>Open a new question</h2>
<form method="POST" action="/admin/questions/open" style="max-width:660px;display:flex;flex-direction:column;gap:10px">
  <label style="font-size:13.5px">The question <span class="src">— phrase it as a yes/no about a policy or a dollar</span>
    <textarea name="wording" required rows="3" maxlength="300" placeholder="Should the county publish the check register online every month?" style="${field};margin-top:4px"></textarea>
  </label>
  <label style="font-size:13.5px">Context <span class="src">(optional — why it's being asked; no verdicts)</span>
    <textarea name="context" rows="2" maxlength="600" style="${field};margin-top:4px"></textarea>
  </label>
  <button type="submit" style="font-family:var(--mono);font-size:13px;padding:9px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer;align-self:flex-start">Open the question</button>
</form>
<p class="src" style="margin-top:10px;max-width:64ch">Every question you open carries the same standing terms as ours, automatically: anonymous Tier-0 sentiment, one voice per sitting, results labeled unverified until the verification tiers, and — at ${require('../lib/threshold').deliveryThreshold(county)} responses — the result printed and hand-delivered to the body that decides, stamped in public. You can't turn those off; they're what make a number trustworthy.</p>
</section>
${closed.length ? `<section><h2>Closed <span class="sub">— ${closed.length}</span></h2>${closed.map(q => `<p class="src"><b>${esc(q.final_wording)}</b> — closed</p>`).join('')}</section>` : ''}`;
  return shell(county, 'Questions', body);
}

// Community-priorities control surface for the host: moderate (remove),
// record the accountability trail (delivered → answered → acted, cited), and —
// when a priority reaches the delivery threshold — a one-click prepared notice
// to the officials. Bright-line screening already refuses candidates, ballot
// measures, and named officials at the door; this is everything after.
function adminPriorities(data, items, opts = {}) {
  const { county } = data;
  const { PHASE } = require('./priorities');
  const threshold = require('../lib/threshold').deliveryThreshold(county);
  const officials = (county.officials || []).filter(o => o.email).map(o => o.email);
  const KIND = { prioritize: ['Prioritize', 'c-ok'], reconsider: ['Take a fresh look', 'c-amb'] };
  const field = 'font-family:var(--mono);font-size:13px;padding:7px 9px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);width:100%;box-sizing:border-box';
  const smallBtn = (color) => `font-family:var(--mono);font-size:12px;padding:5px 10px;border:1.5px solid ${color};color:${color};background:var(--card);cursor:pointer`;

  const stageOpts = [['delivered', 'Carried to the county'], ['answered', 'Answered by an official / the body'], ['acted', 'Acted on — something happened']]
    .map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('');

  const trail = (p) => (p.timeline && p.timeline.length)
    ? `<div style="border-left:2px solid var(--rule);padding-left:10px;margin:6px 0">${p.timeline.map(ev =>
        `<p class="src" style="margin:3px 0"><b>${esc(ev.at || '')} · ${esc((PHASE[ev.stage] || {}).label || ev.stage)}</b>${ev.note ? ' — ' + esc(ev.note) : ''}${ev.source ? (ev.source.url ? ` <a href="${esc(ev.source.url)}" rel="noopener">source</a>` : ` (source: ${esc(ev.source.label)})`) : ''}</p>`).join('')}</div>`
    : '';

  const row = (p) => {
    const k = KIND[p.kind] || KIND.prioritize;
    const ph = PHASE[p.phase] || PHASE.raised;
    const ready = threshold && p.phase === 'raised' && p.support >= threshold;
    const body = `${p.title}\n\n${p.why}\n\nBacked by ${p.support} residents of ${county.name} via ${county.platform_name}. This is an advisory signal from residents — not a binding vote. The county writes the budget; this is the community asking you to weigh it.`;
    const mailto = officials.length
      ? `mailto:${officials.join(',')}?subject=${encodeURIComponent('Community priority from ' + county.name + ' residents')}&body=${encodeURIComponent(body)}`
      : '';
    return `
<div class="issue" style="display:block${ready ? ';border-left:3px solid var(--sourced)' : ''}">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline">
    <b>${esc(p.title)}</b><span><span class="chip ${k[1]}">${esc(k[0])}</span> <span class="chip ${ph.cls}">${ph.mark} ${esc(ph.label)}</span></span>
  </div>
  <p class="src" style="margin:4px 0 6px">${esc(p.why)}</p>
  <p class="src" style="margin:0 0 4px"><b>${p.support}</b> backing${threshold ? (p.support >= threshold ? ' · <b style="color:var(--sourced)">threshold reached</b>' : ` · ${threshold - p.support} more to reach ${threshold}`) : ''} · <a href="/priorities">on the board</a></p>
  ${ready ? `<p class="src" style="color:var(--sourced);margin:4px 0"><b>Ready to carry to the county.</b> ${mailto ? `<a href="${mailto}">Open a prepared email to the officials →</a>, send it, then` : 'Notify the officials, then'} record it below as "Carried to the county."</p>` : ''}
  ${trail(p)}
  <details style="margin:8px 0 0"><summary style="cursor:pointer;font-size:13px;color:var(--accent)">Record what happened</summary>
    <form method="POST" action="/admin/priorities/outcome" style="margin-top:8px;display:flex;flex-direction:column;gap:8px;max-width:560px">
      <input type="hidden" name="id" value="${esc(p.id)}">
      <label class="src">Step<select name="stage" style="${field};margin-top:3px">${stageOpts}</select></label>
      <label class="src">Date<input name="at" type="date" style="${field};margin-top:3px"></label>
      <label class="src">What happened<input name="note" maxlength="400" required placeholder="e.g. Presented at the Sept 8 quorum court meeting" style="${field};margin-top:3px"></label>
      <label class="src">Source link — minutes, agenda, news (best)<input name="source_url" maxlength="300" placeholder="https://…" style="${field};margin-top:3px"></label>
      <label class="src">…or a plain source reference<input name="source_label" maxlength="120" placeholder="Sept 2026 quorum court minutes, p.4" style="${field};margin-top:3px"></label>
      <button type="submit" style="font-family:var(--mono);font-size:13px;padding:8px 14px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer;align-self:flex-start">Record it</button>
    </form>
    ${p.timeline && p.timeline.length ? `<form method="POST" action="/admin/priorities/outcome/undo" style="margin-top:6px"><input type="hidden" name="id" value="${esc(p.id)}"><button type="submit" style="${smallBtn('var(--ink-soft)')}">Undo last step</button></form>` : ''}
  </details>
  <div style="margin-top:8px"><form method="POST" action="/admin/priorities/remove" style="display:inline"><input type="hidden" name="id" value="${esc(p.id)}"><button type="submit" style="${smallBtn('var(--dead)')}">Remove from board</button></form></div>
</div>`;
  };

  const ready = threshold ? items.filter(p => p.phase === 'raised' && p.support >= threshold) : [];
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)} · host admin · priorities</div>
  <h1>Community priorities</h1>
  <div class="src">What residents posted for ${esc(county.name)} to lean into or take a fresh look at — and your control surface for the accountability loop. ${threshold ? `At <b>${threshold}</b> backers a priority is ready to carry to the officials; you send it and record each step here.` : 'Record what the county does with each one here.'} Candidate, ballot-measure, and named-official posts are refused automatically. Every action is stamped in the public record by your name.</div>
</header>
${republicFrame()}
${opts.removed ? `<p class="src" style="color:var(--sourced)"><b>Removed ✓</b> — it's off the board.</p>` : ''}
${opts.recorded ? `<p class="src" style="color:var(--sourced)"><b>Recorded ✓</b> — it's on <a href="/outcomes">the outcomes page</a> now, cited and dated.</p>` : ''}
${ready.length ? `<div class="issue" style="display:block;border-color:var(--sourced)"><b style="color:var(--sourced)">${ready.length} ready to carry to the county</b><p class="src" style="margin:4px 0 0">These passed ${threshold} backers. Send them to the officials, then record it below.</p></div>` : ''}
<section>
<h2>On the board <span class="sub">— ${items.length}</span></h2>
${items.length ? items.map(row).join('') : '<p class="src">No community priorities posted in your county yet.</p>'}
</section>`;
  return shell(county, 'Priorities', body);
}

function adminHelp(data, hostListings, opts = {}) {
  const { county } = data;
  const field = 'font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);width:100%;box-sizing:border-box';
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)} · host admin · help finder</div>
  <h1>Help Finder</h1>
  <div class="src">Add the real local places that help — food, rent, utilities, benefits — with a phone number and hours. This page gives; it never asks. Your additions show under "Added by your county host."</div>
</header>
${opts.saved ? `<p class="src" style="color:var(--sourced)"><b>Saved ✓</b> — live on <a href="/help">Find help</a> now.</p>` : ''}

<section>
<h2>Your added listings <span class="sub">— ${hostListings.length}</span></h2>
${hostListings.length ? hostListings.map((r, i) => `
<div class="issue" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
  <div><b>${esc(r.name || '')}</b>${r.what ? ` — <span class="src">${esc(r.what)}</span>` : ''}<p class="src" style="margin:4px 0 0">${r.phone ? esc(r.phone) + ' · ' : ''}${esc(r.hours || '')}${r.address ? ' · ' + esc(r.address) : ''}</p></div>
  <form method="POST" action="/admin/help/remove" style="flex:none"><input type="hidden" name="index" value="${i}"><button type="submit" style="font-family:var(--mono);font-size:12px;padding:6px 10px;border:1.5px solid var(--dead);color:var(--dead);background:var(--card);cursor:pointer">Remove</button></form>
</div>`).join('') : '<p class="src">Nothing added yet. The base directory still shows; add local specifics below.</p>'}
</section>

<section>
<h2>Add a listing</h2>
<form method="POST" action="/admin/help/add" style="max-width:640px;display:flex;flex-direction:column;gap:10px">
  <label style="font-size:13.5px">Name<input name="name" required maxlength="120" placeholder="Clark County Food Pantry" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">What they help with<input name="what" maxlength="160" placeholder="Groceries, no questions asked" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Phone<input name="phone" maxlength="40" placeholder="870-555-0100" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Hours<input name="hours" maxlength="120" placeholder="Tue & Thu, 9am–noon" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Address <span class="src">(optional)</span><input name="address" maxlength="160" placeholder="123 Main St, Arkadelphia" style="${field};margin-top:4px"></label>
  <button type="submit" style="font-family:var(--mono);font-size:13px;padding:9px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer;align-self:flex-start">Add listing</button>
</form>
</section>`;
  return shell(county, 'Help Finder', body);
}

function adminCopy(data, overrides, opts = {}) {
  const { county } = data;
  const field = 'font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);width:100%;box-sizing:border-box';
  const rows = COPY_SLOTS.map(s => {
    const cur = (overrides[s.key] !== undefined && overrides[s.key] !== '') ? overrides[s.key] : s.default;
    const isCustom = overrides[s.key] !== undefined && overrides[s.key] !== '';
    return `
<label style="display:block;margin:0 0 14px;max-width:660px">
  <span style="font-size:13.5px;font-weight:500">${esc(s.label)}</span>${isCustom ? ' <span class="chip c-ok">your wording</span>' : ' <span class="chip">default</span>'}
  <textarea name="${esc(s.key)}" rows="2" maxlength="400" style="${field};margin-top:4px">${esc(cur)}</textarea>
</label>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)} · host admin · page copy</div>
  <h1>Page copy</h1>
  <div class="src">Reword your county's headline and front-page lines. Leave a box blank to fall back to the shared default. You can use placeholders that stay live: ${PLACEHOLDERS.map(p => `<code class="code">${esc(p)}</code>`).join(' ')}.</div>
</header>
${opts.saved ? `<p class="src" style="color:var(--sourced)"><b>Saved ✓</b> — live on your county's <a href="/">home page</a> now.</p>` : ''}

<section>
<form method="POST" action="/admin/copy">
  ${rows}
  <button type="submit" style="font-family:var(--mono);font-size:13px;padding:9px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer">Save copy</button>
</form>
</section>

<section>
<h2>What you can't reword <span class="sub">— the frame</span></h2>
<p class="src">The "not a government website" line, the republic-alongside frame, how every number cites its source, and the methodology stay the same on every county — they're what make the whole thing trustworthy. Your words go on the headline and the pitch; the guarantees stay fixed.</p>
</section>`;
  return shell(county, 'Page copy', body);
}

module.exports = { adminDashboard, adminCalendar, adminQuestions, adminPriorities, adminHelp, adminCopy, modRow };
