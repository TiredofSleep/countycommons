const { esc, money } = require('../lib/corpus');
const { layout } = require('./layout');
const { simulate, ERAS, STARTS, NOW } = require('../lib/whatif');

// What if we saved instead of borrowing? A server-rendered "game": pick when
// saving starts and which stretch of market history to replay; every plan is
// recomputed from the government's real bond payments. Computes, never
// advocates — each plan carries its cost, its risk, and whether the law
// allows it today.

const m = (x) => {
  const a = Math.abs(x);
  if (a >= 1e9) return `$${(x / 1e9).toFixed(2)} billion`;
  if (a >= 1e6) return `$${(x / 1e6).toFixed(a >= 1e8 ? 0 : 1)} million`;
  return money(Math.round(x));
};

function whatIfPage(data, query) {
  const { county, whatIf: w, market, documents } = data;
  const docs = new Map(documents.documents.map(d => [d.id, d]));
  const cite = (s) => {
    const d = docs.get(s.doc);
    if (!d) return '';
    return `<a href="/documents#${esc(d.id)}">${esc(d.title)}</a>${s.page ? `, ${esc(s.page)}` : ''}${s.what ? ` — ${esc(s.what)}` : ''}`;
  };

  const start = STARTS.includes(Number(query.start)) ? Number(query.start) : 2000;
  const era = ERAS.find(e => String(e.year) === String(query.era)) || ERAS[0];
  const replayYear = era.year || start;
  const legalTbill = '<span class="chip c-ok">allowed today</span>';
  const notLegal = '<span class="chip c-dead">not allowed for county money</span>';

  const form = `
<form method="GET" action="/whatif" class="issue" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
  <label class="src" style="max-width:none">Start saving in<br>
    <select name="start" style="font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);margin-top:3px">
      ${STARTS.map(s => `<option value="${s}"${s === start ? ' selected' : ''}>${s}</option>`).join('')}
    </select></label>
  <label class="src" style="max-width:none;flex:1 1 240px;min-width:0">Markets behave<br>
    <select name="era" style="font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);margin-top:3px;width:100%;max-width:100%;box-sizing:border-box">
      ${ERAS.map(e => `<option value="${e.year || ''}"${e === era ? ' selected' : ''}>${esc(e.label)}</option>`).join('')}
    </select></label>
  <button type="submit" style="font-family:var(--mono);font-size:14px;padding:9px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer">Run it</button>
</form>`;

  // One plan as a stacked block — reads top to bottom on any screen width.
  const plan = (name, chip, total, sub, means) => `
<div style="border-bottom:1px solid var(--rule-soft);padding:10px 0">
  <div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline"><b>${esc(name)}</b> ${chip}</div>
  <div style="font-family:var(--mono);font-size:18px;margin:4px 0 2px">${total} <span class="soft" style="font-family:var(--sans);font-size:13px">taxpayers pay · ${sub}</span></div>
  <div style="font-size:14px">${means}</div>
</div>`;

  const govCards = w.governments.map(g => {
    const r = simulate(market, g, start, replayYear);
    const p = r.plans;
    const risk = (x) => x.shortCount
      ? `Pick this amount ahead of time and it came up short in ${x.shortCount} of ${x.eraCount} stretches of market history since 1928 — once by ${m(x.worstShort)}.`
      : `Picked ahead of time, this amount never came up short in ${x.eraCount} stretches of market history since 1928.`;
    const smartLine = p.smart.dryYear
      ? `The fund ran dry in ${p.smart.dryYear} — the bond payments outran it.`
      : `By ${NOW} the fund holds about ${m(p.smart.fund)} while ${m(p.smart.owed)} of bond payments are still due — ${p.smart.net >= 0 ? `about ${m(p.smart.net)} ahead` : `about ${m(-p.smart.net)} behind`}. For comparison, the same money in stocks paying cash for each project would hold about ${m(p.smart.cashInStocks)}.`;
    const projects = g.projects.map(x => `<tr><td>${x.year}</td><td>${esc(x.what)}</td><td class="num">${money(x.amount)}</td></tr>`).join('');
    return `
<section id="${esc(g.id)}">
<h2>${esc(g.name)} <span class="sub">— ${m(r.borrowed)} borrowed</span></h2>
<details><summary class="src" style="cursor:pointer;max-width:none">What was borrowed for</summary>
<table class="plain"><tbody>${projects}</tbody></table></details>
${plan('Borrow', '<span class="chip c-cite">what actually happened</span>', m(r.totalPay), `${m(r.interest)} of it interest`,
  `${m(r.paidSoFar)} paid through ${NOW}. ${m(r.owed)} still due, the last in ${r.payoff}.`)}
${plan('Save first, in Treasury bills', legalTbill, m(p.tbill.total), `${m(p.tbill.perYear)} a year for ${p.tbill.years} years`,
  `Every project paid in cash on the same date. Nothing owed. ${r.totalPay > p.tbill.total ? `${m(r.totalPay - p.tbill.total)} less than borrowing.` : `${m(p.tbill.total - r.totalPay)} more than borrowing.`}`)}
${plan('Save first, in 60% stocks and 40% bonds', notLegal, m(p.mix.total), `${m(p.mix.perYear)} a year`, risk(p.mix))}
${plan('Save first, in stocks', notLegal, m(p.stock.total), `${m(p.stock.perYear)} a year`, risk(p.stock))}
${plan('Invest and borrow against it', notLegal, m(p.smart.total), `${m(p.smart.perYear)} a year into stocks`,
  `Borrow just as it really did, and pay the bonds from the fund. ${smartLine}`)}
<p class="src">${esc(g.estimate_note)} Sources: ${g.sources.map(cite).filter(Boolean).join(' · ')}</p>
</section>`;
  }).join('');

  const f = w.forward;
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · what if</div>
  <h1>What if we saved instead of borrowing?</h1>
  <div class="src">${esc(w.intro)} Updated ${esc(w.updated)}.</div>
</header>

${w.governments.length ? `<section>
<h2>Play it <span class="sub">— pick a start year and a stretch of market history</span></h2>
${form}
<p class="src">Showing: saving starts in <b>${start}</b>; markets ${era.year ? `replay the years from <b>${era.year}</b>` : 'follow <b>what really happened</b>'}. Each plan buys the same things on the same dates.</p>
</section>
${govCards}` : ''}
${w.notice ? `<div class="issue" style="display:block;border-color:var(--partial)"><b>${esc(w.notice)}</b></div>` : ''}

<section id="today">
<h2>${esc(f.title)} <span class="sub">— the next round, not the last one</span></h2>
<p>${esc(f.lead)}</p>
<ul>${f.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p class="src">Sources: ${f.sources.map(cite).filter(Boolean).join(' · ')}</p>
</section>

<section id="smart-money">
<h2>“Invest it and borrow against it” <span class="sub">— why counties can’t, and who can</span></h2>
<p>Wealthy people borrow against their stocks so they never have to sell them and pay capital-gains tax. Governments pay no income tax, so that part doesn’t apply. What’s left is a bet: that investments earn more than the loan costs.${w.governments.length ? ' In the table above, most of the gain comes from investing early — not from the borrowing.' : ''}</p>
<ul>
<li><b>Texas law</b> lets a county invest only in government-type securities, bank CDs, and funds <a href="https://texas.public.law/statutes/tex._gov't_code_section_2256.014">“invested exclusively in obligations approved by this subchapter”</a> (Gov’t Code §2256.014). No stocks.</li>
<li><b>Arkansas law</b> limits county and city spare cash to securities <a href="https://codes.findlaw.com/ar/title-19-public-finance/ar-code-sect-19-1-504.html">“having a maturity of not longer than five (5) years,”</a> bank CDs, pools, and repurchase agreements (§19-1-504). No stocks.</li>
${county.state === 'Florida' ? `<li><b>Florida law</b> lets a town without a written investment policy hold only the state pool, top-rated money market funds, bank deposits, and U.S. Treasuries. With a written policy that puts “safety of principal and liquidity” first, it may add “other investments authorized by law or by ordinance” (<a href="http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&amp;URL=0200-0299/0218/Sections/0218.415.html">§218.415</a>). Stocks are not on the default list.</li>` : ''}
<li><b>Federal law</b> won’t let tax-exempt bond money be invested at a higher return than the bond pays; extra earnings go to the U.S. Treasury (<a href="https://www.law.cornell.edu/uscode/text/26/148">26 U.S.C. §148</a>).</li>
<li><b>The warning:</b> in 1994, Orange County, California used borrowed money to stretch a $7.6 billion investment pool to more than $20 billion. It lost about $1.7 billion and filed for bankruptcy on December 6, 1994 (<a href="https://www.sec.gov/litigation/admin/33-8121.htm">SEC order</a>).</li>
<li><b>The version that works is run by the state:</b> approved Texas school bonds are <a href="https://texas.public.law/statutes/tex._educ._code_section_45.052">“guaranteed by the corpus and income of the permanent school fund”</a> (Education Code §45.052), so districts borrow at top-rated rates — borrowing against investments, with a state-sized fund behind it (<a href="https://texaspsf.org">texaspsf.org</a>).</li>
</ul>
</section>

<section id="limits">
<h2>What this doesn’t show <span class="sub">— the honest limits</span></h2>
<ul>
<li>Saving first means paying for years before anything gets built. Borrowing gets the building now.</li>
<li>People who move here later use a building they never saved for. Spreading the cost over the years people use it is the fair argument for bonds.</li>
<li>A growing pot of money has to survive many elections without being spent on something else.</li>
<li>Money left in residents’ pockets while a county borrows isn’t worth nothing to them.</li>
<li>All figures are in dollars of their own year, not adjusted for inflation. Only the bonds listed above are counted.</li>
</ul>
<p class="src">Market returns: ${esc(market.source)} — <a href="${esc(market.url)}">data page</a>. ${esc(market.note)} Returns run through 2025; ${NOW} is counted with no market growth. This page computes and cites; it doesn’t recommend a plan. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `What if we saved? — ${county.platform_name}`, current: '/whatif', body, county,
    description: `What if ${county.name} saved first instead of borrowing? Replays its real bonds against real market history — saving, investing, and borrowing side by side, each with its cost and risk.`
  });
}

module.exports = { whatIfPage };
