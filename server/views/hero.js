// The front door's short film: six scenes, about 42 seconds, that walk one
// real county (Clark County, Arkansas — the deepest-built example) from its
// budget total to a transparency box turning green. Pure CSS animation: no
// video file, no script, fast on old phones. A CSS-only pause button meets
// WCAG 2.2.2, and anyone with reduced motion set sees a still storyboard.
// Numbers are read live from the data; scenes 4 and 5 show how the loop
// works and are marked "example" because no request has been answered yet.
const { esc } = require('../lib/corpus');

const $ = (n) => '$' + Math.round(n).toLocaleString('en-US');
const SCENE = 7; // seconds per scene
const N = 6;     // scenes

function example() {
  let total = 0, funds = [], sheriff = null, doc = 'the adopted budget ordinance';
  try {
    const b = require('../../data/corpus/budget-2026.json');
    total = b.meta.grand_total;
    funds = b.nodes.filter(x => !x.parent).sort((a, b) => b.amount - a.amount).slice(0, 5);
    sheriff = b.nodes.find(x => x.id === 'gf-sheriff');
    const d = (require('../../data/corpus/documents.json').documents || []).find(x => x.id === b.meta.document);
    if (d) doc = d.title.replace(/\s+—.*$/, '');
  } catch (e) { /* the film still plays with the meter scenes */ }
  let cells = [], n = { yes: 0, partly: 0, no: 0 };
  try {
    const nv = require('./national'); const T = require('../lib/transparency');
    const c = nv.countyRec('ar', 'clark'); const it = T.get(c).items;
    cells = T.ITEMS.map(([k, label]) => ({ k, label, v: it[k] ? it[k].v : null }));
    for (const x of cells) if (n[x.v] !== undefined) n[x.v]++;
  } catch (e) { /* none */ }
  return { total, funds, sheriff, doc, cells, n };
}

