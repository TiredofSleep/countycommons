// Builds data/national/counties.json — the base template for every U.S.
// county — from national public datasets downloaded into a raw folder:
//   node pipeline/national.js <rawDir>
// <rawDir> holds: 2024_Gaz_counties_national.txt (Census gazetteer),
// co-est2024-alldata.csv (Census population estimates), sdwis/<ST>_WATER_SYSTEM_<n>.json
// and sdwis/<ST>_GEOGRAPHIC_AREA_<n>.json (EPA Envirofacts, active community
// systems), vera.csv (Vera Institute incarceration trends, county).
// Personal names and phone numbers in EPA records are never copied.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const RAW = process.argv[2];
if (!RAW) { console.error('usage: node pipeline/national.js <rawDir>'); process.exit(1); }

const csvRows = (text) => {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
};
const norm = (s) => String(s || '').toLowerCase().replace(/\b(county|parish|borough|census area|city and borough|municipality|municipio)\b/g, '').replace(/^st\.? /, 'saint ').replace(/[^a-z]/g, '');

// --- Census: counties, area, population
const gaz = fs.readFileSync(path.join(RAW, '2024_Gaz_counties_national.txt'), 'latin1').split(/\r?\n/).filter(Boolean).map(l => l.split('\t').map(x => x.trim()));
const gh = gaz.shift();
const G = (r, k) => r[gh.indexOf(k)];
const pop = csvRows(fs.readFileSync(path.join(RAW, 'co-est2024-alldata.csv'), 'latin1'));
const ph = pop.shift();
const P = (r, k) => r[ph.indexOf(k)];
const states = {}, popBy = {};
for (const r of pop) {
  if (!r[0]) continue;
  if (P(r, 'SUMLEV') === '040') states[P(r, 'STATE')] = P(r, 'STNAME');
  if (P(r, 'SUMLEV') === '050') popBy[P(r, 'STATE') + P(r, 'COUNTY')] = { p24: +P(r, 'POPESTIMATE2024'), p20: +P(r, 'POPESTIMATE2020') };
}
const stName = {};
const counties = [];
for (const r of gaz) {
  const geoid = G(r, 'GEOID'), st = G(r, 'USPS'), name = G(r, 'NAME');
  if (!states[geoid.slice(0, 2)]) continue;
  stName[st] = states[geoid.slice(0, 2)];
  const p = popBy[geoid] || {};
  let slug = name.toLowerCase().replace(/ (county|parish)$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  counties.push({ geoid, st, name, slug, pop2024: p.p24 || null, pop2020: p.p20 || null,
    land_sqmi: +G(r, 'ALAND_SQMI') || null, lat: +G(r, 'INTPTLAT') || null, lon: +G(r, 'INTPTLONG') || null });
}
// unique slugs within a state
const seen = {};
for (const c of counties) { const k = c.st + '/' + c.slug; if (seen[k]) c.slug += '-' + c.geoid; seen[k] = 1; }

// --- EPA SDWIS: active community water systems by county served
const SRC = { GW: 'groundwater', SW: 'surface water', GU: 'groundwater (surface-influenced)', GWP: 'buys groundwater', SWP: 'buys surface water', GUP: 'buys groundwater' };
const OWN = { L: 'local government', P: 'private', M: 'public/private', F: 'federal', S: 'state', N: 'tribal' };
const dir = path.join(RAW, 'sdwis');
const byCounty = {};
for (const st of Object.keys(stName)) {
  const sys = {}; const geo = [];
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!f.startsWith(st + '_')) continue;
    let rows; try { rows = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
    if (!Array.isArray(rows)) continue;
    if (f.includes('_WATER_SYSTEM_')) for (const w of rows) { if (w.pws_activity_code === 'A') sys[w.pwsid] = w; }
    else geo.push(...rows);
  }
  for (const g of geo) {
    if (!String(g.area_type_code || '').includes('CN') || !g.county_served || !sys[g.pwsid]) continue;
    for (const cs of String(g.county_served).split(',')) {
      const k = st + '|' + norm(cs);
      (byCounty[k] = byCounty[k] || new Map()).set(g.pwsid, sys[g.pwsid]);
    }
  }
}
for (const c of counties) {
  const m = byCounty[c.st + '|' + norm(c.name)];
  if (!m) continue;
  const list = [...m.values()].sort((a, b) => (b.population_served_count || 0) - (a.population_served_count || 0));
  c.water = { systems: list.length, pop_served: list.reduce((s, w) => s + (w.population_served_count || 0), 0),
    top: list.slice(0, 8).map(w => ({ name: String(w.pws_name || '').replace(/\s+/g, ' ').trim(), pwsid: w.pwsid, pop: w.population_served_count || 0,
      source: [SRC[w.primary_source_code || w.gw_sw_code], OWN[w.owner_type_code]].filter(Boolean).join(' · ') })) };
}

