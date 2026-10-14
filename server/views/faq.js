const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const seo = require('../lib/seo');

// Questions people actually type into a search box, answered from this
// county's own corpus — the same numbers the money trail cites. Each answer
// links to the page that shows its work. Nothing here is opinion.

const topMatches = (d, re) => {
  const hit = d.budget.nodes.filter(n => n.section === 'appropriations' && re.test(n.name));
  const ids = new Set(hit.map(n => n.id));
  return hit.filter(n => !seo.chain(d, n).some(a => ids.has(a.id))).sort((a, b) => b.amount - a.amount);
};

function faqItems(d) {
  const c = d.county, P = seo.place(c), Y = seo.year(d), items = [];
  const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const nice = (s) => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const add = (q, html, text) => items.push({ q, html, text: text || plain(html) });
  if (seo.hasBudget(d)) {
    const t = seo.tops(d), gt = d.budget.meta.grand_total;
    add(`How big is ${c.name}'s ${Y} budget?`,
      `${P} appropriated <b>${seo.full(gt)}</b> for ${Y}, across ${t.length} funds. The largest are ${t.slice(0, 3).map(n => `<a href="/line/${esc(n.id)}">${esc(n.name)}</a> (${seo.short(n.amount)}, ${Math.round(n.amount / gt * 100)}%)`).join(', ')}. <a href="/budget">Walk the whole money trail</a>.`);
    for (const [label, re] of [['the sheriff and the jail', /sheriff|jail|detention|corrections/i], ['roads', /\broad|highway|street|bridge/i]]) {
      const m = topMatches(d, re);
      if (!m.length) continue;
      const sum = m.reduce((s, n) => s + n.amount, 0);
      add(`How much does ${c.name} spend on ${label}?`,
        `Lines whose names match ${label} add to <b>${seo.full(sum)}</b> in the ${Y} budget (${Math.round(sum / gt * 100)}% of the total): ${m.slice(0, 5).map(n => `<a href="/line/${esc(n.id)}">${esc(n.name)}</a> ${seo.short(n.amount)}`).join(', ')}${m.length > 5 ? `, and ${m.length - 5} more` : ''}. Names vary by county, so open each line to see what it covers.`);
    }
    if (d.verification && d.verification.summary) {
      const v = d.verification.summary;
      add(`Are these numbers checked?`,
        `Yes. Every total marked complete is checked against the sum of its parts, to the cent: <b>${v.passed} of ${v.total_checks}</b> checks pass. Where the county's own pages disagree, the money trail keeps the printed number and says so. <a href="/verify">See every check</a>.`);
    }
  }
  if (d.myBill && c.has_mybill) {
    try {
      const { compute } = require('./mybill');
      const b = d.myBill, pl = b.places ? (b.places.find(p => p.id === b.default_place) || b.places[0]) : null;
      const r = compute(b, b.home_default, true, pl);
      const net = r.total - r.credit;
      add(`What is the property tax on a home in ${c.name}?`,
        `For a ${seo.full(b.home_default)} home${pl ? ` in ${esc(pl.label)}` : ''}, taxed as a homestead, the published rates come to about <b>${seo.full(net)} a year</b> (about ${seo.full(net / 12)} a month). <a href="/mybill">Enter your own value</a> to see where every dollar goes, by government and by what it pays for.`);
    } catch (e) { /* bill not computable — skip the question */ }
  }
  const st = d.elections, today = new Date().toISOString().slice(0, 10);
  const next = st && (st.elections || []).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (next) {
    const ev = (next.dates || []).find(x => /early|in person|voter service|vote center/i.test(x.label) && x.end);
    const off = c.election_office;
    add(`When is the next election in ${c.name}, and how do I vote?`,
      `The next election is the <b>${esc(next.name.toLowerCase())} on ${new Date(next.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b>.${ev ? ` ${esc(ev.label)} runs ${nice(ev.date)} to ${nice(ev.end)}.` : ''}${off ? ` Your election office is the ${esc(off.name)}${off.phone ? ` (${esc(off.phone)})` : ''}.` : ''} <a href="/elections">Dates, hours, ID rules and where to vote</a>.`);
  }
  const so = d.stateOffices && d.stateOffices.counties && d.stateOffices.counties[c.name.replace(/ County$/, '')];
  if (so) {
    const pick = (k) => (so[k] || [])[0];
    const parts = [['dhs', 'DHS (SNAP, Medicaid, ARKids)'], ['revenue', 'the state revenue office (car tags, titles, driver’s licenses)'], ['health', 'the health unit']].map(([k, l]) => pick(k) ? `${l}: ${esc([pick(k).address, pick(k).city, pick(k).phone].filter(Boolean).join(', '))}` : '').filter(Boolean);
    if (parts.length) add(`Where is the DHS office, revenue office or health unit in ${c.name}?`, `${parts.join('; ')}. <a href="/offices">Every county and state office in ${esc(c.name)}</a>.`);
  }
  const af = d.auditFindings && d.auditFindings.verdicts;
  if (af && af.length) {
    const v = af.find(x => x.verdict === 'findings') || af[0];
    const q = v.quote.length > 320 ? v.quote.slice(0, 317).replace(/\s+\S*$/, '') + '…' : v.quote;
    add(`What did the auditors find in ${c.name}?`,
      `The latest state audit (${esc(v.year)}): ${af.some(x => x.verdict === 'findings') ? 'the auditors reported findings' : 'the auditors reported no findings'}. In their words: “${esc(q)}” <a href="/audits">Everything the auditors reported, with page numbers</a>.`);
  }
  try {
    const nrec = require('../lib/national').forCounty(c);
    const A = nrec && require('../lib/national-blocks').arpaData().counties[nrec.geoid];
    if (A) {
      const b = (x) => '$' + (x >= 1e6 ? (x / 1e6).toFixed(1) + ' million' : Math.round(x).toLocaleString('en-US'));
      const top = A.projects.slice(0, 3).map(p => `${esc(p.name)} (${b(p.obligated)})`).join('; ');
      add(`How is ${nrec.name} spending its American Rescue Plan (ARPA) money?`,
        `The county government was allocated ${b(A.allocation)} from the federal Fiscal Recovery Fund and had spent ${b(A.spent)} as of its latest report to Treasury.${top ? ` Its largest projects: ${top}.` : ''} <a href="/atlas#arpa">Every project and category</a>.`);
    }
  } catch (e) { /* no national record */ }
  if (d.auditFindings && d.auditFindings.fiscal) {
    const F = d.auditFindings.fiscal, k = require('../lib/fiscal-block').facts(F);
    const m = (x) => (x < 0 ? '−$' : '$') + Math.abs(Math.round(x)).toLocaleString('en-US');
    add(`Is ${c.name} in financial trouble?`,
      `Here are the state auditors' own five-year figures, without a verdict: the general fund's year-end balance went from ${m(F.balance[F.years.length - 1])} (${k.from}) to ${m(F.balance[0])} (${k.to}), and spending was more than revenue in ${k.short.length} of ${F.years.length} years.${k.months !== null ? ` At ${k.to} spending, that balance covers about ${k.months.toFixed(1)} months.` : ''} <a href="/audits#fiscal">The year-by-year table and what the auditors found</a>.`);
  }
  const docs = seo.hasBudget(d) ? seo.sourceDocs(d) : d.documents.documents.filter(x => x.status === 'ingested');
  if (docs.length) {
    add(`Where do these numbers come from?`,
      `From ${docs.length === 1 ? 'one public document' : `${docs.length} public documents`}: ${docs.slice(0, 4).map(x => x.source_url ? `<a href="${esc(x.source_url)}" rel="noopener">${esc(x.title)}</a>` : esc(x.title)).join('; ')}${docs.length > 4 ? '; and more' : ''}. Every amount on the site cites its document and page. <a href="/documents">The full document list</a>.`);
  }
  const open = (d.docket.issues || []).filter(i => i.status !== 'complete');
  if (open.length) {
    add(`What's missing — what hasn't been gathered yet?`,
      `${open.length} open item${open.length === 1 ? '' : 's'}, each a document still to get or a question the records raise: ${open.slice(0, 3).map(i => `<a href="/docket#i${i.num}">${esc(i.title)}</a>`).join('; ')}${open.length > 3 ? '; and more' : ''}. A gap means "not gathered yet," never "hidden." <a href="/docket">The docket</a>.`);
  }
  if (seo.hasBudget(d)) {
    add(`Can I download the data?`,
      `Yes, free: <a href="/budget.csv">the ${Y} budget as CSV</a> (opens in any spreadsheet) or <a href="/budget.json">as JSON</a>. Each row has its fund-and-department path, amount, and source document and page. Please cite the original document; County Commons is a guide to it.`);
  }
  const gov = (c.jurisdictions || []).filter(j => j.website);
  add(`Is this an official ${c.name} government website?`,
    `No. County Commons is an independent, nonpartisan, citizen-built project with no affiliation with any government.${gov.length ? ` Official sites: ${gov.map(j => `<a href="${esc(j.website)}" rel="noopener">${esc(j.name)}</a>`).join(', ')}.` : ''} It computes and cites public records, and never endorses candidates or takes sides on ballot measures. <a href="/methodology">How every number is sourced</a>.`);
  return items;
}

function faqPage(data) {
  const { county } = data;
  const items = faqItems(data);
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · questions</div>
  <h1>${esc(county.name)}: questions people ask</h1>
  <div class="src">Answered from the same public records the rest of the site cites — each answer links to the page that shows its work.</div>
</header>
${items.map(i => `
<section>
<h2 style="font-size:19px">${esc(i.q)}</h2>
<p>${i.html}</p>
</section>`).join('')}`;
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map(i => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.text } })) };
  return layout({ title: `${county.name}, ${county.state}: budget, taxes and voting — questions answered · County Commons`, current: '/faq', body, county,
    description: (items[0] ? items[0].text.slice(0, 150).replace(/\s+\S*$/, '') + '… ' : '') + `Answers about ${county.name}'s budget, property taxes and elections, from public records.`, jsonld: ld });
}

module.exports = { faqPage, faqItems };
