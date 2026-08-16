# Coiny pre-launch verification: Part 7, the ordered pre-launch runbook

**Part 7 of seven.** Parts 1 to 6 are the audit; this is the sequence. Written
2026-08-15 on branch `docs/prelaunch-verification`.

Parts 1 to 6 produced **696 rows and 284 FAILS**: security 142/46, privacy 86/45,
interface craft 171/93, performance and reliability 113/41, compliance 96/28,
accessibility 88/31. This part does not re-derive any of them.

**How to read a row.** Every item cites the row IDs it closes and says what to
do. It never restates why. If you want the argument, open the cited row: `1.x`
is `01-security.md`, `2.x` is `02-privacy.md`, and so on. Where a row carries a
MASTG or MASVS test id, it carries it there; the runbook does not maintain a
parallel list.

**[Founder] or [Agent].** [Founder] means it needs an account, a payment, a legal
signature, a physical device, or a decision only the owner can make. Everything
else is [Agent]. The [Founder] items are collected again, on their own, in the
last section.

**The four gates.**

| Gate | The event it precedes |
|---|---|
| 0 | Nothing. It is wrong right now, in production-adjacent systems, today. |
| 1 | The first external TestFlight tester |
| 2 | The first real bank connection |
| 3 | App Store submission |
| 4 | The first paying user |

**Ordering inside a gate is by lead time, not severity.** An item with three
weeks of someone else's latency starts before a BLOCKER you can fix in an hour,
because the hour is available later and the three weeks are not. Every item
states the lead time it assumes and names what it blocks or waits on. Where two
items collide, the one with external latency wins.

**De-duplication.** Several findings across five parts converge on single actions.
Where they do, the action appears once, at its earliest gate, citing every row it
closes. The largest is G1.6, one screen of iOS work that clears obligations from
Parts 2, 3, 5 and 6.

---

## Gate 0: do first, today

Everything here is live and wrong at this moment. None of it waits on a decision,
an account, or another item.

| # | Do this | Who | Closes | Lead time, blocking |
|---|---|---|---|---|
| T1 | Split `/health` into a liveness route that returns 200 whenever the process can serve, and a separate scheduler heartbeat. Point the Fly check at the first. Then `fly machine restart` and watch one hour of logs for `scheduler_tick_completed`. Add a per-tick deadline and a `catch` while you are in the file. | [Agent] | 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.10, 4.9.6, 4.9.8 | ~20 lines, half a day. **Blocks almost all of Part 4**: 4.3.2, 4.5.3, 4.6.1, 4.7.13, 4.10.1, 4.13.6's first list cannot be measured against a dead service. The staging API has been returning HTTP 503 in 36 to 55 seconds to the public internet, and a background job is the reason |
| T2 | `CREATE INDEX transactions_user_date_idx ON transactions (user_id, date);` as a migration, then `ANALYZE`. Do not convert `amount` to numeric. | [Agent] | 4.7.3, 4.7.4, 4.7.5, 4.7.6, 4.7.7 | One migration, one hour. Measured 148.844 ms to 0.688 ms, 216x, on the query four callers run including one inside webhook processing. The single highest-value change in the whole document |
| T3 | Point a free UptimeRobot monitor at `https://coiny-backend.fly.dev/health` with email alerting. | [Founder] | 4.12.13, 4.12.14 | Five minutes, free. This document found T1's outage by accident because this did not exist |
| T4 | Enable MFA on Fly, Neon, Plaid, Apple Developer and GitHub. Record the date in `docs/legal/service-providers.md`. | [Founder] | 1.0.7, 1.10.9, 1.11.5, 5.1.5 | Five minutes. A Safeguards 314.4(c)(5) obligation, not a preference, and the highest-value UNVERIFIED row in Part 1 |
| T5 | In GitHub branch protection for `main`, set `enforce_admins` and add a `required_pull_request_reviews` rule. | [Founder] | 1.0.15 | Two minutes. Six required checks exist and the owner account currently bypasses all of them |
| T6 | Delete `WaitingForFirstReactionView`, `TipCard`, `coinyTips` and `CryptoView`. Nothing references them. | [Agent] | 3.7.5, 3.3.2, 3.8.7, 3.2.2, 3.2.8, 3.4.5b, 6.5.7 | Ten minutes, no behaviour change. Removes a shipped string promising "lights and sound" for hardware that does not exist, a celebrate-on-deposit claim, and an ungated `repeatForever` |
| T7 | Drop `users.email` and `users.display_name`, and remove `.email` and `.fullName` from the Sign in with Apple scope request. | [Agent] | 2.2.1, 2.2.2, 2.2.3 | One migration, one hour. Nothing in `src/` has ever read either column; deleting is cheaper than encrypting, disclosing, disposing of and notifying about them |
| T8 | Open the Neon console and settle whether protected branches is available on Free. Parts 2 and 4 disagree (see the adjudication list at the end). If available, protect both branches. If not, it moves to G4.2. | [Founder] | 2.9.5, 4.12.11 | Two minutes |

---

## Gate 1: before the first external TestFlight tester

**The critical path through this gate is G1.1 to G1.3, and none of it is code.**
The Apple Organization enrollment is the longest pole in the entire document.

### The long poles, all [Founder], all start today

