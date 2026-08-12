# Engineering budgets

*Written 2026-08-12 against branch `fix/critical-backend-bugs`. Companion to `docs/prd-app-v2.md` (what to build) and the fintech-obligations doc (what binds us legally). This document owns the numbers: what "good enough to ship" means, how each number is measured, and what happens when it is breached. Where a number exists because a regulation demands it, the obligations doc owns the obligation; this doc only states the target.*

Context that sets every number here: solo founder, pre-launch, 30 TestFlight testers next, $99/yr paid launch after. One Fly.io `shared-cpu-1x` 256MB machine in `iad` (`fly.toml:28-30`), Neon Postgres, and a `GET /api/net-worth` that today fans out to up to ~36 external HTTP calls per request with no timeouts (`backend/src/api/net-worth.ts`, defect D4). Enterprise-grade SLOs are deliberately absent; the "later" triggers are stated inline.

---

## 1. Budgets

Every row: a number, the measurement that produces it, and the action on breach. "Current" is what the codebase does today.

| Attribute | Target | How measured | Action on breach | Current |
|---|---|---|---|---|
| `GET /api/net-worth` latency, cached read | p50 < 150 ms, p95 < 400 ms, server-side | Fastify already logs `responseTime` per request (pino default serializer). Weekly: `fly logs` piped through a jq percentile script, or the `request_completed` histogram once telemetry lands (§7) | Profile the slowest asset-class read; if it is an external call, it does not belong in the read path, move it behind the cache (§2) | Unmeasured, and structurally unboundable: 5 of 27 categories are live external fetches inside the request (`net-worth.ts:84-87, 196-219, 229-240, 511-532`) |
| `GET /api/net-worth` latency, read that triggers refresh | p95 < 3 s | Same log field, filtered on the refresh flag | Reduce per-request refresh scope; refresh classes in the background instead | Unmeasured |
| Any single outbound provider call | Hard timeout 5 s | Wrapper asserts it: every `undici` `request` and global `fetch` gets `AbortSignal.timeout(5000)` plus a `sync_failed` event on abort | A provider that regularly needs > 5 s gets its class moved to scheduled-only refresh | No timeout set anywhere. `undici`'s documented defaults are 300 s `headersTimeout` / 300 s `bodyTimeout` ([undici Client options](https://undici.nodejs.org/#/docs/api/Client)), so one hung vendor holds a request for up to 5 minutes |
| 5xx rate, all protected routes | < 0.5% of requests over 7 days | Count of `statusCode >= 500` log lines / total, from Fly logs; later the telemetry table | Read the error handler output for the top error class and fix it before feature work | Unmeasured. Worse, the failure mode today is not 5xx, it is 200-with-wrong-data (D5) |
| Plaid webhook acknowledgement | 200 returned < 500 ms, always before processing | Plaid's dashboard shows webhook delivery failures; log `responseTime` on `/webhooks/plaid` | None expected; the handler already replies before dispatching (`backend/src/webhook/plaid.ts:52-54`), keep it that way | Met by design, unmeasured |
| Plaid webhook processing completion | < 60 s from receipt, success rate > 99% | `sync_completed` / `sync_failed` events with `duration_ms` (§7) | Add per-item retry with backoff; a webhook whose processing throws is currently lost forever (`plaid.ts:54-60` logs and drops) | Unmeasured, no retry |
| iOS crash-free sessions | >= 99.5% during TestFlight | Xcode Organizer / TestFlight crash reports, checked weekly. No third-party crash SDK yet (would need a DPA first; obligations doc owns that) | Fix top crash before next build; halt tester invites if < 98% | Unmeasured, zero crash reporting (D9) |
| Backend memory | RSS < 200 MB steady on the 256 MB machine | `fly status` / Fly metrics dashboard, checked when deploying | Bump to 512 MB (about $2/mo more, [Fly pricing](https://fly.io/docs/about/pricing/)) rather than debugging OOM under load | Unmeasured |
| DB connections | <= 5 per machine, by config | `postgres(config.DATABASE_URL, { max: 5 })` at `backend/src/db/client.ts:24` | Raise only alongside Neon's pooled connection string; never raise blindly | Met by config |
| Uptime, `/health` | 99.5% monthly (about 3.6 h/month of allowed downtime; honest for one machine with `auto_stop_machines='suspend'`) | External pinger (UptimeRobot free tier, 5-minute interval) against `https://coiny-backend.fly.dev/health`. Must exist before the first tester; Fly's own health check (`fly.toml:21-26`) cannot see Fly being down | Investigate; if it is machine suspension latency, set a second `min_machines_running` machine only when paying users exist | Unmeasured externally |
| Push notifications per user | <= 1/day, <= 5/week, none 22:00-08:00 local | `push_sent` events counted per user per week (§7) | Drop lowest-priority pushes first; the "always push" list in `prd-app-v2.md` (rung completion, debt cleared, goal achieved, bill overdue once) is the last to go | Breached by design: every reaction dispatches a push with no cap (`backend/src/reactions/dispatch.ts`, per `docs/vision.md` §6 bug 4) |
| Net worth correctness | A failed integration must never contribute a silent 0 to `total` | Per-class `status` field in the response (§3), asserted in tests: kill one provider fixture, response must mark the class `error`, not zero it | Ship-blocker level: a wrong total destroys trust in every other number | Breached: ~30 bare `catch {}` blocks zero the class and return 200 (D5, e.g. `net-worth.ts:187-189, 221-223`) |
| Data freshness surfaced to user | Every displayed value carries `asOf`; UI degrades per §2 tiers | Response schema requires it; iOS snapshot test renders each tier | Ship-blocker level, same reason | Breached: the aggregate response has no freshness fields at all (D6, `net-worth.ts:611-660`) |
| Rate-limit headroom, Plaid | Never exceed per-item 5/min and 30/h on `/accounts/balance/get` ([Plaid rate limits](https://plaid.com/docs/errors/rate-limit-exceeded/)) | Count of `sync_failed` events with `error_class=429` per provider; target zero | Cap user-triggered refresh at 4/day per item (§5); jitter scheduled work (§4) | Breachable today: 6 pull-to-refreshes inside a minute 429 the item; the rejection is swallowed by `Promise.allSettled` + skip (`net-worth.ts:85, 143`), the bank section silently reads 0, and the wrong total is then persisted as the milestone baseline (`net-worth.ts:591-593`) |

Later, with the trigger stated: request tracing (OpenTelemetry) when there are two services or a second engineer, neither exists; alerting/paging when there are paying users whose money is stale for hours, until then the weekly review of the four dashboards above is the alerting; multi-region when a second market launches.

---

## 2. The data freshness contract

Design decision this table encodes: **balance freshness rides the Plaid Transactions webhook, not `/accounts/balance/get`.** Every `/transactions/sync` response already carries current account balances, and the webhook handler already extracts them (`plaid.ts:191`, `balancesByAccount` at `plaid.ts:275-281`) but throws them away instead of caching. Plaid bills Balance per successful call and Transactions as a monthly per-item subscription ([Plaid billing](https://plaid.com/docs/account/billing/)), and Plaid refreshes transactions one to four times per day per item on its own schedule ([Plaid docs](https://plaid.com/docs/api/products/transactions/#webhooks)). So webhook-carried balances are already paid for, arrive 1-4x/day, and cost zero marginal dollars. `/accounts/balance/get` is reserved for explicit user pull-to-refresh, capped.

Every class gets a cached row with `value`, `asOf`, `status`. The read path (`GET /api/net-worth`) becomes DB-only.

| Data class | Refresh trigger | Interval | Cost per refresh | Staleness tiers | Never show past |
|---|---|---|---|---|---|
| Bank balances (Plaid depository/credit) | Push: cache balances out of every `SYNC_UPDATES_AVAILABLE` sync (`plaid.ts:191`, currently discarded). Pull: user pull-to-refresh calls `/accounts/balance/get`, capped 4/day per item and debounced 60 s client-side (per-item limit is 5/min, 30/h) | Plaid-driven, 1-4x/day per item | $0 on the push path (covered by the Transactions item subscription). Per-call fee on the pull path, exact price sales-quoted, unverified; treat each manual refresh as billable | Under 24 h: plain number. 24-48 h: "as of Tue 14:00". Over 48 h: muted number, tap-to-refresh affordance | 7 days. Past that: last value shown muted and labelled "stale, refresh or reconnect", excluded from `total`, class `status=stale_excluded` |
| Transactions (Plaid) | Push only: `SYNC_UPDATES_AVAILABLE` -> `transactionsSync` cursor walk (`plaid.ts:163-273`) | Plaid-driven, 1-4x/day | $0 marginal (item subscription) | Spending views show "through <date of newest tx>" | Never excluded; transactions are history, not a balance |
| Plaid liabilities (min payment, due date, APR) | Push: `LIABILITIES: DEFAULT_UPDATE` webhook -> cache (`plaid.ts:86-117`). Kill the live fallback at `net-worth.ts:110`: first use of `/liabilities/get` enrolls the item in a monthly Liabilities subscription per the billing doc, so the "cache empty" fallback silently starts billing on every item | Plaid-driven | $0 marginal once subscribed; the point is to subscribe only items that actually have liabilities | Due-date data older than 35 days shows "check your card" instead of a date | 60 days for `nextDueDate` and `isOverdue` (a stale overdue flag is a false accusation); balance follows the bank-balance rule |
| Plaid investment holdings | Scheduled daily at a per-user jittered minute (`hash(userId) % 1440`), only for items that actually have `investment` accounts. Today `investmentsHoldingsGet` runs for every item on every read (`net-worth.ts:86`), which both hits the 15/min per-item limit and, per Plaid billing, turns on the Investments Holdings subscription for items with no brokerage | 24 h | $0 marginal per call once subscribed; the cost is the per-item monthly subscription, so the gate is "subscribe only when investment accounts exist" | Under 24 h plain; 24-72 h "as of"; over 72 h muted | 7 days, then excluded from `total`, labelled |
| Coinbase, Kraken balances | Scheduled 6 h, jittered; opportunistic on app open if older than 6 h | 6 h | $0, key-based exchange APIs, no per-call billing | Under 6 h plain; 6-24 h "as of"; over 24 h muted + tap-to-refresh | 7 days, excluded, labelled "reconnect" |
| DeFi (Zerion) and chain wallets | Scheduled 6 h, jittered. Kill the live per-read loop (`net-worth.ts:229-240`, sequential per wallet) | 6 h | Zerion bills per API request; exact rate unverified (pricing page is behind a form). Budget assumption recorded: <= $0.01/request; settle it by reading the first Zerion invoice | Crypto moves fast but the pet is banned from reacting to it (`docs/vision.md` §5), so 6 h staleness is a display concern only: same tiers as exchanges | 7 days, excluded, labelled |
| Spinwheel debt profile | Scheduled daily; bureau data changes at most monthly. Kill the live per-read call (`net-worth.ts:518`) | 24 h | Per-connection vendor billing, sales-quoted, unverified | Under 7 days plain (bureau cadence); over 7 days "as of" | 45 days, then fall back to Plaid-visible liabilities using the existing `spinwheelDebtsLoaded` reconciliation (`net-worth.ts:510, 539-541`), labelled "credit report stale" |
| Collectibles prices (sneakers, Pokemon, trading cards, graded coins, vinyl, CS2) | Scheduled weekly, jittered across the week by user | 7 days | One vendor API call per holding set; per-call pricing varies by vendor, unverified individually | Under 7 days plain; 7-30 days "priced <date>" | 30 days: keep showing the value (collectible prices do not decay like bank data) but badge it "old price" and fire the refresh prompt |
| Real estate, vehicles (RentCast / MarketCheck, US-only) | Scheduled monthly; these APIs have no sandbox and real per-call cost | 30 days | Per-call, vendor-priced, unverified | Under 30 days plain; 30-90 days "estimated <month>" | Never excluded: an old house estimate beats a hole in net worth, but past 90 days the row must read "estimate, 3 months old" |
| Manual / declared assets | Never auto-refreshed. User nudged at 60 days per `prd-app-v2.md` ("Your car estimate is 2 months old") | User-driven | $0 | Always labelled "self-reported <date>" | Never excluded, always labelled; declared values are the product's onboarding trick and honesty about them is the trust story |
| FX rates (Frankfurter) | Scheduled daily | 24 h | $0, free API | Invisible to user until multi-currency ships | A rate older than 72 h blocks conversion; show native currency instead of converting with a stale rate |

The `never show past` column is enforced server-side (the class flips to `stale_excluded` and drops out of `total`), not in the UI, so the Android client (a second consumer of this response shape, per the context brief) inherits it for free.

---

## 3. Degradation

Contract: the response schema for `GET /api/net-worth` gains, per asset class, `{ value, asOf, status }` where `status ∈ ok | stale | stale_excluded | error | disconnected | reauth_required | not_connected`. Additive change only, so existing iOS and Android decoders keep working while they migrate. **Never a silent zero, never an unlabelled stale value, never `connected: true` for a connection that did not produce data** (today `coinbaseConnected`, `zerionConnected`, `spinwheelConnected` are set to true before the fetch runs: `net-worth.ts:201-202, 230-232, 516-518`).

| Failure mode | What the API returns | What the UI shows |
|---|---|---|
| Provider timeout (5 s) or 5xx | Cached value with its real `asOf`, `status=stale`; if no cache exists, `value=null`, `status=error`. Class excluded from `total` only when `value=null` or past its never-show age | The cached number with its age; or a row reading "can't reach <provider>" with retry. The total renders with a footnote count: "2 accounts not included" |
| Provider 429 | Same as timeout, plus the client-side refresh cap tightens (no retry for 15 min) | Same, plus the refresh control disables with a countdown |
| Plaid `ITEM_LOGIN_REQUIRED` / `ERROR` webhook | Item marked `reauth_required` in DB (new column on items); all its classes report `status=reauth_required` with last value and `asOf`. Values held for 7 days per §2, then excluded | A "Reconnect" button that launches Link update mode (D8 fix; Plaid's documented remediation for both, [Plaid item webhooks](https://plaid.com/docs/api/items/#pending_expiration)) |
| Plaid `PENDING_EXPIRATION` / `PENDING_DISCONNECT` | Item marked `expiring`, data still flows | A pre-emptive banner: "Your bank connection expires in 7 days, renew now" (the webhook fires exactly 7 days ahead) |
| Plaid `USER_PERMISSION_REVOKED` | Already disables the item (`plaid.ts:69-73`); classes report `disconnected`, values excluded immediately, not after 7 days: the user revoked, showing their data anymore is wrong | Row reads "disconnected", with re-link affordance |
| DB unreachable | 503 with the standard error body. Never a fabricated response | iOS shows its existing offline state with the last locally rendered snapshot |
| `DATA_ENCRYPTION_KEY` unset | Refuse to boot in production. Today `util/crypto.ts` silently no-ops outside prod; add a boot assertion for `NODE_ENV=production` so plaintext tokens can never be written by a misconfigured deploy | n/a |
| APNs dispatch failure | Log and drop; a reaction push is never retried (a late push about money is worse than no push) | n/a |
| Webhook processing crash mid-sync | Cursor only advances after persistence (`plaid.ts:220-223`, already correct), so the next webhook replays safely. Add the §1 completion metric so crash loops are visible | n/a |

Everything in this table is testable with the existing PGlite + fixture setup: kill one fixture, assert the class status; no new test infrastructure needed.

---

## 4. Scaling limits

The tiers assume the §2 cache and scheduler exist; where they do not yet, the 100-user row is really the 10-user row.

**100 users (TestFlight and just past it).** What breaks first: the live read path, latency and correctness, not throughput. Each `GET /api/net-worth` fires per-item Plaid balance + holdings calls (`net-worth.ts:84-87`), Coinbase accounts + spot prices (`:196-219`), Zerion sequentially per wallet (`:229-240`), and Spinwheel (`:511-532`), with no timeouts, on one shared CPU. One hung vendor pins a request for up to 300 s (undici default), and iOS multiplies the damage by fanning out 24 further requests per refresh (D15, `ios/Coiny/Views/NetWorthView.swift:5-30,60-89`). Separately, the Plaid per-item balance limit (5/min) is reachable by one enthusiastic tester, and the failure is silent (bank section zeroes, §1 last row). Fix: the D4/D5/D3 remediation in §8, now, before the first tester. Also at this tier: Plaid's Trial plan covers only **10 free production Items** ([Plaid support](https://support.plaid.com/hc/en-us/articles/16110110883479-How-are-Sandbox-Production-Trial-plan-and-Limited-Production-different)), so 30 testers each linking a bank cannot all be on real data for free; either 10 real-data testers + 20 sandbox, or pay-as-you-go billing starts here.

**1,000 users.** What breaks first: the Neon Free plan and the iOS fan-out. Free includes 100 CU-hours/month ([Neon pricing](https://neon.com/pricing)); steady traffic keeps the endpoint awake most of the month, which at the 0.25 CU minimum is ~180 CU-hours, so the plan exhausts mid-month. Fix: move to Launch, roughly $19/month at that duty cycle, when the second hundred users arrive. The D15 fan-out (24 requests per refresh per user) multiplies request volume ~25x over what one response could carry; fix D15 (iOS reads the single net-worth response it already gets) before 1,000, ~6 h. The single 256 MB machine holds if, and only if, the read path is DB-only by then. The `{ max: 5 }` connection cap (`db/client.ts:24`) is adequate for one machine; switch to Neon's pooled connection string before adding a second.

**10,000 users.** What breaks first: the scheduler stampede against Plaid's per-client limits, and webhook burst processing. A naive top-of-hour cron refreshing 10,000 items collides with `/accounts/balance/get`'s 1,200/min per-client ceiling; the fix is already in the §2 design (`hash(userId)`-offset jitter, spread over the full interval), it just must not be lost when the scheduler is written. Second: banks post overnight batches, Plaid fires webhook waves, and each `setImmediate` dispatch (`plaid.ts:54`) runs unbounded concurrent `syncItem` pagination loops on one machine; add an in-process concurrency cap (a 10-wide semaphore, no queue infrastructure) when webhook volume passes ~1/second sustained. Third: `runMigrations()` at boot (`src/server.ts:59-60`) is safe with one machine; before running two machines, add a Postgres advisory lock around it. None of this is worth building before the tier is in sight; each fix is < a day when its trigger fires.

---

## 5. Cost per user per month, and the sync frequency that holds it

Revenue is $99/yr = $8.25/user/month. Budget: **variable API cost <= $1.25/user/month** (15% of revenue), so that Apple's 15-30% cut, fixed costs, and margin survive.

Fixed floor (today): Fly machine ~$2/month ([Fly pricing](https://fly.io/docs/about/pricing/), $1.94-2.02 by region), Neon $0 (Free plan), APNs $0, Apple Developer $99/yr. Under $5/month total before the first user.

Variable model per paying user, under the §2 contract:

| Line item | Driver | Est. $/user/month | Basis |
|---|---|---|---|
| Plaid Transactions subscription | 1 bank item, monthly per-item fee | ~$0.30 | `docs/global-integration-map.md` §9 estimate; exact price is sales-quoted. Unverified: confirm against the first pay-as-you-go invoice |
| Plaid Balance calls | User pull-to-refresh only, capped 4/day; assume 20/month actually used | ~$0.20-0.60 | Per-call billing confirmed ([Plaid billing](https://plaid.com/docs/account/billing/)); per-call price unverified |
| Plaid Liabilities + Investments subscriptions | Only items that have those account types (see §2 gating; today every item gets enrolled) | ~$0.20 blended | Subscription model confirmed; prices unverified |
| Zerion | 4 scheduled refreshes/day x wallets | ~$0.10 at the assumed rate | Rate unverified, assumption recorded in §2 |
| Exchanges, chains, FX | Key-based / free APIs | ~$0 | No per-call billing |
| Collectibles + real-asset vendors | Weekly/monthly cadence | ~$0.10 blended | Vendor-specific, unverified |
| **Total** | | **~$0.90-1.30** | Consistent with the integration map's "$0.30 to ~$4" range, held at the low end by the sync schedule |

The sync frequency that holds it, stated as the dial it is: **bank data rides webhooks (free), everything scheduled refreshes at 6 h or slower, and the only per-call-billed endpoint a user can drive is capped at 4/day.** The single most expensive thing this codebase could do is the thing it does today: per-call-billed Plaid endpoints inside `GET /api/net-worth`. Two app opens a day at ~30 days is 60 billed Balance calls per item per month, plus the silent enrollment of every item into Investments and Liabilities subscriptions via `net-worth.ts:86` and `:110`. At any plausible per-call price this alone exceeds the whole $1.25 budget; the §2 contract is the cost model, not just the freshness model.

Measured by: monthly vendor invoices divided by MAU, recorded in a one-line ledger in this doc's git history. Breach action: lengthen the §2 intervals for the offending class (the tiers were chosen so a 2x slowdown stays inside the never-show ages), then re-tier pricing if that is not enough.

---

## 6. Reliability: backup, restore, RPO, RTO, and the restore rehearsal

What is irreplaceable, in order: encrypted Plaid/vendor access tokens (users must re-link every account if lost), `net_worth_daily` history (`src/db/schema.ts:615-628`, cannot be re-fetched, it is the retention feature's raw material), ladder/goal state, sessions (cheap to lose, users re-authenticate).

| Item | Target | How | Action on breach |
|---|---|---|---|
| RPO (data loss window) | <= 24 h worst case; seconds within Neon's PITR window | Two layers. Neon Free gives 6-hour point-in-time restore, 1 GB limit ([Neon pricing](https://neon.com/pricing)): covers "I just ran a bad migration." Layer two, before the first tester: nightly `pg_dump` via GitHub Actions cron, encrypted with `age` against a key held in the same two places as `DATA_ENCRYPTION_KEY`, retained 30 days: covers "corruption discovered after 6 hours," which the Free window cannot | If the nightly dump job fails twice consecutively (job sends a failure email), fix before any feature work |
| RTO (restore time) | < 4 h, solo-founder-realistic | Rehearsed, below | If the rehearsal exceeds 4 h, script the slow step |
| Restore rehearsal | Once before the first tester, then quarterly, ~1 h each | Restore last night's dump into a scratch Neon branch, run `runMigrations()` against it, run three assertions: row counts within 5% of prod, one known user's token decrypts with the prod key, `net_worth_daily` max(date) is yesterday. Record wall-clock time in this doc | A failed rehearsal is a sev-1 for the week: an untested backup is a hope, not a backup |
| Encryption key survivability | `DATA_ENCRYPTION_KEY` exists in exactly two places: Fly secrets and macOS Keychain | Verify both during each rehearsal (presence, not value; never echo it) | Key loss = every stored token is ciphertext garbage = every user re-links everything. There is no third mitigation |
| Neon plan upgrade trigger | Move to Launch (7-day PITR) when the first paying user exists or DB size approaches 1 GB, whichever is first | `SELECT pg_database_size(...)` during rehearsal | n/a |

Availability obligations (uptime commitments to users, incident disclosure) are the obligations doc's half; the 99.5% number and its pinger live in §1.

---

## 7. Instrumentation spec

Today there is zero instrumentation, backend and iOS (D9). The gate questions this must answer with data, not opinion: **retention by week since signup** (the PRD's W4 metric, `docs/prd-app-v2.md` §1.10, target 25% at 1,000 users; the week-8 read is the same query with `week=8`; the locked hardware gate in `docs/vision.md` §8, 1,000 paying subscribers active at 3 months, is the same table joined to subscriptions), **declared-to-connected conversion** (PRD §1.11 and the declared-chip prompts), and **rung completion**. None of these can be backfilled: a cohort you did not instrument is gone. So the pipeline below is a launch blocker for the first tester, and it is deliberately tiny.

Mechanics: an `analytics_events` table in the existing Postgres (`user_id`, `event`, `properties jsonb`, `client_ts`, `server_ts`), one `POST /api/telemetry` endpoint accepting a batch (Zod-validated, protected scope), iOS queues events and flushes 25 at a time or on background. No third-party analytics vendor yet: no new dependency (hard constraint 10), no DPA to negotiate before the obligations doc exists, and 30 testers produce a volume SQL handles trivially. Trigger to revisit: when cohort queries need more than SQL, or at 1,000 users. Property rule inherited from `.claude/rules/security.md` #2: **no amounts, no merchant names ever; values are bucketed enums** (`0-1k`, `1k-10k`, ...).

| Event | Trigger | Properties | Gate metric it serves |
|---|---|---|---|
| `signup_completed` | First session created (backend, `api/auth.ts`) | `method` | Denominator for everything; defines the cohort week |
| `onboarding_declared` | Declare step submitted | `classes[]`, `class_count`, per-class bucketed value | Declared-to-connected: numerator source list |
| `link_opened` | Any provider link/connect flow presented (iOS) | `provider`, `source` (onboarding, prompt, settings) | Declared-to-connected funnel top |
| `link_result` | Link flow exits (iOS) | `provider`, `status` (success, abandoned, error), `last_step` where the SDK exposes it (Plaid Link does, [measuring conversion](https://plaid.com/docs/link/measuring-conversion/)) | Declared-to-connected: where the funnel leaks |
| `account_connected` | First successful data fetch for a new connection (backend) | `provider`, `asset_class`, `nth_connection` | Declared-to-connected numerator; cost model (connections are the billing unit) |
| `first_number_shown` | First net-worth render after signup (iOS) | `seconds_since_signup`, `class_count` | The 90-second onboarding promise (`prd-app-v2.md` §"Ninety seconds") |
| `app_open` | Foreground (iOS) | `source` (push, icon), `days_since_signup` | Week-N retention: distinct users with an `app_open` in week N / cohort size |
| `rung_started` / `rung_completed` / `rung_skipped` | Goals engine transitions (backend, once D10 wires it) | `rung_index`, `skip_reason` enum | Rung completion; the W4 numerator is `rung_completed` or habit-period completion joined to week-4 activity |
| `rung_progress` | Decile crossings only, not every recompute | `rung_index`, `decile` | Sub-stage progress visibility check (PRD §6A) |
| `reaction_shown` | Reaction rendered (iOS) | `type`, `origin` (behavior, market) | Counter-metric: `origin=market` must be zero after the vision §5 fix |
| `push_sent` | APNs dispatch (backend) | `type` | §1 push budget; PRD counter-metric |
| `push_permission_changed` | iOS authorization callback | `granted` | PRD counter-metric: push opt-out rate |
| `sync_failed` / `sync_completed` | Any provider fetch settles (backend) | `provider`, `error_class` (timeout, 429, 5xx, auth), `duration_ms` | §1 reliability budgets; §3 degradation monitoring |
| `item_state_changed` | Plaid lifecycle webhooks (backend) | `state` (healthy, reauth_required, expiring, revoked, repaired) | Freshness contract health; D7/D8 verification |
| `subscription_started` / `subscription_churned` | StoreKit server notifications (post-launch) | `plan` | The 1,000-paying-at-3-months hardware gate |

The retention query, written now so the definition cannot drift: cohort = users by `signup_completed` ISO week; retained at week N = distinct `user_id` with any `app_open` where `days_since_signup BETWEEN 7N AND 7N+6`; W4 additionally requires a `rung_completed` or habit completion within 28 days. One saved SQL file, `backend/queries/retention.sql`, run weekly by hand until it earns a dashboard.

---

## 8. Remediation list for defects D3 to D8, ranked, with hours

Ranked by "prevents a tester from seeing a wrong number" first, then by unblocking order. Total ~37 h, roughly one focused week.

| Rank | Defect | Fix | Hours | Why this position |
|---|---|---|---|---|
| 1 | D4, no timeouts on ~36 external calls (`net-worth.ts`, `zerion/client.ts:25`, undici 300 s defaults) | One `withTimeout` wrapper: `AbortSignal.timeout(5000)` on every outbound call, emitting `sync_failed` on abort | 3 | Cheapest fix, protects every other path, and nothing else is measurable while a request can hang 5 minutes |
| 2 | D5, ~30 bare `catch {}` returning silent zeros; `connections.*` set before fetch (`net-worth.ts:187-189, 201, 230, 516` and siblings) | Replace per-class try/catch with a helper returning `{ value, asOf, status }`; set `connected` only on success; add the per-class fixture-kill tests from §3 | 10 | The single defect most likely to show a tester a wrong total; also creates the response shape everything else hangs off |
| 3 | D6, aggregate response surfaces no freshness (`net-worth.ts:611-660`) | `asOf` per class rides the D5 shape; iOS renders the §2 staleness tiers | 4 (1 backend, 3 iOS) | Nearly free once D5 lands; without it the freshness contract is invisible |
| 4 | D7, Plaid lifecycle webhooks dropped (`plaid.ts:74-83`: `PENDING_EXPIRATION` logged and discarded, `ERROR`/`ITEM_LOGIN_REQUIRED` unhandled, `PENDING_DISCONNECT` absent) | Add an item `status` column; persist state on `ERROR`, `PENDING_EXPIRATION`, `PENDING_DISCONNECT`; emit `item_state_changed`; classes report `reauth_required` per §3 | 4 | Bank items break within weeks in production; testers will hit this during the TestFlight window |
| 5 | D8, no Link update mode anywhere (backend, `ios/Coiny/Views/OnboardingView.swift`, `SettingsView.swift:96`) | Backend: link-token create with `access_token` for update mode. iOS: "Reconnect" button on any `reauth_required` class, reusing the existing LinkKit integration | 8 | Completes D7: detection without repair still ends in "Reset onboarding", which destroys the account relationship |
| 6 | D3, no scheduler exists (grep-verified: zero cron/setInterval/queue in `backend/src`) | In-process scheduler in `server.ts` boot: one `setInterval` tick per minute scanning `last_synced_at` columns against the §2 intervals, per-user jitter `hash(userId) % interval`, concurrency cap 5. No BullMQ, no Redis, one machine (constraint 10) | 8 | Last because it depends on the D5 cached shape, and because webhook-carried balances (the `plaid.ts:191` cache-through, ~2 h, included here) already cover the most important class |

Adjacent but not in D3-D8, noted for the same sprint: move the milestone check and `lastNetWorthUsd` write (D18, `net-worth.ts:572-596`) out of the GET and into the scheduler tick, ~2 h, otherwise the "GET with side effects" writes a wrong baseline every time a provider fails; and stop the unconditional `investmentsHoldingsGet`/`liabilitiesGet` enrollment (§5, ~2 h) before pay-as-you-go billing starts.

---

## Unverified items, collected

- Exact Plaid per-product prices (Transactions, Balance, Liabilities, Investments): Plaid publishes billing models but no dollar amounts ([pricing page](https://plaid.com/pricing/) confirms none are listed). Settled by the first pay-as-you-go invoice or a sales quote. The §5 table uses the integration map's estimates and says so.
- Zerion per-request price: assumed <= $0.01/request in §2/§5; settled by the first invoice.
- Which Plaid plan the existing team is on (it predates the 2026-04-15 Trial-plan cutoff, per `docs/global-integration-map.md` §8): determines whether the 10-free-Items path exists at all. Settled in the Plaid dashboard.
- Fly `iad` exact machine price: docs show $1.94-2.02 across regions; `iad` assumed ~$2. Settled on the first Fly invoice.
- Runtime behavior of the deployed app (all latency "current" values are unmeasured by definition; the §1 measurements exist to fix that).
