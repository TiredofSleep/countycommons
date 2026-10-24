const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The drop-box: corrections, additions, documents, and problems. Notes land as
// private files on our own server and a human reads every one — no third-party
// form service, nothing published. What IS public is the fix: when a note leads
// to a change, it's logged on /building (what changed, where — never who, unless
// they asked to be credited).

const field = `font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);width:100%;box-sizing:border-box`;

const KINDS = {
  correction: { label: 'Correct something', h1: 'Correct something', ask: 'What’s wrong, and what should it say?', ph: 'The number, name, date or sentence that’s wrong — and what’s right, if you know.' },
  add: { label: 'Add information', h1: 'Add information', ask: 'What’s missing?', ph: 'A record, a meeting, an office, a program, a number — anything this county’s page should have.' },
  request: { label: 'Request more for this county', h1: 'Request more for this county', ask: 'What would you like built here?', ph: 'The budget line by line, the audits, meeting minutes, the jail numbers, the school budget, a record you can’t find — anything.' },
  document: { label: 'Send a document', h1: 'Send a document', ask: 'What is it, and where did it come from?', ph: 'A budget, audit, contract, minutes, a records-request reply… Attach it below or paste a link.' },
  problem: { label: 'Something’s broken', h1: 'Hit a weird spot?', ask: 'What happened?', ph: 'What were you trying to do, and what did you see instead?' }
};

function feedbackPage(county, opts = {}) {
  const { sent, error, from } = opts;
  const kind = KINDS[opts.kind] ? opts.kind : 'correction';
  const K = KINDS[kind];
  const body = sent ? `
<header class="page">
  <div class="eyebrow">${esc(county.platform_name)} · help keep this honest</div>
  <h1>Got it — thank you</h1>
  <div class="src">Notes like yours are how this site stays honest.</div>
</header>
<section>
<div class="stamp">Received ✓</div>
<p style="max-width:60ch">Your note landed in a private file on our server, and a person reads every one. When it leads to a fix, the change is logged on <a href="/building">what’s new</a> — what changed and where, never who sent it unless you asked to be credited. If you left a way to reach you, we’ll follow up.</p>
<p class="src"><a href="${esc(sent)}">Back to where you were</a> · <a href="/building">What’s new</a> · <a href="/">home</a></p>
</section>` : `
<header class="page">
  <div class="eyebrow">${esc(county.platform_name)} · help keep this honest</div>
  <h1>${esc(K.h1)}</h1>
  <div class="src">${esc(county.name)}’s pages are built from public records by a small team, and they’re still being built. If something’s wrong, out of date or missing, you’re the best fact-checker we have. A person reads every note.</div>
</header>
<section>
<form method="POST" action="/feedback" enctype="multipart/form-data" style="max-width:600px;display:flex;flex-direction:column;gap:14px">
  ${error ? `<p class="src" style="color:var(--dead)"><b>${esc(error)}</b></p>` : ''}
  <fieldset style="border:0;padding:0;margin:0;display:flex;gap:8px;flex-wrap:wrap">
    <legend class="src" style="margin-bottom:6px">What kind of note?</legend>
    ${Object.entries(KINDS).map(([k, v]) => `<label style="font-size:14px;border:1.5px solid var(--ink);padding:6px 10px;cursor:pointer"><input type="radio" name="kind" value="${k}"${k === kind ? ' checked' : ''}> ${esc(v.label)}</label>`).join('')}
  </fieldset>
  <label style="display:block">${esc(K.ask)}
    <textarea name="message" required maxlength="5000" rows="6" style="${field};margin-top:6px;font-family:inherit;font-size:15px" placeholder="${esc(K.ph)}"></textarea>
  </label>
  <label style="display:block">Where did you see it, or where can we check? <span class="src">(a link, a document name, or “I was at the meeting”)</span>
    <input name="source" maxlength="500" style="${field};margin-top:6px">
  </label>
  <label style="display:block">Which page? <span class="src">(prefilled if we could tell)</span>
    <input name="page" value="${esc(from || '')}" maxlength="300" style="${field};margin-top:6px">
  </label>
  <label style="display:block">Attach a file <span class="src">(optional — a screenshot or a PDF, up to 8 MB)</span>
    <input type="file" name="screenshot" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" style="${field};margin-top:6px;padding:7px">
  </label>
  <label style="display:block">How to reach you <span class="src">(optional — only if you want a reply)</span>
    <input name="contact" maxlength="200" placeholder="email or phone" style="${field};margin-top:6px">
  </label>
  <label style="display:flex;gap:8px;align-items:flex-start;font-size:14px"><input type="checkbox" name="credit" value="1" style="margin-top:3px"> <span>If this leads to a fix, you may credit me by name on the public log. <span class="src">(Leave it unchecked to stay anonymous — the default.)</span></span></label>
  <label style="display:block" class="src">Name for the credit <span class="src">(only used if you checked the box)</span>
    <input name="credit_name" maxlength="80" style="${field};margin-top:6px">
  </label>
  <input type="text" name="website" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:1px;width:1px;overflow:hidden">
  <button type="submit" style="font-family:var(--mono);font-size:15px;padding:11px 20px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer;align-self:flex-start">Send it</button>
</form>
</section>
<section>
<h2>Where this goes <span class="sub">— private, plain, and that's it</span></h2>
<p class="src" style="max-width:62ch">Your note and any file are saved privately on our own server and read by a person. They are never published, never sent to any third party, and used only to check and fix this site. Corrections are checked against the record before anything changes — a note is a lead, not an edit. What’s public is the fix, logged on <a href="/building">what’s new</a>. ${county.contact_email ? `Rather email? <a href="mailto:${esc(county.contact_email)}">${esc(county.contact_email)}</a>.` : ''}</p>
</section>`;
  return layout({
    title: `${K.h1} — ${county.platform_name}`,
    current: '/feedback', body, county,
    description: `Correct something, add missing information, or send a document for ${county.name}'s pages. A person reads every note, and fixes are logged in public.`
  });
}

module.exports = { feedbackPage, KINDS };
