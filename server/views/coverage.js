const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const { PILLARS, all } = require('../lib/coverage');

// How complete is this county? Every county gets the same six pillars; this page
// shows which are filled in here, and across the whole network, so the gaps are
// a public to-do list.

const MARK = { done: ['●', 'c-ok', 'done'], partial: ['◐', 'c-part', 'partly'], none: ['○', 'c-dead', 'not yet'] };

function coveragePage(data, tenantKey) {
  const { county } = data;
  const rows = all();
  const me = rows.find(r => r.key === tenantKey);
  const chip = (st) => `<span class="chip ${MARK[st][1]}" title="${MARK[st][2]}">${MARK[st][0]} ${MARK[st][2]}</span>`;

  const mine = me ? PILLARS.map(p => {
    const [st, note] = me.status[p.id];
    return `<tr><td><a href="${p.href}"><b>${esc(p.label)}</b></a></td><td>${chip(st)}</td><td class="soft" style="font-size:13px">${esc(note)}</td></tr>`;
  }).join('') : '';

  const counts = PILLARS.map(p => rows.filter(r => r.status[p.id][0] === 'done').length);
  const table = rows.map(r => `<tr><td><a href="https://${esc(r.host)}/coverage">${esc(r.name)}</a><br><span class="soft" style="font-size:12px">${esc(r.state)}</span></td>${PILLARS.map(p => `<td style="text-align:center" title="${esc(p.label)}: ${esc(r.status[p.id][1])}">${MARK[r.status[p.id][0]][0]}</td>`).join('')}</tr>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · how complete</div>
  <h1>How complete is this county?</h1>
  <div class="src">Every county site is built on the same six pillars. Some are filled in; some aren’t yet. A gap means not gathered yet — never hidden. This page is the to-do list, in public.</div>
</header>

<section>
<h2>${esc(county.name)} <span class="sub">— the six pillars</span></h2>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${mine}</tbody></table></div>
<p class="src">● done &nbsp; ◐ partly &nbsp; ○ not yet. Know where a missing document is? <a href="/feedback">Tell us</a>.</p>
</section>

<section>
<h2>Every county <span class="sub">— ${rows.length} sites</span></h2>
<p class="src" style="max-width:none">Done across the network: ${PILLARS.map((p, i) => `${esc(p.label)} ${counts[i]}`).join(' · ')}.</p>
<div style="overflow-x:auto;max-width:100%"><table class="plain" style="font-size:13px">
<thead><tr><th>County</th>${PILLARS.map(p => `<th style="text-align:center;font-size:11px">${esc(p.label)}</th>`).join('')}</tr></thead>
<tbody>${table}</tbody></table></div>
</section>`;

  return layout({
    title: `How complete is this county? — ${county.platform_name}`, current: '/coverage', body, county,
    description: `Which of the six pillars — the votes, the budget, water, jails and prisons, dead ends and open questions, and research — are filled in for ${county.name}, and for every county in the network.`
  });
}

module.exports = { coveragePage };
