const { esc } = require('../lib/corpus');
const { layout } = require('./layout');
const { modRow } = require('./admin');
const { PROMOTE_AT } = require('../questions');

// The owner console — the top of the pyramid. Create a county, mint or rotate
// its PINs, see them all at a glance. Owner-only (requireOwner). Every action
// is logged to the public chain. This page shows live PINs, so it lives behind
// the strongest credential and is served to no one else.

function shell(title, body) {
  const county = { platform_name: 'County Commons', name: 'the network', state: '', sponsor_line: 'Owner console', contact_email: null };
  return layout({
    title: `${title} — County Commons owner`, current: '/owner', county,
    body: `<div class="crumb"><a href="/owner">Owner console</a></div>${body}`,
    description: 'County Commons owner console.'
  });
}

function pinRow(label, val, mono) {
  return `<div style="display:flex;gap:8px;align-items:baseline"><span class="src" style="min-width:96px">${esc(label)}</span><span class="code" style="border:1.5px solid var(--rule);background:var(--card);padding:5px 9px;font-size:13px;user-select:all${mono ? ';font-weight:600' : ''}">${esc(val)}</span></div>`;
}

function ownerScopeBadge(q) {
  if (q.scope === 'national') return '<span class="chip c-ok">National</span>';
  if (q.scope === 'state') return `<span class="chip c-part">State · ${esc(q.state || '')}</span>`;
  return `<span class="chip">Local · ${esc(q.tenant || '')}</span>`;
}

