const reqctx = require('../lib/reqctx');
const { esc } = require('../lib/corpus');
const network = require('../lib/network');

// Page shell. No external requests of any kind — styles and the tiny
// enhancement script are served from this box. Works with JS disabled.

// The top bar is the pillars every county shares; everything else lives in the
// "Every page" panel below it.
const NAV = [
  ['/', 'Home'],
  ['/issues', 'Votes'],
  ['/petitions', 'Petitions'],
  ['/budget', 'Budget'],
  ['/grants', 'Grants'],
  ['/water', 'Water'],
  ['/justice', 'Jails'],
  ['/elections', 'Elections'],
  ['/docket', 'Docket'],
  ['/coverage', 'Coverage'],
  ['/help', 'Help'],
  ['/counties', 'Counties']
];

// The flow panel — one place to reach every page, grouped in the order the
// platform actually works: see the money, say what you want, rally and hold them
// to it, then the wider network and the rules that keep it honest. Config gates
// the items that don't exist for a given county (a cities layer, the flagship's
// comparison pages). Every page on the site appears here exactly once.
function siteMap(county, current) {
  const muni = county && county.has_municipalities;
  const cmp = county && county.has_compare;
  // The six pillars every county is built on, then the network and the rules.
  const groups = [
    ['The votes', [
      ['/issues', 'Open questions'],
      ['/elections', 'Elections — when, where, how'],
      ['/turnout', 'Voter turnout'],
      ['/petitions', 'Petitions — sign, start, share'],
      ['/outcomes', 'What came of it'],
      ['/participate', 'Get involved']
    ]],
    ['The budget', [
      ['/tour', '▶ Take the 2-minute tour'],
      ['/budget', 'The money trail'],
      county && county.has_mybill ? ['/mybill', 'Your tax bill, explained'] : null,
      muni ? ['/places', 'Cities & towns'] : null,
      county && county.has_taxes_debt ? ['/taxes', 'Taxes & debt'] : null,
      ['/grants', 'Grants and loans'],
      ['/vendors', 'Who gets paid'],
      ['/audits', 'What the auditors reported'],
      ['/verify', 'The receipt — arithmetic checked'],
      ['/documents', 'The documents'],
      ['/methodology', 'How every number is sourced'],
      ['/faq', 'Questions people ask — answered from the data'],
      ['/guide', 'The plain-words tour']
    ]],
    ['Public needs', [
      ['/water', 'Drinking water'],
      ['/justice', 'Jails and prisons'],
      ['/surveillance', 'Cameras and plate readers — what’s in use and the rules'],
      ['/offices', 'Who to call — county and state offices'],
      ['/atlas', 'By the numbers — schools, health, disaster risk, bridges, grants'],
      ['/compare', 'How it compares — beside similar counties and the rest of the state'],
      ['/what-works', 'What evaluations found — approaches other places have measured'],
      ['/help', 'Find help']
    ]],
    ['Dead ends & open questions', [
      ['/docket', 'The docket'],
      ['/calendar', 'The calendar'],
      ['/coverage', 'How complete is this county?']
    ]],
    ['Research and background', [
      county && county.has_whatif ? ['/whatif', 'Savings scenarios'] : null,
      county && county.has_taxlab ? ['/taxlab', 'Tax scenarios'] : null,
      county && county.has_commonwealth ? ['/commonwealth', 'Public money on deposit'] : null,
      ['/receipts', 'How governments publish payments'],
      ['/sovereignty', 'Local food production — the numbers'],
      ['/growops', 'Small growing systems — what they produce'],
      ['/engine', 'How local food systems are funded'],
      ['/feed', 'Land and labor for a county’s food'],
      ['/frontier', 'Newer growing methods — results and failures'],
      ['/almanac', 'The grower’s almanac'],
      ['/research', 'The research shelf'],
      ['/cases', 'What other places did']
    ]],
    ['The wider network', [
      ['/counties', 'All counties'],
      cmp ? ['/compare/counties', 'How counties compare'] : null,
      cmp ? ['/compare/spending', 'Spending vs. neighbors'] : null,
      ['/kindred', 'Kindred work'],
      ['/field', 'Similar civic projects']
    ]],
    ['How to trust this', [
      ['/stance', 'How this site works'],
      ['/never', 'What we will never do'],
      ['/security', 'How this is secured'],
      ['/traffic', 'The traffic log'], ['/building', 'Still building — what’s new, and fixes readers sent'],
      ['/story', 'Our story'],
      ['/feedback', 'Correct or add something']
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

// JSON-LD blocks; "<" is escaped so a value can never close the script tag.
const ldTags = (list) => list.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n');
function layout({ title, current, body, county, description, jsonld, canonical: canonicalOverride }) {
  // Search: every title names the place and state ("Travis County, Texas"),
  // replacing the bare platform name a searcher wouldn't type.
  const place = `${county.name}, ${county.state}`;
  if (county.platform_name && title.endsWith(county.platform_name) && !title.includes(county.state)) {
    title = title.slice(0, -county.platform_name.length) + `${place} · County Commons`;
  } else if (!title.includes(county.state)) {
    title = `${title} — ${place}`;
  }
  const canonical = canonicalOverride || reqctx.url(); // a page shown on many sites can name one official address
  const ld = [].concat(jsonld || []);
  // Counties with a municipalities layer (e.g. Middlesex, MA, where county
  // government was abolished) get a "Cities & towns" item after the money trail.
  const navItems = NAV.slice();
  if (county && county.has_mybill) {
    const i = navItems.findIndex(([h]) => h === '/budget');
    navItems.splice(i + 1, 0, ['/mybill', 'My bill']);
  }
  if (county && county.has_municipalities) {
    const i = navItems.findIndex(([h]) => h === '/budget');
    navItems.splice(i + 1, 0, ['/places', 'Cities & towns']);
  }
  const nav = navItems.map(([href, label]) =>
    `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  const desc = description || `${county.name}, ${county.state}: public money made navigable — budgets, tax rates, elections and open records, every number cited to its source document, every gap named.`;
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
  const noCta = ['/priorities', '/petitions', '/admin', '/owner'].includes(current);
  const ctaBand = noCta ? '' : `
<aside style="border:2px solid var(--ink);background:var(--card);padding:16px 18px;margin:26px 0 0;display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between">
  <div style="min-width:220px;flex:1">
    <div style="font-family:var(--mono);font-weight:600;font-size:15px">Petitions</div>
    <div class="src" style="margin-top:3px;max-width:52ch">Residents' requests to ${esc(county.name)} officials, their state, or Congress — each one says who started it. When a petition reaches its goal it's delivered, and any answer is posted here. Free, no account.</div>
  </div>
  <a href="/petitions" style="font-family:var(--mono);font-size:15px;font-weight:600;padding:14px 22px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);text-decoration:none;white-space:nowrap">Petitions →</a>
</aside>`;
  // Help keep this honest — on nearly every page: correct it, add to it, send a
  // document, with this page's address carried along. Plus proof of life.
  const here = reqctx.current().path || '/';
  const fb = (kind) => `/feedback?kind=${kind}&from=${encodeURIComponent(here)}`;
  const last = (() => { try { return require('../lib/building').lastUpdated(); } catch (e) { return null; } })();
  const btn = 'font-family:var(--mono);font-size:13.5px;font-weight:600;padding:8px 12px;border:1.5px solid var(--ink);color:var(--ink);background:var(--paper);text-decoration:none;white-space:nowrap';
  const honestBand = ['/feedback', '/admin', '/owner'].includes(current) ? '' : `
<aside aria-label="Help keep this honest" style="border:1.5px dashed var(--ink);padding:14px 16px;margin:18px 0 0">
  <div style="font-family:var(--mono);font-weight:600;font-size:15px">Help keep this honest</div>
  <p class="src" style="margin:4px 0 10px;max-width:62ch">See something wrong, out of date, or missing on this page? Tell us — a person reads every note, and fixes are logged in public. ${network.net().flagship_name ? `County Commons is built out furthest for ${esc(network.net().flagship_name)}, but it’s for every county` : 'County Commons is for every county'}${county.name && !(network.net().flagship_name || '').startsWith(county.name + ',') ? `, and we build more for ${esc(county.name)} on request` : ', and we build more for any county on request'}.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <a href="${fb('correction')}" style="${btn}">Correct something</a>
    <a href="${fb('add')}" style="${btn}">Add information</a>
    <a href="${fb('document')}" style="${btn}">Send a document</a>
    <a href="${fb('request')}" style="${btn}">Request more for ${esc(county.name || 'this county')}</a>
    <a href="/building" style="${btn};border-style:dashed">What's new${last ? ` · updated ${esc(last)}` : ''}</a>
  </div>
</aside>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow">
<meta name="msvalidate.01" content="FFA249793035B911D0EEDEC5B9CD8803">
<meta property="og:type" content="website">
<meta property="og:site_name" content="County Commons">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<link rel="canonical" href="${esc(canonical)}">
${ldTags(ld)}
<link rel="stylesheet" href="/style.css?v=6">
<link rel="icon" href="/favicon.svg">
<script src="/app.js" defer></script>
</head>
<body>
<div class="wrap">
<nav class="site" aria-label="Site">${nav}</nav>
${siteMap(county, current)}
${body}
${honestBand}
${ctaBand}
<footer>
<b>${esc(county.platform_name)} is an independent, citizen-built project. It is not a government website</b> and has no affiliation with, or endorsement from, ${esc(county.name)}, its cities, or any government body.${officialLinks ? ` Official government sites — ${officialLinks}.` : ''}
<br><br>
${esc(county.platform_name)} is a free civic transparency project for ${esc(county.name)}, ${esc(county.state)}.
It computes and cites; it never takes sides. A dead end means "not yet ingested and navigable," never "hidden."
Every page is one click away in the <b>🗺 Every page</b> map at the top. ${esc(county.sponsor_line)}.${corrections}
<br><br>Free to copy: <a href="/license">data and writing under CC BY 4.0, code under MIT</a> · <a href="/copy">copy this for your county</a>.
</footer>
</div>
</body>
</html>`;
}

module.exports = { layout };
