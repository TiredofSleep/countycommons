# SECURITY.md — Clark Commons Security Protocols

Implementable protocols for the build. Strategy lives in CLARK-COMMONS.md §23 (the trust ladder); this file is what ClaudeCode enforces in code and what the public threat-model page is rendered from. Principles: smallest possible attack surface, smallest possible blast radius, verifiability over assurance, and a published plan for failure.

## 1. Data classification (three classes, three rule-sets)

**Class A — Public corpus** (budget documents, summaries, issues, aggregate results, logs): public by definition. Integrity is the only concern: source PDFs are hashed on ingest (SHA-256 recorded), and rendered numbers carry citations back to hashed sources so tampering is detectable.

**Class B — civic.db** (votes, statements, paper batches, moderation log): pseudonymous. Votes reference participant IDs, never contact info. Treated as confidential-but-survivable: a leak must not be able to deanonymize anyone by itself.

**Class C — identity.db** (contacts, verification tier, channel addresses): the crown jewels and the only store whose breach harms individuals. Everything in §3–§5 exists to keep Class C small, encrypted, separate, and boring.

**Standing rule:** collect the minimum. No birthdates, no SSNs, no precise addresses beyond what a tier method requires; verification artifacts (e.g., postcard codes) are deleted after confirmation, not retained.

## 2. Architecture controls (already in the eight hard rules; restated as security properties)

- Two physical database files; only `tally.js` opens both; joins happen in memory; joined rows are never written to disk, cache, or logs.
- Public rendering is aggregate-only with tier counts under 20 shown as ranges — the inference-attack floor.
- One `castVote()` gate for all channels; no channel bypasses validation.
- The worst-case breach statement (put it on the public threat-model page verbatim): *an attacker who takes the whole server learns who participates and what the public already sees — never how any person voted, because that join does not exist at rest.*

## 3. Secrets and encryption

- TLS everywhere; HSTS; no mixed content.
- identity.db encrypted at rest (SQLCipher or full-disk + file-level encryption); key material in environment/secret store, never in the repo, never in backups alongside the data they decrypt.
- All tokens (magic links, email one-click votes, session cookies) are signed (HMAC), single-purpose, expiring: magic links 15 minutes, email vote tokens single-use, sessions modest-lived.
- Secrets rotation on any operator device loss, annually otherwise.

## 4. Input surfaces (every one listed, every one hardened)

- **Web forms:** CSRF tokens, server-side validation, per-IP and per-account rate limits with soft caps generous enough that no genuine resident ever meets one.
- **SMS webhook:** validate Twilio's request signature on every inbound; reject unsigned. Treat SMS bodies as hostile strings — parsed by a strict menu state machine, never interpolated anywhere.
- **Email vote links:** signed, single-use, bound to issue + participant; a forwarded link cannot be replayed.
- **Paper batch entry:** operator-authenticated UI only; every batch carries operator ID; 10% audit sampling as designed — the sampling is a security control, not just QA.
- **Document inbox:** PDFs are an attack vector. Parse in an isolated worker process with no network egress and least privilege; treat parser crashes as suspect files; never execute embedded content; hash and quarantine originals.

## 5. AI layer security

- **All ingested documents and all user text are untrusted input.** The Analyst/Shaper/Navigator prompts enforce: answer only from the corpus, cite or decline, never advocate — and instructions found *inside* documents or user messages are data, not commands. Test this adversarially before launch (a "please ignore your rules" page planted in a test PDF must change nothing).
- **Nothing from identity.db ever enters an AI prompt.** Structurally: the AI services import from the corpus and civic.db read paths only; no code path from Class C to a model call.
- Per-session and per-day cost caps double as denial-of-wallet defense; the public cost log makes an anomaly visible within a day.
- AI outputs are content, never code: rendered as text, never evaluated, never used to construct queries.

## 6. Logging policy (what is never logged is the policy)

Never logged anywhere: identity↔vote joins, magic-link tokens, SMS message bodies beyond parse results, verification artifacts. IP addresses only in short-retention (14-day) security logs for rate limiting and abuse response, then dropped. Public append-only logs (moderation, corrections, AI cost) contain no personal data by construction. Admin actions (settles, batch entries, config changes) are logged with operator ID — the operator is watched too.

## 7. Backups and recovery

Nightly encrypted backups; civic.db and identity.db go to **separate destinations with separate credentials**, so no single compromised backup store reunites them. Corpus and code are public — their backup is the repo and the archive. Quarterly restore drill (part of the seasonal rhythm): prove the backups actually restore, time it, note it in the ops log.

