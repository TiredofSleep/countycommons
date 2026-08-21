const { esc } = require('../lib/corpus');
const { deliveryThreshold } = require('../lib/threshold');
const { layout } = require('./layout');

// The live scoreboard — a count reaching for the threshold. Everyone who backs a
// priority sees the bar move and their own vote count toward carrying it to the
// officials. The bar goes green the moment the threshold is reached.
function progressBar(support, threshold, toWhom) {
  const pct = threshold ? Math.min(100, Math.round((support / threshold) * 100)) : 0;
  const reached = threshold && support >= threshold;
  const label = reached
    ? `<b style="color:var(--sourced)">✓ ${threshold} reached — ready to carry${toWhom ? ' to ' + esc(toWhom) : ''}</b>`
    : `<b>${support}</b> of <b>${threshold}</b> ${support === 1 ? 'neighbor' : 'neighbors'}${toWhom ? ` — at ${threshold} it goes to ${esc(toWhom)}` : ''}`;
  return `<div style="margin:8px 0 0">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span class="src">${label}</span><span class="src" style="font-variant-numeric:tabular-nums">${pct}%</span></div>
    <div style="background:var(--rule);border-radius:3px;height:11px;overflow:hidden;margin-top:3px"><div style="width:${pct}%;height:100%;background:${reached ? 'var(--sourced)' : 'var(--accent)'};transition:width .3s"></div></div>
  </div>`;
}

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

// The bodies a resident can direct a priority to: the county's governing body
// (if it has one), plus every city and town. Where the county has no government
// to hear it (Middlesex, MA), only the cities appear — the honest lane. Cities
// come from the config jurisdictions AND the municipalities index, deduped.
function participationTargets(county, places) {
  const targets = [];
  const gj = (county.jurisdictions || []).find(j => j.kind === 'county');
  const cb = gj && gj.governing_body;
  const hasCountyGov = cb && !/abolish|no county|commonwealth|state-funded/i.test(cb);
  if (hasCountyGov) targets.push({ id: 'county', label: county.name, body: cb, kind: 'county', pop: county.population || null });
  const seen = new Set();
  const addCity = (name, body, pop) => {
    const k = String(name || '').toLowerCase(); if (!k || seen.has(k)) return; seen.add(k);
    targets.push({ id: 'city-' + k.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), label: name, body: body, kind: 'city', pop: pop || null });
  };
  for (const j of (county.jurisdictions || [])) if (['city', 'town'].includes(j.kind)) addCity(j.name.replace(/^(City|Town) of /, ''), j.governing_body || (j.name.replace(/^(City|Town) of /, '') + ' City Council'), null);
  for (const p of ((places && places.places) || [])) addCity(p.name, p.name + (p.kind === 'town' ? ' Town Meeting' : ' City Council'), p.pop);
  return { targets, hasCountyGov };
}

// The funnel: every level of government this county's residents can push at, from
// the whole nation down to a single town. Each is its own board with its own set
// of votes and its own count — you toggle between them. National and state are
// shared across the whole network (a push that isn't about one county pools
// voices from every host); county and city are this place's own.
function funnelLevels(county, places) {
  const { targets, hasCountyGov } = participationTargets(county, places);
  const levels = [
    { id: 'national', label: 'National', kind: 'national', body: 'Congress and federal agencies', scope: 'the whole country' }
  ];
  if (county.state) levels.push({ id: 'state', label: county.state, kind: 'state', body: `the ${county.state} legislature`, scope: `all of ${county.state}` });
  for (const t of targets) levels.push({ id: t.id, label: t.label, kind: t.kind, body: t.body, pop: t.pop, scope: t.kind === 'county' ? `all of ${county.name}` : t.label });
  return { levels, hasCountyGov };
}

// The threshold for one level. County and city size to their own electorate
// (real petition precedent); national and state are network-wide ceilings until
// we load real statewide/national turnout — labeled as such in the copy.
function levelThreshold(lvl, county) {
  if (!lvl) return deliveryThreshold(county);
  if (lvl.kind === 'national') return 5000;
  if (lvl.kind === 'state') return 2500;
  return deliveryThreshold(county, lvl.pop || undefined);
}