function heroFilm() {
  const x = example();
  const max = x.funds.length ? x.funds[0].amount : 1;
  const D = (i, extra = 0) => `animation-delay:${(i * SCENE + extra).toFixed(2)}s`;
  const COL = { yes: 'var(--sourced)', partly: 'var(--partial)', no: 'var(--dead)' };
  const cell = (c, j) => `<i class="cc-cell" style="${c.v ? `background:${COL[c.v]};${c.v === 'no' ? 'opacity:.35' : c.v === 'partly' ? 'opacity:.65' : ''}` : 'border:1px dashed var(--rule)'};${D(2, 0.4 + j * 0.07)}" title="${esc(c.label)}"></i>`;
  const scenes = [
    // 1. The total, and where it goes.
    [`${esc('Clark County, Arkansas')} will spend <b>${$(x.total)}</b> in 2026. Here’s where it goes.`,
      `<div class="cc-win">${x.funds.map((f, j) => `<div class="cc-bar"><span>${esc(f.name.replace(/\s*\(.*\)$/, ''))}</span><b style="width:${Math.max(6, Math.round(f.amount / max * 100))}%;${D(0, 0.3 + j * 0.25)}"></b><em>${$(f.amount)}</em></div>`).join('')}</div>`],
    // 2. Every number is cited.
    ['Tap any line to see the page it came from. The math is re-added in the open.',
      `<div class="cc-win"><div class="cc-row cc-hl" style="${D(1, 0.6)}"><span>Sheriff</span><b>${x.sheriff ? $(x.sheriff.amount) : ''}</b></div>
       <div class="cc-arrow" style="${D(1, 1.6)}">↓ source</div>
       <div class="cc-doc" style="${D(1, 2.2)}"><b>${esc(x.doc)}</b><br><span>Adopted by the Quorum Court · the page is linked</span></div>
       <div class="cc-ok" style="${D(1, 3.4)}">✓ Every line adds up to ${$(x.total)}</div></div>`],
    // 3. The transparency meter.
    ['30 checks: what does the county put online?',
      `<div class="cc-win"><div class="cc-meter">${x.cells.map(cell).join('')}</div>
       <p class="cc-key" style="${D(2, 3)}"><span style="color:var(--sourced)">■</span> ${x.n.yes} met · <span style="color:var(--partial)">■</span> ${x.n.partly} partly · <span style="color:var(--dead)">■</span> ${x.n.no} not yet</p>
       <p class="cc-small" style="${D(2, 3.6)}">A perfect score: every dollar traced to its receipt, every vote on the record.</p></div>`],
    // 4. A missing box becomes a petition.
    ['Every box that isn’t met yet is a petition asking the county to post it.',
      `<div class="cc-win"><div class="cc-row"><span><i class="cc-cell" style="background:var(--dead);opacity:.35;display:inline-block;vertical-align:-2px"></i> Every payment</span><b style="color:var(--dead)">not online</b></div>
       <div class="cc-arrow" style="${D(3, 1)}">↓</div>
       <div class="cc-doc" style="${D(3, 1.5)}"><b>Ask Clark County to post its checkbook</b><br><span>To the Quorum Court · signatures counted toward a goal set by turnout</span>
       <div class="cc-goal"><b style="${D(3, 2.2)}"></b></div><span class="cc-small">example count</span></div></div>`],
    // 5. One request, one answer, a green box.
    ['One resident files one records request. Everyone sees the answer.',
      `<div class="cc-win"><ol class="cc-steps"><li style="${D(4, 0.6)}">Filed, with the law cited</li><li style="${D(4, 1.8)}">Due in 3 working days</li><li style="${D(4, 3)}">Answered — the records posted</li></ol>
       <div class="cc-row" style="margin-top:10px"><span>Every payment</span><span class="cc-flip"><i class="cc-cell" style="background:var(--dead);opacity:.35"></i><i class="cc-cell cc-green" style="background:var(--sourced);${D(4, 4.2)}"></i></span></div>
       <span class="cc-small">example — how the loop works</span></div>`],
    // 6. Every county.
    ['Every county in the United States has a page. Find yours.',
      `<div class="cc-win" style="text-align:center"><div class="cc-big">3,144</div><div class="cc-small" style="margin-bottom:10px">counties · budgets, the meter, water, jails, elections</div><div class="cc-search">Your county or town… <b>↓</b></div></div>`]
  ];
  const css = `<style>
.cc-film{border:1.5px solid var(--ink);background:var(--card);padding:16px 16px 10px;margin:16px 0 6px}
.cc-scene h3{font-family:var(--sans);text-transform:none;letter-spacing:0;font-size:clamp(19px,4vw,25px);line-height:1.25;margin:0 0 12px;font-weight:600;color:var(--ink)}
.cc-win{border:1px solid var(--rule);background:var(--paper);padding:12px;font-size:14px}
.cc-bar{display:grid;grid-template-columns:minmax(90px,30%) 1fr auto;gap:8px;align-items:center;margin:5px 0}
.cc-bar span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cc-bar b{display:block;height:14px;background:var(--accent);transform-origin:left}.cc-bar em{font-style:normal;font-family:var(--mono);font-size:12.5px}
.cc-row{display:flex;justify-content:space-between;gap:10px;padding:6px 8px;border:1px solid var(--rule);background:var(--card)}.cc-row b{font-family:var(--mono)}
.cc-hl{outline:2px solid var(--accent)}
.cc-arrow{font-family:var(--mono);font-size:12.5px;color:var(--accent);margin:6px 8px}
.cc-doc{border:1.5px solid var(--accent);background:var(--card);padding:8px 10px}.cc-doc span{font-size:12.5px;color:var(--ink-soft)}
.cc-ok{margin-top:8px;color:var(--sourced);font-weight:600}
.cc-meter{display:grid;grid-template-columns:repeat(15,1fr);gap:3px;max-width:420px}
.cc-cell{display:block;height:16px;min-width:12px}
.cc-key{margin:10px 0 2px}.cc-small{font-size:12.5px;color:var(--ink-soft);margin:2px 0 0}
.cc-goal{height:10px;border:1px solid var(--ink);margin:8px 0 2px;max-width:280px}.cc-goal b{display:block;height:100%;width:72%;background:var(--accent)}
.cc-steps{margin:0;padding-left:20px;line-height:1.7}
.cc-flip{display:inline-flex;gap:6px;align-items:center}.cc-flip .cc-cell{width:28px}
.cc-big{font-family:var(--mono);font-size:44px;font-weight:700;line-height:1}
.cc-search{display:inline-block;border:1.5px solid var(--ink);background:var(--card);padding:8px 14px;color:var(--ink-soft)}
.cc-scene{margin:0 0 18px}.cc-ctl,.cc-prog,.cc-pause{display:none}
@media (prefers-reduced-motion:no-preference){
 .cc-stage{position:relative;min-height:330px}
 .cc-scene{position:absolute;inset:0;margin:0;opacity:0;animation:ccScene ${N * SCENE}s infinite}
 .cc-scene .cc-bar b{animation:ccGrow ${N * SCENE}s infinite both}
 .cc-hl,.cc-arrow,.cc-doc,.cc-ok,.cc-cell,.cc-key,.cc-small,.cc-steps li,.cc-green{animation:ccPop ${N * SCENE}s infinite both}
 .cc-goal b{animation:ccFill ${N * SCENE}s infinite both}
 .cc-green{position:relative;margin-left:-34px}
 .cc-ctl{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px}
 .cc-prog{display:block;flex:1;height:3px;background:var(--rule)}.cc-prog b{display:block;height:100%;background:var(--ink);transform-origin:left;animation:ccProg ${N * SCENE}s linear infinite}
 .cc-pause{display:block;position:absolute;opacity:0;width:1px;height:1px}
 .cc-pbtn{font-family:var(--mono);font-size:13px;font-weight:600;border:1.5px solid var(--ink);padding:4px 10px;cursor:pointer;background:var(--card);color:var(--ink)}
 .cc-pause:focus-visible~.cc-film .cc-pbtn{outline:3px solid var(--accent);outline-offset:2px}
 .cc-pause:checked~.cc-film .cc-p1,.cc-pause:not(:checked)~.cc-film .cc-p2{display:none}
 .cc-pause:checked~.cc-film *{animation-play-state:paused!important}
}
@media (max-width:520px){.cc-stage{min-height:400px!important}.cc-meter{grid-template-columns:repeat(10,1fr)}}
@keyframes ccScene{0%{opacity:0;transform:translateY(6px)}1.6%{opacity:1;transform:none}15.2%{opacity:1}16.4%{opacity:0}100%{opacity:0}}
@keyframes ccGrow{0%{transform:scaleX(0)}5%{transform:scaleX(1)}100%{transform:scaleX(1)}}
@keyframes ccPop{0%{opacity:0}1%{opacity:1}100%{opacity:1}}
@keyframes ccFill{0%{width:0}8%{width:72%}100%{width:72%}}
@keyframes ccProg{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
</style>`;
  return `${css}
<input type="checkbox" id="cc-pause" class="cc-pause" aria-label="Pause the short film">
<div class="cc-film" aria-label="How County Commons works, in six steps">
<div class="cc-stage">
${scenes.map(([h, vis], i) => `<div class="cc-scene" style="animation-delay:${i * SCENE}s"><div class="eyebrow" style="margin:0 0 4px">${i + 1} of ${N}</div><h3>${h}</h3><div aria-hidden="true">${vis}</div></div>`).join('\n')}
</div>
<div class="cc-ctl"><span class="cc-prog" aria-hidden="true"><b></b></span><label for="cc-pause" class="cc-pbtn"><span class="cc-p1">❚❚ Pause</span><span class="cc-p2">▶ Play</span></label></div>
</div>`;
}

