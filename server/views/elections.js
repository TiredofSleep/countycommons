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
  const evRec = data.earlyVoting && data.earlyVoting.counties && data.earlyVoting.counties[county.name.replace(/ County$/, '')];
  const edNow = require('../lib/election-day').current(county.state);
  const edPosted = edNow && st && (st.elections || []).some(e => e.id === edNow.election && e.date >= today) ? edNow.counties[county.name.replace(/ County$/, '')] || null : null;
  const evPosted = !!(evRec && evRec.status === 'found' && (st && (st.elections || []).some(e => e.id === data.earlyVoting.election && e.date >= today)));

  const header = (lead) => `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · elections</div>
  <h1>Voting in ${esc(place)}</h1>
  <div class="src">${lead} This page never rates or recommends a candidate or a ballot measure, and it shows every candidate in a race the same way — <a href="/never">a line this site holds</a>. For everything on your own ballot, use your official sample ballot.</div>
</header>`;

  const officeBlock = office ? `
<section id="where">
<h2>Where to vote <span class="sub">— ${esc(office.name)}</span></h2>
${office.early_voting && !evPosted ? `<p><b>Early voting:</b> ${esc(office.early_voting)}</p>` : ''}${evPosted ? `<p><b>Early voting:</b> <a href="#early">the sites posted for this election</a>.</p>` : ''}
${office.election_day && !edPosted ? `<p><b>Election Day:</b> ${esc(office.election_day)}</p>` : ''}${edPosted ? `<p><b>Election Day:</b> <a href="#election-day">${edPosted.vote_centers ? 'the vote centers' : 'the polling places'} for this election</a>.</p>` : ''}
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

  // Election Day: vote centers (any site in the county) or precinct polling
  // places (your own site only), from the state's list, refreshed daily.
  const edAll = require('../lib/election-day').current(county.state);
  const ed = edAll && edAll.election === next.id && edAll.counties[county.name.replace(/ County$/, '')];
  const edRow = (s) => `<tr><td>${esc(s.name)}<br><span class="soft" style="font-size:12px">${esc([s.address, s.city].filter(Boolean).join(', '))}</span></td><td class="num"><a href="${esc(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name, s.address, s.city, county.state].filter(Boolean).join(', '))}`)}" rel="noopener">map</a></td></tr>`;
  const edTable = ed ? `<div style="overflow-x:auto;max-width:100%"><table class="plain"><tbody>${ed.sites.map(edRow).join('')}</tbody></table></div>` : '';
  const voterView = '<a href="https://www.voterview.ar-nova.org/voterview" rel="noopener">VoterView</a>';
  const edayBlock = !ed || !ed.sites.length ? '' : `
<section id="election-day">
<h2>Where to vote on Election Day <span class="sub">— ${esc(long(next.date))}${next.hours ? `, ${esc(next.hours)}` : ''}</span></h2>
${ed.vote_centers
    ? `<p>${esc(place)} uses <b>vote centers</b>: a registered ${esc(place)} voter can vote at any of these ${ed.sites.length} site${ed.sites.length === 1 ? '' : 's'}, whatever your precinct.</p>`
    : `<p>${esc(place)} votes <b>by precinct</b> on Election Day: you have to vote at your own polling place. Look yours up on ${voterView}, the state's voter lookup, or call the county clerk. These are all ${ed.sites.length} polling places in the county.</p>`}
