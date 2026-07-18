# Clark Commons — Civic Coordination Platform for Clark County, Arkansas

Concept document. Working title "Clark Commons" (rename freely). First instance tailored to Arkadelphia and Clark County; architecture designed to generalize to any county the way CustomPOS generalizes to any trade.

Companion documents: OZARK-OPERATIONS.md (operational documentation pattern), TRAINING-MODE.md (contextual AI help pattern), WORKER-RIGHTS.md (ethical infrastructure pattern). This platform inherits the same stance: free, transparent, anti-extractive, built as a demonstration that this kind of thing can exist.

---

## 1. What This Is

A web platform where Clark County residents can:

1. **See where the money goes.** County, city, and school budgets translated by AI from government documents into plain language anyone can explore.
2. **Say what they want.** Yes/no and statement-based issues on local decisions, scoped to city, county, or federal level.
3. **Find their common ground.** AI-assisted consensus mapping (Polis-style) that surfaces what the community actually agrees on, instead of amplifying the loudest fights.
4. **Show their strength in numbers.** Verified vote counts officials can cite when arguing for what residents demonstrably want.
5. **Participate without being online.** Paper, SMS, and library/counter kiosk channels so the platform reflects the county, not just the county's Facebook users.

What this is NOT:

- Not binding votes. The platform produces *signal*, officials retain authority. This is a feature: it sidesteps the legitimacy fights that kill civic tech, while still creating public pressure and public cover.
- Not opposition infrastructure. The design assumption, validated by conversations with the sheriff, city manager, and fire chief, is that local officials often already want what residents want and lack the demonstrated public support to act. The platform manufactures political cover, not political conflict.
- Not an engagement machine. No streaks, no infinite scroll, no notification bait. The anti-extraction ethic applies to attention as much as money.

## 2. Why This Can Work Where Civic Tech Usually Fails

The research is clear on why most civic platforms die, and Clark County's situation answers each failure mode:

**Failure mode 1: No implementation path.** Polis found consensus in Taiwan and it became law because the government committed to act on results. The same tool has gone mostly unused in the US because the challenge is often not a lack of consensus, it is a governance system that grants multiple stakeholders veto power, combined with political incentives that discourage acting on it. **Clark County answer:** start with officials who have already voiced the constraint out loud. The sheriff wants deputy pay competitive with neighboring counties. The fire chief wants funding that doesn't lean on volunteers. The city manager thinks food-as-utility has merit and says the city would prefer to fix and donate buildings for public use. Each of these is a pre-identified issue where demonstrated public support converts directly into official action. Launch with those, not with abstract engagement.

**Failure mode 2: Self-selection.** Online-only platforms capture the already-engaged. The 2026 trend research is blunt: Online alone rarely delivers a representative picture, so hybrid approaches take the lead — with offline inputs digitized into usable data, and Participation data is increasingly weighed against census data to see who's missing — and why. **Clark County answer:** hybrid from day one (Section 5), and a public representativeness dashboard that shows who's participating versus census demographics — honesty about the gap instead of pretending it away.

**Failure mode 3: Platforms amplify fights.** Comment sections reward the loudest. **Answer:** Polis-style mechanics where users can write comments, or they can agree, disagree or pass the comments of other users. Critically, they can never reply to them. No reply threads means no dogpiles. The Taiwan experience found this gamified finding consensus — "People compete to bring up the most nuanced statements that can win most people across". The scoreboard rewards bridge-building instead of dunking.

**Failure mode 4: Civic content is boring.** Nobody reads a 200-page budget PDF. **Answer:** AI does the reading (Section 4). The resident sees "your county spends $X per household on roads, $Y on the jail, here's how that compares to Nevada and Hot Spring counties" — not line items.

**Precedents that prove the pieces work:**
- Washington, D.C.'s tech office is crediting its civic-engagement platform with helping city officials to better understand how residents feel about artificial intelligence — Deliberation.io, launched July 2025, built with MIT GovLab and Stanford, fully anonymous participation, now expanding to more topics. It's open source and worth evaluating as a component.
- vTaiwan reached 200,000 individuals on its mailing list and produced real regulation on Uber, online alcohol sales, and revenge porn.
- Lahti, Finland ran city-wide participatory budgeting where residents could first submit their ideas and then vote on how the budget should be distributed and, critically for our purposes, anyone could also vote in local libraries — the budget doubled the next year because the pilot succeeded.
- In Washington County, Wisconsin, County Executive Josh Schoemann took the lead in reallocating 15% of his small county's entire operating budget using a priority-based budgeting framework. Small counties can move real money when priorities are made visible.
- Citizen-built tools already exist that convert audio and video from city council and school board meetings into concise, nonpartisan summaries and track not just what local officials decided but whether city staff actually followed through — validation that solo/small builders are shipping exactly this category of tool right now.

## 3. The Money Trail: Budget Transparency Engine

This is the foundation layer and the first thing built, because it works even with zero community adoption — a budget explorer is useful to one person.

**What gets ingested:**
- Clark County budget (quorum court appropriations, published annually, public record under Arkansas FOIA)
- City of Arkadelphia budget
- Arkadelphia Public Schools budget and millage
- Caddo Valley, Gurdon, and other municipal budgets as available
- County millage rates and where each mill goes
- Meeting minutes and agendas (quorum court, city board, school board)
- Audit reports from Arkansas Legislative Audit (published online for every county)

