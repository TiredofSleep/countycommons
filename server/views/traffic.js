const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The traffic page, published on purpose. It shows exactly what we record and
// nothing more: page views per county per day. The point of putting it in
// public is the same as the cost log — if we're going to count anything, the
// count itself is open, and it's provably not a surveillance record because
// there's nothing here but sums.

function trafficPage(data, sum, reg) {
  const { county } = data;
  const tenants = (reg && reg.tenants) || {};
  const nameOf = k => (tenants[k] && tenants[k].name) || k;

  // Lifetime totals, biggest first — the "which counties draw eyes" view.
  const totals = Object.entries(sum.totalsByCounty || {})
    .sort((a, b) => b[1] - a[1]);
  const totalRows = totals.length
    ? totals.map(([k, n]) => `<tr><td>${esc(nameOf(k))}</td><td class="num">${n.toLocaleString('en-US')}</td></tr>`).join('')
    : `<tr><td class="src" colspan="2">No page views recorded yet.</td></tr>`;

  // Per-day, newest first. Each day lists its counties compactly.
  const dayRows = (sum.days || []).map(d => {
    const per = Object.entries(d.byCounty).sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${esc(nameOf(k).replace(/, Arkansas$/, ''))} ${n}`).join(' · ');
    return `<tr><td style="white-space:nowrap">${esc(d.date)}</td><td class="num">${d.total.toLocaleString('en-US')}</td><td class="src">${per || '—'}</td></tr>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.platform_name)} · the traffic log</div>
  <h1>How much this is looked at</h1>
  <div class="src">What we count, published: how many pages each county got by day, plus — in a single word — where a visit came from (a search engine, a link from Facebook, or direct), what kind of software asked (a browser type like “Safari · phone,” a search crawler, or an AI assistant), and whether it was a bot. We read the browser's referer and user-agent to sort a view into buckets like "Facebook" and "Safari · phone," then throw the details away: we keep the buckets, <b>never the full address, never an IP, never a cookie, nothing tied to a person</b> — by us or by anyone who ever gets hold of the file. It can tell you which counties people read and roughly how they found us; it cannot tell anyone who they were, because we never wrote that down. This is the surveillance we refuse, made auditable: there's nothing here but sums.</div>
</header>

<section>
<h2>Total page views by county <span class="sub">${sum.since ? `— since ${esc(sum.since)}` : ''}</span></h2>
<table class="plain">
<thead><tr><th>County</th><th class="num">Page views</th></tr></thead>
<tbody>${totalRows}</tbody>
</table>
<p class="src">Lifetime total across every county: <b>${(sum.lifetimeTotal || 0).toLocaleString('en-US')}</b> page views.${sum.updated ? ` Last counted ${esc(sum.updated.slice(0, 16).replace('T', ' '))} UTC.` : ''}</p>
</section>

<section>
<h2>Where visitors come from <span class="sub">— human views, by source</span></h2>
${(() => {
  const srcs = Object.entries(sum.totalsBySource || {}).sort((a, b) => b[1] - a[1]);
  const hum = srcs.reduce((a, [, n]) => a + n, 0);
  if (!hum && !sum.botTotal) return '<p class="src">No sources recorded yet — this starts counting from the update that added it.</p>';
  const rows = srcs.map(([s, n]) => `<tr><td>${esc(s)}</td><td class="num">${n.toLocaleString('en-US')}</td><td class="num">${hum ? Math.round((n / hum) * 100) : 0}%</td></tr>`).join('');
  return `<table class="plain"><thead><tr><th>Source</th><th class="num">Views</th><th class="num">Share</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="src"><b>${hum.toLocaleString('en-US')}</b> human views by source. Separately, <b>${(sum.botTotal || 0).toLocaleString('en-US')}</b> views were from bots and crawlers (search engines, link-preview scrapers) — counted apart so they don't inflate the human numbers. "Direct" means no referring link (typed, bookmarked, or an app that strips referrers — the Facebook app usually does); "Internal" means a click within the network. A link posted with a tag like ?via=fb is counted under where it was posted (here, "Facebook post") — the tag names the post, never the person.</p>`;
})()}
</section>

${(() => {
  const recent = (sum.days || []).slice(0, 7).filter(d => d.byAgent);
  if (!recent.length) return '';
  const add = (k) => { const m = {}; for (const d of recent) for (const [a, n] of Object.entries(d[k] || {})) m[a] = (m[a] || 0) + n; return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const all = add('byAgent'), direct = add('directByAgent');
  const tot = (l) => l.reduce((s, [, n]) => s + n, 0);
  const table = (l, head) => { const t = tot(l); return `<table class="plain"><thead><tr><th>${head}</th><th class="num">Views</th><th class="num">Share</th></tr></thead><tbody>${l.slice(0, 15).map(([a, n]) => `<tr><td>${esc(a)}</td><td class="num">${n.toLocaleString('en-US')}</td><td class="num">${t ? Math.round(n / t * 100) : 0}%</td></tr>`).join('')}</tbody></table>`; };
  return `
<section id="software">
<h2>What asked for the pages <span class="sub">— last ${recent.length} day${recent.length === 1 ? '' : 's'}</span></h2>
<p>Every page request names the software asking for it. We sort that into one label from a fixed list — a browser and a device type, a search engine's crawler, or an AI assistant fetching a page because someone asked it a question — and keep only the label. No version numbers (just whether a browser is years out of date, a common sign of a script pretending to be a person), no IP, nothing about who.</p>
${table(all, 'Everything that asked')}
${direct.length ? `<h3 style="margin-top:14px">Visits with no referring link (“Direct”)</h3>
<p class="src" style="max-width:none">The visits that arrive without saying where they came from — typed, bookmarked, opened from an app that hides the link, or fetched by software.</p>
${table(direct, 'Direct visits')}` : ''}
<p class="src" style="max-width:none">Started counting ${esc(recent[recent.length - 1].date)}. AI assistants that fetch a page for someone's question are labeled apart from AI training crawlers (GPTBot, ClaudeBot); in the totals above, any that name themselves a bot are counted with the bots, so human numbers stay on the low side.</p>
</section>`;
})()}

<section>
<h2>By day <span class="sub">— last ${(sum.days || []).length} day${(sum.days || []).length === 1 ? '' : 's'}</span></h2>
<table class="plain">
<thead><tr><th>Day (UTC)</th><th class="num">Views</th><th>By county</th></tr></thead>
<tbody>${dayRows || '<tr><td class="src" colspan="3">Nothing counted yet.</td></tr>'}</tbody>
</table>
</section>

<section>
<h2>Why it's built this way</h2>
<p class="src">A normal analytics tool logs your address, your device, and every page you touch, then sells the pattern. This platform is a transparency engine, not a watcher. Counting <em>how many</em> without <em>who</em> is enough to see whether the work is reaching people — and it's the most a project that asks you to trust it should ever keep. See also <a href="/never">what we will never do</a> and <a href="/security">how this is secured</a>.</p>
</section>`;

  return layout({
    title: `Traffic — ${county.platform_name}`, current: '/traffic', body, county,
    description: 'How many pages each county gets, by day — with no IPs, no cookies, and nothing tied to a person. The surveillance we refuse, made auditable.'
  });
}

module.exports = { trafficPage };
