# RECORDS-RUN.md — The paper shopping list

The internet layer is mined out (see the docket's research notes for what it
yielded). Everything below is on paper at a counter in or near Arkadelphia.
Phone photos are fine — flat page, decent light, one document per set of
photos. Drop anything you get into `inbox/` (any filename); the pipeline
hashes, registers, OCRs, and queues it for ingestion. Every completed pickup
stamps its docket item.

Priority order by payoff:

## 1 · County clerk's counter (courthouse, 401 Clay St)
- [ ] **Check register / claims register, 2025–2026** (Docket #10). The single
  highest-value document left: names every vendor. The ready-to-send FOIA
  letter is on the /vendors page — mailing it works too.
- [ ] **Bid tabulations** for asphalt, fuel, gravel (2025–2026) — who bid, who
  won, at what price.
- [ ] **Ordinance 2025-22 "Attachment A"** if not legible from our scan — the
  actual base-pay amounts table.
- [ ] **Sales-tax enacting ordinances** (EDCCC tax, fire tax, 0.5% road bond
  tax) and the DFA notice on the $1.3M rebate repayment (Docket #3).
- [ ] **EDCCC quarterly report handouts** given to the quorum court (last 8
  quarters — Shelley Short's reports, with handouts and slides, are in the
  minutes record). These became county records when they hit the clerk's
  table, and they may contain the recipient detail the fund's single
  "INCENTIVES" line never shows (Docket #5). Likely the easiest big unlock
  on this whole list.
- [ ] Ask casually: which quorum court district is your home/shop in? (One
  phone call's worth of civic navigation for the story page.)

## 2 · City hall
- [ ] **City of Arkadelphia budget, 2025 and 2026** (Docket #1) — the line
  items and salaries the audits don't show. This doubles as the city manager
  conversation from the Phase 0 checklist.
- [ ] Water & sewer budget if separate.

## 3 · Assessor / Collector (same courthouse trip as #1)
- [ ] **Official millage rate sheet** — confirms our state-millage-book
  reading and resolves the labeled ambiguity about how the county's small
  general/misc mills split between city and rural taxpayers (Docket #3).
- [ ] A **sample tax bill** (yours) — the story page's "decoded bill" gets
  even better rendered against a real one.

## 4 · Treasurer's office
- [ ] **Monthly or annual treasurer's reports** (Docket #8) — revenue by
  source, and what restricts the ~$3.9M in unappropriated balances.

## 5 · School district offices (Arkadelphia + Gurdon)
- [ ] **District budgets** (Docket #2). Arkadelphia also posts some
  state-required financials at arkadelphiaschools.org — counter visit still
  likely faster and more complete.

## 6 · Fire departments (pairs with the fire chief conversation)
- [ ] **Dues schedules and any district budgets** for East Clark County
  Rural VFD, Okolona VFD, Whelen Springs VFD, and the fire association
  (Docket #4). This completes the fire funding map the honest way.

## 7 · EDCCC / Arkadelphia Alliance office
- [ ] **EDCCC board minutes and the incentive/grant agreements** funded from
  fund 3407 (Docket #5). Arkansas FOIA has been applied to entities
  substantially supported by public funds — a polite ask first, the statute
  second.

## While you're out (Phase 0 conversations that share a doorway)
- Sheriff: deputy-pay question wording — the /compare/deputy-pay page and
  Ordinance 2025-22 are the conversation starters.
- Library director: kiosk + paper drop point (and the library's own budget
  detail, docket-adjacent).
- One JP: what evidence would move them at budget time.

## How to hand it to the pipeline
1. Photos or scans into `inbox/` (subfolder per trip is fine).
2. `node pipeline/register.js` after adding metadata for new files — or just
   tell Claude what each document is; the registry entry takes a minute.
3. `node pipeline/ocr-batch.js inbox/<folder>` for scans.
4. Ingestion review → corpus → `npm run verify` → the docket stamps itself
   another completion.
