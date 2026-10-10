// Announce every published page to search engines via IndexNow (Bing, Yandex,
// Naver, Seznam and others share submissions). Run after a deploy, on the server:
//   node pipeline/indexnow.js            (all featured sites)
//   node pipeline/indexnow.js clarkar    (one site)
// Nothing here is secret. Each run is appended to data/indexnow-log.json, which
// the site publishes at /indexnow.json: what was announced, when, and what
// the search engines answered.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { key } = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'indexnow.json'), 'utf8'));
const directory = require('../server/lib/directory');
const LOG = path.join(ROOT, 'data', 'indexnow-log.json');

async function sitemapUrls(host) {
  const xml = await (await fetch(`https://${host}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => new URL(u).host === host);
}

async function announce(host) {
  const urls = await sitemapUrls(host);
  const res = [];
  for (let i = 0; i < urls.length; i += 10000) {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls.slice(i, i + 10000) })
    });
    res.push(r.status);
  }
  return { host, urls: urls.length, status: res };
}

(async () => {
  const only = process.argv[2];
  const hosts = ['countycommons.us', ...directory.featured().filter(t => !only || t.key === only).map(t => t.host)].filter(h => !only || h !== 'countycommons.us');
  const run = { at: new Date().toISOString(), endpoint: 'https://api.indexnow.org/indexnow', sites: [] };
  for (const h of hosts) {
    try { run.sites.push(await announce(h)); } catch (e) { run.sites.push({ host: h, error: String(e.message || e) }); }
  }
  let log = []; try { log = JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch (e) { /* first run */ }
  log.push(run);
  fs.writeFileSync(LOG, JSON.stringify(log.slice(-100), null, 1));
  const ok = run.sites.filter(s => s.status && s.status.every(c => c === 200 || c === 202));
  console.log(`${ok.length}/${run.sites.length} sites announced, ${run.sites.reduce((a, s) => a + (s.urls || 0), 0)} URLs`);
  for (const s of run.sites.filter(s => !ok.includes(s))) console.log('  not accepted:', s.host, s.status || s.error);
})();
