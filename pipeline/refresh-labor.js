// Monthly: unemployment for every U.S. county, from the Bureau of Labor
// Statistics' Local Area Unemployment Statistics (not seasonally adjusted).
//   node pipeline/refresh-labor.js [localFile]
// Downloads la.data.0.CurrentU25-29 (all areas, 2025 on) unless a local copy is
// given, keeps county series only, and writes data/national/labor.json
// (gitignored; refreshed by a monthly cron on the server) plus a line in
// data/refresh-log.json.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'national', 'labor.json');
const LOG = path.join(ROOT, 'data', 'refresh-log.json');
const URL = 'https://download.bls.gov/pub/time.series/la/la.data.0.CurrentU25-29';
const UA = 'countycommons.us civic data refresh (brayden.ozark@gmail.com)';

(async () => {
  const run = { at: new Date().toISOString(), job: 'BLS county unemployment (LAUS)' };
  try {
    const text = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : await (async () => {
      const r = await fetch(URL, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error('BLS HTTP ' + r.status);
      return r.text();
    })();
    // LAUCN + 5-digit county FIPS + 0000000 + measure (03 rate, 04 unemployed, 06 labor force)
    const S = {};
    for (const l of text.split('\n')) {
      if (!l.startsWith('LAUCN')) continue;
      const [sid, year, period, value] = l.split('\t').map(x => x.trim());
      if (!/^M(0[1-9]|1[0-2])$/.test(period)) continue;
      const geo = sid.slice(5, 10), m = sid.slice(-2);
      if (!['03', '04', '06'].includes(m)) continue;
      const v = parseFloat(value); if (!Number.isFinite(v)) continue;
      ((S[geo] = S[geo] || {})[m] = S[geo][m] || {})[`${year}-${period.slice(1)}`] = v;
    }
    // The latest month nearly every county has (a few areas publish ahead of the rest).
    const cover = {}; for (const s of Object.values(S)) for (const k of Object.keys(s['03'] || {})) cover[k] = (cover[k] || 0) + 1;
    const most = Math.max(...Object.values(cover));
    const latest = Object.keys(cover).filter(k => cover[k] >= most * 0.9).sort().pop();
    const [y, mo] = latest.split('-'); const prior = `${+y - 1}-${mo}`;
    const counties = {};
    for (const [geo, s] of Object.entries(S)) {
      const r = s['03'] || {}; if (r[latest] == null) continue;
      counties[geo] = { rate: r[latest], prior: r[prior] ?? null, unemployed: (s['04'] || {})[latest] ?? null, labor_force: (s['06'] || {})[latest] ?? null };
    }
    fs.writeFileSync(OUT + '.tmp', JSON.stringify({ month: latest, prior_month: prior, fetched: run.at, source: 'U.S. Bureau of Labor Statistics, Local Area Unemployment Statistics (not seasonally adjusted; the latest month is preliminary)', url: 'https://www.bls.gov/lau/', counties }));
    fs.renameSync(OUT + '.tmp', OUT);
    Object.assign(run, { ok: true, month: latest, counties: Object.keys(counties).length });
    console.log(`unemployment: ${Object.keys(counties).length} counties for ${latest}`);
  } catch (e) {
    Object.assign(run, { ok: false, error: String(e.message || e) });
    console.error('refresh failed:', run.error); process.exitCode = 1;
  }
  let log = []; try { log = JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch (e) { /* first run */ }
  log.push(run); fs.writeFileSync(LOG, JSON.stringify(log.slice(-200), null, 1));
})();
