const { esc } = require('../lib/corpus');

// Page shell. No external requests of any kind — styles and the tiny
// enhancement script are served from this box. Works with JS disabled.

const NAV = [
  ['/', 'Home'],
  ['/stance', 'Where we stand'],
  ['/help', 'Find help'],
  ['/budget', 'Money trail'],
  ['/priorities', 'Priorities'],
  ['/outcomes', 'What came of it'],
  ['/issues', 'Open questions'],
  ['/calendar', 'Calendar'],
  ['/participate', 'Get involved'],
  ['/docket', 'Docket'],
  ['/story', 'Our story'],
  ['/counties', 'All counties']
];

function layout({ title, current, body, county, description }) {
  // Counties with a municipalities layer (e.g. Middlesex, MA, where county
  // government was abolished) get a "Cities & towns" item after the money trail.
  const navItems = NAV.slice();
  if (county && county.has_municipalities) {
    const i = navItems.findIndex(([h]) => h === '/budget');
    navItems.splice(i + 1, 0, ['/places', 'Cities & towns']);
  }
  const nav = navItems.map(([href, label]) =>
    `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  const desc = description || `${county.name}'s public money, made navigable — every number cited to its source document, every gap named.`;
  const corrections = county.contact_email
    ? ` Spot an error? That's a gift: <a href="mailto:${esc(county.contact_email)}">${esc(county.contact_email)}</a>.`
    : '';
  const officialLinks = (county.jurisdictions || [])
    .filter(j => j.website)
    .map(j => `${esc(j.name)}: <a href="${esc(j.website)}" rel="noopener">${esc(j.website.replace(/^https?:\/\/(www\.)?/, ''))}</a>`)
    .join(' · ');
  // The call to action, on every page — the whole site funnels here. Suppressed
  // where it would be redundant (the priorities board itself) or out of place
  // (the host/owner consoles).
  const noCta = ['/priorities', '/admin', '/owner'].includes(current);
  const ctaBand = noCta ? '' : `
<aside style="border:2px solid var(--ink);background:var(--card);padding:16px 18px;margin:26px 0 0;display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between">
  <div style="min-width:220px;flex:1">
    <div style="font-family:var(--mono);font-weight:600;font-size:15px">Ready to be heard?</div>
    <div class="src" style="margin-top:3px;max-width:52ch">Say what your community should prioritize — in ${esc(county.name)}, in your state, or nationally — and rally your neighbors behind it. Free, and no account needed.</div>
  </div>
  <a href="/priorities" style="font-family:var(--mono);font-size:15px;font-weight:600;padding:14px 22px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);text-decoration:none;white-space:nowrap">Raise your voice →</a>
</aside>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="/style.css?v=5">
<link rel="icon" href="/favicon.svg">
<script src="/app.js" defer></script>
</head>
<body>
<div class="wrap">
<nav class="site" aria-label="Site">${nav}</nav>
${body}
${ctaBand}
<footer>
<b>${esc(county.platform_name)} is an independent, citizen-built project. It is not a government website</b> and has no affiliation with, or endorsement from, ${esc(county.name)}, its cities, or any government body.${officialLinks ? ` Official government sites — ${officialLinks}.` : ''}
<br><br>
${esc(county.platform_name)} is a free civic transparency project for ${esc(county.name)}, ${esc(county.state)}.
It computes and cites; it never takes sides. A dead end means "not yet ingested and navigable," never "hidden."
<a href="/methodology">How every number is sourced</a> · <a href="/documents">the documents</a> · <a href="/verify">the receipt</a> · <a href="/vendors">who gets paid</a> · <a href="/audits">what the auditors reported</a> · <a href="/counties">every county</a> · <a href="/compare/counties">how counties compare</a> · <a href="/stance">where we stand</a> · <a href="/cases">the precedents</a> · <a href="/research">the research shelf</a> · <a href="/kindred">kindred work</a> · <a href="/field">where we sit in the field</a> · <a href="/never">what we will never do</a> · <a href="/traffic">the traffic log</a> · <a href="/security">how this is secured</a> · <a href="/guide">the plain-words tour</a> · <a href="/feedback">report a problem</a>. ${esc(county.sponsor_line)}.${corrections}
</footer>
</div>
</body>
</html>`;
}

module.exports = { layout };