${ed.sites.length > 20 ? `<details><summary>Show all ${ed.sites.length} ${ed.vote_centers ? 'vote centers' : 'polling places'}</summary>${edTable}</details>` : edTable}
<p class="src" style="max-width:none">Source: <a href="${esc(edAll.source.url)}" rel="noopener">${esc(edAll.source.label)}</a>; list checked ${esc(new Date(edAll.fetched).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' }))}, refreshed daily until the election. Your sample ballot and ${voterView} have the final word for your address.</p>
</section>`;

  // Early-voting sites: what the county posted for this election, each with its
  // source. A county we haven't found gets the clerk's number, never a guess.
  const evAll = data.earlyVoting && data.earlyVoting.election === next.id ? data.earlyVoting : null;
  const ev = evAll && evAll.counties[county.name.replace(/ County$/, '')];
  const evDate = (next.dates || []).find(d => /early/i.test(d.label) && d.end);
  const found = ev && ev.status === 'found' && ev.sites && ev.sites.length;
  const dir = data.stateOfficials && data.stateOfficials.counties && data.stateOfficials.counties[county.name.replace(/ County$/, '')];
  const clerk = dir && dir.officials.find(o => /clerk/i.test(o.office) && !/^circuit/i.test(o.office) && o.name);
  const map = (s) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name, s.address, s.city, county.state].filter(Boolean).join(', '))}`;
  const earlyBlock = !evAll || !evDate || evDate.end < today ? '' : found ? `
<section id="early">
<h2>Early voting sites <span class="sub">— ${esc(short(evDate.date))} to ${esc(short(evDate.end))}</span></h2>
<p>${ev.sites.length === 1 ? `${esc(place)} has one early-voting site for this election:` : `${esc(place)} has ${ev.sites.length} early-voting sites for this election. A registered ${esc(place)} voter can use any of them.`}</p>
${ev.sites.map(s => `
<div class="issue" style="display:block">
  <b>${esc(s.name)}</b>
  <p class="src" style="max-width:none;margin:4px 0 0">${esc([s.address, s.city].filter(Boolean).join(', '))} · <a href="${esc(map(s))}" rel="noopener">map</a></p>
  ${s.note ? `<p style="font-size:14px;margin:4px 0 0">${esc(s.note)}</p>` : ''}
</div>`).join('')}
<p style="font-size:14px">${esc(evDate.detail)}${ev.basis === 'state' && ev.sites.length > 1 ? ` The state's list doesn't say which days each site is open, and some counties run a site for only part of early voting — check with the county clerk${clerk && clerk.phone ? ` (<a href="tel:${esc(clerk.phone.replace(/[^\d+]/g, ''))}">${esc(clerk.phone)}</a>)` : ''} before you go.` : ''}</p>
${srcLine(ev.src)}
</section>` : `
<section id="early">
<h2>Early voting sites <span class="sub">— ${esc(short(evDate.date))} to ${esc(short(evDate.end))}</span></h2>
<p>We haven't found ${esc(place)}'s posted early-voting sites for this election yet — not gathered, not hidden. In many ${esc(county.state)} counties, early voting is at the county clerk's office. ${clerk ? `Call the county clerk, ${esc(clerk.name)}${clerk.phone ? `, at <a href="tel:${esc(clerk.phone.replace(/[^\d+]/g, ''))}">${esc(clerk.phone)}</a>` : ''}${clerk.address ? ` (${esc(clerk.address)})` : ''}, to confirm where and when.` : 'Call the county clerk to confirm where and when.'}</p>
<p style="font-size:14px">${esc(evDate.detail)}</p>
</section>`;

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
${earlyBlock}
${edayBlock}
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
    title: earlyBlock
      ? `${county.name}, ${county.state} early voting${found ? ' sites' : ''} and election dates: ${next.name.toLowerCase()}, ${asDate(next.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · County Commons`
      : `Elections — ${county.platform_name}`,
    current: '/elections', body, county,
    description: found
      ? `Where to vote early in ${county.name}, ${county.state}: ${ev.sites.slice(0, 3).map(s => s.name).join('; ')}${ev.sites.length > 3 ? ` and ${ev.sites.length - 3} more` : ''}. Early voting ${short(evDate.date)} to ${short(evDate.end)}, hours, ID rules and key dates.`
      : `When, where, and how to vote in ${county.name}: the next election, key deadlines, early voting, ID rules, and how to check your registration.`
  });
}

module.exports = { electionsPage };
