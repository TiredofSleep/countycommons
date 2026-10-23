// Junk filter for resident posts: automated scanners fill forms with "1",
// stray quotes and database-injection strings (Oct 2026: 64 such "priorities"
// and 170 registrations). A real post has words. This refuses junk at the door
// and hides any that got in before — it never judges what a real post says;
// the charter's bright-line screen (submissions.screen) does that.

const PROBE = /\b(select|union|sleep|waitfor|cast|benchmark|extractvalue|updatexml|dbms_\w+|xp_cmdshell|pg_sleep)\s*\(|\b(and|or)\s+\(?\d+\s*=\s*\d+|<\s*script|\$\{|\{\{|\/etc\/passwd|\.\.\/\.\.|'\s*--|--\s*-?\s*$|%2[27]|0x[0-9a-f]{6,}/i;

const words = (s) => (String(s || '').match(/[A-Za-z]{2,}/g) || []).length;

// True when text looks like a scanner, not a person.
function isProbe(s) { return PROBE.test(String(s || '')); }

// A petition needs a real ask and a real reason.
function petitionProblem(title, why) {
  if (isProbe(title) || isProbe(why)) return 'junk';
  if (words(title) < 3 || String(title).trim().length < 12) return 'title-too-short';
  if (words(why) < 5 || String(why).trim().length < 25) return 'why-too-short';
  return null;
}

// A signer's name and town: letters, spaces and ordinary punctuation only.
function plainName(s) { s = String(s || '').trim(); return /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .,'’-]{1,59}$/.test(s) && !isProbe(s); }

// Old posts from before this filter: shown only if they'd pass it today.
function looksReal(p) { return !!p && !petitionProblem(p.title, p.why); }

module.exports = { isProbe, petitionProblem, plainName, looksReal };