| # | Do this | Who | Closes | Lead time, blocking |
|---|---|---|---|---|
| G1.1 | Check `developer.apple.com` > Membership for team `UKL98DS9D3`. If it reads Individual, start the Organization migration now; it needs the LLC's D-U-N-S number. | [Founder] | 5.5.5 | **Weeks, so start it now.** CORRECTION (2026-08-16): this row previously read "blocks every archive, therefore TestFlight", and that is wrong. Apple's TestFlight page states its limits with no membership-type condition, and 5.1.1(ix) says such apps "should be **submitted** by a legal entity" using "should", about submission, never mentioning beta distribution. Verified against developer.apple.com/testflight and the App Review Guidelines. So this gates **App Store submission only** (G3.x). Archiving, device installs, TestFlight internal and external, and StoreKit all work on the existing Individual membership, which means the device-dependent rows in Parts 4 and 6 are reachable without it |
| G1.2 | Make the name call, buy the domain the same day, and stand up static hosting for `/coiny/privacy`, `/coiny/terms`, a deletion-request page, `/.well-known/security.txt` and later `/.well-known/apple-app-site-association`. | [Founder] | 2.1.14, 1.11.8, 1.11.9, 2.3.13, 5.5.14, 5.4.16, 1.4.15 | Days to buy, hours to host, ~$15/yr. **Blocks G1.6, G1.5, G2.1, G2.2, G3.1.** It is the cheapest item on the critical path and it gates the largest one |
| G1.3 | Send `docs/legal/privacy-policy.md` and `docs/legal/terms-of-service.md` to the attorney with the inline notes and lawyer questions Q3, Q5, Q7 from `docs/obligations.md` §8. | [Founder] | 5.2.9, and the content half of 5.2.2, 5.2.3 | **Weeks of external latency.** Blocks publishing the URLs G1.2 hosts, therefore blocks G1.6's copy being final. Start it the same day as G1.2 so the two run in parallel |
| G1.4 | Commission the character art. Run `docs/design-direction.md` §7.2 Phase 1 (three to five concepts, paid, ~$700) with two artists in parallel. | [Founder] | 3.4.6h, 3.10.2, 3.7.6, and the re-test trigger on 6.6.10 | **Four to six weeks for the full commission, $3,000 to $6,000.** Blocks G3.5 (the app icon, which blocks submission independently of anything else). Start now because it is calendar time, not work time |
| G1.5 | Create and verify `coiny@athanorworks.com`. | [Founder] | 1.11.9, and the disclosure destination for 1.11.8 | Thirty minutes. Waits on G1.2 |

### The one screen, which is the largest single engineering item in the document

| # | Do this | Who | Closes | Lead time, blocking |
|---|---|---|---|---|
| G1.6 | Build the legal and consent surface: the two-line consent block beneath the Sign in with Apple button exactly as `docs/legal/consent-copy.md:11-32` specifies with both terms as tappable links; a Settings section carrying Privacy Policy, Terms, Contact and a "Share usage data" toggle; a `TelemetryClient.emit` gate on that toggle and on first successful sign-in; a `users.analytics_opt_out` column read by `trackServerEvent`; a recorded ToS acceptance. While in `SignInView.swift`, close the craft and accessibility rows in the same file. | [Agent] | Consent and notice: 2.6.1, 2.6.2, 2.6.3, 2.6.4, 5.2.4, 5.2.5, 5.2.6, 5.7.7, 5.7.8. Legal links: 2.1.14, 3.12.4, 5.5.1, 5.4.2, 5.4.14, 5.8.8. Same-file craft and a11y: 3.1.1, 3.1.2, 3.1.9, 3.6.3b, 6.1.10, 6.1.13, 1.2.3 | **Half a day for the consent surface, one more day for the sign-in rebuild. Blocked on G1.2 (the URLs must exist) and G1.3 (the copy must be final).** This one screen discharges the Reg P initial-notice delivery requirement, Apple 5.1.1(i), Apple 3.1.2's Terms link, Apple 5.1.1(ii)'s consent-before-collection, and Plaid's Link-setup consent item. Note that 2.6.4 adds a server-side half that Part 5's framing of 5.7.7 does not have: a client toggle alone still leaves `signup_completed`, `account_connected`, `goal_created` and the rest writing unconditionally |

### Then, engineering, roughly in this order

