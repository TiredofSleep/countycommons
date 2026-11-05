// Every line of every county budget we hold, matched to one shared list of
// categories so any county's line can be set beside every other county's.
//
// Sources: each full County Commons site's own budget tree (Arkansas's 74
// counties and the other county sites), and each Idaho county's trail read from
// its State Controller filing. Lines are taken at the department level where a
// budget lists departments, else at the fund level, so nothing is counted twice.
//
// Matching is shown, never hidden: a line is matched by its state's standard
// department code (Arkansas General Fund departments) or by words in its name,
// and every line records which rule matched it. Lines no rule fits are kept as
// "not matched yet": a dead end, listed on the page, never dropped.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

// [key, label, Census function it lines up with, name pattern]
// Order matters: the first pattern that fits wins (county judge before judge).
const CATS = [
  ['transfers', 'Transfers between funds and reserves', 'other', /\b(interfund|transfers?|reserves?|fund balance|carry ?forward|left at year)\b/i],
  ['arpa', 'Federal relief and payments (ARPA, CARES, LATCF, PILT, opioid)', 'other', /\b(arpa|arp|american rescue|rescue plan|cares act|opioid|fiscal recovery|covid|coronavirus|latc\w*|local assistance|tribal consistency|pilt|payment in lieu|title iii)\b/i],
  ['capital', 'Capital projects', 'other', /\b(capital (projects?|improvement\w*|fund)|special projects|infrastructure)\b/i],
  ['environment', 'Natural resources and environment', 'other', /\b(physical environment|environment\w*|natural resources|lagoon|river|watershed|beach|erosion|wildlife)\b/i],
  ['benefits', 'Employee benefits, workers’ comp and fleet', 'admin', /\b(employee benefits?|retiree|workers'? comp\w*|dental|fleet|radio shop)\b/i],
  ['debt', 'Debt and bond payments', 'interest', /\b(bonds?|debt|interest|lease purchase|sinking)\b/i],
  ['executive', 'County judge, commissioners and governing body', 'admin', /\b(county judge|quorum court|magistrates?|commissioners?|commission court|board of supervisors|supervisors|county executive|county manager|county administrator|administrator|mayor|council|legislative|board of county|county board)\b/i],
  ['juvenile', 'Juvenile services', 'courts', /\b(juvenile|youth services)\b/i],
  ['jail', 'Jail and detention', 'jail', /\b(jail|detention|corrections?|correctional|inmate|work release)\b/i],
  ['prosecutor', 'Prosecutor and county attorney', 'courts', /\b(prosecut\w*|district attorney|county attorney|state'?s attorney|criminal district attorney|commonwealth'?s attorney|civil attorney|city attorney|victims?[ /&-]*witness)\b/i],
  ['defender', 'Public defender', 'courts', /\b(public defen\w*|indigent defen\w*|conflict counsel|defense counsel)\b/i],
  ['sheriff', 'Sheriff and patrol', 'police', /\b(sheriff\w*|law enforcement|patrol|police|constables?|marshal|drug (task|control|enforcement)|narcotics|investigat\w*|k-?9|breathalyzer|interlock|traffic enforcement|school resource)\b/i],
  ['coroner', 'Coroner and medical examiner', 'courts', /\b(coroner|medical examiner)\b/i],
  ['courts', 'Courts and court clerks', 'courts', /\b(courts?|judicial|judges?|jury|probation|trial|circuit clerk|clerk of (the )?court|justice of the peace|magistrate|chancery|probate|drug court|bailiff|law library)\b/i],
  ['justice', 'Public safety and justice, combined (not split by office)', 'police', /\b(justice|public safety)\b/i],
  ['elections', 'Elections', 'admin', /\belections?\b/i],
  ['assessor', 'Assessor and property valuation', 'admin', /\b(assessor|apprais\w*|equaliz\w*|reappraisal|revaluation|land records|mapping)\b/i],
  ['treasurer', 'Treasurer and tax collection', 'admin', /\b(treasurer|collector|tax (collection|office)|finance|accounting|budget office|purchasing|procurement|auditor'?s? office|county auditor|financial management|ad valorem)\b/i],
  ['clerk', 'County clerk and records', 'admin', /\b(clerk|recorder|records|auditor|motor vehicle)\b/i],
  ['it', 'Technology and data', 'admin', /\b(information tech\w*|info tech\w*|information services|data processing|technology|automation|computer|gis|telephone)\b/i],
  ['ems', 'Ambulance and EMS', 'health', /\b(ambulance|ems|emergency medical|paramedic)\b/i],
  ['emergency', 'Emergency management and 911', 'police', /\b(emergency|oem|oes|911|e-?911|dispatch|homeland|disaster|civil defense|communications|search (and|&) rescue|safe room|cencom)\b/i],
  ['fire', 'Fire protection', 'fire', /\bfire\b/i],
  ['hospital', 'Hospitals', 'hospitals', /\b(hospitals?|medical center|nursing home)\b/i],
  ['health', 'Public health and mental health', 'health', /\b(health|mental|behavioral|substance|drug and alcohol|animal control|animal shelter|animal services)\b/i],
  ['veterans', 'Veterans services', 'welfare', /\b(veterans?|service officer)\b/i],
  ['welfare', 'Indigent care and human services', 'welfare', /\b(indigent|welfare|human services|social services|seniors?|aging|child support|community services|catastrophic|charity|food|children|youth|families|early childhood)\b/i],
  ['roads', 'Roads and bridges', 'roads', /\b(roads?|r ?& ?b|bridges?|highways?|streets?|sidewalks?|motor fuel|transportation|public works|engineer\w*)\b/i],
  ['solidwaste', 'Solid waste and recycling', 'trash', /\b(solid waste|landfill|sanitation|garbage|trash|recycl\w*|transfer station|waste|environmental services)\b/i],
  ['weeds', 'Weed, pest and mosquito control', 'other', /\b(weeds?|pest|mosquito|gopher|noxious|abatement|vector)\b/i],
  ['extension', 'Extension, 4-H and conservation', 'other', /\b(extension|4-?h|conservation|soil|agricultur\w*|county agent|cannery|range improvement|animal damage)\b/i],
  ['library', 'Libraries', 'libraries', /\blibrar(y|ies)\b/i],
  ['parks', 'Parks, fair and recreation', 'parks', /\b(parks?|recreation|fairs?|fairgrounds|expo|event center|rodeo|waterways|boating|golf|trails?|snowmobile|events)\b/i],
  ['planning', 'Planning, zoning and development', 'housing', /\b(planning|zoning|development|redevelopment|code enforce\w*|economic|inspections?|permits?|housing|parking)\b/i],
  ['schools', 'Schools and colleges', 'schools', /\b(schools?|college|tuition|education|k-12|students?)\b/i],
  ['utilities', 'Utilities (water, sewer, power, airport, port, transit)', 'utilities', /\b(utilit\w*|water|wastewater|sewer|stormwater|aviation|port|transit|metro|airport)\b/i],
  ['buildings', 'Buildings and maintenance', 'admin', /\b(courthouse|buildings?|maintenance|facilit\w*|grounds|janitor\w*|custodial|annex|government center|plant)\b/i],
  ['generaladmin', 'General government, insurance and grants', 'admin', /\b(human resources|personnel|general (operations|government|admin\w*|accounts|items|services)|non[- ]?departmental|sundry|insurance|risk|tort|contingenc\w*|grants?[ -]in[ -]aid|grants?|county contracts|miscellaneous|other county expenses|association of arkansas counties|internal services?|retirement|outside agencies|central appropriations|regionals|contributions)\b/i],
  ['other', 'Cemeteries, airports, museums and other', 'other', /\b(cemeter\w*|airports?|museum|histor\w*|memorial|tourism|advertising|promotion)\b/i],
  ['general', 'General fund, not split by office', 'admin', /\b(general fund|current expense|county general|general)\b/i]
];
// Exact phrases checked before the list above, where a broad word would
// mislead ("Trial Court Administrator" is a court, not the county executive;
// "Health Insurance" is an employee benefit, not public health).
const EARLY = [
  ['courts', /\b(trial court|magistrate court|magistrate fund|district and magistrate|clerk'?s? commissioner|commissioners? fees?|court commissioner|port dist court)\b/i],
  ['benefits', /\bhealth insurance\b/i],
  ['sheriff', /\b(school resource|cops in school|crossing guard|d\.?a\.?r\.?e\.?\b|drug abuse resistance|sheriff training|sheriff aviation|boating safety|metro\/law enforcement)\b/i],
  ['planning', /\b(building (inspect\w*|department|services|official)|land use|development council)\b/i],
  ['solidwaste', /\b(transfer station|landfill water|stormwater)\b/i],
  ['clerk', /\bpassport\b/i],
  ['emergency', /\b(communications? facilit\w*|warning system|citizen corp)\b/i],
  ['treasurer', /\bcommissioner of (the )?revenue\b/i],
  ['buildings', /\bbuilding administrator\b/i],
  ['parks', /\brodeo\b/i],
  ['juvenile', /\bjuvenile justice\b/i],
  // Big-county office names (county budget books, 2026).
  ['elections', /\b(registrar of voters|voter registration|supervisor of elections)\b/i],
  ['defender', /\b(legal defender|legal advocate|alternate (public )?defender)\b/i],
  ['courts', /\b(pretrial services|alternate dispute|dispute resolution)\b/i],
  ['coroner', /\bforensic science\w*\b/i],
  ['welfare', /\b(homeless\w*|care coordination|self-sufficiency|well-being|in[- ]home supportive|cal ?works?|public social services|public assistance|best starts|section 8|community action|child care)\b/i],
  ['health', /\b(crisis care|developmental disabilit\w*|animal care)\b/i],
  ['executive', /\b(executive office|office of (the )?county administrat\w*|county administration|chief administrative officer|chief executive|office of the president|president)\b/i],
  ['treasurer', /\b(chief financial officer|management and budget|office of (management and )?budget)\b/i],
  ['it', /\b(chief information officer|universal services|caps program)\b/i],
  ['buildings', /\b(asset management|real estate)\b/i],
  ['benefits', /\b(equipment services|(retirement|benefits?|insurance) trust)\b/i],
  ['generaladmin', /\b(county counsel|safety and claims|internal (operations|compliance)|people and internal|fixed charges|administrative support|ethics|inspector general)\b/i],
  ['transfers', /\bworking capital\b/i],
  ['capital', /\b(major projects|permanent improvement\w*)\b/i],
  ['debt', /\bcertificates? of obligation\b/i],
  ['environment', /\b(air quality|flood control)\b/i],
  ['utilities', /\bseaport\b/i],
  ['other', /\b(cultural|tourist tax\w*|performing arts|music center|arts (and culture|programs?))\b/i],
  ['welfare', /\b(dcfs|adoption assistance|foster care|kin-?gap|cash assistance|family preservation)\b|^pss\b/i],
  ['hospital', /\brehabilitation center\b/i],
  ['parks', /\bbeaches and harbors\b/i],
  ['buildings', /\brent expense\b/i],
  ['generaladmin', /\bconsumer and business affairs\b/i],
  ['transfers', /\beliminations?\b/i],
  ['jail', /\bsheriff\W+custody\b/i]
];
const LABEL = Object.fromEntries(CATS.map(c => [c[0], c[1]]));
const CENSUS = Object.fromEntries(CATS.map(c => [c[0], c[2]]));

// Arkansas's standard General Fund department codes (AR county financial
// management system): these match exactly, ahead of names.
const AR_CODES = {
  '0100': 'executive', '0107': 'executive', '0109': 'elections', '0419': 'coroner', '0416': 'prosecutor', '0101': 'clerk',
  '0401': 'courts', '0402': 'courts', '0409': 'courts', '0414': 'courts', '0108': 'buildings', '0111': 'buildings', '0117': 'buildings',
  '0300': 'health', '0400': 'sheriff', '0418': 'jail', '0415': 'juvenile', '0417': 'defender', '0801': 'extension', '0103': 'treasurer',
  '0104': 'treasurer', '0105': 'assessor', '0106': 'assessor', '0500': 'emergency', '0800': 'veterans', '0102': 'courts'
};
// Object-of-expense names: a fund broken down only this way is matched as a fund.
const GENERIC = /^(personal services?|personnel services|salar(y|ies)( and wages)?|wages|benefits|fringe|supplies|materials|other services( and charges)?|services and charges|operating( expenses)?|capital( outlay)?|transfers?( out)?|appropriated transfer.*|debt service|contractual|maintenance and operations|equipment|travel|utilities|contingency|salaries and benefits|operations|machinery( and equipment)?|interfund transfers)$/i;

function classify(name, code) {
  const c = String(code || '').split('-').pop();
  if (code && AR_CODES[c] && /^1000-/.test(String(code))) return { cat: AR_CODES[c], how: `Arkansas department code ${c}` };
  const n = String(name || '');
  for (const [key, re] of EARLY) { const m = n.match(re); if (m) return { cat: key, how: `name contains “${m[0].toLowerCase()}”` }; }
  for (const [key, , , re] of CATS) { const m = n.match(re); if (m) return { cat: key, how: `name contains “${m[0].toLowerCase()}”` }; }
  return { cat: null, how: 'no rule fits this name yet' };
}

let CACHE = null;
// A URL may arrive already percent-encoded; encode it exactly once.
const encOnce = (u) => { try { return encodeURI(decodeURI(u)); } catch (e) { return u; } };

function index() {
  if (CACHE && Date.now() - CACHE.at < 3600e3) return CACHE;
  const N = require('../views/national');
  const nat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
  const byHost = {}, byGeo = {};
  for (const c of nat.counties) { byGeo[c.geoid] = c; if (c.site) byHost[c.site] = c; }
  const counties = {}; // geoid -> { geoid, name, st, pop, year, basis, source, total, lines:[] }
  const add = (c, rec) => { counties[c.geoid] = Object.assign({ geoid: c.geoid, name: c.name, st: c.st, slug: c.slug, pop: c.pop2024 || 0 }, rec); };

  // 1. Full County Commons sites: their own budget trees.
  let reg = {};
  try { reg = require('./tenant').registry().tenants || {}; } catch (e) { /* none */ }
  for (const [key, t] of Object.entries(reg)) {
    const c = byHost[t.host]; if (!c) continue; // county or county-equivalent only
    let B; try { B = JSON.parse(fs.readFileSync(path.join(ROOT, t.corpusDir, 'budget-2026.json'), 'utf8')); } catch (e) { continue; }
    if (!(B.meta && B.meta.grand_total > 0)) continue;
    const kids = {};
    for (const n of B.nodes) if (n.parent) (kids[n.parent] = kids[n.parent] || []).push(n);
    // Only the county's own appropriations: trees also carry "adjacent"
    // reference budgets (a city, the school district) that aren't the county's.
    const tops = B.nodes.filter(n => !n.parent && n.section === 'appropriations' && typeof n.amount === 'number');
    const lines = [];
    const link = (n) => `https://${t.host}/line/${encodeURIComponent(n.id)}`;
    // Open a node into its children when the children are named offices (not
    // object codes like "Supplies") that add up to it, and the node is a
    // grouping (a fund, "County departments") rather than one office.
    const take = (n, fund, depth) => {
      const ch = (kids[n.id] || []).filter(k => typeof k.amount === 'number' && k.amount > 0);
      // A transfers or debt line beside named offices doesn't make the list an
      // object-code breakdown (Travis: ten functions, one is "Transfers out").
      const gen = ch.filter(k => GENERIC.test(String(k.name).trim()));
      const ok = depth < 3 && ch.length && (gen.length === 0 || (gen.length * 2 < ch.length && gen.every(k => /^(transfers?( out)?|interfund transfers|debt service|contingency)$/i.test(String(k.name).trim()))))
        && Math.abs(ch.reduce((s, k) => s + k.amount, 0) - n.amount) <= Math.max(2, n.amount * 0.005);
      const own = classify(n.name, n.code);
      if (ok && (!own.cat || own.cat === 'general' || own.cat === 'justice' || depth === 0)) { for (const k of ch) take(k, fund || n.name, depth + 1); return; }
      lines.push(Object.assign({ name: n.name, fund, amount: n.amount, href: link(n) }, own));
    };
    for (const f of tops) take(f, null, 0);
    add(c, { year: B.meta.year, basis: B.meta.layer === 'appropriation' || /arkansas/i.test(c.st) ? 'adopted' : 'adopted', source: { label: `${c.name}’s ${B.meta.year} budget on its County Commons site`, url: `https://${t.host}/budget` }, total: lines.reduce((s, l) => s + l.amount, 0), lines });
  }
  // 2. Idaho county trails from State Controller filings.
  let ID = null; try { ID = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'idaho-trails.json'), 'utf8')); } catch (e) { /* none */ }
  if (ID) for (const [geoid, t] of Object.entries(ID.counties)) {
    const c = byGeo[geoid]; if (!c || counties[geoid]) continue;
    const pdf = (pg) => encOnce(t.url) + '#page=' + pg;
    const lines = [];
    for (const f of t.funds) {
      if (f.depts && f.depts.length && !f.depts_note) for (const d of f.depts) lines.push(Object.assign({ name: d.name, fund: f.name, amount: d.amount, href: pdf(d.page), page: d.page }, classify(d.name)));
      else lines.push(Object.assign({ name: f.name, fund: null, amount: f.amount, href: pdf(f.page), page: f.page }, classify(f.name)));
    }
    add(c, { year: t.fy, basis: t.basis, source: { label: t.title || `${c.name} fiscal ${t.fy} budget filing`, url: encOnce(t.url) }, total: lines.reduce((s, l) => s + l.amount, 0), lines });
  }
  // 3. Big counties read from their own adopted budget documents. A two-year
  // budget is halved so it compares with one-year budgets.
  let CT = null; try { CT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'county-trails.json'), 'utf8')); } catch (e) { /* none */ }
  if (CT) for (const [geoid, t] of Object.entries(CT.counties)) {
    const c = byGeo[geoid]; if (!c || counties[geoid]) continue;
    const yrs = t.years_covered || 1;
    const pdf = (pg) => encOnce(t.url) + '#page=' + pg;
    const lines = [];
    for (const g of t.funds) {
      if (g.depts && g.depts.length && !g.depts_note) for (const d of g.depts) lines.push(Object.assign({ name: d.name, fund: g.name, amount: d.amount / yrs, href: pdf(d.page), page: d.page }, classify(d.name)));
      else lines.push(Object.assign({ name: g.name, fund: null, amount: g.amount / yrs, href: pdf(g.page), page: g.page }, classify(g.name)));
    }
    add(c, { year: t.fy, basis: t.basis, scope: t.scope, halved: yrs === 2 || undefined, source: { label: t.title, url: encOnce(t.url) }, total: lines.reduce((s, l) => s + l.amount, 0), lines });
  }
  // Sum each county's lines by category.
  for (const r of Object.values(counties)) {
    r.byCat = {};
    for (const l of r.lines) { const k = l.cat || 'unmatched'; (r.byCat[k] = r.byCat[k] || { amount: 0, lines: [] }); r.byCat[k].amount += l.amount; r.byCat[k].lines.push(l); }
  }
  CACHE = { at: Date.now(), counties, nat, byGeo };
  return CACHE;
}

module.exports = { index, classify, CATS, LABEL, CENSUS };
