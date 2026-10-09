// Who the light reaches (NEVER.md, "The civic work", October 2026 amendment).
//
// People who hold or seek elected office may be named, their conduct raised,
// and their required money filings published. Non-elected government staff are
// never named or singled out. Private residents stay dark everywhere. This file
// sorts a county's roster into those two groups so every screen (priorities,
// solutions, resident and host questions) applies the same rule.

// Appointed offices, by title, when the config doesn't say. A config entry can
// always set "elected": true/false to override (e.g. an elected city attorney).
const APPOINTED = /\b(manager|administrator|fire chief|police chief|auditor|director)\b/i;

function isElected(o) {
  if (o && typeof o.elected === 'boolean') return o.elected;
  return !APPOINTED.test((o && o.office) || '');
}

// Candidates in races that haven't happened yet. A race's "election" is an id
// like "2026-general"; its date comes from the race itself when set.
function liveCandidates(county, today) {
  today = today || new Date().toISOString().slice(0, 10);
  const out = [];
  for (const r of (county && county.races) || []) {
    if (r.date && r.date < today) continue;
    for (const c of r.candidates || []) if (c.name) out.push(c.name);
  }
  return out;
}

function roster(county) {
  const elected = [], appointed = [];
  for (const o of (county && county.officials) || []) {
    if (!o.name) continue;
    (isElected(o) ? elected : appointed).push(o.name);
  }
  for (const j of (((county && county.quorum_court) || {}).justices) || []) if (j.name) elected.push(j.name);
  const candidates = liveCandidates(county);
  return { elected: elected.concat(candidates), appointed, candidates };
}

// Full-name match (two words or more) keeps false positives low: common
// surnames used as words (Angle, King) don't fire. Nicknames in quotes
// ("BJ") and periods are dropped before matching.
function norm(s) {
  return ' ' + String(s || '').toLowerCase().replace(/["'“”‘’.]/g, '').replace(/\s+/g, ' ').trim() + ' ';
}
function named(text, names) {
  const t = norm(text);
  return names.filter(full => {
    const n = norm(full).trim();
    if (n.split(' ').length < 2) return false;
    if (t.includes(' ' + n + ' ')) return true;
    // "Garry BJ Johns" → also match "Garry Johns".
    const parts = n.split(' ');
    return parts.length > 2 && t.includes(' ' + parts[0] + ' ' + parts[parts.length - 1] + ' ');
  });
}

// Elected offices named by title rather than by person ("the county judge
// should…"). A conduct post aimed at an office like this is aimed at an
// elected person, so it's allowed.
const ELECTED_TITLE = /\b(county judge|judge|justices? of the peace|jps?|quorum court|sheriff|mayor|vice mayor|commissioners?|commission|council(?:member|man|woman)?|alderm[ae]n|board of directors|school board|county clerk|circuit clerk|assessor|treasurer|collector|coroner|constable|district attorney|prosecut(?:or|ing attorney)|state senator|state representative|governor|legislat(?:or|ure))\b/i;

module.exports = { isElected, roster, named, liveCandidates, ELECTED_TITLE };