**What AI does with it:**
- Plain-language translation of every budget section: what it funds, what changed from last year, what it costs per household
- Comparisons to peer counties (Nevada, Hot Spring, Pike, Ouachita) so "underfunded" and "overfunded" become checkable claims instead of vibes
- Change detection: every new budget or amendment diffs against the prior version, and material changes generate a plain-language alert
- Meeting summaries: agendas and minutes summarized nonpartisan, following the Aware/CivicSummary pattern, with follow-through tracking — did the thing that was voted on actually happen
- Q&A: residents ask "how much do we spend on the jail" or "what would a 1-mill increase for the fire department actually cost me" and get sourced answers with links to the underlying documents

**The discipline that makes it credible:** every AI-generated claim links to its source document and page. The AI translates and never editorializes. When a number is ambiguous or a document is missing, the platform says so. Neutrality here is what earns the right to run the voting layer.

**Why officials should love this rather than fear it:** the fire chief who says he's underfunded currently has no easy way to show residents what underfunded means. The budget engine gives him the chart. Transparency tools threaten officials with something to hide and empower officials with a case to make. Our launch partners are in the second category — that's why they're launch partners.

## 4. The Voice Layer: Issues, Votes, and Common Ground

**Issue types:**

1. **Yes/No issues.** Anyone can raise one, scoped to a jurisdiction. "Should the quorum court raise deputy pay to match Garland County?" Clean counts, shareable cards for social media (the original seed of this whole concept — that shareable unit survives as the viral surface of the platform).

2. **Deliberations (Polis-style).** For anything genuinely contested. Participants submit tweet-length statements and vote agree/disagree/pass on others' statements. No replies, ever. The clustering engine — Polis uses clustering algorithms to analyse responses and generate real-time reports — maps the opinion space and surfaces the statements that win support *across* groups, not just within them. The platform deliberately nudges participants towards greater understanding of alternative viewpoints by strategically presenting statements from people who hold different views, which is how Taiwan repeatedly discovered that a silent, overwhelming majority actually agreed beneath a loud fight.

3. **Budget priority exercises.** Annual: "here are the discretionary categories, allocate your 100 points." Produces a community priority map officials can put next to the actual budget. This is the participatory-budgeting-lite mode that requires no official commitment to start and matures into real PB if a body ever commits actual dollars to community allocation.

**The common ground engine is the product.** Vote counts are commodity; every poll does counts. What Polis-class clustering adds is the map: how many distinct opinion groups exist, what each believes, and — the payoff — which statements bridge them. A quorum court justice looking at "82% of all groups, including the group that opposes new taxes, agrees deputies should be paid at parity with neighboring counties" has something no town hall shouting match ever produces.

**AI's referee role, precisely bounded:**
- Cluster and map opinions (math, not judgment)
- Summarize each opinion group's position in language that group would accept as fair
- Surface bridge statements
- Translate between the budget engine and the issues ("this proposal would cost roughly X per household based on the current millage base")
- Flag duplicate issues and suggest merging
- Draft neutral issue framings when a submitter's draft is loaded ("Should we stop wasting money on..." → offered neutral rewrite, submitter chooses)

AI explicitly does NOT: decide outcomes, weight votes, remove content on its own authority (it flags for human moderation), or generate persuasive content for either side of any issue. The moderation authority stays human — you at first, a small cross-partisan resident council as soon as the platform matters enough for anyone to accuse it of bias. Publish the moderation log. The neutrality is only as credible as its audit trail.

## 5. Participation Beyond Social Media

The county has plenty of residents who will never install an app or engage on Facebook. They're disproportionately older, lower-income, or simply private — and they're exactly the people whose absence makes online polls dismissible. Hybrid isn't an accessibility gesture; it's what makes the numbers citable.

**Channels:**

1. **Web** (mobile-first, no app required, works on any phone browser)
2. **SMS.** Text a shortcode to receive the current open issues and vote by reply. Twilio infrastructure you already run for Ozark notifications. This is the highest-leverage channel for non-social residents: nearly everyone texts.
3. **Paper ballots at trusted counters.** Library, senior center, county clerk's counter, churches that opt in — and yes, the counter at Ozark Cleaners. Paper responses are entered by volunteers (with a distinct verification tier so paper entry is auditable). Lahti proved library voting materially changes who participates.
4. **Kiosk mode.** A cheap tablet in browser kiosk mode at the library and any willing public counter. Same web platform, no account needed for Tier 0 participation.
5. **Meeting mode.** A projector view for quorum court or city board meetings: live issue results, the opinion map, the bridge statements. This turns the platform into furniture at the meetings that already exist rather than a replacement for them.
6. **Print digest.** A monthly one-pager — current issues, results, budget alerts — formatted for the Daily Siftings Herald, church bulletins, and a stack at the counter. Costs almost nothing, reaches the never-online.

Every channel feeds the same issue and the same result, tagged by channel so the representativeness dashboard can show it.

## 6. Identity and the Certainty Tiers

The core tension in all civic tech: verification fights manipulation but kills accessibility; anonymity invites bots but protects honest speech in a small town where your employer, pastor, and customers can all see your vote. The tier system resolves this by refusing to pick one point on the tradeoff — participants pick their own, and results display by tier.

**Tier 0 — Open.** No account. Sentiment only. Displayed, never cited as resident opinion. This is the zero-friction on-ramp.

**Tier 1 — Verified human.** Phone verification (SMS code). Kills casual bots. One phone, one voice.

**Tier 2 — Verified resident.** Address verification within Clark County (mailed postcard code, utility bill shown at a partner counter, or geocoded address attestation with spot-audit). This is the tier officials cite: "verified Clark County residents."

