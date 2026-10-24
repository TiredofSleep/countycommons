// Local-government layers for every U.S. county, from three national files:
//   1. County government finances — Census of Governments 2022, individual unit
//      file (cog/2022_Individual_Unit_files/): revenue by source, spending by
//      purpose, debt, for the county government AND all local governments in it.
//   2. Property tax — American Community Survey 2019–2023, median real estate
//      taxes paid (B25103) and median home value (B25077) (acs/*.dat).
//   3. Public libraries — IMLS Public Libraries Survey FY2024, outlets (imls/CSV/).
// Writes data/national/local.json, loaded lazily by server/lib/national-blocks.js.
//   node pipeline/national-local.js <rawDir>
const fs = require('fs');
const path = require('path');
const RAW = process.argv[2];
if (!RAW) { console.error('usage: node pipeline/national-local.js <rawDir>'); process.exit(1); }
const ROOT = path.join(__dirname, '..');
const N = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8'));
const geos = new Set(N.counties.map(c => c.geoid));
const nameOf = Object.fromEntries(N.counties.map(c => [c.geoid, c.name]));
const out = { generated: new Date().toISOString().slice(0, 10), finance: null, proptax: null, libraries: null };

// ---------- 1. Census of Governments 2022 ----------
const cogDir = path.join(RAW, 'cog', '2022_Individual_Unit_files');
if (fs.existsSync(cogDir)) {
  const pid = {};
  for (const l of fs.readFileSync(path.join(cogDir, 'Fin_PID_2022.txt'), 'latin1').split(/\r?\n/)) {
    if (l.length < 120) continue;
    pid[l.slice(0, 12)] = { name: l.slice(12, 76).trim(), pop: +l.slice(116, 125) || null };
  }
  // purpose groups by the two-digit function code at the end of E/F/M/I item codes
  const FN = { jail: ['04', '05'], police: ['62'], courts: ['25'], roads: ['44', '45'], health: ['32'], hospitals: ['36'], welfare: ['77', '79'], fire: ['24'],
    parks: ['61'], libraries: ['52'], trash: ['81'], sewer: ['80'], housing: ['50'], schools: ['12', '16', '18', '21'], admin: ['23', '29', '31'], utilities: ['90', '91', '92', '93', '94'] };
  const fnOf = {}; for (const [k, v] of Object.entries(FN)) for (const c of v) fnOf[c] = k;
  const units = {};
  const file = fs.readdirSync(cogDir).find(f => /FinEstDAT/i.test(f));
  for (const l of fs.readFileSync(path.join(cogDir, file), 'latin1').split(/\r?\n/)) {
    if (l.length < 27) continue;
    const id = l.slice(0, 12), item = l.slice(12, 15), amt = (+l.slice(15, 27) || 0) * 1000;
    const u = units[id] = units[id] || { rev: {}, fn: {}, to_local: 0, interest: 0, debt: 0, st_debt: 0, imputed: 0, items: 0 };
    u.items++; if (l[31] === 'I') u.imputed++; // I = estimated by the Census Bureau (the government didn't report)
    const L = item[0], cc = item.slice(1);
    if (L === 'T') { const k = cc === '01' ? 'property' : (+cc >= 9 && +cc <= 19) ? 'sales' : 'other_tax'; u.rev[k] = (u.rev[k] || 0) + amt; }
    else if (L === 'A') { const k = +cc >= 90 ? 'utility' : 'charges'; u.rev[k] = (u.rev[k] || 0) + amt; }
    else if (L === 'U') u.rev.misc = (u.rev.misc || 0) + amt;
    else if (L === 'B') u.rev.federal = (u.rev.federal || 0) + amt;
    else if (L === 'C') u.rev.state = (u.rev.state || 0) + amt;
    else if (L === 'D') u.rev.local = (u.rev.local || 0) + amt;
    else if (L === 'E' || L === 'F') { const k = fnOf[cc] || 'other'; u.fn[k] = (u.fn[k] || 0) + amt; }
    else if (L === 'M') u.to_local += amt;
    else if (L === 'I') { if (+cc >= 90) u.fn.utilities = (u.fn.utilities || 0) + amt; else u.interest += amt; }
    else if (L === 'J' || L === 'L' || L === 'S') u.fn.other = (u.fn.other || 0) + amt;
    else if (item === '49U') u.debt += amt;
    else if (item === '64V') u.st_debt += amt;
  }
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const counties = {};
  const TYPE = { 1: 'county', 2: 'city', 3: 'township', 4: 'special', 5: 'school' };
  for (const [id, u] of Object.entries(units)) {
    const t = id[2]; if (t === '0') continue;
    const geo = id.slice(0, 2) + id.slice(3, 6); if (!geos.has(geo)) continue;
    const c = counties[geo] = counties[geo] || { gov: null, local: { units: { county: 0, city: 0, township: 0, special: 0, school: 0 }, spend: 0, schools: 0 } };
    const spend = sum(u.fn) + u.to_local + u.interest;
    c.local.units[TYPE[t]]++;
    c.local.spend += spend - u.to_local; // count money once: what governments in the county spend directly
    c.local.schools += (u.fn.schools || 0);
    const general = ['property', 'sales', 'other_tax', 'charges', 'misc', 'federal', 'state', 'local'].reduce((a, k) => a + (u.rev[k] || 0), 0);
    const rec = { id, name: (pid[id] || {}).name || '', pop: (pid[id] || {}).pop || null, revenue: general, rev: u.rev, spend, fn: u.fn, to_local: u.to_local, interest: u.interest, debt: u.debt + u.st_debt, estimated: u.items ? Math.round(u.imputed / u.items * 100) : 0 };
    if (t === '1') c.gov = rec;
    // independent cities (Virginia, Baltimore, St. Louis, Carson City): the city government is the county-level government
    else if (t === '2' && / city$/i.test(nameOf[geo] || '') && (!c.gov || c.gov.type === 'city') && (!c.gov || spend > c.gov.spend)) c.gov = { ...rec, type: 'city' };
  }
  for (const c of Object.values(counties)) { c.local.spend = Math.round(c.local.spend); c.local.schools = Math.round(c.local.schools); }
  out.finance = { year: 2022, source: 'U.S. Census Bureau, 2022 Census of Governments: Finance, individual unit file', url: 'https://www.census.gov/data/datasets/2022/econ/local/public-use-datasets.html', counties };
  console.log(`finance: ${Object.keys(counties).length} counties, county government found for ${Object.values(counties).filter(c => c.gov).length}`);
}

