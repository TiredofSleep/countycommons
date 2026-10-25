// Clark County petitions moved off the site's own pages (Oct 2026): asks that
// only make sense in Clark County or Arkadelphia. Started by Brayden Sanders.
// Idempotent by title.  node pipeline/clark-petitions.js [--post]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require('../server/priorities');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tenants.json'), 'utf8')).tenants;
const county = JSON.parse(fs.readFileSync(path.join(ROOT, T.clarkar.configPath), 'utf8'));
const by = 'Brayden Sanders, founder of County Commons';
const items = [
  { level: 'county', title: 'Report where the county’s hospital and college property-tax mills go, in the county’s annual report',
    why: 'The state’s 2025 millage report lists 1 mill each, countywide, for the hospital and for the college. At Clark County’s assessed value, one mill is roughly $346,000 a year. Neither levy appears in the county’s 2026 budget ordinance, and the documents gathered so far don’t name who receives the money. We ask the county to report both, each year, in its annual report.',
    src: [{ url: '/documents#acd-millage-2025', label: 'Arkansas millage report, 2025' }, { url: '/docket#i11', label: 'Docket #11' }, { url: '/documents#clark-legaudit-2023', label: 'Clark County audit, 2023' }] },
  { level: 'city-arkadelphia', title: 'Publish Arkadelphia’s yearly water-loss rate',
    why: 'Water that leaks or goes unbilled was already pumped and treated. Arkadelphia has not published how much of its water is lost (Docket #12). We ask the city to publish its water-loss rate every year.',
    src: [{ url: '/docket#i12', label: 'Docket #12' }] },
  { level: 'city-arkadelphia', title: 'Publish who would pay to extend water and sewer to the Southwest Arkansas Mega Site',
    why: 'The 991-acre Southwest Arkansas Mega Site is owned by the Economic Development Corporation of Clark County (Docket #5). No document gathered so far shows whether a large new user or existing ratepayers would pay to extend water and sewer to it (Docket #16). We ask the city to publish who would pay.',
    src: [{ url: '/docket#i16', label: 'Docket #16' }, { url: '/docket#i5', label: 'Docket #5' }] },
  { level: 'city-arkadelphia', title: 'Pilot a natural pre-filter at the water plant and publish the before-and-after results',
    why: 'Arkadelphia’s 2023 water quality report shows chlorine byproducts (TTHM) at a running annual average of 54 parts per billion, under the federal limit of 80; single readings ranged up to 85. The city draws from the Ouachita River, which carries natural organic matter that forms these byproducts. At four U.S. riverbank-filtration sites, dissolved organic carbon fell 55% on average. We ask the city to pilot a natural pre-filter for one season and publish the results.',
    src: [{ url: '/documents#arkadelphia-ccr-2023', label: 'Arkadelphia water quality report, 2023' }, { url: 'https://www.unh.edu/wttac/Project_Summaries/assessing_rbf_awwa_journal.pdf', label: 'Riverbank filtration study (AWWA Journal)' }] },
  { level: 'city-arkadelphia', title: 'Finish the city’s lead service line inventory so it can apply for state revolving fund money',
    why: 'Federal money to replace lead pipes is delivered through state revolving funds, which lend for water projects and forgive part of some loans. Arkadelphia’s lead service line inventory is listed as missing (Docket #15). We ask the city to finish it so it can apply.',
    src: [{ url: 'https://www.epa.gov/dwsrf/how-drinking-water-state-revolving-fund-works', label: 'EPA, how the Drinking Water State Revolving Fund works' }, { url: '/docket#i15', label: 'Docket #15' }] },
  { level: 'county', title: 'Send a letter of intent for Arkansas’s County Courthouse Restoration Grant',
    why: 'The Arkansas Historic Preservation Program is taking letters of intent for its County Courthouse Restoration Grants. Applications open November 16, 2026, and are due January 27, 2027. We ask Clark County to send a letter of intent.',
    src: [{ url: 'https://www.arkansasheritage.com/arkansas-preservation/about/available-grants', label: 'Arkansas Historic Preservation Program, available grants' }] },
  { level: 'county', title: 'Connect the county to the Arkansas Gleaning Project',
    why: 'The Arkansas Gleaning Project has collected more than 12 million pounds of produce and works with more than 800 hunger-relief groups across all 75 Arkansas counties. We ask Clark County to connect surplus from local gardens, farms and the farmers market to that network.',
    src: [{ url: 'https://arhungeralliance.org/programs/ar-gleaning-project/', label: 'Arkansas Hunger Relief Alliance, Gleaning Project' }] }
];
const have = new Set(Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'priorities.json'), 'utf8')).priorities).filter(p => p.tenant === 'clarkar').map(p => p.title));
const fresh = items.filter(i => !have.has(i.title)).map(i => ({ ...i, tenant: 'clarkar', state: county.state, county, by, campaign: null }));
if (!process.argv.includes('--post')) { console.log(`would post ${fresh.length} Clark petitions (${items.length - fresh.length} already there)`); process.exit(0); }
const r = P.bulkPropose(fresh);
console.log(`posted ${r.posted} Clark petitions`); if (r.blocked.length) console.log('blocked:\n  ' + r.blocked.join('\n  '));
