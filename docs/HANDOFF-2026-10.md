# Handoff — branch `ccr-71064361-99bhov` (Oct. 6–9, 2026)

Work done in a cloud session whose network blocked every government records site
(town, county, state). Web search worked, so the figures below came from search
results and are each cited in the data. Nothing here is live until the branch is
merged into `main` and deployed.

## Commits on the branch (oldest first)

| Commit | What |
|---|---|
| `2994ead` | Clark: Oct. 12 agenda filed on Docket #9; new Docket #20 (Ordinance 2026-11); venue flag on the calendar |
| `13c1e9c` | Melbourne Beach, FL added as a starter tenant (`melbournebeachfl`) |
| `c0daaee` | `/elections` on every county; top-bar tab Turnout → Elections |
| `de9a17a` | `NEVER.md` amendment: the shield covers non-elected staff, not officeholders (+ `CLAUDE.md` rule 8) |
| `6f25e5c` | Bright-line screening rewritten to match; candidates + required money filings on `/elections` |

## How to check it locally

```
git fetch origin ccr-71064361-99bhov && git checkout ccr-71064361-99bhov
npm ci
node pipeline/verify.js data/corpus-melbournebeachfl   # expect 7/7
PORT=3000 node server/app.js
curl -H 'Host: clarkar.countycommons.us' localhost:3000/elections
curl -H 'Host: melbournebeachfl.countycommons.us' localhost:3000/elections
```

There's no test suite. Each page was checked by requesting it locally, and the new
screen was checked against sample posts (see "Screening" below).

## Deploy steps beyond `git pull` + restart

- **Caddy:** add `melbournebeachfl.countycommons.us` to the site line in
  `/etc/caddy/Caddyfile`, then `systemctl reload caddy` (docs/MULTI-COUNTY.md).

## 1. Clark — Oct. 12 agenda and Ordinance 2026-11

- Docket #9 has a research note listing the Oct. 12 agenda items. Source: the
  county clerk's public post of Oct. 6. Sponsors are deliberately not named.
- Docket #20 is open: get the text of Ordinance 2026-11. If it's adopted, track what
  it requires and whether each part gets done.
- **Venue conflict, unresolved:** `data/corpus/calendar.json` says District
  Courtroom, 401 Clay St (from the 2025–26 minutes). The Oct. 12 agenda says Clark
  County Court Complex Building, 419 Clay St. The calendar note says to confirm with
  the clerk. Once confirmed, fix `place` and remove the note.

## 2. Melbourne Beach, FL — starter, not built out

Files: `config/counties/melbournebeachfl.json`, `data/corpus-melbournebeachfl/*`,
and the entry in `config/tenants.json`.

- **Money trail:** the budget isn't ingested. `grand_total` is 0 and `nodes` is
  empty, so the site shows the honest starter page. `/elections` deliberately
  bypasses the starter guard. The town is not on the directory until it has a budget.
- **Officials:**
  - Mayor Dennington and Town Manager Smith are confirmed by two sources.
  - Vice Mayor Cronin and commissioners Butler, Reed and Quarrie come from one
    search summary of the Town Commission page. **Verify on melbournebeachfl.org/Town-Commission.**
- **Meeting:** third Wednesday, 6 pm, Community Center, 509 Ocean Ave. This is
  inferred from the dates of posted agendas, so it's marked `verified: false`.
  Exception: a regular meeting fell on Thursday, May 21, 2026.
- **Docket #1–5:**
  1. FY2026-27 adopted budget
  2. Millage and the other taxing bodies
  3. FY2025-26 for comparison (hearing packet linked in `documents.json`)
  4. State audit (flauditor.gov)
  5. Form 1 disclosures

To match Clark's depth, the documents to pull are the FY2026-27 budget book, the
final millage and budget resolutions, the latest audit, a year of minutes, and the
BCPAO millage table. Domains: melbournebeachfl.org, flauditor.gov, bcpao.us,
brevardfl.gov, floridarevenue.com, edr.state.fl.us.

## 3. `/elections` (every county)

