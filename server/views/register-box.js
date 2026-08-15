const { esc } = require('../lib/corpus');

// The registration form, shared by the homepage box and every question page.
// Every field optional — as much or as little as they like. The disclosure
// below the fields is the whole deal, stated in full at the point of entry:
// private file, separate from votes, never published; shown to a county or
// city official only if one asks to verify the count is real people; nothing
// else, ever. (server/identity.js holds the storage doctrine.)

const field = (name, label, ph, type) => `
<label style="display:block;font-size:13.5px">${esc(label)}
  <input type="${type || 'text'}" name="${name}" maxlength="120" placeholder="${esc(ph)}"
    style="font-family:var(--mono);font-size:14px;padding:7px 9px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);width:100%;box-sizing:border-box;margin-top:4px">
</label>`;

function registrationForm({ county, action, registeredFields = [], justRegistered = false, voteHref = null }) {
  const onFile = registeredFields.length
    ? `<p class="src" style="margin:8px 0 0">On file with your answers (never published): <b>${registeredFields.map(esc).join(', ')}</b>. Fill a field to update it, or email us to remove everything.</p>`
    : '';
  // Once they're on the record, the funnel's next door is the ballot: the
  // primary button becomes the vote, and updating the file steps aside.
  const buttons = (registeredFields.length && voteHref)
    ? `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
  <a href="${esc(voteHref)}" style="font-family:var(--mono);font-size:14px;font-weight:600;padding:10px 20px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);text-decoration:none">Let me VOTE →</a>
  <button type="submit" style="font-family:var(--mono);font-size:12.5px;padding:8px 12px;background:var(--card);color:var(--ink);border:1.5px solid var(--ink);cursor:pointer">Update my file</button>
</div>`
    : `<button type="submit" style="font-family:var(--mono);font-size:14px;padding:10px 18px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer;align-self:flex-start">Put me on the record</button>`;
  return `
${justRegistered ? `<p class="src" style="color:var(--sourced)"><b>You're on the record ✓</b> — saved privately, exactly as described below.</p>` : ''}
<form method="POST" action="${esc(action)}" style="display:flex;flex-direction:column;gap:10px;max-width:480px;margin-top:10px">
  ${field('name', 'Name', "as you'd sign a petition")}
  ${field('email', 'Email', 'you@example.com', 'email')}
  ${field('phone', 'Phone', '870-555-0100', 'tel')}
  ${field('city', 'City or town', 'Arkadelphia, Gurdon, Caddo Valley…')}
  ${field('zip', 'ZIP', '71923')}
  ${buttons}
</form>
<p class="src" style="margin:12px 0 0;max-width:60ch"><b>The only use of this information, in full:</b> it stays in a private file on our server, separate from the votes, and is never published anywhere. If a county or city official asks to verify that a count is real people, registrant details can be shown to that official — that request-and-verify is the entire use. Never sold, never given to anyone else, never used for marketing. Remove yours any time: ${county.contact_email ? `<a href="mailto:${esc(county.contact_email)}">${esc(county.contact_email)}</a>` : 'see the footer'}.</p>
${onFile}`;
}

module.exports = { registrationForm };