| # | Do this | Who | Closes | Lead time, blocking |
|---|---|---|---|---|
| G1.7 | Add an asset catalog with `AccentColor` set to `signal` and the eleven §4.2 colours as named colour sets, then SwiftLint `custom_rules` banning chromatic system colours, `.thinMaterial`, `design: .rounded` and `.spring(` under `ios/Coiny/Views`. | [Agent] | 3.15.1, 3.15.3, 3.7.1, 3.4.2e, 3.5.5a, 6.3.11 | Two hours, one-time, zero ongoing attention. **Do this before G1.13**, because it makes the do-nothing default correct and stops the substitution pass decaying again |
| G1.8 | Add `XCUIApplication.performAccessibilityAudit()` to the six files in `ios/CoinyUITests`. | [Agent] | 6.8.1, and it becomes the standing guard on 6.1.9, 6.1.10, 6.2.4, 6.2.7, 6.3.x, 6.4.5 | An afternoon, no dependency, then zero attention. Part 6's single recommended control |
| G1.9 | The four one-line accessibility fixes: show the threshold inline on the savings rate and stop it being hue-only; take `.red` off the Debts heading; make the net-worth figure `@ScaledMetric`; suspend the Home refresh loop while `UIAccessibility.isVoiceOverRunning`. | [Agent] | 6.6.5, 6.6.6, 6.6.2, 6.2.4, 6.5.9, 3.1.6, 3.4.3e, 3.4.3f, 3.4.1e | Two hours. 6.6.5 is the only clean WCAG 1.4.1 failure in the app; 6.5.9 is why a screen reader user cannot finish reading Home |
| G1.10 | Replace the 30-second `while` poll on Home with a foreground-only refresh plus the push trigger that already exists. | [Agent] | 4.10.2, 4.10.3 | One hour. Same loop as 6.5.9, different reason: 120 requests per hour of foreground use with no `scenePhase` gate |
| G1.11 | Add the revoke-all-sessions endpoint and the Settings row that calls it. | [Agent] | 1.4.5, 1.0.10 | Half a day. The one security control Part 1 recommends adding, and the only ending the 2am stolen-phone story has |
| G1.12 | Set `.completeFileProtection` on `NetWorthCache`. | [Agent] | 1.2.4, 1.0.11 | One line |
| G1.13 | The mechanical token substitution across the 31 view files that use no palette: one palette object, one Window, one creature, one primary button, one row primitive, `positive`/`negative` tokens added, contrast-safe label colours on `signalFill` in both schemes. | [Agent] | 3.11.1 to 3.11.8, 3.4.2b, 3.4.2c, 3.4.2d, 3.4.2g, 3.4.3d, 3.5.1f, 3.5.1g, 3.5.1h, 3.1.3, 3.1.4, 3.1.5, 3.1.7, 6.3.4, 6.3.5, 6.3.6, 6.3.7, 6.3.8, 6.3.9, 6.3.10, 6.3.13, 6.6.3, 6.6.4, 6.5.8 | Two to three days, and it is the same pass in both parts: Part 3 calls it the palette split, Part 6 calls it the contrast fix, and 6.3.13 verified the two file sets are identical. **Read the contrast adjudication at the end before choosing the button label colour**, because Parts 3 and 6 computed opposite modes and neither current pairing passes in both |
| G1.14 | The empty, error and loading pass: retry on every error branch, written copy instead of `localizedDescription`, cached values on Wealth's first paint instead of a spinner, the §10 strings where §10 specifies them. | [Agent] | 3.6.1a, 3.6.1b, 3.6.1c, 3.6.1f, 3.6.2b, 3.6.2c, 3.6.3a, 3.6.3b, 3.6.3c, 3.6.3h, 3.8.5, 3.11.8 | Two days |
| G1.15 | Emit `app_open` from the iOS client. | [Agent] | 4.3.6 | Twenty minutes. **Must land before the first tester**, because retention cohorts cannot be backfilled |
| G1.16 | Rate-limit and deadline pass: a per-route limit on `POST /api/net-worth/refresh`, a Fastify `requestTimeout` below the client's 30 s, the seventeen bare-`fetch` clients converted to `util/fetch.ts`, and the duplicate `liabilitiesGet` moved. | [Agent] | 4.5.7, 4.8.3, 4.8.5, 4.8.6, 4.8.7, 4.8.8, 4.8.9, 1.5.6, 1.5.9 | About four hours. Nothing new is built; `util/fetch.ts` already exists and is tested |
| G1.17 | Batch the 27 independent class queries in `networth/read.ts` into `Promise.all` groups, and replace the per-row `claimEvent` loop in the Plaid webhook with a single `INSERT ... ON CONFLICT DO NOTHING ... RETURNING`. | [Agent] | 4.7.2, 4.7.10 | One day. 31 serial round trips per GET, and 500 to 2,000 serial round trips on a first Plaid link |
| G1.18 | Gzip responses, either `@fastify/compress` or ten lines of `node:zlib` in an `onSend`. | [Agent] | 4.6.2 | One hour, 5.3x to 13.2x measured |
| G1.19 | Fix the security CI gate: workflow-only PRs currently skip Semgrep, Trivy and SBOM while counting as passing required checks; the push-event base is `HEAD~1`; every `.trivyignore` entry rests on a premise that is false. | [Agent] | 1.9.7, 1.9.8, 1.9.5, 1.9.4 | Half a day. 1.9.7 means a PR that swaps an action for a malicious one passes every required check with no scanner running |
| G1.20 | Full-history secret scanning: add a scheduled `gitleaks git --log-opts="--all"` job, allowlist `ios/CoinyTests/.*Tests\.swift`, and narrow the `docs/.*\.md` blanket allowlist. | [Agent] | 1.8.8, 1.8.9, 1.8.10 | One hour |
| G1.21 | Logging pass: a pino `redact` array, `user_id` on the request line, and `res.url` on the completion line. | [Agent] | 1.8.3, 1.0.3, 4.5.2 | One hour. Three separate parts want the same two edits to `plugins/logger.ts`, in both directions: less PII, more attribution |
| G1.22 | Sampled `responseTime` and `route` into `analytics_events` at 100% for 30 testers. | [Agent] | 4.13.4, 4.5.3 | Half a day. Uses the pipeline that already exists rather than adding a log processor, so no new entry in `service-providers.md` |
| G1.23 | The small security edits, as one batch: `DATA_ENCRYPTION_KEY` length regex, a stated `algorithms` allowlist on the two identity-token verifications, a Sign in with Apple nonce, the logout-scope comment corrected, `crypto.timingSafeEqual` on the Plaid body hash, an HKDF-derived blind-index key, and HSTS plus `X-Content-Type-Options` in an `onSend` hook rather than a helmet dependency. | [Agent] | 1.3.8, 1.4.8, 1.4.9, 1.4.10, 1.7.3, 1.3.3, 1.6.2, 1.10.1 | Half a day for all eight |
| G1.24 | Tests over `api/auth.ts`. | [Agent] | 1.4.14 | Half a day. Every VERIFIED row from 1.4.1 to 1.4.8 currently rests on today's source and nothing stops tomorrow's edit |
| G1.25 | Add `SECURITY.md` to the repository now; the hosted `security.txt` follows G1.2. | [Agent] | 1.11.8 | Ten minutes |
| G1.26 | Rehearse the restore. Pick a timestamp inside the 6-hour window, restore the `staging` branch, assert row counts within 5%, that one known `access_token` decrypts, and that `max(net_worth_daily.date)` is yesterday. Record the wall clock. Then write the runbook, including the sentence that key loss makes every stored token unrecoverable. | [Agent] | 4.12.5, 4.12.6, 4.12.7, 4.12.10, 1.11.7 | One hour, and it risks nothing today because both branches hold synthetic data. **Do it before G2.9 creates production**, because after that it stops being free |
| G1.27 | Build the nightly encrypted `pg_dump` with 30-day retention (R-20.1), and add a `deleted_user_ids` tombstone table so a restore does not resurrect deleted accounts. | [Agent] | 4.12.2, 4.12.3, 2.9.2, 2.9.4, 5.9.6 | One day. Neon's six-hour window is currently the entire backup strategy. The tombstone half becomes MAJOR the day the 30-day dump exists, so build both together |
| G1.28 | Write the one-page incident plan: the FTC Safeguards notification form URL, the consoles to rotate in order, the two breach clocks, and 1.11.7's warning about what rotating the encryption key actually costs. | [Founder] | 1.11.6, 1.11.10, 1.12.8 | One hour. Not a programme, one page. The formal plan is waived below 5,000 consumers and should stay waived |
| G1.29 | Confirm `DATA_ENCRYPTION_KEY` exists in the macOS Keychain as the second of the two copies R-20.3 requires. Presence only; never print the value. | [Founder] | 4.12.9 | Five minutes |
| G1.30 | Run the simulator accessibility sweep: Accessibility Inspector's audit on every screen in light and dark with Increase Contrast on and off, then Color Filters at Grayscale, Deuteranopia and Protanopia, screenshotting Home, the expanded journey, Wealth, Activity and the paywall. | [Founder] | 6.3.14, 6.6.12, 6.6.13 | Thirty minutes, no device needed, and it has never been done. **Not blocked on G1.1**; the simulator runs today |
| G1.31 | Run the manual VoiceOver pass over all three tabs, the expanded journey, the paywall and all eight onboarding screens. | [Founder] | 6.1.14, 6.8.3 | One hour. **Blocked on G1.1** (needs a device build). Part 6 calls it the single highest-value hour in that part |
| G1.32 | Record the decision that Android does not ship, and keep it out of the release train until iOS reaches App Store parity. | [Founder] | 6.7.7, 3.13.7, and it parks 1.2.8, 2.3.12, 2.8.x, 3.13.1 to 3.13.6, 4.2.8, 6.5.11, 6.7.4 | Ten minutes. Restyling Android now duplicates work and creates a third palette to keep in sync |

