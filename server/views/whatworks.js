const { esc } = require('../lib/corpus');
const fs = require('fs');
const path = require('path');
const peers = require('../lib/peers');

// What has worked elsewhere: for each measure a county can be compared on,
// approaches with a measured track record — what it is, what evaluations found,
// the rating and who rated it, where it's been done, and its limits. It reports
// evidence; it never recommends. Residents and their officials choose.
// Library: data/corpus/what-works.json.

let lib = null, libMtime = 0;
function library() {
  const p = path.join(__dirname, '..', '..', 'data', 'corpus', 'what-works.json');
  try { const m = fs.statSync(p).mtimeMs; if (m !== libMtime) { lib = JSON.parse(fs.readFileSync(p, 'utf8')); libMtime = m; } } catch (e) { lib = null; }
  return lib;
}

const cite = (s) => s && s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.by || s.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : '';

function model(m) {
  return `
<div class="issue" style="display:block">
  <b>${esc(m.name)}</b>${m.rating ? ` <span class="chip c-cite">${esc(m.rating.label)}</span>` : ' <span class="chip c-cite">not rated by a clearinghouse</span>'}
  <p style="font-size:14.5px;margin:4px 0 0">${esc(m.what)}</p>
  <p style="font-size:14.5px;margin:4px 0 0"><b>What studies found:</b> ${esc(m.found)}</p>
  ${m.who ? `<p class="src" style="max-width:none;margin:4px 0 0">Who can do it: ${esc(m.who)}${m.where ? ` · Done in: ${esc(m.where)}` : ''}</p>` : ''}
  ${m.caveat ? `<p class="src" style="max-width:none;margin:4px 0 0">Limits: ${esc(m.caveat)}</p>` : ''}
  <p class="src" style="max-width:none;margin:4px 0 0">${m.rating ? `Rating: ${cite({ url: m.rating.url, label: m.rating.by })}. ` : ''}Sources: ${(m.src || []).map(cite).join(' · ')}</p>
</div>`;
}

function topicSection(key, t, opts = {}) {
  const models = opts.limit ? t.models.slice(0, opts.limit) : t.models;
  return `
<section id="ww-${esc(key)}">
<h2>${esc(t.title)} <span class="sub">— what has worked elsewhere</span></h2>
${opts.lead || ''}
${models.map(model).join('')}
${opts.limit && t.models.length > opts.limit ? `<p class="src"><a href="${esc(opts.more)}#ww-${esc(key)}">${t.models.length - opts.limit} more option${t.models.length - opts.limit === 1 ? '' : 's'}</a></p>` : ''}
</section>`;
}

const NOTE = 'These are options with a track record, not recommendations. Each one says what evaluations found, who rated the evidence, and where it fell short. Residents and their officials choose.';

// On a county page: options for the measures where the county differs most
// from similar counties, in either direction (up to four).
const higherLower = (r) => Math.abs(r.raw) < 0.05 ? 'about the same as the typical similar county' : `about ${Math.round(Math.abs(r.raw) * 100)}% ${r.raw > 0 ? 'higher' : 'lower'} than the typical similar county`;
function improveBlock(c, N, opts = {}) {
  const L = library(); if (!L) return '';
  const cmp = peers.compare(c, N); if (!cmp) return '';
  const behind = cmp.rows.filter(r => Math.abs(r.raw) >= 0.15 && L.topics[r.key]).sort((a, b) => Math.abs(b.raw) - Math.abs(a.raw)).slice(0, opts.topics || 4);
  if (!behind.length) return '';
  return `
<section id="what-works">
<h2>What has worked elsewhere <span class="sub">— on the measures where ${esc(c.name)} differs most from similar counties</span></h2>
<p>${NOTE} <a href="${esc(opts.more)}">Every measure and every option</a>.</p>
</section>
${behind.map(r => topicSection(r.key, L.topics[r.key], { limit: 2, more: opts.more, lead: `<p class="src" style="max-width:none">${esc(r.label)}: ${esc(c.name)} ${esc(r.v)}, typical similar county ${esc(r.med)} (${higherLower(r)}).</p>` })).join('')}`;
}

// The full page body: every measure compared, then every topic's options,
// in the library's fixed order for every county. c may be null (national page).
function fullBody(c, N) {
  const L = library();
  if (!L) return '<section><p>The library of what has worked is being gathered — not gathered, never hidden.</p></section>';
  const cmp = c ? peers.compare(c, N) : null;
  const gap = {}; for (const r of (cmp && cmp.rows) || []) gap[r.key] = r;
  const keys = Object.keys(L.topics);
  return `
<section>
<p>${esc(L.intro || '')} ${NOTE}</p>
<p class="src">Topics: ${keys.map(k => `<a href="#ww-${esc(k)}">${esc(L.topics[k].title.toLowerCase())}</a>`).join(' · ')}</p>
</section>
${keys.map(k => topicSection(k, L.topics[k], { lead: gap[k] ? `<p class="src" style="max-width:none">${esc(gap[k].label)}: ${esc(c.name)} ${esc(gap[k].v)}, typical similar county ${esc(gap[k].med)}; ${higherLower(gap[k])}.</p>` : '' })).join('')}
<section><p class="src">Library gathered ${esc(L.updated || '')}. Ratings come from the clearinghouse named on each option; a rating describes the strength of the evidence, not whether an option fits a given place. Spot an error? Write brayden.ozark@gmail.com.</p></section>`;
}

// A county site's /what-works page: how it compares, then every option.
function whatWorksPage(data) {
  const { county } = data;
  const nat = require('../lib/national');
  const c = nat.forCounty(county), N = nat.meta();
  const { layout } = require('./layout');
  const cmp = c ? peers.compare(c, N) : null;
  const behind = cmp ? cmp.rows.filter(r => Math.abs(r.raw) >= 0.15).sort((a, b) => Math.abs(b.raw) - Math.abs(a.raw)) : [];
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · what has worked</div>
  <h1>How ${esc(county.name)} compares, and what has worked elsewhere</h1>
  <div class="src">${esc(county.name)} beside counties like it — then, for each measure, approaches other places have tried and evaluators have measured, with the rating, where it was done and its limits.</div>
</header>
${c ? peers.block(c, N) : ''}
${fullBody(c, N)}
<section><p class="src">Related: <a href="/atlas">By the numbers</a> · <a href="/budget">The money trail</a> · <a href="/justice">Jails & prisons</a> · <a href="/water">Water</a>. The same library for every county: <a href="https://countycommons.us/us/what-works">countycommons.us/us/what-works</a>.</p></section>`;
  return layout({
    title: `${county.name}, ${county.state}: how it compares with similar counties, and what has worked elsewhere · County Commons`,
    current: '/what-works', body, county,
    description: `${county.name} beside counties of similar size and income on overdose deaths, health insurance, doctors, child poverty, hunger, housing, jail and bridges${behind.length ? ` — differing most on ${behind.slice(0, 2).map(r => r.label.toLowerCase()).join(' and ')}` : ''} — and evidence-rated options other places have used.`
  });
}

module.exports = { library, improveBlock, fullBody, whatWorksPage };
