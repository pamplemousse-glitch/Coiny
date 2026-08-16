# Coiny pre-launch verification: Part 4, Performance, reliability and efficiency

**This is Part 4 of seven.** The brief is
`docs/prompts/prompt-prelaunch-verification.md`. Part 1 (Security) is at
`docs/prelaunch-verification/01-security.md`. Parts 2, 3, 5, 6 and 7 are
unwritten and nothing here should be read as a verdict on them.

**Written 2026-08-15** against the working tree at commit `a1cc603`, branch
`docs/prelaunch-verification`. Every VERIFIED and FAILS row rests on a line of
this repository, a command run on that date with its output recorded, or a
live query against the Fly and Neon control planes. UNVERIFIED rows name the
instrument, the reason it cannot run today, and the event that would settle it.

Severity uses the PRD scale: **BLOCKER**, **MAJOR**, **MINOR**, **LATER**.

`docs/engineering-budgets.md` owns every number. Nothing in it had ever been
measured. This part measures what can be measured from a laptop and a control
plane, and says precisely what the rest needs.

---

## 4.0 Method, and what the budgets document now gets wrong

Three things must be said before any row, because the budgets document is the
input to this part and it is materially stale.

**The read path is no longer live.** `docs/engineering-budgets.md` §1 and §5,
`docs/prd.md` §16 (R-16.1, marked Unbuilt) and `docs/launch-gap-analysis.md`
all describe a `GET /api/net-worth` that makes five classes of external call
inside the request. It does not. `backend/src/api/net-worth.ts:22-26` calls
`assembleNetWorth` and returns; `backend/src/networth/read.ts:1-5` states the
invariant and the file contains no vendor import. R-16.1 and R-16.2 shipped;
the PRD's status markers have not caught up. Every row below that would have
been about the GET's fan-out is instead about `POST /api/net-worth/refresh`
and the scheduler, which is where the fan-out moved.

**The "roughly 36 external calls" figure is retired.** It came from
`docs/obligations.md` §5 and the PRD, was never measured, and no longer
describes any endpoint. Part 1 explicitly deferred it here (1.5.9). The
counted numbers are in 4.8: **zero on the GET, 14 to 16 on a nominal
authenticated refresh, up to 84 HTTP requests once retry and poll
amplification is included.**

**The iOS 24-request fan-out is fixed.** D15 described `NetWorthView`
instantiating 26 view models and issuing about 24 concurrent requests per
pull. `ios/Coiny/Views/RootView.swift:13` now holds one `NetWorthViewModel`
for the whole tab, `NetWorthView.swift:9` reads it from the environment, and
`ManageAccountsView.swift:8` shares the same instance rather than fetching
again. One pull is one request.

Instruments used, by name: `EXPLAIN (ANALYZE, BUFFERS)` against PGlite 0.4.6
(Postgres 17 in wasm, the same planner Neon runs) with all 49 migrations from
`backend/drizzle` applied and synthetic data; `curl -w` against the deployed
staging host; `fly status`, `fly checks list` and `fly logs`; the Neon control
plane API through its MCP server; `node:zlib` for payload sizing. Everything
that needs a device, a TestFlight build or a real Plaid item is marked
UNVERIFIED with the instrument that would produce it.

---

## 4.1 The deployed system, measured today

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.1.1 | The staging API answers requests | `curl` the health endpoint and read the status code and wall-clock time | FAILS | Six probes on 2026-08-15, every one HTTP 503 in 36.0 to 55.4 s: `curl -w` gave `status=503 total=55.449s`, `36.224s`, `42.215s`, `36.009s`. The response carries `server: Fly/40bd1ce81` and no application header, so it is the Fly proxy failing, not the app answering. **BLOCKER** |
| 4.1.2 | The proxy failure has a named cause rather than a guess | Read the proxy log line | VERIFIED as a cause | `fly logs -a coiny-backend` shows, repeatedly, `error.message="could not find a good candidate within 40 attempts at load balancing" ... request.url="https://coiny-backend.fly.dev/health"`. Both machines are marked unhealthy, so the proxy has nowhere to send anything, and every route is affected, not just `/health` |
| 4.1.3 | The application itself is running | Read the machine state and the app's own request log | VERIFIED, and this is the important part | `fly status -a coiny-backend`: two machines, both `started`, checks `1 total, 1 critical`. The app logs `{"res":{"statusCode":503},"responseTime":0.29,"msg":"request completed"}` for `GET /health` on both machines. The process is healthy and is deliberately returning 503 |
| 4.1.4 | `/health` reports the liveness of the service, not the liveness of a background job | Read the handler's only 503 condition | FAILS | `backend/src/server.ts:113-121` returns 503 if and only if `isSchedulerStale()`, which is `scheduler/index.ts:82-87`: true when no tick has completed within 45 minutes. A 0.29 ms response confirms no DB probe runs. So a stalled background refresh takes the entire API offline through the Fly health check. **BLOCKER**, and it is the direct cause of 4.1.1 |
| 4.1.5 | A stalled tick recovers by itself | Read the guard and the error path | FAILS | `runSchedulerTick` (`scheduler/index.ts:122-173`) sets `inFlight = true`, has `try`/`finally` and **no `catch`**, and awaits vendor calls that 4.8.3 shows have no timeout. A tick that never settles latches `inFlight` permanently, `lastTickAt` never advances, and `/health` 503s forever. There is no per-tick deadline anywhere. MAJOR |
| 4.1.6 | The fleet matches the configuration every design document assumes | Compare `fly.toml` against the running machines | FAILS | `fly machine list -a coiny-backend` returns **two** machines (`185d32da4535d8` created 2026-07-16, `78407d0a931068` created 2026-05-20), both `shared-cpu-1x:256MB` in `iad`. `fly.toml:48` sets `min_machines_running = 0`. Machine count is `fly scale count`, not `min_machines_running`, so the two have been there for months. MAJOR |
| 4.1.7 | The single-machine assumptions in the budgets hold | List what breaks with two machines | FAILS, three ways | `engineering-budgets.md` §3 says "No distributed lock until a second machine exists"; §1 sets DB connections at 5 "per machine" and `db/client.ts:24` is `{ max: 5 }`, so the real ceiling is 10; §5 defers the rate-limiter store until "a second machine". All three triggers fired without anyone noticing. Part 1 1.5.7 reached the same conclusion from the config file and was too generous to staging |
| 4.1.8 | The scheduler's cost model survives two machines | Recompute the tick duty cycle | FAILS as arithmetic | `engineering-budgets.md` §3 argues the 15-minute tick keeps the Neon endpoint asleep between ticks. Neon Free's scale-to-zero is **fixed at 5 minutes** and cannot be changed ([Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero)), so four ticks an hour hold the compute awake 20 minutes an hour: 0.25 CU x 720 h x 0.33 = **~60 CU-hours a month with zero users**, against a 100 CU-hour Free allowance. Two machines ticking on independent offsets can close the remaining gap. MAJOR |
| 4.1.9 | Current Neon consumption is known rather than assumed | Read the project's own counters | VERIFIED, and it is low only because the service is down | Neon project `noisy-bonus-65551609` (Coiny), billing period to 2026-09-01: `active_time: 3432` s and `cpu_used_sec: 871` across both branches, so about 0.24 CU-hours of 100 used in the first half of August. That is the signature of a scheduler that has not been ticking, not of a healthy budget |
| 4.1.10 | Fly's own health check can recover a wedged machine | Read the restart policy against the failure mode | FAILS for this failure | `fly.toml:50-55` defines the HTTP check; a failing check causes Fly to restart the machine, which does clear `inFlight`. `fly checks list` shows both checks `critical` with output `gone`, last updated 2h7m and 3h55m ago, so either the restarts are not happening or each fresh process re-enters the same state within 45 minutes. Settles by `fly machine restart` and watching one full hour of `fly logs` for `scheduler_tick_completed` |

The service being down is not a footnote to a performance document; it is the
performance document's first finding. Every latency budget in
`docs/engineering-budgets.md` §1 is currently unmeasurable for the simplest
possible reason: there is nothing to measure against.

**The design error is worth naming precisely, because the fix is small and the
instinct behind it was right.** Routing scheduler death through `/health` was
chosen so that one monitor covers two failure modes for free
(`engineering-budgets.md` §3, "Observability"). What it actually built is a
coupling in which a background job that touches third-party vendors can take
down an API that does not depend on those vendors at all. The correct shape is
two endpoints: `/health` returns 200 whenever the process can serve a request,
and `/health/scheduler` (or a `last_tick_at` field an external pinger asserts
on) carries the heartbeat. Fly's check points at the first. Roughly twenty
lines, and it converts a total outage into a metric.

