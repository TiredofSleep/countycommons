const { esc } = require('../lib/corpus');

// Page shell. No external requests of any kind — styles and the tiny
// enhancement script are served from this box. Works with JS disabled.

const NAV = [
  ['/', 'Money trail'],
  ['/docket', 'Docket'],
  ['/documents', 'Documents'],
  ['/verify', 'Verification'],
  ['/methodology', 'Methodology']
];

function layout({ title, current, body, county }) {
  const nav = NAV.map(([href, label]) =>
    `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="wrap">
<nav class="site" aria-label="Site">${nav}</nav>
${body}
<footer>
${esc(county.platform_name)} is a free civic transparency project for ${esc(county.name)}, ${esc(county.state)}.
It computes and cites; it never takes sides. A dead end means "not yet ingested and navigable," never "hidden."
<a href="/methodology">How every number is sourced</a>. ${esc(county.sponsor_line)}.
</footer>
</div>
</body>
</html>`;
}

module.exports = { layout };
