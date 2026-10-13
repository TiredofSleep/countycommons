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

const out = { generated: new Date().toISOString().slice(0, 10),
  sources: { census: 'U.S. Census Bureau 2024 Gazetteer; Vintage 2024 population estimates', sdwis: 'EPA SDWIS via Envirofacts, pulled ' + new Date().toISOString().slice(0, 10), vera: 'Vera Institute of Justice, Incarceration Trends' },
  states: stName ? Object.fromEntries(Object.entries(stName).map(([a, n]) => [a, { name: n }])) : {}, elections, counties };
fs.mkdirSync(path.join(ROOT, 'data', 'national'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), JSON.stringify(out));
console.log(`${counties.length} counties · water ${counties.filter(c => c.water).length} · jail ${counties.filter(c => c.jail).length} · built sites ${counties.filter(c => c.site).length} · election states ${Object.keys(elections).length}`);
