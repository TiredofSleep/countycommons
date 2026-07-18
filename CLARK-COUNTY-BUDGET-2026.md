# Clark County, Arkansas — 2026 Budget (Ingested Corpus Document #1)

**Source:** Appropriation Ordinance 2025-21, "An Ordinance to Establish the Annual Operating Budget for Calendar Year 2026," adopted by the Clark County Quorum Court. Retrieved from artransparency.gov (state transparency portal copy of the county's filed ordinance); identical document posted at clarkcountyar.gov under County Clerk → County Budget 2026.
**Status:** Manually ingested from OCR of scanned ordinance. Figures below transcribed from the ordinance text; OCR artifacts corrected where unambiguous. This document is the seed of the Clark Commons budget engine corpus and the template for automated ingestion.
**Ingested:** July 2026.

---

## 1. The Big Picture — Where County Money Goes (All Funds)

Arkansas counties budget by fund. Clark County's 2026 ordinance appropriates across ~40 funds. The majors:

| Fund | 2026 Projected Revenue | 2026 Appropriated | Unappropriated Balance |
|---|---|---|---|
| **General Fund (1000)** | $8,000,703 | $6,829,201 | $371,431 (of 90% allowable) |
| **Road Fund (2000)** | $6,863,221 | $6,038,258 | $138,641 |
| **Sanitation/Solid Waste (3009)** | $3,067,887 | $1,899,263 | $861,835 |
| **EDCCC Tax Fund (3407)** — economic development sales tax | $1,844,538 | $1,844,538 | $0 |
| **General Reserve (1001)** | $1,695,369 | $0 | $1,525,832 |
| **County Library (3008)** | $1,284,951 | $469,288 | $687,168 |
| **9-1-1 Reserve (3409)** | $1,256,731 | $117,775 | $1,013,282 |
| **Emergency 911 PSAP (3020)** | $1,080,738 | $970,195 | $2,469 |
| **Jail Maintenance (3405)** | $769,594 | $393,750 | $298,884 |
| **Collector's Automation (3001)** | $687,931 | $257,289 | $361,849 |
| **Add'l Motor Fuel Tax (2003)** | $618,610 | $556,749 | $0 |
| **Landfill Investments (3402)** | $520,308 | $0 | $468,277 |
| **ARPA Revenue Replacement (1006)** | $471,142 | $471,142 | $0 |
| **Recorder's Cost (3006)** | $371,376 | $234,239 | $99,999 |
| **Jail Construction 2005 (3404)** | $304,266 | $270,141 | $3,698 |
| **Public Defender (3026)** | $310,421 | $98,590 | $180,789 |
| Various Fire Departments — sales tax (1802) | $45,921 | $45,921 | $0 |
| ~20 smaller special funds | — | — | — |

**Arkansas 90% rule context:** counties may appropriate only 90% of projected revenues for most funds (100% for certain federal/dedicated funds) — the "unappropriated balance" lines are partly this statutory cushion, partly genuine reserves.

## 2. General Fund by Department (the $6.83M)

| Dept | 2026 Appropriation |
|---|---|
| **Sheriff** | **$2,118,755** |
| **Jail** | **$676,423** |
| Assessor | $560,131 |
| District Court | $477,600 |
| Courthouse Maintenance | $416,460 |
| Prosecuting Attorney | $372,374 |
| County Clerk | $314,622 |
| Circuit Clerk | $306,550 |
| Juvenile | $177,917 |
| Treasurer | $177,591 |
| **Prisoner Food** | **$168,000** |
| County Judge | $168,446 |
| Quorum Court | $158,100 |
| OEM | $148,995 |
| Circuit Judge | $131,010 |
| Election Commission | $109,200 |
| Extension Office | $78,532 |
| Coroner | $76,780 |
| Health Department | $48,900 |
| Court Complex Building | $44,400 |
| Collector | $39,500 |
| Veterans Services | $26,390 |
| GIA – Social Services | $11,500 |
| Assessor's Late Fee | $10,700 |
| Rental Property | $6,000 |
| Board of Equalization | $3,075 |
| Paupers & Welfare | $1,250 |

**Public safety cluster (Sheriff + Jail + Prisoner Food alone): $2,963,178 — about 43% of the General Fund.** Add the special jail funds (maintenance $393,750 + construction $270,141) and 911 operations ($970,195 PSAP + $117,775 reserve) and county public safety spending across funds is roughly **$4.7M**.

## 3. Salary Schedule — The Deputy Pay Numbers (Founding Issue #1 Data)

From the ordinance's attached Class 3 base pay schedule:

**Sheriff's office:**
- Deputy Sheriff (line): **$43,398 – $46,498** (eight deputies listed, most at $43,398–$44,398)
- Deputy Sheriff – SGT: $45,648 and $50,927
- Investigators (5): $45,015 – $51,257
- Chief Deputy: $63,591 · Bailiff: $47,298
- Jailers (8): $36,338 – $37,338 · Jail Administrator: $43,285
- Sheriff (elected, ½ — he is also Collector): $36,071 per half

**911 dispatch:** $38,795 – $55,935 (10 dispatcher/matron positions) · Director $45,398

**Other benchmarks in-county:** Road truck drivers $33,288–$51,692, operators $37,788–$60,043; elected clerks/treasurer/assessor $65,530–$69,130; library director $54,733.

**The founding issue now has its number:** the sheriff's claim is that neighboring counties out-pay these $43–44K line-deputy salaries. The verification step for the platform: pull Garland, Hot Spring, Nevada, Pike, and Ouachita county salary schedules (same ordinance type, same public availability) and publish the side-by-side. That comparison table IS the deputy-pay issue's context page.

## 4. First Plain-Language Findings (Budget Analyst seed content)

Written the way the platform would serve them — cited, computed, non-advocating:

1. **What the county spends per resident:** General Fund $6.83M across ~21,000 residents ≈ **$325 per resident per year** for courthouse government + law enforcement + courts. All-funds appropriations total roughly $21M ≈ $1,000 per resident (roads and sanitation are the difference).

2. **Public safety is the biggest thing the county does.** ~43% of the General Fund; ~$4.7M across all funds. Any conversation about county priorities is mostly a conversation about this cluster.

3. **The fire number, with its honest caveat:** the county's "Various Fire Departments" sales-tax fund distributes **$45,921** for 2026 (DeGray FD's separate fund shows $0 requested for 2026, $28,600 in 2025). CAVEAT before anyone weaponizes this: rural Arkansas fire departments are typically funded primarily through fire protection districts' own millage/dues and city budgets — county pass-through is a slice, not the whole picture. The fire chief's founding issue needs the *complete* fire funding map (district budgets + city + county) before the platform frames any question. This is exactly the kind of context that separates a transparency engine from a gotcha machine.

