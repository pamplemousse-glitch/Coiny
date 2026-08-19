# Engineering budgets

*Written 2026-08-12 against branch `fix/critical-backend-bugs` (commit `d8adad1`), superseding the 2026-08-12 first pass. Companion to `docs/prd-app-v2.md` (what to build) and the fintech-obligations doc (what binds us legally). This document owns the numbers: what "good enough to ship" means, how each number is measured, and what happens on breach. Where a number exists because a regulation demands it, the obligations doc owns the obligation; only the target lives here.*

Context that sets every number: solo founder, pre-launch, 30 TestFlight testers next, $99/yr paid launch after. One Fly.io `shared-cpu-1x` 256MB machine in `iad` (`fly.toml:28-30`, `min_machines_running = 1` at `fly.toml:19`), Neon Postgres on the Free plan, and a `GET /api/net-worth` whose external fan-out scales with linked items, held coins and wallets (`backend/src/api/net-worth.ts:84-87, 196-219, 229-240, 511-532`). Enterprise SLOs are deliberately absent; every "later" carries its trigger inline.

Severity labels (BLOCKER / MAJOR / MINOR / LATER) use the shared four-document scale.

---

## 1. Budgets

Every row: a number, the measurement that produces it, and the action on breach. "Current" is what the code does today, verified by reading it.

