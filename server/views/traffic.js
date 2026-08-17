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
  <div class="src">The one thing we count, published: how many pages each county got, by day. That's the whole record. <b>No IP addresses. No cookies. No user agents. Nothing tied to a person</b> — by us or by anyone who ever gets hold of the file. It can tell you which counties people are reading; it cannot tell anyone who read them, because we never wrote that down. This is the surveillance we refuse, made auditable: there's nothing here but sums.</div>
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