// What you can do here — one line each, linking to the real pages.
function doCards(featuredCount) {
  const card = (href, h, p) => `<a href="${href}" class="cc-card"><b>${h}</b><span>${p}</span></a>`;
  return `<style>.cc-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:10px 0 0}.cc-card{display:block;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);text-decoration:none;padding:12px 14px}.cc-card:hover,.cc-card:focus-visible{background:var(--paper)}.cc-card b{display:block;font-size:16.5px;margin-bottom:4px}.cc-card span{font-size:14px;color:var(--ink-soft);line-height:1.4}</style>
<div class="cc-cards">
${card('https://clarkar.countycommons.us/budget', 'Follow the money', 'Every budget line, biggest first, each one linked to the page it came from. See Clark County’s.')}
${card('/us/transparency', 'Check what your county posts', '30 facts, from the budget to every payment and every vote. Who meets each bar.')}
${card('/us/ask', 'Ask for what’s missing', 'Sign a petition for your county, or print one precise public records request.')}
${card('/us/ar/clark/compare', 'Compare with your neighbors', 'Each budget line beside counties of the same size, your state and the nation.')}
${card('/us/ar/clark', 'Votes, water and jails', 'Every county page: elections, drinking water, the jail, the budget and open questions.')}
${card('/us/petitions', 'Petitions', 'Started by residents, delivered to officials at a goal, with the answer posted.')}
</div>`;
}

module.exports = { heroFilm, doCards };