---

## Gate 2: before the first real bank connection

| # | Do this | Who | Closes | Lead time, blocking |
|---|---|---|---|---|
| G2.1 | File the Plaid production access request from the Launch Center, with the hosted policy URL. Expect the security questionnaire. | [Founder] | 5.4.1, 5.4.14, 5.4.17 | **Weeks, review SLA unknown.** Blocked on G1.2 (hosted URL) and G1.6 (Link-setup consent). Start it the moment both land |
| G2.2 | Plaid OAuth prerequisites: host the AASA file, add the `applinks` entitlement to `ios/project.yml`, pass `redirect_uri`, and register the URI in the Plaid dashboard. | [Founder] and [Agent] | 1.4.15, 5.4.16 | One to two days of work plus Plaid registration latency, and Schwab can add six weeks after approval. Blocked on G1.2. Without it Chase, BofA, Wells Fargo and US Bank cannot be linked by any tester |
| G2.3 | Read the pages that will not render to automation, in a browser: Spinwheel's developer policy and end-user agreement, Kalshi's developer agreement, Coinbase CDP terms. | [Founder] | 2.7.8, 5.11.4 | One sitting. **BLOCKER for the Spinwheel integration specifically**: it settles who carries the FCRA permissible-purpose obligation, which G2.5 depends on |
| G2.4 | Sign the Qualified Individual designation, and adopt the disposal schedule by deciding open decision B7 and dating the adoption line. | [Founder] | 5.1.4, 5.9.2, 2.4.8, 2.4.9 | Twenty minutes for both. An unsigned designation is not a designation and an unadopted schedule is a draft |
| G2.5 | Rewrite the Spinwheel connect copy to say that a full Equifax credit report will be pulled, by whom, and for what. | [Agent] | 2.6.6, 5.11.2 | Two hours, copy not architecture. Waits on G2.3 for the wording constraint |
| G2.6 | Make `DELETE /api/account` call `revokeUpstreamGrants`, and add Spinwheel, Kraken, Kalshi and Alpaca to it. | [Agent] | 2.3.5, 2.3.6 | One line for the call, one each for the providers. Today deleting your Coiny account leaves your record standing at a credit-bureau aggregator with your phone number, date of birth and Equifax pull |
| G2.7 | Close the rest of deletion: delete the `plaid_items` row on disconnect, null `original_transaction_id` on user deletion or age the table out, and fix the two tables with no user reference. | [Agent] | 2.3.9, 2.3.3, 2.3.1, 2.3.2, 2.3.15 | One day |
| G2.8 | Add `item_id` to `transactions`, **then** build the purge job on the existing scheduler. | [Agent] | 2.4.5 then 2.4.2, 2.4.3, 2.4.7, 5.9.3, 5.9.4, 5.9.5 | Two days. The order matters: without `item_id` the 90-day post-disconnect rule has no join. The scheduler dependency the schedule blames has cleared; the job is simply unbuilt |
| G2.9 | Before creating production: split the database role into a migrator and a runtime role, and run `backfill-encrypt-pii.ts` against it once created. | [Agent] | 1.10.4, 1.3.11 | Half a day. **It is free only while production does not exist.** After that it is a real change |
| G2.10 | Encrypt `last_credit_score`. | [Agent] | 1.3.1, 5.11.5, and the disclosure half of 2.1.5 | One column, no query on it, one hour. The single most sensitive scalar in the database and currently a plaintext integer |
| G2.11 | Close the crypto downgrade paths: a key version byte in the envelope with a re-encryption script, and an explicit opt-in flag instead of an implicit plaintext fallback in both `encryptString` and `decryptString`. | [Agent] | 1.3.4, 1.3.5, 1.3.6, 1.3.10 | One day. MINOR today, BLOCKER the day a key is suspected, which is exactly when there is no time to build it |
| G2.12 | Add read-only key guidance to the Alpaca and Kalshi entry screens, matching Kraken's. | [Agent] | 2.6.7 | One hour. The two screens without the instruction are the two whose keys can carry trade rights |
| G2.13 | Fix the vinyl silent zero: a null value with an excluded status and a reason, not `reading(0, null, 'ok')`. | [Agent] | 5.8.4 | Twenty minutes. It is simultaneously an R-8.1 violation and an accuracy claim problem, on the number the product is about |
| G2.14 | Log Plaid's `request_id` on the error path. | [Agent] | 5.4.8 | Two lines. It is the identifier Plaid Support asks for |
| G2.15 | Surface the failed public-token exchange in `ConnectAccountFlow` instead of swallowing it. | [Agent] | 5.4.3 | Thirty minutes |
| G2.16 | The document correction pass, as one PR: the physical-address data type in the manifest and labels; the bureau data in the policy; the field-encryption list in the policy and the service-provider record; the labels' stale self-check; the revoke-at-source list; the TrueLayer status; the in-app-visibility access claim; the Tier 2 framing; the backup sentence; the former-customer statement; the state-law half-sentence; the click-to-cancel status in `obligations.md` §2; D7 and D8 recorded as closed; the retired "36 external calls" figure in `obligations.md` §5, `prd.md` §16 and the gap analysis; and `engineering-budgets.md` §1, §3, §5 and §7. | [Agent] | 2.1.2, 2.1.3, 2.1.5, 2.1.6, 2.1.7, 2.2.4, 2.2.5, 2.3.7, 2.3.8, 2.5.2, 2.7.3, 2.8.1, 2.8.3, 2.9.1, 5.2.3, 5.3.7, 5.4.6, 5.6.2, 5.8.6, 4.8.1, plus the "documents this part contradicts" list at the end of Part 4 | One day. Seventeen of Part 2's 45 FAILS are a document contradicting the code, and they are the cheapest FAILS in the audit to close. **Do not publish any policy before G1.3 clears and G2.8 ships**, or the retention promises become Section 5 misrepresentations the day the URL goes live |
| G2.17 | Delete the redundant `staging` Neon branch copy of real-shaped data, and adopt the rule that branches taken from a data-bearing branch are named, dated and deleted. | [Agent] | 2.9.3 | Thirty minutes. The same person currently exists in two branches and `DELETE /api/account` reaches one |

