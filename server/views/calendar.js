const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The civic calendar — live, local, computed at render time from sourced
// recurrence rules. Listings state facts; there are no threads. This is the
// first graft of SCOPE.md: Front Porch Forum's informational value at zero
// moderation cost.

function upcoming(recurring, days) {
  const out = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let add = 0; add < days; add++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + add);
    for (const ev of recurring) {
      if (d.getDay() !== ev.rule.weekday) continue;
      const nth = Math.ceil(d.getDate() / 7);
      if (!ev.rule.nth.includes(nth)) continue;
      out.push({ date: d, ev });
    }
  }
  return out;
}

function calendarPage(data) {
  const { county, calendar } = data;
  const now = new Date();
  const items = upcoming(calendar.recurring, 70);
  const inSeason = calendar.seasonal.months.includes(now.getMonth());

  const rows = items.map(({ date, ev }) => {
    const isToday = date.toDateString() === now.toDateString();
    return `
<div class="issue" style="display:block${isToday ? ';border-color:var(--sourced);background:var(--sourced-bg)' : ''}">
  <b>${esc(date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))}${isToday ? ' — today' : ''}</b>
  <p style="font-size:14px;margin:4px 0 0"><b>${esc(ev.name)}</b> · ${esc(ev.time)} · decides ${esc(ev.decides)}</p>
  <p class="src">${esc(ev.place)}</p>
  <p class="src">${esc(ev.note)}</p>
  <p class="src" style="font-size:11px">Source: ${esc(ev.source)}</p>
</div>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · live and local</div>
  <h1>The calendar</h1>
  <div class="src">${esc(calendar.intro)}</div>
</header>

${inSeason ? `<div class="issue" style="display:block;border-color:var(--partial);background:var(--part-bg,var(--partial-bg))">
  <b>⏳ ${esc(calendar.seasonal.banner)}</b>
</div>` : ''}

<section>
<h2>Next 10 weeks <span class="sub">— computed fresh on every visit</span></h2>
${rows || '<p class="src">No meetings found in the window — which would be surprising; tell us.</p>'}
</section>

<section>
<h2>Being verified <span class="sub">— listed the moment they're confirmed</span></h2>
${calendar.unverified.map(u => `<p class="src"><b>${esc(u.name)}</b> — ${esc(u.note)}</p>`).join('')}
</section>

<section>
<h2>Community events <span class="sub">— neighbors' things belong here too</span></h2>
${calendar.community.listings.length
    ? calendar.community.listings.map(l => `<div class="issue" style="display:block"><b>${esc(l.name)}</b><p class="src">${esc(l.when)} · ${esc(l.place)}</p></div>`).join('')
    : ''}
<p class="src">${esc(calendar.community.invite)} <a href="/issues#ask">Send a listing</a>.</p>
</section>`;

  return layout({
    title: `The calendar — ${county.platform_name}`, current: '/calendar', body, county,
    description: `Every public meeting where ${county.name}'s decisions get made — dates computed live, rooms named, sources cited. Community events welcome.`
  });
}

module.exports = { calendarPage };
