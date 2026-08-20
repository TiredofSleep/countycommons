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
    default: "Rally your community to shape what government does — from the town budget to state and national law." },
  { key: 'home.subhead', label: 'Sub-headline',
    default: "An open, standing petition with receipts. See where the money really goes, say what should change — in {county}, in your state, or in Congress — rally your neighbors behind it, and we carry it to the people who decide and track what they do. Free, nonpartisan, and checkable to the last number." },
  { key: 'home.strip', label: 'Verb strip',
    default: 'SEE IT · SAY IT · RALLY YOUR NEIGHBORS · HOLD THEM TO IT' }
];

// Available placeholders, shown to the host in the editor.
const PLACEHOLDERS = ['{total}', '{county}', '{state}', '{platform}', '{docs}'];

module.exports = { COPY_SLOTS, PLACEHOLDERS };