---

## Gate 3: before App Store submission

| # | Do this | Who | Closes | Lead time, blocking |
|---|---|---|---|---|
| G3.1 | Create the App Store Connect record: description naming the financial-data integration, keywords, age rating, support URL, privacy policy URL. | [Founder] | 5.8.7 | Half a day. Blocked on G1.1 and G1.2 |
| G3.2 | Transcribe the nutrition labels field by field from `docs/legal/app-store-privacy-labels.md`, after G3.4 has added the missing type. | [Founder] | the delivery half of 2.1.1, 2.1.3 | One hour. Waits on G3.4 |
| G3.3 | Accept or amend the demo-account plan (open decision B9), then build it: the endpoint, the Settings entry point, the Fly secret, and sandbox products a reviewer can actually purchase. Put the credentials in the review notes. | [Founder] decides, [Agent] builds | 5.5.7 | One day of work after the decision. Guideline 2.1 is the largest rejection category and the app currently cannot be got past sign-in |
| G3.4 | Add `NSPrivacyCollectedDataTypePhysicalAddress` to the privacy manifest. | [Agent] | 2.1.3 | Ten minutes. **Blocks G3.2.** A missing data type is what Apple actually rejects for |
| G3.5 | Author the app icon in Icon Composer, working in light, dark, clear and tinted. | [Agent] | 3.4.6h | Half a day. **Blocked on G1.4** delivering the creature, which is why G1.4 starts at Gate 1 |
| G3.6 | Call `https://appleid.apple.com/auth/revoke` on account deletion, including the TN3194 path for when no usable token is held. | [Agent] | 1.4.13, 2.3.4, 5.5.6, 5.9.7 | Half a day. The one 5.1.1(v) item the PRD marks Built and is not |
| G3.7 | Set `ITSAppUsesNonExemptEncryption` to `false` in `ios/project.yml`. | [Agent] | 5.5.8 | One line. Without it every upload stalls on the encryption questionnaire |
| G3.8 | Enforce the App Store notification `environment` claim against the running environment, on both the webhook and `POST /api/entitlements/transaction`. | [Agent] | 1.7.6 | Two hours. Once production exists, anyone with a sandbox tester account grants themselves Individual or Household. A revenue bug before it is a security one |
| G3.9 | Add a Release-configuration build job to `ios-ci.yml`. | [Agent] | 4.11.6 | Two hours. **Prerequisite for every number in 4.11 and for comparable launch timings**; Debug binaries are not comparable to shipped ones |
| G3.10 | Add the MetricKit subscriber posting `MXMetricPayload` to the existing `/api/telemetry`, and add the Performance Data label line to the manifest, the nutrition labels and the policy in the same PR. Take the diagnostic half later, when a crash needs a stack trace. | [Founder] approves the label change, [Agent] builds | 4.13.1, 4.13.2, 4.13.3, 1.8.6 | About a day. It is a system framework, so it adds no vendor and does not contradict PRD §24. **Unblocks** 4.2.1, 4.4.1, 4.10.6 and the crash-free-sessions indicator |
| G3.11 | Set a cold-start budget, **then** measure launch, hitch ratio, peak memory and thinned binary size on the oldest supported device (A12). Add one `XCTApplicationLaunchMetric` measure block so it stays measured. | [Agent] | 4.2.2 then 4.2.1, 4.2.4, 4.2.6, 4.2.7, 4.4.1, 4.4.7, 4.10.5, 4.10.6, 4.11.1 | One day. **Blocked on G1.1, G3.9 and G3.10.** Pick the number before measuring one, or the measurement has no verdict |
| G3.12 | Run MobSF or a `strings` pass over the first archive. | [Agent] | 1.8.13 | One hour. **Blocked on G1.1** |
| G3.13 | Change `ManageAccountsView`'s eager `ForEach` to `LazyVStack`. | [Agent] | 4.4.3 | One word. MINOR today, MAJOR the first time a 200-holding brokerage is linked |
| G3.14 | The remaining interface pass: collapse Wealth groups by default with sub-1% rolled into "Other (n)", opacity steps of ink instead of six hues on the composition bar, one step of hierarchy is not enough between a group total and a row, balances not monospaced, category codes instead of tinted per-class icons, `sparkles` and the pie tab icon removed, the three em dashes and one typographic arrow taken out of shipped strings, `Form` chrome reconsidered on the add-asset sheets, spatial values brought onto the scale, and the fixed icon frames changed to `minWidth`/`minHeight`. | [Agent] | 3.5.4c, 3.5.4d, 3.9.3, 3.9.4, 3.9.2, 3.2.3, 3.2.7, 3.4.4a, 3.4.4c, 3.4.4d, 3.4.6a, 3.4.6b, 3.4.6c, 3.4.6d, 3.4.6e, 3.4.6f, 3.7.2, 3.7.3, 3.8.3, 3.8.4, 3.1.8, 3.1.11, 6.2.7, 6.2.8 | Three to four days. Everything here is a normal edit; G1.7 is what makes the edits stay made |
| G3.15 | The remaining accessibility pass: label the wallet-delete icon button and give it a 44pt target, name form fields by purpose rather than by example value, add heading traits on Wealth, Activity, Settings and the paywall, and label or hide the bare `ProgressView`s. | [Agent] | 6.1.9, 6.1.11, 6.1.12, 6.1.13, 6.4.5 | Half a day. G1.8's audit will already be failing on most of these |
| G3.16 | Add `.manageSubscriptionsSheet` to the paywall, and rewrite the purchase-failure copy in the register `PaywallView.swift:177` already uses. | [Agent] | 3.12.3, 3.12.8 | One hour |
| G3.17 | Snapshot tests at default and AX5 for Pet, Plan and Wealth. | [Agent] | 6.2.10, 3.15.2, 6.2.11's automation half | One day. Second priority behind G1.8, which already catches clipping, and it carries a golden-image maintenance cost |

