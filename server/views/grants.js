const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Grants — real programs, what each pays for, who can apply, and when. Three
// layers: a county's own section (grants.json), its state's programs
// (grants-<state>.json), and federal programs every county can look at
// (grants-guide.json). Deadlines are compared with today's date on each request,
// so a passed deadline says so instead of going stale.

function grantsPage(data) {
  const { county, grants: loc, grantsState: st, grantsGuide: g, documents } = data;
  const docs = new Map(documents.documents.map(d => [d.id, d]));
  const cite = (s) => {
    if (!s) return '';
    const d = s.doc && docs.get(s.doc);
    if (d) return `<a href="/documents#${esc(d.id)}">${esc(d.title)}</a>`;
    if (s.url) return `<a href="${esc(s.url)}" rel="noopener">${esc(s.label || s.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`;
    return '';
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmt = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const daysLeft = (iso) => Math.round((new Date(iso + 'T00:00:00') - today) / 86400000);
  const chip = (p) => {
    if (p.status === 'open' && p.deadline) {
      const d = daysLeft(p.deadline);
      return d < 0 ? `<span class="chip c-cite">deadline passed ${esc(fmt(p.deadline))}</span>`
        : `<span class="chip c-part">due ${esc(fmt(p.deadline))} · ${d} day${d === 1 ? '' : 's'} left</span>`;
    }
    if (p.status === 'rolling') return '<span class="chip c-ok">no deadline — apply any time</span>';
    return '<span class="chip c-cite">this year’s round is closed</span>';
  };
  const card = (p) => `
<div class="issue" style="display:block">
  <div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline"><b>${esc(p.name)}</b> ${chip(p)}</div>
  <div class="src" style="max-width:none">${esc(p.agency)}</div>
  <table class="plain" style="margin:6px 0 2px;table-layout:fixed;width:100%"><tbody>
    <tr><td style="width:86px">Pays for</td><td style="overflow-wrap:anywhere">${esc(p.pays)}</td></tr>
    <tr><td>Who</td><td style="overflow-wrap:anywhere">${esc(p.who)}</td></tr>
    <tr><td>How much</td><td style="overflow-wrap:anywhere">${esc(p.size)}</td></tr>
    <tr><td>Local share</td><td style="overflow-wrap:anywhere">${esc(p.match)}</td></tr>
  </tbody></table>
  ${p.note ? `<p class="src" style="max-width:none">${esc(p.note)}</p>` : ''}
  <p style="margin:4px 0 0;font-size:14px"><a href="${esc(p.url)}" rel="noopener">Official page →</a></p>
</div>`;
  const byDate = (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999');

  const upcoming = (st ? st.items : []).concat(g.groups.flatMap(x => x.items))
    .filter(p => p.status === 'open' && p.deadline && daysLeft(p.deadline) >= 0).sort(byDate);

  const local = loc ? `
<section id="ours">
<h2>${esc(loc.title)} <span class="sub">— what fits the needs on this site</span></h2>
<p>${esc(loc.lead)}</p>
${loc.fits.map(f => `<div style="border-bottom:1px solid var(--rule-soft);padding:9px 0"><b>${esc(f.need)}</b><div style="font-size:14px">${esc(f.text)}${f.link ? ` <a href="${esc(f.link)}">See the page →</a>` : ''}</div></div>`).join('')}
<p style="font-size:14px;margin:12px 0 4px"><b>Not available here:</b></p>
<ul>${loc.not_available.map(x => `<li style="font-size:14px">${esc(x)}</li>`).join('')}</ul>
<p style="font-size:14px;margin:12px 0 4px"><b>What’s already coming in:</b></p>
<ul>${loc.already.map(x => `<li style="font-size:14px">${esc(x.text)} <span class="src">${cite(x.src)}</span></li>`).join('')}</ul>
<p style="font-size:14px;margin:12px 0 4px"><b>Help writing them:</b></p>
<ul>${loc.help.map(x => `<li style="font-size:14px">${esc(x.text)} <span class="src">${cite(x)}</span></li>`).join('')}</ul>
</section>` : `
<section id="ours">
<h2>${esc(county.name)} <span class="sub">— not matched yet</span></h2>
<p>We haven’t matched these programs to ${esc(county.name)}’s own needs yet — not gathered, not hidden. The programs below are open to counties and cities like it.</p>
</section>`;

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · grants</div>
  <h1>Money we could go get</h1>
  <div class="src">${esc(g.intro)} Dates and terms were read on ${esc(fmt(g.checked))}.</div>
</header>

<section id="deadlines">
<h2>Deadlines coming up <span class="sub">— soonest first</span></h2>
${upcoming.length ? upcoming.map(card).join('') : '<p>No dated deadlines are open right now. The programs marked “apply any time” below are.</p>'}
</section>
${local}
${st ? `
<section id="state">
<h2>${esc(county.state)} programs</h2>
${st.items.slice().sort(byDate).map(card).join('')}
${st.help && st.help.length ? `<ul>${st.help.map(x => `<li style="font-size:14px">${esc(x.text)} <span class="src">${cite(x)}</span></li>`).join('')}</ul>` : ''}
</section>` : ''}

<section id="federal">
<h2>Federal programs <span class="sub">— by what they pay for</span></h2>
${g.groups.map(grp => `<h3 style="margin-top:16px">${esc(grp.need)}</h3>${grp.items.map(card).join('')}`).join('')}
</section>

<section id="how">
<h2>How applying works</h2>
<ul>${g.how.map(x => `<li>${esc(x.text)} <span class="src">${cite(x)}</span></li>`).join('')}</ul>
<p style="font-size:14px;margin-bottom:4px"><b>The honest limits:</b></p>
<ul>${g.limits.map(x => `<li style="font-size:14px">${esc(x)}</li>`).join('')}</ul>
<p class="src">Related: <a href="/budget">The budget</a> · <a href="/commonwealth">Commonwealth</a> · <a href="/docket">The docket</a>. This page lists programs; whether to apply is for the county, its cities, and their residents to decide. Spot an error or a program we missed? <a href="/feedback">Tell us</a>.</p>
</section>`;

  return layout({
    title: `Grants — ${county.platform_name}`, current: '/grants', body, county,
    description: `Grants and low-cost loans ${county.name} and its cities could apply for — what each pays for, who can apply, how much, and when — read from each agency's own page.`
  });
}

module.exports = { grantsPage };
