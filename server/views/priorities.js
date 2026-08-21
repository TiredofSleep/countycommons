const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The community-priorities board. Residents say what to lean into or take a
// fresh look at, and why; others back what they share; the list ranks itself
// into a clear signal for the people whose job is the budget. Voice, not a
// rival ledger — see server/priorities.js and docs/PARTICIPATORY-BUDGETING.md.

const KIND = {
  prioritize: { label: 'Prioritize', cls: 'c-ok', mark: '▲', prompt: 'Lean into this' },
  reconsider: { label: 'Take a fresh look', cls: 'c-amb', mark: '⁈', prompt: 'Is this worth it?' }
};

// Starter ideas — the generative, joyful side of the board, so it never reads as
// a blank page or a budget lecture. Clearly examples, not real posts; each is a
// one-tap start that pre-fills the form. Big or small, build-something or
// fix-the-everyday or food-as-a-utility or see-the-money-at-every-scale.
const IDEAS = [
  ['Build something the town would love', ['A skate park for the kids', 'A gazebo in the square', 'Benches and shade downtown', 'A splash pad for summer', 'A dog park', 'A community garden']],
  ['Hire local talent', ['A mural by a local artist', 'Fund a neighbor’s passion project', 'A summer music series in the park']],
  ['Food and the basics', ['A community fridge — food as a utility', 'A farmers-market pavilion', 'Help fill the school-lunch gap']],
  ['Fix the everyday', ['A crosswalk by the school', 'Longer library hours', 'Grade the roads out past town']],
  ['See the money, at every scale', ['Publish the school budget like this one', 'Put the check register online each month']]
];

function govBody(county) {
  const j = (county.jurisdictions || []).find(x => x.kind === 'county') || (county.jurisdictions || [])[0];
  return (j && j.governing_body) || 'quorum court';
}

