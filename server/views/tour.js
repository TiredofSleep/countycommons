const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// A click-through intro to what the platform does and why it matters — see the
// money, say what you want, rally neighbors, hold officials to it. Server-rendered
// slides with tiny inline-SVG visuals; app.js turns it into a one-at-a-time
// slideshow, and with JS off it's a readable scroll (every slide visible).

function slide(n, total, eyebrow, title, lead, visual, extra) {
  return `
<section class="tour-slide" data-n="${n}">
  <div class="eyebrow">Step ${n} of ${total}</div>
  <h2 style="font-size:clamp(22px,4.4vw,32px);line-height:1.1;margin:6px 0 8px">${title}</h2>
  <div class="src" style="font-size:16px;max-width:60ch">${lead}</div>
  <div style="margin:18px 0 0">${visual || ''}</div>
  ${extra || ''}
</section>`;
}

// --- little theme-aware SVG visuals ---
function barsSVG() {
  const bars = [['Public safety', 82], ['Roads', 61], ['Health & welfare', 44], ['Everything else', 30]];
  return `<svg viewBox="0 0 320 150" width="100%" style="max-width:420px" role="img" aria-label="budget bars">
    ${bars.map((b, i) => `<text x="0" y="${20 + i * 36}" font-size="11" fill="var(--ink)" font-family="var(--sans)">${b[0]}</text>
    <rect x="0" y="${24 + i * 36}" width="${b[1] * 3}" height="12" fill="var(--accent)"/>
    <text x="${b[1] * 3 + 6}" y="${34 + i * 36}" font-size="10" fill="var(--ink)" opacity="0.7" font-family="var(--mono)">cited ✓</text>`).join('')}
  </svg>`;
}
function deadEndSVG() {
  return `<svg viewBox="0 0 320 90" width="100%" style="max-width:420px" role="img" aria-label="a dead end becomes a docket item">
    <rect x="0" y="30" width="120" height="30" fill="none" stroke="var(--dead)" stroke-width="1.5"/>
    <text x="60" y="49" font-size="11" fill="var(--dead)" text-anchor="middle" font-family="var(--mono)">$1.84M — ???</text>
    <text x="145" y="49" font-size="16" fill="var(--ink)">→</text>
    <rect x="175" y="30" width="145" height="30" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="247" y="49" font-size="11" fill="var(--accent)" text-anchor="middle" font-family="var(--mono)">on the docket</text>
  </svg>`;
}
function voteSVG() {
  return `<svg viewBox="0 0 320 70" width="100%" style="max-width:360px" role="img" aria-label="a yes or no question">
    <rect x="0" y="15" width="150" height="40" fill="var(--ink)"/>
    <text x="75" y="41" font-size="16" fill="var(--paper)" text-anchor="middle" font-family="var(--mono)" font-weight="600">YES</text>
    <rect x="170" y="15" width="150" height="40" fill="none" stroke="var(--ink)" stroke-width="1.5"/>
    <text x="245" y="41" font-size="16" fill="var(--ink)" text-anchor="middle" font-family="var(--mono)" font-weight="600">NO</text>
  </svg>`;
}
function progressSVG() {
  return `<svg viewBox="0 0 320 60" width="100%" style="max-width:420px" role="img" aria-label="a count reaching a threshold">
    <rect x="0" y="20" width="320" height="14" rx="3" fill="var(--rule)"/>
    <rect x="0" y="20" width="232" height="14" rx="3" fill="var(--accent)"/>
    <text x="0" y="52" font-size="11" fill="var(--ink)" font-family="var(--mono)">290 of 400 neighbors</text>
    <text x="320" y="52" font-size="11" fill="var(--ink)" text-anchor="end" font-family="var(--mono)">then hand-delivered</text>
  </svg>`;
}
function loopSVG() {
  const steps = ['Raised', 'Delivered', 'Answered', 'Acted'];
  return `<svg viewBox="0 0 340 60" width="100%" style="max-width:440px" role="img" aria-label="the accountability loop">
    ${steps.map((s, i) => `<circle cx="${25 + i * 100}" cy="25" r="8" fill="${i === 3 ? 'var(--sourced)' : 'var(--accent)'}"/>
    <text x="${25 + i * 100}" y="52" font-size="11" fill="var(--ink)" text-anchor="middle" font-family="var(--mono)">${s}</text>
    ${i < 3 ? `<line x1="${35 + i * 100}" y1="25" x2="${115 + i * 100}" y2="25" stroke="var(--rule)" stroke-width="2"/>` : ''}`).join('')}
  </svg>`;
}
function levelsSVG() {
  const lv = ['Your city', 'Your county', 'Your state', 'The nation'];
  return `<svg viewBox="0 0 320 130" width="100%" style="max-width:360px" role="img" aria-label="every level of government">
    ${lv.map((s, i) => `<rect x="${i * 8}" y="${8 + i * 30}" width="${300 - i * 16}" height="22" fill="none" stroke="var(--ink)" stroke-width="1.5"/>
    <text x="${i * 8 + 10}" y="${23 + i * 30}" font-size="12" fill="var(--ink)" font-family="var(--sans)">${s}</text>`).join('')}
  </svg>`;
}

