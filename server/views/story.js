const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');
const { govBodyName } = require('../lib/gov');
const { foiaOf } = require('../lib/foia');

// The plain-words synthesis: what the money is, who decides, and how a resident
// gets heard. Reading level target: 6th-8th grade. Every number links to its
// citation page. This page navigates; it never tells anyone what to want.
//
// The flagship (Clark) has a hand-written tour of its own investigation. Every
// other county gets the same shape, computed from its own corpus and config —
// so no county ever sees another county's government data.

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function hero(county) {
  return `<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · start here · plain words</div>
  <h1 style="font-size:clamp(27px,5.4vw,44px);line-height:1.08;margin:8px 0 10px">See where the money goes.<br>Then have your say.</h1>
  <div class="src" style="font-size:16px;max-width:66ch">The whole story so far, in plain words — what ${esc(county.name)} spends, who decides it, and how you get heard. Every number links to the document it came from. Nothing here tells you what to think.</div>
</header>`;
}

// ---- the generic, computed tour (every non-flagship county) ----
function genericStory(data) {
  const { budget, county } = data;
  const total = budget.meta.grand_total;
  const hasBudget = total > 0;
  const pop = county.population;
  const perResident = (hasBudget && pop) ? Math.round(total / pop) : null;
  const areas = (budget.nodes || []).filter(n => n.parent === null && n.section === 'appropriations' && n.amount).sort((a, b) => b.amount - a.amount);
  const top = areas.slice(0, 3);
  const adjacents = (budget.nodes || []).filter(n => n.parent === null && n.section === 'adjacent' && n.amount);
  const body_name = govBodyName(county);
  const exec = (county.officials || []).find(o => /judge|executive|mayor|manager/i.test(o.office || ''));
  const jps = (county.quorum_court && county.quorum_court.justices) || [];
  const foia = foiaOf(county.state);
  const win = (county.calendar && county.calendar.budget_adoption_window) || null;
  const memberWord = /commission/i.test(body_name) ? 'commissioner' : /quorum|justice/i.test(body_name) ? 'justice of the peace' : 'member';
  const hasCountyGov = (county.jurisdictions || []).some(j => j.kind === 'county') && !/abolish|no county|commonwealth|state-funded/i.test(body_name);
  const abolished = /abolish/i.test((county.seat || '') + ' ' + ((county.quorum_court && county.quorum_court.source) || '') + ' ' + body_name);
  const noGovReason = abolished
    ? 'County government here was abolished, so there is no county council and no county budget — only a few countywide offices remain.'
    : 'The county government does not run a general-purpose budget of its own.';

  const section1 = hasBudget ? `
<section>
<h2>1 · The short version <span class="sub">— one minute</span></h2>
<p><b>${esc(county.name)} plans to spend <a href="/verify">${money(total)}</a> in ${esc(String(budget.meta.year))}.</b>${perResident ? ` That is about <b>$${perResident.toLocaleString('en-US')} for every person</b> who lives here.` : ''}</p>
${top.length ? `<p><b>The biggest pieces of it:</b> ${top.map(n => `<a href="/line/${esc(n.id)}">${esc(n.name)}</a> (${money(n.amount)})`).join(', ')}. <a href="/budget">Walk the whole money trail →</a></p>` : ''}
<p><b>Everything here is checked arithmetic.</b> Every branch of the money tree adds up to the dollar, and <a href="/verify">you can see the receipt</a>. Where a number isn't known yet, the page says so out loud — a dead end means "not yet ingested and navigable," never "hidden."</p>
</section>` : `
<section>
<h2>1 · The short version <span class="sub">— one minute</span></h2>
<p><b>${esc(county.name)} has no general-purpose county budget to walk.</b> ${esc(noGovReason)}</p>
${adjacents.length ? `<p><b>What this site follows instead:</b> ${adjacents.map(n => `<a href="/line/${esc(n.id)}">${esc(n.name)}</a>${n.amount ? ` (${money(n.amount)})` : ''}`).join(', ')} — on the <a href="/budget">money trail</a>${county.has_municipalities ? `, and each city's own budget on the <a href="/places">cities &amp; towns page</a>` : ''}.</p>` : ''}
<p><b>Everything here is checked arithmetic and cited.</b> Every number links to its source, and where a record isn't ingested yet the page says so out loud — a dead end means "not yet navigable," never "hidden."</p>
</section>`;

  const section2 = hasCountyGov ? `
<section>
<h2>2 · Who actually decides <span class="sub">— the map of power over this money</span></h2>
<p>The budget is adopted by <b>${esc(body_name)}</b>${exec ? `, while ${esc(exec.name)} (${esc(exec.office)}) runs the day-to-day` : ''}.${jps.length ? ` If you live here, one of these ${jps.length} people — your ${esc(memberWord)} — answers to your vote:` : ''}</p>
${jps.length ? `<table class="plain"><thead><tr><th>District</th><th>${esc(memberWord.replace(/^./, c => c.toUpperCase()))}</th></tr></thead><tbody>
${jps.map(j => `<tr><td class="num">${esc(String(j.district))}</td><td>${esc(j.name)}</td></tr>`).join('')}
</tbody></table>` : ''}
<p class="src">Cities and school districts set their own budgets and tax rates through their own boards. See the full roster and how to reach them on the <a href="/participate">who-decides page</a>${county.has_municipalities ? `, and each city's own budget on the <a href="/places">cities &amp; towns page</a>` : ''}.</p>
</section>` : `
<section>
<h2>2 · Who actually decides <span class="sub">— the map of power here</span></h2>
<p><b>There is no county governing body to lobby here.</b> ${esc(noGovReason)} The governments that actually tax and spend are your <b>city or town</b> and the <b>state</b>${county.has_municipalities ? `` : ''}. See who they are and how to reach them on the <a href="/participate">who-decides page</a>${county.has_municipalities ? `, and each city's own budget on the <a href="/places">cities &amp; towns page</a>` : ''}.</p>
<p class="src">That is also why the <a href="/priorities">priorities board</a> here points at the city and state levels, not a county one — the honest lane for where the decisions actually get made.</p>
</section>`;

  return `${hero(county)}
${section1}
${section2}

<section>
<h2>3 · How to be heard <span class="sub">— the calendar is the strategy</span></h2>
${win ? `<p><b>The budget is written ${MONTHS[win.start_month] || ''}${win.end_month && win.end_month !== win.start_month ? '–' + (MONTHS[win.end_month] || '') : ''}.</b> ${win.note ? esc(win.note) + ' ' : ''}A concern raised while the budget is being written lands in it; the same concern raised after waits a year. If you care about a number in this tree, that window is when it moves.</p>` : ''}
<p><b>Put it on the record — here.</b> Say what to prioritize, and why, on the <a href="/priorities">priorities board</a>, or answer an <a href="/issues">open question</a>. When enough neighbors back the same thing, it is carried to the people who decide, and <a href="/outcomes">what they do with it is tracked in the open</a>.</p>
<p><b>The records are yours.</b> The ${esc(foia.name)}${foia.cite ? ` (${esc(foia.cite)})` : ''} gives every citizen the right to public records — budgets, minutes, contracts, the check register. Most of what this site publishes came from records anyone could have requested. The <a href="/docket">docket</a> lists exactly which records would fill the remaining gaps.</p>
<p><b>Check the math yourself.</b> Every number links to its source. Every branch is re-added by a program, and <a href="/verify">the receipt is public</a>. If you find an error, that is a gift — the whole point is that it can be checked.</p>
</section>

<section>
<h2>4 · What we still cannot see <span class="sub">— the honest gaps</span></h2>
<p>The <a href="/docket">First Issues Docket</a> tracks every gap — the records still to pull, the pools no document yet itemizes. Each entry says what is known and what only a records request or a counter visit can answer. That open-to-answered loop is the platform's running work, in public.</p>
</section>`;
}

// ---- the flagship's hand-written tour (Clark County only) ----
function clarkStory(data) {
  const { budget, county } = data;
  const total = budget.meta.grand_total;
  const pop = county.population;
  const perResident = Math.round(total / pop);
  const jps = county.quorum_court.justices;

  return `${hero(county)}

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
<p><b>Put it on the record — here.</b> Say what to prioritize on the <a href="/priorities">priorities board</a>, or answer an <a href="/issues">open question</a>; enough neighbors behind the same thing carries it to the people above, and <a href="/outcomes">what they do is tracked in the open</a>.</p>
<p><b>Check the math yourself.</b> Every number links to its source page. Every branch is re-added by a program, and <a href="/verify">the receipt is public</a>. If you find an error, that is a gift — the whole point of this site is that it can be checked.</p>
</section>

<section>
<h2>6 · What we still cannot see <span class="sub">— the honest gaps</span></h2>
<p>The <a href="/docket">First Issues Docket</a> tracks every gap: the city's budget document, the EDCCC recipient list, fire department dues, the treasurer's reports, and the county check register. Each entry says what the internet answered and what only a records request or a counter visit can. A dead end here means "not yet ingested and navigable" — never "hidden."</p>
</section>`;
}

function storyPage(data, opts) {
  const { county } = data;
  const isFlagship = opts && opts.isFlagship;
  const body = isFlagship ? clarkStory(data) : genericStory(data);
  return layout({
    title: `Start here — the money in plain words — ${county.platform_name}`,
    current: '/guide', body, county,
    description: `Where ${county.name}'s money goes, who decides it, and how to be heard — the plain-words tour, written for neighbors.`
  });
}

module.exports = { storyPage };