**Tier 3 — Verified voter.** Matched against the public Arkansas voter registration roll (name and address matching against the public file — the roll is public record; matching is done locally, never sold, never shared). This is the tier that makes politicians sit up, because these are demonstrably the people who show up in March and November.

**Display rule:** every result shows counts per tier, always. "412 total · 301 verified humans · 214 verified residents · 156 registered voters." No tier is hidden, no tier is silently excluded. Observers apply their own standard of proof — which defuses the "your numbers are fake" attack, because the skeptic can simply look at the tier they trust.

**Privacy architecture (non-negotiable):**
- Verification data and vote data stored separately; the join happens at count time, and displayed results never expose individual identity
- Public results are aggregate-only; below a floor (e.g., 20 votes in a tier), tier counts display as ranges to prevent deanonymization in a small population
- Individual votes are visible to no one — not officials, not moderators, not you. In a town of 10,000, vote privacy isn't a nice-to-have; it's the precondition for honest participation
- Data is never sold, never shared, never used for anything but counting. Written into the platform's public charter. This is the anti-Nextdoor, anti-adtech stance and it should be loud.

Participants can raise their own tier whenever they choose. The ask is framed exactly as what it is: "verify more, and your vote carries more certainty when officials look at the numbers." Information offered as a deliberate trade for civic weight — never harvested.

## 7. Engagement Design — The Ethical Version

The request was "drive engagement on more issues than they intended when they signed up." There's a manipulative version of that sentence and an honest one, and the platform must be built on the honest one, because the whole edifice rests on trust and on the anti-extraction stance. Attention is the thing social platforms extract; a civic platform that plays those games is extracting civic energy instead of money, and people can smell it.

**What we don't build:** streaks, badges for volume, engagement-ranked feeds, push notifications engineered for compulsion, infinite scroll, outrage-amplifying sort orders.

**What we build instead — expansion through genuine relevance:**

1. **Adjacency surfacing.** Voted on deputy pay? The platform shows what else touches that budget line: the jail budget, the millage structure, the county's comparison to neighbors. "This issue is connected to these two others" is navigation, not manipulation — the connections are real and sourced.
2. **Cluster-aware discovery.** The consensus engine knows which opinion group you land in. It can honestly say "people who voted like you are also weighing in on the fire department question" — and, per the Polis ethic, it also shows you where your group *disagrees* internally, which is the moment people get genuinely curious.
3. **Consequence follow-through.** When an issue you voted on gets a result — quorum court votes, budget passes, building gets donated — you get one notification: here's what happened. Closing the loop is the single strongest driver of return participation in every participatory budgeting study, and it's also simply owed to participants.
4. **The digest rhythm.** One weekly email/SMS digest, opt-in, everything in one place. Predictable, calm, done.
5. **Issue lifecycles.** Issues open, run, close, and produce an outcome page. Nothing festers forever. Scarcity of open issues keeps each one meaningful.

The bet: in a county of ~21,000, relevance is easy — everything genuinely does affect everyone. You don't need dark patterns when the sheriff's staffing actually determines how fast someone comes when you call.

## 8. Launch Sequence

**Phase 0 — Budget engine only (build alongside CustomPOS wind-down of heavy dev).**
Ingest the county, city, and school budgets. Ship the explorer and Q&A. Useful at n=1 users. This also produces the content foundation every later issue links to. Show it privately to the city manager, sheriff, and fire chief; their reactions shape Phase 1.

**Phase 1 — Three founding issues, officials as partners.**
Launch the voting layer with exactly three issues, each pre-agreed with the relevant official as something they'd act on given demonstrated support: deputy pay parity (sheriff), fire department funding structure (chief), food-as-utility pilot building (city manager). Paper + SMS + web from day one. The officials announce it, not just you — the platform arrives as civic infrastructure, not as one businessman's project.

**Phase 2 — First consensus win.**
Drive one issue all the way through: platform signal → official cites it → body acts → outcome page closes the loop → print digest and local paper carry the result. One completed loop is worth more than ten thousand signups. It is the existence proof.

**Phase 3 — Open issue creation.**
Residents raise their own issues, moderation council seats filled, deliberation mode enabled for the first genuinely contested topic.

**Phase 4 — Generalize.**
Extract the county-specific config (data sources, jurisdictions, officials, tier verification methods) into a template, exactly the CustomPOS kernel/template pattern. Any county with one motivated builder and one willing official can stand up their own instance. Free, open source, self-hosted or cheaply hosted. The demonstration propagates or it doesn't; the Clark County instance succeeds on its own terms either way.

## 9. Costs and Sustainability

- Hosting: static-first architecture, one small VPS, low hundreds/year
- AI: budget ingestion is bursty (heavy at budget season, light otherwise); Q&A and clustering at county scale is tens of dollars monthly at realistic usage; Polis clustering itself is open source and cheap math
- SMS: Twilio costs scale with participation; at 1,000 active SMS users with weekly digests, roughly $50-100/month
- Paper/print: near-zero, volunteer-entered
- Funded as an Ozark/CustomPOS-ecosystem demonstration project, same as everything else. No ads, no data sales, ever — the moment a civic platform monetizes attention or information, it becomes the thing it was built against. If it outgrows pocket funding, the honest options are municipal partnership (the county pays hosting the way it pays for its website) or transparent donations.

## 10. Honest Risks