## 8. Operator access

Single-admin model, stated honestly. Hardware-key 2FA on everything that matters: VPS provider, registrar, DNS, Twilio, email sender, repo. No shared credentials ever. Admin UI reachable only over authenticated session with the same 2FA; no long-lived admin cookies. A written envelope procedure (sealed credentials for a designated successor) so the bus-factor of one degrades softly, like everything else.

## 9. Vulnerability disclosure

`/.well-known/security.txt` with a real contact; plain-language safe-harbor statement (good-faith research will be thanked, not threatened); acknowledged within 72 hours; fix-or-explain within 30 days; reporter credited on the corrections log if they wish. Standing public invitation to Henderson State and Ouachita CS programs to audit as coursework — findings published either way (CLARK-COMMONS.md §23.3).

## 10. Incident response (pre-committed, published)

What counts as an incident: any unauthorized access to Class B or C, any integrity failure in published numbers, any sustained outage of the vote gate during an open issue window. Commitments: affected individuals notified directly if Class C is touched; a public plain-language post-mortem within 7 days for any incident, on the corrections log; no silent fixes. The first incident handled this way builds more trust than zero incidents claimed.

## 11. Dependencies and updates

Dependency minimalism as policy: every package justified in a comment in package.json; prefer stdlib and boring choices; lockfile pinned; monthly dependency review in the Monday batch (security advisories first). OS patches automatic for security channel. The fewer moving parts, the fewer CVEs apply — smallness is the patch strategy.

## 12. Availability posture (honest)

No SLA — per NEVER.md, no promises with clocks. Instead: degrade-soft design. The public site is served from pre-rendered content and survives the app process dying; voting windows are days long, so hours of downtime never disenfranchise; paper never goes down. State this plainly on the threat-model page: the system is built so that its failures are boring.

## 13. The Activity Log and the Watchdog (integrity is the real security)

For a public-by-design system, confidentiality protects little — **tampering is the attack.** The activity log is therefore the system's true security core, and it must be trustworthy against everyone, including the operator.

**13.1 Append-only, hash-chained.** Every state change is a log entry: votes (pseudonymous ID), issue opens/closes, ingestions (with document SHA-256), publishes, config changes, moderation actions, corrections, settles, admin actions with operator ID. Each entry contains the hash of the previous entry — a tamper-evident chain where any retroactive edit breaks every hash after it, visibly. No deletes, no updates; mistakes are corrected by new entries that reference the old.

**13.2 External anchoring — the watcher is watched.** The chain's head hash is published on a schedule (nightly) to places the operator does not control: the public site, the public git repo, and at least one independent witness (e.g., an archived snapshot). Once anchored, not even the operator can rewrite history without the world's copies disagreeing with his. This is the log's answer to "why should we trust the guy running it": you don't have to.

**13.3 The automated watchdog (nightly, results public).**
- **Chain verification:** re-walk the full hash chain; publish "verified through entry N, head hash X" — the watchdog's heartbeat is itself public, so a silent watchdog is an alarm.
- **The daily recount:** recompute every displayed aggregate from civic.db raw and compare to what the site shows. Any mismatch is an integrity incident (§10), full stop.
- **Anomaly flags for human review:** vote-velocity spikes, single-channel surges, votes clustering from few sources, activity outside issue windows, config drift. Flags go to the Monday queue; flags are advisory, incidents are not.

**13.4 Everyone is the watchdog.** The repo ships a verification tool (`verify.js`): anyone can download the public log, verify the chain against the anchored heads, and recount the published aggregates themselves. Henderson students, political rivals, journalists, the county's own staff — the more adversarial the verifier, the better the system looks when it holds. Same move as open books: don't request trust, hand out the recount tool.

**13.5 The public log is coarsened — the deanonymization caveat.** Precise per-vote timestamps in a public log enable timing correlation in a small county ("I saw her on her phone at 2:14"). The internal log keeps full fidelity under the hash chain; the **public** log exports vote events aggregated to coarse buckets (hourly or daily) with tier/channel counts, honoring the same under-20 range floor as every other surface. Integrity transparency never becomes a side door around participant privacy.

## 14. What this file becomes

- The public threat-model page (`/security`), rendered in plain language from this document
- Acceptance tests: §2's join rules, §5's injection tests, §6's never-log list, §4's signature validation, **§13's chain verification and daily recount** — all wired into CI so a regression fails the build
- The rules of engagement handed to the university auditors — with `verify.js` as their starting point
