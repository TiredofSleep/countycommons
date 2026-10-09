const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Elections — how, when, and where to vote. Dates and rules are shared per state
// (data/corpus/elections-<state>.json); the county's own election office lives in
// its config, and what's on its own local ballot in elections-local.json. Every
// date carries its source and a live passed / open now / days-to-go mark.
// Bright line (NEVER.md, October 2026 amendment): candidates are listed, never
// rated or recommended — every candidate in a race the same way, alphabetical,
// with the money filings the law requires of them, sought for all alike.

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
  const { county, elections: st } = data;
  const today = iso(now);
  const office = county.election_office || null;
  const place = county.name;

  const header = (lead) => `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · elections</div>
  <h1>Voting in ${esc(place)}</h1>
  <div class="src">${lead} This page never rates or recommends a candidate or a ballot measure, and it shows every candidate in a race the same way — <a href="/never">a line this site holds</a>. For everything on your own ballot, use your official sample ballot.</div>
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

  // Local races: every candidate the same way — alphabetical by last name, the
  // same columns, and each required filing shown as filed or "not gathered
  // yet" for every candidate alike (NEVER.md, October 2026 amendment).
  const filingDefs = st.filings || [];
  const races = (county.races || []).filter(r => r.election === next.id);
  const lastName = (n) => String(n || '').trim().split(/\s+/).pop().toLowerCase();
  const filingCell = (c, f) => {
    const x = (c.filings || {})[f.id];
    return x && x.url ? `<a href="${esc(x.url)}" rel="noopener">${esc(x.label || 'filed')}</a>` : '<span class="chip">not gathered yet</span>';
  };
  const raceBlock = races.length ? `
<section id="races">
<h2>Local races <span class="sub">— the ones we've gathered</span></h2>
<p class="src" style="max-width:none">Every candidate in a race is shown the same way, alphabetical by last name. Nothing here rates or recommends anyone. Your sample ballot lists every race you can vote in.</p>
${races.map(r => {
    const cands = (r.candidates || []).slice().sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)));
    return `<div class="issue" style="display:block">
  <b>${esc(r.office)}</b>
  ${r.note ? `<p style="font-size:14px;margin:4px 0 8px">${esc(r.note)}</p>` : ''}
  <div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>Candidate</th><th>Party</th>${filingDefs.map(f => `<th>${esc(f.name)}</th>`).join('')}</tr></thead>
  <tbody>${cands.map(c => `<tr><td>${esc(c.name)}${c.ballot_name && c.ballot_name !== c.name ? `<br><span class="soft" style="font-size:12px">on the ballot as ${esc(c.ballot_name)}</span>` : ''}</td><td>${esc(c.party || 'Nonpartisan')}</td>${filingDefs.map(f => `<td>${filingCell(c, f)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  ${srcLine(r.src)}
</div>`;
  }).join('')}
</section>` : '';

  const moneyBlock = filingDefs.length ? `
<section id="money">
<h2>What they must file about their money</h2>
<p>People who hold or seek elected office in ${esc(county.state)} have to put these on the public record. We post each one as filed, for every candidate alike, as we gather them (see <a href="/docket">the docket</a>).</p>
${filingDefs.map(f => `<div class="issue" style="display:block">
  <b>${esc(f.name)}</b>
  <p style="font-size:14px;margin:4px 0 0"><b>Who:</b> ${esc(f.who)} <b>Where:</b> ${esc(f.where)} <b>When:</b> ${esc(f.when)}</p>
  ${srcLine(f.src)}
</div>`).join('')}
</section>` : '';

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
</div>
</section>
${raceBlock}
${moneyBlock}

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
