# COUNTY-CODE.md — ground rules for county code and the admin page

This is the contract everyone builds inside: the owner, a county's local host,
a contributor, or an AI assistant. Read it before touching the admin system or
a county's content. The point is that many hands can shape many counties
without breaking the shared skeleton or each other.

## The two layers

**The bones (shared, fixed).** The platform's skeleton. Changed only through the
main repo, by the owner, with review. A county host cannot edit these, and no
admin feature may weaken them:

- **The charter bright lines** — no candidate questions, no active-ballot-measure
  questions, no questions about named individuals' conduct; election blackout
  windows. Enforced in code (`server/submissions.js` screen), not just policy.
- **No verdicts, ever** — the platform shows the trail and where it stops; it
  never editorializes or concludes, in either direction.
- **Vote integrity** — one `castVote()` gate for every channel; dedupe by
  registered contact; chain-first-then-store; the recount invariants that gate
  deploys. No admin action may bypass or fake a count.
- **The two-store privacy rule** — votes and identity are separate; they join
  only in memory at tally time; no personal value ever reaches the public
  hash chain or the public anchor. `publicValuesOf` is the ONLY consented
  identity→public crossing.
- **Every number cited + the cross-foot verifier** — budget figures render from
  the corpus with a source doc + page, and the tree must cross-foot to publish.
- **Aggregate-only rendering** and the session-scoped participant cookie.

**The overlay (per-county, editable).** Everything a county host should be able
to shape lives in a writable per-tenant overlay (`data/tenants/<tenant>/`,
gitignored, on the box). The renderer lays the overlay **on top of** the
git-seeded corpus. A host can add/close their own questions, edit their
calendar and Help Finder, restyle copy, reorder sections — freely — and none
of it fights a `git pull` deploy, because the overlay is not in git.

> The test for "bones vs overlay": if getting it wrong could mislead the public
> about money, fake a count, or expose a person, it's a bone. If it's this
> county's content or presentation, it's overlay.

## Roles and access

- **View PIN** — 4 digits. Picks a county and grants public (read) access. Low
  stakes: it only chooses which county you see. Clark's is `1525`.
- **Admin code** — 8 characters (letters + digits). Grants edit access to
  exactly one county. Higher stakes (it can change what the public sees), so:
  8 chars, hard lockout after repeated failures, and **every admin write is
  logged to the public activity chain by the admin's name.** An admin for one
  county can never read or write another county's data.
- PINs live in `config/pins.json` (gitignored — never commit a PIN). Each maps
  a PIN to `{ tenant, role, name }`. A signed cookie carries `{tenant, role}`;
  it is recomputed and verified on every request, so it can't be forged.

## How to add an admin capability (the pattern)

Every admin action follows the same four steps. Copy an existing one.

1. **Guard it.** The route sits under `/admin` and passes `requireAdmin` — it
   runs only for a valid admin cookie whose tenant matches the host. Never
   trust a tenant or role from the request body; take them from the verified
   cookie (`req.access`).
2. **Validate + scope.** Validate every field (length, type, allowed values).
   Write only into THIS tenant's overlay via the `overlay` helper — never a path
   built from user input, never another tenant's dir.
3. **Chain it.** Append an `admin-edit` event to the activity chain with the
   admin's name, the tenant, and WHAT changed (the field/section) — never
   personal data, never the full value if it could contain PII. Chain first,
   then write (integrity-first, like every other write).
4. **Render from the merge.** Public pages read `load(tenant)`, which merges the
   overlay over the corpus. The admin never edits the git corpus directly.

## Coding conventions (so we read like one hand wrote it)

- **Server-rendered HTML, template literals, zero client dependencies.** The
  admin page is progressive-enhancement only; it must work with JS off.
- **`esc()` at every sink.** Every user/admin string that reaches HTML is
  escaped. The public signature list and the admin editors are the sharpest
  XSS targets — escape there without exception.
- **Writes are `tmp` + `rename`.** Never a partial file. Overlays and stores
  both.
- **Per-tenant isolation is absolute.** A function that touches tenant data
  takes the tenant key from `req.access`/`req.tenantKey` and uses it to pick the
  dir. There is no code path where county A can name county B.
- **Small, boring, proven.** No new dependency without justifying it in
  `package.json` per SECURITY.md §11. Prefer stdlib.
- **Match the surrounding style** — the mono-ledger aesthetic, sentence case,
  6th–8th grade public copy, the status-mark vocabulary.

## Changing the bones

Editing anything in "the bones" list, or `NEVER.md` / `SECURITY.md` / the
charter, follows the `NEVER.md` ritual: write the change down in public first,
with the reasoning shown, before acting on it. Silence is not amendment. Open
it for review; we are happy to have help, and changes are welcome — through the
front door, not around the frame.

## Where things live

| Thing | Path | In git? |
|---|---|---|
| Shared corpus (Clark seed) | `data/corpus/` | yes (public) |
| Per-county overlay | `data/tenants/<tenant>/` | no (gitignored, on box) |
| PIN registry | `config/pins.json` | no (gitignored — secrets) |
| Tenant registry | `config/tenants.json` | yes (public) |
| Admin auth | `server/lib/access.js` | yes |
| Overlay merge | `server/lib/overlay.js` | yes |
| Admin routes | `server/app.js` (`/admin/*`) | yes |