---

## Gate 4: before the first paying user

| # | Do this | Who | Closes | Lead time, blocking |
|---|---|---|---|---|
| G4.1 | Deliver what the paywall sells. `limitsForTier` is read by `canAddConnection` alone; wire `activeGoals`, `guardrails` and `historyDays` too, or stop selling them. | [Founder] decides which, [Agent] builds | 5.8.5 | Two to three days, and the guardrail evaluator does not exist yet, so scope it before committing. Of the five things Individual sells for $99, one is differentiated. An Apple 3.1.2(c) problem before it is an FTC one |
| G4.2 | Upgrade Neon to Launch. It buys the 7-day restore window, protected branches, and headroom on compute. | [Founder] | 4.12.12, 4.12.11, 4.12.1, and the second trigger 4.1.8 identified | Ten minutes, ~$19/month. Three independent triggers now point at it, not one. See T8 |
| G4.3 | Decide the latency budget shape: accept a two-tier budget (warm p95 < 400 ms, cold p95 < 1.5 s) or disable Neon scale-to-zero. Then reduce `engineering-budgets.md` §1 from thirteen targets to the three that have instruments. | [Founder] decides, [Agent] edits | 4.5.5, 4.13.5, 4.5.4 | One hour. **Decide before measuring**, or the first measurement produces a false failure |
| G4.4 | Give the rate limiter a shared store and the scheduler an advisory lock, or write down in `engineering-budgets.md` that both are single-machine assumptions and `fly scale count` is the thing that breaks them. | [Agent] | 1.5.7, 4.5.8, 4.1.6, 4.1.7, 4.9.7 | Half a day either way. Two machines have been running since May and every limit is already doubled, so this is closer than the documents assume |
| G4.5 | Free-tier access to a user's own stored data: either lift the 30-day display cap for the user's own snapshots, or replace the policy's in-app-visibility claim with an email path. | [Agent] | 2.5.2, 2.5.3 | Half a day. Tier-gating a feature is fine; tier-gating the only route to your own stored data is not |
| G4.6 | Say "bank connections" on the paywall and in the header. | [Agent] | 5.8.6 | One word in two strings |
| G4.7 | Build the consumer counter that the 4,000 alarm and the state thresholds both need. | [Agent] | 5.3.8, and it arms 1.11.1, 1.12.8, 5.3.4, 2.10.4 | One hour, at the first 500 consumers, not before |
| G4.8 | Add user-scoped indexes to the nine remaining tables. | [Agent] | 4.7.8 | Trigger, not a task: 10,000 rows in any one of them, or the moment G1.17 lands and they become the remaining cost |
| G4.9 | Re-run the greyscale and Reduce Motion audits against the commissioned sprites. | [Agent] | the re-test triggers on 6.6.10, 6.5.1, 4.4.5, 3.10.2 | Trigger: G1.4 delivering Phase 2. The placeholder passes by construction and that guarantee does not transfer |
| G4.10 | Machine-readable export. | [Agent] | 2.5.1, 2.5.4 | LATER. Trigger: UK launch, or the first state threshold crossed. About a day when it arrives |

---

## Deliberately not doing, with the trigger that would change it

These are decided, not deferred by omission. Adding any of them costs a solo
founder ongoing attention for no present benefit, and a control nobody maintains
is worse than none.

| Not doing | Row | Trigger |
|---|---|---|
| Certificate pinning | 1.12.1, 1.12.2 | A written Plaid or partner requirement naming specific CAs |
| Jailbreak and root detection | 1.12.3 | A fraud pattern a device-side signal would actually detect |
| Anti-tampering and obfuscation | 1.12.4 | Shipping a client-side algorithm that is itself the product |
| A bug bounty | 1.12.6 | Unsolicited reports arriving faster than one a month. Do G1.25 instead |
| SOC 2 | 1.12.7 | A bank, benefits channel or B2B partner asking for the report |
| A formal written incident response plan | 1.12.8 | The 5,000th consumer, alarmed at 4,000. The one page in G1.28 is not the same thing |
| RASP | 1.12.9 | None foreseeable at this architecture |
| A WAF | 1.12.10 | Measured abuse of one of the three unauthenticated surfaces |
| DPoP sender-constrained tokens | 1.4.11 | Any web client, or a second party consuming this API |
| App Attest device binding | 1.4.12 | Measured abuse of a per-user quota that costs real money |
| Row level security | 1.10.5 | The first BOLA defect found in review, or the first non-founder writing a store function |
| Envelope encryption with a KMS | 1.3 sources note | The first employee, or the first suspected exposure |
| Certificate revocation checking on the Apple chain | 1.7.9 | Apple publishing a revoked App Store signing certificate |
| A third-party accessibility overlay | 6.8.5 | Nothing. Overlays are a subject of ADA litigation, not a defence against it |
| Shipping Android | 6.7.7, 3.13.7 | iOS at App Store parity plus a TalkBack pass |
| Chasing a SLSA level beyond L1 | 1.9.10 | Nothing. One `actions/attest-build-provenance` step reaches L1 honestly |
| StrongBox on Android | 1.2 sources note | Nothing. A Keystore-wrapped preference is the proportionate fix |

