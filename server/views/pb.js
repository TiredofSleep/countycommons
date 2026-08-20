const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');

// Participatory budgeting — the resident-facing page. Place N tokens across real
// budget categories under the tradeoff constraint (they must sum to N), then see
// the people's budget beside the adopted one. Advisory, aggregate-only. The form
// works with no JS; the live token counter (public/app.js) is enhancement.

const pctOf = (part, whole) => whole ? Math.round((part / whole) * 1000) / 10 : 0;

// Sum the adopted dollars behind an option from its budget-tree nodes, live from
// the corpus so it can never drift from the money trail.
function adoptedOf(data, option) {
  return (option.node_ref || []).reduce((a, id) => {
    const n = data.byId.get(id);
    return a + (n ? (n.amount || 0) : 0);
  }, 0);
}

function bar(widthPct, color) {
  return `<div style="background:var(--rule);border-radius:2px;height:9px;overflow:hidden">
    <div style="width:${Math.max(0, Math.min(100, widthPct)).toFixed(1)}%;height:100%;background:${color}"></div></div>`;
}

function pbPage(data, exercise, participant, myAlloc, tally, opts) {
  const o = opts || {};
  const { county } = data;
  const N = exercise.tokens;
  const potNode = exercise.pot_node;

  // Adopted dollars + share per option (the county's actual split).
  const adopted = {};
  let adoptedTotal = 0;
  for (const op of exercise.options) { adopted[op.id] = adoptedOf(data, op); adoptedTotal += adopted[op.id]; }

  const has = !!myAlloc;
  const results = tally && tally.participants > 0;

  // Scale bars to the largest single figure across both budgets.
  let maxDollar = 1;
  for (const op of exercise.options) {
    maxDollar = Math.max(maxDollar, adopted[op.id], results ? tally.results[op.id].peoplesDollars : 0);
  }

  // --- the allocation form ---
  const optionRow = (op) => {
    const mine = has ? (myAlloc.allocation[op.id] || 0) : 0;
    const adBar = bar(pctOf(adopted[op.id], maxDollar), 'var(--ink-soft)');
    return `
<div class="issue" style="display:block">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline">
    <b>${esc(op.label)}</b>
    <span class="src" style="white-space:nowrap">county now: ${money(adopted[op.id])} · ${pctOf(adopted[op.id], adoptedTotal)}%</span>
  </div>
  <p class="src" style="margin:4px 0 8px">${esc(op.what)}</p>
  ${adBar}
  <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
    <button type="button" data-step="-1" data-for="t_${esc(op.id)}" aria-label="one fewer token for ${esc(op.label)}"
      style="font-family:var(--mono);font-size:16px;width:34px;height:34px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);cursor:pointer">−</button>
    <input id="t_${esc(op.id)}" name="t_${esc(op.id)}" data-token type="number" inputmode="numeric" min="0" max="${N}" step="1" value="${mine}"
      aria-label="tokens for ${esc(op.label)}"
      style="font-family:var(--mono);font-size:16px;width:56px;text-align:center;padding:6px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink)">
    <button type="button" data-step="1" data-for="t_${esc(op.id)}" aria-label="one more token for ${esc(op.label)}"
      style="font-family:var(--mono);font-size:16px;width:34px;height:34px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);cursor:pointer">+</button>
    <span class="src">token${N === 1 ? '' : 's'}</span>
  </div>
</div>`;
  };

  const form = `
<form method="POST" action="/yourbudget/${esc(exercise.id)}" data-pb="${N}">
  ${o.error ? `<p class="src" style="color:var(--dead)"><b>${esc(o.error)}</b></p>` : ''}
  ${exercise.options.map(optionRow).join('')}
  <div class="issue" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-color:var(--accent)">
    <span style="font-size:15px">Tokens left to place: <b id="tokens-left">${N}</b> of ${N}</span>
    <button type="submit" style="font-family:var(--mono);font-size:14px;padding:9px 16px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer">
      ${has ? 'Update my tokens' : 'Place my tokens'}</button>
  </div>
  <p class="src">Each token is worth about ${money(Math.round(exercise.pot_amount / N))}. Place all ${N}; you can change them anytime until this closes.</p>
</form>`;

  // --- results: the people's budget beside the adopted one ---
  const resultRow = (op) => {
    const r = tally.results[op.id];
    const adPct = pctOf(adopted[op.id], adoptedTotal);
    const ppPct = Math.round(r.peoplesShare * 1000) / 10;
    const diff = r.peoplesDollars - adopted[op.id];
    const arrow = Math.abs(diff) < adoptedTotal * 0.005 ? '≈ about the same'
      : (diff > 0 ? `▲ ${money(Math.abs(diff))} more` : `▼ ${money(Math.abs(diff))} less`);
    const arrowColor = Math.abs(diff) < adoptedTotal * 0.005 ? 'var(--ink-soft)' : (diff > 0 ? 'var(--sourced)' : 'var(--dead)');
    return `
<div class="issue" style="display:block">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline">
    <b>${esc(op.label)}</b>
    <span class="src" style="color:${arrowColor}">${arrow}</span>
  </div>
  <div style="display:grid;grid-template-columns:74px 1fr auto;gap:8px;align-items:center;margin-top:8px">
    <span class="src">County</span>${bar(pctOf(adopted[op.id], maxDollar), 'var(--ink-soft)')}<span class="src" style="white-space:nowrap">${money(adopted[op.id])} · ${adPct}%</span>
    <span class="src" style="color:var(--accent)">Residents</span>${bar(pctOf(r.peoplesDollars, maxDollar), 'var(--accent)')}<span class="src" style="white-space:nowrap;color:var(--accent)">${money(r.peoplesDollars)} · ${ppPct}%</span>
  </div>
</div>`;
  };

  const resultsBlock = results ? `
<section>
<h2>The people's budget, so far <span class="sub">— beside what the county adopted</span></h2>
${tally.provisional ? `<p class="src" style="color:var(--accent)">Early signal — <b>${tally.participants}</b> ${tally.participants === 1 ? 'person has' : 'people have'} taken part. Under ${tally.floor}, read this as a first sketch, not a verdict.</p>` : `<p class="src"><b>${tally.participants}</b> people have taken part.</p>`}
${exercise.options.map(resultRow).join('')}
<p class="src">"Residents" is the average of everyone's tokens, turned back into dollars so the six pieces still add up to the whole ${money(exercise.pot_amount)} fund. It is a signal to the quorum court — it does not move a dollar.</p>
</section>` : `
<section>
<h2>The people's budget</h2>
<p class="src">No one has taken part yet. Place your tokens above to start the count — you'll be the first to put a resident number beside the county's.</p>
</section>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · your budget</div>
  <h1>${esc(exercise.title)}</h1>
  <div class="src">${esc(exercise.intro)}</div>
</header>

<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <div class="eyebrow" style="color:var(--accent)">a signal, not a law</div>
  <p class="src" style="margin:4px 0 0">${esc(exercise.caveat)} The pot is ${money(exercise.pot_amount)}${potNode ? ` — <a href="/line/${esc(potNode)}">see it on the money trail</a>` : ''}.</p>
</div>

${o.submitted && has ? `<div class="issue" style="display:block;border-color:var(--sourced);background:var(--sourced-bg)"><b>Your tokens are placed.</b> <span class="src">Change them anytime until this closes. Your individual choices are never shown — only the totals below.</span></div>` : ''}

<section>
<h2>${has ? 'Your ' : 'Place your '}${N} tokens</h2>
${form}
</section>

${resultsBlock}

<section>
<h2>Why tokens, and why this fund</h2>
<p class="src">Tokens instead of dollars so the choice fits any phone or a paper sheet, and so the tradeoff is plain: you have ten, and funding one thing means not funding another. We use the General Fund because it is the money the county actually chooses each year — the restricted funds are set by law. This is a prototype of a bigger idea; the full design is on the <a href="/field">where-we-sit</a> page. Every number here traces to <a href="/budget">the money trail</a>.</p>
</section>`;

  return layout({
    title: `Your budget — ${county.platform_name}`, current: '/yourbudget', body, county,
    description: `Split ${county.name}'s discretionary General Fund yourself, then see the people's budget beside the one the county adopted. A signal, not binding — every figure sourced.`
  });
}

// Honest empty state for a county with no exercise yet.
function pbEmptyPage(data) {
  const { county } = data;
  return layout({
    title: `Your budget — ${county.platform_name}`, current: '/yourbudget', county,
    body: `<header class="page"><div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · your budget</div>
<h1>Split the budget yourself</h1>
<div class="src">This is where residents will take a pot of the county's discretionary money and split it themselves — then see the result beside what the county actually adopted. No exercise is open for ${esc(county.name)} yet. It starts with an ingested budget on the <a href="/budget">money trail</a>; when a local host opens one, it appears here.</div></header>`,
    description: `${county.name}: split the county's discretionary budget yourself — coming when an exercise opens.`
  });
}

module.exports = { pbPage, pbEmptyPage };