- **The small-town glass house.** You run a business here. Moderation decisions will anger someone who buys dry cleaning from you. The resident moderation council isn't governance theater — it's your liability shield, and it should exist before the first controversial issue, not after.
- **Capture attempts.** The first time an issue touches money (and deputy pay touches taxes), motivated actors will organize. The tier system blunts raw bot inflation, but organized real residents dominating an issue is not manipulation — it's politics working. The representativeness dashboard is the honest answer: show who showed up.
- **Official cold feet.** An official who partners at launch can retreat when a result cuts against them. Pre-agree the founding issues precisely because they're ones where the officials want the pressure. Expand into contested territory only after the trust pattern is established.
- **Election law adjacency.** Issues that shade into ballot measures or candidate races trigger Arkansas election and campaign finance law. Bright-line policy at launch: no candidate issues, no active-ballot-measure issues. Revisit with actual legal advice before ever relaxing it.
- **The maintenance question.** Your model is build-then-light-maintenance. The budget engine and issue mechanics fit that. The moderation load is the one component that doesn't fully automate — it's why the council, the issue lifecycle limits, and the no-replies architecture all exist: they're load-shedding by design.

## 11. Success Criteria

Per the builder's definition: success is that the platform is **capable of the target**, and the target is one completed loop — community signal, visibly cited by an official, converting into an action that residents can see on an outcome page. Everything past that belongs to the beyond.

Capability checklist:
- [ ] Budget engine live with all three jurisdictions' current budgets, sourced and linked
- [ ] All five participation channels functional (web, SMS, paper, kiosk, digest)
- [ ] Tier system live with at least Tiers 0-2 verifiable
- [ ] Consensus/clustering engine producing opinion maps on a real issue
- [ ] Three founding issues launched with official partners
- [ ] Moderation charter and log public
- [ ] One loop closed

When that list is done, the platform is capable. What the county does with it is the county's.

---

# PART TWO — Stakeholder Walkthroughs, Channels, and Engineering Plan

## 12. Walkthrough: The Sheriff

**His problem:** deputies leave for neighboring counties that pay more. He knows it, the county judge knows it, but the quorum court appropriates his budget, and a JP voting for higher pay needs cover with taxpayers.

**Arkansas structure note that shapes everything:** the sheriff doesn't set his own budget. The **county judge** is the county executive; the **quorum court** (justices of the peace) is the legislative body that adopts appropriations, typically finalizing the next year's budget in the last quarter of the year. The sheriff's real audience is the judge and the JPs. The platform's deliverable for him is ammunition for that room.

**What he actually receives:** a one-page printable results packet. "Deputy pay parity with neighboring counties: 412 total responses · 301 verified humans · 214 verified Clark County residents (78% support) · 156 verified registered voters (81% support)." Methodology footer, QR to the full results. He carries paper into the quorum court meeting because that room runs on paper.

**What he never has to do:** create an account, moderate anything, defend the platform's existence, or touch a computer. He was consulted on the question's wording before it opened; after that his only job is receiving the packet.

**What he's afraid of, and the design answer:**
- *"This becomes a place to attack my department."* Moderation charter bright lines at launch: no issues about named individuals' conduct, no candidate issues. Department **policy and funding** questions are in scope; personnel grievances are not.
- *"What if the vote goes against me?"* He signed off on the question wording, so a "no" is information he chose to seek — and a platform that only ever produces results officials like is worthless to him anyway. The credibility of the 81% depends on the possibility of a 30%.
- *"I don't want to look like I'm behind this."* He isn't. It launches as resident infrastructure with multiple official partners, covered by the paper, hosted by no agency.

**His timing:** results must exist before budget deliberations in the fall. This sets the whole project calendar (Section 16).

## 13. Walkthrough: The City Manager

**His problem:** "hands tied" — he can see sensible moves (fixing and donating buildings for public use, the food-as-utility concept) but bringing them to the board without demonstrated public support spends political capital he has to ration.

**What he needs that residents don't:** the **reverse flow**. Residents raising issues is half the platform; the city posing questions TO residents is the other half. Issue type: *Official Question* — "The city is considering donating the building at [address] for a community food production pilot. Should we proceed?" He gets structured public input on his actual decision, before the board meeting, instead of three angry speakers at the podium after.

**His institutional concerns, and the answers:**
- *Records law.* Anything an official does on the platform should be assumed public. The design already complies: officials never have private accounts or private data access — they consume public results and announce public questions. Nothing to FOIA that isn't already published.
- *ADA/accessibility.* If the city ever points residents to the platform, accessibility stops being optional. Web targets WCAG AA; the phone, paper, and counter channels are the deeper answer — an inaccessible-web fallback always exists.
- *Association risk.* The city never runs, funds, or endorses the platform in Phase 1. It cites results the way it would cite a newspaper poll — no procurement, no liability.

**His food-as-utility flow, concretely:** (1) He identifies a candidate building. (2) A specific one-page proposal is drafted — what the pilot is, what it costs the city (a building it already wants off its books), who operates it. (3) The proposal goes up as an Official Question with the full document attached. (4) Four weeks of multi-channel input. (5) He walks into the board meeting with the packet. (6) Outcome page closes the loop either way. This is Phase 2's candidate for the first completed loop.

## 14. Walkthrough: The Resident Who Is Broke and Out of Work

The honest version first: someone choosing between the light bill and groceries is not lying awake wondering how to weigh in on millage policy. If the platform's front door assumes civic enthusiasm, it will collect the comfortable and miss the people budget decisions hit hardest. So for this resident, the platform gives before it asks.

