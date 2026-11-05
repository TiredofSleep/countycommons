// How a county compares: the county beside counties of its size (in its state
// or the nation), its neighbors, its whole state or the whole country, item by
// item — federal grants, the Census Bureau's spending categories, and every line
// of every county budget we've read, matched to shared categories.
//
// Facts only. Every number links to its source; every gap is labeled a dead end
// (not gathered yet), never "hidden." Rank means sorted by amount, nothing more.

const { esc } = require('../lib/corpus');
const LN = require('../lib/lines');
const { read } = require('../lib/national-local');

const num = (x) => Math.round(x).toLocaleString('en-US');
const big = (x) => { const a = Math.abs(x), s = x < 0 ? '−' : ''; return a >= 1e9 ? s + '$' + (a / 1e9).toFixed(2) + ' billion' : a >= 1e6 ? s + '$' + (a / 1e6).toFixed(1) + ' million' : s + '$' + num(a); };
const per = (x) => '$' + (x >= 100 ? num(x) : x.toFixed(2));
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const quant = (s, q) => { if (!s.length) return null; const p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return s[lo] + (s[hi] - s[lo]) * (p - lo); };

const SCOPES = {
  'size-state': (c, S) => `counties of similar size in ${S}`,
  'size-nation': () => 'counties of similar size across the nation',
  near: () => 'neighboring counties (within 60 miles)',
  state: (c, S) => `every county in ${S}`,
  nation: () => 'every county in the nation'
};
const SCOPE_RULE = {
  'size-state': 'Counties in the same state with between half and double its population (2024 Census estimate). If fewer than five fit, the eight closest in population.',
  'size-nation': 'Counties anywhere in the U.S. within 25% of its population (2024 Census estimate), either way. If fewer than five fit, the eight closest in population.',
  near: 'Counties whose geographic center is within 60 miles of its center, in any state (2024 Census Gazetteer).',
  state: 'Every county and county-equivalent in the state.',
  nation: 'Every county and county-equivalent in the United States.'
};

