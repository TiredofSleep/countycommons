const fs = require('fs');
const path = require('path');
const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// Kindred work: others building the HOW of self-government. Platform doctrine —
// identical on every county — so it reads from one git-tracked file, not the
// per-county corpus. The hard rule, stated on the page and enforced in the
// data: we link by METHOD, never by CAUSE. Nothing here that pushes a policy
// position or carries a party. A link is a pointer to a tool, not a side taken.

let DATA = { groups: [] };
try {
  DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'kindred.json'), 'utf8'));
} catch (e) { /* renders an honest empty state rather than crashing */ }

function kindredPage(data) {
  const { county } = data;

  const groups = (DATA.groups || []).map(g => `
<section style="margin:20px 0">
  <h2>${esc(g.category)}</h2>
  ${g.blurb ? `<p class="src">${esc(g.blurb)}</p>` : ''}
  ${(g.orgs || []).map(o => `
  <div class="issue" style="display:block">
    <b>${o.url ? `<a href="${esc(o.url)}" rel="noopener">${esc(o.name)}</a>` : esc(o.name)}</b>
    ${o.scope ? `<span class="chip c-part" style="margin-left:8px">${esc(o.scope)}</span>` : ''}
    <p style="font-size:14px;margin:6px 0 2px">${esc(o.what)}</p>
    ${o.url ? `<p class="src" style="margin:0">${esc(o.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</p>` : ''}
  </div>`).join('')}
</section>`).join('');

  const body = `
<header class="page">
  <div class="eyebrow">${esc(county.platform_name)} · kindred work</div>
  <h1>${esc(DATA.title || 'Others building the how of self-government')}</h1>
  <div class="src">${esc(DATA.intro || '')}</div>
</header>

<div class="issue" style="display:block;border-left:3px solid var(--accent)">
  <div class="eyebrow" style="color:var(--accent)">how to read this list</div>
  <p class="src" style="margin:4px 0 0">${esc(DATA.neutrality_note || 'We link by method, not by cause. Every group here helps people learn how self-government works — how to read a law, get a record, deliberate, or put a question on a ballot. None of them are here for the side they take, and a link is not an endorsement of any position they hold. If you find one has drifted into pushing a policy or a party, tell us and we will take it down — that is the line.')}</p>
</div>

${groups || '<p class="src">This list is being verified. A link goes up only after we confirm the group is real, active, and nonpartisan.</p>'}

<section>
<h2>Know one we should add?</h2>
<p class="src">${esc(DATA.closing || 'If you know a nonpartisan group that teaches people how to change the law — the method, not the cause — send it in.')} <a href="/participate">Get involved</a> · <a href="/feedback">suggest a link</a>. And the standard we hold ourselves to is the same one we hold them to: <a href="/never">what we will never do</a>.</p>
</section>`;

  return layout({
    title: `Kindred work — ${county.platform_name}`, current: '/kindred', body, county,
    description: 'Nonpartisan organizations that teach people how to change the law — track legislation, get public records, deliberate, and run ballot measures. Linked by method, never by cause.'
  });
}

module.exports = { kindredPage };
