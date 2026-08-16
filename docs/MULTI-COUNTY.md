# MULTI-COUNTY.md — one platform, many counties

County Commons runs as **one Node process** serving every county. Which
county a visitor gets is decided by the **Host header** (the subdomain):

- `clarkar.countycommons.us` → Clark County, Arkansas (the flagship)
- `countycommons.us` and `www.countycommons.us` → **301 redirect** to the
  flagship's subdomain (today, Clark)
- `<unknown>.countycommons.us` → an honest "this county isn't live yet" page

The seam is `config/tenants.json` + `server/lib/tenant.js`. The corpus loader
(`server/lib/corpus.js` → `load(tenantKey)`) reads that county's files. The
host-routing middleware in `server/app.js` sets `req.tenantKey`; every page
route passes it to `load()`.

## Onboarding county #2 (the whole checklist)

1. **Add a tenant block** to `config/tenants.json`:
   ```json
   "garlandar": {
     "sub": "garlandar",
     "host": "garlandar.countycommons.us",
     "name": "Garland County, Arkansas",
     "corpusDir": "data/corpus-garlandar",
     "configPath": "config/county-garlandar.json"
   }
   ```
2. **Create its config** `config/county-garlandar.json` (copy Clark's, change
   jurisdictions, officials, calendar, records portals, sponsor line).
3. **Create its corpus** `data/corpus-garlandar/` with the same file names
   Clark uses (`budget-*.json`, `docket.json`, `documents.json`, …). Drop
   source PDFs in an inbox and run the pipeline pointed at that dir.
4. **DNS**: nothing to do — a wildcard `*.countycommons.us` A record already
   points every subdomain at the box.
5. **Caddy**: add the new host to the one site line in `/etc/caddy/Caddyfile`
   (see below) and `systemctl reload caddy` — Caddy fetches its cert via
   HTTP-01 in seconds. One line, no DNS.
6. Deploy (git pull + restart). The subdomain starts serving.

No code change. No DNS edit. One Caddy line. That is the seam working.

> Note: on-demand TLS (which would drop even the Caddy line) was tried first
> but a wildcard **site block** made Caddy attempt a wildcard certificate,
> which needs a DNS-01 challenge we don't run — it jammed issuance for the
> real hosts. Explicit per-host names issue reliably. The `/tls-check`
> endpoint and `isKnownHost()` remain in the code so on-demand can be
> switched back on later with a DNS-01 provider configured.

## Still per-county TODO before a real second launch

The **public corpus** is already per-tenant. Two operational stores are still
global and must be made per-tenant when county #2 goes live (they are
gitignored, so Clark's live data is untouched by adding a tenant):

- Votes / registrations / signatures (`data/civic-*.json`,
  `data/identity-registrations.json`) — key them by tenant, or give each
  tenant its own data dir. Issue ids are corpus-scoped, so a second county's
  questions won't collide, but per-tenant stores are cleaner and required by
  the two-database rule at scale.
- The activity chain (`data/activity-log.jsonl`) and its public anchor —
  one chain per county, anchored separately.
- The `inbox/` archive served at `/files` — per-tenant.
- The gate page copy and `config/site-password` — currently Clark-worded and
  global; make the gate per-tenant or drop it at public launch.

## Infra (one-time, already set up)

- **DNS** (SiteGround): `@` A → droplet IP; `*` A → droplet IP (wildcard
  covers every county subdomain and www).
- **Caddy** (`/etc/caddy/Caddyfile` on the box) — one site line, every county
  host named explicitly; add the next county to the same comma-separated list:
  ```
  countycommons.us, www.countycommons.us, clarkar.countycommons.us {
      reverse_proxy localhost:3000
      encode gzip
  }
  ```
  Each named host gets its cert via HTTP-01 on reload. The app itself does the
  apex/www → flagship redirect and the unknown-subdomain page; Caddy just
  terminates TLS and proxies.