Sources: [Fly health checks](https://fly.io/docs/reference/configuration/#services-tcp_checks),
[Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero),
[Neon plans](https://neon.com/docs/introduction/plans),
[SRE Workbook, implementing SLOs](https://sre.google/workbook/implementing-slos/).

---

## 4.2 Cold start to first meaningful frame

Apple's definition is binding here so the number means something to someone
else: launch is measured from tap to the first frame, and a launch is "cold"
when the app is not in memory and there is no process
([Reducing your app's launch time](https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time)).

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.2.1 | Cold start to first frame is inside budget on the oldest supported device | MetricKit `MXAppLaunchMetric.histogrammedTimeToFirstDraw` from a TestFlight build, or the Instruments **App Launch** template on device | UNVERIFIED | No device, no TestFlight build, and no MetricKit subscriber (`grep -rn "MetricKit\|MXMetric" ios/ android/` returns nothing). Settles when TestFlight unblocks; the instrument must be added first (4.13.1) |
| 4.2.2 | A budget for cold start exists to measure against | Look for the number | FAILS | `docs/engineering-budgets.md` §1 has thirteen rows and **none is a client launch budget**; the only client number is crash-free sessions. Apple's own guidance is 400 ms to first frame as the target and 20 s as the watchdog kill. Pick a number before measuring one, or the measurement has no verdict. MINOR, ten minutes |
| 4.2.3 | The oldest supported device is named | Read the deployment target | VERIFIED | `ios/project.yml:15` sets `IPHONEOS_DEPLOYMENT_TARGET: "17.0"`, so the floor is the A12 generation (iPhone XR / XS, 2018). That device, not the founder's phone, is the one the budget is set on |
| 4.2.4 | No blocking I/O runs before the first frame | Read what the App struct evaluates synchronously | FAILS, mildly | `ios/Coiny/CoinyApp.swift:27` initialises `isSignedIn` from `KeychainSessionStore().load()` as a `@State` default, so a synchronous Keychain read happens on the main thread before any frame. It is a single `SecItemCopyMatching` and is unlikely to be visible, but it is the only pre-frame I/O and it should be the first thing ruled out with the App Launch template rather than argued about. MINOR |
| 4.2.5 | Launch-time dependency cost is bounded | Count dynamically linked third-party frameworks | VERIFIED | Exactly one: `ios/project.yml:26-29` declares `LinkKit` from `plaid-ios` 5.6.0 and nothing else. Every other symbol is app code (111 Swift files, 16,369 lines) or a system framework. This is the reason 4.2.1 is likely to pass when someone finally measures it |
| 4.2.6 | The one dynamic framework's dyld cost is known | Size the Mach-O and time the pre-main phase | UNVERIFIED, with the input measured | `LinkKit.xcframework/ios-arm64/LinkKit.framework/LinkKit` is **10.3 MB**, `Mach-O 64-bit dynamically linked shared library arm64`. Pre-main dyld time for one 10 MB dylib is typically tens of milliseconds on an A12; settles with the App Launch template's dyld region, or `DYLD_PRINT_STATISTICS=1` in the scheme |
| 4.2.7 | Launch is regression-tested rather than measured once | Add an `XCTApplicationLaunchMetric` measure block to the UI test target | FAILS | `grep -rn "measure(\|XCTMetric\|XCTApplicationLaunchMetric" --include="*.swift" ios` returns nothing across all 6 UI test files. `ios-ci.yml` runs unit and UI tests but no performance test, so a launch regression is invisible in CI. MINOR, and it is the cheapest performance instrument in the repository: one `measure(metrics: [XCTApplicationLaunchMetric()])` block |
| 4.2.8 | Android's launch is measured against the platform's published thresholds | Macrobenchmark `StartupTimingMetric`, plus Play Console's Android vitals | NOT APPLICABLE today, with a trigger | `grep -rn "macrobenchmark\|baselineprofile" android/` returns nothing and the Android client is four screens behind with no Play submission (`docs/launch-gap-analysis.md` §5). Android vitals' externally imposed thresholds are the right targets when it ships, precisely because they are not invented here. **Trigger: the first Play internal-track upload** |

Sources: [Reducing your app's launch time](https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time),
[MetricKit](https://developer.apple.com/documentation/metrickit),
[XCTest performance tests](https://developer.apple.com/documentation/xctest/performance-tests),
[Android vitals](https://developer.android.com/topic/performance/vitals),
[Time to initial display](https://developer.android.com/topic/performance/vitals/launch-time),
[Macrobenchmark](https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview).

---

## 4.3 Time to the first net worth number

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.3.1 | The 90-second promise has an instrument, not just a target | Find the event that produces the number | VERIFIED, unusually | `ios/Coiny/ViewModels/OnboardingViewModel.swift:436-443` emits `first_number_shown` with `seconds_since_signup` and `class_count`, guarded by `emittedFirstNumber` so it fires once. `backend/src/analytics/events.ts` carries the matching Zod schema and `api/telemetry.ts` accepts the batch. R-5.1's measurement exists in code |
| 4.3.2 | The number itself is known | Read the median of `first_number_shown.seconds_since_signup` across the first 30 testers | UNVERIFIED | Zero users, no TestFlight build, and `analytics_events` on staging is empty because the service is down (4.1.1). Settles the week the first tester wave lands; the query is `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY (properties->>'seconds_since_signup')::int) FROM analytics_events WHERE event = 'first_number_shown'` and it does not exist as a saved file (R-24.3, `backend/queries/retention.sql` absent) |
| 4.3.3 | The denominator of the R-5.1 ratio is emitted | Check `signup_completed` | VERIFIED as server-side | `OnboardingViewModel.swift:115` records that `signup_completed` is deliberately server-only, which is right: a client-reported signup time is the one value a client cannot be trusted to report for a latency SLO |
| 4.3.4 | The first number does not wait on a network round trip that can hang | Read what the onboarding screen renders first | VERIFIED | `OnboardingViewModel.swift:30` states the declared-assets sheet renders before any network dependency, and `withTimeout` (`:452`) races every network step against a deadline and cancels the loser. That is the correct shape and is the opposite of the backend's behaviour in 4.8.6 |
| 4.3.5 | The 90 seconds is not silently spent inside Plaid Link | Instrument the Link flow's own duration | UNVERIFIED | `link_opened` and `link_result` are emitted (`grep` over `ios/Coiny` returns both), and Plaid's `onExit` metadata carries the abandonment point ([measuring conversion](https://plaid.com/docs/link/measuring-conversion/)), but no duration is recorded on either. One extra property, `duration_ms`, converts "the median was 140 s" into "the median was 140 s and 95 of it was the bank's own login screen". MINOR |
| 4.3.6 | `app_open` exists, since W4 retention and the 90-second cohort share a denominator | Grep for the emitter | FAILS | `backend/src/analytics/events.ts:49` defines the `app_open` schema; `grep -rn "app_open" ios/Coiny` returns nothing. The event named in PRD §24 as "the W4 signal" has a server-side contract and no client that sends it. MAJOR before the first tester, because retention cohorts cannot be backfilled |

---

## 4.4 Scroll performance and frame drops

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.4.1 | Hitch ratio on the longest scrolling surface is inside budget | MetricKit `MXAnimationMetric.scrollHitchTimeRatio` from the field, or the Instruments **Animation Hitches** template on device | UNVERIFIED | No MetricKit subscriber and no device. Apple's shipped-app guidance treats hitches as the metric users feel ([Analyzing responsiveness issues](https://developer.apple.com/documentation/xcode/analyzing-responsiveness-issues-in-your-shipping-app)). Settles with 4.13.1 |
| 4.4.2 | The longest list is identified before it is measured | Find the unbounded collections | VERIFIED | Three candidates, and none is unbounded. `SpendingView.swift:66,82` uses `List` over `pet.reactionHistory`, which `store/pet.ts:35,52` caps at `MAX_HISTORY = 50`; `SpendingView.swift:140` takes `.prefix(5)` of categories; `ManageAccountsView.swift:174,201,227` iterates `accounts.bank`, `accounts.investments` and `accounts.crypto`, which are bounded by what a person actually owns |
| 4.4.3 | Long lists use lazy containers | Check every `ScrollView` that contains a `ForEach` | FAILS, one surface that matters | Eight views pair `ScrollView` with `ForEach`; only `Onboarding/OnboardingScreens.swift` uses a lazy container. `ManageAccountsView.swift` builds every bank account, every holding and every crypto position eagerly inside a `ScrollView`. A brokerage with 200 holdings constructs 200 views before the first frame of that screen. MINOR today, MAJOR the first time a real brokerage item is linked; the fix is `LazyVStack` and is one word |
| 4.4.4 | The Wealth tab's own list is bounded by design | Count what it renders | VERIFIED | `NetWorthView.swift:57` renders `WealthPresenter.sections(from:)`, six fixed groups (PRD §7.8), not a per-row list. Eager construction is correct here |
| 4.4.5 | Continuous animation does not run when nothing needs to move | Find every `repeatForever` | VERIFIED, narrowly | Exactly two: `Onboarding/OnboardingCreatureWindow.swift:103` and `WaitingForFirstReactionView.swift:17`, both on transient screens. The Home creature surface (`CreatureWindow.swift`) has no repeating animation, so the "pet screen's continuous animation" the brief anticipated does not exist yet. It will when the commissioned sprite states land; re-check then |
| 4.4.6 | Reduce Motion is honoured on animated surfaces | Grep for the environment value | VERIFIED for what animates today | `accessibilityReduceMotion` is read in `HomeView.swift`, `OnboardingView.swift`, `Onboarding/OnboardingCreatureWindow.swift` and `Onboarding/OnboardingConnectScreens.swift`; `HomeView.swift` uses it to drop the geometry match and shorten the easing. `WaitingForFirstReactionView.swift:17` animates unconditionally, which is a Part 6 finding, recorded here only because it is the same `repeatForever` as 4.4.5 |
| 4.4.7 | Frame drops are caught before a user feels them | Add a scroll performance test | FAILS | No `XCTOSSignpostMetric` or `XCTClockMetric` measure block exists anywhere in the UI test target. Combined with 4.2.7, iOS has zero automated performance coverage. LATER: one hitch test on `ManageAccountsView` with a 200-holding fixture is the right first one, and it should follow 4.4.3's fix, not precede it |

---

## 4.5 API response times per endpoint, at p95

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.5.1 | Every request emits a duration | Read the completion log line | VERIFIED | Pino's default `request completed` line carries `responseTime`, and the custom serializers in `plugins/logger.ts:1-14` strip headers only, not timing. The staging logs show it live: `{"res":{"statusCode":503},"responseTime":0.29209,"msg":"request completed"}` |
| 4.5.2 | The duration can be attributed to an endpoint | Check whether the completion line carries the route | FAILS | `plugins/logger.ts:3-8` serialises `req` (method, url) on the **incoming** line and `res` (statusCode) on the **completed** line, and the two are joined only by `reqId`. Computing a per-endpoint p95 therefore means a stream join across two log lines rather than a `group by`. One line, `res.url`, removes the join. MINOR, and it is the difference between a percentile script that takes an hour and one that takes a day |
| 4.5.3 | p95 is computed, not the mean | Name the aggregation | UNVERIFIED, no substrate | `engineering-budgets.md` §1 specifies "`fly logs` through a jq percentile script until the telemetry table exists". No such script exists (`ls backend/queries` and a repo-wide `grep -rn "percentile"` both return nothing), and Fly retains logs only in a short rolling buffer with no query interface, so a weekly p95 cannot be reconstructed after the fact. Settles either by shipping logs somewhere queryable or by writing `responseTime` into `analytics_events` |
| 4.5.4 | The budgets are stated per endpoint, not per app | Read the rows | VERIFIED | `engineering-budgets.md` §1 sets p50 < 150 ms / p95 < 400 ms for the cached `GET /api/net-worth`, p95 < 3 s for the refresh path, and 200 in < 500 ms for the Plaid webhook acknowledgement. These are the right three to keep and the only three anyone will sustain |
| 4.5.5 | The p95 budget is achievable in principle on this architecture | Reason about the floor | FAILS structurally | Neon Free's scale-to-zero is fixed at 5 minutes and reactivation costs "a few hundred milliseconds" ([Neon](https://neon.com/docs/introduction/scale-to-zero)). Any `GET /api/net-worth` that lands on a suspended compute pays that before its first of 31 round trips (4.7.2). With one user opening the app twice a day, most requests land cold, so the p95 < 400 ms budget is against the platform, not against the code. Either accept a two-tier budget (warm p95 < 400 ms, cold p95 < 1.5 s) or move to Launch and disable scale-to-zero at ~$19/month. **Decide before measuring, or the first measurement produces a false failure** |
| 4.5.6 | The webhook acknowledgement budget is met by construction | Read the handler's reply order | VERIFIED | `webhook/plaid.ts:150` sends `200 {ok:true}` and only then hands the work to `trackWebhookWork` at `:152`, so the acknowledgement never waits on a sync. Unmeasured, but the property is structural rather than performance-dependent, which is the right way to meet a 500 ms budget |
| 4.5.7 | The most expensive endpoint has a limit proportionate to its cost | Compare the per-route limits against the fan-out | FAILS | `config.ts:46-47` sets the global limit at **100 requests per 1 second**. `POST /api/net-worth/refresh` sits behind only that, so one session may legally issue 100 refreshes a second, each of which is 14 to 16 outbound vendor calls (4.8.1), including a per-call-billed Plaid Balance request. The 4/day bank cap (`api/net-worth.ts:19`) bounds the billed call but nothing bounds the rest. Part 1 1.5.6 found this as a security row; the money is the sharper end of it. MAJOR, and it is one `config: { rateLimit: { max: 6, timeWindow: '1 minute' } }` |
| 4.5.8 | The rate limiter counts correctly on the running fleet | Read the store against the machine count | FAILS | `server.ts:93-106` registers `@fastify/rate-limit` with no shared store, so the counter is per process; 4.1.6 shows two machines are running, so every limit is already doubled. Part 1 1.5.7 predicted this at "the second machine" and the second machine has been there since May |

---

## 4.6 Payload sizes, and whether the client fetches more than it renders

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.6.1 | The net-worth response's wire size is known | Serialise the response shape and measure | VERIFIED, constructed rather than captured | Built from the `NetWorthResponse` type at `networth/read.ts:74-124` (27 scalar class fields, a 26-entry `classes` map, `accounts`, `connections`, `excluded`) and measured with `node:zlib`: empty user **2,898 B**; typical tester (3 bank accounts, 12 holdings, 6 coins, 3 debts) **5,932 B**; heavy user (8 / 60 / 25 / 6) **15,396 B**. Not captured from a live request because staging is 503 (4.1.1); settles with one `curl -w '%{size_download}'` once the service is back |
| 4.6.2 | Responses are compressed | Check for a compression plugin | FAILS | `@fastify/compress` is absent from `backend/package.json:23-31` (seven production dependencies, none of them compression) and no `Content-Encoding` is set anywhere. Fly's proxy does not compress on the app's behalf. The same three payloads gzip to **545 B, 901 B and 1,163 B**, a 5.3x to **13.2x** reduction, and URLSession already sends `Accept-Encoding: gzip` by default. MINOR by latency, MAJOR by the standard the repo sets itself: this is the one place a new dependency is clearly worth its supply-chain cost, and the alternative is ten lines of `onSend` with `zlib.gzipSync` |
| 4.6.3 | The client renders what it downloads | Trace each array to a view | VERIFIED with one honest caveat | `accounts.bank`, `accounts.investments` and `accounts.crypto` are rendered, but on `ManageAccountsView.swift:174,201,227`, not on the Wealth tab. `ManageAccountsView.swift:8` reads the **same** `NetWorthViewModel` from the environment rather than fetching again, so the payload is downloaded once and used on the second screen. That is a deliberate trade (one round trip instead of two) and not waste |
| 4.6.4 | The heaviest field is not dead weight | Check `classes` against the decoder | VERIFIED | `API+Performance.swift:76` decodes `classes` as `[String: ClassReading]` and the Wealth group boxes render per-class status and `asOf`, which is the freshness contract's whole point. All 26 entries are load-bearing |
| 4.6.5 | Nothing large is fetched on a screen that does not need it | Count requests per screen | VERIFIED | Wealth: one `GET /api/net-worth`. Home: one `GET /api/pets`, repeated (4.10.2). Activity: `GET /api/spending` and `GET /api/spending/summary`. There is no screen that issues more than two requests, which is the D15 fix holding |
| 4.6.6 | Request payloads are bounded | Check the body limit | VERIFIED by default | `server.ts:74-79` passes only `logger` to `Fastify()`, so `bodyLimit` is the framework default of 1 MB. The one route that accepts a batch, `POST /api/telemetry`, carries its own 60/min limit (`api/telemetry.ts:49`). Adequate; no change |

---

## 4.7 Database query plans, and the missing-index question

This is the one budget that could be measured properly today, and it was.
Method: PGlite 0.4.6 (Postgres 17 compiled to wasm, the same planner Neon
runs) with all 49 migrations from `backend/drizzle` applied through the
journal, seeded with synthetic data, `ANALYZE` run, then
`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)` on each hot-path query. Absolute
timings are a laptop's, not Neon's; the **plan shape, the buffer counts and
the rows-removed-by-filter are the planner's and transfer directly.**

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.7.1 | Every table read on the hot path is reachable by an index on `user_id` | Script the schema's index declarations against the tables `assembleNetWorth` reads | FAILS | A Python pass over `db/schema.ts` found **10 of the 29 tables** read by `GET /api/net-worth` with no user-scoped index or PK prefix: `transactions`, `metal_holdings`, `sneaker_holdings`, `manual_assets`, `pokemon_card_holdings`, `energy_positions`, `farmland_parcels`, `trading_card_holdings`, `coin_holdings`, `truelayer_connections`. Nine of them are per-user holding tables that stay small; the tenth is the largest table in the system |
| 4.7.2 | The read path's round-trip count is bounded | Count awaited queries in the request | FAILS | **31 sequential Postgres round trips per authenticated `GET /api/net-worth`**: two in `store/sessions.ts:38,53` (`validateSession` does a SELECT and then an UPDATE, so a "pure read" endpoint writes on every call) and 29 in `networth/read.ts` at lines 141, 145, 147, 148, 270, 288, 301, 343, 350, 357, 364, 371, 378, 385, 397, 406, 427, 434, 446, 462, 478, 497, 500, 516, 528, 540, 552, 564, 596. **Not one is inside a `Promise.all`.** At a 2 ms Neon round trip that is ~62 ms of pure serialisation before any query does work. MAJOR |
| 4.7.3 | The largest table's hot query uses an index | `EXPLAIN ANALYZE` `getRecentOutflows` at realistic scale | FAILS, measured | At 60,000 rows (30 testers x 2,000 transactions): `Seq Scan on transactions ... Rows Removed by Filter: 59863, Buffers: shared hit=619, Execution Time: 10.564 ms` to return 137 rows. At 1,000,000 rows (1,000 users): `Seq Scan ... Rows Removed by Filter: 999909, Buffers: shared hit=10201, Execution Time: 148.844 ms` to return 91 rows. **MAJOR at 30 testers, BLOCKER at 1,000 users**: 148 ms in one query against a p50 budget of 150 ms for the whole endpoint |
| 4.7.4 | The fix is known and its size is measured, not guessed | Add the index and re-run the identical query | VERIFIED as a fix | `CREATE INDEX transactions_user_date_idx ON transactions (user_id, date);` then `ANALYZE`: `Index Scan using transactions_user_date_idx ... Index Cond: ((user_id = 'u777') AND (date >= '2026-05-17')), Buffers: shared hit=184, Execution Time: 0.688 ms`. **148.844 ms to 0.688 ms, a 216x improvement and a 55x reduction in buffer reads, from one migration.** This is the single highest-value change in this document |
| 4.7.5 | The schema's own reasoning about this table is consistent | Read the comment against the indexes | FAILS, and the comment is the evidence | `db/schema.ts:133-136` argues `amount` must stay plaintext because "getWeeklySpendByCategory runs SUM/GROUP BY and sign predicates on it inside webhook processing (**the largest table, the hot path**)". The table it calls the largest and the hot path has exactly one index, the primary key on `transaction_id`, which no query uses. A deliberate performance trade was made on a table whose access pattern was never indexed for |
| 4.7.6 | Every caller of the unindexed scan is known | Grep the callers | VERIFIED, and there are four | `networth/read.ts:596` (`getRecentOutflows(userId, 90)`, on every net-worth read), `api/spending.ts:18` (`getSpendingSummary`, 30 days, on the Activity tab), `api/subscriptions.ts:7` (`getRecentOutflows(userId, 120)`, the R-5.7 subscription-detection acquisition hook), and `getWeeklySpendByCategory` inside webhook processing. The last one is the worst placement: a full scan inside the path that must acknowledge in 500 ms and complete in 60 s |
| 4.7.7 | The index that is added is the one the planner can use | Check the predicate against the column types | VERIFIED, with a caveat worth stating | `(user_id, date)` is fully usable: the plan above shows both as `Index Cond`. The sign predicate is not, because `amount` is `text` and every query wraps it in `CAST(... AS NUMERIC)` (`store/transactions.ts:148`), which the plan shows as a residual `Filter`. That costs 90 extra rows examined out of 181, which is nothing. **Do not convert `amount` to numeric for performance**; the composite index is the whole win |
| 4.7.8 | The nine other unindexed tables are a real problem or are not | Measure one at representative scale | VERIFIED as fine, for now | `metal_holdings` at 150 rows: `Seq Scan ... Rows Removed by Filter: 145, Buffers: shared hit=1, Execution Time: 0.049 ms`. The planner would choose a sequential scan on a table this small even with an index. At 1,000 users x 5 rows these become 5,000-row scans at roughly 0.5 ms each, so nine of them cost ~4.5 ms per request. **Trigger to index them: 10,000 rows in any one, or the moment 4.7.2's serialisation is fixed and they become the remaining cost.** Not now |
| 4.7.9 | The indexed tables actually use their indexes | Confirm the plan on the cache table | VERIFIED | `asset_class_cache` at 5,000 rows: `Bitmap Heap Scan ... -> Bitmap Index Scan on asset_class_cache_user_id_asset_class_pk, Index Cond: (user_id = 'u777'), Execution Time: 0.064 ms`. The composite primary key at `schema.ts:707` is doing its job; the freshness contract's own table is not the problem |
| 4.7.10 | The webhook's persistence path is not N+1 | Read the loop | FAILS | `webhook/plaid.ts:419-451` iterates every adapted transaction and `await`s `claimEvent(tx.id)` per row, one round trip each, sequentially, plus `performReactions` per match. A Plaid initial sync routinely carries 500 to 2,000 transactions, so a first link is 500 to 2,000 serial round trips on a 256 MB shared CPU. The 60 s processing budget (`engineering-budgets.md` §1) has never been measured against it. MAJOR, and the fix is a single `INSERT ... ON CONFLICT DO NOTHING ... RETURNING id` batch claim |
| 4.7.11 | The scheduler's own queries are bounded | Read what it scans per tick | VERIFIED with a stated trigger | `scheduler/index.ts:180-194` reads all of `plaid_items`, `coinbase_connections`, `zerion_wallets` and `spinwheel_connections` unfiltered every 15 minutes, and `store/goals.ts:354-361` runs a `NOT EXISTS` anti-join over all of `users`. At 1,000 users these are four small scans and one anti-join over an indexed composite PK: correct at this size and not worth complicating. **Trigger: 100,000 rows in any of the four, at which point the `last_synced_at` predicate belongs in SQL rather than in the loop at `:225`** |
| 4.7.12 | The plans hold on Neon, not only on PGlite | Re-run `EXPLAIN ANALYZE` against a Neon branch | UNVERIFIED | PGlite runs the same planner but not the same storage layer, so buffer counts transfer and absolute timings do not. Settles in about ten minutes: `neonctl branches create --name explain-check` off `br-orange-mouse-ap2jgw62`, seed, run the same six statements, delete the branch. It was not done here because creating a branch is a mutation on a live project and this document was scoped read-only |
| 4.7.13 | Neon's own slow-query view is used before more instrumentation is built | Read `pg_stat_statements` through the console | UNVERIFIED | Neon exposes a slow-query listing per branch. It could not produce anything today because the application has not served a successful request since the outage in 4.1.1. **Do this first after the service is back**: it is free, it needs no code, and it will either confirm 4.7.3 in production terms or refute it |

**The verdict on the whole section.** The read path is architecturally right and
mechanically slow. Moving the vendor calls out of the GET (R-16.1) was the
hard, correct change and it is done. What replaced them is 31 serial database
round trips, one of which is a full scan of the largest table and one of which
is a write on a read. Two changes, both small, close most of the gap: the
composite index in 4.7.4, and grouping the 27 independent class queries in
`networth/read.ts` into a handful of `Promise.all` batches. Neither needs new
infrastructure, a dependency, or a decision.

Sources: [Postgres row level security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) (context for 4.7.1's alternative),
[Neon plans](https://neon.com/docs/introduction/plans),
[Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero).

---

## 4.8 The fan-out, counted

The brief asks for the real number. Model user, stated so the arithmetic is
checkable: **one Plaid item, a Coinbase connection holding eight currencies,
two Zerion wallets, one Spinwheel connection.** Counts scale linearly in items,
currencies and wallets.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.8.1 | The fan-out on the read path is zero | Enumerate the imports and the awaited calls in the GET | VERIFIED | `api/net-worth.ts:22-26` calls only `assembleNetWorth`; `networth/read.ts` imports `drizzle-orm`, `../config`, `../db`, `../goals`, `../store` and `./classes`, and its only vendor reference is `import type { SpinwheelDebt }` at `:54`, a type erased at compile time. **`GET /api/net-worth` makes zero external HTTP calls.** The "roughly 36" figure in `docs/obligations.md` §5, `docs/prd.md` §16 and `docs/launch-gap-analysis.md` describes code that no longer exists and should be struck from all three |
| 4.8.2 | The fan-out on the refresh path is counted, not estimated | Trace every awaited vendor call in `refreshAllForUser` | VERIFIED, and the number is 16 | `networth/refresh.ts:272-289` runs four class refreshes in sequence. Cold liability cache: `accountsBalanceGet` x1 and `investmentsHoldingsGet` x1 (`goals/snapshot.ts:101-104`), `liabilitiesGet` x1 (`snapshot.ts:120`), `liabilitiesGet` x1 again (`refresh.ts:86`), Coinbase `getAccounts` x1 plus one spot-price request per held currency (`coinbase/client.ts:230-238`) = 9, Zerion `getPortfolio` x2 (`refresh.ts:171-174`, sequential by design), Spinwheel `getDebtProfile` x1. **16 outbound HTTP requests.** Warm liability cache: 14 |
| 4.8.3 | The same call is not made twice per refresh | Read both liability paths | FAILS | `goals/snapshot.ts:118-120` falls back to `liabilitiesGet` when the cache is empty but never writes the cache; `networth/refresh.ts:83-90` then checks the same empty cache and calls `liabilitiesGet` again, this time caching. On a cold cache every item's liabilities are fetched twice per refresh. Liabilities ride the item subscription so this costs no dollars, but it doubles the Plaid rate-limit draw and adds a full timeout budget to the wall clock. MINOR, and it is one `cacheLiabilities` call moved |
| 4.8.4 | Retry amplification is bounded and the bound is known | Multiply through the wrapper and the poll loops | FAILS as a bound | `util/fetch.ts:9,22` gives every wrapped call up to 3 attempts. `zerion/client.ts:37-48` adds its own loops on top: 202 recursion up to `attempt < 6` (7 invocations, `:45`) and 429 recursion up to `attempt < 3` (`:37`), each invocation itself a `fetchWithRetry` of 3 attempts, so **up to 21 HTTP requests per Zerion wallet**. Worst case for the model user: Plaid 12 + Coinbase 27 + Spinwheel 3 + Zerion 42 = **84 HTTP requests for one button press.** MAJOR |
| 4.8.5 | No outbound call can hang indefinitely | Grep every client for the wrapper or an explicit signal | FAILS, 17 clients | `grep -rln "await fetch(\|undici" backend/src` returns 19 files; subtracting `util/fetch.ts` and `plaid/client.ts` (which uses the wrapper, `plaid/client.ts:32`) leaves **17 clients calling bare `fetch()` with zero `AbortSignal`**: alpaca, kraken, ynab, truelayer, kalshi, nft, metals, realestate, vehicles, tcgapi, pcgs, pokemonpricetracker, usda, eia, fx, discogs, chains/solana. Node's global fetch defaults to a 300 s headers timeout, so one hung vendor pins a request for five minutes. R-16.5 is **partial, not Unbuilt**: the four clients on the old read path were converted and these seventeen were not. MAJOR |
| 4.8.6 | The seventeen unwrapped clients are not reachable from a user request | Find their routes | FAILS | Fourteen authenticated `POST /api/<provider>/sync` routes call them directly: `api/kraken.ts:51`, `api/alpaca.ts:60`, `api/truelayer.ts:79`, `api/ynab.ts:143`, `api/kalshi-connect.ts:64`, `api/metals.ts:61`, `api/vehicles.ts:58`, `api/real-estate.ts:58`, `api/sneakers.ts:62`, `api/pokemon-cards.ts:88`, `api/trading-cards.ts:104`, `api/coins.ts:95`, `api/energy.ts:94`, `api/farmland.ts:95`, plus `api/nft.ts:63` and `api/chain-wallets.ts:153`. R-16.1 moved the vendor calls out of the net-worth GET and left them in sixteen sibling endpoints the client can call. MAJOR |
| 4.8.7 | A request has a deadline | Look for a server-side timeout | FAILS | `server.ts:74-79` constructs `Fastify({ logger })` and sets neither `requestTimeout` nor `connectionTimeout`, both of which default to disabled. Nothing anywhere bounds the total duration of `POST /api/net-worth/refresh`; only the individual attempts are bounded, and 4.8.4 shows how many of those there can be. MAJOR |
| 4.8.8 | The client's patience matches the server's work | Compare the two timeouts | FAILS | `ios/Coiny/Services/API.swift:6` sets `timeoutIntervalForRequest = 30`. Worst-case server work on the refresh path is roughly 154 s (below). The client gives up at 30 s, shows "Refresh did not complete" (`NetWorthViewModel.swift:100`), and the server carries on spending Plaid Balance calls that the user will never see. The 60 s client-side debounce (`NetWorthViewModel.swift:24`) then permits a second full fan-out at t+61 s while the first is still running. MAJOR |
| 4.8.9 | The refresh path's worst-case wall clock is known | Sum the timeout budgets along the sequential path | VERIFIED as arithmetic | Each wrapped call is at most 3 x 5 s plus 200 ms + 400 ms of backoff = 15.6 s. `refreshBankAndInvestments`: balances and holdings in parallel 15.6 s, then liabilities 15.6 s, then the duplicate liabilities 15.6 s = 46.8 s. `refreshCrypto`: `getAccounts` 15.6 s then spot prices in parallel 15.6 s = 31.2 s. `refreshDefi`: two wallets sequentially, each with up to six deliberate 5 s sleeps = 60 s of sleeping before any retry. `refreshDebts`: 15.6 s. **Total roughly 154 s, with no deadline at any layer** |
| 4.8.10 | Zerion's 202 poll is in the right place | Check where the poll can run | VERIFIED | `zerion/client.ts:26-28` says the 202 and 429 loops are safe now that the read path is DB-only, and that is correct: they run inside `refreshDefi`, which is reachable from the scheduler and from the explicit refresh, never from a GET. The 30 s per cold wallet is acceptable in a background tick. It is **not** acceptable inside a request a user is waiting on, which is what 4.8.8 makes it |
| 4.8.11 | The billed call is the one that is capped | Check what the daily cap covers | VERIFIED | `api/net-worth.ts:19,33-36` consumes one of four daily `tryConsumeManualRefresh` tokens only when an item exists, and `refresh.ts:274-281` skips the billed `accountsBalanceGet` while still running the free holdings refresh when capped. The cost model in `engineering-budgets.md` §6 is implemented correctly; it is the uncapped 12 to 15 free calls around it that 4.5.7 leaves open |

**What to do about it, in order.** Give `POST /api/net-worth/refresh` its own
rate limit (4.5.7, one config object). Set a Fastify `requestTimeout` slightly
below the client's 30 s so the server stops working when the client stops
listening (4.8.7). Convert the seventeen bare-`fetch` clients to
`util/fetch.ts` (4.8.5), which is adoption of code that already exists and is
already tested. Move the duplicate `liabilitiesGet` (4.8.3). None of these is a
new system; together they are perhaps four hours.

Sources: [Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html),
[fastify-rate-limit](https://github.com/fastify/fastify-rate-limit),
[Plaid rate limits](https://plaid.com/docs/errors/rate-limit-exceeded/),
[Plaid billing](https://plaid.com/docs/account/billing/).

---

## 4.9 Background work: the scheduler's cost per tick, and what it wakes

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.9.1 | The scheduler exists and matches its specification | Read it against `engineering-budgets.md` §3 | VERIFIED | `backend/src/scheduler/index.ts` implements all of it: 15-minute `setInterval` (`:40,92`), per-user jitter by `sha256(userId:salt)` (`:110-113`), concurrency 5 (`:45`), single in-flight overlap guard (`:126-130`), five-failure dead-vendor backoff (`:214-221`), and the `/health` heartbeat. D3 and R-16.2 are closed. `engineering-budgets.md` §3, which opens "None exists", is out of date |
| 4.9.2 | The tick's fixed cost with zero users is known | Count the queries a tick runs before any work exists | VERIFIED | Nine per tick: four unfiltered scans in `findDueClassRefreshes` (`:180-194`), up to four `getClassCacheForUsers` (`:207`), and one `NOT EXISTS` anti-join over `users` (`store/goals.ts:355-361`). At zero users the tick is nine trivial queries every fifteen minutes |
| 4.9.3 | The tick's marginal cost per user is known | Count the queries a due unit and a daily pass cost | VERIFIED | A due class refresh is 1 to 3 DB reads plus its vendor calls (4.8.2). The daily goal pass is heavier: `runGoalRefreshFromCache` (`networth/refresh.ts:232-236`) calls `assembleNetWorth`, which is the same 29-query assembly as the GET, plus `refreshGoalSystem`'s writes. At 1,000 users that is roughly 31,000 queries per day spread across the three-hour jitter window at concurrency 5, which is fine on time and not fine on Neon compute (4.9.5) |
| 4.9.4 | The tick is the only timer in the backend | Grep for competing timers | VERIFIED | `grep -rn "setInterval\|setTimeout" backend/src` outside `util/fetch.ts`'s backoff and `zerion/client.ts`'s polls returns only `scheduler/index.ts:92`, and it is `unref()`d at `:96` so it can never hold a shutting-down process open. R-16.2's "nothing else may create timers" holds |
| 4.9.5 | What the tick wakes is accounted for | Name every system a tick touches, and check the gate on each | VERIFIED on two of three | Three: the Neon compute, which is 4.1.8's cost finding and the only open one; the vendors counted in 4.8; and **APNs**, because `runGoalRefreshFromCache` reaches `dispatchReaction` on a milestone crossing (`refresh.ts:245-256`), so a background tick can send a push. The push gates are complete: `store/notifications.ts:8-9,18-19` enforces 2 per rolling 7 days, **1 per rolling 24 hours (R-9.2)** and a 24-hour same-type cooldown, and `reactions/dispatch.ts:71-76` suppresses on quiet hours, suppressing rather than guessing when the device has no stored timezone. `engineering-budgets.md` §1's "No day cap: No quiet hours" row is out of date; a 03:00 tick cannot push at 03:00 local |
| 4.9.6 | A tick's duration is recorded | Read the completion log | VERIFIED as instrumented, UNVERIFIED as a value | `scheduler/index.ts:159-167` logs `scheduler_tick_completed` with `duration_ms`, `refreshed`, `failed` and `goal_refreshes`. No value has ever been observed: `fly logs` retains a short rolling buffer and contains no such line today, because no tick has completed (4.1.4). Settles the first hour after the service is restored |
| 4.9.7 | Two concurrent schedulers are safe | Read the idempotency claim against the running fleet | VERIFIED as designed, FAILS as a cost decision | `scheduler/index.ts:13-16` argues every unit is an idempotent upsert keyed by `(user, class)` or `(user, date)`, so two instances "at worst duplicate a fetch, never corrupt state". Correctness holds. But 4.1.6 shows two machines are running, so every scheduled vendor call is being made twice, every Neon wake happens twice, and the duplicated fetches are billed once each. The advisory lock the document defers is now due |
| 4.9.8 | A tick cannot be starved by a slow unit | Check for a per-unit or per-tick deadline | FAILS | `runWithConcurrency` (`:256-265`) has five lanes and no timeout; a unit awaiting one of the seventeen unwrapped clients (4.8.5) can hold a lane for 300 s, and five such units stall the entire tick. This is the mechanism most likely to be behind 4.1.4. MAJOR |
| 4.9.9 | The scheduler's jitter survives the code it lives in | Confirm the anti-stampede property is applied | VERIFIED | `userJitter` is applied to class refreshes (`:223`) and to the daily pass over a three-hour window (`:60,238`), so the `engineering-budgets.md` §5 concern about a 10,000-item top-of-hour collision with Plaid's 1,200/min per-client limit is already handled. Worth recording so nobody re-derives it |

---

## 4.10 Memory, battery, and anything holding a timer

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.10.1 | Backend RSS is inside the 200 MB budget on a 256 MB machine | Read the Fly metrics dashboard, or `fly ssh console -C "cat /proc/meminfo"` | UNVERIFIED, and currently unobtainable | `fly ssh console -a coiny-backend -C "cat /proc/meminfo"` returns `Error: app coiny-backend has no started VMs. It may be unhealthy`, which contradicts `fly status`'s `started` and is a third independent confirmation of 4.1.1. Settles the moment the service is healthy; it is a one-command check and has never been run |
| 4.10.2 | The client holds no unbounded polling loop | Find every repeating task | FAILS | `ios/Coiny/Views/HomeView.swift:69-72` runs `while !Task.isCancelled { try? await Task.sleep(for: .seconds(30)); await store.refresh() }`. `RootView.swift:4-9` notes that SwiftUI keeps tab content alive, so the loop keeps polling `GET /api/pets` every 30 seconds while the user is on Activity or Wealth. That is **120 requests an hour of foreground use per user**, with no `scenePhase` gate, no backoff when a request fails, and no stop condition. MINOR for cost (the endpoint is a cheap DB read), MAJOR for battery on a screen users are expected to sit on |
| 4.10.3 | The poll has a cheaper alternative that already exists | Check what else refreshes the pet | VERIFIED | `CoinyApp.swift:55-57` already refreshes `petStore` on the `coinyPushReceived` notification, and the pet changes only when a reaction fires, which is exactly what a push signals. The 30-second poll is a second, worse copy of a mechanism the app has. Replace the loop with a foreground-only refresh plus the existing push trigger |
| 4.10.4 | Nothing else on the client holds a timer | Grep for timers and repeating animations | VERIFIED | `grep -rn "Task.sleep\|Timer\.\|TimelineView\|repeatForever" --include="*.swift" ios/Coiny` returns six hits: the poll in 4.10.2, two one-shot sleeps in onboarding (`OnboardingViewModel.swift:462`, `OnboardingConnectScreens.swift:262`), one 4-second sleep in `HomeView.swift:125`, and the two `repeatForever` animations in 4.4.5. No `Timer`, no `TimelineView`, no `CADisplayLink` |
| 4.10.5 | Battery cost of the animated surfaces is bounded | Instruments **Animation Hitches** and the Energy Log, on device | UNVERIFIED | Both `repeatForever` animations are on transient screens (onboarding, first-reaction waiting), so the exposure is minutes, not hours. Re-measure when the commissioned sprite states replace the placeholder art and the Home creature starts animating continuously |
| 4.10.6 | Peak memory on the client is inside the device budget | MetricKit `MXMemoryMetric.peakMemoryUsage`, or the Instruments **Allocations** template | UNVERIFIED | No MetricKit subscriber (4.2.1). The one structural risk is 4.4.3's eager holding list; a 200-holding brokerage constructs 200 SwiftUI views at once. Settles on device with a seeded fixture |
| 4.10.7 | Nothing in the backend accumulates without a bound | Find the in-process caches | VERIFIED with one note | Two in-memory caches exist: Coinbase spot prices with a 60 s TTL (`coinbase/client.ts:222-251`) keyed by currency symbol, bounded by the number of currencies Coinbase lists, and the Plaid JWK cache (`plaid/signature.ts:14-16`), deliberately never evicted because Plaid keys are immutable per `kid`. Both are small and bounded; neither needs changing |

---

## 4.11 App binary size and launch-time dependency cost

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.11.1 | The shipped app size is known | Read the App Store Connect app-size report after the first upload, or `xcodebuild archive` plus the `.ipa` App Thinning report | UNVERIFIED | No archive has ever been produced: `DEVELOPMENT_TEAM` is empty at `ios/project.yml:19` and TestFlight is blocked (`docs/launch-gap-analysis.md` §1 item 5). The instrument is the thinning report, not `ls` on the `.app`, because per-device thinning is what the user downloads |
| 4.11.2 | The dependency contribution to size is known | Size every third-party binary | VERIFIED | One dependency, one binary: `LinkKit.xcframework/ios-arm64/LinkKit.framework/LinkKit` is **10,760,288 bytes (10.3 MB)** of `Mach-O 64-bit dynamically linked shared library arm64`. Against 111 Swift files and 16,369 lines of app code, LinkKit is very likely the largest single component of the download |
| 4.11.3 | The size is a decision rather than an accident | Ask whether the dependency is avoidable | VERIFIED, and it is not | Plaid Link cannot be implemented without LinkKit, and the alternative (a webview Link flow) is neither supported for OAuth institutions nor cheaper. The size is the price of the product's central feature. Record it, do not fight it |
| 4.11.4 | Nothing else has crept into the graph | Read the package list | VERIFIED | `ios/project.yml:26-29` declares exactly one package. There is no analytics SDK, no crash SDK, no networking library, no image library. The no-new-dependencies rule is visibly holding on the client as well as the backend |
| 4.11.5 | The backend image is sized | Read the built image | UNVERIFIED | `fly status` reports the image tag `coiny-backend:deployment-01M020TDT0GMSFEM7TYMTMQEJ4` but not its size; `fly image show` would give it. Not consequential at seven production dependencies and a three-stage Dockerfile that removes npm from the runtime layer (Part 1 1.10.7), but it is the input to deploy time, which is the founder's own latency budget |
| 4.11.6 | Release-configuration size is what gets measured | Check that CI builds Release | FAILS | `ios-ci.yml` runs Debug tests only and `android-ci.yml` runs `lintDebug`/`testDebugUnitTest` only (`docs/launch-gap-analysis.md` §2.2). Debug binaries are not comparable to shipped ones, so any size or launch number taken from CI today would be wrong. Adding one `xcodebuild -configuration Release build` job is the prerequisite for every number in this subsection |

---

## 4.12 Reliability: backup, restore, RPO, RTO, and the rehearsal

An untested restore is not a backup. This subsection separates what the
platform gives for free, what the repository was supposed to add, and what has
ever actually been exercised. The answer to the last is: nothing.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.12.1 | The platform's retention window is known from the platform, not the document | Read the project's own setting | VERIFIED | Neon project `noisy-bonus-65551609` reports `history_retention_seconds: 21600` = **6 hours**, matching the Free plan's published "6 hours, up to 1 GB-month" ([Neon plans](https://neon.com/docs/introduction/plans)). `engineering-budgets.md` §7 stated this correctly and it is now confirmed against the live control plane rather than the docs page |
| 4.12.2 | The second backup layer exists | Look for the nightly dump | FAILS | R-20.1 specifies a nightly encrypted `pg_dump` via a GitHub Actions cron with 30-day retention. `ls .github/workflows` returns eleven workflows and none is a backup; `grep -rln "pg_dump" .github/ bin/ backend/src` returns nothing. **Neon's 6-hour window is the entire backup strategy.** MAJOR before the first tester, exactly as R-20.1 says |
| 4.12.3 | The stated RPO is achievable | Compare the target against the mechanism | FAILS | `engineering-budgets.md` §7 sets RPO at "<= 24 h worst case; minutes inside Neon's PITR window". With 4.12.2 open, the real worst case is **unbounded**: corruption or a bad migration discovered more than six hours after the fact is unrecoverable, because there is no second copy anywhere. The 24-hour figure describes the nightly dump that does not exist |
| 4.12.4 | What would actually be lost is named | Rank the irreplaceable data | VERIFIED | `engineering-budgets.md` §7's ranking holds and the code confirms it: encrypted Plaid access tokens (`plaid_items.access_token`, loss means every user re-links every account), `net_worth_daily` (`schema.ts:724-737`, a time series that cannot be re-fetched from any vendor and is the raw material for every pace and projection), goal and ladder state, then sessions, which are cheap. The middle one is the one a 6-hour window does not protect |
| 4.12.5 | A restore has been rehearsed | Look for the artefact a Neon restore leaves behind | FAILS | Neon's instant restore renames the pre-restore head to `{branch_name}_old_{head_timestamp}` and preserves it ([branch restore](https://neon.com/docs/introduction/branch-restore)). The project contains exactly two branches, `production` (`br-rapid-haze-apncnynh`, created 2026-05-20) and `staging` (`br-orange-mouse-ap2jgw62`, created 2026-08-14 from production at LSN `0/22D32C0`), and **no `_old_` branch of any kind**. The staging branch was an environment split, not a drill. **No restore has ever been performed on this project.** MAJOR, and R-20.2 owns it |
| 4.12.6 | The RTO number rests on a rehearsal | Check what produced the 4-hour figure | FAILS | `engineering-budgets.md` §7 states "RTO < 4 h, solo-founder-realistic" and, in the row beneath, "Rehearsed, below". It was not rehearsed; the row describes the rehearsal that R-20.2 requires. The 4 hours is an intention, not a measurement, and the document reads as though it were one |
| 4.12.7 | What rehearsing a restore on Neon actually involves is written down | Describe the real procedure for this project | VERIFIED as a procedure, UNVERIFIED as a duration | Neon's restore is not a copy-back. It "builds a new point-in-time branch by matching your selected timestamp to the corresponding LSN", moves the compute onto it "so that your connection string remains stable", and renames the old head aside. For Coiny that means: pick a timestamp inside the 6-hour window; restore `staging` in the console or with `neonctl branches restore`; **no Fly secret changes, because the connection string does not move**; then assert. The assertions R-20.2 names are the right ones: row counts within 5%, one known user's `access_token` decrypts under the production `DATA_ENCRYPTION_KEY`, and `max(net_worth_daily.date)` is yesterday. Record the wall clock. **This is a one-hour task that has been open since 2026-08-12 and needs no code** |
| 4.12.8 | The restore drill can be run without risking real data | Check what a drill would touch | VERIFIED, and this is why there is no excuse | Both branches hold synthetic sandbox data only (`fly.toml:39` pins `PLAID_ENV=sandbox`), logical size 31.6 MB and 32.3 MB, well inside the 0.5 GB Free limit. A restore drill on staging today risks nothing and answers the only question that matters before real bank tokens exist |
| 4.12.9 | The encryption key survives independently of the database | Verify presence, never value, in both stores | VERIFIED for one of two | `fly secrets list -a coiny-backend` includes `DATA_ENCRYPTION_KEY` among 29 secret names (names and digests only; no value was read or printed). The second store, the founder's macOS Keychain via `bin/load-secrets.sh`, is a laptop check that an agent cannot make. R-20.3 requires exactly two copies; one is confirmed, one is UNVERIFIED and is a five-minute `security find-generic-password -s coiny-data-encryption-key` away |
| 4.12.10 | Losing the key is understood as unrecoverable | State the consequence in the restore plan | VERIFIED as a fact, FAILS as a written plan | Part 1 1.11.7 established there is no versioned envelope and no re-encryption tooling, so key loss makes every stored token ciphertext garbage and every user re-links everything. That sentence belongs in the restore runbook, because a restore that recovers the database and not the key recovers nothing. There is no runbook |
| 4.12.11 | The default branch cannot be restored or dropped by accident | Check Neon's branch protection | FAILS, with the honest reason | Both branches report `protected: false`, and the branch named `production` is `primary: true, default: true`, so any tool defaulting to the project's default branch lands on it. Neon's protected-branches feature is a paid-plan capability, so this is not a toggle that was missed; it is a Free-plan limitation. **Record it, and take it at the same moment as the Launch upgrade in 4.12.12** |
| 4.12.12 | The plan-upgrade trigger is stated and current | Check the trigger against today's numbers | VERIFIED | `engineering-budgets.md` §7 upgrades to Launch (7-day restore window) at the first paying user or when storage approaches 0.5 GB. Storage is at 32 MB, so the trigger is the paying user. 4.1.8 adds a second, earlier trigger the document does not have: **the compute budget, at ~60 of 100 CU-hours once the scheduler ticks reliably.** Launch is usage-priced at $0.106/CU-hour and also buys the 7-day window and branch protection, so one upgrade settles three rows |
| 4.12.13 | Uptime is measured by something outside the platform being measured | Look for the external pinger | FAILS | `engineering-budgets.md` §1 requires an external pinger ("Must exist before the first tester") against `https://coiny-backend.fly.dev/health`. None exists. The service has been returning 503 to the public internet for hours (4.1.1) and nothing and nobody was told. **This document found the outage by accident.** MAJOR, and it is a free UptimeRobot monitor and five minutes |
| 4.12.14 | The uptime target is honest for the architecture | Compare 99.5% against what is running | VERIFIED, and the target is now the wrong shape | 99.5% monthly allows about 3.6 hours of downtime. Today's outage has already consumed most of a month's budget in a single event. With two machines running (4.1.6) the availability ceiling is actually higher than the target assumes, and the binding constraint is not machine count but the health check in 4.1.4. Fix the coupling, then the target is achievable |

**The reliability verdict.** The backup story is one platform feature with a
six-hour memory, no second layer, and no evidence anyone has ever tried to use
it. That is not unusual for a pre-launch solo project and it is entirely
acceptable **today**, because everything in the database is synthetic. It stops
being acceptable at the first real Plaid item, and the order is fixed by
dependency: rehearse the restore now while the data is fake and the drill is
free (4.12.7), then add the nightly dump (4.12.2), then buy Launch when a
paying user or the compute budget arrives (4.12.12). The external pinger
(4.12.13) is not part of that chain and should be done today, because it is the
control that would have caught 4.1.1.

Sources: [Neon backups](https://neon.com/docs/manage/backups),
[Neon branch restore](https://neon.com/docs/introduction/branch-restore),
[Neon plans](https://neon.com/docs/introduction/plans),
[Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero),
[Fly secrets](https://fly.io/docs/reference/secrets/).

---

## 4.13 What is unmeasurable today, and the tooling that fixes it

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 4.13.1 | Field performance data reaches the founder without a vendor SDK | Decide on MetricKit and say why | FAILS, and the recommendation is to adopt it | No `MetricKit` import exists anywhere (`grep -rn "MetricKit\|MXMetric" ios/`). It is the only route to real-device launch time, hang rate, hitch ratio, memory and disk writes that does not contradict PRD §24, because it is first-party, on-device, OS-aggregated and requires no SDK, no dependency and no DPA. Decisive property: `MXMetricManager` delivers a daily payload to any subscribing app, whereas Xcode Organizer shows only users who opted into sharing diagnostics. **Adopt it.** MAJOR before public launch, not before TestFlight |
| 4.13.2 | Adopting MetricKit is reconciled with the three privacy documents rather than bolted on | Separate the two payload types | VERIFIED as a distinction worth making | `MXMetricPayload` (aggregated launch, hang, hitch, memory histograms) is **Performance Data**; `MXDiagnosticPayload` (crash, hang and disk-write diagnostics with stack traces) is **Crash Data** ([App privacy details](https://developer.apple.com/app-store/app-privacy-details/)). `docs/launch-gap-analysis.md` §8 Q3 recommends approving both. The cheaper first step is the metric half alone: it answers every row in 4.2, 4.4 and 4.10 and costs one label line. Take the diagnostic half when a crash actually needs a stack trace. Either way the label, the manifest (`ios/Coiny/PrivacyInfo.xcprivacy`) and the policy change in the same PR as the code, which is Part 2's row to enforce |
| 4.13.3 | The cost of the MetricKit path is stated | Name the work and the ongoing attention | VERIFIED as an estimate | One `MXMetricManagerSubscriber` class, one `didReceive` handler posting to the `POST /api/telemetry` endpoint that already exists (`api/telemetry.ts`), one `analytics_events` event name, one privacy-label line. About a day. Ongoing attention is near zero because it is push-based and needs no dashboard: the payloads land in a table that plain SQL reads |
| 4.13.4 | Server-side latency percentiles have a substrate | Choose between shipping logs and writing timings to the database | FAILS, decision open | 4.5.3 established that Fly's rolling log buffer cannot answer a weekly p95. Two options and they are not close: ship logs somewhere queryable, which adds a processor to `docs/legal/service-providers.md` and reopens the decision `docs/launch-gap-analysis.md` §1 item 9 says to leave closed; or add `responseTime` and `route` to an `analytics_events` row on a sampled fraction of requests, which uses the pipeline that already exists and keeps everything first-party. **Recommend the second**, sampled at 100% for 30 testers |
| 4.13.5 | The budgets document has consequences, not only targets | Reduce thirteen targets to a small number that will be sustained | FAILS, and this is the meta-finding | `engineering-budgets.md` §1 lists thirteen budgets. Every one is unmeasured, and the reason is structural rather than lazy: thirteen indicators need a dashboard, and a solo founder does not build one. The SRE Workbook's argument is to pick a small number of user-centred indicators and ignore the rest ([Implementing SLOs](https://sre.google/workbook/implementing-slos/)). **Three, all of which already have or nearly have an instrument:** median `first_number_shown.seconds_since_signup` (4.3.1, instrumented today), availability and latency of `GET /api/net-worth` (needs 4.13.4 plus the pinger in 4.12.13), and crash-free sessions (needs 4.13.1). Demote the other ten to "check when something feels wrong" and say so in the document |
| 4.13.6 | Which budgets are unmeasurable today is stated plainly | Enumerate them | VERIFIED as an enumeration | Unmeasurable **until the service is restored** (4.1.1): both net-worth latency budgets, the 5xx rate, webhook acknowledgement and processing times, backend RSS, Neon compute against the 100 CU-hour budget, and Plaid rate-limit headroom. Unmeasurable **until a device and a TestFlight build exist**: cold start, hitch ratio, peak memory, crash-free sessions, binary size. Unmeasurable **until there are users**: the 90-second median, push volume per user, and cost per user per month. Measurable **today and measured above**: query plans (4.7), the fan-out (4.8), payload size (4.6), timeout coverage (4.8.5), the Neon restore window and branch history (4.12) |
| 4.13.7 | Nothing recommended here adds a vendor | Check each recommendation against PRD §24 and the no-new-dependency rule | VERIFIED | MetricKit is a system framework. The latency substrate reuses `analytics_events`. The database index is a migration. The rate limit is a config object. `util/fetch.ts` adoption is existing code. The only new dependency proposed anywhere in this part is `@fastify/compress` in 4.6.2, and the alternative offered there is ten lines of `node:zlib`, so even that is optional |
| 4.13.8 | The recommendations are affordable | State the real monthly cost | VERIFIED | Today: Fly $2.02/month per machine, so ~$4/month for the two that are actually running, plus Neon $0 on Free. The external pinger is free (UptimeRobot free tier). MetricKit is free. The only cost that changes is Neon Launch at roughly $19/month always-on equivalent, and 4.12.12 shows it now has three independent triggers rather than one |

---

## Bullet-to-row map

Written as a ledger rather than from memory, per the brief. Every bullet the
Part 4 brief lists, and the rows it produced.

| Brief bullet | Rows |
|---|---|
| Cold start to first meaningful frame, on the oldest supported device | 4.2.1 to 4.2.8 |
| Time to the first net worth number (R-5.1's 90-second target) | 4.3.1 to 4.3.6 |
| Scroll performance and frame drops on the longest lists | 4.4.1 to 4.4.7 |
| API response times per endpoint, and the p95 rather than the mean | 4.5.1 to 4.5.8 |
| Payload sizes, and whether the client fetches more than it renders | 4.6.1 to 4.6.6 |
| Database query plans on the largest tables, and the missing-index question | 4.7.1 to 4.7.13 |
| Background work: the scheduler's cost per tick, and what it wakes | 4.9.1 to 4.9.9 |
| Memory and battery, particularly anything holding a timer | 4.10.1 to 4.10.7 |
| App binary size and launch-time dependency cost | 4.11.1 to 4.11.6 |
| The fan-out: count it and say the real number | 4.8.1 to 4.8.11 (real numbers in 4.8.1, 4.8.2, 4.8.4) |
| Backup, restore, RPO, RTO, and whether a restore has ever been rehearsed | 4.12.1 to 4.12.14 (rehearsal: 4.12.5, never) |
| Say plainly which budgets are unmeasurable today and what tooling would fix that | 4.13.6, with 4.13.1 to 4.13.5 for the tooling |
| MetricKit: say whether it should be adopted | 4.13.1 (adopt), 4.13.2 (which half), 4.13.3 (cost) |
| Android vitals and Macrobenchmark as externally imposed targets | 4.2.8 |
| The SRE Workbook argument for a small number of indicators | 4.13.5 |
| Live-system verification rather than the repository's description of itself | 4.1.1 to 4.1.10, 4.9.5, 4.12.1, 4.12.5, 4.12.9 |

Every subsection from 4.1 to 4.13 carries a table. 4.0 is method and carries
none by design, as Part 1's header section does.

## Rows deliberately not written here

Owned by another part, cited rather than duplicated:

- Rate limiting as an authorisation control: Part 1 1.5.5 to 1.5.7. 4.5.7 and
  4.5.8 add only the cost and fleet-count dimensions.
- Whether MetricKit payloads change the privacy manifest and the nutrition
  labels: Part 2. 4.13.2 states the distinction and stops.
- The absence of a release-configuration CI job, the missing distribution
  lane, and the static version strings: `docs/launch-gap-analysis.md` §1 item 5
  and §2.2. 4.11.6 cites them as the prerequisite for a size number.
- Reduce Motion as an accessibility requirement: Part 6. 4.4.6 records only the
  one animation that ignores it, because it is the same code as 4.4.5.
- The Sentry decision: `docs/launch-gap-analysis.md` §1 item 9. 4.13.4 reaches
  the same recommendation from the latency side and does not relitigate it.

## Documents this part contradicts, and should update

- `docs/engineering-budgets.md` §1 ("Unmeasured, and structurally unboundable:
  5 of 27 categories are live external fetches inside the request"), the §1
  push row ("No day cap ... No quiet hours", both now built, 4.9.5), §3 ("None
  exists: zero cron, `setInterval`, or queue anywhere in `backend/src`"), §5
  (the 24-request iOS fan-out), §7 ("Rehearsed, below"), and the §3 claim that
  a 15-minute tick lets the Neon endpoint sleep (4.1.8).
- `docs/prd.md` §16, which marks R-16.1, R-16.2 and R-16.5 Unbuilt. The first
  two shipped; the third is partial, not absent (4.8.5).
- `docs/obligations.md` §5 and `docs/launch-gap-analysis.md`, both of which
  carry the retired "roughly 36 external calls" figure (4.8.1).
