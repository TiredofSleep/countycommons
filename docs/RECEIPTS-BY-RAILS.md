# Receipts by rails

**A proposal for how a government could make its own check register publish itself — and an honest account of how far the idea reaches.**

Today this platform, like every transparency effort, does *forensic reconstruction*: it chases a receipt after the money moves, through minutes, audits, check registers, and records requests — and it hits dead ends exactly where that trail was never written down. The idea here flips the order: if a dollar can only leave through an **authorized account tied to a specific budget line**, then the transaction *is* the record, generated the moment the money moves, with no separate reporting step to lose it. Transparency stops being a favor someone chooses to grant and becomes a byproduct of paying at all.

This is not science fiction. Every piece already runs in production somewhere. No one has assembled them into one object, and — told honestly — the idea reaches only a slice of a budget. Both of those things are true at once, and the pitch is only credible if it says so.

## The idea, in one line

Pay each **procurement** budget line from its own authorized account or virtual card, whose transaction feed **publishes by default** — so the line and the receipt are the same object.

## It is already proven in production

| Piece of the idea | Where it already runs | The number |
|---|---|---|
| A government card rail that captures the receipt natively | **GSA SmartPay** (federal purchase/travel/fleet cards) — captures merchant, category code, amount, date, and at Level 3 full line-item detail | **$39.4B** across **~82M transactions**, FY2025 ([GSA](https://smartpay.gsa.gov/about/statistics/)) |
| An account that **enforces** what it can buy | Merchant-category controls decline non-conforming charges at the point of sale; the Army hard-blocks high-risk categories bankwide | Standard control today ([AFARS 14-6](https://www.acquisition.gov/afars/14-6.-merchant-authorization-controls-mac)) |
| Purpose-restriction at national scale | **SNAP EBT**; and **WIC**, which matches each scanned item's code against an approved-product list in real time — the true item-level precedent | SNAP **$99.8B / 41.7M people**, FY2024 ([USDA](https://www.ers.usda.gov/data-products/chart-gallery/54637)) |
| Publishing every transaction **by default** | **Oklahoma** posts item-level purchase-card transactions, filterable by cardholder, merchant, and item | Live dataset, updated monthly ([data.ok.gov](https://data.ok.gov/dataset/purchase-card-pcard-fiscal-year-2025)) |
| Publishing at state scale, and its payoff | **OhioCheckbook** put every state transaction online | **112M transactions**; Ohio went from 46th to **1st** in national transparency rankings ([Buckeye Institute](https://www.buckeyeinstitute.org/research/detail/the-buckeye-institute-inspired-ohio-checkbook-ensures-government-transparency-and-should-be-made-permanent)) |
| Ring-fencing each appropriation line | **Encumbrance accounting** — a purchase order reserves budget against the line before a dollar is spent | Standard government practice ([primer](https://legalclarity.org/what-is-an-encumbrance-in-governmental-accounting/)) |
| Attribution that travels with the money | **ISO 20022** on FedNow / RTP can carry structured line and purchase-order data with the payment | Live rails, now $10M limits ([Fed](https://www.frbservices.org/news/fed360/issues/091625/fednow-service-10-million-transaction-limit)) |

## Who is already doing it — the model to copy

The floor of this idea — a downloadable, searchable record of every check — is already solved by real Texas governments, and Texas even certifies it through the Comptroller's **Transparency Stars** program (the "Contracts & Procurement" star requires a machine-readable vendor check register, not a PDF) ([program](https://comptroller.texas.gov/transparency/local/stars/contracts.php)).

- **Tarrant County** is the model to copy for a county. It is the **only Texas county to earn all six Transparency Stars** ([2025 Trailblazers](https://comptroller.texas.gov/about/media-center/news/20250318-texas-comptroller-glenn-hegar-celebrating-texas-transparency-trailblazers-1741726855325)), and it backs the award with substance: a **downloadable check register that includes an item-description field**, plus a **live vendor-payment lookup** ([registers](https://www.tarrantcountytx.gov/en/auditor/accounts-payable.html); [lookup](https://vendorchecks.tarrantcounty.com/)).
- **Travis County** runs the best working searchable county portal — a Vendor Payment Register that ties each payment to the invoices and purchase orders it paid ([VPR](https://financialtransparency.traviscountytx.gov/VPR)).
- **Austin** has the strongest true downloadable checkbook, covering check, ACH, and wire, with the same data as a flat file on its open-data portal ([eCheckbook](https://financeonline.austintexas.gov/); [data](https://data.austintexas.gov/Budget-and-Finance/Austin-Finance-Online-eCheckbook/8c6z-qnmj)).

**But here is the honest frontier: every one of them stops at the check level** — who got paid, how much, when, roughly for what. **No Texas local government publishes its purchase-card transactions at the item level.** The only government that does is out of state — **Oklahoma**, which posts every state P-card purchase, itemized ([OK](https://data.ok.gov/dataset/purchase-card-pcard-fiscal-year-2025)). So Texas's best counties define the floor receipts-by-rails should assume as already-won — the downloadable, awarded check register — and the open frontier they have all left, item-level and rail-native disclosure, is exactly the standard this idea names.

## What is actually unbuilt

Nobody has **collapsed the encumbrance and the card into one object** — a virtual card whose spending limit *is* the encumbered budget line, so the swipe simultaneously liquidates the encumbrance, records the expenditure, attaches the receipt, and renders it publicly at the line level. Procurement-tech firms do purchase-order workflow; audit firms review spend after the fact; **no one issues per-line spendable cards.** A white-label card issuer on a community bank is the plausible way a small county could stand one up.

## The honest ceiling — read this before pitching it

1. **It reaches only ~15–30% of a budget.** Payroll (~41% of local government spending), debt service, transfers to schools and cities, and large capital all move by wire to entities that cannot accept cards. This rail illuminates the **discretionary/procurement** lines — exactly where the dead ends are — and cannot touch the big-dollar lines (which are already well documented).
2. **Capture is not disclosure.** The federal government captures all of this and publishes only *aggregates*. Publish-by-default is a policy choice; opacity is the norm, and Oklahoma is the exception, not the rule.
3. **The receipt is not proof.** The Government Accountability Office found **41–48% of purchase-card transactions failed basic controls** ([GAO-08-333](https://www.gao.gov/assets/gao-08-333-highlights.pdf)). Native data lowers the cost of *finding* the receipt; it does not prove the purchase was legitimate.
4. **Every enforcement mechanism is also a control mechanism.** The "programmable money is surveillance" objection is live — the Anti-CBDC Surveillance State Act passed the U.S. House 219–210 in July 2025 ([H.R.1919](https://www.congress.gov/bill/119th-congress/house-bill/1919)). Anything that can *block* a government payment draws that fire. The frame must be **audit-and-anti-diversion, not programmable control.**

## The defensible version

Not "a prepaid card for every line." That breaks on payroll, debt, and contracts, and hands critics the surveillance argument. Instead:

> **An encumbrance you can spend from, that emits its own public receipt** — a virtual card per *procurement* line, on a pooled or white-label issuer, scoped to the operating slice, with the transaction feed published by default. Vendor, amount, and budget-line attribution are native and enforced; whether the stapler charged to the stapler line was really a stapler stays an audit question (only one program, WIC, does item-level enforcement, and only on a tiny standardized product set).

## What this platform would do with it

County Commons does not need to build payment rails. Its role is three things:

- **Champion the policy** as a solution residents can back — put it to the people who decide.
- **Ingest the feed** if a county adopts it — an API or CSV, instead of records-requested PDFs — which auto-populates the transaction layer of the money trail.
- **Publish a coverage score** — what share of spending is transparent *by rails* versus *reconstructed* — a single number officials can move, year over year.

## What it would look like on the money trail

The difference is visible at the level of a single line.

**A reconstructed dead end (today):** a line reads `INCENTIVES — $1,840,000`, and no public document names a recipient. The trail stops. Filling it takes a records request, a meeting-minutes pull, or a counter visit — and often it stays dark.

**A rails-native line (under this proposal):** the same line publishes its own itemized transactions — payee, amount, date, category — the moment each payment clears. No request required. The dead end becomes a list.

The coverage score is just this, counted: **what fraction of the county's spending is already the second kind.**

---

*Every factual claim above links to a primary source. This brief is a starting point, not the last word — it is filed as a solution on the platform so anyone can weigh it, cite against it, or file a better one.*
