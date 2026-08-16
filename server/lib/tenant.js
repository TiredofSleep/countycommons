// The generalization seam, made physical (CLAUDE.md rule 7).
//
// One process serves every county. Which county a request gets is decided by
// the Host header: clarkar.countycommons.us → Clark. The bare domain and www
// redirect to the default county's subdomain (today, Clark — our flagship).
// A subdomain we don't recognize gets an honest "not live yet" page.
//
// Onboarding county #2 is meant to be config-only: add a block to
// config/tenants.json (its sub, host, corpusDir, configPath), drop its
// corpus JSON in a data dir, and its subdomain starts serving — no code
// change, no redeploy of logic. DNS is a wildcard; TLS is on-demand and
// gated by /tls-check below, which reads this same registry.

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', '..', 'config', 'tenants.json');
// Owner-created counties live here (gitignored) so they never fight a deploy.
const LOCAL_PATH = path.join(__dirname, '..', '..', 'config', 'tenants.local.json');

function registry() {
  const base = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  try {
    const local = JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8'));
    base.tenants = Object.assign({}, base.tenants, local.tenants || {});
  } catch (e) { /* no owner-added counties yet */ }
  return base;
}

// Append/replace an owner-created county in the gitignored local registry.
function addLocalTenant(key, entry) {
  let local = { tenants: {} };
  try { local = JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8')); } catch (e) { /* first one */ }
  local.tenants = local.tenants || {};
  local.tenants[key] = entry;
  const tmp = LOCAL_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(local, null, 2));
  fs.renameSync(tmp, LOCAL_PATH);
}

// Bare host (no port), lowercased.
function hostOnly(rawHost) {
  return String(rawHost || '').toLowerCase().split(':')[0].replace(/\.$/, '');
}

// → { action: 'serve', key } | { action: 'redirect', to } | { action: 'unknown', sub }
function resolveHost(rawHost) {
  const reg = registry();
  const base = reg.baseDomain;
  const host = hostOnly(rawHost);

  // Local dev, direct IP, or empty host → serve the default county.
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { action: 'serve', key: reg.default };
  }
  // Bare apex and www → send them to the flagship county's subdomain.
  if (host === base || host === 'www.' + base) {
    return { action: 'redirect', to: reg.tenants[reg.default].host };
  }
  // A subdomain of the base: match it to a tenant, or say "not live yet."
  if (host.endsWith('.' + base)) {
    const sub = host.slice(0, host.length - (base.length + 1));
    const key = Object.keys(reg.tenants).find(k => reg.tenants[k].sub === sub);
    if (key) return { action: 'serve', key };
    return { action: 'unknown', sub };
  }
  // Any other hostname (a future custom domain not yet mapped) → default.
  return { action: 'serve', key: reg.default };
}

// Is this host one we should get a TLS certificate for? Gates Caddy's
// on-demand TLS so the box can't be tricked into minting certs for names
// outside our namespace. Any host under the base domain qualifies — the apex,
// www, live county subdomains, AND not-yet-live ones (so their honest
// "coming soon" page can be served over HTTPS). Hosts outside the namespace
// (someone pointing their own domain at our IP) are refused.
function isKnownHost(rawHost) {
  const base = registry().baseDomain;
  const host = hostOnly(rawHost);
  return host === base || host === 'www.' + base || host.endsWith('.' + base);
}

function tenantName(key) {
  const reg = registry();
  return (reg.tenants[key] || {}).name || null;
}

module.exports = { resolveHost, isKnownHost, tenantName, registry, addLocalTenant };
