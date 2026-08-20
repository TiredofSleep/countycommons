# Participatory budgeting — design sketch

A layer that lets residents allocate a pot of money across real budget
categories, under a real tradeoff constraint, and shows the collective result
next to what the county actually adopted. It sits on top of the budget tree we
already have and reuses the vote gate, the tiers, and the four channels. It is
**advisory** — a signal to the quorum court, never binding money — which is
exactly what keeps it inside the charter ("participation _alongside_ the
republic").

This is a sketch, not a spec. It shows the shape, the hard parts, and where it
plugs in. It does not lock decisions.

## Why this and not a wishlist poll

A poll asks "do you want more park money?" and everyone says yes, because there
is no cost to saying yes. Participatory budgeting asks "here is the money — where
does it go, knowing that funding this means not funding that?" The tradeoff is
the whole point: it produces a _considered_ signal instead of a first-reaction
one, and it does it with the asset we are already best at — the sourced budget.

## The primitive: tokens, not dollars

Everyone gets the same **N tokens** (start with 10). Each token is a slice of the
pot (`pot / N`). You place your tokens across the options. That is the entire
interaction.

Tokens instead of raw dollars because tokens survive every channel and every
level of numeracy:

- Ten things to place is legible on a smart phone, a flip phone, and a paper
  grid alike.
- "Spend your 10 tokens" needs no mental arithmetic; dollars do.
- The constraint (you have exactly ten) is self-evident and self-enforcing.

This is the CONSUL/Decidim pattern, chosen here for the same reason we chose
yes/no for v1 voting: the simplest primitive that still carries the real choice.

## The pot

Each exercise names a **pot** and cites where it came from — same provenance rule
as every number on the site. Two honest sources, in order of preference:

1. **A real discretionary amount** the county actually controls (e.g., a
   defined slice of unreserved general fund, or a capital line the court is
   weighing). Cited to the ordinance. This is true PB.
2. **An illustrative pot** clearly labeled advisory ("if this $X were yours to
   direct…"), used when no real discretionary pot is on the table yet.

Either way the page states plainly: *this is a signal; the county sets the
budget.* We never imply we move money.

## The options

Options are **budget categories**, each linked to its node in the money trail so
a resident can click through to what it funds and what it costs today. Options
come from two places:

- **Curated from the budget tree** — the host (or owner) picks the line items
  in play for this exercise (roads, sheriff, library, solid waste…), each an
  existing `budget-2026.json` node id.
- **Resident-proposed spending purposes** — the same propose→support→screen flow
  as questions (`server/questions.js`), run through the bright-line screener so
  no option can name an individual, a candidate, or an active ballot measure. An
  option is a _purpose_ ("a second ambulance"), never a person.

Optional per-option **floor/cap** (e.g., "you may put at most 4 tokens here") to
model real legal constraints, off by default.

## Data model

Mirrors the issues/votes shape so it inherits their privacy guarantees.

```
pb_exercises            (civic.db — public)
  id, title, pot_amount, pot_source {doc, page}, tokens (N),
  scope (local|state|national), status, opened, closed,
  methodology_note,
  options: [ { id, label, node_ref, floor?, cap? } ]

pb_allocations          (civic.db — public, aggregate only)
  participant_token  -> exercise_id -> { option_id: tokens, ... }
```

One gate, exactly like votes. A single path:

```
castAllocation(participant, exerciseId, allocationMap, channel)
```

is the PB analog of `castVote` in `server/vote.js`. All four channels converge on
it. Last write wins until close. Confirmation returns on the arriving channel.
The allocation is keyed by the same per-sitting participant token that keys
votes, so identity and allocation can only meet in memory at tally time (the
two-database rule, unchanged). Individual allocations are visible to no one;
pages render aggregates only, with tier counts under 20 shown as ranges.

## The tradeoff constraint (the hard part)

The sum of a participant's tokens must be ≤ N, enforced identically on every
channel — this is what makes it PB and not a poll, and getting it right on SMS
and paper is the real work.

- **Web** — number steppers or a row of ten chips, with a live "tokens left:
  3" counter and a submit that refuses > N. No JS required for correctness (the
  server re-checks); JS only makes the counter live.
- **SMS** — allocate by reply: `ROADS 4 LIBRARY 3 JAIL 3`. The server parses,
  validates the sum, and texts back the running placement and what is left, or a
  plain error. Short option keywords are defined per exercise.
- **Paper** — a printed grid: one row per option, ten checkboxes or a written
  number, "these must add up to 10" on the sheet. Batch-entered through the same
  operator UI and audit-sampling path planned for paper ballots (M4).
- **Kiosk** — the web flow on a shared device, session-scoped like everything
  else; nothing persists after the sitting.

If a paper sheet or SMS reply overspends, it is not silently clamped — it is
kicked back as an error (paper: flagged in batch entry; SMS: a reply), because
silently "fixing" someone's allocation is putting words in their mouth.

## Aggregation: the people's budget

Two numbers, both published, because they answer different questions:

- **Mean tokens per option → "the people's budget."** If every participant
  places all N tokens, the per-option means sum back to the pot exactly, so the
  mean gives a coherent allocation of the whole pot that you can lay beside the
  adopted budget dollar-for-dollar.
- **Median tokens per option → "the typical priority."** Robust to a few people
  dumping all ten on one thing; better for "what does a normal participant
  think," but the medians do not sum to the pot, and the page says so.

Show the distribution too (how spread out each option's tokens are), so a
polarized option can't hide behind a moderate average. All of it broken out by
tier and channel, ranges under 20, same as votes.

## The payoff: signal next to reality

The artifact this exists to produce: **the people's allocation beside the adopted
budget, category by category.** "Residents would put $X into roads; the adopted
budget puts $Y." That single comparison is:

- the thing a resident came to see,
- the thing that belongs in the official one-page packet (M6),
- and the thing that closes the definition-of-done loop: signal → an official
  cites it → the body acts → an outcome page → loop-closed notice to
  participants.

It never says the county is wrong. It says, precisely and with sources, where the
public and the adopted budget agree and differ. The reader draws the conclusion.

## What it reuses (so this is smaller than it looks)

- **Budget tree** — options are just node ids; the provenance click-through is
  already built.
- **Vote gate + tiers + four channels + paper batch/audit** — `castAllocation`
  is `castVote` with a map instead of a scalar; tiers, dedup by email/phone,
  aggregate-only rendering, and paper entry all carry over.
- **Propose→support→screen** — resident-proposed options reuse
  `server/questions.js` and the bright-line screener unchanged.
- **Overlay/config** — a host defines an exercise (pot, options, note) through
  the admin overlay, exactly like opening a question; nothing county-specific is
  hardcoded.
- **AI, batch and neutral** — can cluster the optional free-text reasons and
  suggest neutral option wording (human approves), never advocate; every call
  hits the public cost log. Same rules as everywhere.

## Minimal first version

Web-first, one real exercise, to prove the loop before building the SMS/paper
constraint parsing:

1. Host defines a pot (cited) and 4–6 options from the budget tree.
2. Residents place 10 tokens; server enforces the sum; last write wins.
3. Page shows the people's budget (mean) vs the adopted budget, aggregate-only,
   tiers and ranges as usual.
4. On close, an outcome page and, if it's cited by the court, a loop-closed
   notice.

SMS and paper allocation parsing follow once the channels themselves ship (M3/M4).

## Milestone fit

Naturally an **M8**, after tiers (M2) give the signal weight and clustering (M7)
gives it nuance. It _depends_ on the tiers to be credible and on SMS/paper to be
inclusive, but the web-first advisory version above can ship any time after M2 as
a proof of the mechanism.

## Open questions / risks

- **Whose pot?** The exercise is far stronger with a real discretionary amount
  the court will actually weigh. That needs a real-world conversation (a §16.5
  item), not code. The illustrative version works meanwhile but is weaker.
- **Mean vs median as the headline.** Recommend leading with the mean ("the
  people's budget," because it sums to the pot and compares cleanly) and showing
  median + spread alongside. Decide before launch; document the choice on the
  methodology page.
- **Manipulation.** Same surface as voting (one voice per sitting, dedup, tiers,
  ranges) — no new hole, but a coordinated push is more legible in an allocation
  than a yes/no, which is arguably a feature.
- **Option framing is power.** Who picks the options shapes the result. Keep
  option wording neutral (AI neutrality pass suggests, human decides), let
  residents propose their own, and publish who set each exercise — the same
  transparency we apply to questions.
