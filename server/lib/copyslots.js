// The overridable copy slots — the county-facing text a local host may reword.
// Views render each with copyText(data, key); the admin edits them into the
// per-county overlay. Defaults use {placeholders} that stay live after a host
// edits, so they can keep the dynamic dollar total in their own words.
//
// Only these slots are editable. The bones — the "not a government website"
// disclaimer, the republic-alongside frame, the methodology, every number's
// citation — are NOT copy slots and cannot be reworded away.

const COPY_SLOTS = [
  { key: 'home.eyebrow', label: 'Top line (eyebrow)',
    default: '{platform} · countycommons.us · {county}, {state}' },
  { key: 'home.headline', label: 'Headline',
    default: "A home for community collaboration, expression, and funding — the checkable middle layer government sites don't build." },
  { key: 'home.subhead', label: 'Sub-headline',
    default: "Power in verified local numbers. It's your money — {total} a year. See it to the receipt. Weigh in on it. Turn what this county wants into a number nobody can wave off." },
  { key: 'home.strip', label: 'Three-verb strip',
    default: 'SEE THE MONEY · ASK THE QUESTION · CHECK THE COUNT' }
];

// Available placeholders, shown to the host in the editor.
const PLACEHOLDERS = ['{total}', '{county}', '{state}', '{platform}', '{docs}'];

module.exports = { COPY_SLOTS, PLACEHOLDERS };
