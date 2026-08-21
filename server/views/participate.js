const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The practical page: every way a resident can take part in their county's
// government, from fifteen seconds to a records request. Fully config-driven —
// it reads the county's own governing body, officials, meetings, and state, so
// it reads correctly for a Quorum Court, a Commissioners Court, or a county
// whose government was abolished. Navigation, not advocacy.

// The state's open-records law, by name where we know it.
const FOIA = {
  Arkansas: 'Arkansas Freedom of Information Act',
  Texas: 'Texas Public Information Act',
  Massachusetts: 'Massachusetts Public Records Law'
};

function participatePage(data) {
  const { county } = data;
  const gj = (county.jurisdictions || []).find(j => j.kind === 'county') || (county.jurisdictions || [])[0] || {};
  const bodyName = gj.governing_body || 'county government';
  const execTitle = gj.executive || null;
  const officials = county.officials || [];
  const justices = (county.quorum_court && county.quorum_court.justices) || [];
  const meetings = (county.calendar && county.calendar.meetings) || [];
  const foia = FOIA[county.state] || `${county.state} open-records law`;
  const hasGov = !/abolished|no county|state-funded/i.test(bodyName) && bodyName !== 'county government';

  const jpRows = [];
  for (let i = 0; i < justices.length; i += 2) {
    const a = justices[i], b = justices[i + 1];
    jpRows.push(`<tr><td class="num">${esc(a.district)}</td><td>${esc(a.name)}</td>${b ? `<td class="num">${esc(b.district)}</td><td>${esc(b.name)}</td>` : '<td></td><td></td>'}</tr>`);
  }
  const jpTable = justices.length ? `
<p style="margin-top:8px">The ${esc(bodyName)}'s members by district:</p>
<table class="plain"><thead><tr><th>Dist.</th><th>Member</th><th>Dist.</th><th>Member</th></tr></thead>
<tbody>${jpRows.join('')}</tbody></table>` : '';

  const officialsTable = officials.length ? `
<table class="plain"><thead><tr><th>Office</th><th>Who</th></tr></thead>
<tbody>${officials.map(o => `<tr><td>${esc(o.office)}</td><td>${esc(o.name)}</td></tr>`).join('')}</tbody></table>` : '';

  const meetingLines = meetings.length
    ? meetings.map(m => `<b>${esc(m.body)}</b> meets ${esc(m.schedule)}${m.note ? ` — <span class="src">${esc(m.note)}</span>` : ''}.`).join('<br>')
    : `Public meeting times are listed on <a href="/calendar">the calendar</a> as they're confirmed.`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · get involved</div>
  <h1>Take part in your government</h1>
  <div class="src">Every way to be involved, from fifteen seconds to a records request. None of it requires an account, an app, or anyone's permission — these are rights you already have. This page just makes them navigable.</div>
</header>

<section>
<h2>1 · Raise your voice <span class="sub">— fifteen seconds</span></h2>
<p>Say what ${esc(county.name)} should prioritize — or take a fresh look at — and why, on <a href="/priorities">the priorities board</a>. Back what your neighbors have posted; the strongest-felt priorities rise on their own, and when one reaches the threshold it's carried to the people who decide. Prefer a straight yes/no? <a href="/issues">Answer an open question</a>. No account needed; you can change your mind until it closes.</p>
</section>

<section>
<h2>2 · Know who speaks for you <span class="sub">— one phone call</span></h2>
<p>${hasGov ? `The people who vote your county's money sit on the <b>${esc(bodyName)}</b>${execTitle ? `, led by the ${esc(execTitle)}` : ''}. Here's who holds each office — names from the county's own record.` : `In ${esc(county.name)}, the decisions that shape daily life are made at the state and city level, not by a county government. Here are the county-level offices that remain.`}</p>
${officialsTable || '<p class="src">The current office-holders are being added.</p>'}
${jpTable}
<p class="src">Not sure which district or precinct you're in? The county clerk's office can tell you in one call.</p>
</section>

<section>
<h2>3 · Show up <span class="sub">— the calendar is the strategy</span></h2>
<p>${meetingLines}</p>
<p>Public meetings are where the budget actually gets set, and residents can speak. Come with one point, sourced if you can — the <a href="/budget">money trail</a> exists so you can cite the same documents the officials have. Full schedule and any community events: <a href="/calendar">the calendar</a>.</p>
</section>

<section>
<h2>4 · Ask for records <span class="sub">— rights, not favors</span></h2>
<p>The ${esc(foia)} gives every citizen the right to public records — budgets, minutes, contracts, the check register. Most of what this site publishes came from records anyone could have requested. The <a href="/docket">docket</a> lists exactly which records would fill the remaining gaps, and the <a href="/budget">money trail</a> shows where they'd go.</p>
</section>

<section>
<h2>5 · Check the checkers <span class="sub">— including us</span></h2>
<p>Every number here <a href="/verify">re-adds in public</a>. The <a href="/docket">docket</a> shows what we can't see yet and what we're doing about it. Our <a href="/security">activity log is hash-chained and publicly anchored</a>, so our own history can't be quietly rewritten. If you find an error anywhere on this site, that's a gift — corrections get published, not buried.</p>
</section>

<section>
<h2>6 · Bring what you find <span class="sub">— the record grows by neighbors</span></h2>
<p>Some records only exist on paper at a counter. If you request one — or already have one in a drawer — it can join the public archive: hashed, cited, and navigable for everyone. The <a href="/docket">docket</a> lists exactly which documents are still missing. One person with a stamp regularly beats a year of waiting.</p>
</section>

<section>
<h2>7 · Widen the toolkit <span class="sub">— beyond this county</span></h2>
<p>Changing a law — local, state, or federal — has a how-to, and other groups teach it for free: how to track a bill, get a public record, run a citizens' panel, or put a measure on the ballot. We've gathered the nonpartisan ones, verified and linked by method, not by cause. <a href="/kindred">See the kindred work</a>.</p>
</section>

<section>
<h2>Why we believe this works <span class="sub">— the evidence</span></h2>
<p>Participation is old, proven, and it grows the people who practice it — that's not a slogan, it's a research finding. <a href="/stance">Our full stance, with sources</a>.</p>
</section>`;

  return layout({
    title: `Take part in your government — ${county.platform_name}`, current: '/participate', body, county,
    description: `Every way a ${esc(county.name)} resident can take part: raise a priority, be counted, know who represents you, show up, and request records — rights you already have, made navigable.`
  });
}

module.exports = { participatePage };