- **View:** `server/views/elections.js`.
- **Route:** `server/app.js`. It is also on the sitemap and passes the starter guard.
- **Nav:** `layout.js` (tab + site map).
- **Coverage pillar:** `server/lib/coverage.js`.
- **State data (shared, one file per state):** `data/corpus/elections-{arkansas,florida,texas}.json`
  holds the dates (each with sources), polling hours, ID rule, lookup links and the
  required money `filings`. Dates are marked live against today as passed, open now,
  or N days to go. States without a file show a vote.gov fallback.
- **Per county, in config:**
  - `election_office`: Clark, Melbourne Beach (Brevard SOE) and Palm Beach.
  - `races`: Clark County Judge, and Melbourne Beach mayor.
- **Race rendering:** candidates are listed alphabetically by last name, all in the
  same columns. Each state filing shows as filed (link) or "not gathered yet" for
  every candidate alike.

**To add a gathered filing:** in the config, set `races[].candidates[].filings.<id>`
to `{ "url": "...", "label": "SFI 2025" }`. Ids are `sfi` and `cce` for Arkansas,
`form1` for Florida. **Fill it for every candidate in the race at once.** The page
shows "not gathered yet" for anyone missing, by design.

**Open election items:**

- **Clark Docket #21:** request every county candidate's and officeholder's SFI and
  campaign contribution & expenditure reports. Pre-election C&E reports are due
  **Oct. 27**. Unresolved: whether Act 524 (2025) moved county candidates' C&E
  filing from the county clerk to the Secretary of State.
- **Clark quorum court races:** not listed yet because the news sources conflict by
  district. Pull the final ballot from VoterView or the clerk and add them as `races`.
- **Clark early voting:** listed at Arkadelphia Recreation Center, 2555 Twin Rivers
  Dr. That comes from the county's 2024 page and the March 2026 primary, so confirm
  it for November.
- **Melbourne Beach mayor:** the race is unopposed (Brevard SOE). Confirm whether it
  stays on the ballot.
- **Melbourne Beach Docket #5:** Form 1 for the mayor, the commissioners and the
  candidate, from disclosure.floridaethics.gov.
- **Texas:** state dates are in. No county `election_office` or `races` yet (Smith,
  Travis, Bastrop, Loving).
- **Other states:** no elections file yet (AZ, CA, CO, CT, HI, MA, NC, TN, VA).

## 4. NEVER.md amendment and screening

**Policy:** see `NEVER.md`, "The civic work". The original text and the reasoning
are kept in the file.

- **Allowed:** elected officials and candidates can be named, their conduct raised,
  and their legally required money filings published.
- **Never:**
  - naming or singling out non-elected staff
  - endorsements or campaigning
  - resident votes on races or live ballot measures

**Code:**

- `server/lib/people.js` sorts the roster: `officials` (elected unless the title
  looks appointed — manager, administrator, chief, auditor, director — or
  `"elected": false`), `quorum_court.justices`, and live `races` candidates.
- `server/submissions.js` `screen(text, county, { vote })` is the single screen. It
  is used by priorities, solutions, resident questions (`vote: true`) and
  host-opened questions (`vote: true`).
- **Flags:** `campaigning`, `possible-ballot-measure`, `names-non-elected-staff`,
  `conduct-not-aimed-at-an-elected-office`, `conduct-aimed-at-staff`,
  `names-a-candidate-in-a-live-race` (votes only), `in-election-blackout`.

**Checked against these sample posts:**

- Allowed:
  - "Troy Tucker should resign…"
  - "Bill Rogers should release his campaign finance reports"
  - "The county judge is corrupt"
- Refused:
  - "Vote for Bill Rogers"
  - "Should Michael Ankton be county judge?" (as a vote)
  - "Gary Brinkley should be fired" (appointed)
  - "A deputy … stole evidence"

**Worth a review:**

- The appointed-title regex can misfile an office. Override it with an explicit
  `"elected"` flag in config if so.
- An office title plus a staff word, like "the sheriff's deputy", is refused as
  staff conduct.
- Priorities and solutions publish immediately, so their flags are hard stops.

## Known pre-existing gaps (not changed)

- `/rules` returns 404 (the view exists; there's no route).
- Votes, priorities and the activity chain are still global stores, not per tenant
  (docs/MULTI-COUNTY.md TODO).