// ---------- 2. Property tax (ACS) ----------
const acs = (f) => { const p = path.join(RAW, 'acs', f); if (!fs.existsSync(p)) return null; const L = fs.readFileSync(p, 'utf8').split(/\r?\n/); const h = L.shift().split('|'); const m = {}; for (const l of L) { const r = l.split('|'); if (/^0500000US\d{5}$/.test(r[0])) m[r[0].slice(-5)] = Object.fromEntries(h.map((k, i) => [k, r[i]])); } return m; };
const tax = acs('b25103.dat'), val = acs('b25077.dat');
if (tax) {
  const n = (x) => { const v = +x; return Number.isFinite(v) && v > 0 ? v : null; };
  const counties = {};
  for (const [g, r] of Object.entries(tax)) {
    if (!geos.has(g)) continue;
    const t = n(r.B25103_E001), v = val && val[g] ? n(val[g].B25077_E001) : null;
    if (!t) continue;
    counties[g] = { median_tax: t, with_mortgage: n(r.B25103_E002), without_mortgage: n(r.B25103_E003), median_value: v, moe: n(r.B25103_M001) };
  }
  out.proptax = { years: '2019–2023', source: 'U.S. Census Bureau, American Community Survey 5-year estimates, 2019–2023 (tables B25103 and B25077)', url: 'https://www.census.gov/programs-surveys/acs/data/summary-file.html', counties };
  console.log(`property tax: ${Object.keys(counties).length} counties`);
}

// ---------- 3. Public libraries (IMLS) ----------
const imlsDir = path.join(RAW, 'imls', 'CSV');
if (fs.existsSync(imlsDir)) {
  const f = fs.readdirSync(imlsDir).find(x => /outlet/i.test(x) && /\.csv$/i.test(x));
  const parse = (line) => { const o = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o; };
  const L = fs.readFileSync(path.join(imlsDir, f), 'latin1').split(/\r?\n/).filter(Boolean);
  const h = parse(L.shift()); const I = (k) => h.indexOf(k);
  const counties = {};
  const TYPES = { CE: 'main library', BR: 'branch', BS: 'bookmobile', BM: 'books by mail' };
  for (const l of L) {
    const r = parse(l); const tract = r[I('CENTRACT')] || ''; const g = tract.slice(0, 5);
    if (!/^\d{5}$/.test(g) || !geos.has(g)) continue;
    const type = r[I('C_OUT_TY')]; const hrs = +r[I('HOURS')], wks = +r[I('WKS_OPEN')];
    const c = counties[g] = counties[g] || { n: 0, mobile: 0, list: [] };
    if (type === 'BS' || type === 'BM') c.mobile++; else c.n++;
    const title = (s) => String(s || '').toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase());
    c.list.push({ name: title(r[I('LIBNAME')]), address: title(r[I('ADDRESS')]), city: title(r[I('CITY')]), type: TYPES[type] || 'library', hours_week: hrs > 0 && wks > 0 ? Math.round(hrs / wks) : null });
  }
  for (const c of Object.values(counties)) { c.list.sort((a, b) => (b.hours_week || 0) - (a.hours_week || 0)); c.more = Math.max(0, c.list.length - 12); c.list = c.list.slice(0, 12); }
  out.libraries = { year: 'FY2024', source: 'Institute of Museum and Library Services, Public Libraries Survey FY2024', url: 'https://www.imls.gov/research-evaluation/surveys/public-libraries-survey-pls', counties };
  console.log(`libraries: ${Object.keys(counties).length} counties, ${Object.values(counties).reduce((s, c) => s + c.n + c.mobile, 0)} outlets`);
}

fs.writeFileSync(path.join(ROOT, 'data', 'national', 'local.json'), JSON.stringify(out));
console.log('wrote data/national/local.json', Math.round(fs.statSync(path.join(ROOT, 'data', 'national', 'local.json')).size / 1024) + ' KB');
