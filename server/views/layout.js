const { esc } = require('../lib/corpus');

// Page shell. No external requests of any kind — styles and the tiny
// enhancement script are served from this box. Works with JS disabled.

const NAV = [
  ['/story', 'Start here'],
  ['/', 'Money trail'],
  ['/vendors', 'Who gets paid'],
  ['/audits', 'Audit verdicts'],
  ['/docket', 'Docket'],
  ['/documents', 'Documents'],
  ['/verify', 'Verification'],
  ['/methodology', 'Methodology']
];

function layout({ title, current, body, county, description }) {
  const nav = NAV.map(([href, label]) =>
    `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  const desc = description || `${county.name}'s public money, made navigable — every number cited to its source document, every gap named.`;
  const corrections = county.contact_email
    ? ` Spot an error? That's a gift: <a href="mailto:${esc(county.contact_email)}">${esc(county.contact_email)}</a>.`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="/style.css">
<link rel="icon" href="/favicon.svg">
<script src="/app.js" defer></script>
</head>
<body>
<div class="wrap">
<nav class="site" aria-label="Site">${nav}</nav>
${body}
<footer>
${esc(county.platform_name)} is a free civic transparency project for ${esc(county.name)}, ${esc(county.state)}.
It computes and cites; it never takes sides. A dead end means "not yet ingested and navigable," never "hidden."
<a href="/methodology">How every number is sourced</a>. ${esc(county.sponsor_line)}.${corrections}
</footer>
</div>
</body>
</html>`;
}

module.exports = { layout };
