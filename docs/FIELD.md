# Where County Commons sits in the field

An honest map of the civic-democracy field and where this platform stands in it.
Written to keep us clear-eyed: to name what we do better than anyone, what we
only sketch, and what we leave to others on purpose. The companion public page
is `/kindred` (the organizations themselves, linked by method not by cause).

The one-line verdict: **on transparency we are a proper synthesis of the field
and, at county-budget depth, ahead of it. On voice and deliberation we are early
by design. We are a genuine _integrator_ — the fusion is the innovation — but we
are not yet a synthesis of the deliberation half of the field.**

## The field, by function

The field is not one thing. It splits into functions, and most organizations do
exactly one of them well. Mapping ourselves function by function is the only
honest way to answer "are we a synthesis?"

| Function | Who does it best | Where we stand |
|---|---|---|
| County money/budget transparency | (no one at this depth) | **Exceeds.** Every dollar cited to a source page, cross-footed as a publication gate, vendors traced, audits mined, gaps named. |
| Legislation & records | Open States, GovTrack, MuckRock, RCFP | **Synthesis by reference.** We link them and ship our own FOIA kit; we do not track bills. A deep vertical, not a broad horizontal. |
| Opinion-gathering / consensus | Polis, Consider.it | **Thin.** Yes/no polling + resident-proposed questions. No consensus-mapping, no free-text weighing yet. |
| Participatory budgeting | Decidim, CONSUL | **Absent — the sharpest gap.** We show the budget; we don't let residents allocate it. We already hold the data this needs. |
| Deliberative minipublics / sortition | Healthy Democracy, DemocracyNext, Stanford DDL | **Absent by design.** We aggregate the many; the field's frontier is deliberating the few, representatively. |
| Elections / candidates | Ballotpedia | **Excluded by charter.** A bright line, on purpose. |
| Method education / how-to | NCSL, Ballotpedia, state offices | **Synthesis by reference** (`/kindred`) plus our own records kit. |

## Where we are more than a synthesis

Most of those organizations do one thing. Our actual contribution is the fusion,
plus a handful of properties the field rarely has:

- **Provenance on every number** — clickable to source page and file hash. Most
  transparency sites cite nothing at that grain; we treat an uncited number as a
  bug the verifier fails the build over.
- **Tamper-evidence on ourselves** — a hash-chained, publicly anchored activity
  log. We hold our own history to the standard we hold the county's.
- **Four-channel equality** (web / SMS / paper / kiosk, planned M3–M4) — most
  civic tech is web-only, which quietly excludes the people most affected by
  county decisions. One vote gate, no channel side doors.
- **Anti-extractive by construction** — aggregate-only rendering, nothing follows
  you home, costs published nightly. Polis and Decidim are open-source; many
  others harvest. We keep two physical databases so identity and votes can only
  meet in memory at tally time.
- **Generalization seam** — one process, config-driven, 75 counties served from
  one box. The field's tools are mostly single-deployment.

None of this is a claim to be better people. It is a claim about a specific
architecture: provenance-first, privacy-preserving, channel-equal, county-scaled.
That combination is genuinely rare, and it is the thing to protect.

## The honest gaps, ranked by fit

Ranked by how cleanly each fits the charter ("direct participation _alongside_
the republic," compute-but-never-advocate, no verdicts):

1. **Participatory budgeting** — the highest-leverage additive move. We already
   have the budget tree; letting residents allocate a pot across it, under a
   real tradeoff constraint, turns a wishlist poll into a considered signal. Fits
   the charter cleanly: it is advice to the quorum court, not binding money. The
   full design sketch lives in the code repository (`docs/PARTICIPATORY-BUDGETING.md`).
2. **Consensus-mapping (Polis-style)** — already on the roadmap (M7). Turns
   "42% yes" into "here is _where_ people actually agree," which is more useful
   and less divisive. Evaluate embedding open-source Polis before building our own.
3. **A deliberative / balanced-review layer** — the field's strongest critique of
   raw polling is that considered judgment beats first-reaction preference. A
   Healthy-Democracy-style neutral pro/con on a question _before_ it opens is
   compatible with our no-verdicts rule, because it presents both sides rather
   than taking one. The AI neutrality pass (already in the spec) is the seed of
   this; a citizen-review step would be the full version.

## What we deliberately will not become

Naming the non-goals is part of the synthesis, because a synthesis is also a set
of refusals:

- **Not an elections/candidate site.** Charter bright line. Ballotpedia exists.
- **Not a bill-tracker.** Open States and GovTrack do it well; we link them.
- **Not a binding decision system.** We are a signal and a mirror, not a
  government. The republic decides; we make the deciding legible and give the
  public a clear, verifiable voice into it.
- **Not an advocacy platform.** We compute and cite; we never take the side of an
  outcome. The moment a feature would require us to argue _for_ a result, it
  fails the charter.

## Strategic read

We have built the transparency half to a standard the field does not match at the
county level, and wrapped it in an accessibility-and-privacy architecture that is
rarer still. The deliberation half is intentionally early. If "synthesis of the
field" is the goal, the frontier is exactly there — and participatory budgeting
is the first step onto it, because it is the one place where our strongest asset
(the sourced budget) and the field's strongest unclaimed method (constrained
collective allocation) are the same object.
