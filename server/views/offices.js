const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const seo = require('../lib/seo');

// Who to call: the county's own offices (each linked to what it costs, from
// the money trail) and the state offices that sit in the county (DHS, revenue,
// extension, health), from statewide directories in
// data/corpus/offices-<state>.json. Elected officials may be named (NEVER.md,
// October 2026 amendment); staff never are.

const CATEGORY = /^(personal services|supplies|other services( and charges)?|capital outlay|debt service|transfers?( out)?|salaries( and benefits)?|operations|m&o|maintenance and operations|contract services|repair and maintenance supplies)$/i;

// [label, match on budget/official names, what it does (Arkansas wording)]
const OFFICES = [
  ['County judge', /county judge/i, 'Runs county government day to day — roads, county property and the budget the quorum court adopts.'],
  ['County clerk', /county clerk/i, 'Voter registration and early voting, marriage licenses, and county records and minutes.'],
  ['Circuit clerk', /circuit clerk/i, 'Court records and filings; in many counties also records deeds and other land records.'],
  ['Assessor', /assessor/i, 'Values property for taxes; where you assess your personal property each year.'],
  ['Collector', /collector/i, 'Collects property taxes.'],
  ['Treasurer', /treasurer/i, 'Holds and pays out county money.'],
  ['Sheriff and jail', /sheriff|jail|detention/i, 'Law enforcement outside city limits, the county jail, and court security.'],
  ['Coroner', /coroner/i, 'Investigates deaths that are sudden or unexplained.'],
  ['Prosecuting attorney', /prosecut/i, 'Brings criminal cases for the state (one office often serves several counties).'],
  ['Public defender', /public defender|indigent defense/i, 'Lawyers for people charged with crimes who can’t afford one.'],
  ['Emergency management and 911', /emergency management|\bo\.?e\.?m\b|\b911\b|e-?911|communications? (center|facility)/i, 'Disaster planning and the 911 dispatch center.'],
  ['Veterans service officer', /veteran/i, 'Free help for veterans and families with VA benefits.'],
  ['Roads', /\broad\b/i, 'County roads and bridges.'],
  ['Landfill and solid waste', /solid waste|landfill|sanitation|recycl/i, 'Trash, recycling, and the county landfill or transfer station.'],
  ['Library', /library/i, 'The county library system.'],
  ['Extension office (county share)', /extension/i, 'The county’s share of the cooperative extension office (farm, 4-H, food and family programs).']
];

function topMatches(d, re) {
  const hit = d.budget.nodes.filter(n => n.section === 'appropriations' && n.amount > 0 && !CATEGORY.test(n.name.trim()) && re.test(n.name));
  const ids = new Set(hit.map(n => n.id));
  return hit.filter(n => !seo.chain(d, n).some(a => ids.has(a.id))).sort((a, b) => b.amount - a.amount);
}

function officesPage(data) {
  const { county, stateOffices: so } = data;
  const AR = county.state === 'Arkansas';
  const officials = county.officials || [];
  const site = ((county.jurisdictions || [])[0] || {}).website;
  const eo = county.election_office;
  const hasBudget = seo.hasBudget(data);

  const rows = OFFICES.map(([label, re, what]) => {
    const lines = hasBudget ? topMatches(data, re) : [];
    const who = officials.filter(o => re.test(o.office || '') && o.name);
    const contact = label === 'County clerk' && eo ? [eo.address, eo.phone].filter(Boolean).join(' · ') : '';
    if (!lines.length && !who.length && !contact) return '';
    const sum = lines.reduce((s, n) => s + n.amount, 0);
    return `
<div class="issue" style="display:block">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(label)}</b>${lines.length ? `<span class="num">${seo.full(sum)} <span class="soft" style="font-size:12.5px">in ${seo.year(data)} budget lines named for it</span></span>` : ''}</div>
  ${AR ? `<p style="margin:4px 0 0;font-size:14.5px">${esc(what)}</p>` : ''}
  ${who.length ? `<p class="src" style="max-width:none;margin:4px 0 0">${who.map(o => `${esc(o.office)}: ${esc(o.name)}`).join(' · ')}</p>` : ''}
  ${contact ? `<p class="src" style="max-width:none;margin:4px 0 0">${esc(contact)}</p>` : ''}
  ${lines.length ? `<p class="src" style="max-width:none;margin:4px 0 0">Budget: ${lines.slice(0, 4).map(n => `<a href="/line/${esc(n.id)}">${esc(n.name)}</a> ${seo.short(n.amount)}`).join(' · ')}${lines.length > 4 ? ` · and ${lines.length - 4} more` : ''}</p>` : ''}
</div>`;
  }).filter(Boolean);

  const cname = county.name.replace(/ County$/, '');
  const local = so && so.counties && so.counties[cname];
  const state = local ? Object.entries(so.agencies || {}).map(([k, a]) => {
    const list = local[k] || [];
    if (!list.length) return '';
    return `
<div class="issue" style="display:block">
  <b>${esc(a.name)}</b>
  ${a.what ? `<p style="margin:4px 0 0;font-size:14.5px">${esc(a.what)}</p>` : ''}
  ${list.map(o => `<p class="src" style="max-width:none;margin:4px 0 0">${esc([o.label !== a.name ? o.label : '', o.address, [o.city, o.zip].filter(Boolean).join(' '), o.phone].filter(Boolean).join(' · '))}${o.url ? ` · <a href="${esc(o.url)}" rel="noopener">office page</a>` : ''}</p>`).join('')}
  ${a.src ? `<p class="src" style="max-width:none;margin:4px 0 0">Source: <a href="${esc(a.src.url)}" rel="noopener">${esc(a.src.label)}</a></p>` : ''}
</div>`;
  }).filter(Boolean).join('') : '';

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · who to call</div>
  <h1>${esc(county.name)} offices: who to call</h1>
  <div class="src">The county's own offices — what each one does and what it costs, from the <a href="/budget">money trail</a> — and the state offices located in ${esc(county.name)}. This is an independent guide, not a government website${site ? `; the county's official site is <a href="${esc(site)}" rel="noopener">${esc(site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''}. Phone numbers and hours change — confirm before you go.</div>
</header>

<section>
<h2>County offices</h2>
${rows.length ? rows.join('') : `<p>We haven't matched ${esc(county.name)}'s offices yet — not gathered, not hidden.</p>`}
${hasBudget ? `<p class="src">Amounts add up the ${seo.year(data)} budget lines whose names match each office. An office can also be paid from lines named differently, so treat these as a floor — open each line to see its source page, or walk the whole <a href="/budget">money trail</a>.</p>` : ''}
</section>

<section>
<h2>State offices in ${esc(county.name)}</h2>
${state || `<p>We haven't gathered the state offices located in ${esc(county.name)} yet — not gathered, not hidden.</p>`}
</section>

<section>
<p class="src">Related: <a href="/elections">Voting and the election office</a> · <a href="/mybill">Your tax bill, explained</a> · <a href="/help">Find help</a> · <a href="/faq">Questions answered</a>. Spot an error? <a href="/feedback">Report it</a>.</p>
</section>`;

  return layout({
    title: `${county.name}, ${county.state} offices: tax collector, assessor, county clerk, sheriff, landfill, DHS office — who to call · County Commons`,
    current: '/offices', body, county,
    description: `Who to call in ${county.name}, ${county.state}: the county clerk, assessor, tax collector, treasurer, sheriff and other county offices — what each does and what it costs — plus state offices in the county.`
  });
}

module.exports = { officesPage };
