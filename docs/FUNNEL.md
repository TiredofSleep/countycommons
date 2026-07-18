# FUNNEL.md — Where the future attaches

This phase built the foundation: a provenance-first corpus, a cross-footing
verifier, and an explorer where every number is clickable to its citation.
Everything in CLARK-COMMONS.md attaches to seams that already exist. This file
says where, so no later milestone requires rework.

## The invariants (already enforced, never relax)

1. **No number renders without provenance.** Every node carries
   `source/status/layer`; the citation page (`/line/:id`) is generated, not
   hand-written. New data types (city budget, school millage, audits) enter as
   corpus nodes with the same fields — the explorer needs no changes.
2. **The verifier is the publication gate.** `npm run verify` must pass (or
   discrepancies must be labeled `ambiguous` with a reason) before any corpus
   change ships. CI should run it on every commit once a remote exists.
3. **Nothing writes to the corpus automatically.** `pipeline/ingest.js`
   produces review files in `data/review/`; a human applies them. Future AI
   extraction keeps this shape: extract → propose → human confirms → verify.
4. **No third-party requests from any page.** Holds for all future pages.

## Seams by milestone

- **AI Q&A (Budget Analyst, next phase):** retrieval corpus = the same JSON in
  `data/corpus/` plus page text from stored PDFs. Route `/ask` is reserved and
  currently returns an honest 404. Code lands in `server/ai/ask.js` with
  `guardrails.js`; every call appends tokens+dollars to a public cost log —
  **never the question text** (privacy rule). Cached answers graduate into
  static FAQ pages.
- **Issues + voting (M2):** SQLite arrives here — `data/civic.db` +
  `data/identity.db` (two physical stores; only `server/tally.js` opens both;
  aggregate-only rendering, sub-20 cells as ranges — see CLAUDE.md hard rules).
  All channels converge on one `castVote(participant, issue, value, channel)`
  gate. Routes `/issues` and `/results` are reserved. Email one-click votes
  must land on a confirm page (POST casts), never cast on GET — mail scanners
  follow links.
- **Channels (M3–M4):** `server/channels/{sms,email,paper}.js` per the spec.
  Twilio 10DLC registration is the long pole — start before code.
- **Tiers (M5):** tier methods configured in `config/county.json`; voter-file
  matching is local-only and labeled "matched to the public voter roll."
- **Second county (Phase 4):** new `config/county.json` + their PDFs in
  `inbox/` + a new corpus directory. Nothing in `server/` or `pipeline/` is
  Clark-specific; anything that becomes so is a bug.

## Operating the corpus today

- `npm run verify` — cross-foot everything; writes `verification.json`.
- `node pipeline/register.js` — re-hash inbox/ and regenerate the document
  registry (metadata lives in the script).
- `node pipeline/ingest.js pin <doc-id>` — propose page references for
  existing numbers; apply accepted pins by editing `budget-2026.json`
  (`source.page`, and re-point `source.doc` if the page is in the packet).
- `node pipeline/ingest.js extract <inbox-file>` — page-by-page candidate
  lines for ingesting a new document.
- `node pipeline/inspect.js <file> [terms...]` — quick sniff of any PDF.

## Near-term corpus work (in docket order)

#7 apply page pins (29 single-hit proposals already in `data/review/`), ingest
remaining department line items and the ~20 small funds from the 96-page
packet · #6 build the deputy-pay comparison from the six salary surveys +
peer 2026 filings (all stored) · #8 ingest FY2021 audit actuals; fetch newer
audit years · #1/#2 city + schools remain records requests (Brayden, in
person) · #9 quorum court minutes — needs a source · #3 millage sheet —
assessor/collector.
