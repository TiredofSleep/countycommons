// Registers every document in inbox/ into data/corpus/documents.json:
// computes SHA-256 and size, merges with the descriptive metadata below.
// Re-runnable; documents.json is fully regenerated from this metadata.
//
// Usage: node pipeline/register.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const INBOX = path.join(ROOT, 'inbox');
const OUT = path.join(ROOT, 'data', 'corpus', 'documents.json');

const STORED = 'Downloaded and hashed; not yet ingested into the money trail.';

const META = [
  {
    id: 'ord-2025-21', file: 'clark-county-budget-2026.pdf',
    title: 'Appropriation Ordinance 2025-21 — Annual Operating Budget for Calendar Year 2026',
    jurisdiction: 'clark-county', layer: 'appropriation', year: 2026,
    source_url: 'https://clarkcountyar.gov/wp-content/uploads/2026/01/Approved_Budge_2026_Clark_County_Arkansas.pdf',
    source_note: 'The signed 9-page ordinance as posted by the county (County Clerk → County Budget 2026). A scan with a rough OCR text layer; it adopts the annual budget by reference.',
    status: 'ingested-manual',
    status_note: 'The money trail was hand-transcribed in July 2026 from OCR of the filed documents. Page-level references are being pinned against the stored PDFs (Docket #7).',
    amends: null, docket_ref: 0
  },
  {
    id: 'clark-budget-packet-2026', file: 'clark-county-artransparency.pdf',
    title: 'Clark County 2026 Budget Packet — fund and department worksheets, salary schedule',
    jurisdiction: 'clark-county', layer: 'appropriation', year: 2026,
    source_url: 'https://artransparency.gov/wp-content/uploads/2026/05/Clark-County.pdf',
    source_note: 'The 96-page budget packet filed on the Arkansas transparency portal: line items by department and fund, plus the salary schedule. This is where page-level citations for the money trail get pinned.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: 7
  },
  {
    id: 'clark-legaudit-2021', file: 'clark-county-legaudit-LOCO01021.pdf',
    title: 'Clark County — Financial and Compliance Report, year ended December 31, 2021 (Arkansas Legislative Audit)',
    jurisdiction: 'clark-county', layer: 'actual', year: 2021,
    source_url: 'https://www.arklegaudit.gov/downloadReport.php?id=LOCO01021',
    source_note: 'Layer two: what was actually received and spent, audited. More recent audit years to be obtained.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: 8
  },
  {
    id: 'clark-budget-2025', file: 'clark-county-2025.pdf',
    title: 'Clark County 2025 Budget (prior year, transparency portal filing)',
    jurisdiction: 'clark-county', layer: 'appropriation', year: 2025,
    source_url: 'https://artransparency.gov/wp-content/uploads/2025/04/Clark-County.pdf',
    source_note: 'Prior-year filing — the baseline for year-over-year change detection.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: null
  },
  // ---- Peer counties, 2026 filings (Docket #6: deputy pay comparison) ----
  {
    id: 'garland-ord-2026', file: 'garland-county-ord-O-25-25.pdf',
    title: 'Garland County Appropriation Ordinance O-25-25 — 2026 Annual Operating Budget',
    jurisdiction: 'garland-county', layer: 'appropriation', year: 2026,
    source_url: 'https://www.garlandcounty.org/ArchiveCenter/ViewFile/Item/1210',
    source_note: 'Signed 2026 ordinance from the county archive.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  {
    id: 'garland-budget-2026', file: 'garland-county-2026.pdf',
    title: 'Garland County 2026 Budget (transparency portal filing)',
    jurisdiction: 'garland-county', layer: 'appropriation', year: 2026,
    source_url: 'https://artransparency.gov/wp-content/uploads/2026/05/Garland-County.pdf',
    source_note: 'Portal filing with worksheets; companion to ordinance O-25-25.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  {
    id: 'hot-spring-budget-2026', file: 'hot-spring-county-2026.pdf',
    title: 'Hot Spring County 2026 Budget (transparency portal filing)',
    jurisdiction: 'hot-spring-county', layer: 'appropriation', year: 2026,
    source_url: 'https://artransparency.gov/wp-content/uploads/2026/05/Hot-Spring-County.pdf',
    source_note: 'Peer-county filing for the deputy-pay and budget comparisons.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  {
    id: 'nevada-budget-2026', file: 'nevada-county-2026.pdf',
    title: 'Nevada County 2026 Budget (transparency portal filing)',
    jurisdiction: 'nevada-county', layer: 'appropriation', year: 2026,
    source_url: 'https://artransparency.gov/wp-content/uploads/2026/05/Nevada-County.pdf',
    source_note: 'Peer-county filing for the deputy-pay and budget comparisons.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  {
    id: 'ouachita-budget-2026', file: 'ouachita-county-2026.pdf',
    title: 'Ouachita County 2026 Budget (transparency portal filing)',
    jurisdiction: 'ouachita-county', layer: 'appropriation', year: 2026,
    source_url: 'https://artransparency.gov/wp-content/uploads/2026/05/Ouachita-County.pdf',
    source_note: 'Peer-county filing for the deputy-pay and budget comparisons.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  {
    id: 'pike-budget-2026', file: 'pike-county-2026.pdf',
    title: 'Pike County 2026 Budget (transparency portal filing)',
    jurisdiction: 'pike-county', layer: 'appropriation', year: 2026,
    source_url: 'https://artransparency.gov/wp-content/uploads/2026/05/Pike-County.pdf',
    source_note: 'Peer-county filing for the deputy-pay and budget comparisons.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  // ---- Peer counties, 2025 filings ----
  {
    id: 'garland-budget-2025', file: 'garland-county-2025.pdf',
    title: 'Garland County 2025 Budget (transparency portal filing)',
    jurisdiction: 'garland-county', layer: 'appropriation', year: 2025,
    source_url: 'https://artransparency.gov/wp-content/uploads/2025/04/Garland-County.pdf',
    source_note: 'Prior-year peer filing.', status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  {
    id: 'hot-spring-budget-2025', file: 'hot-spring-county-budget.pdf',
    title: 'Hot Spring County 2025 Budget (transparency portal filing)',
    jurisdiction: 'hot-spring-county', layer: 'appropriation', year: 2025,
    source_url: 'https://artransparency.gov/wp-content/uploads/2025/04/Hot-Spring-County.pdf',
    source_note: 'Prior-year peer filing.', status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  {
    id: 'nevada-budget-2025', file: 'nevada-county-2025.pdf',
    title: 'Nevada County 2025 Budget (transparency portal filing)',
    jurisdiction: 'nevada-county', layer: 'appropriation', year: 2025,
    source_url: 'https://artransparency.gov/wp-content/uploads/2025/04/Nevada-County.pdf',
    source_note: 'Prior-year peer filing.', status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  {
    id: 'ouachita-budget-2025', file: 'ouachita-county-2025.pdf',
    title: 'Ouachita County 2025 Budget (transparency portal filing)',
    jurisdiction: 'ouachita-county', layer: 'appropriation', year: 2025,
    source_url: 'https://artransparency.gov/wp-content/uploads/2025/04/Ouachita-County.pdf',
    source_note: 'Prior-year peer filing.', status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  {
    id: 'pike-budget-2025', file: 'pike-county-2025.pdf',
    title: 'Pike County 2025 Budget (transparency portal filing)',
    jurisdiction: 'pike-county', layer: 'appropriation', year: 2025,
    source_url: 'https://artransparency.gov/wp-content/uploads/2025/04/Pike-County.pdf',
    source_note: 'Prior-year peer filing.', status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  },
  // ---- Salary surveys (Docket #6 gold) ----
  ...[['clark', 'Clark'], ['garland', 'Garland'], ['hot-spring', 'Hot Springs'], ['nevada', 'Nevada'], ['ouachita', 'Ouachita'], ['pike', 'Pike']].map(([slug, name]) => ({
    id: `${slug}-salary-survey-2024`, file: `${slug}-county-salary-survey-2024.pdf`,
    title: `${name} County Salary Survey (2024, transparency portal)`,
    jurisdiction: `${slug}-county`, layer: 'reference', year: 2024,
    source_url: `https://artransparency.gov/wp-content/uploads/2024/03/${name.replace(' ', '-')}-County-Salary-Survey.pdf`,
    source_note: 'Statewide salary survey filing — direct comparison material for the deputy-pay question.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: 6
  })),
  // ---- Clark historical budgets ----
  ...[
    [2018, '/assets/pdf/2018/Clark_County_Budget_2018.pdf'],
    [2019, '/assets/pdf/2019/Clark_County_Budget_2019.pdf'],
    [2020, '/assets/pdf/2020/Clark_2020_Budget.pdf'],
    [2021, '/assets/pdf/2021/Clark_2021_Budget.pdf'],
    [2022, '/assets/pdf/2022/Clark_County_Budget.pdf']
  ].map(([year, p]) => ({
    id: `clark-budget-${year}`, file: `clark-county-${year}.pdf`,
    title: `Clark County ${year} Budget (transparency portal archive)`,
    jurisdiction: 'clark-county', layer: 'appropriation', year,
    source_url: `https://artransparency.gov${p}`,
    source_note: 'Historical filing — long-run trend material.',
    status: 'stored', status_note: STORED, amends: null, docket_ref: null
  }))
];

const documents = META.map(m => {
  const fp = path.join(INBOX, m.file);
  const buf = fs.readFileSync(fp);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const { file, ...rest } = m;
  return {
    ...rest,
    retrieved_at: '2026-07-18',
    sha256,
    size_bytes: buf.length,
    local_file: `inbox/${file}`
  };
});

fs.writeFileSync(OUT, JSON.stringify({ documents }, null, 2));
console.log(`Registered ${documents.length} documents (${(documents.reduce((a, d) => a + d.size_bytes, 0) / 1048576).toFixed(1)} MB) → documents.json`);