// --- Vera incarceration trends: latest county jail population
const vp = path.join(RAW, 'vera.csv');
if (fs.existsSync(vp)) {
  const v = csvRows(fs.readFileSync(vp, 'utf8')); const vh = v.shift();
  const I = (k) => vh.indexOf(k);
  const iF = [I('fips'), I('county_fips')].find(i => i >= 0), iY = I('year'), iP = [I('total_jail_pop'), I('jail_pop')].find(i => i >= 0), iR = [I('total_jail_pop_rate'), I('jail_pop_rate')].find(i => i >= 0);
  const best = {};
  for (const r of v) {
    const fips = String(r[iF] || '').padStart(5, '0'), y = +r[iY], p = parseFloat(r[iP]);
    if (!y || !Number.isFinite(p)) continue;
    (best[fips] = best[fips] || []).push({ year: y, pop: p, rate: iR >= 0 ? parseFloat(r[iR]) || null : null });
  }
  for (const c of counties) {
    const s = (best[c.geoid] || []).sort((a, b) => b.year - a.year);
    if (!s.length) continue;
    const prev = s.find(x => x.year <= s[0].year - 5);
    c.jail = { year: s[0].year, pop: Math.round(s[0].pop), rate: s[0].rate ? Math.round(s[0].rate) : null, prev: prev ? { year: prev.year, pop: Math.round(prev.pop) } : null };
  }
}

// --- Elections: the state's next election, where we have the state file
const elections = {};
for (const [st, name] of Object.entries(stName)) {
  const f = path.join(ROOT, 'data', 'corpus', 'elections-' + name.toLowerCase().replace(/\s+/g, '-') + '.json');
  if (!fs.existsSync(f)) continue;
  const e = JSON.parse(fs.readFileSync(f, 'utf8'));
  const next = (e.elections || []).sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0];
  if (!next) continue;
  const lines = (next.dates || []).map(d => `${d.label}: ${d.end ? `${d.date} to ${d.end}` : d.date}.`);
  const src = [].concat(...(next.dates || []).map(d => d.src || [])).filter((s, i, a) => a.findIndex(x => x.url === s.url) === i).slice(0, 3);
  elections[st] = { name: next.name, date: next.date, date_long: new Date(next.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), lines, src };
}

// --- Built County Commons sites
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tenants.json'), 'utf8')).tenants;
const STATE_ABBR = Object.fromEntries(Object.entries(stName).map(([a, n]) => [n, a]));
for (const t of Object.values(T)) {
  let cfg; try { cfg = JSON.parse(fs.readFileSync(path.join(ROOT, t.configPath), 'utf8')); } catch (e) { continue; }
  const st = STATE_ABBR[cfg.state]; if (!st) continue;
  const want = norm(cfg.turnout_county || cfg.name);
  const c = counties.find(x => x.st === st && norm(x.name) === want);
  if (c && (!c.site || /County$/.test(cfg.name))) c.site = t.host;
}

