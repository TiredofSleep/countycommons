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
