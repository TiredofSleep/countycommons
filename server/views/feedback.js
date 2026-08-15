const { esc } = require('../lib/corpus');
const { layout } = require('./layout');

// The support drop-box. Notes land as private files on our own server and a
// human reads them — no third-party form service, nothing published, nothing
// used for anything except fixing the problem.

const field = `font-family:var(--mono);font-size:14px;padding:8px 10px;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);width:100%;box-sizing:border-box`;

function feedbackPage(county, opts = {}) {
  const { sent, error, from } = opts;

  const body = sent ? `
<header class="page">
  <div class="eyebrow">${esc(county.platform_name)} · support</div>
  <h1>Got it — thank you</h1>
  <div class="src">Notes like yours are how this site gets better.</div>
</header>
<section>
<div class="stamp">Received ✓</div>
<p style="max-width:60ch">Your note landed in a private file on our server, and a human reads every one — usually within a day. If you left a way to reach you, we'll follow up when it's fixed.</p>
<p class="src"><a href="${esc(sent)}">Back to where you were</a> · <a href="/">home</a></p>
</section>` : `
<header class="page">
  <div class="eyebrow">${esc(county.platform_name)} · support</div>
  <h1>Hit a weird spot?</h1>
  <div class="src">Tell us what happened and we'll fix it. A screenshot helps a lot.</div>
</header>
<section>
<form method="POST" action="/feedback" enctype="multipart/form-data" style="max-width:560px;display:flex;flex-direction:column;gap:14px">
  ${error ? `<p class="src" style="color:var(--dead)"><b>${esc(error)}</b></p>` : ''}
  <label style="display:block">What happened?
    <textarea name="message" required maxlength="5000" rows="6" style="${field};margin-top:6px;font-family:inherit;font-size:15px" placeholder="What were you trying to do, and what did you see instead?"></textarea>
  </label>
  <label style="display:block">Which page? <span class="src">(prefilled if we could tell)</span>
    <input name="page" value="${esc(from || '')}" maxlength="300" style="${field};margin-top:6px">
  </label>
  <label style="display:block">Screenshot <span class="src">(optional, up to 8 MB)</span>
    <input type="file" name="screenshot" accept="image/png,image/jpeg,image/webp,image/gif" style="${field};margin-top:6px;padding:7px">
  </label>
  <label style="display:block">How to reach you <span class="src">(optional — only if you want a reply)</span>
    <input name="contact" maxlength="200" placeholder="email or phone" style="${field};margin-top:6px">
  </label>
  <input type="text" name="website" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:1px;width:1px;overflow:hidden">
  <button type="submit" style="font-family:var(--mono);font-size:14px;padding:10px 18px;background:var(--ink);color:var(--paper);border:1.5px solid var(--ink);cursor:pointer;align-self:flex-start">Send it</button>
</form>
</section>
<section>
<h2>Where this goes <span class="sub">— private, plain, and that's it</span></h2>
<p class="src" style="max-width:60ch">Your note is saved as a private file on our own server and read by a human. It is never published, never sent to any third party, and never used for anything except fixing the problem. If you'd rather email: ${county.contact_email ? `<a href="mailto:${esc(county.contact_email)}">${esc(county.contact_email)}</a>` : 'see the footer'}.</p>
</section>`;

  return layout({
    title: `Report a problem — ${county.platform_name}`,
    current: '/feedback', body, county,
    description: 'Hit a weird spot on the site? Tell us what happened — a human reads every note.'
  });
}

module.exports = { feedbackPage };
