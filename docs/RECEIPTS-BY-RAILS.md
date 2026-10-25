# Receipts by rails

**How some governments publish their payments, with the numbers.**

Today this platform does *forensic reconstruction*: it follows a receipt after the money moves, through minutes, audits, check registers, and records requests. Some governments instead publish payment records directly from the systems that make the payments. This page lists where that happens.

## Where it runs in production

| Piece | Where it runs | The number |
|---|---|---|
| A government card rail that captures the receipt natively | **GSA SmartPay** (federal purchase/travel/fleet cards) — captures merchant, category code, amount, date, and at Level 3 full line-item detail | **$39.4B** across **~82M transactions**, FY2025 ([GSA](https://smartpay.gsa.gov/about/statistics/)) |
| An account that **enforces** what it can buy | Merchant-category controls decline non-conforming charges at the point of sale; the Army blocks high-risk categories bankwide | ([AFARS 14-6](https://www.acquisition.gov/afars/14-6.-merchant-authorization-controls-mac)) |
| Purpose-restriction at national scale | **SNAP EBT**; and **WIC**, which matches each scanned item's code against an approved-product list in real time | SNAP **$99.8B / 41.7M people**, FY2024 ([USDA](https://www.ers.usda.gov/data-products/chart-gallery/54637)) |
| Publishing every transaction | **Oklahoma** posts item-level purchase-card transactions, filterable by cardholder, merchant, and item | Live dataset, updated monthly ([data.ok.gov](https://data.ok.gov/dataset/purchase-card-pcard-fiscal-year-2025)) |
| Publishing at state scale | **OhioCheckbook** put every state transaction online | **112M transactions**; the Buckeye Institute, which promoted the program, reports Ohio rose from 46th to 1st in a national transparency ranking ([Buckeye Institute](https://www.buckeyeinstitute.org/research/detail/the-buckeye-institute-inspired-ohio-checkbook-ensures-government-transparency-and-should-be-made-permanent)) |
| Reserving budget against a line | **Encumbrance accounting** — a purchase order reserves budget against the line before a dollar is spent | ([primer](https://legalclarity.org/what-is-an-encumbrance-in-governmental-accounting/)) |
| Attribution that travels with the money | **ISO 20022** on FedNow / RTP can carry structured line and purchase-order data with the payment | ([Fed](https://www.frbservices.org/news/fed360/issues/091625/fednow-service-10-million-transaction-limit)) |

## Texas counties and cities

Texas certifies local transparency through the Comptroller's **Transparency Stars** program; the "Contracts & Procurement" star requires a machine-readable vendor check register ([program](https://comptroller.texas.gov/transparency/local/stars/contracts.php)).

- **Tarrant County** is the only Texas county to earn all six Transparency Stars (Texas Comptroller, 2025; [2025 Trailblazers](https://comptroller.texas.gov/about/media-center/news/20250318-texas-comptroller-glenn-hegar-celebrating-texas-transparency-trailblazers-1741726855325)). It posts a **downloadable check register that includes an item-description field** and a **live vendor-payment lookup** ([registers](https://www.tarrantcountytx.gov/en/auditor/accounts-payable.html); [lookup](https://vendorchecks.tarrantcounty.com/)).
- **Travis County**'s Vendor Payment Register ties each payment to the invoices and purchase orders it paid ([VPR](https://financialtransparency.traviscountytx.gov/VPR)).
- **Austin**'s eCheckbook covers check, ACH, and wire payments and is also a flat file on its open-data portal ([eCheckbook](https://financeonline.austintexas.gov/); [data](https://data.austintexas.gov/Budget-and-Finance/Austin-Finance-Online-eCheckbook/8c6z-qnmj)).

These publish at the check level: who got paid, how much, when, roughly for what. We did not find a Texas local government that publishes purchase-card transactions at the item level. Oklahoma posts state purchase-card purchases itemized ([OK](https://data.ok.gov/dataset/purchase-card-pcard-fiscal-year-2025)). We did not find a vendor that issues a virtual card per budget line.

## What the record shows about limits

1. **Capture is not disclosure.** SmartPay captures line-item detail; its published statistics are totals ([GSA](https://smartpay.gsa.gov/about/statistics/)).
2. **A receipt is not proof.** A 2008 GAO audit (GAO-08-333) of federal purchase cards found that 41% to 48% of sampled transactions at the agencies reviewed failed basic internal controls ([GAO-08-333](https://www.gao.gov/assets/gao-08-333-highlights.pdf)).
3. **Programmable payments are contested.** The House passed the Anti-CBDC Surveillance State Act 219–210 in July 2025 ([H.R.1919](https://www.congress.gov/bill/119th-congress/house-bill/1919)).

## What the platform does

Where a county publishes a payment feed, the platform ingests it. The platform publishes a coverage score: the share of spending published by feed versus reconstructed from documents.

For illustration only: a reconstructed line might read `INCENTIVES — $1,840,000` with no public document naming a recipient. A line with a published feed lists payee, amount, date and category for each payment.

Residents have started petitions on ideas like this — see [petitions](/petitions).

---

*Every factual claim above links to a primary source.*
