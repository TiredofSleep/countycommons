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

// The flow panel — one place to reach every page, grouped in the order the
// platform actually works: see the money, say what you want, rally and hold them
// to it, then the wider network and the rules that keep it honest. Config gates
// the items that don't exist for a given county (a cities layer, the flagship's
// comparison pages). Every page on the site appears here exactly once.
function siteMap(county, current) {
  const muni = county && county.has_municipalities;
  const cmp = county && county.has_compare;
  const groups = [
    ['See where the money goes', [
      ['/budget', 'The money trail'],
      muni ? ['/places', 'Cities & towns'] : null,
      ['/vendors', 'Who gets paid'],
      ['/audits', 'What the auditors reported'],
      ['/verify', 'The receipt — arithmetic checked'],
      ['/documents', 'The documents'],
      ['/methodology', 'How every number is sourced'],
      ['/guide', 'The plain-words tour']
    ]],
    ['Say what you want', [
      ['/priorities', 'Priorities board'],
      ['/issues', 'Open questions'],
      ['/help', 'Find help']
    ]],
    ['Rally & hold them to it', [
      ['/outcomes', 'What came of it'],
      ['/docket', 'The docket'],
      ['/calendar', 'The calendar'],
      ['/participate', 'Get involved']
    ]],
    ['The wider network', [
      ['/counties', 'All counties'],
      cmp ? ['/compare/counties', 'How counties compare'] : null,
      cmp ? ['/compare/spending', 'Spending vs. neighbors'] : null,
      ['/kindred', 'Kindred work'],
      ['/field', 'Where we sit in the field'],
      ['/cases', 'The precedents'],
      ['/research', 'The research shelf']
    ]],
    ['How to trust this', [
      ['/stance', 'Where we stand'],
      ['/never', 'What we will never do'],
      ['/security', 'How this is secured'],
      ['/traffic', 'The traffic log'],
      ['/story', 'Our story'],
      ['/feedback', 'Report a problem']
    ]]
  ];
  const col = ([heading, items]) => `<div style="min-width:170px;flex:1">
    <div class="eyebrow" style="margin:0 0 6px">${esc(heading)}</div>
    ${items.filter(Boolean).map(([href, label]) =>
      `<a href="${href}" style="display:block;padding:3px 0;font-size:13.5px;${href === current ? 'font-weight:700;color:var(--accent)' : ''}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('')}
  </div>`;
  return `<details class="sitemap" style="margin:10px 0 0;border:1.5px solid var(--rule);background:var(--card)">
  <summary style="cursor:pointer;padding:9px 12px;font-family:var(--mono);font-size:13px;font-weight:600;list-style:none">🗺 Every page — the whole flow</summary>
  <div style="display:flex;gap:20px;flex-wrap:wrap;padding:6px 14px 14px">${groups.map(col).join('')}</div>
</details>`;
}

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
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="County Commons">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="stylesheet" href="/style.css?v=5">
<link rel="icon" href="/favicon.svg">
<script src="/app.js" defer></script>
</head>
<body>
<div class="wrap">
<nav class="site" aria-label="Site">${nav}</nav>
${siteMap(county, current)}
${body}
${ctaBand}
<footer>
<b>${esc(county.platform_name)} is an independent, citizen-built project. It is not a government website</b> and has no affiliation with, or endorsement from, ${esc(county.name)}, its cities, or any government body.${officialLinks ? ` Official government sites — ${officialLinks}.` : ''}
<br><br>
${esc(county.platform_name)} is a free civic transparency project for ${esc(county.name)}, ${esc(county.state)}.
It computes and cites; it never takes sides. A dead end means "not yet ingested and navigable," never "hidden."
Every page is one click away in the <b>🗺 Every page</b> map at the top. ${esc(county.sponsor_line)}.${corrections}
</footer>
</div>
</body>
</html>`;
}

module.exports = { layout };
