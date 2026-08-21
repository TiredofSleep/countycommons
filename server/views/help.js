const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The Help Finder — the page the spec (§14) says comes before everything
// else for the resident who is broke and out of work: the platform gives
// before it asks. Plain words, big phone numbers, no forms, no tracking.

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
</div>`).join('')}
${c.also ? `<p class="src">${esc(c.also)}</p>` : ''}
</section>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · real help, fast</div>
  <h1>If you're in a hard spot</h1>
  <div class="src">${esc(help.intro)}</div>
</header>

${cats}

<section>
<h2>About this list <span class="sub">— honest and checkable, like everything here</span></h2>
<p class="src">Listings verified ${esc(help.verified)}. ${esc(help.verified_note)}</p>
<p class="src">${esc(help.missing)}</p>
<p class="src">Nothing you look up here is logged or tracked — this page is served the same to everyone.</p>
<p class="src">This is a community-kept list, not a government service. Each program decides its own eligibility, and hours and rules change — call ahead. A listing here is information, not a promise of help.</p>
</section>`;

  return layout({
    title: `If you're in a hard spot — ${county.platform_name}`, current: '/help', body, county,
    description: `Food, light bill, rent, benefits — the real ${county.name} options with phone numbers and hours. No forms, no runaround.`
  });
}

module.exports = { helpPage };
