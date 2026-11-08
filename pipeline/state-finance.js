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
  },
  // OSA County Finances raw data: governmental funds, current + capital + debt.
  MN: {
    agency: 'Minnesota Office of the State Auditor',
    fyLabel: (fy) => `${fy}`,
    title: (fy) => `${fy} Minnesota County Finances Report, raw data`,
    what: 'Every Minnesota county reports its spending to the State Auditor each year in the same categories, so the numbers line up from county to county.',
    scope: 'governmental funds, not utilities',
    spentOn: 'day-to-day costs, building projects and debt payments from its governmental funds (utilities run as businesses are not included)',
    note: 'Lines marked “buildings and equipment” are capital spending; the rest are day-to-day costs. The State Auditor does not break “all other general government” down further.',
    rename: (n) => n.replace(/ \(current\)$/i, '').replace(/ \(capital outlay\)$/i, ': buildings and equipment'),
    map: [
      [/^governing board/i, 'executive'], [/^(administration and finance|all other general government|general government)/i, 'generaladmin'],
      [/^police\/sheriff/i, 'sheriff'], [/^corrections/i, 'jail'], [/^fire/i, 'fire'], [/^ambulance/i, 'ems'], [/^all other public safety/i, 'justice'],
      [/^(administration|maintenance|engineering|construction|snow and ice|street lighting|all other streets)/i, 'roads'],
      [/^(refuse|all other sanitation|sanitation)/i, 'solidwaste'],
      [/^(income maintenance|social services|all other human services|human services)/i, 'welfare'], [/^health/i, 'health'],
      [/^library/i, 'library'], [/^parks/i, 'parks'], [/^(economic development|housing)/i, 'planning'], [/^conservation/i, 'environment'],
      [/^(airport|transit)/i, 'utilities'], [/^cemetery/i, 'other'], [/^(bond principal|other long-term debt|interest and fiscal)/i, 'debt']
    ]
  },
  // DOM "County Budgeted Expenditures By Service Area & FY": ten service areas, no finer lines.
  IA: {
    agency: 'Iowa Department of Management',
    fyLabel: (fy) => `fiscal ${fy} (Jul ${fy - 1} – Jun ${fy})`,
    title: (fy) => `County Budgeted Expenditures by Service Area, fiscal ${fy}`,
    what: 'Every Iowa county files its budget with the Department of Management using the same ten service areas, so the numbers line up from county to county. The state does not publish finer lines.',
    scope: 'all funds, not transfers',
    spentOn: 'all funds (not counting money moved between funds)',
    note: 'Public safety and legal services combines the sheriff, jail, county attorney and courts. Physical health and social services combines public health, general assistance and veterans services. County environment and education covers conservation, extension and libraries.',
    download: false,
    map: [
      [/^public safety & legal/i, 'justice'], [/^physical health/i, 'healthwelfare'], [/^county environment/i, null], [/^roads/i, 'roads'],
      [/^government services to residents/i, 'clerk'], [/^administration$/i, 'generaladmin'], [/^nonprogram/i, 'generaladmin'],
      [/^debt service$/i, 'debt'], [/^capital projects$/i, 'capital']
    ]
  },
  // Gateway bulk Budget Form 4B: every county fund's adopted budget (no departments in the bulk file).
  IN: {
    agency: 'Indiana Gateway for Government Units (Department of Local Government Finance)',
    fyLabel: (fy) => `${fy}`,
    title: (fy) => `Budget Form 4B, adopted budget estimates, ${fy}`,
    what: 'Every Indiana county files its budget through the state’s Gateway site, fund by fund. The state lists funds only; County Commons grouped them into areas by each fund’s name.',
    scope: 'all county funds, as adopted (before state review)',
    spentOn: 'all its funds, as adopted by the county council (the state may certify less)',
    note: 'These are the amounts the county council adopted; the Department of Local Government Finance reviews them and may certify less. Funds include grants and money set aside for one purpose, like federal relief. The “source” link opens the county’s Form 4B in Gateway; pick the year to see it.',
    download: false,
    rename: (n) => n.replace(/^\d{4}-\s*/, '').replace(/\bLc\b/g, 'LC').replace(/\bArp\b/gi, 'ARP'),
    classify: true, groupByCat: true,
    map: []
  },
  // No public statewide budget file (DLG's is behind a login), so: each fiscal
  // court's latest State Auditor audit, final budget by fund and function.
  KY: {
    agency: 'Kentucky Auditor of Public Accounts',
    heading: 'Its budget, from the state audit', budgetWord: 'final budget for',
    fyLabel: (fy) => `the fiscal year that ended June 30, ${fy}`,
    countyLabel: (fy) => `the fiscal year that ended June 30, ${fy}`,
    title: (fy) => `fiscal court audit, fiscal ${fy}`,
    titleFor: (r) => { const m = /Auditreports\/([^/]+)\/(\d{4})/.exec(r.url || ''); return m ? `${decodeURIComponent(m[1]).replace(/([a-z])([A-Z])/g, '$1 $2')} County Fiscal Court audit, fiscal ${m[2]}` : null; },
    what: 'Kentucky doesn’t publish county budgets in one public place, so these come from each county’s latest audit by the State Auditor, which prints the final budget fund by fund. Audits run a year or more behind.',
    scope: 'all budgeted funds, final (amended) budget',
    spentOn: 'all its funds (not counting money moved between funds)',
    note: 'These are the final budget amounts after the fiscal court’s amendments, from the audit’s budget comparison pages. “Administration” is mostly employee benefits and insurance. Each page number opens that page of the audit.',
    download: false, mapOn: 'category',
    map: [
      [/^general government$/i, 'generaladmin'], [/^protection to persons/i, 'justice'], [/^general health/i, 'health'], [/^social services$/i, 'welfare'],
      [/^recreation and culture$/i, 'parks'], [/^debt service$/i, 'debt'], [/^administration$/i, 'generaladmin'], [/^roads?( facilities)?$/i, 'roads'],
      [/^(airports|bus services|(other )?transportation facilities)/i, 'utilities'], [/^capital projects$/i, 'capital'], [/^economic development/i, 'planning'],
      [/^tva community/i, 'generaladmin'], [/asset forfeiture/i, 'sheriff']
    ]
  },
  // Municipal Services certified budgets: the Certificate page, fund by fund.
  KS: {
    agency: 'Kansas Department of Administration (Municipal Services)',
    fyLabel: (fy) => `${fy}`,
    title: (fy) => `certified county budget, ${fy}`,
    titleFor: (r) => r.name ? `${r.name} certified budget, 2026` : null,
    what: 'Every Kansas county files its certified budget with the state Department of Administration. Its first page lists the most the county may spend from each fund this year. The state lists funds only; County Commons grouped them into areas by each fund’s name.',
    scope: 'all budgeted funds, spending authority',
    spentOn: 'all its funds (the most it is allowed to spend)',
    note: 'These are the budget authority amounts from the certificate page: the most the county may spend from each fund. Money moved between funds can be counted in both. Each page number opens that page of the county’s filed budget.',
    download: false, classify: true, groupByCat: true,
    map: []
  },
  // APA budget filings: each county PDF's Schedule of Budgeted Disbursements, by function.
  NE: {
    agency: 'Nebraska Auditor of Public Accounts',
    fyLabel: (fy) => `fiscal ${fy} (Jul ${fy - 1} – Jun ${fy})`,
    title: (fy) => `county budget filing, fiscal ${fy - 1}–${String(fy).slice(2)}`,
    titleFor: (r) => r.name ? `${r.name} budget filing, fiscal 2025–26` : null,
    what: 'Every Nebraska county files its adopted budget with the State Auditor on the same form, so the numbers line up from county to county.',
    scope: 'all funds, including transfers',
    spentOn: 'all its funds, including money moved between funds',
    note: 'These come from the budget form’s Schedule of Budgeted Disbursements. Transfers between funds are included, so some money is counted twice. The cash reserve carried into next year is not counted. Each page number opens that page of the county’s filed budget.',
    download: false,
    regroup: (l) => /^business-type/i.test(l.category) ? 'Businesses the county runs' : /^(public safety|public works) - /i.test(l.name) ? l.name.split(' - ')[0] : l.name,
    map: [
      [/^general government$/i, 'generaladmin'], [/law enforcement$/i, 'sheriff'], [/^public safety - other$/i, 'justice'], [/highways? & roads$/i, 'roads'],
      [/^public works - other$/i, null], [/^public health & social/i, 'healthwelfare'], [/^culture and recreation$/i, 'parks'], [/^community development$/i, 'planning'],
      [/^miscellaneous$/i, 'generaladmin'], [/^(hospital|nursing home)$/i, 'hospital'], [/^(historical society|stadium)$/i, 'other'], [/^self insurance/i, 'benefits'],
      [/^property management/i, 'buildings'], [/^(broadband|sewer)$/i, 'utilities'], [/^(solid waste|landfill)$/i, 'solidwaste'], [/^bonded indebtedness$/i, 'debt'],
      [/^capital outlay$/i, 'capital'], [/^transfers out$/i, 'transfers'], [/^(operating|other|assemble lincoln)$/i, null]
    ]
  },
  // DOR County and Municipal Revenues and Expenditures: governmental funds by function.
  WI: {
    agency: 'Wisconsin Department of Revenue',
    fyLabel: (fy) => `${fy}`,
    title: (fy) => `County and Municipal Revenues and Expenditures, ${fy}`,
    what: 'Every Wisconsin county files a financial report with the Department of Revenue each year in the same categories, so the numbers line up from county to county.',
    scope: 'governmental funds, including transfers',
    spentOn: 'its governmental funds, including debt payments and money moved to other funds (utilities run as businesses are not included)',
    note: 'A few counties report a negative highway amount; it is shown as filed. “Other financing uses” is mostly money moved to other funds.',
    map: [
      [/^general government$/i, 'generaladmin'], [/^law enforcement$/i, 'sheriff'], [/^other public safety$/i, 'justice'], [/^ambulance$/i, 'ems'], [/^fire$/i, 'fire'],
      [/^highway|^road-related|^other transportation$/i, 'roads'], [/^health and human services$/i, 'healthwelfare'], [/^culture and education$/i, null],
      [/^parks and recreation$/i, 'parks'], [/^conservation and development$/i, 'planning'], [/^debt service/i, 'debt'],
      [/solid waste|^other sanitation$/i, 'solidwaste'], [/^other financing uses$/i, 'transfers']
    ]
  },
  // SCO ByTheNumbers County Expenditures (scratch ca_norm.js collapses business funds).
  CA: {
    agency: 'California State Controller’s Office',
    fyLabel: (fy) => `fiscal ${fy} (Jul ${fy - 1} – Jun ${fy})`,
    title: (fy) => `Counties Financial Transactions Report, county expenditures, fiscal ${fy}`,
    what: 'Every California county reports its spending to the State Controller each year in the same categories, so the numbers line up from county to county.',
    scope: 'all funds, including county-run businesses',
    spentOn: 'everything it reports to the state, including hospitals and other services it runs as businesses',
    note: 'Internal service funds (shared services like fleet and insurance that charge the departments) are counted as the state counts them, so some money appears twice. The “source” link shows this county’s rows in the State Controller’s data.',
    mapOn: 'both', classify: true,
    map: [
      [/^debt service and capital outlay \/ capital projects/i, 'capital'], [/^debt service and capital outlay \//i, 'debt'],
      [/\/ police protection$/i, 'sheriff'], [/\/ (adult detention|other detention|jails)/i, 'jail'], [/\/ juvenile detention$/i, 'juvenile'], [/\/ probation$/i, 'courts'],
      [/\/ fire protection$/i, 'fire'], [/\/ district attorney - prosecution$/i, 'prosecutor'], [/\/ (public defender|court appointed counsel)$/i, 'defender'],
      [/\/ (other trial court|trial court|other judicial|grand jury|fifty percent excess|courts$)/i, 'courts'], [/\/ flood control/i, 'environment'],
      [/^public protection \/ other protection/i, 'justice'], [/\/ child support services$/i, 'welfare'], [/\/ (planning and zoning|building inspector|lafco|other protective inspection)/i, 'planning'],
      [/\/ (agricultural commissioner|sealer of weights|agricultural education)/i, 'extension'], [/\/ humane services/i, 'health'], [/\/ coroner$/i, 'coroner'], [/\/ emergency services$/i, 'emergency'],
      [/\/ (recorder|county clerk)$/i, 'clerk'],
      [/\/ (mental health|public health|medical care|drug and alcohol|other health)/i, 'health'], [/\/ (roads|other public ways|transportation systems|transportation terminals|parking facilities)/i, 'roads'],
      [/^public ways.* \/ sanitation$/i, 'solidwaste'],
      [/^public assistance \/ veterans/i, 'veterans'], [/^public assistance \/ care of court wards/i, 'juvenile'], [/^public assistance \//i, 'welfare'],
      [/\/ (recreation facilities|other recreation|small craft harbors|veterans memorial)/i, 'parks'], [/\/ library services$/i, 'library'], [/\/ cultural services$/i, 'other'],
      [/\/ (school administration|other education)$/i, 'schools'],
      [/^general government \/ (property management|other plant acquisition)/i, 'buildings'], [/\/ assessor$/i, 'assessor'], [/\/ elections$/i, 'elections'],
      [/\/ (other finance|treasurer-tax collector|auditor-controller|purchasing agent)$/i, 'treasurer'],
      [/\/ (administrative officer|board of supervisors|clerk of the board|other legislative)/i, 'executive'],
      [/^general government \/ (personnel|county counsel|other counsel|district attorney \(legal advice\)|council of governments|other general government)/i, 'generaladmin'],
      [/^general government \/ promotion$/i, 'other'], [/^general government \/ communications$/i, 'it'],
      [/^businesses the county runs \/ hospital$/i, 'hospital'], [/^businesses the county runs \/ solid waste$/i, 'solidwaste'],
      [/^businesses the county runs \/ (airport|water|transit|sewer|harbor and port|electric|gas)$/i, 'utilities'], [/\/ aid programs/i, 'welfare'], [/\/ (animal regulation)$/i, 'health'], [/\/ (museums|community centers)/i, 'other'],
      [/^businesses the county runs \/ other businesses$/i, null], [/^internal service funds/i, null]
    ]
  },
  // OSC Financial Data for Local Governments (scratch ny_norm.js merges object codes and funds per activity).
  NY: {
    agency: 'New York State Comptroller',
    fyLabel: (fy) => `${fy}`,
    title: (fy) => `Financial Data for Local Governments, counties, ${fy}`,
    what: 'Every New York county files an annual financial report with the State Comptroller using the same account codes, so the numbers line up from county to county.',
    scope: 'all funds, not transfers',
    spentOn: 'all its funds, including county-run businesses (not counting money moved between funds)',
    note: 'In bigger counties, “Distribution of sales tax” is sales tax the county collects and passes on to its cities and towns. “Medicaid to State” is the county’s share of Medicaid, paid to the state. Each line combines salaries, contracts, equipment and benefits for that activity.',
    mapOn: 'both', classify: true,
    map: [
      [/^employee benefits \//i, 'benefits'], [/^debt service \//i, 'debt'], [/\/ distribution of sales tax$/i, 'generaladmin'], [/medicaid/i, 'welfare'],
      [/^education \//i, 'schools'], [/\/ benefits and awards$/i, 'generaladmin'], [/^public safety \/ police$/i, 'sheriff'], [/\/ (jail|penitentiary)$/i, 'jail'],
      [/\/ probation$/i, 'courts'], [/\/ public safety communication/i, 'emergency'], [/\/ depreciation$/i, 'generaladmin'],
      [/\/ (bus operations|railroad|rapid transit)/i, 'utilities'], [/^social services \//i, 'welfare']
    ],
    fallback: [
      [/^health \//i, 'health'], [/^sanitation \//i, 'solidwaste'], [/^transportation \//i, 'roads'], [/^culture and recreation \//i, 'parks'],
      [/^community services \//i, 'welfare'], [/^economic development \//i, 'planning'], [/^utilities \//i, 'utilities'], [/^general government \//i, 'generaladmin'],
      [/^public safety \//i, 'justice']
    ]
  },
  // EDR tabulation of each county's DFS Annual Financial Report, by Uniform Accounting System code.
  FL: {
    agency: 'Florida Office of Economic and Demographic Research',
    fyLabel: (fy) => `fiscal ${fy} (Oct ${fy - 1} – Sep ${fy})`,
    title: (fy) => `county expenditures by account, from Annual Financial Reports, fiscal ${fy}`,
    what: 'Every Florida county files an Annual Financial Report with the state Department of Financial Services using the same account codes; the Legislature’s Office of Economic and Demographic Research tabulates them. So the numbers line up from county to county.',
    scope: 'governmental and business funds, including transfers',
    spentOn: 'its governmental funds and the services it runs as businesses, including money moved between funds (taxes collected for other agencies are not counted)',
    note: '“Inter-fund group transfers out” is money moved from one county fund to another; it is often the biggest line and is counted again where it is spent. Each “source” link opens the county’s spreadsheet; choose the year’s sheet.',
    mapOn: 'code',
    map: [
      [/^51[12] /, 'executive'], [/^513 /, 'treasurer'], [/^51[49] /, 'generaladmin'], [/^515 /, 'planning'], [/^516 /, 'it'], [/^517 /, 'debt'],
      [/^521 /, 'sheriff'], [/^522 /, 'fire'], [/^523 /, 'jail'], [/^524 /, 'planning'], [/^525 /, 'emergency'], [/^526 /, 'ems'], [/^527 /, 'coroner'], [/^528 /, 'generaladmin'], [/^529 /, 'justice'],
      [/^53[1356] /, 'utilities'], [/^534 /, 'solidwaste'], [/^53[789] /, 'environment'],
      [/^541 /, 'roads'], [/^54[234] /, 'utilities'], [/^545 /, 'planning'], [/^549 /, 'roads'],
      [/^55[1249] /, 'planning'], [/^553 /, 'veterans'],
      [/^561 /, 'hospital'], [/^56[235] /, 'health'], [/^56[49] /, 'welfare'],
      [/^571 /, 'library'], [/^57[2459] /, 'parks'], [/^573 /, 'other'],
      [/^581 /, 'transfers'], [/^58[45] |^591 /, 'debt'], [/^587 /, 'clerk'], [/^589 |^593 /, 'generaladmin'], [/^590 /, null],
      [/^602 /, 'prosecutor'], [/^603 |^715 /, 'defender'], [/^[67]\d\d /, 'courts']
    ]
  },
  // SAO Financial Intelligence Tool (BARS accounts), all funds' expenditures section.
  WA: {
    agency: 'Washington State Auditor’s Office',
    fyLabel: (fy) => `${fy}`,
    title: (fy) => `annual report data in the Financial Intelligence Tool, ${fy}`,
    what: 'Every Washington county files its annual report with the State Auditor using the same chart of accounts (BARS), so the numbers line up from county to county.',
    scope: 'all funds, not transfers',
    spentOn: 'all its funds, including utilities and shared internal services (not counting money moved between funds)',
    note: 'These are the annual reports as filed; the State Auditor may revise them after audit. Internal service funds (shared services that charge the departments) are included, so some money appears twice. Depreciation is the yearly wear on buildings and equipment, an accounting cost rather than cash spent. Each “source” link opens the county in the State Auditor’s tool.',
    mapOn: 'code', classify: true,
    map: [
      [/^501\./, null], [/^598\./, null],
      [/^511\./, 'executive'], [/^513\./, 'executive'], [/^512\.3/, 'clerk'], [/^512\./, 'courts'], [/^514\.40/, 'elections'], [/^514\./, 'treasurer'],
      [/^515\.9/, 'defender'], [/^515\.[1-3]/, 'generaladmin'], [/^517\./, 'benefits'], [/^518\.8/, 'it'], [/^518\.[23]/, 'buildings'], [/^51[89]\./, 'generaladmin'],
      [/^521\./, 'sheriff'], [/^522\./, 'fire'], [/^523\./, 'jail'], [/^524\./, 'planning'], [/^525\./, 'emergency'], [/^526\./, 'ems'], [/^527\./, 'juvenile'], [/^528\./, 'emergency'],
      [/^537\./, 'solidwaste'], [/^53\d\./, 'utilities'],
      [/^54[2-5]\./, 'roads'], [/^54[67]\./, 'utilities'], [/^548\./, 'benefits'],
      [/^551\./, 'planning'], [/^55[34]\./, 'environment'], [/^55[789]\./, 'planning'],
      [/^561\./, 'hospital'], [/^56[2468]\./, 'health'], [/^565\.2/, 'veterans'], [/^56[579]\./, 'welfare'],
      [/^571\./, 'parks'], [/^572\./, 'library'], [/^57[35]\./, 'other'], [/^57[46-9]\./, 'parks'],
      [/^59\d\./, 'generaladmin']
    ]
  },
  // Comptroller TAG exports: every county's audited governmental-fund spending.
  TN: {
    agency: 'Tennessee Comptroller of the Treasury',
    fyLabel: (fy) => `fiscal ${fy} (Jul ${fy - 1} – Jun ${fy})`,
    title: (fy) => `TAG data exports, county expenditures, fiscal ${fy}`,
    what: 'The Comptroller’s office audits every Tennessee county and publishes its spending in the same categories, so the numbers line up from county to county.',
    scope: 'governmental funds, including schools',
    spentOn: 'its governmental funds, including the county school department, debt and building projects (not utilities or money moved between funds)',
    note: 'Tennessee counties run their school departments, so education is usually the biggest area. Davidson (Metro Nashville), Hamilton, Knox and Shelby are audited by private firms, and the Comptroller’s data gives only their totals.',
    mapOn: 'both', classify: true,
    map: [
      [/^total \(primary/i, null], [/^education \(/i, 'schools'], [/^debt service \//i, 'debt'], [/^capital projects \/ american rescue/i, 'arpa'], [/^capital projects \//i, 'capital'],
      [/\/ payments to cities$/i, 'generaladmin'], [/\/ employee benefits$/i, 'benefits'], [/\/ local health center$/i, 'health'], [/\/ ambulance/i, 'ems'],
      [/^highways \//i, 'roads'], [/\/ county trustee/i, 'treasurer'], [/\/ county clerk's office$/i, 'clerk'],
      [/\/ (landfill|sanitation management|convenience centers|waste pickup|transfer stations)/i, 'solidwaste'], [/\/ (workhouse|correctional incentive)/i, 'jail']
    ],
    fallback: [
      [/^general government \//i, 'generaladmin'], [/^finance \//i, 'treasurer'], [/^administration of justice \//i, 'courts'], [/^public safety \//i, 'justice'],
      [/^public health and welfare \//i, 'healthwelfare'], [/^social, cultural/i, 'parks'], [/^agriculture/i, 'extension'], [/^other operations \//i, 'generaladmin']
    ]
  },
  // Treasury F-65 county reports on data.michigan.gov: all funds by account range.
  MI: {
    agency: 'Michigan Department of Treasury',
    fyLabel: (fy) => `${fy}`,
    title: (fy) => `F-65 annual local unit fiscal report, counties, ${fy}`,
    what: 'Every Michigan county files the F-65 report with the state Treasury each year using the same account ranges, so the numbers line up from county to county.',
    scope: 'all funds, including transfers',
    spentOn: 'all its funds, including the road commission and other county-run services, and money moved between funds',
    note: 'Transfers out are money moved from one county fund to another and are counted again where spent. Depreciation is the yearly wear on buildings and equipment, an accounting cost rather than cash spent. Some counties put large amounts in “miscellaneous” or “all other” lines. The “source” link shows this county’s rows in the state’s open data.',
    rename: (n) => n.replace(/^Except Above /i, '').replace(/\s+/g, ' ').trim(),
    mapOn: 'name',
    map: [
      [/road commission|public works \(non-act 51\)/i, 'roads'], [/transfers \(out\)/i, 'transfers'], [/all other general government/i, 'generaladmin'],
      [/^mental health/i, 'health'], [/police\/sheriff/i, 'sheriff'], [/corrections\/jail/i, 'jail'], [/human services & medical care/i, 'welfare'],
      [/all other health & welfare/i, 'healthwelfare'], [/^capital outlay/i, 'capital'], [/^miscellaneous$/i, 'generaladmin'], [/health departments/i, 'health'],
      [/child care/i, 'welfare'], [/all other public works/i, null], [/water and\/or sewer|other public works enterprise|airports|public transportation/i, 'utilities'],
      [/^debt service/i, 'debt'], [/all other public safety/i, 'justice'], [/other judicial|circuit court|district\/municipal|friend of the court|probate|trial court|probation|family counseling|law library|grand jury/i, 'courts'],
      [/^depreciation/i, null], [/prosecuting attorney/i, 'prosecutor'], [/building and grounds/i, 'buildings'], [/chief executive|legislative/i, 'executive'],
      [/emergency 911/i, 'emergency'], [/all other community development|economic development|planning and zoning|redevelopment|building inspection/i, 'planning'],
      [/parks and recreation|all other recreation/i, 'parks'], [/finance and tax|^treasurer$/i, 'treasurer'], [/^hospital$/i, 'hospital'], [/sanitation\/landfill/i, 'solidwaste'],
      [/area agency on aging/i, 'welfare'], [/^clerk$|register of deeds/i, 'clerk'], [/emergency services \(ambulance\)/i, 'ems'], [/assessing/i, 'assessor'],
      [/veteran/i, 'veterans'], [/medical examiner/i, 'coroner'], [/attorney\/corporation counsel/i, 'generaladmin'], [/alcoholism/i, 'health'], [/^library$/i, 'library'],
      [/^elections$/i, 'elections'], [/combined public safety/i, 'justice'], [/cultural activities/i, 'other'], [/^fire$/i, 'fire'], [/extraordinary/i, 'generaladmin']
    ]
  },
  // DCED Municipal Statistics: Statewide County Annual Financial Report (DCED-CLGS-20).
  PA: {
    agency: 'Pennsylvania Department of Community and Economic Development',
    fyLabel: (fy) => `${fy}`,
    title: (fy) => `County Annual Financial Report, statewide, ${fy}`,
    what: 'Every Pennsylvania county files an annual financial report with the Department of Community and Economic Development in the same categories, so the numbers line up from county to county.',
    scope: 'governmental funds, not transfers',
    spentOn: 'its governmental funds, including debt and building projects (not utilities or money moved between funds)',
    note: 'Counties choose which category each cost goes in, so some differences between counties are bookkeeping. The “source” link opens the state’s report viewer; pick the county and year.',
    mapOn: 'both',
    map: [
      [/\/ health and welfare$/i, 'healthwelfare'], [/\/ administrative$/i, 'generaladmin'], [/\/ other expenditures$/i, null], [/\/ judicial$/i, 'courts'],
      [/^public safety \/ public safety$/i, 'justice'], [/\/ corrections$/i, 'jail'], [/^debt service/i, 'debt'], [/^capital outlay/i, 'capital'],
      [/\/ culture and recreation$/i, 'parks'], [/\/ conservation$/i, 'environment'], [/^community development \/ economic opportunity$/i, 'welfare'], [/^community development \//i, 'planning'],
      [/\/ highways and streets$/i, 'roads'], [/\/ sanitation$/i, 'solidwaste']
    ]
  }
};

const [st, file] = process.argv.slice(2);
const S = STATES[st];
if (!S || !file) { console.error('Usage: node pipeline/state-finance.js <' + Object.keys(STATES).join('|') + '> <normalized.json>'); process.exit(1); }
const NAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
const geo = {}; for (const c of NAT.counties) geo[c.geoid] = c;
const D = JSON.parse(fs.readFileSync(file, 'utf8'));
const LN = require('../server/lib/lines');
if (!/^https:\/\//.test(D.source_page || '')) { console.error('no https source page'); process.exit(1); }

let out = { states: {}, counties: {} };
try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
for (const [g, r] of Object.entries(out.counties)) if (r.st === st) delete out.counties[g];
out.states[st] = { agency: S.agency, title: S.title(D.fy), fy: Number(D.fy), fy_label: S.fyLabel ? S.fyLabel(Number(D.fy)) : D.fy_label, kind: D.kind, source_page: D.source_page, download_url: S.download === false ? undefined : D.download_url, heading: S.heading, budgetWord: S.budgetWord, groupByCat: S.groupByCat || undefined, what: S.what, scope: S.scope, spentOn: S.spentOn || S.scope, note: S.note, built: new Date().toISOString().slice(0, 10) };

const skipped = [], unmapped = new Set();
let n = 0;
for (const [g, r] of Object.entries(D.counties)) {
  if (!geo[g] || geo[g].st !== st) { skipped.push(`${g} ${r.name}: not a ${st} county in counties.json`); continue; }
  const lines = r.lines.filter(l => l.amount).map(l => {
    const key = S.mapOn === 'category' ? l.category : S.mapOn === 'both' ? `${l.category} / ${l.name}` : S.mapOn === 'code' ? `${l.code} ${l.name}` : l.name;
    let m = S.map.find(([re]) => re.test(key));
    if (!m && S.classify && S.fallback && !LN.classify(S.rename ? S.rename(l.name) : l.name).cat) m = S.fallback.find(([re]) => re.test(key));
    if (!m && S.classify) { const nm = S.rename ? S.rename(l.name) : l.name; const k = LN.classify(nm); return { category: S.groupByCat ? (LN.LABEL[k.cat] || 'Other funds') : l.category, name: nm, amount: l.amount, page: l.page || undefined, cat: k.cat, how: k.how }; }
    if (!m) unmapped.add(l.category + ' / ' + l.name);
    const short = m && m[2] ? (typeof m[2] === 'function' ? m[2](l.name.match(m[0])) : m[2]) : null;
    return { category: S.regroup ? S.regroup(l) : l.category, name: short || (S.rename ? S.rename(l.name) : l.name), amount: l.amount, page: l.page || undefined, cat: m ? m[1] : null, lumped: m && m[1] === null ? true : undefined };
  });
  const sum = lines.reduce((s, l) => s + l.amount, 0);
  if (Math.abs(sum - r.total) > 2) { skipped.push(`${g} ${r.name}: lines add to ${sum}, not ${r.total}`); continue; }
  if (!sum) { skipped.push(`${g} ${r.name}: no spending reported`); continue; }
  const other = S.other && r.other_funds ? Object.fromEntries(Object.entries(S.other).filter(([k]) => r.other_funds[k] > 0).map(([k]) => [k, r.other_funds[k]])) : undefined;
  const fy = r.fy && Number(r.fy) !== Number(D.fy) ? Number(r.fy) : undefined; // a county that hasn't filed the latest year
  const title = S.titleFor ? S.titleFor(r) || undefined : undefined;
  const fy_label = S.countyLabel ? S.countyLabel(fy || Number(D.fy), r) : undefined;
  out.counties[g] = { st, fy, fy_label, title, download: fy && r.download_url && S.download !== false ? r.download_url : undefined, total: sum, url: /^https:\/\//.test(r.url || '') ? r.url : D.source_page, lines, other: other && Object.keys(other).length ? other : undefined };
  n++;
}
out.built = new Date().toISOString().slice(0, 10);
fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
console.log(`${st}: ${n} counties installed (${Object.keys(out.counties).length} in ${path.relative(ROOT, OUT)})`);
for (const s of skipped) console.log('  skipped ' + s);
for (const u of unmapped) console.log('  no category for ' + u);
