const fs = require('fs');
const path = require('path');
const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The network directory — the map of the whole platform, across every state it
// serves. Once a resident is inside (any county's PIN is a key to all of them),
// this is how they walk to any other county. Live counties have an ingested
// budget; Arkansas also has gated starter sites, ready for a local host.

const ROOT = path.join(__dirname, '..', '..');
let LIST = { counties: [] };
try {
  LIST = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'counties-ar.json'), 'utf8'));
} catch (e) { /* directory renders empty rather than crashing */ }

function readConfig(t) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, t.configPath), 'utf8')); }
  catch (e) { return null; }
}

function countiesPage(data, reg) {
  const { county } = data;
  const tenants = (reg && reg.tenants) || {};
  const base = (reg && reg.baseDomain) || 'countycommons.us';
  const counties = (LIST.counties || []).slice();
  const arSlugs = new Set(counties.map(c => c.slug));

  // A county is "live" if it's a served tenant AND has real ingested data
  // (featured). A served-but-not-featured tenant is a gated starter site
  // waiting for a host. Anything not yet a tenant is simply not set up.
  const statusOf = (c) => {
    const served = !!tenants[c.slug];
    if (c.featured) return served ? 'live' : 'pending';
    return served ? 'starter' : 'pending';
  };
  const hostOf = (c) => (tenants[c.slug] && tenants[c.slug].host) || `${c.slug}.${base}`;

  const rest = counties.filter(c => statusOf(c) !== 'live')
    .sort((a, b) => a.name.localeCompare(b.name));

  // Out-of-state live hosts — served tenants that aren't in the Arkansas list
  // (Middlesex MA, Bastrop TX, and any future host). Pull their state/seat/pop
  // from each one's own config so the directory stays honest and multi-state.
  const otherLive = Object.entries(tenants)
    .filter(([key]) => !arSlugs.has(key))
    .map(([key, t]) => {
      const cfg = readConfig(t) || {};
      return { host: t.host, name: cfg.name || t.name || key, state: cfg.state || '', seat: cfg.seat || '', pop: cfg.population || null };
    })
    .sort((a, b) => (a.state || '').localeCompare(b.state || '') || a.name.localeCompare(b.name));

  // Every live county across states, as unified cards.
  const liveItems = counties.filter(c => statusOf(c) === 'live')
    .map(c => ({ host: hostOf(c), name: c.name, state: 'Arkansas', seat: c.seat, pop: c.pop }))
    .concat(otherLive)
    .sort((a, b) => (a.state || '').localeCompare(b.state || '') || (b.pop || 0) - (a.pop || 0));

  const liveCard = (c) => `
<a class="issue" style="display:block;text-decoration:none;border-left:3px solid var(--accent)" href="https://${esc(c.host)}" rel="noopener">
  <b style="font-size:16px">${esc(c.name)}</b>
  <span class="chip c-ok" style="margin-left:8px">✓ live</span>
  <span class="src" style="margin-left:8px">${esc(c.state)}</span>
  <p class="src" style="margin:6px 0 0">${c.seat ? esc(c.seat) + ' · ' : ''}${c.pop ? c.pop.toLocaleString('en-US') + ' residents · ' : ''}budget ingested and navigable →</p>
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

  const states = Array.from(new Set(liveItems.map(c => c.state).filter(Boolean)));
  const statesPhrase = states.length <= 1 ? (states[0] || 'the country')
    : states.slice(0, -1).join(', ') + ' and ' + states[states.length - 1];
  const arCompare = liveItems.filter(c => c.state === 'Arkansas').length >= 2;

  const body = `
<header class="page">
  <div class="eyebrow">County Commons · the network</div>
  <h1>Every county, one platform</h1>
  <div class="src">County Commons is opening county by county — now live in ${esc(statesPhrase)}. You're already inside: a PIN for any one county is a key to all of them, so you can walk any county's budget, questions, and calendar from here. Same rules everywhere: every number cited to its source, no verdicts, direct participation alongside the republic.</div>
</header>

<section>
<h2>Live now <span class="sub">— budgets ingested, itemized, cross-footed</span></h2>
${liveItems.length ? liveItems.map(liveCard).join('') : '<p class="src">None yet.</p>'}
${arCompare ? `<p class="src" style="margin-top:10px">Compare the Arkansas counties side by side, per resident: <a href="/compare/counties">how counties spend</a>.</p>` : ''}
</section>

<section>
<h2>The rest of Arkansas <span class="sub">— gated starter sites, ready for a local host</span></h2>
<p class="src">Each county below already has its own site behind its own PIN — a place for its budget to be ingested and its questions to open. A <b>starter site</b> is standing and waiting for someone local to run it; that's exactly what this project is for. Want yours? <a href="/participate">Bring your county on</a>.</p>
<table class="plain">
<thead><tr><th>County</th><th>Seat</th><th class="num">Residents (2020)</th></tr></thead>
<tbody>${rest.map(restRow).join('')}</tbody>
</table>
<p class="src">${counties.length} counties · population is the 2020 U.S. Census.</p>
</section>`;

  return layout({
    title: `Every county — ${county.platform_name}`, current: '/counties', body, county,
    description: `The County Commons network, across ${esc(statesPhrase)}: live counties and gated starter sites — walk any of them from here.`
  });
}

module.exports = { countiesPage };
