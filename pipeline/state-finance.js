// Install a state's report of what every county actually spent, in the
// standard categories the state makes every county use (Virginia's Auditor of
// Public Accounts, North Carolina's State Treasurer, Georgia's Department of
// Community Affairs). One file per state, built from the state's own download.
//
// Usage: node pipeline/state-finance.js <ST> <normalized.json>
//   normalized.json: { source_page, download_url, fy, fy_label, kind, counties:
//     { "<geoid>": { name, total, url, lines: [{ code, category, name, amount }], other_funds? } } }
// → data/national/state-finance.json, shown on /us/<st>/<county> under "What it
//   spent" and fed into /us/<st>/<county>/compare. Re-running replaces that
//   state only.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'national', 'state-finance.json');

// Each state's report, and how its standard lines map to the shared
// categories used to compare counties (server/lib/lines.js).
const STATES = {
  VA: {
    agency: 'Virginia Auditor of Public Accounts',
    fyLabel: (fy) => `fiscal ${fy} (Jul ${fy - 1} – Jun ${fy})`,
    title: (fy) => `Comparative Report of Local Government Revenues and Expenditures, fiscal ${fy}`,
    what: 'Every Virginia county and city reports its spending to the state in these same categories, so the numbers line up from place to place.',
    scope: 'day-to-day operations, including the school division',
    note: 'This is money spent on day-to-day operations from the general government funds. Education includes the whole school division’s operating spending, paid for with state and federal money as well as local taxes. Capital projects, debt payments and utilities run as businesses are counted separately (below).',
    other: { capital_projects_applications: 'Capital projects', debt_service_applications: 'Debt payments (principal and interest)', enterprise_operations_transfers: 'Utilities and other services run as businesses' },
    map: [
      [/^legislative$/i, 'executive'], [/general and financial administration/i, 'generaladmin'], [/board of elections/i, 'elections'],
      [/^courts$/i, 'courts'], [/commonwealth'?s attorney/i, 'prosecutor'],
      [/law enforcement/i, 'sheriff'], [/fire and rescue/i, 'fire'], [/correction and detention/i, 'jail'], [/^inspections$/i, 'planning'], [/other protection/i, 'emergency'],
      [/highways/i, 'roads'], [/sanitation/i, 'solidwaste'], [/general buildings/i, 'buildings'],
      [/^health$/i, 'health'], [/behavioral health/i, 'health'], [/social services|income support/i, 'welfare'],
      [/^(instruction|administration, attendance|pupil transportation|operation and maintenance|school food)/i, 'schools'], [/community colleges/i, 'schools'],
      [/parks and recreation/i, 'parks'], [/cultural/i, 'other'], [/libraries/i, 'library'],
      [/planning and community/i, 'planning'], [/environmental management/i, 'environment'], [/cooperative extension/i, 'extension'],
      [/non-?departmental/i, 'generaladmin']
    ]
  },
  // AFIR: the summary categories, opened into the AFIR's own lines wherever
  // those lines add up to the summary exactly (scratch nc_lines.js does that).
  NC: {
    agency: 'North Carolina Department of State Treasurer',
    fyLabel: (fy) => `fiscal ${fy} (Jul ${fy - 1} – Jun ${fy})`,
    title: (fy) => `Annual Financial Information Report (AFIR), county data, fiscal ${fy}`,
    what: 'Every North Carolina county files this report with the State Treasurer each year, in the same categories, so the numbers line up from county to county.',
    scope: 'all funds',
    download: false, // the download returns the spreadsheet wrapped in JSON, not something a reader can open
    spentOn: 'everything, from all funds (not counting depreciation or money moved between funds)',
    note: 'Education is what the county paid to the public schools and the community college, not the schools’ whole budget (the state pays most of that). Debt payments are counted in the total.',
    map: [
      [/^school - local current/i, 'schools', 'Public schools: day-to-day costs'], [/^school - capital/i, 'schools', 'Public schools: buildings and equipment'],
      [/^school - other/i, 'schools', 'Public schools: other'], [/^community college -/i, 'schools', 'Community college'],
      [/debt$/i, 'debt'],
      [/^health$/i, 'health'], [/^mental health$/i, 'health'], [/^tanf/i, 'welfare', 'TANF (cash help) paid to the state'], [/special assistance to adults/i, 'welfare', 'Special assistance to adults, paid to the state'],
      [/social services - administration/i, 'welfare', 'Social services: running the programs'], [/social services - direct assistance/i, 'welfare', 'Social services: help paid to people'],
      [/all other human services/i, 'welfare', 'Other human services, including legal aid'], [/^hospitals/i, 'hospital', 'Hospitals'],
      [/^financial administration/i, 'treasurer', 'Finance, budget, tax and purchasing'], [/^governing body/i, 'executive', 'Board of commissioners, manager and clerk'],
      [/^elections$/i, 'elections'], [/^general public buildings/i, 'buildings', 'Public buildings'], [/^central administration/i, 'generaladmin', 'Central administration, other'],
      [/^all other general government$|^general government$/i, 'generaladmin'], [/^legal services/i, 'generaladmin', 'Legal services'],
      [/^sheriff \/ police/i, 'sheriff', 'Sheriff, emergency management and communications'], [/\(etsf\)/i, 'emergency', '911 fund'],
      [/^fire protection$/i, 'fire'], [/^inspections$/i, 'planning'], [/^rescue units$/i, 'ems', 'Rescue squads'], [/^court facilities$/i, 'courts'],
      [/jail/i, 'jail'], [/all other judicial and public safety/i, 'justice', 'Other courts and public safety, including animal control'],
      [/^economic & physical development/i, 'planning', 'Planning, zoning and development'], [/^parks and recreation$/i, 'parks'], [/^libraries$/i, 'library'],
      [/^coliseums, museums/i, 'other', 'Coliseums, museums and culture'], [/^solid waste/i, 'solidwaste', 'Trash, street cleaning and landfill'],
      [/natural resources/i, 'environment', 'Natural resources and environment'], [/^drainage & watershed$/i, 'environment'],
      [/^all other-\(including unallocated fringe benefits\) - (\w[\w ]*)/i, 'generaladmin', (m) => `Other, including employee benefits not assigned (${m[1].toLowerCase()})`],
      [/^mass transit/i, 'utilities', 'Transit (bus, rail)'], [/^airport$/i, 'utilities'], [/^water supply/i, 'utilities', 'Water'], [/^sewerage/i, 'utilities', 'Sewer'],
      [/^storm water$/i, 'utilities'], [/cemeteries/i, 'other', 'Cemeteries'], [/^streets & highways|^all other transportation$/i, 'roads'], [/^parking facilities/i, 'planning', 'Parking'],
      [/^other \(transportation/i, null]
    ]
  },
  // RLGF: each county's own workbook, by Georgia's uniform chart of accounts
  // function codes (scratch ga_combine.js picks the latest filed year).
  GA: {
    agency: 'Georgia Department of Community Affairs',
    fyLabel: (fy) => `the fiscal year that ended in ${fy}`,
    countyLabel: (fy, r) => r.fiscal_year_end ? `the fiscal year that ended ${r.fiscal_year_end}, ${fy}` : `the fiscal year that ended in ${fy}`,
    title: (fy) => `Report of Local Government Finances, fiscal ${fy}`,
    what: 'Every Georgia county files this report with the Department of Community Affairs each year, using the state’s standard list of government functions, so the numbers line up from county to county.',
    scope: 'operations and capital, including utility systems, not debt',
    spentOn: 'day-to-day costs and building projects, including utility systems like water and sewer (not counting debt payments or money moved between funds)',
    note: 'These are the numbers as the county filed them; they are not audited. Each county picks its own fiscal year, most often ending June 30 or December 31. Consolidated city-county governments (like Athens-Clarke and Augusta-Richmond) also pay for city services. Each “source” link opens the county’s own filed workbook.',
    download: false,
    map: [
      [/^(legislative|executive)$/i, 'executive'], [/^elections$/i, 'elections'], [/^financial$|^internal audit$|^tax commissioner$/i, 'treasurer'], [/^tax assessor$/i, 'assessor'],
      [/^data processing/i, 'it'], [/^records management$/i, 'clerk'], [/^general government buildings$/i, 'buildings'], [/^general engineering$/i, 'roads'],
      [/^(law|human resources|risk management|public information|customer service|general administration fees)$/i, 'generaladmin'],
      [/^district attorney$/i, 'prosecutor'], [/^juvenile court$/i, 'juvenile'], [/^public defender/i, 'defender'],
      [/^(judicial admin|accountability courts|clerk of courts|state court|magistrate court|probate court|recorder's court|municipal court|grand jury|law library)/i, 'courts'],
      [/^public safety administration$/i, 'justice'], [/^(police protection|sheriff's office)$/i, 'sheriff'], [/^(prisoner custody|jail operations|corrections)$/i, 'jail'],
      [/^fire protection$/i, 'fire'], [/^ems/i, 'ems'], [/^coroner/i, 'coroner'], [/^e-911/i, 'emergency'], [/^other protections$/i, 'emergency'], [/^animal control$/i, 'health'],
      [/^public works administration$|^roads, streets/i, 'roads'], [/^(storm drainage|wastewater|water|electric|natural gas|natural gas supply system|telecommunications|cable television|airport|water and sewer system)/i, 'utilities'],
      [/solid waste|recyclables|closure and post|landfill|yard trimmings/i, 'solidwaste'], [/^maintenance shop$/i, 'benefits'], [/^cemetery$/i, 'other'],
      [/^intergovernmental payments of splost$/i, 'generaladmin'],
      [/^health$/i, 'health'], [/^(welfare|community services|economic opportunity)/i, 'welfare'], [/^public education \(health/i, null],
      [/^(recreation|parks)$/i, 'parks'], [/^libraries$/i, 'library'],
      [/^conservation/i, 'extension'], [/^(protective inspection|urban redevelopment|planning and zoning|economic development)/i, 'planning'],
      [/^other enterprise funds$/i, null]
    ]
  }
};

const [st, file] = process.argv.slice(2);
const S = STATES[st];
if (!S || !file) { console.error('Usage: node pipeline/state-finance.js <' + Object.keys(STATES).join('|') + '> <normalized.json>'); process.exit(1); }
const NAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
const geo = {}; for (const c of NAT.counties) geo[c.geoid] = c;
const D = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!/^https:\/\//.test(D.source_page || '')) { console.error('no https source page'); process.exit(1); }

let out = { states: {}, counties: {} };
try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
for (const [g, r] of Object.entries(out.counties)) if (r.st === st) delete out.counties[g];
out.states[st] = { agency: S.agency, title: S.title(D.fy), fy: Number(D.fy), fy_label: S.fyLabel ? S.fyLabel(Number(D.fy)) : D.fy_label, kind: D.kind, source_page: D.source_page, download_url: S.download === false ? undefined : D.download_url, what: S.what, scope: S.scope, spentOn: S.spentOn || S.scope, note: S.note, built: new Date().toISOString().slice(0, 10) };

const skipped = [], unmapped = new Set();
let n = 0;
for (const [g, r] of Object.entries(D.counties)) {
  if (!geo[g] || geo[g].st !== st) { skipped.push(`${g} ${r.name}: not a ${st} county in counties.json`); continue; }
  const lines = r.lines.filter(l => l.amount).map(l => {
    const m = S.map.find(([re]) => re.test(l.name));
    if (!m) unmapped.add(l.category + ' / ' + l.name);
    const short = m && m[2] ? (typeof m[2] === 'function' ? m[2](l.name.match(m[0])) : m[2]) : null;
    return { category: l.category, name: short || l.name, amount: l.amount, cat: m ? m[1] : null };
  });
  const sum = lines.reduce((s, l) => s + l.amount, 0);
  if (Math.abs(sum - r.total) > 2) { skipped.push(`${g} ${r.name}: lines add to ${sum}, not ${r.total}`); continue; }
  if (!sum) { skipped.push(`${g} ${r.name}: no spending reported`); continue; }
  const other = S.other && r.other_funds ? Object.fromEntries(Object.entries(S.other).filter(([k]) => r.other_funds[k] > 0).map(([k]) => [k, r.other_funds[k]])) : undefined;
  const fy = r.fy && Number(r.fy) !== Number(D.fy) ? Number(r.fy) : undefined; // a county that hasn't filed the latest year
  const fy_label = S.countyLabel ? S.countyLabel(fy || Number(D.fy), r) : undefined;
  out.counties[g] = { st, fy, fy_label, download: fy && r.download_url && S.download !== false ? r.download_url : undefined, total: sum, url: /^https:\/\//.test(r.url || '') ? r.url : D.source_page, lines, other: other && Object.keys(other).length ? other : undefined };
  n++;
}
out.built = new Date().toISOString().slice(0, 10);
fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
console.log(`${st}: ${n} counties installed (${Object.keys(out.counties).length} in ${path.relative(ROOT, OUT)})`);
for (const s of skipped) console.log('  skipped ' + s);
for (const u of unmapped) console.log('  no category for ' + u);