function ownerConsole(reg, pinsByTenant, residentQuestions, allPriorities, opts = {}) {
  residentQuestions = residentQuestions || [];
  allPriorities = allPriorities || [];
  const tenants = Object.entries(reg.tenants);
  const field = 'font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);width:100%;box-sizing:border-box';

  const created = opts.created ? `
<div class="issue" style="display:block;border-color:var(--sourced)">
  <b style="color:var(--sourced)">County created ✓ — ${esc(opts.created.name)}</b>
  <p style="margin:8px 0 0">Give these to the county's people. The resident PIN opens the public site; the host code opens its admin. Both are shown only here.</p>
  <div style="display:flex;flex-direction:column;gap:6px;margin:8px 0">
    ${pinRow('Resident PIN', opts.created.view, true)}
    ${pinRow('Host code', opts.created.admin, true)}
    ${pinRow('Address', 'https://' + opts.created.host, false)}
  </div>
  <p class="src"><b>One box step to finish:</b> add the host to Caddy so it gets a certificate, then reload:</p>
  <pre class="code" style="white-space:pre-wrap;border:1.5px solid var(--rule);background:var(--card);padding:8px 10px;font-size:12px">${esc(opts.created.host)} — add it to the site line in /etc/caddy/Caddyfile, then: systemctl reload caddy</pre>
</div>` : '';
  const minted = opts.minted ? `
<div class="issue" style="display:block;border-color:var(--sourced)">
  <b style="color:var(--sourced)">New PINs minted for ${esc(opts.minted.tenant)}</b>
  <div style="display:flex;flex-direction:column;gap:6px;margin:8px 0">
    ${pinRow('Resident PIN', opts.minted.view, true)}
    ${pinRow('Host code', opts.minted.admin, true)}
  </div>
  <p class="src">The old PINs for this county no longer work.</p>
</div>` : '';
  const err = opts.error ? `<p class="src" style="color:var(--dead)"><b>${esc(opts.error)}</b></p>` : '';

  const rows = tenants.map(([key, t]) => {
    const pins = pinsByTenant[key] || {};
    return `
<div class="issue" style="display:block">
  <b>${esc(t.name || key)}</b> <span class="src">· ${esc(t.host || '')} · key <code class="code">${esc(key)}</code></span>
  <div style="display:flex;flex-direction:column;gap:5px;margin:8px 0">
    ${pins.view ? pinRow('Resident PIN', pins.view.pin, true) : '<span class="src">no resident PIN yet</span>'}
    ${pins.admin ? pinRow('Host code', pins.admin.pin, true) : '<span class="src">no host code yet</span>'}
  </div>
  <form method="POST" action="/owner/pins/mint" style="display:inline"><input type="hidden" name="tenant" value="${esc(key)}"><input name="name" placeholder="host name" maxlength="80" style="${field};width:auto;display:inline-block;margin-right:6px"><button type="submit" style="font-family:var(--mono);font-size:12px;padding:6px 12px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);cursor:pointer">Rotate PINs</button></form>
</div>`;
  }).join('');

  const body = `
<header class="page">
  <div class="eyebrow">County Commons · owner console</div>
  <h1>The network</h1>
  <div class="src">Create a county, mint or rotate its PINs, hand its people the keys. Everything you do here is logged to the public activity chain. This is the only screen that shows live PINs.</div>
</header>
${created}${minted}${err}

<section>
<h2>Counties <span class="sub">— ${tenants.length}</span></h2>
${rows}
</section>

<section>
<h2>Resident questions across the network <span class="sub">— ${residentQuestions.length}</span></h2>
<p class="src" style="max-width:64ch">Every question residents proposed, at any level. Candidate, ballot-measure, and named-conduct questions are refused automatically before they reach here. County hosts moderate their own local ones; state and national questions are yours to open, close, or remove.</p>
${residentQuestions.length ? residentQuestions.map(q => modRow(q, '/owner/questions', PROMOTE_AT, ownerScopeBadge(q))).join('') : '<p class="src">No resident questions yet.</p>'}
</section>

<section>
<h2>Community priorities across the network <span class="sub">— ${allPriorities.length}</span></h2>
<p class="src" style="max-width:64ch">Every priority residents posted, any county. Candidate, ballot-measure, and named-official posts are refused automatically. Hosts moderate their own county; this is your backstop for all of them.</p>
${allPriorities.length ? allPriorities.map(p => `
<div class="issue" style="display:block">
  <b>${esc(p.title)}</b> <span class="chip ${p.kind === 'reconsider' ? 'c-amb' : 'c-ok'}">${p.kind === 'reconsider' ? 'fresh look' : 'prioritize'}</span> <span class="src">· ${esc(p.tenant)} · ${p.support} backing</span>
  <p class="src" style="margin:4px 0 6px">${esc(p.why)}</p>
  <form method="POST" action="/owner/priorities/remove" style="display:inline"><input type="hidden" name="id" value="${esc(p.id)}"><button type="submit" style="font-family:var(--mono);font-size:12px;padding:5px 10px;border:1.5px solid var(--dead);color:var(--dead);background:var(--card);cursor:pointer">Remove</button></form>
</div>`).join('') : '<p class="src">No community priorities yet.</p>'}
</section>

<section>
<h2>Create a county</h2>
<form method="POST" action="/owner/county/create" style="max-width:560px;display:flex;flex-direction:column;gap:10px">
  <label style="font-size:13.5px">County name<input name="name" required maxlength="80" placeholder="Garland County" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">State<input name="state" required maxlength="40" placeholder="Arkansas" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Key <span class="src">— short id, lowercase (used in file paths)</span><input name="key" required maxlength="40" placeholder="garlandar" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Subdomain <span class="src">— &lt;this&gt;.countycommons.us</span><input name="sub" maxlength="40" placeholder="garlandar" style="${field};margin-top:4px"></label>
  <label style="font-size:13.5px">Platform name <span class="src">(optional)</span><input name="platformName" maxlength="60" placeholder="Garland Commons" style="${field};margin-top:4px"></label>
  <button type="submit" style="font-family:var(--mono);font-size:13px;padding:9px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer;align-self:flex-start">Create county &amp; mint PINs</button>
</form>
<p class="src" style="margin-top:10px;max-width:64ch">A new county starts empty and honest — no budget ingested yet, its trail marked "not yet ingested." It's instantly navigable and its host can start adding questions, events, help, and copy right away. You ingest the real budget documents through the pipeline when they're in hand.</p>
</section>`;
  return shell('The network', body);
}

module.exports = { ownerConsole };