const readJ0 = (f) => { try { return JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')); } catch (e) { return null; } };
// --- Cities, towns and named communities in each county (Census 2020
// place-by-county file), so "what county is <town> in" lands on its county.
const pc = path.join(RAW, 'place_county.txt');
if (fs.existsSync(pc)) {
  const lines = fs.readFileSync(pc, 'latin1').split(/\r?\n/).slice(1).map(l => l.split('|')).filter(r => r.length > 8);
  const counts = {};
  for (const r of lines) counts[r[0] + r[4]] = (counts[r[0] + r[4]] || []).concat(r[1] + r[2]);
  const byGeoP = Object.fromEntries(counties.map(c => [c.geoid, c]));
  for (const r of lines) {
    const c = byGeoP[r[1] + r[2]]; if (!c) continue;
    const kind = r[7] === 'INCORPORATED PLACE' ? 'inc' : 'cdp';
    const others = (counts[r[0] + r[4]] || []).filter(g => g !== c.geoid).map(g => (byGeoP[g] || {}).name).filter(Boolean);
    (c.places = c.places || []).push({ name: r[6], kind, also: others.length ? others : undefined });
  }
  for (const c of counties) if (c.places) c.places.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'inc' ? -1 : 1) || a.name.localeCompare(b.name));
}

// --- Schools: Census school system finances, districts grouped by county of the
// district office (schools2023.json from elsec23.xlsx; dollars in thousands).
const byGeo = Object.fromEntries(counties.map(c => [c.geoid, c]));
const sch = readJ0('schools2023.json');
if (sch) for (const d of sch.districts) {
  const c = byGeo[String(d.CONUM).padStart(5, '0')]; if (!c || !(d.V33 > 0)) continue;
  c.schools = c.schools || { year: sch.year, districts: [] };
  c.schools.districts.push({ name: String(d.NAME).replace(/\s+/g, ' ').trim(), nces: d.NCESID, enroll: d.V33,
    rev: d.TOTALREV * 1000, fed: d.TFEDREV * 1000, state: d.TSTREV * 1000, local: d.TLOCREV * 1000, spend: d.TOTALEXP * 1000,
    current: d.TCURELSC * 1000, capital: d.TCAPOUT * 1000, debt: d._19H * 1000 });
}
for (const c of counties) if (c.schools) c.schools.districts.sort((a, b) => b.enroll - a.enroll);

// --- Health (County Health Rankings), disaster risk (FEMA NRI), federal grants (USAspending)
const chr = readJ0('chr2025.json');
if (chr) for (const c of counties) { const h = chr.data[c.geoid]; if (h) { c.health = h; } }
const chrState = {};
if (chr) for (const [f, v] of Object.entries(chr.data)) if (f.endsWith('000')) chrState[f.slice(0, 2)] = v;
const HZ = { AVLN: 'Avalanche', CFLD: 'Coastal flooding', CWAV: 'Cold wave', DRGT: 'Drought', ERQK: 'Earthquake', HAIL: 'Hail', HWAV: 'Heat wave', HRCN: 'Hurricane', ISTM: 'Ice storm', LNDS: 'Landslide', LTNG: 'Lightning', IFLD: 'River and inland flooding', SWND: 'Strong wind', TRND: 'Tornado', TSUN: 'Tsunami', VLCN: 'Volcano', WFIR: 'Wildfire', WNTW: 'Winter weather' };
for (const f of fs.readdirSync(RAW).filter(f => /^nri_\d+\.json$/.test(f))) {
  for (const { attributes: a } of JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')).features) {
    const c = byGeo[a.STCOFIPS]; if (!c) continue;
    const hz = Object.keys(HZ).map(k => ({ name: HZ[k], eal: a[k + '_EALT'] || 0, rating: a[k + '_RISKR'] })).filter(h => h.eal > 0).sort((x, y) => y.eal - x.eal).slice(0, 5);
    c.risk = { rating: a.RISK_RATNG, pctl: a.RISK_SPCTL, eal: a.EAL_VALT, eal_rating: a.EAL_RATNG, sovi: a.SOVI_RATNG, resilience: a.RESL_RATNG, ver: a.NRI_VER, top: hz };
  }
}
// American Rescue Plan Act money (USAspending disaster/emergency fund code V),
// by recipient location, March 2021 to date — all ARPA programs, not just the
// county government's own State and Local Fiscal Recovery Fund share.
const arpa = readJ0('arpa_county.json');
if (arpa) for (const r of arpa.results) { const c = byGeo[r.shape_code]; if (c) c.arpa = { amount: r.aggregated_amount, per_capita: r.per_capita }; }
const usas = readJ0('usas_fy25.json');
if (usas) for (const r of usas.results) { const c = byGeo[r.shape_code]; if (c) c.fedgrants = { fy: 2025, amount: r.aggregated_amount, per_capita: r.per_capita }; }