**The Help Finder is their front door.** A Clark County assistance directory — SNAP office, LIHEAP utility assistance, food pantries and their hours, church assistance programs, unemployment filing, Medicaid enrollment, the housing authority — navigable three ways: web, AI Q&A ("my electric is about to be cut off, what exists?"), and SMS: text **HELP UTILITIES**, **HELP FOOD**, **HELP RENT** and get back the two or three real options with phone numbers and hours. This costs almost nothing to build, is genuinely useful on day one, and is the most defensible thing on the platform — nobody attacks a food pantry directory.

**Their participation constraints, designed for:**
- *No smartphone or no data plan:* SMS channel is fully functional on a $20 flip phone. Every vote, every help lookup, works by text.
- *Prepaid phone, counted texts:* default rhythm is one issue text per week, never more; STOP always honored; no chatter.
- *No home internet:* library kiosk and paper ballots at counters they already visit (library, senior center, churches, the utility payment window if the city allows it).
- *No fixed address:* Tier 2 residency verification accepts partner-counter attestation — a librarian or clerk who knows the person confirms they're local. Shelter and PO box addresses accepted. Housing status must never gate having a voice.
- *Reading level:* all public text targets roughly 6th–8th grade. The AI's translation job includes this. The budget engine's "what does the county spend on X" answers must be readable by everyone the budget governs.
- *Time poverty:* a vote takes one text reply. Total time cost: fifteen seconds.

**And their voice shapes the agenda, not just the answers:** every paper ballot and the SMS menu include an open prompt — "What should the county be working on?" Those responses feed issue creation. If the platform only ever votes on questions raised by property owners and officials, it has failed this resident even if she can technically vote.

## 15. Channel Specifications

### 15.1 SMS (the backbone channel)

- **Join:** text CLARK to the platform number → reply with ZIP to confirm county → subscribed at Tier 1 (phone-verified by definition).
- **Weekly issue message:** `CLARK COMMONS: Should the county raise deputy pay to match neighboring counties? Reply 1 YES, 2 NO, 3 SKIP. Details: [short link]. Reply STOP anytime.` One issue per message, one message per week, maximum.
- **Menu (reply HELP):** RESULTS (latest closed-issue results), ISSUES (currently open), HELP FOOD / HELP RENT / HELP UTILITIES (assistance directory), STOP.
- **Vote handling:** reply digits map to the open issue last sent to that number; votes changeable until close by replying again; confirmation reply for every vote (`Got it — you voted YES on deputy pay. Closes Oct 14.`).
- **Compliance:** Twilio A2P 10DLC campaign registration is mandatory prep work (real lead time, weeks not days). Non-marketing civic use case; still requires registration.
- **Cost model:** at 1,000 subscribers × ~5 messages/month ≈ $40–80/month. Scales linearly and predictably.

### 15.2 Email

- **Weekly digest:** open issues, latest results, one outcome update, budget alert if any. Plain HTML, readable in every client.
- **One-click voting:** each issue in the digest carries YES/NO links containing a signed single-use token (participant + issue). Clicking casts the vote and lands on a confirmation page where it can be changed until close. No passwords, no login — magic-link auth throughout.
- **Tier:** email alone is Tier 1 once the address is confirmed; Tier 2+ per the verification paths.

### 15.3 Paper

- **Monthly ballot sheet:** all issues open during that window, fill-in boxes, optional name/address block (blank = Tier 0, completed = eligible for Tier 2 attestation), the open "what should the county work on?" line. One sheet, both sides, large print.
- **Drop points:** library, senior center, partner churches, Ozark Cleaners counter, any counter that says yes.
- **Entry:** volunteers key ballots in batches; every batch gets an ID, location, enterer, and count; 10% of batches double-entered as audit. Paper-inclusive issues need 4–6 week windows to span the monthly cycle.

### 15.4 Kiosk

Cheap tablet, browser kiosk mode, auto-resets between users, Tier 0 participation with no signup, QR code at the end to continue on their own phone. Library first; anywhere willing after.

### 15.5 Print digest

Monthly one-pager generated from the same data as the email digest, formatted for the Daily Siftings Herald, church bulletins, and counter stacks. Zero-marginal-cost reach into the never-online population.

## 16. Engineering Plan

### 16.1 Architecture

- **Server:** one small VPS. Server-rendered HTML (fast on old Android browsers, WCAG AA), minimal JavaScript. SQLite to start (county scale never threatens it; migrate to Postgres only if federation demands it).
- **Integrations:** Twilio (SMS webhooks), transactional email provider, Anthropic API for batch AI jobs, HTML-to-PDF for packets and digests.
- **AI pipeline is batch, not interactive-first:** budget ingestion (PDF → structured data → cited plain-language summaries) runs as offline jobs, heavy at budget season, near-idle otherwise. Q&A serves from the pre-processed corpus with retrieval, so per-question cost stays in pennies. Nightly scheduled jobs handle: new-document ingestion, meeting-minutes summarization, moderation-queue pre-screen (flags only — humans decide). This is the legitimate version of "ClaudeCode reviews it every night": scheduled batch API jobs against the corpus, not an interactive agent.
- **Privacy architecture in code, not policy:** contacts and verifications live in a separate encrypted store from votes; the join occurs in memory at tally time; public pages render aggregates only, with tier counts under 20 displayed as ranges. Moderation log is append-only and public. Nightly backups.

### 16.2 Data model (core tables)