// The tour as an embeddable block (slides + nav + its own styles) — used on its
// own /tour page AND dropped in below the hero on every county's home page.
function tourBlock(county) {
  const T = 7;
  const slides = [
    slide(1, T, 'welcome',
      'See where the money goes. Then have your say.',
      `This is <b>${esc(county.platform_name)}</b> — a free, independent way to follow every public dollar in ${esc(county.name)}, and to push, together, for what your community actually needs. In two minutes, here's what it lets you do. <b>Not a government website.</b>`,
      levelsSVG()),
    slide(2, T, 'see it',
      'Follow every dollar to its source.',
      'The <b>money trail</b> lays out the whole budget, biggest pieces first. Click any number and you get the exact document it came from and the page — and the arithmetic is re-added in public, so it adds up to the dollar. No spin, just the receipt.',
      barsSVG(),
      `<p class="src" style="margin:12px 0 0">→ <a href="/budget">Open the money trail</a></p>`),
    slide(3, T, 'honest',
      'When the trail goes dark, it says so.',
      'Some money can’t be traced with the documents that exist yet — a lump line, a vendor no record names. Those aren’t hidden; each becomes a numbered item on the <b>docket</b>, an open ask for the missing record. A dead end means “not navigable yet,” never “hidden.”',
      deadEndSVG(),
      `<p class="src" style="margin:12px 0 0">→ <a href="/docket">See the docket</a></p>`),
    slide(4, T, 'say it',
      'Say what your community needs.',
      'Put a priority on the record — a skate park, a crosswalk, hiring local for a project, food as a utility, publishing the school budget — and say why. Or answer an open <b>yes/no question</b>. No account, one voice per sitting, and you choose how much about yourself to share.',
      voteSVG(),
      `<p class="src" style="margin:12px 0 0">→ <a href="/priorities">The priorities board</a> · <a href="/issues">open questions</a></p>`),
    slide(5, T, 'rally',
      'Rally your neighbors — and watch the count.',
      'Others back what they share, so the strongest-felt priorities rise on their own. A <b>live count</b> reaches for a threshold sized to your community, the way real petitions are. When enough neighbors back the same thing, it’s printed and hand-delivered to the people who decide.',
      progressSVG()),
    slide(6, T, 'hold them',
      'Hold them to it — in the open.',
      'Delivered isn’t the end. Every priority is tracked through <b>raised → delivered → answered → acted</b>, each step dated and cited to a real source. When an ask sits unanswered, the days are shown. The platform never invents an outcome — it records what officials actually did.',
      loopSVG(),
      `<p class="src" style="margin:12px 0 0">→ <a href="/outcomes">What came of it</a></p>`),
    slide(7, T, 'start',
      'It’s yours — at every level.',
      'City, county, state, nation — there’s a board for each, so you can push where the decision actually lives. It computes and cites; it never tells you what to want. That’s the whole idea: your money, made plain, and your voice, made impossible to miss. Start here.',
      levelsSVG(),
      `<p class="src" style="margin:12px 0 0">Or jump straight to <a href="/gate">any county or city</a>.</p>`)
  ].join('');

  return `
<style>
  .tour-slide{border-top:1px solid var(--rule);padding-top:22px;margin-top:22px}
  .tour-slide:first-child{border-top:none;margin-top:0;padding-top:0}
  .tour.js .tour-slide{display:none;border-top:none;margin-top:0;padding-top:0;min-height:340px}
  .tour.js .tour-slide.active{display:block;animation:tfade .25s ease}
  @keyframes tfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .tour-nav{display:none}
  .tour.js .tour-nav{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-top:24px;border-top:1px solid var(--rule);padding-top:14px}
  .tour-dots{display:flex;gap:7px}
  .tour-dot{width:9px;height:9px;border-radius:50%;border:1.5px solid var(--ink);background:var(--card);cursor:pointer;padding:0}
  .tour-dot.on{background:var(--ink)}
  .tour-btn{font-family:var(--mono);font-size:14px;padding:9px 16px;border:1.5px solid var(--ink);background:var(--ink);color:var(--paper);cursor:pointer}
  .tour-btn.ghost{background:var(--card);color:var(--ink)}
</style>
<div class="tour" data-tour-start="/budget">
  ${slides}
  <div class="tour-nav">
    <button type="button" class="tour-btn ghost" data-tour="back">← Back</button>
    <div class="tour-dots" aria-hidden="true"></div>
    <button type="button" class="tour-btn" data-tour="next" data-href="/budget" data-last="See the money trail →">Next →</button>
  </div>
</div>`;
}

// The standalone /tour page — a header + the same block, wrapped in the layout.
function tourPage(data) {
  const { county } = data;
  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.name)}, ${esc(county.state)} · a quick tour</div>
  <h1>What this site lets you do</h1>
  <div class="src">Two minutes, four moves: <b>see the money, say what you want, rally your neighbors, hold them to it.</b> Click through — or just scroll.</div>
</header>
${tourBlock(county)}`;
  return layout({
    title: `Take the tour — ${county.platform_name}`, current: '/tour', body, county,
    description: `A two-minute walkthrough of ${county.platform_name}: see where every public dollar goes, say what your community needs, rally your neighbors, and hold officials to it.`
  });
}

module.exports = { tourPage, tourBlock };
