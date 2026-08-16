// The per-county writable overlay (COUNTY-CODE.md "the overlay").
//
// A county host's edits live here — data/tenants/<tenant>/overlay.json,
// gitignored, on the box — laid on top of the git-seeded corpus at render
// time. Edits never fight a deploy, and they can never reach the bones: this
// module only merges the whitelisted, editable sections below. Anything not in
// APPLY is not overlay-editable, by construction.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// Tenant keys are validated against this before ever touching a path, so no
// request can escape its own county's directory.
const KEY_RE = /^[a-z0-9-]{1,40}$/;

function dir(tenant) {
  if (!KEY_RE.test(String(tenant || ''))) return null;
  return path.join(ROOT, 'data', 'tenants', tenant);
}
function file(tenant) {
  const d = dir(tenant);
  return d ? path.join(d, 'overlay.json') : null;
}

function read(tenant) {
  const f = file(tenant);
  if (!f) return {};
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { return {}; }
}

function write(tenant, obj) {
  const d = dir(tenant), f = file(tenant);
  if (!f) throw new Error('bad tenant');
  fs.mkdirSync(d, { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, f);
  return obj;
}

// Edit one top-level overlay section and persist. Returns the new overlay.
function setSection(tenant, section, value) {
  const o = read(tenant);
  o[section] = value;
  return write(tenant, o);
}

// Lay the overlay over a loaded corpus bundle. ONLY these sections are
// overlay-editable; the bones (budget, verification, documents, vendors,
// audits, chain, votes…) are never merged from here.
function apply(data, tenant) {
  const o = read(tenant);
  // Granular overrides so the git-seeded base still updates for anything the
  // host hasn't touched. Add new editable surfaces here, whitelisted.
  if (o.calendar_intro && data.calendar) data.calendar.intro = o.calendar_intro;
  if (o.calendar_community && data.calendar) {
    data.calendar.community = data.calendar.community || {};
    data.calendar.community.listings = o.calendar_community;
  }
  // Host-created questions, appended to any git-seeded drafts. They flow
  // through the SAME one-vote gate, tally, and charter screen as every other
  // question — the frame (advisory signal to the elected body) is a bone.
  if (Array.isArray(o.questions) && o.questions.length) {
    data.issueDrafts = data.issueDrafts || { drafts: [] };
    data.issueDrafts.drafts = (data.issueDrafts.drafts || []).concat(o.questions);
  }
  // Host-added Help Finder listings, appended as an extra category.
  if (Array.isArray(o.help_local) && o.help_local.length && data.help) {
    data.help = JSON.parse(JSON.stringify(data.help));
    data.help.categories = (data.help.categories || []).concat([{
      id: 'local-added', title: 'Added by your county host',
      resources: o.help_local
    }]);
  }
  // Free-text copy overrides, looked up by views as data.copy['home.hero'] etc.
  data.copy = o.copy || {};
  return data;
}

module.exports = { read, write, setSection, apply, dir };
