// Federal single audits for every county government, from the Federal Audit
// Clearinghouse (api.fac.gov). A county that spends $750,000+ of federal money
// in a year must file one: the auditor's opinion on the financial statements,
// and any findings (material weaknesses, repeat findings, questioned costs).
//   node pipeline/refresh-fac.js            (uses FAC_API_KEY, else DEMO_KEY — 10 requests/hour)
// Writes data/national/audits-fac.json (gitignored, refreshed on the server).
// Never stores the contact names, emails or phones the API returns for county
// staff — only the report, its opinion, its findings counts and the audit firm.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'national', 'audits-fac.json');
const KEY = process.env.FAC_API_KEY || 'DEMO_KEY';
const YEARS = [2024, 2023];
const PAGE = 20000;

async function get(q) {
  const r = await fetch('https://api.fac.gov/' + q, { headers: { 'X-Api-Key': KEY } });
  if (!r.ok) throw new Error(`FAC ${r.status} on ${q.split('?')[0]} (${r.headers.get('x-ratelimit-remaining')} requests left this hour)`);
  return r.json();
}
async function all(table, filter, select) {
  let rows = [], offset = 0;
  for (;;) {
    const page = await get(`${table}?${filter}&select=${select}&limit=${PAGE}&offset=${offset}`);
    rows = rows.concat(page);
    if (page.length < PAGE) return rows;
    offset += PAGE;
  }
}

const N = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
const norm = (s) => String(s || '').toUpperCase().replace(/\b(COUNTY|PARISH|BOROUGH|CENSUS AREA|CITY AND BOROUGH|MUNICIPALITY)\b/g, '').replace(/^ST\.? /, 'SAINT ').replace(/[^A-Z]/g, '');
const byState = {};
for (const c of N.counties) (byState[c.st] = byState[c.st] || {})[norm(c.name)] = c.geoid;
const STATE_NAMES = Object.values(N.states).map(s => s.name.toUpperCase());

// "CLARK COUNTY, ARKANSAS", "COUNTY OF LOS ANGELES", "TRAVIS COUNTY", "ORLEANS PARISH",
// "BOONE COUNTY FISCAL COURT" -> the county government itself, never its schools or districts.
function countyOf(name, st) {
  let n = String(name || '').toUpperCase().replace(/\s+/g, ' ').trim().replace(/[.]/g, '');
  for (const s of STATE_NAMES) n = n.replace(new RegExp(`,? (STATE OF )?${s}$`), '');
  n = n.replace(/,$/, '').trim();
  const pats = [/^COUNTY OF (.+)$/, /^CITY AND COUNTY OF (.+)$/, /^PARISH OF (.+)$/, /^(.+) (COUNTY|PARISH|BOROUGH)( GOVERNMENT| COMMISSION| FISCAL COURT| BOARD OF (COUNTY )?COMMISSIONERS| POLICE JURY| COUNCIL)?$/];
  for (const re of pats) { const m = re.exec(n); if (m) { const g = (byState[st] || {})[norm(m[1])]; if (g) return g; } }
  return null;
}

(async () => {
  const general = await all('general', `audit_year=in.(${YEARS.join(',')})&entity_type=eq.local&or=(auditee_name.ilike.*county*,auditee_name.ilike.*parish*,auditee_name.ilike.*borough*)`,
    'report_id,auditee_name,auditee_state,audit_year,fy_end_date,total_amount_expended,gaap_results,is_going_concern_included,is_internal_control_deficiency_disclosed,is_internal_control_material_weakness_disclosed,is_material_noncompliance_disclosed,is_low_risk_auditee,auditor_firm_name,fac_accepted_date');
  const latest = {};
  for (const g of general) {
    const geo = countyOf(g.auditee_name, g.auditee_state); if (!geo) continue;
    const cur = latest[geo];
    if (!cur || g.audit_year > cur.audit_year || (g.audit_year === cur.audit_year && g.fac_accepted_date > cur.fac_accepted_date)) latest[geo] = g;
  }
  const want = new Set(Object.values(latest).map(g => g.report_id));
  const counts = {};
  for (const y of YEARS) {
    const f = await all('findings', `audit_year=eq.${y}`, 'report_id,is_material_weakness,is_repeat_finding,is_questioned_costs,is_significant_deficiency');
    for (const r of f) {
      if (!want.has(r.report_id)) continue;
      const c = counts[r.report_id] = counts[r.report_id] || { n: 0, mw: 0, repeat: 0, questioned: 0, sd: 0 };
      c.n++; if (r.is_material_weakness === 'Y') c.mw++; if (r.is_repeat_finding === 'Y') c.repeat++; if (r.is_questioned_costs === 'Y') c.questioned++; if (r.is_significant_deficiency === 'Y') c.sd++;
    }
  }
  const yes = (v) => v === true || v === 'Yes' || v === 'Y' || v === 'true';
  const counties = {};
  for (const [geo, g] of Object.entries(latest)) counties[geo] = {
    report_id: g.report_id, name: g.auditee_name, year: +g.audit_year, fy_end: g.fy_end_date, expended: +g.total_amount_expended || null,
    opinion: g.gaap_results || null, going_concern: yes(g.is_going_concern_included),
    weakness: yes(g.is_internal_control_material_weakness_disclosed), deficiency: yes(g.is_internal_control_deficiency_disclosed),
    noncompliance: yes(g.is_material_noncompliance_disclosed), low_risk: yes(g.is_low_risk_auditee), firm: g.auditor_firm_name || null,
    findings: counts[g.report_id] || { n: 0, mw: 0, repeat: 0, questioned: 0, sd: 0 }
  };
  fs.writeFileSync(OUT, JSON.stringify({ fetched: new Date().toISOString(), years: YEARS, source: 'Federal Audit Clearinghouse (GSA), single audits', url: 'https://app.fac.gov/dissemination/search/', counties }));
  console.log(`county audits: ${general.length} candidate reports → ${Object.keys(counties).length} county governments; ${Object.values(counties).filter(c => c.findings.n).length} with findings`);
})().catch(e => { console.error('refresh failed:', e.message); process.exit(1); });
