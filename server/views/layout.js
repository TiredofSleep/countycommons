const { esc } = require('../lib/corpus');

// Page shell. No external requests of any kind — styles and the tiny
// enhancement script are served from this box. Works with JS disabled.

const NAV = [
  ['/', 'Home'],
  ['/stance', 'Where we stand'],
  ['/help', 'Find help'],
  ['/budget', 'Money trail'],
  ['/issues', 'Open questions'],
  ['/calendar', 'Calendar'],
  ['/participate', 'Get involved'],
  ['/docket', 'Docket'],
  ['/story', 'Our story']
];

function layout({ title, current, body, county, description }) {
  const nav = NAV.map(([href, label]) =>
    `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  const desc = description || `${county.name}'s public money, made navigable — every number cited to its source document, every gap named.`;
  const corrections = county.contact_email
    ? ` Spot an error? That's a gift: <a href="mailto:${esc(county.contact_email)}">${esc(county.contact_email)}</a>.`
    : '';
  const officialLinks = (county.jurisdictions || [])
    .filter(j => j.website)
    .map(j => `${esc(j.name)}: <a href="${esc(j.website)}" rel="noopener">${esc(j.website.replace(/^https?:\/\/(www\.)?/, ''))}</a>`)
    .join(' · ');
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
<footer>
<b>${esc(county.platform_name)} is an independent, citizen-built project. It is not a government website</b> and has no affiliation with, or endorsement from, ${esc(county.name)}, its cities, or any government body.${officialLinks ? ` Official government sites — ${officialLinks}.` : ''}
<br><br>
${esc(county.platform_name)} is a free civic transparency project for ${esc(county.name)}, ${esc(county.state)}.
It computes and cites; it never takes sides. A dead end means "not yet ingested and navigable," never "hidden."
<a href="/methodology">How every number is sourced</a> · <a href="/documents">the documents</a> · <a href="/verify">the receipt</a> · <a href="/vendors">who gets paid</a> · <a href="/audits">what the auditors reported</a> · <a href="/compare/counties">how counties compare</a> · <a href="/stance">where we stand</a> · <a href="/cases">the precedents</a> · <a href="/research">the research shelf</a> · <a href="/never">what we will never do</a> · <a href="/security">how this is secured</a> · <a href="/guide">the plain-words tour</a> · <a href="/feedback">report a problem</a>. ${esc(county.sponsor_line)}.${corrections}
</footer>
</div>
</body>
</html>`;
}

module.exports = { layout };
