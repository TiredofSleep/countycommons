// Find your county: one search over every U.S. county (3,144), every town and
// census place inside them (~33,000), every state, and every full County Commons
// site. Server-side, no JavaScript needed. "Arkadelphia", "Clark AR",
// "clark county arkansas", "Ada, Idaho" and "Idaho" all work.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

let IDX = null;
const norm = (s) => String(s || '').toLowerCase()
  .replace(/\b(county|parish|borough|census area|city and borough|municipality|cdp|city|town|village|township|plantation)\b/g, ' ')
  .replace(/\bst\.?\s/g, 'saint ').replace(/\bste\.?\s/g, 'sainte ')
  .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

function index() {
  if (IDX) return IDX;
  let N = { states: {}, counties: [] };
  try { N = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'national', 'counties.json'), 'utf8')); } catch (e) { /* none */ }
  const states = Object.entries(N.states).map(([st, s]) => ({ st, name: s.name, n: norm(s.name) }));
  const counties = N.counties.map(c => ({
    geoid: c.geoid, st: c.st, name: c.name, slug: c.slug, pop: c.pop2024 || 0, site: c.site || null,
    n: norm(c.name),
    towns: (c.places || []).map(p => ({ name: p.name.replace(/ (city|town|village|CDP|borough|municipality|city and borough)$/i, ''), kind: p.kind, n: norm(p.name) }))
  }));
  IDX = { states, counties, stateOf: Object.fromEntries(states.map(s => [s.st, s])) };
  return IDX;
}

// Pull a state out of the query: a trailing two-letter code ("clark ar") or a
// state name anywhere ("clark county arkansas", "new york").
function splitState(q) {
  const I = index();
  let rest = ' ' + norm(q) + ' ', st = null;
  for (const s of I.states.slice().sort((a, b) => b.n.length - a.n.length)) {
    if (rest.includes(' ' + s.n + ' ')) { st = s.st; rest = rest.replace(' ' + s.n + ' ', ' '); break; }
  }
  if (!st) {
    const m = rest.match(/^(.*\S)\s+([a-z]{2})\s*$/) || rest.match(/^\s*([a-z]{2})\s*$/);
    const code = m && (m[2] || m[1]).toUpperCase();
    if (code && I.stateOf[code]) { st = code; rest = m[2] ? m[1] : ''; }
  }
  return { st, rest: rest.replace(/\s+/g, ' ').trim() };
}

// [{kind:'state'|'county', st, stateName, name, slug, path, site, via, score}]
function search(q, limit = 40) {
  q = String(q || '').slice(0, 80).trim(); if (!q) return [];
  const I = index();
  const { st, rest } = splitState(q);
  const out = [];
  if (st && !rest) {
    const s = I.stateOf[st];
    out.push({ kind: 'state', st, stateName: s.name, name: s.name, path: `/us/${st.toLowerCase()}`, score: 100 });
    for (const c of I.counties.filter(c => c.st === st).sort((a, b) => b.pop - a.pop).slice(0, limit - 1)) out.push(hit(c, I, 10));
    return out;
  }
  if (!rest) return [];
  const want = rest;
  for (const c of I.counties) {
    if (st && c.st !== st) continue;
    let score = 0, via = null;
    if (c.n === want) score = 90;
    else if (c.n.startsWith(want)) score = 70;
    else if (want.length >= 3 && c.n.includes(want)) score = 40;
    const t = c.towns.find(t => t.n === want) || (want.length >= 3 && c.towns.find(t => t.n.startsWith(want)));
    if (t) {
      const ts = t.n === want ? (t.kind === 'inc' ? 80 : 60) : 35;
      if (ts > score) { score = ts; via = t.name; }
    }
    if (score) out.push(hit(c, I, score + Math.min(9, Math.log10(c.pop + 1)), via));
  }
  // A plain state name typed with nothing else matched ("idaho") lands above.
  const s = !st && I.states.find(s => s.n === want);
  if (s) out.unshift({ kind: 'state', st: s.st, stateName: s.name, name: s.name, path: `/us/${s.st.toLowerCase()}`, score: 100 });
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
function hit(c, I, score, via) {
  return { kind: 'county', st: c.st, stateName: (I.stateOf[c.st] || {}).name || c.st, name: c.name, slug: c.slug, pop: c.pop, path: `/us/${c.st.toLowerCase()}/${c.slug}`, site: c.site, via: via || null, score };
}

module.exports = { search, norm };
