const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');

// The plain-words synthesis: what the money is, what we found, who decides,
// and how a resident gets heard. Reading level target: 6th-8th grade.
// Every number here links to its citation page. This page navigates;
// it never tells anyone what to want.

function storyPage(data) {
  const { budget, county } = data;
  const total = budget.meta.grand_total;
  const pop = county.population;
  const perResident = Math.round(total / pop);
  const jps = county.quorum_court.justices;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · start here</div>
  <h1>The money, in plain words</h1>
  <div class="src">This page tells the whole story so far — what your county spends, what we found while tracing it, who makes the decisions, and how you get heard. Every number links to the document it came from. Nothing here tells you what to think.</div>
</header>

<section>
<h2>1 · The short version <span class="sub">— five things, one minute</span></h2>
<p><b>Your county government plans to spend <a href="/verify">${money(total)}</a> in 2026.</b> That is about <b>$${perResident.toLocaleString('en-US')} for every person</b> in the county.</p>
<p><b>The biggest thing the county does is public safety.</b> The <a href="/line/gf-sheriff">sheriff</a>, the <a href="/line/gf-jail">jail</a>, and <a href="/line/e911">911</a> add up to roughly $4.7 million — about 43 cents of every General Fund dollar.</p>
<p><b>The second biggest is roads.</b> The <a href="/line/road-fund">road fund</a> spends about $6 million a year — nearly $1 million of it just on <a href="/line/road-asphalt">asphalt</a>.</p>
<p><b>One line is bigger than the jail, and no public document says who gets it.</b> A dedicated sales tax sends <a href="/line/edccc">$1.84 million to economic development</a> as a single word: "INCENTIVES." Finding out where it goes is <a href="/docket#i5">Docket #5</a>.</p>
<p><b>Everything on this site is checked arithmetic.</b> Every branch of the money tree adds up to the dollar, and <a href="/verify">you can see the receipt</a>. Where we don't know something, the page says so out loud.</p>
</section>

<section>
<h2>2 · Your tax bill, decoded <span class="sub">— where a $100,000 home's property tax goes</span></h2>
<p>Property tax works in "mills." One mill on a $100,000 home costs about <b>$20 a year</b> (homes are taxed on 20% of their value here). Inside Arkadelphia city limits the total is <a href="/line/millage-rates">59.75 mills — roughly $1,195 a year</a> before the homestead credit.</p>
<p>Where those mills go may surprise you:</p>
<p>· <b>Schools take 8 of every 10 property tax dollars.</b> The Arkadelphia district levies 47.65 mills; Gurdon levies 43. This is the biggest line on your bill, and it just got bigger: the district added <b>3 new bond mills</b> this year, and it has <a href="/line/schools">$35 million in bonds</a> to pay off.</p>
<p>· <b>The county takes 7.1 mills</b> — and inside that, one mill each goes to the <a href="/line/library">library</a>, the hospital, and the college. Three institutions, quietly funded on your bill — and the hospital and college money never appears in the county budget at all (<a href="/docket#i11">Docket #11</a>).</p>
<p>· <b>The city takes 5.</b></p>
<p>· <b>Fire protection takes zero.</b> There is no fire millage in this county. Rural fire departments run on voluntary dues and a <a href="/line/fire-passthrough">$45,921 county pass-through</a> — which is why the fire funding question (<a href="/docket#i4">Docket #4</a>) matters.</p>
</section>

<section>
<h2>3 · What we found by digging <span class="sub">— the headlines so far</span></h2>
<p class="src">How does all this compare to neighboring counties, and which categories deserve a closer look? <a href="/compare/spending">The spending comparison</a> holds that whole analysis.</p>
<p><b>Clark County deputies earn about $14,000 less than Garland County deputies.</b> Clark's line deputies are paid $43,398–$46,498. Garland County lists its 2026 patrol deputies at $57,418–$58,540 — and two years ago Garland paid about what Clark pays now. Nevada County pays $32,400. The full side-by-side, with every caveat, is at <a href="/compare/deputy-pay">the deputy pay comparison</a>.</p>
<p><b>The economic development money has no public paper trail.</b> The EDCCC receives $1.84 million a year from a dedicated sales tax, owns a 991-acre industrial mega-site, and files no public financial reports at all — it is not in the IRS charity file. Local news also reports the county owes the state about $1.3 million in sales-tax rebate repayments. The paper trail runs through meeting minutes we have located but not yet pulled (<a href="/docket#i9">Docket #9</a>).</p>
<p><b>The city's budget is not public, but its report card is.</b> Arkadelphia has never posted its budget online. Its audited books are online, though: in 2024 the city took in $18.2 million and spent $13.2 million in its general fund. Details: <a href="/line/city-arkadelphia">the city's page</a>.</p>
<p><b>About $3.9 million sits unappropriated across county funds.</b> Some is a legal cushion (counties may only spend 90% of expected revenue), some is real reserves, some is restricted money — like a <a href="/line/library">$196,000 library bequest</a>. What restricts which balance is <a href="/docket#i8">Docket #8</a>.</p>
<p><b>Election years cost money.</b> The <a href="/line/gf-election">election commission's budget</a> tripled for 2026 — from $33,750 to $109,200 — because running elections takes real staff and real dollars.</p>
</section>

<section>
<h2>4 · Who actually decides <span class="sub">— the map of power over this money</span></h2>
<p><b>County money:</b> the <b>county judge</b> (${esc(county.officials[0].name)}) runs county government day to day, but the budget is adopted by the <b>quorum court</b> — 11 elected justices of the peace, one per district. They vote the appropriations, usually in the last months of the year. If you live in this county, exactly one of these people answers to your vote:</p>
<table class="plain"><thead><tr><th>District</th><th>Justice of the peace</th></tr></thead><tbody>
${jps.map(j => `<tr><td class="num">${j.district}</td><td>${esc(j.name)}</td></tr>`).join('')}
</tbody></table>
<p class="src">Names from the county's own website. Not sure which district you live in? The county clerk's office can tell you in one phone call.</p>
<p><b>City money:</b> the Arkadelphia board of directors adopts the city budget; the city manager runs it. <b>School money:</b> each district's elected school board — and school tax rates go to a public vote when they change. <b>The sheriff</b> runs his department but does not set its budget; the quorum court does. That is why demonstrated public support matters: the people who vote on deputy pay are the eleven names above.</p>
</section>

<section>
<h2>5 · How to be heard <span class="sub">— the calendar is the strategy</span></h2>
<p><b>The budget is written in the fall.</b> Departments send requests in late summer; the quorum court works the budget October through December and adopts it before January. A concern raised in November lands in next year's budget. The same concern raised in March waits ten months. If you care about a number in this tree, fall is when it moves.</p>
<p><b>Meetings are public and you can speak.</b> The quorum court meets monthly at the courthouse. City board and school board meetings are public too. Showing up matters more than most people think — most months, almost nobody does.</p>
<p><b>The records are yours.</b> Arkansas's Freedom of Information Act gives every citizen the right to see county records — budgets, minutes, contracts, even the check register. Most of what this site publishes came from records anyone could have requested. The <a href="/docket">docket</a> lists what we are still chasing, and every "dead end" on this site is a records request waiting for a requester.</p>
<p><b>Check the math yourself.</b> Every number links to its source page. Every branch is re-added by a program, and <a href="/verify">the receipt is public</a>. If you find an error, that is a gift — the whole point of this site is that it can be checked.</p>
</section>

<section>
<h2>6 · What we still cannot see <span class="sub">— the honest gaps</span></h2>
<p>The <a href="/docket">First Issues Docket</a> tracks every gap: the city's budget document, the EDCCC recipient list, fire department dues, the treasurer's reports, and the county check register. Each entry says what the internet answered and what only a records request or a counter visit can. A dead end here means "not yet ingested and navigable" — never "hidden."</p>
</section>`;

  return layout({ title: `Start here — the money in plain words — ${county.platform_name}`, current: '/story', body, county });
}

module.exports = { storyPage };
