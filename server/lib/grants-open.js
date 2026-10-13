// Open federal grants county governments can apply for, from Grants.gov.
// One filter shared by the national build (pipeline/national.js) and the weekly
// refresh (pipeline/refresh-grants.js): research-only and overseas programs are
// dropped, and closed deadlines never show. The refresh writes
// data/national/grants-open.json; pages re-read it when it changes.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', '..', 'data', 'national', 'grants-open.json');

const RESEARCH = /clinical trial|\b(R0[0-9]|R2[0-9]|R3[0-9]|R6[0-9]|K[0-9]{2}|U[0-9]{2}|P[0-9]{2}|T32|F3[0-9])\b|research|fellowship|investigator/i;
const FOREIGN = /-GHC\b|USAID|Department of State|Agency for International|Ghana|Kenya|Nigeria|Uganda|Tanzania|Zambia|Malawi|Mozambique|Ethiopia|Haiti|Ukraine|Vietnam|India|Philippines|Indonesia|global health|international/i;
const today = () => new Date().toISOString().slice(0, 10);

function filter(oppHits) {
  return (oppHits || []).filter(o => o.closeDate && !/National Institutes of Health|National Science Foundation/i.test(o.agency) && !RESEARCH.test(o.title) && !FOREIGN.test(o.agency + ' ' + o.title))
    .map(o => ({ id: o.id, number: o.number, title: String(o.title).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(),
      agency: o.agency, close: o.closeDate.replace(/^(\d\d)\/(\d\d)\/(\d{4})$/, '$3-$1-$2') }))
    .filter(o => o.close >= today()).sort((a, b) => a.close.localeCompare(b.close));
}

async function fetchOpen() {
  const r = await fetch('https://api.grants.gov/v1/api/search2', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: 1000, eligibilities: '01', oppStatuses: 'posted' }) });
  const j = await r.json();
  if (!j.data || !Array.isArray(j.data.oppHits)) throw new Error('Grants.gov answered without a list: ' + (j.msg || r.status));
  return { fetched: new Date().toISOString(), posted_for_counties: j.data.hitCount, list: filter(j.data.oppHits) };
}

// The freshest list: the refresh file if present (re-read when it changes),
// else the copy baked into the national build. Closed deadlines drop out daily.
let cache = null, cacheMtime = 0;
function current(fallback) {
  try {
    const m = fs.statSync(FILE).mtimeMs;
    if (!cache || m !== cacheMtime) { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); cacheMtime = m; }
  } catch (e) { cache = null; }
  const src = cache || { fetched: null, list: fallback || [] };
  return { fetched: src.fetched, list: src.list.filter(o => o.close >= today()) };
}

module.exports = { filter, fetchOpen, current, FILE };
