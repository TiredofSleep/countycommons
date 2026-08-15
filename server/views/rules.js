const { esc } = require('../lib/corpus');

// The rules of engagement, in one popup — every promise the counting room
// makes, in plain words, one click from the ballot. Served as a <dialog>:
// with JS it opens as a true modal (public/app.js); without JS the same
// element opens via CSS :target, so the rules are never behind a script.

function rulesButton(label) {
  return `<a href="#rules" data-dialog="rules" class="chip c-ok" style="text-decoration:none;cursor:pointer">${esc(label || 'Rules of engagement')}</a>`;
}

function rulesDialog(county) {
  return `
<dialog id="rules" class="rules" aria-labelledby="rules-title">
  <div class="eyebrow">${esc(county.platform_name)} · the counting room</div>
  <h2 id="rules-title" style="margin-top:2px">Rules of engagement</h2>
  <ul style="padding-left:18px;display:flex;flex-direction:column;gap:7px;font-size:14px;margin:10px 0">
    <li><b>One voice per browser.</b> No account needed. You can change your answer any time until the question closes — your last answer is the one that counts.</li>
    <li><b>Everyone can answer.</b> The resident question is self-reported and always labeled that way. Verification tiers come later; every count will always show how verified it is.</li>
    <li><b>Counts stay behind a privacy floor.</b> Below 20 responses, exact numbers don't display — in a small town, small counts can identify people.</li>
    <li><b>Registration is optional</b> — as much or as little as you like. It has one use, stated in full where you enter it: kept private, never published, shown to a county or city official only to verify a count is real people, on request. Never sold, never anything else. Removable any time.</li>
    <li><b>Your record lives in this browser.</b> There are no accounts yet, so a different device or cleared cookies starts fresh.</li>
    <li><b>These counts are unofficial.</b> Not an election, not a referendum, not a petition. Their only weight is that the counting is published and checkable.</li>
    <li><b>At 100 responses, the result travels.</b> We print the packet and hand-deliver it to the body that decides, and stamp the delivery publicly.</li>
    <li><b>Bright lines.</b> No questions about candidates, active ballot measures, or the conduct of named individuals. The platform computes and cites; it never takes sides.</li>
    <li><b>Every count is checkable</b> — the tally is <a href="/verify">re-added in public</a> and the activity log is <a href="/security">hash-chained and anchored</a> where we can't rewrite it.</li>
  </ul>
  <form method="dialog" style="margin:0"><button data-close style="font-family:var(--mono);font-size:13px;padding:8px 16px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);cursor:pointer">Got it</button></form>
  <a href="#!" class="rules-close-fallback src" style="display:none">close</a>
</dialog>`;
}

module.exports = { rulesButton, rulesDialog };