// The toggle row itself — pills, current level filled in. A tap loads that
// level's board; any picked starter idea rides along so it isn't lost. The upper
// levels (nation → state → county) are always-visible pills; cities collapse
// into an expandable group when there are many, so a big county doesn't become a
// wall of forty pills. The currently-selected city always shows as a live pill.
function levelFunnel(levels, currentId, idea) {
  const q = idea ? '&idea=' + encodeURIComponent(idea) : '';
  const tag = { national: 'nation', state: 'state', county: 'county', city: 'city', town: 'town' };
  const pill = (l) => {
    const on = l.id === currentId;
    return `<a href="/priorities?level=${encodeURIComponent(l.id)}${q}#board" style="text-decoration:none;font-size:13.5px;line-height:1.2;padding:6px 11px;border:1.5px solid var(--ink);${on ? 'background:var(--ink);color:var(--paper)' : 'background:var(--card);color:var(--ink)'}"><span style="opacity:.6;font-size:10px;text-transform:uppercase;letter-spacing:.05em">${tag[l.kind] || ''}</span><br><b>${esc(l.label)}</b></a>`;
  };
  const upper = levels.filter(l => l.kind === 'national' || l.kind === 'state' || l.kind === 'county');
  const cities = levels.filter(l => l.kind === 'city' || l.kind === 'town');
  const currentIsCity = cities.some(c => c.id === currentId);
  let cityHtml;
  if (cities.length <= 6) {
    cityHtml = cities.map(pill).join('');
  } else {
    // Many cities: an inline pill for the selected one, then a disclosure with all.
    const selected = cities.find(c => c.id === currentId);
    cityHtml = `${selected ? pill(selected) : ''}<details style="display:inline-block;vertical-align:top"${currentIsCity ? '' : ''}>
      <summary style="cursor:pointer;font-size:13.5px;line-height:1.2;padding:6px 11px;border:1.5px dashed var(--ink);background:var(--card);color:var(--ink);list-style:none">${selected ? 'Other ' : ''}Cities &amp; towns (${cities.length}) ▾</summary>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 0">${cities.map(pill).join('')}</div>
    </details>`;
  }
  return `<div class="eyebrow" style="margin:0 0 4px">the funnel — pick a level, each is its own board</div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px;align-items:flex-start">
${upper.map(pill).join('')}${cityHtml}
</div>`;
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
  const { levels, hasCountyGov } = funnelLevels(county, o.places);
  // The selected level (from ?level=). Default to the county board where there's
  // a county government, otherwise the first city — the honest local lane.
  const defaultLevel = hasCountyGov ? 'county' : ((levels.find(l => l.kind === 'city' || l.kind === 'town') || {}).id || 'state');
  const current = levels.find(l => l.id === o.level) || levels.find(l => l.id === defaultLevel) || levels[0];
  const threshold = levelThreshold(current, county);
  const body_name = current.body;
  const isLocal = current.kind === 'county' || current.kind === 'city' || current.kind === 'town';

  // The starter-ideas menu — turns a blank board into a menu of winnable things.
  // Each chip one-taps into the form pre-filled. Examples, plainly, not real posts.
  const ideasBlock = `
<section>
<h2>Not sure where to start? <span class="sub">— tap one, or write your own</span></h2>
<p class="src">Neighbors rally for real things here — big or small, joyful or practical. Pick one to start it, then say why in a line. If enough people want it, it goes to the folks who hold the budget.</p>
${IDEAS.map(([g, items]) => `<p class="src" style="margin:10px 0 4px"><b>${esc(g)}</b></p>
<div style="display:flex;gap:6px;flex-wrap:wrap">${items.map(it => `<a href="/priorities?level=${encodeURIComponent(current.id)}&idea=${encodeURIComponent(it)}#add" style="text-decoration:none;font-size:13.5px;border:1.5px solid var(--ink);background:var(--card);padding:6px 11px;color:var(--ink)">${esc(it)} <b style="color:var(--accent)">+</b></a>`).join('')}</div>`).join('')}
</section>`;

  // Budget areas for the optional "what part of the county?" link — grounds a
  // priority in what people can actually see on the money trail.
  const areas = (data.budget.nodes || []).filter(n => n.parent === null && n.section === 'appropriations');
  const areaName = id => { const n = data.byId.get(id); return n ? n.name : null; };

  const proposeForm = `
<form method="POST" action="/priorities/propose" style="margin-top:8px">
  ${o.blocked ? `<p class="src" style="color:var(--dead)"><b>That can't go up as written.</b> This platform never hosts questions about candidates, active ballot measures, or a named person's conduct (${esc(o.blocked)}). Say it about the work or the dollars, not a person, and it's welcome.</p>` : ''}
  <input type="hidden" name="level" value="${esc(current.id)}">
  <p class="src" style="margin:0 0 10px;border-left:3px solid var(--accent);padding-left:10px">Posting to the <b>${esc(current.label)}</b> board${current.body ? ` — aimed at ${esc(current.body)}` : ''}. ${levels.length > 1 ? `Wrong level? <a href="#board">Switch above.</a>` : ''}</p>
  <fieldset style="border:1.5px solid var(--rule);padding:12px;margin:0 0 10px">
    <legend class="src" style="padding:0 6px">What kind of ask is this?</legend>
    <label style="display:block;margin:4px 0"><input type="radio" name="kind" value="prioritize" checked> <b>Prioritize it</b> — I want them to lean into this.</label>
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
  ${p.phase === 'raised' ? progressBar(p.support, threshold, body_name) : ''}
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-top:8px">
    <span class="src"><b>${p.support}</b> ${p.support === 1 ? 'person is' : 'people are'} behind this${o.mine && o.mine.has(p.id) ? ' — <span style="color:var(--sourced)">including you</span>' : ''}</span>
    ${o.mine && o.mine.has(p.id) ? '' : `<details style="margin:0">
      <summary style="cursor:pointer;font-size:13px;color:var(--accent)">I'm with this →</summary>
      <form method="POST" action="/priorities/${esc(p.id)}/support" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start">
        <input type="hidden" name="level" value="${esc(current.id)}">
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
    : `<p class="src">Nothing on the <b>${esc(current.label)}</b> board yet — be the first. ${isLocal ? `It helps to <a href="/budget">see what's already here</a> before you say what to lift up or question.` : `Say what ${current.kind === 'national' ? 'the country' : esc(county.state)} should take on.`}</p>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · the community's voice</div>
  <h1>What should we push for — and at which level?</h1>
  <div class="src">We don't write the budgets or the laws — we elected people to do that. This is where the community says what it wants them to weigh, and <b>why</b>. There's a board for every level of government, from your town all the way up to the nation. Pick a level, back what you share, and the list ranks itself.</div>
</header>

<div id="board">${levelFunnel(levels, current.id, o.idea)}</div>

<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <div class="eyebrow" style="color:var(--accent)">the <b>${esc(current.label)}</b> board — its own count, its own votes</div>
  <p class="src" style="margin:4px 0 0">This board is for what ${current.kind === 'national' ? 'the country' : current.kind === 'state' ? esc(county.state) : esc(current.label)} should do. Post what you want prioritized — or questioned — and why. Others back what they agree with, so the strongest-felt priorities rise on their own.${threshold ? ` When one reaches <b>${threshold}</b> ${isLocal ? 'residents' : 'people across the network'}, it's carried to <b>${esc(current.body)}</b>.` : ''}${!isLocal ? ` <span style="opacity:.85">National and state boards pool voices from every county on the platform; delivery targets there are still being built — but the count starts now.</span>` : ''} We track <a href="/outcomes">what came of it</a>.</p>
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
<h2>On the ${esc(current.label)} board <span class="sub">— most-backed first</span></h2>
${list}
</section>`;

  return layout({
    title: `Priorities — ${county.platform_name}`, current: '/priorities', body, county,
    description: `What ${county.name} residents want the county to prioritize — or take a fresh look at — and why. Voice to the people who write the budget, ranked by how many share it.`
  });
}

module.exports = { prioritiesPage, PHASE, phaseBadge, statusLine, trailHtml, daysSince, srcLink, govBody, progressBar, funnelLevels, levelThreshold, levelFunnel };
