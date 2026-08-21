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
    default: "See where the money goes. Say what your town needs. Bring your neighbors." },
  { key: 'home.subhead', label: 'Sub-headline',
    default: "It's your money and your town. Look at every dollar — and where it came from. Say what your street or your county needs. Get your neighbors behind it, and we hand it to the people who decide, then show you what they did. Free. No account. Plain words." },
  { key: 'home.strip', label: 'Verb strip',
    default: 'SEE IT · SAY IT · RALLY YOUR NEIGHBORS · HOLD THEM TO IT' }
];

// Available placeholders, shown to the host in the editor.
const PLACEHOLDERS = ['{total}', '{county}', '{state}', '{platform}', '{docs}'];

module.exports = { COPY_SLOTS, PLACEHOLDERS };
