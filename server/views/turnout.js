const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Voter turnout — who actually decides. Official counts only: registered voters,
// ballots cast, and the share that voted. Nothing here is about candidates or
// how anyone voted. State files are shared (one per state); a county's local
// elections come from its own turnout-local.json when researched.

const n = (x) => Number(x).toLocaleString('en-US');

function turnoutPage(data) {
  const { county, turnout: t, turnoutLocal: loc } = data;
  const key = county.name.replace(/ County$/, '');
  const cite = (s) => s && s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : '';
  const bar = (pct, tone) => `<div style="background:var(--rule-soft);height:10px;max-width:260px"><div style="width:${Math.min(100, pct)}%;height:10px;background:var(--${tone || 'accent'})"></div></div>`;

  let body;
  if (!t || !t.elections.some(e => e.counties[key])) {
    body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · voter turnout</div>
  <h1>Who shows up to vote</h1>
  <div class="src">We haven’t gathered ${esc(county.state)}’s official turnout counts yet — not gathered, not hidden. Your state’s election office publishes them after every election.</div>
</header>`;
  } else {
    const when = (e) => Date.parse((e.name.match(/^[A-Z][a-z]{2} \d+, \d{4}/) || ['Jan 1, 2000'])[0]);
    const els = t.elections.filter(e => e.counties[key]).slice().sort((a, b) => when(b) - when(a));
    const rows = els.map(e => {
      const c = e.counties[key], s = e.statewide;
      const all = Object.entries(e.counties).sort((a, b) => b[1].pct - a[1].pct);
      const rank = all.findIndex(([k]) => k === key) + 1;
      return `<tr><td><b>${esc(e.name)}</b><br><span class="soft" style="font-size:12.5px">${n(c.ballots)} of ${n(c.registered)} registered voters${all.length > 10 ? ` · ${rank} of ${all.length} counties` : ''}</span></td>
<td><b class="num">${c.pct.toFixed(1)}%</b>${bar(c.pct)}<span class="soft" style="font-size:12px">statewide ${s.pct.toFixed(1)}%</span>${bar(s.pct, 'ink-soft')}</td></tr>`;
    }).join('');
    const big = t.elections.find(e => Object.keys(e.counties).length > 10);
    let spread = '';
    if (big) {
      const all = Object.entries(big.counties).sort((a, b) => b[1].pct - a[1].pct);
      const top = all.slice(0, 3).map(([k, v]) => `${esc(k)} ${v.pct.toFixed(1)}%`).join(', ');
      const bot = all.slice(-3).reverse().map(([k, v]) => `${esc(k)} ${v.pct.toFixed(1)}%`).join(', ');
      spread = `<p style="font-size:14px">Across ${esc(county.state)} in the ${esc(big.name)}: highest turnout — ${top}. Lowest — ${bot}.</p>`;
    }
    // Compare a general election with the primary held the same year.
    const general = els.find(e => /general/i.test(e.id) && els.some(p => /primary/i.test(p.id) && p.id.slice(0, 4) === e.id.slice(0, 4)));
    const primary = general && els.find(p => /primary/i.test(p.id) && p.id.slice(0, 4) === general.id.slice(0, 4));
    const gap = general && primary ? `<p>In ${esc(county.name)}, ${n(general.counties[key].ballots)} people voted in the ${esc(general.name)} — and ${n(primary.counties[key].ballots)} in the ${esc(primary.name)}: about ${Math.round(primary.counties[key].ballots / general.counties[key].ballots * 100)} primary voters for every 100 general-election voters.</p>` : '';

    const local = loc ? `
<section id="local">
<h2>Local elections <span class="sub">— where a few voters decide a lot</span></h2>
${loc.elections.map(e => `
<div class="issue" style="display:block">
  <div class="eyebrow" style="margin:0 0 4px">${esc(e.date)}</div>
  <b>${esc(e.name)}</b>
  <p style="font-size:14px;margin:6px 0">${esc(e.text)}</p>
  ${e.pct !== undefined ? `<b class="num">${e.pct}%</b> ${bar(e.pct)}` : ''}
  <p class="src" style="max-width:none">${(e.src || []).map(cite).join(' · ')}</p>
</div>`).join('')}
${loc.note ? `<p class="src" style="max-width:none">${esc(loc.note)}</p>` : ''}
</section>` : '';

    body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · voter turnout</div>
  <h1>Who shows up to vote</h1>
  <div class="src">Every budget, bond, and tax on this site was decided by people elected — or a measure passed — by whoever voted. These are the official counts: registered voters, ballots cast, and the share that voted. Nothing here is about candidates or how anyone voted.</div>
</header>

<section id="county">
<h2>${esc(county.name)} <span class="sub">— share of registered voters who voted</span></h2>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${rows}</tbody></table></div>
${gap}
${spread}
<p class="src" style="max-width:none">Source: ${esc(t.source_url.split(' (')[0])} — retrieved ${esc(t.retrieved)}. Turnout is ballots cast divided by registered voters; people who aren’t registered aren’t counted at all.</p>
</section>
${local}

<section id="check">
<h2>Check your own registration</h2>
<ul>${(t.check || []).map(x => `<li>${esc(x.text)} <span class="src">${cite(x)}</span></li>`).join('')}</ul>
<p class="src">Related: <a href="/issues">The votes on this site</a> · <a href="/calendar">The calendar</a> · <a href="/taxes">Taxes &amp; debt</a>. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;
  }

  return layout({
    title: `Voter turnout — ${county.platform_name}`, current: '/elections', body, county,
    description: `How many registered voters in ${county.name} actually voted — official counts for recent elections, against the statewide turnout and other counties.`
  });
}

module.exports = { turnoutPage };
