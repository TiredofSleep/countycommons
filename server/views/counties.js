const fs = require('fs');
const path = require('path');
const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The county directory — the map of the whole network. Once a resident is
// inside (any county's PIN is a key to all of them), this is how they walk to
// any other county or see the whole state at a glance. Live counties have an
// ingested budget; the rest are gated starter sites, ready for a local host.

let LIST = { counties: [] };
try {
  LIST = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'counties-ar.json'), 'utf8'));
} catch (e) { /* directory renders empty rather than crashing */ }

function countiesPage(data, reg) {
  const { county } = data;
  const tenants = (reg && reg.tenants) || {};
  const base = (reg && reg.baseDomain) || 'countycommons.us';
  const counties = (LIST.counties || []).slice();

  // A county is "live" if it's a served tenant AND has real ingested data
  // (featured). A served-but-not-featured tenant is a gated starter site
  // waiting for a host. Anything not yet a tenant is simply not set up.
  const statusOf = (c) => {
    const served = !!tenants[c.slug];
    if (c.featured) return served ? 'live' : 'pending';
    return served ? 'starter' : 'pending';
  };
  const hostOf = (c) => (tenants[c.slug] && tenants[c.slug].host) || `${c.slug}.${base}`;

  const live = counties.filter(c => statusOf(c) === 'live');
  const rest = counties.filter(c => statusOf(c) !== 'live')
    .sort((a, b) => a.name.localeCompare(b.name));

  const liveCard = (c) => `
<a class="issue" style="display:block;text-decoration:none;border-left:3px solid var(--accent)" href="https://${esc(hostOf(c))}" rel="noopener">
  <b style="font-size:16px">${esc(c.name)}</b>
  <span class="chip c-ok" style="margin-left:8px">✓ live</span>
  <p class="src" style="margin:6px 0 0">${esc(c.seat)} · ${c.pop.toLocaleString('en-US')} residents · budget ingested and navigable →</p>
</a>`;

  const restRow = (c) => {
    const st = statusOf(c);
    const tag = st === 'starter'
      ? `<span class="chip c-part" style="margin-left:6px">◐ starter site</span>`
      : `<span class="chip c-dead" style="margin-left:6px">✖ not set up yet</span>`;
    // Starter sites are real, gated, and ready — link in. A not-yet-set-up
    // county still links to its honest "coming soon" page.
    return `
<tr>
  <td><a href="https://${esc(hostOf(c))}" rel="noopener">${esc(c.name)}</a>${tag}</td>
  <td class="src" style="white-space:nowrap">${esc(c.seat)}</td>
  <td class="num">${c.pop.toLocaleString('en-US')}</td>
</tr>`;
  };

  const body = `
<header class="page">
  <div class="eyebrow">County Commons · the network</div>
  <h1>Every county, one platform</h1>
  <div class="src">County Commons is opening county by county across ${esc(LIST.state || 'the state')}. You're already inside — a PIN for any one county is a key to all of them, so you can walk any county's budget, questions, and calendar from here. Same rules everywhere: every number cited to its source, no verdicts, direct participation alongside the republic.</div>
</header>

<section>
<h2>Live now <span class="sub">— budgets ingested, itemized, cross-footed</span></h2>
${live.length ? live.map(liveCard).join('') : '<p class="src">None yet.</p>'}
<p class="src" style="margin-top:10px">Compare them side by side, per resident: <a href="/compare/counties">how counties spend</a>.</p>
</section>

<section>
<h2>The rest of ${esc(LIST.state || 'the state')} <span class="sub">— gated starter sites, ready for a local host</span></h2>
<p class="src">Each county below already has its own site behind its own PIN — a place for its budget to be ingested and its questions to open. A <b>starter site</b> is standing and waiting for someone local to run it; that's exactly what this project is for. Want yours? <a href="/participate">Bring your county on</a>.</p>
<table class="plain">
<thead><tr><th>County</th><th>Seat</th><th class="num">Residents (2020)</th></tr></thead>
<tbody>${rest.map(restRow).join('')}</tbody>
</table>
<p class="src">${counties.length} counties · population is the 2020 U.S. Census.</p>
</section>`;

  return layout({
    title: `Every county — ${county.platform_name}`, current: '/counties', body, county,
    description: `The County Commons network: every ${esc(LIST.state || '')} county, live or awaiting a local host — walk any of them from here.`
  });
}

module.exports = { countiesPage };
