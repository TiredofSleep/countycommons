const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Elections — how, when, and where to vote. Dates and rules are shared per state
// (data/corpus/elections-<state>.json); the county's own election office lives in
// its config, and what's on its own local ballot in elections-local.json. Every
// date carries its source and a live passed / open now / days-to-go mark.
// Bright line (NEVER.md): no candidates and no ballot measures are listed, rated,
// or recommended here — offices only, and a link to the official sample ballot.

const DAY = 86400000;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const asDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const long = (s) => asDate(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const short = (s) => asDate(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const daysUntil = (s, today) => Math.round((asDate(s) - asDate(today)) / DAY);

const cite = (x) => x && x.url ? `<a href="${esc(x.url)}" rel="noopener">${esc(x.label || x.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : '';
const srcLine = (list) => list && list.length ? `<p class="src" style="max-width:none;margin-top:4px">Source: ${list.map(cite).join(' · ')}</p>` : '';

function mark(d, today) {
  const start = d.date, end = d.end || d.date;
  if (end < today) return '<span class="chip">passed</span>';
  if (start <= today) return `<span class="chip c-ok">${d.end ? 'open now' : 'today'}</span>`;
  const n = daysUntil(start, today);
  return `<span class="chip c-part">in ${n} day${n === 1 ? '' : 's'}</span>`;
}

function electionsPage(data, now = new Date()) {
  const { county, elections: st, electionsLocal: loc } = data;
  const today = iso(now);
  const office = county.election_office || null;
  const place = county.name;

  const header = (lead) => `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · elections</div>
  <h1>Voting in ${esc(place)}</h1>
  <div class="src">${lead} This page never lists, rates, or recommends candidates or ballot measures — <a href="/never">a line this site holds</a>. For exactly what's on your ballot, use your official sample ballot.</div>
</header>`;

  const officeBlock = office ? `
<section id="where">
<h2>Where to vote <span class="sub">— ${esc(office.name)}</span></h2>
${office.early_voting ? `<p><b>Early voting:</b> ${esc(office.early_voting)}</p>` : ''}
${office.election_day ? `<p><b>Election Day:</b> ${esc(office.election_day)}</p>` : ''}
<p class="src" style="max-width:none">${[office.address, office.phone, office.hours].filter(Boolean).map(esc).join(' · ')}${office.url ? `${office.address || office.phone || office.hours ? ' · ' : ''}<a href="${esc(office.url)}" rel="noopener">${esc(office.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''}</p>
${srcLine(office.src)}
</section>` : `
<section id="where">
<h2>Where to vote</h2>
<p>Early-voting sites and polling places are set by your county's election office. We haven't gathered ${esc(place)}'s yet — not gathered, not hidden. ${st ? `Your state's lookup below shows your own polling place.` : `vote.gov leads to your state's lookup for your own polling place.`}</p>
</section>`;

  const related = `<p class="src">Related: <a href="/turnout">Who shows up to vote</a> · <a href="/participate">Who decides, and how to reach them</a> · <a href="/calendar">The calendar</a>. Spot an error? <a href="/feedback">Report it</a>.</p>`;

  const next = st && (st.elections || []).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!st || !next) {
    const body = `${header(`When, where, and how to vote in ${esc(place)}.`)}
<section>
<p>We haven't gathered ${esc(county.state)}'s ${st ? 'next ' : ''}election dates yet — not gathered, not hidden. Until we do, the federal site <a href="https://vote.gov" rel="noopener">vote.gov</a> links straight to your state's official registration and voting pages.</p>
</section>
${officeBlock}
<section>${related}</section>`;
    return layout({ title: `Elections — ${county.platform_name}`, current: '/elections', body, county,
      description: `When, where, and how to vote in ${county.name}.` });
  }

  const togo = daysUntil(next.date, today);
  const onBallot = loc && (loc.on_ballot || []).filter(b => b.election === next.id);
  const ballotBlock = onBallot && onBallot.length ? `
<h3 style="margin-top:14px">On the local ballot</h3>
${onBallot.map(b => `<p><b>${esc(b.body)}:</b> ${esc(b.text)}</p>${srcLine(b.src)}`).join('')}` : '';

  const dates = (next.dates || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map(d => `
<div class="issue" style="display:block">
  <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">${mark(d, today)} <span class="eyebrow">${esc(short(d.date))}${d.end ? ` – ${esc(short(d.end))}` : ''}</span></div>
  <b style="display:block;margin-top:4px">${esc(d.label)}</b>
  <p style="font-size:14px;margin:4px 0 0">${esc(d.detail)}</p>
  ${srcLine(d.src)}
</div>`).join('');

  const body = `${header(esc(st.intro || `When, where, and how to vote in ${place}.`))}

<section id="next">
<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <div class="eyebrow" style="color:var(--accent)">next election · ${togo === 0 ? 'today' : `${togo} day${togo === 1 ? '' : 's'} away`}</div>
  <h2 style="margin:4px 0">${esc(next.name)} — ${esc(long(next.date))}</h2>
  ${next.hours ? `<p>Polls are open <b>${esc(next.hours)}</b> local time.</p>` : ''}
  ${next.what ? `<p style="font-size:14px">${esc(next.what)}</p>` : ''}
  ${ballotBlock}
</div>
</section>

<section id="dates">
<h2>Key dates <span class="sub">— marked against today, ${esc(short(today))}</span></h2>
${dates}
<p class="src" style="max-width:none">Dates can change and counties can add early-voting days. When in doubt, your election office has the final word.</p>
</section>
${officeBlock}

${st.id_rule ? `<section id="id">
<h2>What to bring</h2>
<p>${esc(st.id_rule.text)}</p>
${srcLine(st.id_rule.src)}
</section>` : ''}

<section id="check">
<h2>Check your registration and your ballot</h2>
<ul>${(st.check || []).map(x => `<li>${esc(x.text)}${x.url ? ` <span class="src">${cite(x)}</span>` : ''}</li>`).join('')}</ul>
${related}
<p class="src" style="max-width:none">${esc(county.state)} dates gathered ${esc(st.updated || '')}.</p>
</section>`;

  return layout({
    title: `Elections — ${county.platform_name}`, current: '/elections', body, county,
    description: `When, where, and how to vote in ${county.name}: the next election, key deadlines, early voting, ID rules, and how to check your registration.`
  });
}

module.exports = { electionsPage };