`participants` (id, created_at, origin_channel) · `contacts` (participant, type phone/email, value — separate store) · `verifications` (participant, tier, method, evidence_ref, verified_at — separate store) · `issues` (id, type yesno/deliberation/priority/official_question, scope, status, opens, closes, official_partner, neutrality_review_ref) · `statements` (issue, text, author, status) · `votes` (issue, participant, value, channel, cast_at — unique per issue+participant) · `paper_batches` (id, location, entered_by, count, audit_status) · `outcomes` (issue, official_action, date, source_link) · `moderation_log` (public, append-only).

### 16.3 Issue lifecycle — the operational flow

1. **Draft** — from a resident submission, an official partner, or the open-prompt pipeline.
2. **AI neutrality pass** — loaded framings get a suggested neutral rewrite; submitter chooses; both versions logged.
3. **Human review** — you (later, the council) approve against the charter's bright lines.
4. **Partner sign-off** — founding and Official Question issues get wording sign-off from the relevant official *before* opening. This is what makes the result actionable instead of ignorable.
5. **Open + announce** — web page live, slotted into the weekly SMS, next email digest, next paper ballot, kiosk rotation.
6. **Voting window** — 3 weeks minimum web/SMS/email; 4–6 weeks when paper-inclusive; windows for budget-relevant issues back-planned from quorum court and board meeting dates.
7. **Close** — results page auto-generates with full tier breakdown and channel breakdown.
8. **Packet** — one-page PDF for the official: question, counts by tier, methodology footer, QR link.
9. **Delivery** — packet to the official before the relevant meeting; platform notes the meeting date publicly.
10. **Outcome tracking** — what the body actually did, sourced to minutes.
11. **Loop-closed notification** — one message to everyone who voted: here's what happened.
12. **Archive** — permanent public record: question, result, outcome.

### 16.4 Weekly operations runbook (steady state)

- Moderation queue review: target under 30 minutes (AI pre-screen flags; human decides; log publishes).
- Weekly SMS + email send: automated; five-minute verification pass.
- Paper batch entry: volunteer task on pickup days; your involvement is spot-audit only.
- Outcome updates: ~30 minutes after each public meeting (later semi-automated from minutes ingestion).
- **Total steady-state target: under 3 hours/week**, honoring the build-then-light-maintenance constraint. The no-replies architecture, issue lifecycles, and moderation council aren't just features — they're the load-shedding that makes this number real.

### 16.5 Phase 0 prep checklist (before meaningful code)

**Documents to obtain:**
- [ ] Clark County current + prior year budget (county clerk / quorum court records)
- [ ] City of Arkadelphia budget
- [ ] Arkadelphia Public Schools budget and millage breakdown
- [ ] Arkansas Legislative Audit reports for the county and city (published online)
- [ ] Millage rate sheet (assessor/collector)
- [ ] Voter file access procedure (public record; county clerk or Secretary of State)

**Conversations to hold:**
- [ ] **County judge** — the county executive; without his at-least-neutrality, quorum court traction is uphill. He belongs on the founding-partner list alongside the three you have.
- [ ] Sheriff — final wording of the deputy-pay question; soft commitment to carry the packet.
- [ ] City manager — food-as-utility building candidate; Official Question interest.
- [ ] Fire chief — funding question wording.
- [ ] One or two quorum court JPs — the actual vote-casters; learn what evidence moves them.
- [ ] Library director — kiosk, paper drop point, entry volunteers.
- [ ] Daily Siftings Herald — digest carriage.

**Legal/administrative:**
- [ ] Entity decision (under 7Site LLC vs. separate entity) + liability insurance question
- [ ] Privacy policy + moderation charter drafted (charter *before* first controversial issue)
- [ ] One lawyer consult: Arkansas election-law bright lines, records-law posture
- [ ] Twilio A2P 10DLC registration started (lead time!)
- [ ] Domain + phone number secured

### 16.6 Build milestones and the calendar that binds them

Quorum courts adopt next-year appropriations late in the calendar year. Working backward: **packets must exist by the October/November budget meetings → voting windows run September–October → launch August–September → build runs now through August.** The deadline is real and external.

- **M1 — Budget engine + Help Finder** (1–2 weeks): ingestion pipeline, explorer, Q&A, assistance directory. Ships alone; useful at n=1.
- **M2 — Issues + web voting + Tiers 0–1** (1–2 weeks): magic-link auth, results pages.
- **M3 — SMS + email channels** (1 week; 10DLC approval is the long pole — start it in Phase 0).
- **M4 — Paper + kiosk + digests** (1 week): ballot generator, batch entry, PDF digest.
- **M5 — Tier 2/3 verification** (1–2 weeks): postcard codes, counter attestation, voter-file matching.
- **M6 — Official packets + outcome tracking** (3–5 days).
- **M7 — Deliberation/clustering** (2 weeks; Phase 3 feature — evaluate embedding open-source Polis before building clustering in-house; yes/no issues need none of it and everything above ships without it).

Roughly 8–10 weeks of ClaudeCode-accelerated part-time build — which lands launch inside the window if Phase 0 starts now. M7 deliberately trails the launch; the founding issues are all yes/no.

### 16.7 What would kill this, restated as engineering requirements

- A privacy breach in a town of 10,000 is unrecoverable → separation architecture and aggregate-only rendering are launch requirements, not hardening tasks.
- A manipulated result cited publicly then debunked is nearly as fatal → tier display, channel tagging, and paper batch audits ship in v1.
- Founder-as-bottleneck breaks the maintenance model → runbook under 3 hrs/week is a design constraint every feature is tested against.
- Missing the budget calendar makes year one a demo instead of a demonstration → M1–M6 before September is the commitment that matters.

---