---

## What this runbook does not carry

Parts 1 to 6 are the only input. Three things `docs/launch-gap-analysis.md`
found are not owned by any of the six parts and therefore have no row to cite,
and they should not be lost because of that: the missing minimum-build handshake
and kill switch (§1 item 4, which that document argues must exist before the
first external build), the iOS release mechanics that make the second TestFlight
upload fail on a duplicate build number (§1 item 5), and the Play developer
account type decision (§8 item 2, which shares the D-U-N-S number with G1.1 and
should be registered when it arrives).

---

## Contradictions between parts, for adjudication

Five, in order of how much they change what gets done.

**1. The filled-button label colour. Parts 3 and 6 reach exactly opposite
verdicts, and both are right about one colour scheme.** Part 3 row 3.4.2g says
`.white` on `signalFill` fails at roughly 2.2:1 and that `HomeView.swift:203-204`
"does it correctly" with `CoinyTheme.screen`. Part 6 row 6.3.4 says
`CoinyTheme.screen` on `signalFill` fails at 4.34:1 and that onboarding's
`.white` passes at 5.03:1. Recomputing from `CoinyTheme.swift:22-24`
(`signalFill` is `#A85B14` light, `#E8A33D` dark): `screen` on `signalFill` is
**4.34:1 light** and **8.38:1 dark**; `.white` on `signalFill` is **5.03:1
light** and **2.16:1 dark**. Part 6 computed light only, Part 3 computed dark
only, and **neither current pairing passes in both schemes.** The fix is not to
pick one of them: add a mode-aware `onSignal` token (a light value over the
light-mode brown, `ink`-dark over the dark-mode amber). This changes G1.13, so
settle it before that pass starts.

**2. Neon protected branches: available or paid?** Part 2 row 2.9.5 calls it
"one toggle and no ongoing attention" and "the only new control this part
recommends adding". Part 4 row 4.12.11 says it is "a paid-plan capability, so
this is not a toggle that was missed". They cannot both be true. T8 settles it
in the console in two minutes; if Part 4 is right, the item moves to G4.2 and
Part 2's recommendation is really a recommendation to upgrade.

**3. How many machines are running, and therefore how urgent the shared rate
limiter is.** Part 1 row 1.5.7 read `fly.toml` and concluded staging runs "one
machine, fine", rating the counter split MINOR now and MAJOR "at the second
machine". Part 4 row 4.1.6 queried `fly machine list` and found **two machines,
one created in May**. Part 4 is right and says so (4.5.8, 4.1.7). The
consequence is that three separate deferrals in `engineering-budgets.md` (the
distributed lock, the connection ceiling, the rate-limiter store) already fired
without anyone noticing, and G4.4 is later than the facts justify. Consider
pulling G4.4 forward if `fly scale count` is not first reduced to one.

**4. Neon's history retention window.** Part 2 row 2.9.2 and Part 4 row 4.12.1
both queried the control plane and got **six hours**. Part 5 row 5.9.6 still
records it as UNVERIFIED and "settles in the Neon console". Part 5's row is
stale rather than wrong; the number is six hours and the privacy policy's
"30 days" claim describes R-20.1's dump, which G1.27 builds.

**5. The size of the telemetry consent fix.** Part 5 row 5.7.7 frames it as a
client-side gap: a consent line, a Settings toggle, and a client enforcement
rule. Part 2 row 2.6.4 adds a half Part 5 does not mention, that
`trackServerEvent` writes `signup_completed`, `account_connected`,
`goal_created`, `push_sent` and the rest unconditionally with no consent column
anywhere in `users`. Part 2 is more complete. G1.6 carries both halves, and a
fix scoped to Part 5's framing alone would leave a full behavioural trail
running.

Two further disagreements are between a part and the PRD rather than between
parts, and both are worth a decision. Part 1 row 1.4.5 rates revoke-all-sessions
**MAJOR and Gate 1** where R-15.3 calls it MINOR; this runbook follows Part 1
(G1.11). Part 4 rows 4.8.1 and 4.9.1 retire two claims the PRD and
`docs/obligations.md` still carry (the "roughly 36 external calls" figure and
"no scheduler exists"); G2.16 corrects the documents.

---

## Founder task list

Everything labelled [Founder] above, in one place, ordered by lead time. **28
items**, of which four are the long poles and eleven take under an hour. Read
this section on its own; nothing else in the runbook needs you.

### Start this week, because someone else's clock is running

| # | Task | Unblocks | Your time | Their time |
|---|---|---|---|---|
| G1.1 | Verify the Apple Developer enrollment for team `UKL98DS9D3` is an Organization. If Individual, start the migration; it needs the LLC's D-U-N-S number | Every archive, TestFlight, App Store submission, all device measurement, G3.1, G3.11, G3.12, G1.31 | 30 min to check, a few hours to file | **Weeks. The longest pole in the document** |
| G1.3 | Send the privacy policy and Terms of Service to an attorney with the inline notes and lawyer questions Q3, Q5, Q7 | Publishing the URLs, therefore G1.6's final copy | 1 hour to package | **Weeks** |
| G1.4 | Commission the character art, `docs/design-direction.md` §7.2 Phase 1, two artists in parallel | G3.5 the app icon, which blocks submission on its own | 4 to 6 hours to brief and choose | **4 to 6 weeks, $3,000 to $6,000** |
| G1.2 | Make the name call, buy the domain, host the policy, terms, deletion-request and `.well-known` pages | G1.5, G1.6, G2.1, G2.2, G3.1, and Plaid OAuth entirely | Half a day | Hours, ~$15/yr |

