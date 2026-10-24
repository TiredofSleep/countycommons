const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const B = require('../lib/building');

// Still building: proof of life. What changed lately across County Commons,
// what readers helped fix, and how many notes have come in — so a visitor can
// see this is maintained by people who read what they send.

function buildingPage(data) {
  const { county } = data;
  const site = data.tenantKey || null;
  const fixes = B.corrections().filter(c => !c.site || c.site === site).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const notes = B.noteStats();
  const ups = B.updates().slice(0, 50);
  const byDay = []; for (const u of ups) { const g = byDay[byDay.length - 1]; if (g && g.date === u.date) g.items.push(u.what); else byDay.push({ date: u.date, items: [u.what] }); }
  const nice = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const btn = 'font-family:var(--mono);font-size:14px;font-weight:600;padding:9px 14px;border:1.5px solid var(--ink);color:var(--ink);background:var(--card);text-decoration:none';
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.platform_name)} · still building</div>
  <h1>Still building — what’s new, and what you helped fix</h1>
  <div class="src">County Commons is a small, independent project built in public, one record at a time. Here’s what changed lately across every county site, and the fixes that came from readers. ${ups.length ? `Last update: <b>${esc(nice(ups[0].date))}</b>.` : ''}</div>
</header>
<section>
<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <b>Help keep ${esc(county.name)}’s pages honest</b>
  <p style="margin:4px 0 10px">You know this county better than any record does. If a number, name or date is wrong, something’s missing, or you have a document we should read, tell us. A person reads every note, and every fix is listed below.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><a href="/feedback?kind=correction&from=/building" style="${btn}">Correct something</a><a href="/feedback?kind=add&from=/building" style="${btn}">Add information</a><a href="/feedback?kind=document&from=/building" style="${btn}">Send a document</a></div>
</div>
</section>
<section id="requested">
<h2>Built for every county <span class="sub">— the most-requested go next</span></h2>
<p>County Commons is built out furthest for <a href="https://clarkar.countycommons.us/">Clark County, Arkansas</a>: the budget line by line, audits, petitions, offices and more. Every U.S. county has a starting page, and we build more for any county on request. Each request is counted here; the counties with the most requests get built next.</p>
${(() => { const rows = B.requestRows(); return rows.length ? `<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>County</th><th class="num">Requests</th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="${esc(r.url)}">${esc(r.label)}</a></td><td class="num">${r.n}</td></tr>`).join('')}</tbody></table></div>` : '<p class="src">No requests yet — yours would be the first.</p>'; })()}
<p><a href="/feedback?kind=request&from=/building" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:9px 14px;border:1.5px solid var(--ink);color:var(--ink);background:var(--card);text-decoration:none">Request more for a county</a></p>
</section>
<section id="fixed">
<h2>Fixed thanks to readers <span class="sub">— ${fixes.length}</span></h2>
${fixes.length ? fixes.map(f => `<div class="issue" style="display:block"><span class="eyebrow">${esc(f.date || '')}</span><p style="margin:4px 0 0">${esc(f.what)}</p><p class="src" style="margin:4px 0 0">${f.page ? `On <a href="${esc(f.page)}">${esc(f.page)}</a>` : ''}${f.credit ? ` · thanks to ${esc(f.credit)}` : ' · thanks to a reader'}</p></div>`).join('') : `<p>None yet. The first one could be yours — <a href="/feedback?kind=correction&from=/building">tell us what’s wrong</a>.</p>`}
<p class="src">Notes received so far across all county sites: <b>${notes.total}</b>${notes.month ? ` (${notes.month} in the last 30 days)` : ''}. Counts only — notes themselves stay private. A note is a lead, not an edit: we check it against the record before changing anything.</p>
</section>
<section id="updates">
<h2>Recent updates <span class="sub">— across every county site</span></h2>
${byDay.map(g => `<p style="margin:12px 0 2px"><b>${esc(nice(g.date))}</b></p><ul style="margin:0 0 0 18px">${g.items.map(w => `<li style="font-size:14.5px">${esc(w)}</li>`).join('')}</ul>`).join('') || '<p>Updates will appear here.</p>'}
<p class="src">Straight from the project’s change history. Every change is public: the code is open at <a href="https://github.com/TiredofSleep/countycommons" rel="noopener">github.com/TiredofSleep/countycommons</a>.</p>
</section>`;
  return layout({
    title: `Still building: what's new on ${county.platform_name}, and fixes from readers`,
    current: '/building', body, county,
    description: `What changed lately on County Commons and ${county.name}'s pages, the corrections readers sent in, and how to help keep it honest.`
  });
}

module.exports = { buildingPage };