// The accountability loop, made visible. A priority's phase and the honest
// count of days it has waited — the silence is the pressure.
const PHASE = {
  raised:    { label: 'Raised by residents', cls: 'c-part', mark: '•' },
  delivered: { label: 'Carried to the county', cls: 'c-amb', mark: '→' },
  answered:  { label: 'Answered', cls: 'c-amb', mark: '↩' },
  acted:     { label: 'Acted on', cls: 'c-ok', mark: '✓' }
};
function daysSince(d) {
  const then = new Date(String(d) + 'T00:00:00Z');
  if (isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
}
function srcLink(ev) {
  if (!ev || !ev.source) return '';
  return ev.source.url
    ? ` <a href="${esc(ev.source.url)}" rel="noopener">source: ${esc(ev.source.label || 'link')}</a>`
    : ` <span class="src">(source: ${esc(ev.source.label)})</span>`;
}
function phaseBadge(phase) {
  const ph = PHASE[phase] || PHASE.raised;
  return `<span class="chip ${ph.cls}" style="white-space:nowrap">${ph.mark} ${esc(ph.label)}</span>`;
}
// One-line current status under a card: the newest event, or the waiting count.
function statusLine(p) {
  const last = (p.timeline && p.timeline.length) ? p.timeline[p.timeline.length - 1] : null;
  if (p.phase === 'acted' && last) {
    return `<p class="src" style="margin:6px 0 0;color:var(--sourced)"><b>✓ Acted on${last.at ? ` (${esc(last.at)})` : ''}:</b> ${esc(last.note)}${srcLink(last)}</p>`;
  }
  if ((p.phase === 'delivered' || p.phase === 'answered') && last) {
    const d = daysSince(last.at);
    const wait = p.phase === 'delivered' ? ` · <b>${d}</b> day${d === 1 ? '' : 's'} awaiting an answer` : '';
    return `<p class="src" style="margin:6px 0 0;color:var(--accent)">${PHASE[p.phase].mark} <b>${esc(PHASE[p.phase].label)}${last.at ? ` (${esc(last.at)})` : ''}:</b> ${esc(last.note)}${srcLink(last)}${wait}</p>`;
  }
  return '';
}
// The full trail, newest last — for the outcomes page.
function trailHtml(p) {
  if (!p.timeline || !p.timeline.length) return '<p class="src" style="margin:4px 0 0">Raised by residents — not yet carried to the county.</p>';
  return `<div style="margin:6px 0 0;border-left:2px solid var(--rule);padding-left:12px">${
    p.timeline.map(ev => {
      const ph = PHASE[ev.stage] || {};
      return `<p class="src" style="margin:4px 0"><b>${esc(ev.at || '')} · ${esc(ph.label || ev.stage)}</b>${ev.note ? ' — ' + esc(ev.note) : ''}${srcLink(ev)}${ev.by ? ` <span style="opacity:.7">— recorded by ${esc(ev.by)}</span>` : ''}</p>`;
    }).join('')
  }</div>`;
}

function prioritiesPage(data, items, opts) {
  const o = opts || {};
  const { county } = data;
  const body_name = govBody(county);
  const threshold = county.delivery_threshold || null;

  // The starter-ideas menu — turns a blank board into a menu of winnable things.
  // Each chip one-taps into the form pre-filled. Examples, plainly, not real posts.
  const ideasBlock = `
<section>
<h2>Not sure where to start? <span class="sub">— tap one, or write your own</span></h2>
<p class="src">Neighbors rally for real things here — big or small, joyful or practical. Pick one to start it, then say why in a line. If enough people want it, it goes to the folks who hold the budget.</p>
${IDEAS.map(([g, items]) => `<p class="src" style="margin:10px 0 4px"><b>${esc(g)}</b></p>
<div style="display:flex;gap:6px;flex-wrap:wrap">${items.map(it => `<a href="/priorities?idea=${encodeURIComponent(it)}#add" style="text-decoration:none;font-size:13.5px;border:1.5px solid var(--ink);background:var(--card);padding:6px 11px;color:var(--ink)">${esc(it)} <b style="color:var(--accent)">+</b></a>`).join('')}</div>`).join('')}
</section>`;

  // Budget areas for the optional "what part of the county?" link — grounds a
  // priority in what people can actually see on the money trail.
  const areas = (data.budget.nodes || []).filter(n => n.parent === null && n.section === 'appropriations');
  const areaName = id => { const n = data.byId.get(id); return n ? n.name : null; };

  const proposeForm = `
<form method="POST" action="/priorities/propose" style="margin-top:8px">
  ${o.blocked ? `<p class="src" style="color:var(--dead)"><b>That can't go up as written.</b> This platform never hosts questions about candidates, active ballot measures, or a named person's conduct (${esc(o.blocked)}). Say it about the work or the dollars, not a person, and it's welcome.</p>` : ''}
  <fieldset style="border:1.5px solid var(--rule);padding:12px;margin:0 0 10px">
    <legend class="src" style="padding:0 6px">What kind of ask is this?</legend>
    <label style="display:block;margin:4px 0"><input type="radio" name="kind" value="prioritize" checked> <b>Prioritize it</b> — I want the county to lean into this.</label>
    <label style="display:block;margin:4px 0"><input type="radio" name="kind" value="reconsider"> <b>Take a fresh look</b> — I want them to weigh whether this is still worth it.</label>
  </fieldset>
  <label class="src" for="p-title">In a line, what is it?</label>
  <input id="p-title" name="title" required maxlength="120" value="${esc(o.idea || '')}" placeholder="e.g. A skate park for the kids, or a gazebo for the market"
    style="width:100%;font-size:15px;padding:8px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);margin:4px 0 10px">
  <label class="src" for="p-why">Why does it matter? <span style="opacity:.7">— this is the part the county actually needs</span></label>
  <textarea id="p-why" name="why" required maxlength="600" rows="3" placeholder="Say it plainly. What happens if they do — or don't?"
    style="width:100%;font-size:15px;padding:8px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);margin:4px 0 10px"></textarea>
  ${areas.length ? `<label class="src" for="p-node">Which part of the county? <span style="opacity:.7">(optional — ties it to the money trail)</span></label>
  <select id="p-node" name="node_ref" style="width:100%;font-size:15px;padding:8px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);margin:4px 0 10px">
    <option value="">— not tied to one line —</option>
    ${areas.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}
  </select>` : ''}
  <button type="submit" style="font-family:var(--mono);font-size:14px;padding:9px 16px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer">Post it</button>
</form>`;

  const card = (p) => {
    const k = KIND[p.kind] || KIND.prioritize;
    const area = p.node_ref ? areaName(p.node_ref) : null;
    const others = p.reasons.filter((r, i) => !(p.kind && i < 0)).slice(0, 3); // up to 3 supporter reasons
    return `
<div class="issue" style="display:block">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline">
    <b style="font-size:16px">${esc(p.title)}</b>
    <span style="white-space:nowrap"><span class="chip ${k.cls}">${k.mark} ${esc(k.label)}</span> ${phaseBadge(p.phase)}</span>
  </div>
  <p class="src" style="margin:6px 0 2px">${esc(p.why)}</p>
  ${area ? `<p class="src" style="margin:2px 0">On the money trail: <a href="/line/${esc(p.node_ref)}">${esc(area)}</a>.</p>` : ''}
  ${statusLine(p)}
  ${threshold && p.phase === 'raised' ? (p.support >= threshold
    ? `<p class="src" style="margin:6px 0 0;color:var(--sourced)">✓ <b>${threshold} reached</b> — ready to carry to the county's officials.</p>`
    : `<p class="src" style="margin:6px 0 0"><b>${p.support}</b> of <b>${threshold}</b> — at ${threshold} residents, this is carried to the officials. <span style="opacity:.75">(counts are unverified for now; they become verified residents when the tiers ship)</span></p>`) : ''}
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-top:8px">
    <span class="src"><b>${p.support}</b> ${p.support === 1 ? 'person is' : 'people are'} behind this${o.mine && o.mine.has(p.id) ? ' — <span style="color:var(--sourced)">including you</span>' : ''}</span>
    ${o.mine && o.mine.has(p.id) ? '' : `<details style="margin:0">
      <summary style="cursor:pointer;font-size:13px;color:var(--accent)">I'm with this →</summary>
      <form method="POST" action="/priorities/${esc(p.id)}/support" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start">
        <input name="why" maxlength="400" placeholder="add your reason (optional)"
          style="flex:1;min-width:200px;font-size:14px;padding:7px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink)">
        <button type="submit" style="font-family:var(--mono);font-size:13px;padding:7px 12px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer">Back it</button>
      </form>
    </details>`}
  </div>
  ${others.length ? `<div style="margin-top:8px;border-top:1px solid var(--rule);padding-top:6px">${others.map(r => `<p class="src" style="margin:3px 0">“${esc(r)}”</p>`).join('')}</div>` : ''}
</div>`;
  };

  const list = items.length
    ? items.map(card).join('')
    : `<p class="src">No priorities yet. Be the first — and it helps to <a href="/budget">see what's already here</a> before you say what to lift up or question.</p>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · the community's voice</div>
  <h1>What should the county prioritize?</h1>
  <div class="src">We don't write the budget — we elected people to do that. This is where the community says what it wants them to weigh: what to lean into, or what to take a fresh look at, and <b>why</b>. Back the ones you share; the list ranks itself. It starts with seeing what's here — <a href="/budget">the money trail</a> shows where the money goes today.</div>
</header>

<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <div class="eyebrow" style="color:var(--accent)">how this works</div>
  <p class="src" style="margin:4px 0 0">Post what you want prioritized — or questioned — and why. Others back what they agree with, so the strongest-felt priorities rise to the top on their own.${threshold ? ` When one reaches <b>${threshold}</b> residents, it's formally carried to the <b>${esc(body_name)}</b> — the officials you elected to write the budget.` : ` The strongest are carried to the <b>${esc(body_name)}</b>.`} Their job is to fit it in; ours is to make it impossible to miss — and to track <a href="/outcomes">what came of it</a>.</p>
</div>

${o.proposed ? `<div class="issue" style="display:block;border-color:var(--sourced);background:var(--sourced-bg)"><b>Posted.</b> <span class="src">It's on the board below, and you're its first backer. Share it — this works when neighbors pile onto what they share.</span></div>` : ''}
${o.supported ? `<div class="issue" style="display:block;border-color:var(--sourced);background:var(--sourced-bg)"><b>You're on record.</b> <span class="src">Your backing is counted; your name is not shown.</span></div>` : ''}

${ideasBlock}

<section id="add">
<h2>${o.idea ? 'Make it yours' : 'Or write your own'}</h2>
${o.idea ? `<p class="src">You picked <b>“${esc(o.idea)}”</b> — keep it or change it, then say why it matters.</p>` : ''}
${proposeForm}
</section>

<section>
<h2>The community's priorities <span class="sub">— most-backed first</span></h2>
${list}
</section>`;

  return layout({
    title: `Priorities — ${county.platform_name}`, current: '/priorities', body, county,
    description: `What ${county.name} residents want the county to prioritize — or take a fresh look at — and why. Voice to the people who write the budget, ranked by how many share it.`
  });
}

module.exports = { prioritiesPage, PHASE, phaseBadge, statusLine, trailHtml, daysSince, srcLink, govBody };
