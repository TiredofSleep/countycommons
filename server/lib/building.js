// "Still building": what's new, what readers helped fix, and how many notes
// have come in — so every page can say when it last changed and that people
// are still at work on it.
//   updates()      recent changes, from the project's commit history (plain-language subjects)
//   corrections()  fixes made because a reader wrote in (data/corrections.json, public)
//   noteStats()    counts only, from the private drop-box (data/feedback/) — never contents
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const FEEDBACK = path.join(ROOT, 'data', 'feedback');
const CORRECTIONS = path.join(ROOT, 'data', 'corrections.json');

let cache = { at: 0, list: [] };
function updates() {
  if (Date.now() - cache.at < 10 * 60 * 1000) return cache.list;
  let list = [];
  try {
    const out = execFileSync('git', ['log', '-80', '--date=short', '--pretty=%ad%x09%s'], { cwd: ROOT, encoding: 'utf8', timeout: 4000 });
    list = out.split('\n').filter(Boolean).map(l => { const [date, ...s] = l.split('\t'); return { date, what: s.join('\t') }; })
      .filter(x => x.what && !/^(merge|revert|wip\b)/i.test(x.what));
  } catch (e) { list = cache.list; }
  cache = { at: Date.now(), list };
  return list;
}
function lastUpdated() { const u = updates(); return u.length ? u[0].date : null; }

function corrections() {
  try { return JSON.parse(fs.readFileSync(CORRECTIONS, 'utf8')).corrections || []; } catch (e) { return []; }
}

function noteStats() {
  let files = [];
  try { files = fs.readdirSync(FEEDBACK).filter(f => f.endsWith('.json')); } catch (e) { return { total: 0, month: 0 }; }
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  return { total: files.length, month: files.filter(f => f.slice(0, 10) >= since).length };
}

// Requests to build out a county, counted by county — the public demand signal
// for what gets built next. Counts only; the notes stay private.
//   key: a county site ("clarkar") or a national page ("/us/ar/clark")
function requestCounts() {
  let files = [];
  try { files = fs.readdirSync(FEEDBACK).filter(f => f.endsWith('.json')); } catch (e) { return []; }
  const by = {};
  for (const f of files) {
    let r; try { r = JSON.parse(fs.readFileSync(path.join(FEEDBACK, f), 'utf8')); } catch (e) { continue; }
    if (r.kind !== 'request') continue;
    const page = String(r.page || '');
    const key = r.site && r.site !== 'us' ? r.site : (page.match(/^\/us\/[a-z]{2}\/[a-z0-9-]+/) || [null])[0];
    if (key) by[key] = (by[key] || 0) + 1;
  }
  return Object.entries(by).sort((a, b) => b[1] - a[1]);
}

// The same counts with names and links, for the "most requested" list.
function requestRows(limit = 15) {
  let T = {};
  try { T = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'tenants.json'), 'utf8')).tenants; } catch (e) { /* none */ }
  return requestCounts().slice(0, limit).map(([key, n]) => {
    if (key.startsWith('/us/')) {
      const [, , st, slug] = key.split('/');
      const name = require('../views/national').countyName(st, slug);
      return { label: name || key, url: `https://countycommons.us${key}`, n };
    }
    let name = key;
    try { const c = JSON.parse(fs.readFileSync(path.join(ROOT, T[key].configPath), 'utf8')); name = `${c.name}, ${c.state}`; } catch (e) { /* keep key */ }
    return { label: name, url: `https://${key}.countycommons.us/`, n };
  });
}

module.exports = { updates, lastUpdated, corrections, noteStats, requestCounts, requestRows, CORRECTIONS, FEEDBACK };
