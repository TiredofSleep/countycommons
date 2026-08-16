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

function registry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
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
// on-demand TLS so the box can't be tricked into minting certs for arbitrary
// names. Known tenant subdomains, the apex, and www all qualify.
function isKnownHost(rawHost) {
  const reg = registry();
  const host = hostOnly(rawHost);
  if (host === reg.baseDomain || host === 'www.' + reg.baseDomain) return true;
  return Object.values(reg.tenants).some(t => t.host === host);
}

function tenantName(key) {
  const reg = registry();
  return (reg.tenants[key] || {}).name || null;
}

module.exports = { resolveHost, isKnownHost, tenantName, registry };