| Attribute | Target | How measured | Action on breach | Current |
|---|---|---|---|---|
| `GET /api/net-worth` latency, cached read | p50 < 150 ms, p95 < 400 ms server-side | Fastify logs `responseTime` on every request completion (pino default; the custom serializers in `src/plugins/logger.ts` strip headers, not timing). Weekly: `fly logs` through a jq percentile script until the telemetry table (§8) exists | Profile the slowest class; if it is an external call it does not belong in the read path, move it behind the §2 cache | Unmeasured, and structurally unboundable: 5 of 27 categories are live external fetches inside the request. MAJOR |
| `GET /api/net-worth` latency, read that triggers refresh | p95 < 3 s | Same log field, filtered on the refresh flag once it exists | Shrink per-request refresh scope; background the rest | Unmeasured |
| Any single outbound provider call | Hard timeout 5 s, <= 2 retries | `src/util/fetch.ts` already implements exactly this (5 s `AbortSignal.timeout`, retries on 429/5xx at 200/400 ms). Measurement is adoption: `grep -rl "from 'undici'\|await fetch(" src` must return only `util/fetch.ts` | A provider that regularly needs > 5 s moves to scheduled-only refresh | Split brain: 16 clients (all `chains/*`, hyperliquid, polymarket, kicksdb) use the wrapper; the five clients on the live read path (`plaid/client.ts:28`, `coinbase/client.ts:229`, `zerion/client.ts:25`, `spinwheel/client.ts`, plus kraken, snaptrade, alpaca, truelayer and 8 others) use bare `fetch`/undici with no timeout. undici defaults are 300 s `headersTimeout` and 300 s `bodyTimeout` ([undici Client docs](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Client.md)), so one hung vendor pins a request for 5 minutes. MAJOR |
| Zerion cold-wallet polling inside a request | Never poll in the read path | Code inspection: `zerionFetch` retries 202 up to 6 times at 5 s intervals (`src/zerion/client.ts:40-43`), ~30 s worst case per cold wallet, sequential per wallet (`net-worth.ts:232-239`) | Move Zerion reads behind the §2 cache; the 202 poll is fine in a background job, unacceptable in a GET | Breached whenever a new wallet is added. MAJOR |
| 5xx rate, all protected routes | < 0.5% of requests over 7 days | `statusCode >= 500` log lines / total, from Fly logs; later the telemetry table | Read the error handler output for the top class, fix before feature work | Unmeasured. The dominant failure mode today is not 5xx, it is 200-with-wrong-data (D5) |
| Plaid webhook acknowledgement | 200 in < 500 ms, always before processing | `responseTime` on `/webhooks/plaid`; Plaid dashboard shows delivery failures | None expected: the handler replies at `src/webhook/plaid.ts:52` and defers work via `setImmediate` at `:54`. Keep it that way | Met by design, unmeasured |
| Plaid webhook processing completion | < 60 s from receipt, > 99% success | `sync_completed` / `sync_failed` events with `duration_ms` (§8) | Add per-item retry with backoff; a processing throw is logged and lost forever (`plaid.ts:54-60`) | Unmeasured, no retry |
| Push notifications | <= 2 per rolling 7 days (met), <= 1/day and quiet hours 21:00-08:00 local (PRD §5.6, not implemented) | `push_sent` events per user per week (§8); code inspection for the missing two rules | Implement the day cap and quiet hours in `canSendPush` before the first tester with pushes enabled | Partially met: `store/notifications.ts:8-13` enforces 2/week plus a 24 h same-type cooldown, and `reactions/dispatch.ts:43` gates on it. No day cap: two different event types can push within the same hour. No quiet hours: a 3 a.m. webhook pushes at 3 a.m. MINOR until pushes are on for testers, then MAJOR |
| iOS crash-free sessions | >= 99.5% during TestFlight | Xcode Organizer / TestFlight crash reports, weekly. No third-party crash SDK (a DPA would come first; obligations doc owns that) | Fix top crash before next build; pause tester invites under 98% | Unmeasured, zero crash reporting (D9) |
| Backend memory | RSS < 200 MB steady on the 256 MB machine | Fly metrics dashboard, checked at each deploy | Bump to 512 MB (about $2/mo more, [Fly pricing](https://fly.io/docs/about/pricing/)) rather than debugging OOM under load | Unmeasured |
| DB connections | <= 5 per machine | By config: `postgres(config.DATABASE_URL, { max: 5 })` at `src/db/client.ts:24` | Raise only together with Neon's pooled connection string, never blindly | Met by config |
| Neon compute budget | <= 100 CU-hours/month while on Free | Neon dashboard usage page, checked weekly once the scheduler exists (§3 explains why the scheduler is what threatens this) | Move to Launch, usage-priced at $0.106/CU-hour ([Neon plans](https://neon.com/docs/introduction/plans)) | Unmeasured |
| Uptime, `/health` | 99.5% monthly (~3.6 h allowed; honest for one machine) | External pinger: UptimeRobot free tier, 50 monitors, 5-minute interval ([pricing](https://uptimerobot.com/pricing/)), against `https://coiny-backend.fly.dev/health`. Must exist before the first tester; Fly's own check (`fly.toml:21-26`) cannot see Fly being down | Investigate; add a second machine only when paying users exist | Unmeasured externally |
| Net worth correctness | A failed integration never contributes a silent 0 to `total` | Per-class `status` in the response (§4), asserted by fixture-kill tests: kill one provider fixture, the class must read `error`, not zero | Ship-blocker: a wrong total destroys trust in every other number on the screen | Breached: 29 bare `catch {}` blocks in `net-worth.ts` zero the class and return 200 (D5). Also breached one layer down: `zerion/client.ts:138,141` returns `total_usd: 0` on 404 and on schema-parse failure before the route's catch is even reached. BLOCKER |
| Freshness surfaced to user | Every displayed value carries `asOf`; UI degrades per §2 | Response schema requires it; iOS snapshot test per tier | Ship-blocker, same reason | Breached: the aggregate response (`net-worth.ts:611-660`) has no freshness field at all (D6). BLOCKER |
| Plaid rate-limit headroom | Zero 429s in steady state. Documented per-item limits: `/accounts/balance/get` 5/min and 30/h, `/investments/holdings/get` 15/min, `/transactions/sync` 50/min; per-client: 1,200/min, 2,000/min, 2,500/min respectively ([Plaid rate limits](https://plaid.com/docs/errors/rate-limit-exceeded/)) | `sync_failed` events with `error_class=429` per provider (§8) | Cap user-triggered refresh at 4/day per item (§2); jitter all scheduled work (§3) | Breachable today: 6 pull-to-refreshes in a minute 429 the item, `PlaidApiError` is rejected inside `Promise.allSettled` (`net-worth.ts:84-87`), skipped at `:143` and `:172`, the bank section silently reads 0, and the wrong total is then persisted as the milestone baseline at `:591-593`. MAJOR |

Later, with triggers: request tracing (OpenTelemetry) when a second service or second engineer exists; paging/alerting when paying users' money can be stale for hours, until then the weekly dashboard review is the alerting; a second Fly machine plus a Postgres advisory lock around `runMigrations()` (`src/server.ts:59-60`) when one machine stops holding.

---

## 2. The data freshness contract

The design decision this table encodes: **bank balance freshness rides the Plaid Transactions webhook, not `/accounts/balance/get`.** The evidence chain, each link verified: every `/transactions/sync` response carries an `accounts` array with `balances.current/available` ([Plaid API reference](https://plaid.com/docs/api/products/transactions/)); the webhook handler extracts them (`webhook/plaid.ts:191`, `balancesByAccount` at `:275-281`); the adapter formats them per transaction as `running_balance` (`plaid/adapter.ts:150`); and the `transactions` table (`db/schema.ts:99-108`) has no such column, so the value is computed, formatted, and dropped at the DB boundary. Meanwhile Plaid bills Balance per successful request and Transactions as a monthly per-item subscription ([Plaid billing](https://plaid.com/docs/account/billing/)), and refreshes transactions "one to four times per day" per item on its own schedule ([Plaid webhooks](https://plaid.com/docs/transactions/webhooks/)). Webhook-carried balances are already paid for, arrive 1-4x/day, and cost zero marginal dollars. `/accounts/balance/get` is demoted to explicit pull-to-refresh, capped.

Second decision, corrected from the first pass of this document: **the subscription-product enrollment problem is at link time, not first call.** `plaid/client.ts:71` defaults `products: ['transactions', 'investments', 'liabilities']` on every `/link/token/create`, and Plaid initializes and bills products in the `products` array at Item creation regardless of API calls: "you will be billed for each product that you specify when initializing Link," and "a product cannot be removed from an Item once the Item has been initialized with that product" ([Plaid Link API](https://plaid.com/docs/api/link/)). So every linked bank account carries three monthly subscriptions from day one, permanently, even a checking-only item. The fix is one line: `products: ['transactions']`, `required_if_supported_products: ['investments', 'liabilities']`, which bills "only if the user selects an institution and account type that supports them" (same source). The live `liabilitiesGet` fallback at `net-worth.ts:110` and the unconditional `investmentsHoldingsGet` at `:86` still die for latency and rate-limit reasons, but the billing leak is in the link token.

Every class gets a cached row with `value`, `asOf`, `status`. The read path becomes DB-only.

| Data class | Refresh trigger | Interval | Cost per refresh | Staleness tiers | Never show past |
|---|---|---|---|---|---|
| Bank balances (Plaid depository/credit) | Push: persist balances out of every `SYNC_UPDATES_AVAILABLE` sync (the `plaid.ts:191` map, today discarded). Pull: pull-to-refresh calls `/accounts/balance/get`, capped 4/day per item, debounced 60 s client-side (per-item limit is 5/min, 30/h) | Plaid-driven, 1-4x/day per item | $0 on the push path (inside the Transactions item subscription). Per-successful-request fee on the pull path, dollar amount unpublished (verified: [plaid.com/pricing](https://plaid.com/pricing/) lists models, no amounts); treat every manual refresh as billable | Under 24 h: plain number. 24-48 h: "as of Tue 14:00". Over 48 h: muted, tap-to-refresh | 7 days. Past that: last value muted, labelled "stale, refresh or reconnect", excluded from `total`, `status=stale_excluded` |
| Transactions (Plaid) | Push only: `SYNC_UPDATES_AVAILABLE` -> cursor walk (`plaid.ts:163-273`) | Plaid-driven, 1-4x/day | $0 marginal (item subscription). `/transactions/refresh` exists for on-demand but is per-request billed ([billing](https://plaid.com/docs/account/billing/)): do not wire it to any UI control | Spending views show "through <newest tx date>" | Never excluded; transactions are history, not a balance |
| Plaid liabilities (min payment, due date, APR) | Push: `LIABILITIES: DEFAULT_UPDATE` -> cache (`plaid.ts:86-117`, already works). Kill the live fallback at `net-worth.ts:110` and the link-time enrollment (above) | Plaid-driven | $0 marginal once subscribed; the gate is "subscribe only items that have liabilities", enforced by `required_if_supported_products` | Due-date data older than 35 days shows "check your card" instead of a date | 60 days for `nextDueDate` and `isOverdue` (a stale overdue flag is a false accusation); balance follows the bank rule |
| Plaid investment holdings | Scheduled daily, per-user jitter (`hash(userId) % 1440` minutes), only for items with `investment` accounts. Today `investmentsHoldingsGet` runs for every item on every read (`net-worth.ts:86`) against a 15/min per-item limit | 24 h | $0 marginal per call once subscribed; the cost is the per-item monthly subscription, gated as above | Under 24 h plain; 24-72 h "as of"; over 72 h muted | 7 days, excluded, labelled |
| Coinbase, Kraken balances | Scheduled 6 h, jittered; opportunistic on app open if older than 6 h | 6 h | $0: key-based exchange APIs, no per-call billing. Note Coinbase spot prices are one HTTP call per held currency with only a 60 s in-process TTL (`coinbase/client.ts:211-235`): free, but 20 coins = 20 calls, so it belongs in the job, not the GET | Under 6 h plain; 6-24 h "as of"; over 24 h muted + tap-to-refresh | 7 days, excluded, labelled "reconnect" |
| DeFi (Zerion) and chain wallets | Scheduled 6 h, jittered. Kill the live sequential per-wallet loop (`net-worth.ts:229-240`) | 6 h | Zerion API-key tier prices are unpublished, but Zerion's own published pay-per-call rate is $0.01/request via x402 ([Zerion docs](https://developers.zerion.io/build-with-ai/zerion-cli#x402-pay-per-call)), which anchors the budget assumption at <= $0.01/request; settle against the first invoice or the `RateLimit-Org-Tier` response header ([rate limits](https://developers.zerion.io/rate-limits#monitoring-usage)) | Crypto moves fast but the pet is banned from reacting to it (`docs/vision.md` §5), so 6 h staleness is display-only: same tiers as exchanges | 7 days, excluded, labelled |
| Spinwheel debt profile | Scheduled daily; bureau data changes at most monthly. Kill the live per-read call (`net-worth.ts:518`) | 24 h | Per-connection vendor billing, sales-quoted, unverified | Under 7 days plain (bureau cadence); over 7 days "as of" | 45 days, then fall back to Plaid-visible liabilities via the existing `spinwheelDebtsLoaded` reconciliation (`net-worth.ts:510, 539-541`), labelled "credit report stale" |
| Collectibles prices (sneakers, Pokemon, trading cards, graded coins, vinyl, CS2) | Scheduled weekly, jittered across the week | 7 days | One vendor call per holding set. Free tiers are tight: TCGapi is 100 req/day (`src/config.ts:108`), so weekly jitter is also a quota requirement | Under 7 days plain; 7-30 days "priced <date>" | 30 days: keep showing the value (collectible prices do not decay like bank data) but badge "old price" |
| Real estate, vehicles (RentCast / MarketCheck, US-only) | Scheduled monthly; no sandbox, real per-call cost | 30 days | Per-call, vendor-priced, unverified | Under 30 days plain; 30-90 days "estimated <month>" | Never excluded: an old house estimate beats a hole in net worth, but past 90 days the row reads "estimate, 3 months old" |
| Manual / declared assets | Never auto-refreshed. User nudged at 60 days per `prd-app-v2.md` §2 | User-driven | $0 | Always labelled "self-reported <date>" | Never excluded, always labelled: declared values are the onboarding trick and honesty about them is the trust story |
| FX rates (Frankfurter) | Scheduled daily | 24 h | $0: no key, no quotas ([frankfurter.dev](https://frankfurter.dev/)) | Invisible until multi-currency ships | A rate older than 72 h blocks conversion; show native currency instead |

Enforcement is server-side: the class flips to `stale_excluded` and drops out of `total` in the API, not in the UI, so the Android client (a second consumer of this response shape, per the context brief) inherits the rule for free.

Schema gap that blocks this contract: `truelayer_connections` is the only sync-backed table with no `last_synced_at` at all (`db/schema.ts:433-444`, D16). Its class cannot have an `asOf` until the column exists. MINOR, one migration.

---

## 3. The scheduler

None exists: zero cron, `setInterval`, or queue anywhere in `backend/src` (D3, grep-verified). Every cached value is stale until a user taps sync, and `net_worth_daily` (the retention feature's raw material, `db/schema.ts:615-628`) has zero production writers: `store/goals.ts` is imported only by tests.

**What runs it.** An in-process ticker started from `server.ts` boot. No BullMQ, no Redis, no new dependency (hard constraint 10): one machine and 30 users do not justify queue infrastructure. One `setInterval` tick every 15 minutes that (a) scans `last_synced_at` columns against the §2 intervals with per-user jitter `hash(userId) % interval`, (b) runs due refreshes through a concurrency cap of 5, (c) writes the daily `net_worth_daily` snapshot from cached values after midnight per user, and (d) runs the milestone check that D18 evicts from the GET.

**Why the machine can host it.** `fly.toml:19` sets `min_machines_running = 1`, so the one machine is never suspended and the interval survives. This is a load-bearing config line: if it is ever set to 0 to save $2, the scheduler silently dies with it. The tick itself costs no marginal Fly dollars (the machine is already always-on at $2.02/mo in `iad`, [Fly pricing](https://fly.io/docs/about/pricing/)) and negligible memory against the 256 MB budget.

**What it actually costs: Neon compute.** This is the non-obvious number. Neon Free includes 100 CU-hours/month and suspends compute after idle; a tick that queries Postgres every minute keeps the 0.25 CU minimum awake 24/7, which is ~180 CU-hours/month and exhausts Free mid-month. At a 15-minute tick the endpoint sleeps between ticks and webhook bursts, landing well inside 100 CU-hours. If usage grows past Free anyway, Launch is usage-priced at $0.106/CU-hour ([Neon plans](https://neon.com/docs/introduction/plans)), so always-on costs ~$19/month (0.25 CU x 720 h x $0.106). The 15-minute tick is therefore a cost decision, not a laziness decision, and it is compatible with every §2 interval (the shortest is 6 h).

**Overlap.** A single in-flight guard: if the previous tick has not finished, skip this tick and log `scheduler_tick_skipped`. Work is idempotent (each refresh writes `value + last_synced_at`), so a skipped tick costs staleness measured in minutes, never correctness. No distributed lock until a second machine exists; then the guard becomes a Postgres advisory lock.

**Failure.** Per-item try/catch inside the tick: one provider's failure emits `sync_failed` (§8) and must never abort the sweep. `last_synced_at` advances only on success, so failed items are retried next tick automatically. An item that fails 5 consecutive ticks stops being retried until its next §2 interval boundary, so a dead vendor does not burn the concurrency budget every 15 minutes.

**Observability.** `/health` gains `last_tick_at`, and returns 503 when it is older than 45 minutes. That routes scheduler death through both existing monitors for free: the Fly health check (`fly.toml:21-26`) restarts a wedged machine, and the §1 external pinger records the outage. Plus a `scheduler_tick_completed` event with `duration_ms` and per-class counts (§8).

---

## 4. Degradation

Contract: the `GET /api/net-worth` response gains, per asset class, `{ value, asOf, status }` where `status ∈ ok | stale | stale_excluded | error | disconnected | reauth_required | not_connected`. Additive only, so the iOS and Android decoders keep working while they migrate. **Never a silent zero, never an unlabelled stale value, never `connected: true` for a connection that produced no data.** Today `coinbaseConnected`, `zerionConnected`, `spinwheelConnected` are set to true when the row exists, before the fetch runs or succeeds (`net-worth.ts:200-201, 230-231, 516-517`): they report row existence, not success.

| Failure mode | What the API returns | What the UI shows |
|---|---|---|
| Provider timeout (5 s) or 5xx | Cached value with its real `asOf`, `status=stale`; with no cache, `value=null`, `status=error`. Excluded from `total` only when `value=null` or past its never-show age | The cached number with its age, or "can't reach <provider>" with retry. The total renders with a footnote count: "2 accounts not included" |
| Provider 429 | Same as timeout, plus refresh disabled client-side for 15 min with a countdown | Same |
| Provider returns 200 with a body that fails schema parse | `status=error`, never 0. Today `zerion/client.ts:141` converts a Zod parse failure into `total_usd: 0`, indistinguishable from an empty wallet | "can't read <provider> right now" |
| Plaid `ITEM_LOGIN_REQUIRED` / `ERROR` webhook | Item marked `reauth_required` (new column); its classes report `status=reauth_required` with last value and `asOf`, held 7 days per §2, then excluded | A "Reconnect" button launching Link update mode, Plaid's documented remediation, which reuses the existing access token and does not re-bill ([update mode](https://plaid.com/docs/link/update-mode/)) |
| Plaid `PENDING_EXPIRATION` / `PENDING_DISCONNECT` | Item marked `expiring`, data still flows. Both webhooks fire exactly 7 days ahead ([item webhooks](https://plaid.com/docs/api/items/)) | Banner: "Your bank connection expires in 7 days, renew now" |
| Plaid `LOGIN_REPAIRED` | Item returns to `healthy`; silence any pending reconnect prompt (Plaid's stated purpose for the webhook) | Banner clears |
| Plaid `USER_PERMISSION_REVOKED` | Already disables the item (`plaid.ts:69-73`); classes report `disconnected`, values excluded immediately, not after 7 days: the user revoked, showing their data any longer is wrong | Row reads "disconnected" with re-link affordance |
| DB unreachable | 503 with the standard error body, never a fabricated response | iOS shows its offline state with the last rendered snapshot |
| `DATA_ENCRYPTION_KEY` unset in production | Already refuses to boot: `config.ts:144-150` makes the key required when `NODE_ENV=production` and `loadConfig()` throws. (The first pass of this document asked for this assertion; it exists. The remaining exposure is dev/test plaintext, which is accepted) | n/a |
| APNs dispatch failure | Log and drop, never retry: a late push about money is worse than no push (`reactions/dispatch.ts:56-59` already behaves this way) | n/a |
| Webhook processing crash mid-sync | Cursor advances only after persistence (`plaid.ts:220-223`, already correct), so the next webhook replays safely. The §1 completion metric makes crash loops visible | n/a |

Everything above is testable with the existing PGlite + fixture setup: kill one fixture, assert the class status. No new test infrastructure.

---

## 5. Scaling limits

Tiers assume the §2 cache and §3 scheduler exist; where they do not, the 100-user row is really the 10-user row.

**100 users (TestFlight and just past it).** What breaks first: the live read path, latency and correctness, not throughput. Each `GET /api/net-worth` fires per-item Plaid balance + holdings calls (`net-worth.ts:84-87`), Coinbase accounts plus one spot-price call per held currency (`:202-204`, `coinbase/client.ts:227-235`), Zerion sequentially per wallet with up to 30 s of 202-polling per cold wallet (`:229-240`, `zerion/client.ts:40-43`), and Spinwheel (`:511-532`), with no timeouts on any of them, on one shared CPU. iOS multiplies the damage: `NetWorthView` instantiates 26 view models and `reload()` fans out ~24 concurrent requests per pull-to-refresh (`ios/Coiny/Views/NetWorthView.swift:5-30, 61-89`, D15). Separately, the Plaid per-item balance limit (5/min) is reachable by one enthusiastic tester and fails silently into a wrong total (§1 last row). Fix: the §9 list, now, before the first tester. Also at this tier: Plaid's Trial plan covers only 10 free production Items (`docs/global-integration-map.md` §8; the Plaid support article confirming this returned 403 this session, so treat the exact number as unverified until read in the dashboard), so 30 testers each linking a bank cannot all be on free real data.

**1,000 users.** What breaks first: Neon Free and the iOS fan-out. Free is 100 CU-hours and 0.5 GB storage ([Neon plans](https://neon.com/docs/introduction/plans)); steady webhook plus scheduler traffic keeps compute awake most of the month, exhausting the plan mid-month. Fix: Launch at ~$19/month always-on equivalent (0.25 CU x 720 h x $0.106), when the second hundred users arrive or the Neon dashboard shows > 80 CU-hours in a month. The D15 fan-out multiplies request volume ~25x over what the single net-worth response could carry; fix D15 (iOS reads the one response it already gets) before 1,000, ~6 h. The 256 MB machine holds if, and only if, the read path is DB-only by then. `{ max: 5 }` connections (`db/client.ts:24`) is adequate for one machine; switch to Neon's pooled string before adding a second.

**10,000 users.** What breaks first: scheduler stampede against Plaid per-client ceilings, then webhook burst processing. A naive top-of-hour refresh of 10,000 items collides with `/accounts/balance/get`'s 1,200/min per-client limit; the `hash(userId)` jitter in §3 already prevents this, it just must not be lost when the scheduler is written. Second: banks post overnight batches, Plaid fires webhook waves, and each `setImmediate` dispatch (`plaid.ts:54`) runs an unbounded concurrent `syncItem` pagination loop on one machine; add an in-process semaphore (width 10, no queue infrastructure) when webhook volume passes ~1/second sustained. Third: `runMigrations()` at boot (`server.ts:59-60`) is safe with one machine; before a second machine, wrap it in a Postgres advisory lock. All LATER: each fix is under a day when its trigger fires.

---

## 6. Cost per user per month, and the sync frequency that holds it

Revenue is $99/yr = $8.25/user/month. Budget: **variable API cost <= $1.25/user/month** (15% of revenue), so Apple's 15-30% cut, fixed costs and margin survive.

Fixed floor today: Fly machine $2.02/month (`iad`, [Fly pricing](https://fly.io/docs/about/pricing/)), Neon $0 (Free), APNs $0, Apple Developer $99/yr. Under $5/month before the first user.

Variable model per paying user under the §2 contract. Plaid publishes billing models but no dollar amounts (verified on [plaid.com/pricing](https://plaid.com/pricing/): models and plan tiers only, "connect with our sales team" for rates). Where the amount is unpublished, the billing model is stated precisely enough that the first pay-as-you-go invoice confirms or refutes it.

| Line item | Billing model (verified) | Est. $/user/month | Basis |
|---|---|---|---|
| Plaid Transactions | Monthly subscription per Item "as long as a valid access_token exists"; ends only on `/item/remove` ([billing](https://plaid.com/docs/account/billing/)) | ~$0.30 | `docs/global-integration-map.md` §9 estimate; dollar amount unpublished. Invoice line to check: one Transactions charge per linked item per month |
| Plaid Balance | Flat fee per successful `/accounts/balance/get` call | ~$0.20-0.60 at 20 pulls/month | Model confirmed, price unpublished. Invoice check: Balance line count equals `sync_completed` pull events |
| Plaid Investments + Liabilities | Monthly subscription each, initialized at Item creation when in the `products` array, "regardless of API calls made" | ~$0.20 blended after the `required_if_supported_products` fix; up to 3x the Transactions line before it | Model confirmed ([Link API](https://plaid.com/docs/api/link/)). Invoice check: after the fix, Investments/Liabilities line counts must equal items that actually have those account types, not all items |
| Zerion | Tiered API-key plans, prices unpublished; Zerion's own pay-per-call rate is $0.01/request ([x402](https://developers.zerion.io/build-with-ai/zerion-cli#x402-pay-per-call)) | ~$0.10 at 4 refreshes/day x wallets | Anchor, not a quote. Invoice or `RateLimit-Org-Tier` header settles it |
| Exchanges, chains, FX | Key-based or free APIs, no per-call billing (Frankfurter: "no monthly or daily caps", [frankfurter.dev](https://frankfurter.dev/)) | ~$0 | |
| Collectibles + real-asset vendors | Per-call, vendor-priced; several free tiers with hard daily quotas (TCGapi 100 req/day, `config.ts:108`) | ~$0.10 blended | Weekly/monthly cadence keeps most inside free tiers |
| **Total** | | **~$0.90-1.30** | Consistent with the integration map's "$0.30 to ~$4" range, held at the low end by the §2 schedule |

The sync frequency that holds it, stated as the dial it is: **bank data rides webhooks (free), everything scheduled refreshes at 6 h or slower, and the only per-call-billed endpoint a user can drive is capped at 4 calls/day.**

**Corrected 2026-08-19.** This paragraph used to name, as a live BLOCKER, "per-call-billed Plaid endpoints inside `GET /api/net-worth`" costing ~60 Balance calls per item per month. That is no longer true and the wording outlived the fix. Verified against the code:

- `GET /api/net-worth` is a pure DB read (`api/net-worth.ts:1`, R-16.1). No external call, no write.
- The billed pull moved to `POST /api/net-worth/refresh`, behind `REFRESH_LIMIT` (5/min) and the daily budget.
- The scheduler cannot reach it: `ScheduledClass` is `investments | crypto | defi | debts`. `bank` is not a scheduled class.
- The `required_if_supported_products` fix is in place at `plaid/client.ts:87`.

**Two things this table still gets wrong, both found 2026-08-19 and both fixed in code:**

1. **The budget counted refreshes, not calls.** `fetchPlaidSnapshot` calls `/accounts/balance/get` once per Item, so "4/day" meant 4 x item count billed calls. At five linked banks that is 600 calls/month against an estimate written for 20. The budget is now spent in calls (`MANUAL_BANK_BALANCE_CALLS_PER_DAY`), so the ceiling is max(4, item count) per day regardless of how many banks are linked.
2. **`/transactions/recurring/get` is a FOURTH monthly subscription**, not part of Transactions. Plaid's billing page lists Recurring Transactions as its own subscription-fee product, and `recurring_transactions` is a distinct `products` value. It is absent from the table below and from both product arrays in `linkTokenCreate`, yet `api/plaid-link.ts:137` calls it on every link. Confirm on the first invoice whether that call enrolls the Item. Plaid also gates the endpoint behind a product access request, so confirm it is enabled at all.

The §2 contract is the cost model, not just the freshness model.

Measured by: monthly vendor invoices divided by MAU, one line per month in this doc's git history. Breach action: lengthen the §2 interval for the offending class (tiers were chosen so a 2x slowdown stays inside the never-show ages), then re-tier pricing if that is not enough.

---

## 7. Reliability: backup, restore, RPO, RTO, and the restore rehearsal

Irreplaceable, in order: encrypted Plaid/vendor access tokens (loss means every user re-links every account), `net_worth_daily` history (cannot be re-fetched; it is the retention feature's raw material, and it starts accumulating only when §3 ships), ladder/goal state, sessions (cheap to lose).

| Item | Target | How | Action on breach |
|---|---|---|---|
| RPO | <= 24 h worst case; minutes inside Neon's PITR window | Two layers. Neon Free gives 6-hour point-in-time restore up to 1 GB-month of history ([Neon plans](https://neon.com/docs/introduction/plans)): covers "I just ran a bad migration". Layer two, before the first tester: nightly `pg_dump` via GitHub Actions cron, encrypted with `age` against a key held in the same two places as `DATA_ENCRYPTION_KEY`, retained 30 days: covers corruption discovered after 6 hours | Nightly dump failing twice consecutively (Actions failure email) is fixed before any feature work |
| RTO | < 4 h, solo-founder-realistic | Rehearsed, below | If the rehearsal exceeds 4 h, script the slow step |
| Restore rehearsal | Once before the first tester, then quarterly, ~1 h | Restore last night's dump into a scratch Neon branch, run `runMigrations()` against it, assert: row counts within 5% of prod, one known user's token decrypts with the prod key, `net_worth_daily` max(date) is yesterday. Record wall-clock time in this doc | A failed rehearsal is the week's sev-1: an untested backup is a hope, not a backup |
| Encryption key survivability | `DATA_ENCRYPTION_KEY` in exactly two places: Fly secrets and macOS Keychain | Verify presence (never value) during each rehearsal | Key loss makes every stored token ciphertext garbage and every user re-links everything. There is no third mitigation |
| Neon plan upgrade trigger | Launch (7-day PITR) at the first paying user, or when `SELECT pg_database_size(...)` approaches the 0.5 GB Free storage limit, whichever first | Checked during rehearsal | n/a |

Uptime commitments to users and incident disclosure are the obligations doc's half; the 99.5% target and its pinger live in §1.

---

## 8. Instrumentation spec

There is zero instrumentation, backend and iOS (D9, grep-verified: no analytics or telemetry symbol anywhere in `backend/src`). The gate questions this must answer with data rather than opinion: **W4, the north star** (`docs/prd-app-v2.md` §1.10: percentage of signups who complete a foundation-ladder rung or habit-goal period within 4 weeks and are still active in week 4, target 25% at 1,000 users; the hardware gate in `docs/vision.md` §8, 1,000 paying subscribers active at 3 months, is the same table joined to subscriptions), **declared-to-connected conversion** (PRD §2), and **rung completion**. Retention cohorts cannot be backfilled: a cohort that was not instrumented is gone. The pipeline below is therefore a launch blocker for the first tester, and it is deliberately tiny.

Mechanics: an `analytics_events` table in the existing Postgres (`user_id`, `event`, `properties jsonb`, `client_ts`, `server_ts`), one `POST /api/telemetry` endpoint accepting a Zod-validated batch in the protected scope, iOS queues and flushes 25 events at a time or on background. No third-party analytics vendor: no new dependency (hard constraint 10), no DPA to negotiate (obligations doc owns whether one would be needed), and 30 testers produce volumes plain SQL handles. Revisit at 1,000 users or when cohort queries outgrow SQL. Property rule inherited from `.claude/rules/security.md` #2: **no amounts, no merchant names, ever; values are bucketed enums** (`0-1k`, `1k-10k`, ...).

| Event | Trigger | Properties | Gate metric it serves |
|---|---|---|---|
| `signup_completed` | First session created (backend, `api/auth.ts`) | `method` | Denominator for everything; defines the cohort week |
| `onboarding_declared` | Declare step submitted | `classes[]`, `class_count`, per-class bucketed value | Declared-to-connected numerator source list |
| `link_opened` | Any provider connect flow presented (iOS) | `provider`, `source` (onboarding, prompt, settings) | Funnel top |
| `link_result` | Link flow exits (iOS) | `provider`, `status` (success, abandoned, error), `exit_status` and `view_name` where the SDK exposes them: Plaid Link's `onExit` metadata carries "the point of the Link flow where the user abandoned" and `onEvent` carries `viewName` ([measuring conversion](https://plaid.com/docs/link/measuring-conversion/)) | Where the funnel leaks, per institution step |
| `account_connected` | First successful data fetch for a new connection (backend) | `provider`, `asset_class`, `nth_connection` | Declared-to-connected numerator; cost model (connections are the billing unit) |
| `first_number_shown` | First net-worth render after signup (iOS) | `seconds_since_signup`, `class_count` | The 90-second promise (PRD §2.3) |
| `app_open` | Foreground (iOS) | `source` (push, icon), `days_since_signup` | Week-N retention: distinct users with an `app_open` in week N / cohort |
| `rung_started` / `rung_completed` / `rung_skipped` | Goals engine transitions (backend, once D10 wires it) | `rung_index`, `skip_reason` enum | W4 numerator |
| `rung_progress` | Decile crossings only | `rung_index`, `decile` | Sub-stage progress visibility (PRD §6A) |
| `reaction_shown` | Reaction rendered (iOS) | `type`, `origin` (behavior, market) | Counter-metric: `origin=market` must be zero (verified: `reactions/external.ts:105-108` already returns null for market events; this event proves it stays true) |
| `push_sent` | APNs dispatch (backend, `reactions/dispatch.ts:54`) | `type` | §1 push budget; PRD counter-metric |
| `push_permission_changed` | iOS authorization callback | `granted` | Push opt-out rate |
| `sync_failed` / `sync_completed` | Any provider fetch settles (backend) | `provider`, `error_class` (timeout, 429, 5xx, auth, parse), `duration_ms`, `trigger` (webhook, scheduled, pull) | §1 reliability budgets; §4 monitoring; per-provider invoice reconciliation |
| `scheduler_tick_completed` / `scheduler_tick_skipped` | §3 tick | `duration_ms`, per-class refresh counts | Scheduler health |
| `item_state_changed` | Plaid lifecycle webhooks | `state` (healthy, reauth_required, expiring, revoked, repaired) | Freshness contract health; D7/D8 verification |
| `subscription_started` / `subscription_churned` | StoreKit server notifications (post-launch) | `plan` | The 1,000-paying-at-3-months hardware gate |

The retention query, written now so the definition cannot drift: cohort = users by `signup_completed` ISO week; retained at week N = distinct `user_id` with any `app_open` where `days_since_signup BETWEEN 7N AND 7N+6`; W4 additionally requires a `rung_completed` or habit-period completion within 28 days. One saved file, `backend/queries/retention.sql` (does not exist yet), run weekly by hand until it earns a dashboard.

---

## 9. Remediation list for D3 to D8, ranked, with severity and hours

Ranked by "prevents a tester from seeing a wrong number", then by unblocking order. Total ~34 h plus the 1 h link-token fix, roughly one focused week.

| Rank | Defect | Severity | Fix | Hours | Why this position |
|---|---|---|---|---|---|
| 1 | Link-token subscription enrollment (adjacent to D3-D8, found this pass) | BLOCKER before production billing, invisible in sandbox | `plaid/client.ts:71`: `products: ['transactions']`, `required_if_supported_products: ['investments', 'liabilities']` | 1 | One line, caps the largest single cost leak (3 subscriptions per item, permanent, from day one) before any pay-as-you-go item exists |
| 2 | D4, no timeouts on the live read path | MAJOR | Adopt the existing `util/fetch.ts` wrapper (5 s timeout + retry, already tested, already used by 16 clients) in `plaid/client.ts`, `coinbase/client.ts`, `zerion/client.ts`, `spinwheel/client.ts` and the other bare-fetch clients; emit `sync_failed` on abort | 3 | Cheapest protection for every other path; the wrapper exists, this is adoption, not construction |
| 3 | D5, 29 bare `catch {}` returning silent zeros; `connections.*` true before fetch (`net-worth.ts:187-189, 200, 230, 516` and siblings); `zerion/client.ts:138,141` zeroing 404s and parse failures | BLOCKER | Per-class helper returning `{ value, asOf, status }`; `connected` set only on success; parse failure maps to `error`; fixture-kill tests per §4 | 10 | The defect most likely to show a tester a wrong total, and it creates the response shape everything else hangs off |
| 4 | D6, aggregate response has no freshness (`net-worth.ts:611-660`) | BLOCKER (pairs with D5) | `asOf` rides the D5 shape; iOS renders the §2 tiers | 4 (1 backend, 3 iOS) | Nearly free once D5 lands; without it the freshness contract is invisible |
| 5 | D7, Plaid lifecycle webhooks dropped (`plaid.ts:74-83`: `PENDING_EXPIRATION` logged and discarded; `ERROR`, `ITEM_LOGIN_REQUIRED`, `PENDING_DISCONNECT`, `LOGIN_REPAIRED` all fall to the `:82` no-op) | MAJOR | Item `status` column; persist state transitions; emit `item_state_changed`; classes report `reauth_required` per §4 | 4 | Bank items break within weeks in production; testers will hit this inside the TestFlight window |
| 6 | D8, Link update mode absent everywhere (backend, `ios/Coiny/Views/OnboardingView.swift`, `SettingsView.swift:96`) | MAJOR | Backend: link-token create with `access_token` (no re-billing, [update mode](https://plaid.com/docs/link/update-mode/)). iOS: "Reconnect" on any `reauth_required` class, reusing the existing LinkKit integration | 8 | Completes D7: detection without repair still ends in "Reset onboarding", which destroys the account relationship |
| 7 | D3, no scheduler (grep-verified) | BLOCKER for the freshness contract and for `net_worth_daily` accumulation | §3 as specified: 15-min in-process tick, jitter, concurrency 5, overlap skip, `/health` heartbeat. Includes the webhook balance cache-through (persist the `plaid.ts:191` map into a per-account balance cache instead of dropping it at `adapter.ts:150` / `schema.ts:99-108`) and the D18 eviction (move the milestone check and `lastNetWorthUsd` write out of the GET, `net-worth.ts:572-596`, which today persists a wrong baseline every time a provider fails mid-read) | 10 | Last because it depends on the D5 cached shape; the webhook cache-through inside it covers the most important class the moment it lands |

Two smaller items for the same sprint, not in D3-D8: add `last_synced_at` to `truelayer_connections` (D16 half-fix, 1 h, unblocks its §2 row), and implement the PRD §5.6 day-cap and quiet hours in `canSendPush` (2 h, before pushes are enabled for testers).

---

## Appendix: unverified, collected

- Plaid per-product dollar amounts: confirmed unpublished ([plaid.com/pricing](https://plaid.com/pricing/) shows models and plan names only). The §6 billing models are stated so the first invoice confirms or refutes each line.
- Plaid Trial plan and its 10-free-Items limit: the support article 403'd this session; sourced from `docs/global-integration-map.md` §8. Settle in the Plaid dashboard, including which plan the existing team (created before the 2026-04-15 cutoff) is on.
- Zerion API-key tier pricing: unpublished; anchored by Zerion's published $0.01/request pay-per-call rate. Settle via first invoice or the `RateLimit-Org-Tier` header.
- Spinwheel, RentCast, MarketCheck per-call prices: sales-quoted, no public page found.
- Runtime behaviour of the deployed Fly app: every "current" latency and memory value is unmeasured by definition; the §1 measurements exist to fix that.
- Whether Fly `min_machines_running = 1` has ever been observed keeping the machine warm across a quiet week (the §3 scheduler depends on it): observed config, not observed behaviour.
