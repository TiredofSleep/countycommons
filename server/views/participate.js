const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The practical page: every way a Clark County resident can take part in
// their governments, from fifteen seconds to a records request. Built from
// the same config and corpus as everything else — navigation, not advocacy.

// Next second-Monday quorum court session, computed honestly at render time.
function nextSecondMonday(from) {
  for (let add = 0; add < 62; add++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + add);
    if (d.getDay() === 1 && d.getDate() >= 8 && d.getDate() <= 14) return d;
  }
  return null;
}

function participatePage(data) {
  const { county } = data;
  const now = new Date();
  const qc = nextSecondMonday(now);
  const qcStr = qc ? qc.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : null;
  const budgetSeason = now.getMonth() >= 7; // Aug–Dec: requests and adoption
  const jps = county.quorum_court.justices;
  const jpRows = [];
  for (let i = 0; i < jps.length; i += 2) {
    const a = jps[i], b = jps[i + 1];
    jpRows.push(`<tr><td class="num">${a.district}</td><td>${esc(a.name)}</td>${b ? `<td class="num">${b.district}</td><td>${esc(b.name)}</td>` : '<td></td><td></td>'}</tr>`);
  }

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · get involved</div>
  <h1>Take part in your government</h1>
  <div class="src">Every way to be involved, from fifteen seconds to a records request. None of it requires an account, an app, or anyone's permission — these are rights you already have. This page just makes them navigable.</div>
</header>

${qcStr ? `<div class="issue" style="display:block;border-color:var(--sourced);background:var(--sourced-bg)">
  <b>This month in Clark County:</b>
  <p style="font-size:13.5px;margin:6px 0 0">The quorum court's next regular session is <b>${esc(qcStr)}</b> at the courthouse — public, and you can speak.${budgetSeason ? ' <b>It is budget season:</b> the 2027 budget is being written between now and December. What gets said at these meetings lands in next year’s numbers.' : ''} One question is <a href="/issues">open for your answer</a> right now.</p>
</div>` : ''}

<section>
<h2>1 · Be counted <span class="sub">— fifteen seconds</span></h2>
<p>One question is open right now: <a href="/issues">should every government dollar be traceable to the receipt?</a> No account needed. Your answer is changeable until the question closes, and the count shows exactly what it is — including how verified it is.</p>
</section>

<section>
<h2>2 · Know who speaks for you <span class="sub">— one phone call</span></h2>
<p>County money is voted by eleven justices of the peace — one answers to your address. Not sure which district you live in? The county clerk's office can tell you in one call.</p>
<table class="plain"><thead><tr><th>Dist.</th><th>Justice of the peace</th><th>Dist.</th><th>Justice of the peace</th></tr></thead>
<tbody>${jpRows.join('')}</tbody></table>
<p class="src">The county judge (${esc(county.officials[0].name)}) runs county government day to day. City money: the Arkadelphia board of directors and city manager. School money: elected school boards. Names from the county's own website.</p>
</section>

<section>
<h2>3 · Show up <span class="sub">— the calendar is the strategy</span></h2>
<p><b>The quorum court meets the second Monday of every month</b> at the courthouse, and its meetings are public. The budget is written October through December — a concern raised in the fall lands in next year's budget; the same concern in spring waits a year. Budget committee and special sessions are public too, and their minutes are in <a href="/documents">our archive</a>.</p>
<p><b>You can speak.</b> The court routinely votes to hear residents — the minutes show speakers getting three minutes each on contested questions. Come with one point, sourced if you can; the <a href="/">money trail</a> exists so you can cite the same documents the court has.</p>
</section>

<section>
<h2>4 · Ask for records <span class="sub">— rights, not favors</span></h2>
<p>The Arkansas Freedom of Information Act gives every citizen the right to county records — budgets, minutes, contracts, the check register. Most of what this site publishes came from records anyone could have requested. A ready-to-send request for the records that would complete the money trail is on the <a href="/vendors">Who gets paid</a> page; responses are generally due within three business days.</p>
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
<h2>Why we believe this works <span class="sub">— the evidence</span></h2>
<p>Participation is old, proven, and it grows the people who practice it — that's not a slogan, it's a research finding. <a href="/stance">Our full stance, with sources</a>.</p>
</section>`;

  return layout({
    title: `Take part in your government — ${county.platform_name}`, current: '/participate', body, county,
    description: 'Every way a Clark County resident can take part: be counted, know your JP, show up, speak, request records — rights you already have, made navigable.'
  });
}

module.exports = { participatePage };
