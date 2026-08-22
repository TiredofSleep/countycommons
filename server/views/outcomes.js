const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const { phaseBadge, trailHtml, daysSince, govBody } = require('./priorities');

// The accountability page — the whole point of the loop. It shows what came of
// the community's asks: the ones acted on (loop closed), the ones answered but
// not yet acted, and — the part with teeth — the ones carried to the county and
// left waiting, with the days counted in the open. The platform never says the
// county did right or wrong; it records what happened, cited, and lets the
// silence speak for itself.

function card(p) {
  const support = p.support || 0;
  return `
<div class="issue" style="display:block">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline">
    <b style="font-size:16px">${esc(p.title)}</b>
    ${phaseBadge(p.phase)}
  </div>
  <p class="src" style="margin:6px 0 2px">${esc(p.why)}</p>
  <p class="src" style="margin:2px 0 0"><b>${support}</b> ${support === 1 ? 'resident' : 'residents'} behind it · <a href="/priorities">on the board</a></p>
  ${trailHtml(p)}
</div>`;
}

function outcomesPage(data, items) {
  const { county } = data;
  const body_name = govBody(county);
  // Some tenants have no county-level governing body (abolished counties like
  // Middlesex, Fairfield; Kalawao). Their gov-body string is a whole sentence,
  // so "carried to <that>" reads wrong — fall back to a generic phrasing.
  const hasBody = !/no (county )?government|abolished|no governing body/i.test(body_name);
  const carriedTo = hasBody ? `the <b>${esc(body_name)}</b>` : 'the people who decide';
  const deliveredTo = hasBody ? `Delivered to ${esc(body_name)}` : 'Delivered to whoever holds the decision';

  const acted = items.filter(p => p.phase === 'acted');
  const answered = items.filter(p => p.phase === 'answered');
  // Longest-waiting first — the ones that have gone unanswered the longest lead.
  const waiting = items.filter(p => p.phase === 'delivered')
    .sort((a, b) => {
      const la = a.timeline[a.timeline.length - 1], lb = b.timeline[b.timeline.length - 1];
      return daysSince((la || {}).at) - daysSince((lb || {}).at);
    }).reverse();
  const moved = acted.length + answered.length + waiting.length;

  const section = (title, sub, list) => list.length ? `
<section>
<h2>${esc(title)} <span class="sub">— ${esc(sub)}</span></h2>
${list.map(card).join('')}
</section>` : '';

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · the accountability loop</div>
  <h1>What came of it</h1>
  <div class="src">This is the whole point: the community says what it wants (on <a href="/priorities">the priorities board</a>), it gets carried to ${carriedTo}, and here we record what they did — with a source for every step. We never say they did right or wrong. We show what happened, and when nothing happens, we count the days in the open.</div>
</header>

${moved === 0 ? `<div class="issue" style="display:block;border-style:dashed">
  <b>Nothing has moved yet — and that's the honest starting point.</b>
  <p class="src" style="margin:6px 0 0">This page fills itself in from real events, not promises. Nothing is here because no priority has been carried to ${carriedTo} yet. When one is, you'll see its whole trail — each step dated and cited to a real source:</p>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 2px;font-family:var(--mono);font-size:13px">
    <span class="chip">① Raised on the board</span>
    <span style="opacity:.5">→</span>
    <span class="chip">② ${deliveredTo}</span>
    <span style="opacity:.5">→</span>
    <span class="chip">③ Answered</span>
    <span style="opacity:.5">→</span>
    <span class="chip c-ok">④ Acted on</span>
  </div>
  <p class="src" style="margin:8px 0 0">If an ask sits unanswered, we count the days in the open — silence gets recorded too. Start the loop on <a href="/priorities">the priorities board</a>.</p>
</div>` : ''}

${section('Acted on', 'the loop closed', acted)}
${section('Answered, awaiting action', 'the county responded', answered)}
${waiting.length ? `
<section>
<h2>Carried over, still waiting <span class="sub">— the days are counting</span></h2>
<p class="src">These were put in front of the ${esc(body_name)} and haven't been answered. Nothing here accuses anyone — it's just the clock, running in public.</p>
${waiting.map(card).join('')}
</section>` : ''}

<section>
<h2>How a priority moves</h2>
<p class="src">${phaseBadge('raised')} residents post it and back it · ${phaseBadge('delivered')} it's carried to the body that decides · ${phaseBadge('answered')} an official or the body responds · ${phaseBadge('acted')} something actually happens. Each step is recorded by the county's host with a source, and stamped in the <a href="/security">public activity log</a>. The county writes the budget; this is the receipt for whether they heard us.</p>
</section>`;

  return layout({
    title: `What came of it — ${county.platform_name}`, current: '/outcomes', body, county,
    description: `${county.name}: what the county did with residents' priorities — acted on, answered, or still waiting, every step cited.`
  });
}

module.exports = { outcomesPage };