// --- Bridges: FHWA National Bridge Inventory 2025, per-state delimited files
const nbiDir = path.join(RAW, 'nbi');
if (fs.existsSync(nbiDir)) for (const f of fs.readdirSync(nbiDir)) {
  const lines = fs.readFileSync(path.join(nbiDir, f), 'latin1').split(/\r?\n/).filter(Boolean);
  const split = (l) => { const o = []; let cur = '', q = false; for (const ch of l) { if (ch === "'") q = !q; else if (ch === ',' && !q) { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o.map(x => x.trim()); };
  const h = split(lines.shift()); const I = (k) => h.indexOf(k);
  const iS = I('STATE_CODE_001'), iC = I('COUNTY_CODE_003'), iB = I('BRIDGE_CONDITION'), iF = I('FACILITY_CARRIED_007'), iX = I('FEATURES_DESC_006A'), iY = I('YEAR_BUILT_027'), iA = I('ADT_029'), iO = I('OTHER_STATE_CODE_098A');
  for (const l of lines) {
    const r = split(l); const geo = String(r[iS]).padStart(2, '0') + String(r[iC]).padStart(3, '0');
    const c = byGeo[geo]; if (!c) continue;
    const b = c.bridges = c.bridges || { year: 2025, total: 0, good: 0, fair: 0, poor: 0, worst: [] };
    b.total++; const k = { G: 'good', F: 'fair', P: 'poor' }[r[iB]]; if (k) b[k]++;
    if (r[iB] === 'P') b.worst.push({ road: r[iF], over: r[iX], built: +r[iY] || null, adt: +r[iA] || 0 });
  }
}
for (const c of counties) if (c.bridges) c.bridges.worst = c.bridges.worst.sort((a, b) => b.adt - a.adt).slice(0, 6);

// --- Open federal grants county governments can apply for (Grants.gov), research-only programs dropped
const gg = readJ0('gg_posted.json');
const grantsOpen = gg ? require('../server/lib/grants-open').filter(gg.data.oppHits) : [];

// --- ARPA State and Local Fiscal Recovery Funds: each county government's
// allocation and its projects, and each city or town's totals, from Treasury's
// reporting data (slfrf.json, prepped from the workbook). Written to its own
// file, data/national/arpa.json, loaded only by pages that show it.
const sl = readJ0('slfrf.json');
if (sl) {
  const strip = (s) => norm(String(s).replace(/^(city|town|village|borough|township|municipality)\s+of\s+/i, '').replace(/\s+(city|town|village)$/i, ''));
  const placeIdx = {};
  for (const c of counties) for (const p of c.places || []) if (p.kind === 'inc') { const k = c.st + '|' + strip(p.name); (placeIdx[k] = placeIdx[k] || []).push(c.geoid); }
  const A = { source: sl.source, url: sl.url, counties: {}, cities: {} };
  const clean = (s) => String(s || '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
  for (const r of sl.recipients) {
    const st = STATE_ABBR[String(r.state || '').trim()]; if (!st) continue;
    const nm = String(r.name).replace(/,\s*[A-Za-z .]+$/, '').trim();
    const isCounty = (/\b(county|parish)\b/i.test(nm) || (st === 'AK' && /\bborough\b/i.test(nm))) && !/^(city|town|village|borough)\s+of/i.test(nm);
    if (isCounty) {
      const c = counties.find(x => x.st === st && norm(x.name) === norm(nm)); if (!c) continue;
      A.counties[c.geoid] = { name: r.name, allocation: r.allocation, obligated: r.obligated, spent: r.spent, n: r.n_projects, last: r.last,
        cats: Object.entries(r.cats).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 6),
        projects: r.projects.slice(0, 8).map(p => ({ name: clean(p.name), cat: p.cat, obligated: p.obligated, spent: p.spent, status: p.status, desc: clean(p.desc).slice(0, 240) })) };
    } else {
      const geos = placeIdx[st + '|' + strip(nm)]; if (!geos) continue;
      for (const g of geos) (A.cities[g] = A.cities[g] || []).push({ name: r.name.replace(/,\s*[A-Za-z .]+$/, ''), allocation: r.allocation, spent: r.spent, n: r.n_projects });
    }
  }
  for (const g of Object.keys(A.cities)) A.cities[g].sort((a, b) => b.allocation - a.allocation);
  fs.writeFileSync(path.join(ROOT, 'data', 'national', 'arpa.json'), JSON.stringify(A));
  console.log(`arpa: ${Object.keys(A.counties).length} county governments, cities in ${Object.keys(A.cities).length} counties`);
}

// --- State level: Census state government finances + the USA.gov state directory
// (asfin2023.json and usagov.json are made from the Census xlsx and the
// usa.gov/states/<name> pages by the raw-folder prep step).
const statePop = {};
for (const r of pop) if (r[0] && P(r, 'SUMLEV') === '040') statePop[P(r, 'STNAME')] = { p24: +P(r, 'POPESTIMATE2024'), p20: +P(r, 'POPESTIMATE2020') };
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')); } catch (e) { return null; } };
const fin = readJ('asfin2023.json'), usa = readJ('usagov.json') || {};
const stateInfo = {};
for (const [st, name] of Object.entries(stName)) {
  const u = usa[name.toLowerCase().replace(/\s+/g, '-')] || null;
  stateInfo[st] = { pop2024: (statePop[name] || {}).p24 || null, pop2020: (statePop[name] || {}).p20 || null,
    gov: u ? { website: u.website || null, governor: u.governor || null, agencies: (u.agencies || []).slice(0, 16), src: u.url } : null,
    fin: fin && fin.states[name] ? { year: fin.year, source: fin.source, url: fin.url, table: fin.table, rows: fin.states[name] } : null };
}

const out = { generated: new Date().toISOString().slice(0, 10), stateInfo, chrState, grantsOpen, healthSrc: chr ? { year: chr.year, source: chr.source, url: chr.url } : null, schoolSrc: sch ? { year: sch.year, source: sch.source, table: sch.table } : null,
  sources: { census: 'U.S. Census Bureau 2024 Gazetteer; Vintage 2024 population estimates', sdwis: 'EPA SDWIS via Envirofacts, pulled ' + new Date().toISOString().slice(0, 10), vera: 'Vera Institute of Justice, Incarceration Trends' },
  states: stName ? Object.fromEntries(Object.entries(stName).map(([a, n]) => [a, { name: n }])) : {}, elections, counties };
fs.mkdirSync(path.join(ROOT, 'data', 'national'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), JSON.stringify(out));
console.log(`${counties.length} counties · water ${counties.filter(c => c.water).length} · jail ${counties.filter(c => c.jail).length} · built sites ${counties.filter(c => c.site).length} · election states ${Object.keys(elections).length}`);
