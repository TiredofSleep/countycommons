// Idaho's 44 counties from Transparent Idaho (the Idaho State Controller's
// local-government reporting): each county's budgeted and actual revenue and
// spending by fiscal year, its official budget and audit PDFs, and every local
// district and city serving it with their own budgets.
//
// Usage: node pipeline/refresh-idaho.js            → data/national/idaho.json
//
// Idaho counties' fiscal year runs Oct 1 – Sep 30 (FY2025 = Oct 2024 – Sep 2025).
// The Controller posts the year's numbers each January. Requests are spaced out
// to be polite to a state server; a full run takes a few minutes.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API = 'https://transparent.idaho.gov/api';
const UA = 'Mozilla/5.0 (compatible; CountyCommons/1.0; +https://countycommons.us)';
const OUT = path.join(ROOT, 'data', 'national', 'idaho.json');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function get(p) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(API + p, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (r.ok) { await sleep(250); return await r.json(); }
    } catch (e) { /* retry */ }
    await sleep(2000 * (i + 1));
  }
  throw new Error('failed: ' + p);
}

const num = (v) => (v === null || v === undefined || v === '' ? null : Math.round(Number(v)));
const docs = (list) => (list || []).map(d => ({ kind: d.Kind, url: d.Url }));

(async () => {
  const N = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
  const geoidOf = {};
  for (const c of N.counties.filter(c => c.st === 'ID')) geoidOf[c.name.replace(/ County$/, '').toLowerCase()] = c.geoid;

  const years = (await get('/getFiscalYears')).map(Number);
  const all = await get('/getAllCounties');
  const out = { source: { label: 'Transparent Idaho — Idaho State Controller', url: 'https://transparent.idaho.gov/' }, retrieved: new Date().toISOString().slice(0, 10), years, counties: {} };

  // County totals, every posted year (plus the next one, in case it has landed).
  const fin = {};
  for (const y of [...years, Math.max(...years) + 1]) {
    let rows = []; try { rows = await get(`/getCountiesFinancial?FiscalYear=${y}`); } catch (e) { continue; }
    for (const r of rows) {
      if (r.ExpenseBudget === null && r.ExpenseActual === null && !(r.ReportDocs || []).length) continue;
      ((fin[r.EntityID] = fin[r.EntityID] || {})[y] = { revenue_budget: num(r.RevenueBudget), expense_budget: num(r.ExpenseBudget), revenue_actual: num(r.RevenueActual), expense_actual: num(r.ExpenseActual), docs: docs(r.ReportDocs) });
    }
  }

  const latest = Math.max(...years);
  for (const c of all) {
    const geoid = geoidOf[c.EntityName.toLowerCase()];
    if (!geoid) { console.warn('no geoid for', c.EntityName); continue; }
    const facts = (await get(`/getCountyFacts?CountyID=${c.EntityID}`))[0] || {};
    const types = await get(`/getCountyEntityTypes?CountyID=${c.EntityID}`);
    const districts = [];
    for (const t of types) {
      // The latest year carries budgets; the year before carries actuals too.
      const byId = {};
      for (const y of [latest - 1, latest]) {
        let rows = []; try { rows = await get(`/getCountyEntities?EntityTypeID=${t.EntityTypeID}&&CountyID=${c.EntityID}&&FiscalYear=${y}`); } catch (e) { continue; }
        for (const r of rows) {
          const d = byId[r.EntityID] = byId[r.EntityID] || { type: t.EntityType, name: r.EntityName, years: {} };
          d.years[y] = { expense_budget: num(r.Budgeted_Expenditures), revenue_budget: num(r.Budgeted_Revenue), expense_actual: num(r.Actual_Expenditures), revenue_actual: num(r.Actual_Revenue), docs: docs(r.ReportDocs) };
        }
      }
      districts.push(...Object.values(byId));
    }
    out.counties[geoid] = {
      name: c.EntityName + ' County', ti_id: c.EntityID,
      url: 'https://transparent.idaho.gov/county/' + c.EntityName.replace(/ /g, '-'),
      square_miles: facts.CountySquareMiles || null, federal_land_pct: facts.PercentOfFedLand ?? null,
      years: fin[c.EntityID] || {}, districts
    };
    console.log(`${c.EntityName}: ${Object.keys(fin[c.EntityID] || {}).length} years, ${districts.length} districts and cities`);
  }
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`wrote ${Object.keys(out.counties).length} counties → ${path.relative(ROOT, OUT)}`);
})().catch(e => { console.error(e.message); process.exit(1); });
