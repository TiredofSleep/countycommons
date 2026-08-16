// Access control: the PIN router and the signed access cookie.
//
// One PIN registry (config/pins.json, gitignored — PINs are secrets) maps
// each PIN to { tenant, role, name }. A 4-digit view PIN picks a county and
// grants read access; an 8-char admin code grants edit access to exactly one
// county. Enter a PIN at any front door → it takes you to that county.
//
// The browser never carries the PIN after login — it carries a signed cookie
// encoding { tenant, role }, recomputed and verified on every request so it
// can't be forged. Admin attempts are rate-limited with a hard lockout.
//
// Backward compatible: if config/pins.json is absent but config/site-password
// exists, that password is treated as the default county's view PIN, so the
// existing 1525 gate keeps working during migration.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PINS_PATH = path.join(__dirname, '..', '..', 'config', 'pins.json');
const LEGACY_PW = path.join(__dirname, '..', '..', 'config', 'site-password');
const TENANTS_PATH = path.join(__dirname, '..', '..', 'config', 'tenants.json');

function defaultTenant() {
  try { return JSON.parse(fs.readFileSync(TENANTS_PATH, 'utf8')).default; }
  catch (e) { return 'clarkar'; }
}

// { secret, pins: { "<pin>": {tenant, role, name} } }. Cached by mtime so a
// PIN change on the box is picked up without a restart.
let _cache = null, _mtime = 0;
function registry() {
  try {
    const st = fs.statSync(PINS_PATH);
    if (!_cache || st.mtimeMs !== _mtime) {
      _cache = JSON.parse(fs.readFileSync(PINS_PATH, 'utf8'));
      _mtime = st.mtimeMs;
    }
    return _cache;
  } catch (e) {
    // Legacy fallback: single view PIN from site-password.
    try {
      const pw = fs.readFileSync(LEGACY_PW, 'utf8').trim();
      if (pw) return { secret: 'legacy:' + pw, pins: { [pw]: { tenant: defaultTenant(), role: 'view' } } };
    } catch (e2) { /* no gate configured */ }
    return null;
  }
}

function gateConfigured() { return registry() !== null; }

function secret() {
  const r = registry();
  return (r && r.secret) || 'county-commons-unset-secret';
}

// Look up a PIN → { tenant, role, name } or null.
function lookupPin(pin) {
  const r = registry();
  if (!r) return null;
  const hit = r.pins[String(pin || '').trim()];
  return hit || null;
}

// The signed access token for a (tenant, role, name). Deterministic; verified
// by recomputation. Not reversible to the PIN. The name (non-secret; it gets
// published on the host's own edits) rides along so admin actions can be
// stamped by name — the cookie is signed, so it can't be forged.
const b64 = s => Buffer.from(String(s || ''), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => { try { return Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); } catch (e) { return ''; } };
function token(tenant, role, name) {
  return crypto.createHash('sha256').update(`${secret()}|${tenant}|${role}|${name || ''}`).digest('hex').slice(0, 40);
}
function cookieValue(tenant, role, name) {
  return `${tenant}.${role}.${b64(name)}.${token(tenant, role, name)}`;
}

// Parse + verify the cookie → { tenant, role, name } or null.
function verifyCookie(val) {
  const parts = String(val || '').split('.');
  if (parts.length !== 4) return null;
  const [tenant, role, nameB64, sig] = parts;
  if (role !== 'view' && role !== 'admin') return null;
  const name = unb64(nameB64);
  const expect = token(tenant, role, name);
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { tenant, role, name };
}

// --- admin lockout: per-IP, hard stop after too many failures ---
const fails = new Map(); // ip -> { count, until }
const MAX_FAILS = 6, LOCK_MS = 60 * 60 * 1000;
function lockState(ip) {
  const rec = fails.get(ip);
  if (rec && rec.until > Date.now()) return { locked: true, until: rec.until };
  return { locked: false };
}
function noteFailure(ip) {
  const now = Date.now();
  let rec = fails.get(ip);
  // Reset only after a prior lockout has expired — not on every failure
  // (until:0 means "no lock yet", which must NOT reset the running count).
  if (!rec || (rec.until && rec.until < now)) rec = { count: 0, until: 0 };
  rec.count++;
  if (rec.count >= MAX_FAILS) rec.until = now + LOCK_MS;
  fails.set(ip, rec);
}
function noteSuccess(ip) { fails.delete(ip); }

module.exports = {
  gateConfigured, lookupPin, cookieValue, verifyCookie,
  lockState, noteFailure, noteSuccess, defaultTenant
};
