# Where County Commons sits in the field

An honest map of the civic-democracy field and where this platform stands in it.
Written to keep us clear-eyed: to name what we do well, what we only sketch, and
what we leave to others on purpose. The companion public page is `/kindred` (the
organizations themselves, linked by method not by cause).

The one-line verdict: **on transparency we do the county-budget work about as
thoroughly as we've seen anywhere. On voice and deliberation we are early, by
design. The uncommon part is the fusion — provenance, privacy, and four-channel
access in one county-scaled stack — but we are not yet a synthesis of the
deliberation half of the field.**

## The field, by function

The field is not one thing. It splits into functions, and most organizations do
exactly one of them well. Mapping ourselves function by function is the only
honest way to answer "are we a synthesis?"

| Function | Who does it best | Where we stand |
|---|---|---|
| County money/budget transparency | (few go to this depth) | **As deep as we've found.** Every dollar cited to a source page, cross-footed as a publication gate, vendors traced, audits mined, gaps named. |
| Legislation & records | Open States, GovTrack, MuckRock, RCFP | **Synthesis by reference.** We link them and ship our own FOIA kit; we do not track bills. A deep vertical, not a broad horizontal. |
| Opinion-gathering / consensus | Polis, Consider.it | **Thin.** Yes/no polling + resident-proposed questions. No consensus-mapping, no free-text weighing yet. |
| Participatory budgeting | Decidim, CONSUL | **Absent — the sharpest gap.** We show the budget; we don't let residents allocate it. We already hold the data this needs. |
| Deliberative minipublics / sortition | Healthy Democracy, DemocracyNext, Stanford DDL | **Absent by design.** We aggregate the many; the field's frontier is deliberating the few, representatively. |
| Elections / candidates | Ballotpedia | **Excluded by charter.** A bright line, on purpose. |
| Method education / how-to | NCSL, Ballotpedia, state offices | **Synthesis by reference** (`/kindred`) plus our own records kit. |

## What's uncommon here

Most of those organizations do one thing well. What's less common is doing them
together, with a handful of properties the field rarely combines:

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

## The rallying gap

The map above asks "who makes government legible." A second sweep asked a
different question — "who helps a community actually push" — and it turned up a
field that splits four ways, each stopping short of the same place. This is the
axis the platform is really built on: not a transparency site with participation
bolted on, but an open, standing petition with the receipts underneath it.

| The rally / petition field | Examples | Where it stops short |
|---|---|---|
| Mass petition hosts | Change.org, iPetitions, GoPetition, MoveOn, Care2 | National and shallow — sign-and-forget, no local budget underneath, no record of whether anyone acted. Several are openly partisan or monetize the signer's data. |
| Contact-your-representative | Resistbot, 5 Calls, Democracy.io | One message to (usually) a federal office. No shared community signal, no local layer, and the best-known ones ship pre-written partisan scripts. |
| Mobilization software | Quorum, Capitol Canary, New/Mode, Action Network, NGP VAN | Built for organizations, not residents — a citizen can't use them at all; the ones with real reach are party-aligned campaign infrastructure. |
| Government participation platforms | Go Vocal, Decidim, CONSUL, Your Priorities, Polis | Genuinely strong tools — but a government has to adopt and host them. They're a consultation the state runs, not a standing petition the community owns. |

Put the four failure modes together and a position falls out that none of them
occupy: **transparency + rallying that runs local to national + accountability
tracking + nonpartisan + grounded in the actual money.** The petition tools rally
but show nothing and prove nothing; the transparency tools show everything and
rally no one; the participation platforms are powerful but top-down, waiting on a
government to switch them on. A community-owned petition that starts from a
sourced budget, lets neighbors rank what matters, carries it to the officials at
whatever level, and then records in public what they did — that specific
combination we did not find anywhere in the sweep.

Three honest caveats, so this reads as a map and not a boast:

- **Reach is theirs, not ours.** Change.org counts hundreds of millions of users;
  our organic traffic is still near zero. An unoccupied position is worth nothing
  until people stand on it.
- **Unproven at the one thing that matters.** The loop — signal a body actually
  cites and acts on — has not closed yet, in any county. The architecture is
  ready; the proof isn't.
- **Nonpartisan rallying is hard to hold.** The tools with the most energy got it
  by picking a side. Staying a neutral container while still moving people is the
  harder path, and the one most likely to fray under pressure. It is also the
  only path the charter allows.

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

The transparency half is built out and thorough at the county level, wrapped in
an accessibility-and-privacy architecture that isn't common. The deliberation
half is intentionally early. If "synthesis of the field" is the goal, the
frontier is exactly there — and participatory budgeting is the first step onto
it, because it is the one place where our strongest asset (the sourced budget)
and the field's strongest unclaimed method (constrained collective allocation)
are the same object.