4. **Economic development is a top-five line.** The EDCCC sales-tax fund passes through **$1,844,538** in incentives — more than the county appropriates for the jail, the library, or the entire fire pass-through. Residents may or may not know a dedicated sales tax does this; the platform's job is that they know, not what they conclude.

5. **Election year is visible in the budget:** Election Commission jumps from $33,750 (2025) to **$109,200** (2026) — extra help alone goes $5K → $45K. Elections cost real money.

6. **Large idle balances exist by design and by accumulation:** General Reserve holds ~$1.53M unappropriated; the 9-1-1 Reserve ~$1.01M; Library funds ~$883K combined unappropriated (including the Margie Lou Ballew bequest fund at ~$196K); landfill investments ~$468K. Some of this is the statutory 90% cushion, some is deliberate reserve, some is restricted-purpose money. The Analyst must explain fund restrictions before anyone reads "unappropriated" as "available."

7. **Debt service is small:** Road fund $121K + Sanitation $362K ≈ $483K/year. The county is not heavily leveraged.

8. **The quorum court itself:** 11 JPs at $300 per diem; the body's full budget (pay + health insurance + operations) is $158,100.

## 5. Corpus Gaps — Next Documents to Ingest

- [ ] Neighboring county salary schedules (Garland, Hot Spring, Nevada, Pike, Ouachita) — deputy pay comparison
- [ ] Complete fire funding map: fire protection district budgets, Arkadelphia FD (city budget), rural district dues/millage
- [ ] City of Arkadelphia budget (not found online — request from city hall; likely a counter visit)
- [ ] Arkadelphia Public Schools budget + millage breakdown
- [ ] Clark County millage rate sheet (assessor/collector) — the revenue side of the story
- [ ] Arkansas Legislative Audit reports (arklegaudit.gov) — actual vs. budgeted, findings
- [ ] Quorum court minutes 2025–2026 — amendments to this ordinance
- [ ] Prior-year ordinance (2025) for full change detection

**Money-trail honesty note for the platform:** appropriations (this document) are layer one. Actual expenditures (audits, treasurer reports) are layer two — the ordinance's own worksheets helpfully include 2025 YTD actuals, already giving partial layer two. Transaction-level detail (which vendor got which check) is layer three: county claims/check registers, obtainable under Arkansas FOIA but not posted online. "Every money trail of every tax dollar" is built in that order, and the platform should say plainly which layer any number comes from.