# PART THREE — Stakeholder Doctrine, Code Structure, and Operational Rhythm

## 17. Stakeholder Doctrine (named, with approach per person)

Known officeholders as of mid-2026: **Troy Tucker, County Judge** (term expires 12/31/2026 — election year). **Jason Watson, Sheriff and Collector**. **Randy Hill, District Judge** (judicial, not budgetary — but a respected courthouse figure and an existing personal relationship). City manager and fire chief as previously discussed.

**The Tucker doctrine — deliver, don't pitch.** Tucker is transactional and cold: no performed enthusiasm, decides on his own terms, tracks who wants something from him. Twenty years of clean counter transactions at Ozark is standing credibility — preserve it by never becoming a favor-asker. Operational rules:

1. **Route the first loop around him entirely.** Food-as-utility runs through the city manager and city board — no quorum court involvement. Close that loop first.
2. **He encounters results, not proposals.** The first time Clark Commons enters his awareness, it should be as an accomplished fact — a closed city loop, or the sheriff's packet landing at quorum court with numbers that can't be waved off.
3. **Zero ask attached.** Packets are handed over as information. Cold people respond to artifacts that already matter to their job, delivered by someone who wants nothing.
4. **Election-year logic works for us:** "residents demonstrably want X and I delivered X" is usable to an incumbent. Let him discover that use himself.

**Randy Hill — the ambient read.** Not a budget stakeholder; is a warm relationship and a window into how the courthouse circle will receive this. A casual mention of the budget explorer during guitar, and his reaction, is Phase 0 intelligence at zero cost. Never position him as a channel to Tucker — that converts a friendship into lobbying and burns both.

**Quorum court JPs — the audience.** They cast the appropriation votes. One or two early conversations to learn what evidence moves them; thereafter they receive packets. **Sheriff Watson — the first packet carrier.** **City manager — the first loop.** **Fire chief — the second issue.**

**Prep checklist update:** the FY2026 county budget is already posted on clarkcountyar.gov — the budget engine's first source document requires a download, not a records request.

## 18. Code Structure

Follows the CustomPOS discipline — config-driven kernel, county specifics isolated in configuration, boring proven components:

```
clark-commons/
├── config/
│   ├── county.json          # THE generalization seam: jurisdictions, officials,
│   │                        #   meeting calendar, data sources, tier methods
│   └── charter/             # moderation charter, privacy policy, bright lines
│                            #   (versioned in repo = publicly auditable)
├── server/                  # one process, server-rendered pages
│   ├── app.js
│   ├── routes/              # pages, vote endpoints, admin/moderation UI
│   ├── channels/
│   │   ├── sms.js           # Twilio webhook in/out, menu state machine
│   │   ├── email.js         # digest send + signed vote-token handling
│   │   └── paper.js         # batch entry UI + audit sampling
│   ├── tally.js             # THE ONLY module that joins votes to verifications;
│   │                        #   emits aggregates with tier floors — nothing else
│   │                        #   ever touches both stores
│   └── moderation.js        # queue, decisions, append-only public log
├── pipeline/                # nightly batch jobs (cron), all AI lives here
│   ├── ingest.js            # inbox/*.pdf → structured budget JSON + source refs
│   ├── summarize.js         # plain-language passes, cited, reading-level checked
│   ├── minutes.js           # meeting minutes → nonpartisan summaries → outcome
│   │                        #   candidates flagged for human confirmation
│   ├── prescreen.js         # moderation pre-flags (flags only, never decides)
│   ├── digest.js            # weekly email + monthly print PDF
│   └── packets.js           # one-page official PDFs on issue close
├── data/
│   ├── civic.db             # SQLite: issues, statements, votes, outcomes,
│   │                        #   paper_batches, moderation_log
│   └── identity.db          # SEPARATE encrypted SQLite: contacts, verifications
│                            #   — separation is physical, not a policy promise
├── inbox/                   # drop a budget PDF here; nightly job does the rest
└── public/                  # static assets, methodology page, archive
```

Design notes: two physical database files make the privacy architecture inspectable — anyone auditing the repo can verify that only `tally.js` opens both. Heavy AI (ingestion, summarization) runs in `pipeline/` as nightly batch; the interactive AI layer (Section 21) serves live Q&A and idea-shaping **on top of the pre-processed corpus** — pre-processing is exactly what makes live answers cost pennies. `county.json` is the whole generalization story: a second county is a second config file plus their PDFs in the inbox.

## 19. Data Flows

**Vote flow — four channels, one gate.** Web (magic link) / SMS reply (Twilio webhook) / email (signed one-click token) / paper (volunteer batch entry) all converge on a single `castVote(participant, issue, value, channel)` path: one vote per participant per issue, last write wins until close, every vote channel-tagged, confirmation emitted back on the channel it arrived on. No channel has a side door.

**Ingestion flow.** Document lands in `inbox/` → nightly `ingest.js` extracts structure (department, line item, amount, year, source page) → `summarize.js` writes cited plain-language layers at target reading level → publishes to the explorer and Q&A corpus → change-detection diffs against prior year and queues a budget alert for the next digest. Human review gate before any alert publishes.

**Tally flow.** `tally.js` reads votes from `civic.db`, tier assignments from `identity.db`, joins in memory, emits aggregates only — per tier, per channel, with sub-20 tier counts rendered as ranges — and writes the public results snapshot. Raw joins are never persisted or logged.

**Packet flow.** Issue closes → `packets.js` renders the one-pager (question, tier counts, methodology footer, QR) → delivery task appears on the weekly runbook → outcome page opens in "awaiting action" state, tied to the relevant meeting date from `county.json`'s calendar.

