const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The Help Finder — the page the spec (§14) says comes before everything
// else for the resident who is broke and out of work: the platform gives
// before it asks. Plain words, big phone numbers, no forms, no tracking.

// A listing links to its source when the data has a URL: an explicit url field, or a
// web address written in the listing's own text.
const DOMAIN = /\b((?:[a-z0-9-]+\.)+(?:org|com|gov|net|us|edu))(\/[^\s,;)]*)?/i;
function listingUrl(r) {
  if (r.url) return r.url;
  const m = DOMAIN.exec(String(r.what || '')) || DOMAIN.exec(String(r.address || ''));
  return m ? 'https://' + (m[1] + (m[2] || '')).replace(/[.]+$/, '') : null;
}

function helpPage(data) {
  const { county, help } = data;

  const cats = help.categories.map(c => `
<section id="${esc(c.id)}">
<h2>${esc(c.title)}</h2>
${c.resources.map(r => `
<div class="issue" style="display:block">
  <b>${esc(r.name)}</b> — <span style="font-size:13.5px">${esc(r.what)}</span>
  <p style="font-size:15px;margin:6px 0 0">
    ${r.phone ? `<a href="tel:${esc(r.phone.replace(/[^0-9]/g, ''))}" style="font-family:var(--mono);font-weight:600;font-size:17px">${esc(r.phone)}</a> · ` : ''}${esc(r.hours)}
  </p>
  ${r.address ? `<p class="src">${esc(r.address)}</p>` : ''}
  ${listingUrl(r) ? `<p class="src">Source: <a href="${esc(listingUrl(r))}" rel="noopener">${esc(listingUrl(r).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></p>` : ''}
</div>`).join('')}
${c.also ? `<p class="src">${esc(c.also)}</p>` : ''}
</section>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · local help</div>
  <h1>If you're in a hard spot</h1>
  <div class="src">${esc(help.intro)}</div>
</header>

${cats}

<section>
<h2>About this list </h2>
<p class="src">${/^\s*\d/.test(String(help.verified || '')) ? `Listings last verified ${esc(help.verified)}.` : `These listings haven't been independently verified yet.`} ${esc(help.verified_note || '')}</p>
<p class="src">${esc(help.missing)}</p>
<p class="src">Nothing you look up here is logged or tracked — this page is served the same to everyone.</p>
<p class="src">This is a community-kept list, not a government service. Each program decides its own eligibility, and hours and rules change — call ahead. A listing here is information, not a promise of help.</p>
</section>`;

  return layout({
    title: `If you're in a hard spot — ${county.platform_name}`, current: '/help', body, county,
    description: `Local food, utility, housing and benefits resources in ${county.name} with phone numbers and hours. This page has no forms and keeps no record of what you look up.`
  });
}

module.exports = { helpPage };
