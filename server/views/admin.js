const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The county admin — where a local host runs their own county. Guarded by
// requireAdmin (an 8-char host code for THIS county). Every save is scoped to
// this tenant's overlay and logged to the public chain by name. This is the
// first slice (calendar / community events); new capabilities follow the same
// pattern per docs/COUNTY-CODE.md.

function shell(county, title, body) {
  return layout({
    title: `${title} — ${county.platform_name} admin`,
    current: '/admin', county,
    body: `<div class="crumb"><a href="/admin">County admin</a> · <a href="/">view the site</a></div>${body}`,
    description: 'County Commons host admin.'
  });
}

function adminDashboard(data, hostName) {
  const { county } = data;
  const tile = (href, name, desc, ready) => `
<a href="${ready ? href : '#'}" style="text-decoration:none;color:var(--ink);flex:1;min-width:220px;border:2px solid var(--ink);background:var(--card);padding:16px;display:block;${ready ? '' : 'opacity:.5;pointer-events:none'}">
  <div style="font-family:var(--mono);font-weight:600;font-size:15px">${esc(name)}</div>
  <p style="font-size:13px;color:var(--ink-soft);margin:6px 0 0">${esc(desc)}</p>
  ${ready ? '<span class="chip c-ok" style="margin-top:8px;display:inline-block">Edit →</span>' : '<span class="chip" style="margin-top:8px;display:inline-block">Soon</span>'}
</a>`;
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)} · host admin</div>
  <h1>Your county</h1>
  <div class="src">You're signed in as a host of ${esc(county.name)}${hostName ? `, ${esc(hostName)}` : ''}. You can shape your county's content here — every change is scoped to your county and stamped in the public record by name. The shared frame (how money is cited, how votes are counted, the privacy rules) stays fixed for everyone.</div>
</header>
<section>
<h2>What you can edit</h2>
<div style="display:flex;gap:10px;flex-wrap:wrap">
  ${tile('/admin/calendar', 'Calendar & community events', 'Add local events, edit the calendar intro. Meeting times come from the sourced record.', true)}
  ${tile('#', 'Help Finder', 'Add and edit local assistance listings.', false)}
  ${tile('#', 'Questions', 'Open and close questions residents vote on.', false)}
  ${tile('#', 'Page copy', 'Reword the headline and section text for your county.', false)}
</div>
<p class="src" style="margin-top:12px">More capabilities are being added — each follows the same pattern (see the ground rules). Tell us what your county needs next.</p>
</section>
<section>
<h2>House rules <span class="sub">— the frame everyone builds inside</span></h2>
<p class="src">Your edits live in your county's own space and never touch another county. What you can't change — because it protects everyone — is how numbers are cited to their source, how votes are counted and kept private, and the charter lines (no candidates, no ballot measures, no questions about a named person's conduct). Every save here is logged publicly by your name.</p>
</section>`;
  return shell(county, 'Your county', body);
}

function adminCalendar(data, opts = {}) {
  const { county, calendar } = data;
  const listings = (calendar && calendar.community && calendar.community.listings) || [];
  const intro = (calendar && calendar.intro) || '';
  const field = 'font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);width:100%;box-sizing:border-box';

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)} · host admin · calendar</div>
  <h1>Calendar &amp; community events</h1>
  <div class="src">Add local events neighbors are doing together, and edit the calendar's opening line. Meeting times for the quorum court and city board come from the sourced record and aren't edited here.</div>
</header>
${opts.saved ? `<p class="src" style="color:var(--sourced)"><b>Saved ✓</b> — live on your county's <a href="/calendar">calendar</a> now.</p>` : ''}

<section>
<h2>Calendar intro</h2>
<form method="POST" action="/admin/calendar/intro" style="max-width:640px">
  <textarea name="intro" rows="3" maxlength="600" style="${field}">${esc(intro)}</textarea>
  <button type="submit" style="margin-top:8px;font-family:var(--mono);font-size:13px;padding:8px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer">Save intro</button>
</form>
</section>

<section>
<h2>Community events <span class="sub">— ${listings.length} listed</span></h2>
${listings.length ? listings.map((e, i) => `
<div class="issue" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
  <div><b>${esc(e.name || '')}</b>${e.date ? ` · <span class="src">${esc(e.date)}</span>` : ''}${e.place ? `<br><span class="src">${esc(e.place)}</span>` : ''}${e.note ? `<p class="src" style="margin:4px 0 0">${esc(e.note)}</p>` : ''}</div>
  <form method="POST" action="/admin/calendar/event/remove" style="flex:none"><input type="hidden" name="index" value="${i}"><button type="submit" style="font-family:var(--mono);font-size:12px;padding:6px 10px;border:1.5px solid var(--dead);color:var(--dead);background:var(--card);cursor:pointer">Remove</button></form>
</div>`).join('') : '<p class="src">No community events yet. Add the first one below.</p>'}
</section>

<section>
<h2>Add an event</h2>
<form method="POST" action="/admin/calendar/event/add" style="max-width:640px;display:flex;flex-direction:column;gap:10px">
  <label style="font-size:13.5px">Name<input name="name" required maxlength="120" placeholder="Fall recycling drive" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Date &amp; time<input name="date" maxlength="80" placeholder="Saturday, Oct 18, 9am–1pm" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Place<input name="place" maxlength="120" placeholder="Feaster Park, Arkadelphia" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Note <span class="src">(optional)</span><input name="note" maxlength="240" placeholder="Bring cardboard and electronics." style="${field};margin-top:4px"></label>
  <button type="submit" style="font-family:var(--mono);font-size:13px;padding:9px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer;align-self:flex-start">Add event</button>
</form>
<p class="src" style="margin-top:10px">Listings are free and stay free. Every add or remove is stamped in the public record by your name.</p>
</section>`;
  return shell(county, 'Calendar', body);
}

module.exports = { adminDashboard, adminCalendar };