## 20. Operational Rhythm

**Nightly (automated, zero human time):** inbox sweep and ingestion, minutes summarization, moderation pre-screen, digest assembly, backups of both databases to separate encrypted destinations, cost log append (every AI call's tokens and dollars — the platform's own budget is public too).

**Weekly (Monday, target under one hour, human):** moderation queue decisions (log auto-publishes), verify the SMS/issue slot and email digest before send, review any budget alerts flagged for publication, deliver any pending packets.

**Monthly (paper cycle):** print ballots from the generator → distribute to counter partners on existing routes (the Ozark transport days already pass the drop points) → collect → volunteer batch entry → 10% audit sample → print digest to the Siftings Herald and bulletin stacks.

**Seasonal:**
- **August–December (budget season):** heavy ingestion, budget-relevant issue windows back-planned from quorum court dates, packet deliveries. The platform's high season.
- **Election windows:** bright-line enforcement tightens — no candidate issues, no active-ballot-measure issues, charter cited on every rejection. In a county election year (like 2026), this discipline *is* the platform's reputation.
- **January–July (quiet season):** maintenance mode. Outcome tracking, Help Finder freshness, occasional resident-raised issues. This is where the under-3-hours/week promise is actually kept — the system is designed to idle gracefully, not to demand feeding.

**Per-issue rhythm** stays as specified in 16.3; the calendar in `county.json` (meeting dates, budget adoption deadline, election blackout windows) drives window planning automatically, so the operator schedules issues against real civic time instead of tracking it by memory.

The rhythm's shape is deliberate: everything daily is automated, everything human is batched to Monday, everything physical rides existing routes, and the whole system breathes with the county's own calendar rather than imposing one.

## 21. Full AI Support — Sponsored by Ozark Cleaners

The interactive layer. Three AI services, live on the site (and partially by SMS), free to every resident, with the sponsorship publicly metered.

### 21.1 The Budget Analyst

Real-time Q&A and reasoning over the ingested corpus (county, city, school budgets, audits, minutes, millage).

- **Ask anything:** "How much do we spend on the jail?" "What did roads cost per resident compared to Nevada County?" "If deputies got a $4,000 raise, what would that do to the budget?"
- **Reason, not just retrieve:** the resident can push back — "that seems high, why?" — and the Analyst walks the numbers: line items, year-over-year changes, peer-county comparisons, per-household math ("a 1-mill increase raises roughly $X county-wide; on a $100,000 home that's about $Y/year").
- **Hard guardrails:** every factual claim cites its source document and page. Questions outside the corpus get "I don't have a document for that — here's who to ask" rather than a guess. The Analyst computes and explains; it never advocates. "Should we?" questions get the numbers on both sides and a pointer to the open issue where the resident's own answer counts.

### 21.2 The Idea Shaper

The bridge from frustration to shareable civic object — this is "help people get their idea into shareable size."

- Resident rambles their concern in plain words (web chat, or the open prompt from paper/SMS). The Shaper asks two or three clarifying questions, then offers: a neutral one-sentence issue framing, a scope (city/county/school), the relevant budget context pulled from the Analyst, and a shareable card.
- **Ownership rules:** the resident picks the final wording — the AI offers, never imposes. Both the raw submission and the shaped version are logged. Shaping is about form (neutral, scoped, answerable); the position stays entirely the resident's.
- Output feeds the normal issue pipeline: neutrality pass → human review → open. The Shaper just means the pipeline's front door accepts human mess instead of requiring polished prose — which is most of what "accessibility" means for civic voice.

### 21.3 The Help Navigator

The Help Finder's conversational form: "my electric is about to be cut off" gets the two real options with phone numbers and hours, by web or SMS. Small model, cached lookups, near-zero cost — and the single most defensible AI feature on the platform.

### 21.4 The Sponsorship Model

- **Cost reality at county scale:** a cited Q&A answer runs $0.02–0.06; an idea-shaping session $0.10–0.30. At 200 active residents × 10 interactions/month ≈ **$50–120/month**. A breakout month (1,000 users, 10,000 interactions) ≈ **$300–600**. The county's population is the natural ceiling; there is no runaway-scale failure mode here.
- **"AI assistance sponsored by Ozark Cleaners"** appears in the footer and on the cost page. The nightly public cost log doubles as the sponsorship receipt: *"This month Ozark Cleaners sponsored $87 of AI assistance across 1,432 resident questions."* A budget transparency platform that publishes its own sponsor's bill — the coherence is the point.
- **Sensible plumbing, invisible in normal use:** common questions cached; a small model routes and handles lookups, the big model handles reasoning; generous per-session and per-day soft caps prevent abuse without ever touching a genuine resident; every call logged to the public cost page.
- **Succession:** if the platform outlives the sponsor's appetite, the metered model makes the ask concrete — any local business (or the county itself) can see exactly what "sponsoring civic AI for Clark County" costs per month, because it's published. Sponsorship slots are the sustainability plan, and they're priced by the receipt.

### 21.5 Build placement

The interactive layer slots into **M1** (Analyst + Navigator ship with the budget engine — they're the same corpus wearing a conversational interface) and **M3** (Shaper ships with the issue pipeline). Code lives in `server/ai/` — `ask.js`, `shape.js`, `navigate.js`, `guardrails.js` — with every call writing to the public cost log. The batch pipeline remains the foundation: pre-processing is what makes "full AI support" cost less per month than the shop's coffee budget.
