# CLAUDE.md — Clark Commons (Civic Intelligence Platform)

Place this file at the repo root. It is the working brief for Claude Code on this project.

## What this is

Clark Commons: a civic coordination and budget-transparency platform for Clark County, Arkansas (Arkadelphia). Free, open, anti-extractive, sponsored by Ozark Cleaners. Built as a demonstration that this kind of infrastructure can exist, then generalized to any county via config.

Owner: Brayden Sanders. Same builder and same discipline as CustomPOS: config-driven kernel, county specifics isolated in `config/county.json`, boring proven components, single small VPS, build-then-light-maintenance (steady-state operations must stay under 3 hours/week of human time).

## The three documents in this repo

1. **CLARK-COMMONS.md** — full concept, precedent research, stakeholder walkthroughs, channel specs, data model, code structure, operational rhythm, and Section 21 (the interactive AI layer). This is the spec. Read all of it before building anything.
2. **CLARK-COUNTY-BUDGET-2026.md** — corpus document #1: the county's 2026 appropriation ordinance, hand-ingested. This is the seed data AND the template for what automated ingestion must produce.
3. **clark-budget-tree.html** — working prototype of the budget explorer output: clickable tree from the $21,386,230 total down to line items, with sourced/partial/dead-end status marks and a First Issues docket. **This file is the target output of the M1 pipeline.** The pipeline's job is to generate pages like this from PDFs, automatically.

## Build order (do not reorder)

**M1 — Budget engine + Help Finder** (build this first, ships alone, useful at n=1):
- `pipeline/ingest.js`: PDF in `inbox/` → structured JSON (fund, dept, category, line item, amount, year, source page ref)
- `pipeline/summarize.js`: cited plain-language layers, 6th–8th grade reading level
- Budget explorer: server-rendered pages generating the tree view (match clark-budget-tree.html's structure and status system)
- Budget Analyst Q&A (`server/ai/ask.js`): retrieval over pre-processed corpus, every claim cites source doc + page, "I don't have a document for that" when outside corpus, computes but never advocates
- Help Finder + Navigator (`server/ai/navigate.js`): Clark County assistance directory, web + SMS lookup
- Public cost log: every AI call's tokens and dollars, published nightly ("AI assistance sponsored by Ozark Cleaners — this month: $X across N questions")

**M2 — Issues + web voting + Tiers 0–1** (magic-link auth, results pages, tier display always)
**M3 — SMS + email channels** (Twilio webhooks; 10DLC registration is Brayden's task and the long pole — code can't ship before it clears)
**M4 — Paper + kiosk + digests** (ballot PDF generator, batch entry UI with audit sampling, monthly print digest)
**M5 — Tier 2/3 verification** (postcard codes, counter attestation, voter-file matching — local only, never shared)
**M6 — Official packets + outcome tracking** (one-page PDF: question, tier counts, methodology footer, QR)
**M7 — Deliberation/clustering** (LAST; evaluate embedding open-source Polis before building clustering; all founding issues are yes/no and ship without this)

Calendar constraint: quorum court budget season is Oct–Nov. Launch Aug–Sept. M1–M6 before September.

## Hard architectural rules (non-negotiable)

1. **Two physical databases.** `data/civic.db` (issues, statements, votes, outcomes, paper_batches, moderation_log) and `data/identity.db` (contacts, verifications — encrypted). Only `server/tally.js` may open both; the join happens in memory at tally time; raw joins are never persisted or logged.
2. **Aggregate-only rendering.** Public pages show counts per tier and channel; tier counts under 20 render as ranges. Individual votes visible to no one, including admins.
3. **One vote gate.** All four channels (web, SMS, email, paper) converge on a single `castVote(participant, issue, value, channel)` path. No channel side doors. Last write wins until issue close. Confirmation returns on the arriving channel.
4. **AI is batch-first and budgeted.** Heavy AI (ingestion, summarization, minutes) runs as nightly cron jobs. Interactive AI serves from the pre-processed corpus. Small model routes/lookups; big model reasons. Per-session and per-day soft caps. Every call appends to the public cost log.
5. **AI never advocates, never moderates alone.** Neutrality passes suggest wording; humans decide. Moderation pre-screen flags only; the moderation log is append-only and public.
6. **Server-rendered HTML, minimal JS, WCAG AA.** Must be fast on old Android browsers. SQLite. One VPS.
7. **`config/county.json` is the generalization seam.** Jurisdictions, officials, meeting calendar, data sources, election blackout windows, tier methods. A second county = a second config file + PDFs in inbox. Never hardcode Clark County specifics outside config.
8. **Charter bright lines in code paths, not just policy:** no candidate issues, no active-ballot-measure issues, no named-individual conduct issues. Election blackout windows come from county.json.

## What is Brayden's, not code

Phase 0 real-world items (already listed in CLARK-COMMONS.md §16.5): city manager conversation (food-as-utility building), sheriff question wording, fire chief question wording, county judge awareness strategy (deliver results, never pitch — see §17 Tucker doctrine), library partnership, Twilio 10DLC registration, entity/legal, obtaining Issue-docket documents (#1 city budget, #2 schools, #3 millage sheet, #4 fire map, #5 EDCCC recipients, #6 neighbor-county salary ordinances, #8 audits, #9 minutes, #10 check register).

As those documents arrive, they go in `inbox/` and the pipeline ingests them; each completed issue gets stamped on the docket page. The docket's open→complete loop is the platform's first public demonstration — treat it as a feature, not a chore list.

## Tone and copy rules

Plain verbs, sentence case, 6th–8th grade reading level on all public text. The platform computes and cites; it never editorializes. A dead end means "not yet ingested and navigable," never "hidden." Footer on every page: sponsorship line + methodology link. This is a transparency engine, not a gotcha machine — the fire-funding caveat in CLARK-COUNTY-BUDGET-2026.md §4.3 is the model for how to handle a number that could be weaponized.

## Definition of done (capability target)

One completed loop: community signal → official cites it → body acts → outcome page → loop-closed notification to voters. Capability checklist in CLARK-COMMONS.md §11. When the platform is capable, the build phase is over and maintenance mode begins.
