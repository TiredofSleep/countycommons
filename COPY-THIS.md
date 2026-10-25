# Copy this for your county

County Commons is free to copy. The code is MIT-licensed and the data is CC BY 4.0 ([what that means](/license)). Every county you see here runs on the same code. What makes each one different is one settings file and that county's own public records.

There are two ways to get one for your county.

## 1. Ask us to build it

Every U.S. county already has a starter page at [countycommons.us/us](https://countycommons.us/us). We build full sites — money trail, petitions, offices, elections — one county at a time, and requests move a county up the list.

- [Request your county](/feedback?kind=request) and tell us which county.
- If you have the county's budget, audit or meeting minutes, [send the document](/feedback?kind=document). Documents are the slow part, and the most helpful thing anyone can give.

## 2. Run your own copy

You don't need permission. You need a small server, some patience and your county's records.

**What it takes**

- A small Linux server (1 CPU and 1 GB of memory is enough) or any computer that can run Node.js 22 or newer.
- Your county's adopted budget as a PDF. An audit and a few months of meeting minutes help.
- A few evenings. The software is the easy part; reading the budget carefully is the real work.

**The steps**

- Get the code: [github.com/TiredofSleep/countycommons](https://github.com/TiredofSleep/countycommons). Download it, then run `npm install`.
- Put your own name, web address and contact in `config/network.json`. Links across the site follow that address.
- Create your county: `node pipeline/new-county.js polkar "Polk County" "Arkansas"` (use your county's name and a short key). It makes a blank settings file and an empty data folder under `data/tenants/<key>/`.
- Fill in the settings file: the county's towns, its elected officials, its meeting calendar and where its records live. `config/county.example.json` shows every field. County details belong in this file, not in the code.
- Put the county's PDFs in `inbox/<key>/` and run `node pipeline/register.js <key>`. It fingerprints each file so anyone can check later that it hasn't changed, and lists the new ones for you to describe.
- Run `node pipeline/ingest.js extract <file>` to pull out every dollar amount by page, then build the money trail from it. `node pipeline/ingest.js pin <doc-id>` finds the page each number is printed on.
- Run `node pipeline/verify.js data/tenants/<key>/corpus`. It checks that every total equals the sum of its parts, to the dollar, and the site shows that check next to every number.
- Run `npm start` and open `http://<key>.localhost:3000`. The county stays a "coming soon" page until its budget is loaded.
- Starter petitions for your county can go in `config/petitions/<key>.json` and be posted with `node pipeline/seed-petitions.js <key> --post`. Every petition says who started it.

The longer guides are in the code: [running several counties](https://github.com/TiredofSleep/countycommons/blob/main/docs/MULTI-COUNTY.md), [putting it on a server](https://github.com/TiredofSleep/countycommons/blob/main/docs/DEPLOY.md), and [the ground rules for county content](https://github.com/TiredofSleep/countycommons/blob/main/docs/COUNTY-CODE.md). Expect some rough edges — this is still being built. [Ask for help](/feedback?kind=problem) and we'll answer.

## What the license asks

Only credit: say your copy is based on County Commons and link back.

## What we ask, but can't require

These are the rules this site holds itself to. A copy doesn't have to keep them, but they are why people can trust it:

- **Cite everything.** Every number links to the public record it came from.
- **Facts on the pages, opinions only in petitions** — and every petition says who started it.
- **Keep residents' information separate and private.** Never sell it, never publish who signed what, never hand it to a funder or a government.
- **No campaigning.** No endorsing candidates or ballot measures, and no naming county staff who aren't elected.
- **Stay free.** No ads, no paywalls, no selling the data.

The full list is in [what this project will never do](/never).

## Where this is headed

The goal is for each county's site to belong to the people who live there — run by residents, open to everyone, and paid for in a way that can't be used to steer what it says. Copies are how that starts. If you run one, [tell us](/feedback?kind=add) and we'll link to it.