### As soon as the four above are moving

| # | Task | Unblocks | Your time |
|---|---|---|---|
| T4 | Enable MFA on Fly, Neon, Plaid, Apple Developer and GitHub; date it in `service-providers.md` | A Safeguards 314.4(c)(5) obligation, open since 2026-08-12 | 5 min |
| T3 | Point a free UptimeRobot monitor at `/health` | Knowing about the next outage | 5 min |
| T5 | GitHub `main`: enable `enforce_admins`, add a required-review rule | Six required checks that the owner account currently bypasses | 2 min |
| T8 | Check in the Neon console whether protected branches is on Free | Settles the Part 2 / Part 4 contradiction; either do it or defer to G4.2 | 2 min |
| G1.29 | Confirm `DATA_ENCRYPTION_KEY` is in the macOS Keychain. Presence only, never print it | The second of the two copies R-20.3 requires | 5 min |
| G1.30 | Simulator accessibility sweep: Accessibility Inspector audit, then Color Filters at Grayscale, Deuteranopia, Protanopia | Confirms or refutes the whole of 6.3 and 6.6 before any code changes | 30 min |
| G1.5 | Create and verify `coiny@athanorworks.com` | The support address every legal document and the App Store listing use | 30 min |
| G1.32 | Record the decision that Android does not ship until iOS reaches App Store parity | Parks nine Android rows across four parts | 10 min |
| G1.28 | Write the one-page incident plan: the FTC form URL, the consoles to rotate and in what order, the two clocks, and what rotating the encryption key actually costs | The only incident artefact a solo founder will use | 1 hour |
| G1.31 | Manual VoiceOver pass, all three tabs plus the expanded journey, paywall and eight onboarding screens. **Waits on G1.1** | The R-11.6 gate the PRD set and has never met | 1 hour |

### Before the first real bank connection

| # | Task | Unblocks | Your time |
|---|---|---|---|
| G2.1 | File the Plaid production access request from the Launch Center with the hosted policy URL. **Waits on G1.2 and G1.6** | Real bank data at all | 1 hour, then weeks of review |
| G2.2 | Register the OAuth redirect URI in the Plaid dashboard. **Waits on G1.2** | Chase, BofA, Wells Fargo and US Bank | 30 min, then Plaid latency, and Schwab can add six weeks |
| G2.3 | Read in a browser: Spinwheel's developer policy and end-user agreement, Kalshi's developer agreement, Coinbase CDP terms | G2.5's wording, and who carries the FCRA permissible-purpose obligation | One sitting |
| G2.4 | Sign the Qualified Individual designation; decide open decision B7 and date the disposal schedule's adoption line | Two written Safeguards artefacts that are currently drafts | 20 min |

### Before App Store submission

| # | Task | Unblocks | Your time |
|---|---|---|---|
| G3.1 | Create the App Store Connect record: description naming the financial-data integration, keywords, age rating, support URL, privacy policy URL. **Waits on G1.1 and G1.2** | Submission | Half a day |
| G3.3 | Accept or amend the demo-account plan (open decision B9), then supply the credentials in the review notes and the Fly secret | Guideline 2.1, the largest rejection category | 30 min to decide, 15 min to supply |
| G3.2 | Transcribe the nutrition labels field by field. **Waits on G3.4** | App Privacy in App Store Connect | 1 hour |
| G3.10 | Approve MetricKit's Performance Data label line (gap analysis §8 Q3), and decide whether to take the diagnostic half now or later | Every field performance number Part 4 cannot produce today | 15 min |

### Before the first paying user

| # | Task | Unblocks | Your time |
|---|---|---|---|
| G4.2 | Upgrade Neon to Launch | The 7-day restore window, protected branches, and compute headroom. Three triggers point at it | 10 min, ~$19/month |
| G4.3 | Decide the latency budget shape (two-tier, or disable scale-to-zero), and cut `engineering-budgets.md` §1 from thirteen targets to three | Measuring anything without producing false failures | 1 hour |
| G4.1 | Decide whether the three undelivered tier limits get wired or the paywall stops selling them | Whether $99 buys what it says | 30 min |

### Standing, with a trigger rather than a date

| # | Task | Trigger |
|---|---|---|
| F-1 | Watch the consumer count, and at 4,000 build the four Safeguards elements waived under 16 CFR 314.6 | 4,000 consumers. G4.7 builds the counter at 500 |
| F-2 | Annual service-provider review per `service-providers.md` | Twelve months from T4's dated review |
| F-3 | Register the Play developer organization account using the same D-U-N-S as G1.1 | When the D-U-N-S arrives, months before Android resumes |

---

## Coverage ledger

Confirming this part did what its brief asked.

| Brief requirement | Where |
|---|---|
| Four gates, in the brief's order | Gate 1 to Gate 4, plus Gate 0 for what is live and wrong |
| Every item labelled [Founder] or [Agent] | Every row in every gate table carries one |
| Ordered within each gate by lead time, with the lead time stated | The rightmost column of every gate table |
| Blocking relationships named explicitly | G1.1, G1.2, G1.3, G1.6, G1.7, G1.26, G2.1, G2.2, G2.5, G2.8, G2.9, G3.2, G3.4, G3.5, G3.9, G3.10, G3.11, G3.12, G1.31, G4.3 |
| De-duplicated across parts, presented once at the earliest gate | G1.6 (14 rows, 5 obligations, 4 parts), G1.13 (24 rows, Parts 3 and 6), G1.9, G1.10, G1.21, G2.16, T6 |
| "Do first, today" block above the gates, including the 503 flapping and the missing index | Gate 0, items T1 and T2 |
| Founder task list as the last section, ordered by lead time, with what it unblocks and how long it takes | Above |
| Reference by row ID, never restate | No item in this file reproduces an argument from Parts 1 to 6; every one cites the rows |