function miles(a, b) {
  const R = 3958.8, r = (d) => d * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function peersOf(c, all, scope) {
  const p = c.pop2024 || 0;
  if (scope === 'nation') return all.filter(x => x !== c);
  if (scope === 'state') return all.filter(x => x !== c && x.st === c.st);
  if (scope === 'near') return all.filter(x => x !== c && x.lat != null && miles(c, x) <= 60);
  if (scope === 'size-nation') {
    const r = all.filter(x => x !== c && x.pop2024 >= p * 0.8 && x.pop2024 <= p * 1.25);
    return r.length >= 5 ? r : all.filter(x => x !== c && x.pop2024).sort((a, b) => Math.abs(Math.log(a.pop2024 / p)) - Math.abs(Math.log(b.pop2024 / p))).slice(0, 8);
  }
  const st = all.filter(x => x !== c && x.st === c.st && x.pop2024);
  let list = st.filter(x => x.pop2024 >= p / 2 && x.pop2024 <= p * 2);
  if (list.length < 5) list = st.slice().sort((a, b) => Math.abs(Math.log(a.pop2024 / p)) - Math.abs(Math.log(b.pop2024 / p))).slice(0, 8);
  return list;
}

// Every comparable item: [layer, key, label, value(county) → {v, pop, href, note} | null]
function items(c) {
  const N = require('./national');
  const L = read('local.json'), F = L && L.finance;
  const I = LN.index();
  const page = (x, h) => `/us/${x.st.toLowerCase()}/${x.slug}#${h}`;
  const out = [];
  out.push(['grants', 'fed', 'Federal grants, fiscal 2025', (x) => x.fedgrants ? { v: x.fedgrants.amount, pop: x.pop2024, href: page(x, 'federal-grants') } : null]);
  out.push(['grants', 'arpa', 'American Rescue Plan money, 2021 to date', (x) => x.arpa ? { v: x.arpa.amount, pop: x.pop2024, href: page(x, 'arpa') } : null]);
  if (F) {
    const g = (x) => F.counties[x.geoid] && F.counties[x.geoid].gov;
    out.push(['census', 'spend', 'All county government spending', (x) => { const r = g(x); return r ? { v: r.spend, pop: r.pop, href: page(x, 'county-money'), est: r.estimated } : null; }]);
    for (const [k, label] of require('../lib/national-local').PURPOSE || []) out.push(['census', k, label, (x) => { const r = g(x); return r ? { v: (r.fn || {})[k] || 0, pop: r.pop, href: page(x, 'county-money'), est: r.estimated } : null; }]);
  }
  const bnote = (r) => [r.scope && !/^all funds/i.test(r.scope) ? r.scope + ' only' : '', r.halved ? 'two-year budget, halved' : ''].filter(Boolean).join(', ');
  out.push(['budget', 'total', 'Whole budget, all funds', (x) => { const r = I.counties[x.geoid]; return r ? { v: r.total, pop: x.pop2024, href: r.source.url, year: r.year, note: bnote(r) } : null; }]);
  for (const [k, label] of LN.CATS.map(z => [z[0], z[1]]).concat([['unmatched', 'Lines not matched to a category yet']])) {
    out.push(['budget', k, label, (x) => { const r = I.counties[x.geoid]; if (!r) return null; const b = r.byCat[k]; return { v: b ? b.amount : 0, pop: x.pop2024, href: b && b.lines.length === 1 ? b.lines[0].href : null, lines: b ? b.lines : [], year: r.year, note: bnote(r) }; }]);
  }
  return out;
}

const LAYER = {
  grants: { h: 'Grants and federal money', src: () => `Federal grants: <a href="https://www.usaspending.gov/search" rel="noopener">USAspending.gov</a>, grant awards by place of performance, fiscal 2025 (Oct. 2024 to Sept. 2025) — money for work done in the county by anyone: the county, its cities, schools, hospitals, nonprofits and others, not only the county government. American Rescue Plan: <a href="https://www.usaspending.gov/disaster/covid-19" rel="noopener">USAspending.gov</a>, disaster emergency fund code V, by recipient location, March 2021 to date. Both pulled through the <a href="https://api.usaspending.gov/docs/endpoints" rel="noopener">USAspending API</a> (spending by geography). Per resident uses the 2024 Census population estimate.` },
  census: { h: 'County government spending, by the Census Bureau’s national categories', src: (F) => F ? `<a href="${esc(F.url)}" rel="noopener">${esc(F.source)}</a>, fiscal ${esc(F.year)}. The Census Bureau sorts every county government’s spending into the same categories, so these compare across states — but counties do different jobs in different states (in some, counties run hospitals or schools; in others, cities or the state do), so the closest comparisons are within a state. Counties where the Bureau estimated half or more of the figures are left out of the middle and range. Per resident uses the population the Bureau used.` : '' },
  budget: { h: 'From the counties’ own budgets, line by line', src: () => `Each county’s own adopted budget: Arkansas counties from their appropriation ordinances, Idaho counties from their filings with the State Controller, and the other full County Commons sites from their published budgets. Every line is matched to one shared category, by Arkansas’s standard department code where there is one, otherwise by words in its name — open any category to see each line and the rule that matched it, and <a href="/us/compare/lines.csv">download every line</a>. Years differ (most are 2026 or fiscal 2025) and so do the jobs counties do, so read these as a guide to scale. Only counties whose budgets we’ve read can appear here; for the rest this is a dead end until their budget is read.` }
};

function stats(c, peers, fn, mode) {
  const val = (r) => r && r.pop ? (mode === 'total' ? r.v : r.v / r.pop) : null;
  const me = fn(c);
  const rows = peers.map(x => ({ x, r: fn(x) })).filter(o => o.r);
  const used = rows.filter(o => !(o.r.est >= 50));
  const vals = used.map(o => val(o.r)).filter(v => v != null).sort((a, b) => a - b);
  const mine = val(me);
  const ranked = mine == null ? null : vals.filter(v => v > mine).length + 1;
  return { me, mine, rows, used, n: vals.length, med: quant(vals, 0.5), lo: quant(vals, 0.25), hi: quant(vals, 0.75), rank: ranked, of: vals.length + (mine == null ? 0 : 1), zeros: used.filter(o => !o.r.v).length };
}

function controls(base, scope, mode, item) {
  const S = Object.keys(SCOPES);
  const a = (w, m, label, on) => on ? `<b style="padding:5px 9px;border:1.5px solid var(--ink);background:var(--ink);color:var(--paper);display:inline-block;margin:2px 0">${label}</b>` : `<a href="${base}?with=${w}&amp;per=${m}${item ? '&amp;item=' + esc(item) : ''}" style="padding:5px 9px;border:1.5px solid var(--ink);display:inline-block;margin:2px 0;text-decoration:none">${label}</a>`;
  const SL = { 'size-state': 'My size, my state', 'size-nation': 'My size, nationwide', near: 'My neighbors', state: 'My whole state', nation: 'The whole nation' };
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0"><span style="font-weight:600;margin-right:4px">Compare with:</span>${S.map(s => a(s, mode, SL[s], s === scope)).join('')}</div>
<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0"><span style="font-weight:600;margin-right:4px">Show:</span>${a(scope, 'resident', 'Per resident', mode !== 'total')}${a(scope, 'total', 'Total dollars', mode === 'total')}</div>`;
}

function comparePage(st, slug, q) {
  const N = require('./national');
  const nat = LN.index().nat; // cached with the budget lines
  const c = nat.counties.find(x => x.st === st && x.slug === slug); if (!c) return null;
  const S = (nat.states[st] || {}).name || st;
  const scope = SCOPES[q.with] ? q.with : 'size-state';
  const mode = q.per === 'total' ? 'total' : 'resident';
  const base = `/us/${st.toLowerCase()}/${slug}/compare`;
  const canonical = `https://countycommons.us${base}`;
  const peers = peersOf(c, nat.counties, scope);
  const all = items(c);
  const F = (read('local.json') || {}).finance;
  const fmt = (v) => v == null ? '—' : mode === 'total' ? big(v) : per(v);
  const who = SCOPES[scope](c, S);
  const I = LN.index();
  const haveBudget = !!I.counties[c.geoid];

  // Drill-down: one item, every county in the group.
  if (q.item) {
    const it = all.find(i => i[0] + ':' + i[1] === q.item); if (!it) return null;
    const [layer, key, label, fn] = it;
    const s = stats(c, peers, fn, mode);
    const val = (r) => r && r.pop ? (mode === 'total' ? r.v : r.v / r.pop) : null;
    const list = s.rows.concat(s.me ? [{ x: c, r: s.me }] : []).sort((a, b) => (val(b.r) || 0) - (val(a.r) || 0));
    const srcCell = (x, r) => layer === 'budget'
      ? (r.lines && r.lines.length ? r.lines.map(l => `<a href="${esc(l.href)}" rel="noopener">${esc(l.name)}</a> <span class="soft" style="font-size:12px">${big(l.amount)}${l.fund ? ' · in ' + esc(l.fund) : ''} · ${esc(l.how)}</span>`).join('<br>') : `<span class="soft">no line matched in this budget</span>`) + ` <span class="soft" style="font-size:12px">(${esc(r.year)}${r.note ? ', ' + esc(r.note) : ''})</span>`
      : `<a href="${esc(r.href)}">source</a>${r.est >= 50 ? ' <span style="color:var(--dead);font-size:12px">mostly Census estimates; left out of the middle</span>' : r.est ? ` <span class="soft" style="font-size:12px">${r.est}% estimated</span>` : ''}`;
    const rows = list.map((o, i) => `<tr${o.x === c ? ' style="background:var(--card);font-weight:600"' : ''}><td class="num">${i + 1}</td><td><a href="/us/${o.x.st.toLowerCase()}/${o.x.slug}/compare">${esc(o.x.name)}</a>, ${esc(o.x.st)}</td><td class="num">${num(o.x.pop2024 || 0)}</td><td class="num">${fmt(val(o.r))}</td><td class="num">${mode === 'total' ? (o.r.pop ? per(o.r.v / o.r.pop) + '<span class="soft" style="font-size:12px">/res.</span>' : '—') : big(o.r.v)}</td><td class="src" style="max-width:420px">${srcCell(o.x, o.r)}</td></tr>`).join('');
    const missing = peers.filter(x => !fn(x));
    const body = `
<header class="page">
  <div class="eyebrow"><a href="${base}?with=${scope}&amp;per=${mode}">How ${esc(c.name)} compares</a> · ${esc(LAYER[layer].h)}</div>
  <h1>${esc(label)}: ${esc(c.name)} beside ${esc(who)}</h1>
  ${controls(base, scope, mode, q.item)}
  <p>${s.mine == null ? `<b>Dead end:</b> ${esc(c.name)} has no figure for this yet${layer === 'budget' ? ' — its own budget hasn’t been read. <a href="/us/feedback?kind=request&amp;from=' + esc(base) + '">Ask for it</a>.' : '.'}` : `${esc(c.name)}: <b>${fmt(s.mine)}</b>${mode === 'total' ? '' : ' per resident'}${s.rank ? `, ${ord(s.rank)} highest of ${s.of}` : ''}.`} ${s.n ? `The middle of the group is ${fmt(s.med)}; the middle half runs from ${fmt(s.lo)} to ${fmt(s.hi)} (${s.n} counties with figures${s.zeros ? `, ${s.zeros} of them at $0` : ''}).` : 'No other county in this group has a figure yet.'}</p>
</header>
<section>
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th class="num">#</th><th>County</th><th class="num">Residents</th><th class="num">${mode === 'total' ? 'Amount' : 'Per resident'}</th><th class="num">${mode === 'total' ? 'Per resident' : 'Amount'}</th><th>Where it comes from</th></tr></thead><tbody>${rows}</tbody></table></div>
${missing.length ? `<p class="src" style="max-width:none"><b>Dead ends — ${missing.length} ${missing.length === 1 ? 'county' : 'counties'} in this group with no figure yet</b>${layer === 'budget' ? ' (their own budgets haven’t been read)' : ''}: ${missing.slice(0, 120).map(x => `<a href="/us/${x.st.toLowerCase()}/${x.slug}">${esc(x.name.replace(/ County$/, ''))}${x.st !== c.st ? ', ' + esc(x.st) : ''}</a>`).join(', ')}${missing.length > 120 ? ` and ${missing.length - 120} more` : ''}.</p>` : ''}
<p class="src" style="max-width:none">Who’s in the group: ${esc(SCOPE_RULE[scope])} Source: ${LAYER[layer].src(F)}</p>
</section>`;
    return require('./national').page({ title: `${label} — ${c.name}, ${S} beside ${who} · County Commons`, description: `${label}: ${c.name}, ${S} beside ${who}, county by county, each figure linked to its source.`, canonical: `${canonical}?item=${encodeURIComponent(q.item)}`, body });
  }

  // The overview: every item, one row each.
  const section = (layer) => {
    const list = all.filter(i => i[0] === layer);
    const hidden = [];
    const rows = list.map(([ly, key, label, fn]) => {
      const s = stats(c, peers, fn, mode);
      if (ly === 'budget' && key === 'unmatched' && !(s.me && s.me.v) ) return '';
      const href = `${base}?with=${scope}&amp;per=${mode}&amp;item=${ly}:${key}`;
      let dead = '';
      if (s.mine == null && !(s.med > 0)) return '';
      if (s.mine == null) dead = ly === 'budget' ? '' : 'no figure';
      else if (!s.me.v && s.med > 0) dead = ly === 'census' ? 'reported $0 — may be run by a city, district or the state, or counted elsewhere' : 'no line matched — may sit inside a combined fund';
      // Nothing here and little elsewhere either: leave the row out.
      if (s.mine === 0 && !(s.med > 0)) { hidden.push(label); return ''; }
      if (s.mine === 0) s.rank = null;
      const mine = s.mine == null ? '—' : s.me.href && s.me.v ? `<a href="${esc(s.me.href)}"${/^https?:/.test(s.me.href) ? ' rel="noopener"' : ''}>${fmt(s.mine)}</a>` : fmt(s.mine);
      return `<tr><td><a href="${href}">${esc(label)}</a>${dead ? ` <span style="color:var(--dead);font-size:12.5px">· dead end: ${esc(dead)}</span>` : ''}${s.me && s.me.est >= 50 ? ' <span style="color:var(--dead);font-size:12.5px">· mostly Census estimates</span>' : ''}</td><td class="num">${mine}</td><td class="num">${s.n ? fmt(s.med) : '—'}</td><td class="num soft" style="font-size:12.5px">${s.n >= 4 ? fmt(s.lo) + ' – ' + fmt(s.hi) : ''}</td><td class="num">${s.rank && s.of > 1 ? ord(s.rank) + ' of ' + s.of : '—'}</td></tr>`;
    }).join('');
    const nb = layer === 'budget' ? peers.filter(x => I.counties[x.geoid]).length : null;
    const note = layer === 'budget' ? `<p>${haveBudget ? `${esc(c.name)}’s own ${esc(I.counties[c.geoid].year)} budget, line by line, beside` : `<b>Dead end:</b> ${esc(c.name)}’s own budget hasn’t been read yet, so only the other counties show here. <a href="/us/feedback?kind=request&amp;from=${esc(base)}">Ask for it</a>; the most-requested go next. Beside it:`} the ${nb} of ${peers.length} ${esc(who)} whose budgets we’ve read${nb < peers.length ? ` — the other ${peers.length - nb} are dead ends until theirs are read` : ''}.</p>` : '';
    return `
<section id="${layer}">
<h2>${esc(LAYER[layer].h)}</h2>
${note}
<div style="overflow-x:auto;max-width:100%"><table class="plain"><thead><tr><th>Item <span class="soft" style="font-weight:400">— open one to see every county</span></th><th class="num">${esc(c.name.replace(/ County$/, ''))}</th><th class="num">Middle of the group</th><th class="num">Middle half</th><th class="num">Rank, highest first</th></tr></thead><tbody>${rows}</tbody></table></div>
${hidden.length ? `<p class="src" style="max-width:none">Not shown, because ${esc(c.name)} and most of the group show $0: ${hidden.map(h => esc(h.toLowerCase())).join('; ')}.</p>` : ''}
<p class="src" style="max-width:none">Source: ${LAYER[layer].src(F)}</p>
</section>`;
  };
  const unmatched = haveBudget ? (I.counties[c.geoid].byCat.unmatched || { lines: [] }).lines : [];
  const body = `
<header class="page">
  <div class="eyebrow"><a href="/us/${st.toLowerCase()}/${slug}">${esc(c.name)}, ${esc(S)}</a> · how it compares</div>
  <h1>How ${esc(c.name)} compares</h1>
  <p>${esc(c.name)} (${num(c.pop2024 || 0)} residents) beside <b>${esc(who)}</b> — ${peers.length} ${peers.length === 1 ? 'county' : 'counties'}. Every figure links to where it comes from. “Middle of the group” is the median; “middle half” is the range the middle half of counties fall in. A dead end means the figure hasn’t been gathered yet, never that it’s hidden.</p>
  ${controls(base, scope, mode, '')}
  <p class="src" style="max-width:none">Who’s in the group: ${esc(SCOPE_RULE[scope])}</p>
</header>
${section('grants')}
${section('budget')}
${unmatched.length ? `<section><h3>${esc(c.name)}’s lines not matched to a category yet <span class="sub">— dead ends to fix</span></h3><ul>${unmatched.map(l => `<li><a href="${esc(l.href)}" rel="noopener">${esc(l.name)}</a> ${big(l.amount)}${l.fund ? ` <span class="soft">in ${esc(l.fund)}</span>` : ''}</li>`).join('')}</ul><p class="src">If you know what one of these pays for, <a href="/us/feedback?from=${esc(base)}">tell us</a>.</p></section>` : ''}
${section('census')}`;
  return require('./national').page({ title: `How ${c.name}, ${S} compares: budget, spending and grants beside ${who} · County Commons`, description: `${c.name}, ${S} beside ${who}: federal grants, county spending by category and every line of its budget, per resident or in total — each figure linked to its source.`, canonical: `${canonical}${scope !== 'size-state' || mode !== 'resident' ? `?with=${scope}&per=${mode}` : ''}`, body });
}

// Every budget line we hold, with its category and the rule that matched it.
function linesCsv() {
  const I = LN.index();
  const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
  const out = ['geoid,county,state,year,line,fund,amount,category,matched_by,source'];
  for (const r of Object.values(I.counties).sort((a, b) => a.st.localeCompare(b.st) || a.name.localeCompare(b.name)))
    for (const l of r.lines) out.push([r.geoid, q(r.name), r.st, r.year, q(l.name), q(l.fund), l.amount, q(l.cat ? LN.LABEL[l.cat] : 'not matched yet'), q(l.how), q(l.href)].join(','));
  return out.join('\n') + '\n';
}

module.exports = { comparePage, linesCsv };
