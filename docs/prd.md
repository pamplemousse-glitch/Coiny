# Coiny: Product Specification

**Status:** Adopted 2026-08-12. This document supersedes `docs/prd-app-v2.md` and `docs/product-brief.md` as the product source of truth. Where it disagrees with any other document, this one wins, except that `docs/obligations.md` owns legal reasoning and `docs/engineering-budgets.md` owns performance and cost numbers; this document folds their conclusions in as requirements and cites them for the argument.
**Code state:** every Built / Partial / Unbuilt marking and every file:line was verified by reading source at commit `5406a7b`, branch `fix/critical-backend-bugs`, on 2026-08-12. Backend suite at that commit: 845 passing, 15 skipped, 84 test files. Code moves daily; re-verify Appendix C before acting on it in a later session.
**Owner:** Antoine Wiley, Athanor Works LLC. Solo founder, pre-launch, next milestone 30 TestFlight testers, then paid launch.

How to read this document:

- Requirements carry IDs (`R-7.12`), a status (**Built** / **Partial** / **Unbuilt**), and where the gap matters, a severity. Severity scale, shared with the sibling documents: **BLOCKER** (ships broken, loses data, breaks the law, or fails review), **MAJOR** (materially wrong behaviour, or a cost or trust problem inside 30 testers), **MINOR** (real but survivable, fix when touching that code), **LATER** (correct at scale, premature now, trigger stated).
- The spec states desired behaviour. Current-state divergences live in Appendix C with file:line, not asserted inline as fact, so the prose does not rot when code moves.
- Every number lives in exactly one section and is referenced elsewhere. Where a number exists as a named constant in code, this document cites the constant, not the value: the code is the single source of truth for it, and a test can pin it.
- Money math, thresholds, notification rules, schema, and the pet contract are written precisely (condition, trigger, response, verification), because those are the places where two reasonable implementations diverge into different products. Layout, tone, and animation are written as intent plus constraints; `docs/design-direction.md` binds the visual system.
- When implementing and this spec is silent or self-contradictory on behaviour you are about to write: stop and ask. If running unattended, take the conservative option, mark the site `// SPEC-GAP: <question>`, and list every SPEC-GAP in the PR body. A resolved question becomes an Appendix A register row before merge.
- A PR that implements or invalidates a requirement updates Appendix C in the same diff. Doc and code change together or the doc is presumed stale.

---

# PART I: PRODUCT

## 1. What this is, and the case against it

### 1.1 The product

> **Coiny sees everything you own and everything you owe, and turns it into one next step, held by something that is counting on you.**

An iOS app (Android is a scaffold consuming the same API, §14) that assembles a user's complete net worth from one required bank connection plus declared assets, places them on an 8-rung foundation ladder, and fronts the whole thing with a small pixel creature whose permanent evolution is gated by real financial progress. Positioning: "Finch meets Kubera." Finch supplies the mechanic (a dependent creature that displaces self-motivation); Kubera supplies the substance (net worth breadth at $250 to $2,499/yr with no behavioral layer at all). Nobody occupies the middle. Full strategy in `docs/vision.md`.

### 1.2 Target user and archetypes

24 to 38, money spread across six to fifteen places, not broke and not organized, avoiding the whole picture because the whole picture has never been assembled.

| Archetype | Situation | What Coiny does for them |
|---|---|---|
| **Maya, 27, support rep, $68K** | $9,400 across three cards at 24% APR, unfunded Roth, checks her balance and closes the app | The ladder sequences cards before Roth, shows a real debt-free date; the pet reacts to the payment made, never the balance remaining |
| **Deven, 33, engineer, $185K + RSUs** | 401k, brokerage, ~40% of liquid net worth in employer stock, $22K across four chains, a forgotten Kalshi account | The only product that assembles all of it, then says "63% of your investable assets are one ticker" (§7.7). The paying user |
| **Priya, 31, freelancer, $3.2K to $11K/mo** | Feast-or-famine; every monthly budget frame is wrong | Runway and income volatility are first-class; her emergency fund is sized off measured volatility, not a flat 3x (§7.1 rung 4) |

**Anti-targets:** active traders (no price alerts, no watchlists, no intraday anything), zero-based budgeters (YNAB owns them), single-checking-account users (our cost is per-connection, our value is aggregation), children and teens (COPPA scope we refuse), people who want to be roasted (Cleo's lane, and Cleo's $17M FTC settlement).

### 1.3 The case against it, answered

`docs/market-research-2026-08.md` §1 was written to falsify this product. Four findings, each of which shapes this specification rather than being argued away:

1. **The pet mechanic decays by month three.** Finch's diagnosed weakness: "the same pet mechanic that delights you in week one can start to feel like one more thing to tend in month three." Answer: the pet is the launch mechanic, the ladder is the retention mechanic. Rungs are about real money, there is always a next one, and stage progress is permanent (§7.1). Build order follows: ladder wiring precedes character commission spend (§30). Sleep-as-success (§7.5) removes the "one more thing to tend" tax: a quiet week renders as a resting creature, not a needy one.
2. **The guilt thesis is thinner than assumed.** There is no documented volume of "this app judged me so I deleted it." What is documented is avoidance of the finances themselves: afraid to check, avoid checking, shame, more avoidance. Answer: the pitch is not "other apps shame you," it is "checking your money is something you avoid, and this makes it something you do." The never-shame design rules (§7.5, §7.6) stand on the avoidance-loop evidence, which is stronger, not weaker.
3. **The loudest stated demand is the opposite product: privacy-first, no bank linking.** Answer: declared-first onboarding (§5) is a strategic asset, not a conversion trick; it is the only path in the category to a full net worth number with zero authentications. Whether declared-only becomes a permanently supported mode is Appendix B item B6. And "never show a silently stale number" is a launch-blocking requirement (§8), because integration breakage is the documented number one churn cause in this category and the reason the spreadsheet holdouts left.
4. **Nobody is asking for a Tamagotchi for their money.** Answer: accepted. This is category creation, so distribution is demonstration-led (video, App Store preview, word of mouth), there is no search intent to capture, and the creature must sell the idea in three seconds, which is what the character commission budget buys (`docs/design-direction.md` §5, §7). The related adult-credibility risk ("is it a tracker or a game?") is answered structurally: the creature is quarantined to the Window and every data surface is severe and typographic (design-direction §1.1).

### 1.4 The magic moment

Within the first session: net worth assembled from one bank login plus a few taps of declaration, full-screen; then the egg cracks and the pet says one sentence about what comes next. Timing targets and measurement in §5.

The flagship sentence has two variants, because pace math needs history it cannot have on day one (§7.2):

- Day one, no contribution history: "Your next rung is a $2,000 buffer. You are $1,340 away."
- After 30 days of history on the relevant account: append the pace clause, "At your current pace that is nine weeks."

### 1.5 Product principles

These adjudicate. When two requirements conflict, the lower-numbered principle wins.

1. **React to what they control.** Contributions, payments, spend against plan, debt paydown, connections. Never market moves, never the balance itself. Enforced in `backend/src/reactions/external.ts` (§7.6).
2. **Never shame, never regress.** Stage never goes down. Streaks are repairable. A missed day costs nothing. Negative reactions attach to the behavior, never the person, and always ship with a one-tap action.
3. **Compute it, do not ask it.** Every onboarding question must justify why it cannot be derived (§5.4).
4. **One next step.** The home screen answers "what do I do" before "how am I doing."
5. **Precision or silence.** No number without a date and a stated basis. If we cannot compute it honestly, we say "too early to say," never a guess. This principle mechanically generates every cold-start rule in §7.
6. **Never gate visibility behind a manual workflow.** Data arrives on its own; the pet reacts to aggregates; imperfect categorization degrades gracefully and never blocks the product (market-research §4). Any feature that requires category correction to function is rejected on this principle.

### 1.6 Voice

Trait words: **quietly competent, specific, unbothered, never disappointed in you, slightly odd.** Encouraging over judgmental, quiet over talkative, cute over edgy, earnest over sarcastic, realistic over optimistic, retro over modern, they/it. All user-facing strings live in §10 with three tests every line must pass.

## 2. North star and counter-metrics

**R-2.1** [Unbuilt, BLOCKER before first tester] The north star is **W4**: the percentage of signups who completed a foundation-ladder rung or a habit-goal period within 4 weeks of signup AND had an `app_open` event in days 21 to 27 inclusive, where day 0 is the calendar day of `signup_completed`. The activity signal is the iOS `app_open` analytics event (§24), nothing else. This definition supersedes both earlier variants (the undefined "still active in week 4" and a days-22-to-28 draft); every other reference to W4 in any document cites this section rather than restating it.

- Target: 25% W4 at 1,000 users. Below 1,000 users, W4 is watched, not targeted: the denominator is too small for the number to mean anything week to week.
- Verification: the saved query `backend/queries/retention.sql` (to be created with §24), run weekly. Its cohort logic must match this definition token for token.
- Dependency: the event pipeline (§24). Cohorts cannot be backfilled; a cohort that was not instrumented is gone, which is why instrumentation is a blocker for the first tester, not a nice-to-have.

**R-2.2** [Unbuilt] Counter-metric, same query: the percentage of signups who completed a guardrail period in week 4 with **no** `app_open` in days 21 to 27. This product deliberately reduces app opens (sleep is a success state, §7.5), so a pure open-rate metric understates it; a rising quiet-but-succeeding cohort is a product win that W4 alone would misread as churn.

**R-2.3** [Unbuilt] Supporting counter-metrics, watched so W4 is not gamed: push opt-out rate (`push_permission_changed`, §24), return rate on the day after a negative event, and median connections per active user. `reaction_shown` with `origin=market` must be zero always; a single occurrence is a principle-1 violation to treat as a defect.

## 3. Scope

### 3.1 In scope for paid launch

The iOS app (four tabs per §4, onboarding per §5, goal system per §7, states per §8), the backend that serves it, notifications per §9, monetisation per §25, the compliance floor per §26 and §27, and the Android scaffold kept compiling as a second consumer of the same API (§14). Feature parity for Android is 6-month-block work (§30), not launch work.

### 3.2 Out of scope, permanently or until a stated gate

| Item | Status | Gate or reason |
|---|---|---|
| Hardware | Deferred, not cancelled | **1,000 paying subscribers still active at 3 months** (locked 2026-08-12, `docs/vision.md` §8). Until then: no firmware work, no parts, hardware appears in no plan except as a post-launch accessory. The `subscription_started`/`subscription_churned` events (§24) are what make this gate measurable |
| Lending, advances, referral fees on financial products, data sale | Never | The three closest dead comparables all died monetizing this way; Cleo's FTC settlement maps the adjacent trap (`docs/market-research-2026-08.md` §5, §6.1) |
| Leaderboards, social comparison, pet death or devolution, daily login rewards, loot boxes, anything triggered by spending | Never | §7.6 never-build table |
| The word "advice," or any instruction to buy or sell a specific instrument | Never | Observations about the user's own data only; the Advisers Act line (`docs/obligations.md` §7). Copy rule in §10 |
| Steam and SnapTrade integrations | Removed 2026-08-12 (`5406a7b`) | Steam had no contractual footing at all; SnapTrade's free tier is one user. Register row DR-8 |
| Developer API | Cancelled | Replaced by export-on-a-timer and MCP, both deferred (below) |
| Web app, EU beyond UK, cofounder-scale process | Not planned | Revisit on their own evidence |

### 3.3 Deferred, with triggers

| Item | Trigger to start |
|---|---|
| Household tier (§25) | Individual tier live AND the two-party consent flow specced and lawyer-reviewed (obligations §2; shipping without it is a BLOCKER for that tier) |
| UK launch (TrueLayer live mode) | The RAISP/agent/perimeter question answered by counsel (obligations §8 Q2). Enabling live mode before that answer is prohibited |
| Multi-currency | 6-month block (§30); prerequisite for UK |
| Spreadsheet export | First paying cohort; demand is proven (Tiller) and the data is already assembled |
| MCP endpoint | Post-paid-launch retention feature for the top tier |
| Widgets, Live Activities, Watch | After the character commission delivers the 1-bit reductions |
| Seasons, molting, quests, cosmetics library | After a retention signal exists (W4 measured over at least two cohorts) |
| Commitment-lock goals | Paid tier, after target goals ship |
| Zero-connection mode as a marketed feature | Appendix B item B6 |

---

# PART II: EXPERIENCE

## 4. Information architecture and navigation

**R-4.1** [Partial] Four tabs: **Pet, Plan, Activity, Wealth**, with Settings behind a toolbar gear. Current code has three tabs, Pet / Activity / Wealth (`ios/Coiny/Views/RootView.swift:7-23`), and no `PlanView.swift` exists. The Plan tab is new construction (§7); goals leave Settings (`ios/Coiny/Views/SettingsView.swift:39-55` currently renders the four legacy goal fields, which are deprecated by §13).

| Tab | Job | One-line contract |
|---|---|---|
| Pet | Answer "what do I do" | Non-scrolling. The Window, one speech line, the active rung with progress, at most one action button (design-direction §6.1) |
| Plan | The goal system's home | Ladder, target goals, guardrails, years-to-freedom slider (design-direction §6.2) |
| Activity | Cash-flow feed | Cash movements only, never unrealized gains (Design Decision A, preserved). Pet Stamp appears only on rows that moved the pet |
| Wealth | The number and its composition | Six fixed groups, nothing empty ever rendered, one stacked bar, staleness timestamp always visible (§7.8) |

**R-4.2** [Unbuilt] All connection affordances live on a single searchable "Add an account" screen reached from one button on Wealth. No connect buttons scattered through empty sections. Verify: a fresh account renders zero "Connect" calls-to-action outside that screen and onboarding.

**R-4.3** [Unbuilt] The creature appears only inside the Window (Full 192pt on Pet, Panel 64pt on Plan's rung header, Stamp 20pt in Activity gutter rows and the tab bar). It never appears on a data surface otherwise; no other illustration exists anywhere in the app. Binding spec: design-direction §1.1.

## 5. Onboarding and activation

### 5.1 Time to value

**R-5.1** [Unbuilt, MAJOR] When a new user completes sign-in, the app shall render the assembled net worth number within **90 seconds** of `signup_completed`, and the hatched pet holding one specific instruction within **3 minutes**, measured as the median of (`first_number_shown` minus `signup_completed`) across the first 30 TestFlight testers (§24 events). If the median exceeds the target, onboarding screens are cut until it does not. Nothing may be inserted into this flow without removing something else.

### 5.2 Screens

Replaces the current four-page flow. **R-5.2** [Unbuilt] Delete `EnterNamePage` (`ios/Coiny/Views/OnboardingView.swift:21,88`): no name entry, Sign in with Apple supplies identity. Delete the purple/pink hero styling (`OnboardingView.swift:62,104,290`), banned by design-direction §3.1.

| # | Screen | Ask | Notes |
|---|---|---|---|
| 0 | Sign in | Sign in with Apple | Nothing else. |
| 1 | The egg | Nothing | The Window with the egg, one line of pet voice (§10 S-1). The user meets the character before the product |
| 2 | "What do you have?" | ~14 multi-select chips: Checking, Savings, Credit cards, 401k/pension, Brokerage, Crypto, Car, Home, Student loans, Business, Collectibles, Other. **No amounts** | 8 seconds, feels like a quiz. Determines the rest of the app |
| 3 | "Roughly how much?" | One log-scale slider per selected chip, each skippable. Sliders, never keyboards | Values stored bucketed with `confidence: 'declared'` (R-5.3) |
| 4 | The number | Nothing | Full-screen net worth, per-line confidence indicator, subtitle "this is an estimate, let's make it real" |
| 5 | One connection | Plaid Link, framed: connect the account you actually spend from, the only one needed to start | Abandoning Link is never terminal: the user lands on the hatch regardless, with a persistent connect affordance and the creature in its Disconnected state (§8) |
| 6 | Found money | Nothing | The subscription reveal (§5.5): what this account pays for on a recurring basis, with the annual total. **Auto-skipped entirely when detection returns nothing** (R-5.6); it must never appear as an empty screen, and it must not push the hatch past the R-5.1 target |
| 7 | Hatch | Nothing | Egg cracks; the one-sentence instruction (§1.4, day-one variant) |
| 8 | Notifications | System prompt, pre-framed with the §10 S-6 promise | S-6 must match the §9 budget; the constants are the source of truth |

**R-5.3** [Unbuilt, MAJOR] A `declared_assets` table shall exist: `(user_id, asset_class, bucketed_value_usd, confidence, declared_at, refreshed_at)`. Screen 3 writes to it; the Wealth tab renders declared lines labelled "self-reported <date>" forever (they are never auto-refreshed and never excluded). No such table exists in `backend/src/db/schema.ts` today; the most important screen in the product currently has nowhere to write.

**R-5.4** [Unbuilt] While a declared value is 60 or more days old, the app shall show a refresh nudge for it ("Your car estimate is 2 months old"), at most one such nudge per week, in-app only, never push.

### 5.3 The connection ladder (post-onboarding)

Connections are requested one at a time, each at a moment the user already wants what it unlocks. Never a batch, never a "connect 8 more things" checklist.

| Trigger | Ask | Stated payoff |
|---|---|---|
| Declared debt > $0, no card linked | Plaid Liabilities (or Spinwheel) | "A real payoff date instead of an estimate" |
| Declared 401k/brokerage, day 3 | Plaid Investments | "Your retirement number is a guess. One connection fixes it forever" |
| Declared crypto, day 5 | Wallet address paste (no auth) | "Read only, no keys" |
| Declared home, week 2 | Address or purchase price + date | "I will index it forward. No account needed" |

### 5.4 Compute, do not ask

The four values currently asked cold in Settings are derived and offered for correction:

| Legacy ask | Derivation | Fallback |
|---|---|---|
| `paycheckMinAmount` | 60% of the modal recurring inflow stream (`plaid_recurring_streams`) | 60% of the largest single credit in 90 days |
| `largePurchaseThreshold` | P95 of trailing 180-day outflows | 3% of monthly income |
| `weeklyBudgetByCategory` | Trailing 8-week median per category; propose a 10% cut on the top discretionary category only | Do not set one |
| `savingsGoal` | The active ladder rung's target (§7.1) | The rung 1 target |

### 5.5 The subscription reveal: the first provable dollar outcome

Settled by the founder 2026-08-12 (register DR-19). Rocket Money's entire wedge is "find the subscriptions you forgot about," because it is an immediate provable outcome rather than a dashboard. Coiny has the detection built and unused; what does not exist is its placement in the first session, before the creature has done anything.

The machinery, verified: Plaid's own recurring streams are seeded in the background at token exchange (`recurringTransactionsGet` fired via `setImmediate`, upserted into `plaid_recurring_streams`, failures swallowed as non-fatal, `backend/src/api/plaid-link.ts:36-47`) and served by `GET /api/plaid/recurring` (`api/plaid-recurring.ts:5-8`). The home-grown detector runs over the trailing 120 days of stored outflows, requiring `MIN_OCCURRENCES` at a 25-to-35-day cadence within `AMOUNT_TOLERANCE_PCT` (`backend/src/subscriptions/detect.ts:21-24`), served by `GET /api/subscriptions` (`api/subscriptions.ts:6-9`). iOS has a plain list reachable only from Activity (`SubscriptionsView.swift`, pushed from `SpendingView.swift:18`).

**R-5.5** [Unbuilt] When the onboarding Plaid connection completes, the app shall request both recurring sources and, if at least one subscription is found, present the reveal (screen 6) before the hatch: the list sorted by amount descending, each row showing merchant, cadence, and amount, and the headline showing the **annualised total** (sum of amount × 365 / cadenceDays). Copy S-33. Plaid's recurring streams are the primary first-session source, since they are computed by Plaid over the institution's own history and can exist minutes after link; the 120-day local detector takes over as transaction history accumulates. Dedupe across the two sources by lowercased merchant name before display; where both report the same merchant, prefer the local detector's numbers (they reflect what this user's stored data actually shows).

**R-5.6** [Unbuilt] While detection returns zero subscriptions at reveal time, which will be common for a new item with limited synced history, screen 6 shall not render at all; onboarding proceeds directly to the hatch. The reveal is then deferred, not dropped: when any later sync first yields one or more detected subscriptions within 14 days of signup, the app shall surface the same reveal once as an Activity card with the pet's Curious line (S-34), never as a push. An empty reveal screen ("we found nothing") is banned: it converts the product's first proof moment into its first shrug. This deferred-empty state also appears in the §8 matrix.

**R-5.7** [Partial] What the user can do with the list, stated precisely because the adjacent business model is a trap: Coiny **surfaces and totals; it does not cancel**. Per row, exactly two actions: "Keeping it" (collapses the row, no further mention) and "Didn't know about this" (flags the row; flagged rows stay visible with their annual cost, feed the discretionary-cap suggestion in §7.3, and arm the existing `subscription_cancelled` celebration in §7.6, so when the user cancels it themselves and the charge stops, the creature notices). No cancellation-as-a-service, no negotiation service, and **no fee, referral, affiliate, or revenue share of any kind attached to this surface, ever**: Rocket Money monetises this exact feature by taking 35 to 60 percent of negotiated savings and carries a materially worse Trustpilot score than App Store score, concentrated on surprise fees and cancellation friction. Coiny's position is the opposite, it is a differentiator, and it is doctrine under R-25.5 and §3.2. The feature is **free-tier** (§25.1): it is the acquisition hook, and gating it would gate the product's first proof of value.

## 6. The core loop

The product is built so that doing nothing is often the correct state, and the loop respects that.

- **First session:** the subscription reveal (§5.5) is the loop's opening move: a concrete, provable dollar outcome that lands before the creature has done anything, and the annualised subscription total it produces becomes a standing input to the discretionary guardrail (§7.3) and, later, to quest-style suggestions (deferred with the §3.3 post-retention-signal items).
- **Daily:** nothing is required. Opening the app plays the Notice animation (the creature looks up after about a second; it never greets, never begs). The visit answers "what do I do" in under ten seconds or there is nothing to do and the creature is resting.
- **Weekly:** habit-guardrail periods close and streaks update (§7.3). The opt-in digest, if enabled, arrives per §9. Goal-creation prompts fire only on temporal landmarks: Mondays and the 1st of the month, never randomly (fresh-start effect, prd-app-v2 §3.4 citations).
- **Monthly:** bills-on-time and utilization guardrails resolve; the savings-rate month closes; the pay-before-close reminder fires per card when warranted (§7.4).
- **Rare, and loudest:** a debt hits zero, a goal completes, a rung completes and the creature transforms. Stage transitions are the most produced moment in the app (design-direction §4.5) and the only full-screen ones.

**R-6.1** [Unbuilt] While the user is on track and nothing needs doing, the creature shall be resting (Sleeping state) and the speech line empty. No "come back soon" copy anywhere, ever. A quiet week must read as a good week.

## 7. Feature specs

### 7.1 The Foundation Ladder

The centerpiece. Engine exists and is tested (`backend/src/goals/ladder.ts`, pure functions, injected clock) but has **zero production callers**: `GET /api/pets` still returns only the legacy scalars (`backend/src/api/pets.ts:5-7`). Wiring it is the top of the roadmap (§30).

**R-7.1** [Built, unwired] Eight rungs, sequenced, one active at a time, driving the creature's permanent stage. Names, stages, and evaluation are code-defined in `RUNGS` (`ladder.ts:115-226`); targets cite these constants and derivations:

| Rung | Name / stage | Satisfied when | Source of the number |
|---|---|---|---|
| 0 | Sighted / Egg | A spending account is connected | `ladder.ts:122-127` |
| 1 | Floor / Hatchling | `liquidCash >= max(STARTER_BUFFER_USD, 0.5 × essentialMonthly)` | `STARTER_BUFFER_USD` (`ladder.ts:83`); JPMorgan cash-buffer basis cited in the constant's comment |
| 2 | Free money / Sprout | Employer match `captured` (declared), or structurally `not_applicable` when no plan exists | `ladder.ts:148-153`; verification branch is open decision B2 |
| 3 | Bleeding stopped / Fledgling | Zero balance on every debt above `HIGH_APR_THRESHOLD` | `ladder.ts:79` |
| 4 | Buffer / Adolescent | `liquidCash >= essentialMonthly × emergencyFundMonths(incomeVolatility)` | `emergencyFundMonths` (`ladder.ts:108-113`): volatility-sized, conservative when volatility unknown. The Priya feature; no competitor does it |
| 5 | Sheltered / Adult | `taxAdvantagedRate >= 0.15` (user-adjustable rate; income basis is open decision B1) | `ladder.ts:189-192`. **No producer of `taxAdvantagedRate` exists anywhere**; until one does the rung is indeterminate and the UI says what connecting would unlock |
| 6 | Surplus / Elder | `monthsAtSurplusRate >= 3` at `SURPLUS_SAVINGS_RATE` | `ladder.ts:200-209,228`; rate is take-home based (`derived.ts:174-189`), open decision B1 |
| 7 | Freedom / Ascendant | Never. Reports `investedTotal / (essentialMonthly × 12 × 25)` as a percentage forever | `ladder.ts:217-224`; 4%/25x default, slider 3.5% to 5% with citation in the tooltip |

**R-7.2** [Built] Invariants, enforced in the engine and load-bearing for the whole product: a rung never un-completes (`ladder.ts:271-274`; a violated completed rung is surfaced as a reopened task via `reopenedRungs`, `ladder.ts:299-305`, without touching the creature), and a rung can never be failed, only satisfied, skipped, or not applicable (`ladder.ts:9-16`). Stage is derived, never stored, so ladder and stage cannot disagree (`stageForLadder`, `ladder.ts:309-315`).

**R-7.3** [Built] Cold-start: null means "we do not know" and is never treated as zero. An indeterminate input makes the rung indeterminate rather than satisfied (`ladder.ts:85-91`, `derived.ts:7-10`). Substrate minimums: `MIN_MONTHS_FOR_VOLATILITY` (`derived.ts:17`) and `MIN_DAYS_FOR_MONTHLY_RATE` (`derived.ts:21`); outflow rates scale by the observed history span, never a fixed divisor (`derived.ts:146-160`, fixed in `25c401e`). The minimum-window value itself is open decision B3. Every consumer of a null substrate field renders its no-data state (§8), reading "too early to say," never zero.

**R-7.4** [Unbuilt] Any rung can be skipped with a stated reason, marking it `skipped` (user-reversible, `ladder.ts:253-256`) or `not_applicable` (structural, e.g. no employer plan, `ladder.ts:261-264`). The Plan tab must expose skip with a reason picker; no rung can be failed, so no failure UI exists.

**R-7.5** [Unbuilt] Sub-stage progress: each rung shows percent complete; the creature visibly changes within a stage at each 10% decile of rung progress (endowed progress: existing balances count from the start, so most users open rung 1 well above zero). Emits `rung_progress` on decile crossings only (§24).

**R-7.6** [Unbuilt] The nightly pipeline (scheduler, §16) recomputes derived state, re-evaluates the ladder, records `net_worth_daily`, and emits `rung_started` / `rung_completed` / `rung_skipped`. The persistence layer exists (`backend/src/store/goals.ts`: `refreshDerivedState`, `refreshLadder`, `recordNetWorthDaily`); what is missing is the caller.

### 7.2 Target goals

User-defined "save $X by date Y," done properly. **Nothing is built**: no goal CRUD, no API, no UI. The `goals` and `goal_periods` tables exist (`backend/src/db/schema.ts:637,667`).

**R-7.7** [Unbuilt] Fields per goal: `name, emoji, kind ('save'|'payoff'|'purchase'), target_amount, target_date (nullable), funding_account_id, counts_existing_balance (default true), contribution_rule {type: 'recurring'|'roundup'|'manual', amount, cadence, day_of_month}, recurring_annual` (sinking funds are a `save` goal with a date and `recurring_annual: true`, resetting on completion; `target_amount / months_until_due` is the whole mechanic).

**R-7.8** [Unbuilt] Nightly computed per goal, with the null rules stated because an agent will otherwise invent `?? 0` and every dateless goal will be born "Off pace":

- While `target_date` is null: `requiredRunRate` and `pace` are null and the goal renders contribution history only.
- While `target_date` is set: `requiredRunRate = (target_amount - current) / months_remaining`, where `months_remaining` is the fractional month count from computation date to `target_date`, floored at 0.25.
- `actualRunRate` = trailing 90-day mean net contribution to the funding account. While fewer than 30 days of contribution history exist on that account, `pace` is null and the UI reads "too early to say."
- `pace = actualRunRate / requiredRunRate`, rendered **Ahead** (>1.1), **On pace** (0.9 to 1.1), **Behind** (0.5 to 0.9), **Off pace** (<0.5).
- `gapAction`: the single smallest change that returns the goal to on-pace, expressed as one number ("+$61/month" or "push the date 7 weeks").
- Verification: unit tests for null date, past date, a date 3 days out, and a 10-day-old funding account.

**R-7.9** [Unbuilt] Maximum **three** active target goals, hard-enforced; a fourth requires archiving one. Concentration beats dispersal (Kettle et al., debt account aversion; prd-app-v2 §3.1 carries the citations). Default contribution rule is `recurring`, not round-ups: the CFPB's Qapital analysis found guaranteed rules produce 1.5x to 3.5x the gains of contingent ones. Round-ups are offered as a supplement with honest framing ("This is the fun one. It saves less").

**R-7.10** [Unbuilt] Off-pace copy never says "you are behind." It says the date moved, or what gets it back (§10 S-14). Every goal's creation flow ends with "when should this happen?", stored as the contribution rule trigger (implementation intention).

### 7.3 Habit guardrails and streaks

**R-7.11** [Unbuilt] Guardrails are recurring, period-based, pass/fail per period, tracked in `goal_periods`. The set at launch, each with period, default, and data source:

| Guardrail | Period | Default |
|---|---|---|
| Savings rate floor | Month | 15% to start, +2pp per achieved quarter, capped at the active rung's target. Consumes the Layer 0 fraction (`derived.ts:174-189`), never the display percentage (`store/transactions.ts:124-125`); the two are deliberately distinct and must not be conflated |
| Discretionary cap | Week | Trailing 8-week median minus 10%, top discretionary category only |
| Bills on time | Month | Every account with a `nextDueDate` paid before it (`plaid_liability_cache`) |
| Utilization before close | Month | Every card under the §7.4 threshold |
| Contribution streak | Week | At least one net positive transfer to any goal account |
| No new recurring | Month | No new subscription detected |
| Debt principal paid | Month | Any payment above minimum on any debt |

**R-7.12** [Unbuilt] Streak rules, which matter more than the guardrails: streaks are **weekly, never daily** (money has no daily resolution; a daily streak on a finance app is a lie that will break). Two repair tokens banked at all times, one more earned per 3 completed periods, cap 2 banked. A broken streak resets the counter and nothing else: no stage loss, no pet distress, no push (§9 never-list). No leaderboards, ever.

### 7.4 Debt

The highest-value, lowest-regulatory-risk surface. Nothing beyond ingestion caches exists.

**R-7.13** [Unbuilt, MAJOR before any user connects both sources] Dedupe. Plaid Liabilities and Spinwheel both produce debt and are not deduplicated; a user connecting both has the same card counted twice. Required: a `debt_accounts` table, one row per real-world debt, match key `(normalized_issuer, last4 or open_date, credit_limit)`, source precedence **Plaid over Spinwheel for balance** (more current), **Spinwheel over Plaid for APR and limit** (bureau data more complete), with a manual "these are the same account" merge affordance. Merged record: `debt_id, user_id, issuer, nickname, type, source_ids[], balance, apr, min_payment, credit_limit, due_day, statement_close_day, is_promotional, promo_end_date, promo_apr, status`.

**R-7.14** [Unbuilt] Strategy: default **Blend**, both pure strategies selectable in one tap, and the dollar cost of the choice always shown ("Blend costs you $214 more than pure avalanche and $806 less than pure snowball"). Blend rule: order by APR descending; if any debt can be cleared within 3 months when the **full** extra payment is hypothetically concentrated on it, promote it to first regardless of APR; otherwise pure avalanche; recompute after every payoff. (The concentration clause resolves an ambiguity the earlier spec left open.)

**R-7.15** [Unbuilt] Payoff plan: inputs are the merged accounts, one extra-monthly-payment number (pre-filled from `takeHomeMonthly - essentialMonthly - discretionaryMonthly - sum(min_payments)`, floored at $25), and a strategy. Amortization with monthly rate `r = APR/12`: `months = -log(1 - (r × B) / P) / log(1 + r)`, valid only when `P > r × B`. The guard is a finding to surface, not an error to swallow: "At $85/month this card never goes away. $141 clears it in 8 years." Outputs: debt-free date as a calendar date, per-debt order and dates, total interest, delta versus minimums-only in dollars and years. Plus the extra-payment simulator: one slider, live-updating date, interest saved, and which debt dies next.

**R-7.16** [Unbuilt] Minimum payments are never the primary number (anchoring harm is documented and supplemental disclosure does not offset it; prd-app-v2 §4.5 citations). The primary number on every debt card is the payment that clears it in 36 months, or the user's plan payment if better; the minimum renders smaller, labelled "minimum (the trap)."

**R-7.17** [Unbuilt] Pay-before-close: two days before each card's statement close date, if projected utilization exceeds 30%, notify with the exact amount that brings it under, per card. Projected utilization = latest synced balance / limit, with the staleness bound owned by `docs/engineering-budgets.md` §2. `statement_close_day` is not returned by any provider and is asked for once on the debt card, the one manual input in the product that earns its friction.

**R-7.18** [Unbuilt] Consolidation math is shown when asked, always next to the reborrowing statistic (median utilization back to 42% within 18 months). Coiny never refers to a lender, takes no referral fee, and never monetizes debt (§3.2).

### 7.5 The creature

**R-7.19** [Partial] Three state variables replace the current two-integer `healthScore`/`mood` pair (`schema.ts:51-52`, decayed by `computeMoodWithDecay`, `backend/src/health/decay.ts`):

| Variable | Range | Driven by | Can decrease? |
|---|---|---|---|
| **Stage** | 0 to 7 | Highest completed rung, derived via `stageForLadder` (Built, `ladder.ts:309-315`, unwired) | **Never** |
| **Vitality** | 0 to 100 | Recent guardrail pass rate | Yes, gently: decays 1/day after 14 quiet days, floor 40. Exact weighting is open decision B4 |
| **Rest** | 0 to 100 | Whether anything needs doing (name and driver are the B4 merge of the earlier "Energy"/"Rest" duplicate) | Yes: after a 72-hour grace, 8/day to floor 0, rendering as the creature napping |

**R-7.20** [Unbuilt] Low Rest must never render as distress. Asleep is peaceful, curled, slow-breathing; it must be impossible to mistake for Unwell (open eyes, dull, drooped), which is reserved for sustained multi-week vitality failure and used rarely. A sad pet because you did not open the app is emotional blackmail and is banned outright. A one-tap "away" pause extends the grace period without penalty.

**R-7.21** [Unbuilt] Stage change is the signature produced moment: full transformation, not a palette swap, per design-direction §4.5 and the sprite spec in design-direction §5. Until commissioned art lands, the placeholder is a founder-drawn crude sprite, never a stock SF Symbol; the current `face.smiling` glyphs (`ios/Coiny/Views/PetView.swift:85-88`), the permanent Health/Mood `ProgressView` bars (`PetView.swift:155`), the spring bounce (`PetView.swift:118`), and `.thinMaterial` on content (`PetView.swift:174`, `SpendingView.swift:156,194`) are all scheduled deletions under design-direction §3.1.

### 7.6 The reaction contract

The most important table in the document. Principle 1 enforced: every event carries a controllability class, and the class determines everything.

| Class | Definition | Pet reacts? | Push allowed? | In Activity feed? |
|---|---|---|---|---|
| `direct` | The user's own action in the last 7 days that they could have done differently | Yes | Per §9 budget | Yes (cash flows only) |
| `structural` | Slowly-changing state: concentration, runway, utilization | Never animates; renders as a card on the relevant tab | Only pay-before-close (R-7.17) | No |
| `exogenous` | Market moves, price changes, FX, score changes, valuation updates | **Never** | **Never** | **No** |

**R-7.22** [Built] Market and score events do not move the creature: `crypto_price_surge`/`crypto_price_drop` deleted, `net_worth_milestone` and `credit_score_*` return null with the reasoning in comments (`backend/src/reactions/external.ts:11-12,92-108`). The counter-metric proving it stays true is R-2.3.

**R-7.23** [Built] `new_liability` returns neutral with sound and LED off (`backend/src/reactions/external.ts:87-94`). Opening a card or taking a mortgage is a decision, not a moral failure, and a "new" liability is often the bureau reporting an account that already existed. `neutral` sits outside the push allowlist in `dispatch.ts`, so it never interrupts.

**R-7.24** [Unbuilt] Event taxonomy target state (delta from current `rules/definitions.ts` five rules plus `external.ts`):

| Event | Class | Animation | Stage/vitality | Push |
|---|---|---|---|---|
| `paycheck_received`, `contribution_made`, `extra_debt_payment`, `bill_paid_on_time`, `streak_extended`, `connection_added` | direct | happy | rung progress / vitality + | No |
| `debt_cleared`, `ladder_rung_completed`, `goal_achieved` | direct | celebrate (rung adds the transform) | stage +1 on rung | **Yes** |
| `goal_period_passed` | direct | happy | vitality + | Digest only |
| `goal_period_missed`, `streak_broken` | direct | neutral | vitality - / none | **Never** |
| `overspend_vs_plan` | direct | concerned, max once/week | vitality - | **Never** |
| `large_purchase` | direct | **neutral + question**, never concern: "That was a big one. Planned?" with yes (logs, no effect) / not really (offers a goal). Replaces the current concerned/amber rule (`rules/definitions.ts:120-134`) | none | No |
| `bill_overdue` | direct | concerned, once, with a one-tap pay deep link | vitality - | **Yes**, once |
| `subscription_detected` | direct | curious | none | Digest |
| `subscription_cancelled` | direct | celebrate | none | No |
| `utilization_high_pre_close` | structural | none (card + push) | none | **Yes** (the only structural push) |
| `concentration_high`, `runway_low`, `cash_drag_high` | structural | none, Wealth-tab card | none | No / digest |
| `net_worth_milestone`, `credit_score_*`, `crypto_price_*`, `asset_revalued` | exogenous | none | none | **Never** |

Contribution milestones replace net-worth milestones as celebration events: total dollars the user has personally moved into savings, investments, and debt principal. That number only goes up and is entirely theirs.

**R-7.25** [Unbuilt, MINOR] The rules engine returns on first match (`backend/src/rules/engine.ts:11-18`), so a transaction that is both a paycheck and a savings milestone drops one event. Change to collect all matches, apply a priority order, and enforce a per-day event budget so the feed cannot flood.

### 7.7 Portfolio and risk guardrails

The layer only Coiny can ship, and the top-tier retention feature (§25). **Observations with thresholds, never recommendations**: "63% of your investable assets are in one ticker" is a fact about the user's data; "sell some" is advice and is banned (§3.2).

**R-7.26** [Unbuilt, deferred to 6-month block] Thresholds, each an inform/warn boundary with its rationale in prd-app-v2 §3.6's citations: single-position concentration warn at 10% and escalate at 20% of investable assets; employer stock warn at 10% with distinct copy (income and assets correlated); cash drag when liquid cash exceeds 12 months of essentials; illiquidity when liquid is under 15% of net worth; crypto share inform at 20%, warn at 40%; currency exposure inform above 25% in a non-display currency (blocked on multi-currency); custodian concentration inform above 40% at one institution; high-APR debt exceeding liquid cash (feeds rung 3). Surfaced as at most **one card per week** on Wealth. The pet reacts to none of them.

### 7.8 Wealth

**R-7.27** [Unbuilt] Six fixed groups (Liquid, Invested, Crypto, Owned, Speculative, Owed), empty groups never rendered, progressive disclosure by value with sub-1% holdings collapsed into "Other (n)," one 8pt horizontal stacked composition bar, never a donut. Current state: 25 `GroupBox` sections rendered unconditionally (`NetWorthView.swift` 19, `NetWorthView+NewAssets.swift` 6), a vendor directory rather than a net worth screen. Money-color rules bind from design-direction §4.3: absolute values always ink, only deltas colored and always signed, debt never red. "Owned" and "Speculative" stay separate: a Kalshi position lumped with a house misstates risk.

**R-7.28** [Unbuilt] A staleness timestamp renders at the bottom of Wealth always, and every group row carries its per-class state per §8. This is mandatory, not decorative, because the backing data is cached (§16).

## 8. Empty, loading, error, offline and stale states

The highest-value section of this document. Broken connections are the documented number one churn cause in the category (`docs/market-research-2026-08.md` §3.1), a visibly wrong total destroys trust in every other number on the screen, and nothing currently specifies any of it. Three global rules, then the vocabulary, then per-screen behaviour. All strings live in §10.

**R-8.1** [Unbuilt, BLOCKER] Never a silent zero. A failed integration must never contribute 0 to `total` while returning 200. Today 27 bare `catch {}` blocks in `backend/src/api/net-worth.ts` do exactly that, and `zerion/client.ts` additionally converts 404s and schema-parse failures into `total_usd: 0` before the route's catch is reached. When a class has no cache and its fetch fails, its value is null, its status is `error`, and it is excluded from `total` with the exclusion counted in the response.

**R-8.2** [Unbuilt, BLOCKER] Never an unlabelled stale value. Every displayed value carries `asOf`; the aggregate response currently has no freshness field at all. Display tiers (plain, "as of <time>", muted with tap-to-refresh, excluded) follow the per-class age thresholds in `docs/engineering-budgets.md` §2, which is the single home of those numbers. Declared values are always labelled "self-reported <date>" and never excluded.

**R-8.3** [Unbuilt, MAJOR] `connected: true` only after a successful fetch. Today the flags report row existence, set before the fetch runs (`net-worth.ts:199,231` and siblings), so a dead connection reads as healthy.

### 8.1 The status vocabulary

**R-8.4** [Unbuilt] The net-worth response carries, per asset class, `{ value, asOf, status }` with `status ∈ ok | stale | stale_excluded | error | disconnected | reauth_required | expiring | not_connected`. Enforcement is server-side (exclusion from `total` happens in the API, not the UI) so the Android client inherits every rule for free (§14). Verification: fixture-kill tests, one per class: kill the provider fixture, assert `status=error` and the class absent from `total`, response still 200.

| Status | Meaning | UI treatment |
|---|---|---|
| `ok` | Fresh within its class interval | Plain number |
| `stale` | Cached, older than the interval, within the never-show age | Value with age label, tap to refresh |
| `stale_excluded` | Past never-show age | Muted last value, "stale" label, excluded from total, footnote counted |
| `error` | Fetch failed, no usable cache | "Can't reach <provider>" row, retry affordance, excluded, footnote counted |
| `disconnected` | User revoked or removed | "Disconnected" with re-link affordance, excluded immediately (showing revoked data is wrong, not stale) |
| `reauth_required` | Provider says credentials lapsed | Last value with age, held per the §16 window, then excluded; **Reconnect** button (R-8.6) |
| `expiring` | Provider pre-warned (7 days) | Data flows normally plus a renew banner |
| `not_connected` | Never linked | Rendered only inside "Add an account," never as an empty section |

### 8.2 Connection repair

**R-8.5** [Unbuilt, MAJOR] Plaid lifecycle webhooks must be handled, not dropped. Today `PENDING_EXPIRATION` is logged and discarded and `ERROR` / `ITEM_LOGIN_REQUIRED` fall through to a no-op (`backend/src/webhook/plaid.ts:74-84`). Required: an item `status` column, state transitions persisted (`healthy | reauth_required | expiring | revoked | repaired`), `item_state_changed` emitted (§24), and the item's classes reporting the matching status. `USER_PERMISSION_REVOKED` already disables the item (`webhook/plaid.ts:69-73`). `LOGIN_REPAIRED` returns the item to healthy and silences any pending prompt.

**R-8.6** [Unbuilt, MAJOR] Link update mode, backend and iOS. A broken bank item must be repairable in two taps from wherever the user sees the broken state; today the only recourse is "Reset onboarding" (`SettingsView.swift:110`), which destroys the account relationship. Update mode reuses the existing access token and does not re-bill. This is also required by Plaid's launch checklist, so it gates production review (obligations §1).

**R-8.7** [Unbuilt] Proactive repair: when an item enters `reauth_required`, the app surfaces it on next open (banner plus the affected rows) rather than waiting for the user to notice a stale number. Reconnect prompts are in-app; push is not spent on them (§9 budget is too small).

### 8.3 Per-screen matrix

**R-8.8** [Unbuilt] Each cell is a requirement; strings in §10.

| Screen | Empty (new user) | Loading | Error | Offline | Stale |
|---|---|---|---|---|---|
| **Pet** | No connection: creature in **Disconnected** state (present, patient, looking around, never distressed; sprite state 13, the state a new user sees most) with the one action "Connect an account" | Creature idle immediately from cached stage; never a spinner inside the Window | Speech line absent; creature idles. The pet never announces backend errors | Same as error: creature idles from cached state, offline banner at top | Pet state is computed nightly; no staleness label on the creature itself |
| **Plan** | Ladder renders with rung 0 active; goals section shows one line inviting the first goal, not an empty-state illustration | Skeleton rows | Per-rung: an indeterminate rung shows "too early to say" plus what would resolve it ("Connect your 401k and I can check this one") | Last computed ladder renders; banner | Rung progress shows its computation date when older than 48h |
| **Activity** | Day-one: "Transactions arrive within a day of connecting." Nothing else | System refresh control only | Feed shows last synced transactions with "through <date>" header | Same, banner | Header always reads "through <newest transaction date>" |
| **Wealth** | Only declared lines and connected groups; zero empty sections (R-7.27) | Cached values render instantly; refresh is background | Per-class rows per the R-8.4 table; total renders with footnote "n accounts not included" | Entire last snapshot with timestamp and banner | Timestamp always visible (R-7.28) |
| **Onboarding** | n/a | Screen 4 count-up begins only when the number is assembled | Link abandonment or error lands on the hatch flow with the Disconnected creature and a persistent connect affordance; never a dead end | Requires network; a clear "no connection" screen with retry, sign-in state preserved | n/a |
| **Subscription reveal / list** | Zero detected at reveal time: screen auto-skipped, reveal deferred to an Activity card on first later detection within 14 days (R-5.6). The standing Activity-reachable list, before any detection, reads S-35, never a bare "nothing found" | Reveal renders only when data is already in hand; the standing list shows skeleton rows | List renders last known detections with "through <date>"; detection never blocks on a live fetch | Same as error | Detection recomputes on sync; rows carry `lastDate`, no separate staleness label |
| **Settings** | n/a | n/a | Deletion failure keeps the user signed in and says the deletion did not complete (Built: `SettingsView.swift:80-97` signs out only on server-confirmed success) | Actions disabled with reason | n/a |

**R-8.9** [Unbuilt] Offline: the iOS client persists the last successful net-worth response and pet state and renders them read-only under an offline banner. No offline mutation queue; writes fail visibly and immediately. (Currently the client has no cache at all; a network drop is a blank screen.)

**R-8.10** [Unbuilt, MINOR] Unset provider key behaviour on the backend is one convention, not five: a missing operator key yields `status=not_connected` for that class, never 503/402/409/silent-0/silent-null (today all five occur across `src/api/*`).

## 9. Notifications

Push permission is not recoverable once revoked, and finance apps have the highest opt-in of any category to lose. The budget is deliberately tiny and enforced server-side in the dispatcher; the client never decides.

**R-9.1** [Built] Weekly budget and same-type cooldown: `PUSH_MAX_PER_WINDOW` per `PUSH_WINDOW_DAYS` rolling days, with `PUSH_SAME_TYPE_COOLDOWN_HOURS` between same-type pushes (`backend/src/store/notifications.ts:8-13`, enforced at `reactions/dispatch.ts:42-43` behind the `PUSHABLE_ANIMATIONS` allowlist, `dispatch.ts:10`). The onboarding promise (§5 screen 7) must state the same cap; the constants are the source of truth, and a pinning test (`expect(PUSH_MAX_PER_WINDOW).toBe(2)` citing register row DR-1) shall guard them [Unbuilt, the pin test does not exist].

**R-9.2** [Unbuilt, MAJOR before pushes are enabled for testers] Per-day cap of 1: when any push has already been sent in the same rolling 24 hours, the dispatcher shall suppress the next regardless of event type. Today two different event types can push within the same hour.

**R-9.3** [Unbuilt, MAJOR before pushes are enabled for testers] Quiet hours 21:00 to 08:00 user-local, no exceptions. This requires an IANA timezone identifier captured at device registration and stored per device token; `device_tokens` has no such column (`schema.ts:110-116`) and no timezone exists anywhere in `backend/src`. The dispatcher uses the most recently registered device's timezone; when no timezone is stored for any device, it shall **suppress** the push and log `quiet_hours_unknown_tz`, never guess. Verification: dispatcher test with an Asia/Tokyo fixture asserting suppression at 22:00 Tokyo and delivery at 09:00; test asserting the unknown-timezone suppression.

**R-9.4** [Unbuilt] Weekly digest: **opt-in, off by default**, Sunday 18:00 user-local, counts against the R-9.1 budget when on. Content: guardrail outcomes, goal pace changes, subscriptions detected. Requires the scheduler (§16).

**R-9.5** [Built by table, enforced by allowlist] Never push, under any circumstance: any `exogenous` event, a missed goal period, a broken streak, a net worth decrease, a credit score change, a rising debt balance, a single overspend, or any message whose only content is "come back." Always push (budget permitting): rung completion, debt cleared, goal achieved, bill overdue (once), pay-before-close.

**R-9.6** [Unbuilt] Timing for deferrable notifications: schedule at approximately the user's own typical session time (about 23.5 hours after the last session) rather than at event time, so the push lands when the user historically engages. No notification exists solely to summon.

**R-9.7** [Unbuilt, MINOR] Push copy: the current titles contain emoji (`dispatch.ts:12-19`), banned by the no-emoji rule (§10). Replacement strings in §10 S-20 to S-23. Push bodies remain generic by design: the reaction `reason` carries merchant names and amounts and must never reach the lock screen (`dispatch.ts:21-28`, correct today, keep it).

**R-9.8** [Built] APNs dispatch failure: log and drop, never retry (`dispatch.ts:56-59`). A late push about money is worse than no push.

## 10. Copy and voice

Every user-facing line passes three tests: (1) **specific**, a number, a name, or a date, never "you're doing great"; (2) **about the behavior, never the person**, "the dining line went over," not "you overspent"; (3) **no terminal states**, every negative line ships with a one-tap action or it does not ship. Rules with teeth: **no emoji in any user-facing string** (the pet's face is the emoji); **the word "advice" never appears**, and anything touching securities is phrased as an observation about the user's own data; no em dashes; pet speech renders in Departure Mono, app copy in Instrument Sans, so the reader always knows who is talking (design-direction §4.1).

**R-10.1** [Unbuilt] The strings. Pet voice marked (P); app voice unmarked.

| ID | Moment | String |
|---|---|---|
| S-1 | Onboarding, egg (P) | "Something is in here." then "Coiny watches your money and reacts." |
| S-2 | Onboarding, the ask (P) | "It cannot see anything yet. Connect an account and it wakes up." plus "Plaid holds the credentials. We never see them." |
| S-3 | Onboarding, hatch (P) | "Oh. Hello. I can see four accounts and $342,880. Give me a minute." (numbers computed) |
| S-4 | Onboarding, declared subtitle | "This is an estimate. Let's make it real." |
| S-5 | Onboarding, skip link | "Not now" (plain text, always visible, never styled as a button) |
| S-6 | Pre-permission prompt | "I will message you at most twice a week. Never at night. Never about the market." |
| S-7 | Paycheck (P) | "Paycheck landed. $240 of it is already spoken for. Want me to move it now?" |
| S-8 | Overspend (P) | "Groceries went $38 over the plan this week. Nothing to fix today. I moved the line for next week." |
| S-9 | Rung 1 complete (P) | "That is rung one. You have a floor now." |
| S-10 | Subscription detected (P) | "You have paid Netflix $17.99 for 14 months. That is $251. Keeping it?" |
| S-11 | App open | (nothing. the pet is doing something. it notices after about a second.) |
| S-12 | Large purchase (P) | "That was a big one. Planned?" with "Yes" / "Not really" |
| S-13 | Debt payment above minimum (P) | "$180 above the minimum. That moved your debt-free date to March 2028." |
| S-14 | Goal off pace | "The date moved to March 14." or "+$61/month gets you back." Never "you are behind" |
| S-15 | Indeterminate rung | "Too early to say. Connect your 401k and I can check this one." |
| S-16 | Stale class row | "As of Tuesday 14:00" then, past the never-show age, "Stale. Refresh or reconnect." |
| S-17 | Reauth needed | "Chase needs you to sign in again. Two taps." with **Reconnect** |
| S-18 | Provider unreachable | "Can't reach Coinbase right now. Showing Tuesday's number." |
| S-19 | Total with exclusions | "2 accounts not included" (tappable, lists them) |
| S-20 | Push title, celebrate | "Coiny is celebrating" |
| S-21 | Push title, concerned | "Coiny noticed something" |
| S-22 | Push body, generic | "Come see." / "Something needs a look." |
| S-23 | Push, pay-before-close | "One card is above 30% with the statement closing Thursday. $210 brings it under." (no issuer name on the lock screen) |
| S-24 | Bill overdue (P) | "The card bill is past due. Pay now?" with deep link |
| S-25 | Offline banner | "Offline. Showing your last numbers." |
| S-26 | Empty activity | "Transactions arrive within a day of connecting." |
| S-27 | Deletion confirm | "This deletes your account and data from Coiny and tells your banks to cut access. It cannot be undone." |
| S-28 | Deletion failed | "That did not finish. Nothing was deleted. Try again." |
| S-29 | Declared line label | "Self-reported <date>" |
| S-30 | Paywall disclosure | "Coiny Individual, $99/year. Renews yearly until cancelled in Settings > Apple Account > Subscriptions. Includes 12 connections, 3 goals, all guardrails, full debt tooling." (values from §25; keep in sync by reference) |
| S-31 | Kraken key entry | "Create a key in Kraken with Query Funds permission only. Do not enable trading or withdrawal. Coiny reads balances and never places orders." (Built, `NetWorthView+WealthInlines.swift:432`) |
| S-32 | Sleep state | (no copy; the speech line is empty) |
| S-33 | Subscription reveal, header (P) | "This account pays for 7 things on repeat. $1,340 a year. Worth a look before we start?" (numbers computed) |
| S-34 | Deferred reveal, Activity card (P) | "Now that I can see more, this account pays for 4 things on repeat. $61 a month. Want the list?" |
| S-35 | Subscriptions list, nothing detected yet | "Nothing recurring found yet. Detection improves as transactions arrive." |
| S-36 | Flagged subscription row | "Didn't know about this. $17.99 a month, $215 a year. Cancel it wherever you signed up and I will notice when the charge stops." |

## 11. Accessibility

Load-bearing rather than a checklist: the product's core signal is a creature's visual state, so "never rely on colour alone" is an existential requirement, not a compliance one. The design system was built with this in mind and most of the work is holding the line.

**R-11.1** [Unbuilt] Every creature state must be identifiable with color removed. This is already the sprite commission's governing constraint (every state readable at 1-bit, design-direction §5.1); the app-side requirement is that no state's meaning is ever carried by palette alone, and Sleeping versus Unwell must be unmistakable in silhouette. Verification: the greyscale render test on every sprite state before acceptance of each commission phase.

**R-11.2** [Unbuilt] VoiceOver: every meaningful element labelled. The Window's accessibility label states the creature's condition and the active rung in words: "Coiny is resting. Rung 4, Buffer, 62 percent complete." Reaction lines are read after the label. Charts (sparkline, composition bar) expose a summary value, not the geometry. The Stamp in Activity rows is labelled "moved the pet."

**R-11.3** [Unbuilt] Dynamic Type across the full range: the §4.1 type scale in design-direction is scalable by requirement; layouts must survive the largest accessibility sizes (the four-line speech area under the Window reserves space accordingly). Verification: snapshot tests at default and at AX5 for Pet, Plan, Wealth.

**R-11.4** [Partial] Contrast: the palette ships with computed WCAG ratios and every text token clears AA (4.5:1 normal, 3:1 large/graphics) except the constrained `ink-3` case, whose permitted uses are enumerated (design-direction §4.2). Deltas always carry an explicit sign so color is never the only channel (design-direction §4.3 rule 3). [Nothing is implemented; the app has no asset catalog at all.]

**R-11.5** [Unbuilt] Touch targets: 44x44pt minimum everywhere; the row primitive is 44pt tall by spec (design-direction §4.4). Reduce Motion: creature holds a static frame per state with instant frame-swap expression changes (the emotional information must survive), stage change becomes a 300ms crossfade, UI transitions become opacity-only. Reduce Transparency: glass falls back to opaque surface.

**R-11.6** [Unbuilt] Verification gate: a manual VoiceOver pass of all four tabs plus onboarding before the first TestFlight build, repeated when a screen's structure changes. Android's equivalents (48dp targets, TalkBack) bind at Android parity and are listed in §27.

## 12. Localisation and multi-currency

Deliberately one paragraph: launch is US-only, English-only, USD-only, and pretending otherwise would add cost with no user. Requirements that prevent painting into a corner: no user-facing string is constructed by concatenation that would break under translation; dates and numbers render through locale-aware formatters; no hardcoded "$" in new code paths, currency symbols come from a single formatting utility. Multi-currency (native per account, user-selected display currency, live FX) is the 6-month block's flagship (§30) and a prerequisite for the UK beachhead; its data model is owned by `docs/global-integration-map.md` §6 and is out of scope here until that work starts.

---

# PART III: SYSTEM

## 13. Data model

**R-13.1** [Built] `backend/src/db/schema.ts` is authoritative by reference for all table shapes; this document does not duplicate field lists that exist in code. 43 tables at `5406a7b`, including the goal-system set that already exists: `net_worth_daily` (:583), `derived_state` (:601), `ladder_state` (:623), `goals` (:637), `goal_periods` (:667), `pet_progression` (:689), `notification_log` (:556). Migrations: 38 SQL files in `backend/drizzle/`, run at boot; journal `when` values must be monotonic and present-dated or the migrator silently skips (hard constraint, learned the hard way).

**R-13.2** [Unbuilt] Missing tables and columns, the complete list: `declared_assets` (R-5.3), `debt_accounts` (R-7.13), `analytics_events` (§24), an item `status` column for Plaid lifecycle (R-8.5), `timezone` on `device_tokens` (R-9.3), and `last_synced_at` on `truelayer_connections` (the only sync-backed table without one; its `last_balance_gbp` column also stores USD and needs renaming before any UK user sees it).

**R-13.3** [Partial] Deprecation path for the four legacy goal columns on `pet_state` (`weeklyBudgetByCategory`, `savingsGoal`, `paycheckMinAmount`, `largePurchaseThreshold`, `schema.ts:54-60`): served read-only through one release for the existing iOS build (they still power `rules/definitions.ts` until R-7.24 lands), then dropped. `healthScore`/`mood` (:51-52) are replaced by the §7.5 model in the same migration.

**R-13.4** [Partial] Encryption at the field level: all provider tokens and user-supplied keys are AES-256-GCM encrypted at write (verified for Plaid `store/items.ts:21`, Kraken, Kalshi, Alpaca, YNAB, Discogs, TrueLayer, Coinbase rows). Known plaintext exposures, each a requirement: encrypt the Spinwheel credit score integer (`schema.ts:165`) [MINOR, next touch]; decide field-level encryption for transaction merchant/amount rows (`schema.ts:99-108`) [MAJOR: obligations §1 identifies this as the difference between an exfiltrated dump being a non-event and a reportable breach; recommend doing it with the R-7.24 rules rewrite, Appendix B item B8].

## 14. API contract and versioning

**R-14.1** [Partial] One API, two consumers: iOS and the Android scaffold (`android/` exists with a Wealth tab consuming the net-worth shape). Contract rules: changes are **additive only**; no field is removed or re-typed until both clients have shipped a version that no longer reads it; there are no versioned URL prefixes. The Zod schemas in `backend/src` are the response-shape source of truth.

**R-14.2** [Unbuilt] All business rules that affect displayed truth are enforced server-side so both clients inherit them: staleness exclusion from `total`, the `{value, asOf, status}` shape (R-8.4), push budgets (already server-side), and pace math. A client never re-computes an exclusion or a pace band.

**R-14.3** [Unbuilt, MINOR] `GET /api/net-worth` currently performs DB writes and walks a reaction path (`net-worth.ts:564` persists `lastNetWorthUsd`; the milestone reaction is neutered but the write and dispatch path remain). GETs become side-effect free: the milestone baseline write moves into the scheduler tick (§16).

**R-14.4** [Built] Auth on every route except `/health` and `/webhooks/plaid`; three route scopes (`server.ts:96-152`); global rate limit keyed on hashed bearer with IP fallback (`server.ts:79-92`).

## 15. Auth, session and device lifecycle

**R-15.1** [Built] Sign in with Apple on iOS, Google on Android, both verified against provider JWKS with issuer and audience pinned and `sub` cross-checked (`backend/src/api/auth.ts:9-11,29-52`). Apple guideline 4.8 is satisfied on iOS because Sign in with Apple is itself the privacy-preserving option (name-and-email-only, hide-my-email supported); no additional login provider may be added to iOS without re-checking 4.8.

**R-15.2** [Built] Sessions: opaque bearer tokens, only SHA-256 hashes stored, 30-day sliding expiry with a hard 90-day cap (`SESSION_TTL_MS`, `SESSION_ABSOLUTE_MAX_MS`, `backend/src/store/sessions.ts:6-8`); iOS keeps the raw token in the Keychain, never UserDefaults. On a 401 the client signs out to the sign-in screen and clears in-memory state; cached display data (R-8.9) is cleared on explicit sign-out, retained across expiry.

**R-15.3** [Unbuilt, MINOR] Revoke-all-sessions: a user who suspects device compromise can currently kill only the token they hold. Add "sign out everywhere" when next touching auth. Sessions per user are unbounded; cap or prune in the same change. `api/auth.ts` has zero tests; coverage is required before TestFlight (§23).

**R-15.4** [Partial] Device lifecycle: registration upserts token + platform (`device_tokens`); R-9.3 adds the timezone at registration. Tokens are removed on account deletion by cascade. APNs feedback-driven pruning of dead tokens: LATER, trigger is the first push cohort showing sustained delivery failures.

**R-15.5** [Built] Account deletion, in-app, per Apple 5.1.1(v): revokes every Plaid item upstream (failures logged and skipped so Plaid downtime cannot block the right to delete), then cascade-deletes the user across all FK constraints (`backend/src/api/account.ts:23-40`); iOS signs out only after server-confirmed success (`SettingsView.swift:80-97`). **R-15.6** [Unbuilt, MAJOR] Deletion must also best-effort revoke non-Plaid upstream grants (Coinbase, TrueLayer, YNAB, Discogs OAuth), same log-and-continue pattern; today those authorizations survive deletion, which contradicts what S-27 tells the user.

**R-15.7** [Unbuilt, BLOCKER at submission] App Review demo account: review requires a working login, and Sign in with Apple alone cannot provide one. The mechanism must not resurrect an unauthenticated session mint (the D1 lesson: the debug session endpoint is now gated to non-production sandbox builds, `isDebugBuild()`). Mechanism is open decision B9.

## 16. Data freshness, sync and the scheduler

The freshness contract and the scheduler are specified, with numbers and rationale, in `docs/engineering-budgets.md` §2 and §3. Those sections are **binding**. What belongs here is what they change about the build, as requirements:

**R-16.1** [Unbuilt, BLOCKER before pay-as-you-go billing] The read path becomes DB-only. `GET /api/net-worth` currently makes live external calls for 5 of 27 classes on every request, with no timeouts on those clients, and the iOS Wealth tab calls it on every appearance and refresh while fanning out 24 further requests through 27 view-model instantiations (`NetWorthView.swift:5-40,58-89`). Every class gets a cached row `{value, asOf, status}`; live fetches leave the GET entirely.

**R-16.2** [Unbuilt, BLOCKER for the freshness contract] The scheduler: an in-process 15-minute tick per engineering-budgets §3 (no new dependencies), with per-user jitter, concurrency cap, overlap skip, per-item failure isolation, and `/health` gaining `last_tick_at` (503 when older than 45 minutes). It owns: due refreshes per class interval, the nightly `net_worth_daily` snapshot and ladder re-evaluation (R-7.6), the digest (R-9.4), the milestone baseline write (R-14.3), and the Discogs cache-age rule (§17). Nothing else in the codebase may create timers.

**R-16.3** [Built] Webhook-carried balances are the free freshness path: Plaid link tokens now enroll `products: ['transactions']` with `required_if_supported_products` for investments and liabilities (`backend/src/plaid/client.ts:81-82`, fixed in `25c401e`), capping the permanent-subscription billing leak. **R-16.4** [Unbuilt] The balances already parsed out of every transactions sync must be persisted to the per-account cache instead of being dropped at the DB boundary, and pull-to-refresh becomes the only user-drivable billed call, capped 4/day per item, debounced 60s client-side (numbers owned by engineering-budgets §2).

**R-16.5** [Unbuilt, MAJOR] Outbound timeout adoption: `util/fetch.ts` (5s timeout, 2 retries, `fetch.ts:1-14`) exists and is used by the chain clients; the clients on the live read path (Plaid, Coinbase, Zerion, Spinwheel, and the other bare-fetch clients) do not use it, and undici's defaults let one hung vendor pin a request for minutes. Adoption is measured by grep: no bare `fetch(`/undici import outside `util/fetch.ts`.

## 17. Third-party integrations

One row per provider that changes what gets built; the full contractual analysis, with sources, is `docs/obligations.md` §4. Build requirements are extracted here.

| Provider | Constraint that changes the build | Requirement | Status |
|---|---|---|---|
| Plaid | Webhooks + update mode required for production review; privacy policy must disclose Plaid usage; store only what the service requires | R-8.5, R-8.6; privacy policy §22; retention policy §22 | Partial (signature verification and encryption Built; lifecycle Unbuilt) |
| Kraken | Bring-your-own-key; stored keys can carry trade/withdrawal rights | Key-entry sheet instructing **Query Funds only** [Built, `NetWorthView+WealthInlines.swift:402-432`]. **R-17.1** [Unbuilt, MAJOR]: server rejects keys whose permissions exceed query (Kraken exposes key permissions); until then the DB is a honeypot that can move money, not just read it. The "does a read-only integration need Kraken's written consent" question is with the lawyer (obligations §8 Q9) | Partial |
| Coinbase | Shared dev-key mode is confined to non-production; per-user OAuth is the only sanctioned path | **R-17.2** [Unbuilt, MAJOR]: build the OAuth flow (read-only scopes, PKCE) before the Coinbase feature ships to any tester; scopes are hard to change after registration, request the minimal read set once | Unbuilt |
| Spinwheel | Production is sales-gated; terms unverified; credit data puts FCRA in the room | Do not enable credit data in production before reading the developer policy and asking obligations §8 Q8; encrypt the stored score (R-13.4) | Blocked on verification |
| Discogs | Marketplace price data is Restricted Data: no commercial use without written permission; mandatory attribution; nothing older than six hours may be displayed | **R-17.3** [Built]: per register row DR-10, no Discogs-derived value is served. `vinylTotal` is pinned to 0 and excluded from the total (`backend/src/api/net-worth.ts:392-407`); the connection flag is still reported so the UI can explain why no value appears, and `lastCollectionUsd` is still written by sync but never read. Re-enabling requires three things together, not one: the value, both attribution strings, and the six-hour display-staleness rule, which needs the scheduler | Enforced |
| YNAB | 25-token cap in restricted mode; unrestricted review takes 2 to 4 weeks; mandatory non-affiliation footer | **R-17.4** [Unbuilt, MINOR]: add the footer; request unrestricted review before public launch, not at the 26th user | Partial |
| TrueLayer | UK regulated activity; 90-day re-auth; end-user contracts with TrueLayer | Live mode prohibited until obligations §8 Q2 is answered (§3.3); D16 schema fixes (R-13.2) before any UK user sees a balance | Sandbox only, correct |
| Alpaca | Key collection is off the sanctioned OAuth path | OAuth migration, LATER, trigger: paid launch or Alpaca objection | Working, tolerated |
| Kalshi | Developer agreement unverified; stored key can place orders | Read the agreement before paid launch; key-entry copy mirrors S-31's read-only warning | Blocked on verification |
| Zerion, Polymarket, chain RPCs, FX (Frankfurter) | Operator-key or public data; no per-user credential | Cost behaviour owned by engineering-budgets §6 | Built |
| Collectibles price vendors (KicksDB, PCGS, TCGapi, PokemonPriceTracker, GoldAPI, EIA, USDA) | Free-tier quotas; redistribution terms unread | One-hour ToS pass before paid launch, prioritizing vendors whose data renders as a dollar value | Blocked on verification |
| Steam, SnapTrade | Removed 2026-08-12 (`5406a7b`, register DR-8) | None. Do not reintroduce without re-reading their terms | Removed |

## 18. Offline behaviour and caching

Short by design: this is a thin client on a cached API, and §8/§16 carry the substance. Client: R-8.9 (persist and render the last snapshot read-only, offline banner, no mutation queue). Server: the §16 cache is the offline story's other half, since a warm cache means the client's snapshot is at most one interval old. The only additional requirement: **R-18.1** [Unbuilt] cached client data is stored in the app container (not the Keychain, it is display data), excluded from iCloud backup, and wiped on sign-out and deletion.

---

# PART IV: QUALITY

## 19. Performance budgets

`docs/engineering-budgets.md` §1 owns every number (latencies, timeout, 5xx, memory, DB connections, uptime, crash-free threshold) and §5 owns the scaling tiers. Binding here, because they gate testers: the two correctness budgets, **never a silent zero** and **freshness surfaced everywhere**, are R-8.1/R-8.2 (BLOCKER); the timeout adoption is R-16.5 (MAJOR); the iOS fan-out fix is inside R-16.1. The iOS crash-free target and its pause rule are applied in §28. Nothing else in this section: restating the table would create a second home for its numbers.

## 20. Reliability: backup, restore, RPO, RTO

`docs/engineering-budgets.md` §7 owns the numbers (RPO, RTO, rehearsal cadence, key survivability). Requirements folded in: **R-20.1** [Unbuilt, MAJOR before first tester] nightly encrypted `pg_dump` via CI cron, 30-day retention, because Neon Free's PITR window alone cannot cover corruption discovered late; **R-20.2** [Unbuilt] one restore rehearsal before the first tester and quarterly after (restore into a scratch branch, run migrations, assert row counts, decrypt one token with the prod key, check `net_worth_daily` max date); **R-20.3** [Built by config, verify at each rehearsal] `DATA_ENCRYPTION_KEY` exists in exactly two places, Fly secrets and the founder's Keychain; losing it makes every stored token garbage and every user re-links everything.

## 21. Security and threat model

The full threat model with per-asset analysis is `docs/obligations.md` §5; the BOLA/IDOR sweep across all tables came back clean (every `:id` route scopes by `userId`). The rules in `.claude/rules/security.md` bind all new code. What changes the build:

| Asset | Threat | State | Requirement |
|---|---|---|---|
| Provider tokens and keys | DB exfiltration | Encrypted at field level; production refuses to boot without the key (`config.ts:140-146`) | Hold the line: every new sensitive field uses `util/crypto.ts` |
| All encrypted fields | Key-handling edge: `encryptString`/`decryptString` silently pass plaintext through when the key is unset outside production (`util/crypto.ts:9-14,24-32`), so rows written during a key-unset window stay readable and undetectable | Accepted for dev/test today | **R-21.1** [Unbuilt, MINOR]: make the no-op opt-in (`ALLOW_PLAINTEXT_FIELDS=1` for tests) and add a key-version byte to the envelope, next time `crypto.ts` is touched. Rotation tooling: LATER, trigger first suspected exposure or first employee |
| Everything at once | Operator blast radius: one Fly secrets compromise yields all keys | Solo operator, single app | **R-21.2** [Unverified, BLOCKER-adjacent: it is a Safeguards 314.4(c)(5) obligation]: verify MFA is enabled on Fly, Neon, Plaid dashboard, and Apple Developer. Five minutes; do it before the first real bank connection |
| Users' exchange holdings | Stored Kraken/Kalshi/Alpaca keys can move money | Copy warns (S-31); no enforcement | R-17.1 (reject over-scoped Kraken keys) |
| Pet integrity, push noise | Plaid webhook replay inside the 5-minute JWT window re-applies liability penalties and pushes | Transactions idempotent; non-transaction handlers not | **R-21.3** [Unbuilt, MINOR]: claim key on webhook body hash for non-transaction handlers, when touching the webhook |
| Request routing | Path injection: raw user strings interpolated into URL paths in 3 iOS call sites (`API+Hyperliquid.swift:29`, `API+NFT.swift:31`, `API+Debug.swift:67`) while sibling code percent-encodes | Backend Zod-validates most address shapes | **R-21.4** [Unbuilt, MINOR]: percent-encode client-side, verify server-side validation on the three routes |
| Session integrity | Token theft | Hash-only storage, TTLs (R-15.2) | R-15.3 (revoke-all) |
| Financial data at rest | Plaintext transaction rows and credit score | Open | R-13.4 |

Logging hygiene is a standing rule, not a requirement row: no merchant names, amounts, emails, or provider `sub` values in any log line; pseudonymous IDs only. The reaction dispatcher and logger serializers already comply; keep them compliant.

## 22. Privacy: collected, retained, deleted, exported

The regulatory reasoning lives in `docs/obligations.md` §1 and §6; requirements here.

**R-22.1** [Unbuilt, BLOCKER at submission] One combined privacy notice satisfying Reg P's initial notice, Plaid's disclosure requirement, and Apple 5.1.1(i): what is collected (identity, financial account data via named providers, device tokens), all uses, third parties (service providers only, nothing sold or rented, no marketing use), retention, deletion, revocation, and backup persistence. Linked in App Store Connect **and** reachable in-app. No policy text or URL exists anywhere in the repo today. Drafting is lawyer question Q3 (obligations §8); shipping is this requirement.

**R-22.2** [Unbuilt, BLOCKER at submission] Apple privacy nutrition labels declaring Financial Info, Identifiers, Contact Info, including Plaid LinkKit's collection; and an app-target `PrivacyInfo.xcprivacy` with required-reason API declarations (none exists; LinkKit's own manifest does not cover the app target).

**R-22.3** [Unbuilt, MAJOR] Retention: a written schedule and a purge job. Policy sentence: transaction data is retained while the linked item is active plus N days (N is open decision B7); everything is disposed within two years of last use (Safeguards 314.4(c)(6)). The purge job depends on the scheduler (§16), which makes the scheduler a compliance dependency, not just a freshness feature.

**R-22.4** [Built + R-15.6] Deletion: see §15. The privacy notice must state that deleted data persists in encrypted backups for the backup retention window (R-20.1's 30 days).

**R-22.5** [LATER, trigger UK launch] Export: a JSON dump endpoint of the user's own rows, built with the UK work where it becomes a one-month-clock legal right, not before.

**R-22.6** [Unbuilt] Analytics privacy: the §24 pipeline stores no amounts and no merchant names, ever; monetary properties are bucketed enums. First-party only, no third-party analytics vendor, so no data leaves the existing infrastructure and the nutrition label stays simple.

## 23. Testing strategy

Existing assets, the reason this codebase is unusually testable: real-SQL tests via PGlite (never mock the DB), `app.inject()` for HTTP, pure functions with injected clocks throughout the goals code, 84 backend test files (845 passing, 15 skipped at `5406a7b`), 262 iOS unit tests, fixture helpers for Plaid webhooks.

**R-23.1** [Unbuilt] Constant-pinning tests for every number this spec cites from code: push budget trio, session TTLs, ladder constants, timeout values. Each pin cites its register row so a failing pin is a decision question, not a typo fix.

**R-23.2** [Unbuilt] Fixture-kill tests, one per net-worth class (R-8.4): kill the fixture, assert `status=error`, class excluded, 200 response. These are the regression net for the silent-zero fix and they use only existing infrastructure.

**R-23.3** [Partial] Cold-start tests: the derived-state suite covers observed-span scaling; extend to the §7.2 pace rules (null date, past date, near date, young account) when goal CRUD is built.

**R-23.4** [Unbuilt, MAJOR before TestFlight] Cover the untested auth surface: `api/auth.ts`, `store/sessions.ts`, `plugins/*` currently have no tests, meaning nothing guards JWKS verification or session expiry against regression. HTTP-level tests via `app.inject` with fixture JWKS.

**R-23.5** [Unbuilt] iOS: snapshot tests for the §8 state matrix (per-screen empty/error/stale/offline) and Dynamic Type (R-11.3); UITests currently run with `--ui-testing` bypassing auth and onboarding, so no signed-in content is exercised; at least one authenticated smoke path is required before TestFlight.

**R-23.6** [Standing] Adversarial review: after implementing any section of this spec, a fresh session reviews the diff against the requirement IDs it claims, reporting gaps only.

## 24. Instrumentation

Zero instrumentation exists, backend or iOS. Cohorts cannot be backfilled, so this is a **BLOCKER before the first tester**: without it, W4 (§2), the hardware gate (§3.2), the 90-second target (§5), and the push budget audit (§9) are all unmeasurable opinions.

**R-24.1** [Unbuilt] Mechanics, deliberately tiny: an `analytics_events` table (`user_id, event, properties jsonb, client_ts, server_ts`) in the existing Postgres, one `POST /api/telemetry` endpoint accepting a Zod-validated batch in the protected scope, iOS queueing and flushing 25 events at a time or on background. No third-party vendor (no new dependency, no DPA, and 30 testers are plain-SQL volume). Revisit at 1,000 users.

**R-24.2** [Unbuilt] The event set, names binding (full property detail in engineering-budgets §8): `signup_completed`, `onboarding_declared`, `link_opened`, `link_result` (with Plaid exit metadata), `account_connected`, `first_number_shown`, `app_open` (the W4 signal), `rung_started/completed/skipped`, `rung_progress` (deciles only), `reaction_shown` (with `origin`; `origin=market` must be zero), `push_sent`, `push_permission_changed`, `sync_failed/sync_completed`, `scheduler_tick_completed/skipped`, `item_state_changed`, and post-launch `subscription_started/churned`. Property rule: no amounts, no merchant names, bucketed enums only (R-22.6).

**R-24.3** [Unbuilt] `backend/queries/retention.sql`: the saved W4/counter-metric query per R-2.1/R-2.2, run weekly by hand until it earns a dashboard. The definition lives in §2; the query must not restate it differently.

---

# PART V: BUSINESS AND RELEASE

## 25. Monetisation

### 25.1 Tiers

Locked 2026-08-11 (register DR-2); the earlier $59/$149 table is dead and must not be quoted.

| Tier | Price | Gets |
|---|---|---|
| Free | $0 | **2 live connections** (R-25.6), unlimited derived and declared assets, 1 target goal, 2 guardrails, 30 days of net worth history, **subscription detection (R-5.7: the acquisition hook)**, **the pet, all 8 stages, and the full ladder** |
| Individual | **$99/yr** | 12 connections, 3 goals, all guardrails, full debt tooling, 2 years of history |
| Household | **$169/yr** | Up to 5 members, unlimited connections, portfolio guardrails, unlimited history. Deferred per §3.3: each member keeps private accounts and their own creature; a shared creature is fed only by shared goals; nothing is shared until someone shares it, and un-sharing is instant and silent |

**R-25.6** [Unbuilt] The free tier shall permit exactly **2 live authenticated connections**, and unlimited derived and declared assets. Two is the functional minimum for the behavioural engine, not a marketing number: a user who spends on a credit card and pays it from checking exposes only one transaction per month to a checking-only connection, so savings rate (§7.3), the discretionary guardrail, and spend-against-plan would all evaluate against data that does not represent their spending. Verification: with one depository connection and a card connected, `getSpendingSummary` returns a `monthlySpend` within 10 percent of the sum of both accounts' outflows; with the card omitted it does not.

**R-25.7** [Unbuilt] Onboarding shall request exactly **one** connection (R-5.4), never two. The second is offered later by the connection ladder, triggered by evidence rather than on a schedule: card-shaped spending detected with no card linked, or declared debt above zero with no card linked. Copy S-31. Verification: no onboarding screen presents a second Plaid Link invocation; the trigger fires only when its stated condition holds in the user's data.

**R-25.1** [Doctrine] Never paid, ever: connection repair, data accuracy, notification quality, account deletion, data export, the pet, any ladder rung. Gate breadth and depth, never the relationship, and never reliability. Gating is by connections because connections are what cost money (the pricing metric and the cost driver are the same variable).

### 25.2 Purchase mechanics

**R-25.2** [Unbuilt, BLOCKER at paid launch] StoreKit 2 auto-renewable subscriptions, nothing else (Apple 3.1.1: no license keys, no crypto, no external unlock). Side effect worth naming: Apple as merchant of record deletes PCI scope and sales-tax handling entirely. Annual billing is the default presentation. Whether a monthly option exists at all is open decision B10. iOS and Android pricing must be identical when Android ships; the YNAB $109-direct-versus-$179-IAP gap is the documented anti-pattern.

**R-25.3** [Unbuilt] Trial: 14 days, no card required, converting **to Free**, never to a lockout. Paywall timing: day 7, or the first attempt to add the connection past the free limit, whichever comes first; never inside onboarding. Disclosure copy S-30 satisfies 3.1.2(c): period, renewal, price, contents, cancellation path, all before purchase. Subscriptions are at least 7 days and available across the user's devices by StoreKit construction (3.1.2(a)).

**R-25.4** [Unbuilt] Restore purchases is a visible button on the paywall and in Settings. Refunds route through Apple; in-app, "Request a refund" opens Apple's sheet. Billing grace period and retry are enabled in App Store Connect so an expired card degrades to Free only after the grace window. StoreKit server notifications feed `subscription_started/churned` (§24), which is what makes the hardware gate measurable.

**R-25.5** [Doctrine] No cosmetics à la carte (bundled in tiers as retention only), no ads, no data monetisation, no referral revenue (§3.2), and no fee or revenue share of any kind on the subscription surface (R-5.7). ROSCA compliance is by construction through IAP; marketing copy must not undercut the IAP disclosures.

## 26. Compliance obligations by launch stage

Full analysis with sources: `docs/obligations.md`. The build-facing summary, cumulative by stage:

| Stage | Must be true | Source |
|---|---|---|
| **Now, before the first real bank connection** | FTC Safeguards program basics (named qualified individual on paper: the founder; MFA verified per R-21.2; written service-provider list; disposal schedule per R-22.3). Plaid production review passes (privacy policy R-22.1, lifecycle handling R-8.5/R-8.6). Instrumentation live (§24). Under 5,000 consumers the written risk assessment, pen-testing, IRP, and annual report are statutorily waived; alarm at 4,000 | obligations §1 |
| **TestFlight external build** | Nutrition labels + privacy manifest (R-22.2); privacy policy link live; org enrollment verified (R-27.1) | obligations §1 |
| **First paying user** | StoreKit per §25; lawyer-reviewed ToS with accuracy disclaimer (which only holds up if staleness is surfaced, hence R-8.2); YNAB unrestricted review requested; collectibles-vendor ToS pass (§17); Discogs stays manual absent permission (R-17.3) | obligations §2, §4 |
| **Household tier** | Two-party consent flow, severance path, lawyer Q4 answered | obligations §2 |
| **UK launch** | Q2 (RAISP/agent/perimeter) answered; 90-day re-auth flow; UK GDPR basis + transfer mechanism; ICO fee; D16 fixes; export endpoint (R-22.5) | obligations §3 |
| **LATER, with triggers** | 5,000th consumer activates the waived Safeguards elements; CCPA at its thresholds; CFPB 1033 when reconsideration concludes; money-transmitter/adviser analysis re-runs if any feature ever initiates payments or names an instrument | obligations §7 |

## 27. Platform requirements checklist

App Store (each verified against the current guidelines this session; guideline numbers as cited):

- [ ] **5.1.1(ix)**: financial-services apps must come from a **legal entity**. **R-27.1** [Unverified, BLOCKER at submission]: confirm team `UKL98DS9D3` is an Organization enrollment for Athanor Works LLC, not the individual enrollment it began as. Settle in the developer portal; if individual, start the org migration now, it has lead time
- [ ] **5.1.1(v)**: in-app account deletion (Built, R-15.5) with retention/consent explanation (R-22.1)
- [ ] **5.1.1(i)/(ii)**: privacy policy in metadata and in-app; consent before collecting usage data (the §24 pipeline needs a consent line in onboarding or the policy); purpose strings complete
- [ ] **4.8**: satisfied by Sign in with Apple as sole iOS login (R-15.1)
- [ ] **3.1.1 / 3.1.2(a) / 3.1.2(c)**: §25 requirements
- [ ] **2.1**: working demo account for review (R-15.7)
- [ ] **1.6**: security posture per §21
- [ ] Privacy labels + `PrivacyInfo.xcprivacy` (R-22.2)

Google Play, binding when Android reaches parity, worth designing against now because retrofits are expensive: 48dp touch targets; 4.5:1 / 3:1 contrast; 45 to 75 character line length; light and dark themes; startup under 2s or a progress indicator; 60fps/16ms budget; state preserved across backgrounding, rotation, fold, and process death; back button and gesture both supported; no personal or sensitive data in logs (already a standing rule server-side); all traffic over SSL (true today); no non-resettable hardware IDs; runtime permissions at point of use with rationale and graceful denial; biometric auth for financial data screens (this one is a real feature: plan an app-lock with BiometricPrompt at Android parity, and its iOS sibling with Face ID as open decision B11).

## 28. Release: environments, CI gates, rollout

**Environments.** Sandbox: Plaid sandbox, debug endpoints gated by `isDebugBuild()` (non-production + sandbox only). Production: Fly `iad`, boot-guarded on `DATA_ENCRYPTION_KEY` (`config.ts:140-146`), migrations run at boot. The simulator hardcodes `http://127.0.0.1:3000` (`API.swift:17-24`), so simulator testing never exercises the deployed backend; TestFlight builds do.

**CI gates, existing and binding:** 10 SHA-pinned workflows: backend CI (tsc, Biome, tests with 75% coverage gate), iOS CI, Android CI, CodeQL (JS/TS + Swift), Semgrep, Gitleaks, Trivy, SBOM, dependency audit. Backend deploys automatically when a PR touching `backend/**` merges to main (`.github/workflows/backend-deploy.yml`). iOS ships manually via Xcode to TestFlight.

**R-28.1** [Unbuilt] Rollout to the first 30 testers is staged 5, then 15, then 30, gated on: crash-free sessions at or above the engineering-budgets §1 threshold (pause invites below its pause line), zero `reaction_shown origin=market` events, push budget audit clean, and no silent-zero sightings. Testers are recruited to the Maya and Deven archetypes, not from friends (friends will not say the pet is annoying).

**R-28.2** [Standing] Spec-code sync: any PR touching `backend/src/goals/`, `backend/src/reactions/`, `backend/src/store/notifications.ts`, or shipping a requirement from this document updates Appendix C (and Appendix A when a decision was made) in the same diff. This is the mechanism that keeps this document true; it failed four times in 48 hours before it existed.

## 29. Support

`coiny@athanorworks.com` (Unverified: domain and alias not yet confirmed; settle when the privacy policy is drafted, which needs the same address), linked from Settings as "Contact" and stated in the App Store listing. TestFlight feedback is the second channel. Best-effort 48-hour response, no SLA, no in-app chat, no help center until real users generate real repeated questions. That is the whole section, on purpose: at 30 testers, support process is a distraction from fixing the things they report.

## 30. Roadmap and phasing

Sequenced by dependency; status verified against code at `5406a7b`. The bar for the 4-week block: a user can link one account, see a net worth number, get placed on the ladder, and complete rung 1, with every step instrumented.

**Weeks 1 to 4:**

| # | Item | Status |
|---|---|---|
| 1 | Instrumentation pipeline + retention query (§24, R-2.1) | Unbuilt. First, because cohorts cannot be backfilled |
| 2 | Silent-zero + freshness response shape (R-8.1 to R-8.4), timeout adoption (R-16.5) | Unbuilt |
| 3 | Scheduler + DB-only read path + webhook balance persistence (§16) | Unbuilt; store layer exists |
| 4 | Wire the ladder: derived state nightly, `GET /api/pets` v2 with ladder + stage, `net_worth_daily` writer (R-7.6) | Engine Built and tested; wiring Unbuilt |
| 5 | Plaid lifecycle + update mode (R-8.5, R-8.6) | Unbuilt |
| 6 | Onboarding rewrite (§5): chips, sliders, `declared_assets`, the number, subscription reveal (R-5.5 to R-5.7), hatch | Unbuilt; detection itself Built |
| 7 | Plan tab v1: ladder, one goal, two guardrails | Unbuilt |
| 8 | Notification day-cap, quiet hours + timezone capture, emoji-free copy (R-9.2, R-9.3, R-9.7) | Unbuilt |
| 9 | Commission Phase 1 (paid character exploration, design-direction §7.2) started in parallel; it has lead time and nothing else does | Not started |

Already done, do not redo: income categorisation fix, market-reaction deletions, push weekly budget, goal schema + ladder engine + derived substrate, Plaid product-enrollment fix, cold-start window scaling, Steam/SnapTrade removal, Kraken key-entry sheet.

**Months 2 to 3:** debt module end to end (§7.4); three target goals with pace math (§7.2); full guardrails + streaks (§7.3); reaction contract rewrite incl. engine collect-all (R-7.24, R-7.25); Wealth collapse to six groups (§7.8); stages 0 to 5 real art (commission Phases 2 to 3); paywall + StoreKit (§25); compliance floor for TestFlight (§26 rows 1 to 2); TestFlight to 30.

**Months 4 to 6:** portfolio guardrails (§7.7); multi-currency + UK groundwork (§12, §3.3); index-based property/vehicle valuation; widgets and Live Activities; Android to parity; stages 6 to 7 and cosmetics; export.

Hardware: not on this roadmap at all; §3.2's gate is the only sentence about it that matters.

---

# APPENDIX A: Decisions register

Append-only. Superseded rows are marked, never edited. A new decision gets the next DR number, the date, the evidence, and where it is implemented (constant or file); answered open questions from Appendix B move here the day they are answered.

| ID | Date | Decision | Supersedes / evidence | Implemented |
|---|---|---|---|---|
| DR-1 | 2026-08-12 | Push cap: 2 per rolling 7 days; onboarding promise is binding; digest opt-in as a consequence | Supersedes "3/week" and the unstated variant; opt-out cliff evidence in prd-app-v2 §5.6 | `PUSH_MAX_PER_WINDOW`, `store/notifications.ts:9` |
| DR-2 | 2026-08-11 | Pricing: free / $99 individual / $169 household (5 members) | Supersedes $59/$149; market board in market-research §2 | §25; no code yet |
| DR-3 | 2026-08-12 | Hardware gated at 1,000 paying subscribers active at 3 months; until then firmware is untouched | vision §8; ends the argument in advance | §3.2 |
| DR-4 | 2026-08-11 | App-first pivot; device becomes a post-launch accessory | vision §1 to §2; the 71% churn figure failed verification | Whole document |
| DR-5 | 2026-08-11 | The pet reacts only to user-controlled events, never market or score moves | Ostrich-effect and shame research, prd-app-v2 §0; SEC/Robinhood precedent | `reactions/external.ts:11-12,92-108` |
| DR-6 | 2026-08-11 | Art direction: Pocket Instrument; pixel creature in the Window system; 1-bit-safe silhouette rule | design-direction §2.4 | No code yet; design-direction binds |
| DR-7 | 2026-08-12 | W4 definition fixed as in §2 (rung or habit period within 4 weeks AND `app_open` in days 21 to 27; counter-metric for quiet completers) | Supersedes "still active in week 4" and a days-22-28 draft | §2; `retention.sql` pending |
| DR-8 | 2026-08-12 | Steam and SnapTrade removed | Steam: no contractual footing (obligations §4). SnapTrade: free tier is one user, commercial terms bite at TestFlight | Commit `5406a7b` |
| DR-9 | 2026-08-12 | Kraken: bring-your-own-key with its own entry sheet, Query Funds permission only | obligations §5 honeypot analysis | `NetWorthView+WealthInlines.swift:402-432`; server-side enforcement pending (R-17.1) |
| DR-10 | 2026-08-12 | Discogs commercial permission pending: until granted, vinyl is a manual asset and no Discogs price data is displayed | Discogs Restricted Data terms, obligations §4 | **Enforced** 2026-08-12 (R-17.3) |
| DR-11 | 2026-08-11 | Maximum three active target goals, hard cap | Concentration research, prd-app-v2 §3.1/§8 Q3 | §7.2; no code yet |
| DR-12 | 2026-08-11 | Debt strategy default is Blend, cost of choice always shown in dollars | Gal/McShane, Brown/Lahey, Kettle; prd-app-v2 §4.2 | §7.14; no code yet |
| DR-13 | 2026-08-11 | Phone-primary, device-secondary (Design Decision C) | prd-app-v2 §7 | n/a |
| DR-14 | 2026-08-11 | Never monetize via referrals, lending, advances, or data | Cleo FTC settlement; three dead free-aggregator comparables | §3.2 doctrine |
| DR-15 | 2026-08-12 | Rungs never un-complete and can never be failed; stage derived, never stored | prd-app-v2 §3.3/§5.2 | `ladder.ts:9-16,271-274,309-315` |
| DR-16 | 2026-08-12 | Plaid link enrollment: transactions only, investments/liabilities as required-if-supported | Billing-model verification in engineering-budgets §2 | `plaid/client.ts:81-82` (`25c401e`) |
| DR-17 | 2026-08-12 | Null-means-unknown across the derived substrate; monthly rates scale by observed span | derived.ts design comments; the 6x cold-start defect | `derived.ts:7-10,146-160` (`25c401e`) |
| DR-18 | 2026-08-12 | This document (`docs/prd.md`) becomes the single product source of truth; prd-app-v2.md and product-brief.md are retired as normative documents. Their research-citation chains remain valid and are referenced from here rather than duplicated | spec-methodology §1 to §2 | Root `CLAUDE.md` update pending (out of this session's write scope) |
| DR-20 | 2026-08-12 | Free tier is **2 live connections** plus unlimited derived and declared assets. Onboarding asks for **one**; the second arrives from the connection ladder on evidence, not schedule | Founder decision. Chosen on function, not cost: a checking-only connection sees one payment a month for anyone who spends on a card, so the behavioural engine would evaluate against data that is not their spending. Two is explainable ("the account you spend from, the card you spend on"); an arbitrary number is not. Supersedes the recommendation of 3 in B5 | Unbuilt (R-25.6, R-25.7) |
| DR-23 | 2026-08-12 | Rung 6's target is **lowered and made adjustable**: default 20% of take-home, user-settable within a floor, matching the rung 5 and rung 7 pattern | Founder decision. 25% of take-home is roughly 30 to 33% of gross, which is HARDER than the published 25%-of-gross standard users will benchmark against, and rung 6 is the one rung whose fixed number can be structurally unreachable for a real user on low income with high fixed costs, where the only current escape reads as quitting. Parameter-level autonomy inside fixed structure is where heterogeneity is real | Unbuilt. `SURPLUS_SAVINGS_RATE` (`ladder.ts:228`) and the hard-coded `0.15` at `ladder.ts:191` both need to become adjustable |
| DR-24 | 2026-08-12 | **Both billing periods at launch**, annual presented first | Founder decision, overriding the annual-only recommendation. Every direct competitor offers monthly (Monarch, Copilot, YNAB all around \$13 to \$15), a monthly anchor is what makes \$99/yr read as cheap, and no published data isolates the conversion cost of annual-only. Note the PRD's original rationale was void anyway: the App Store Small Business Program pays 85% from the first transaction under \$1M, so Apple's cut does not drop at year two at this scale | Unbuilt (§25) |
| DR-25 | 2026-08-12 | **The ladder stays preset.** No user reordering, no user-created rungs, no rung deletion. Autonomy is at parameter level (adjustable rates on rungs 5, 6, 7), via skip-with-reason, via structural not-applicable, and via Layer 2 target goals | Brown & Lahey (NBER w20125): the task ordering that best predicts completion is the ordering people choose LEAST often when given the choice, so a reorderable ladder is predictably worse, not neutrally different. Locke & Latham settled the autonomy dispute jointly: self-set goals are as effective but not more effective than assigned goals, and assigned goals only lose commitment when assigned tersely without a rationale. Duolingo moved FROM a choose-your-own tree TO a fixed path. No successful financial product lets users arrange a milestone ladder | Structure Built (`ladder.ts:115-226`); adjustable parameters Unbuilt |
| DR-26 | 2026-08-12 | **Every rung surfaces its rationale and the source of its number**, inline on the journey, not buried in a tooltip | The single most evidence-backed engagement lever available: assigned goals only cost commitment when assigned tersely (Latham, Erez & Locke 1988). Rung 7 already does this with its withdrawal-rate citation; extend to all eight | Unbuilt |
| DR-27 | 2026-08-12 | **The creature and the journey are one surface at two resolutions, not two tabs.** The creature is the home state; tapping it opens the journey beneath. Its form is the rung reached, its posture is the week's guardrails, sleeping means nothing needs doing, transforming means a rung cleared, the shelf behind it is what has been completed | Founder decision. Separate Pet and Plan tabs force the user to ask which one is the product. The creature is not decoration on the journey nor a report about it: it is the journey's outward form, readable at a glance without opening anything. The hard rule: the creature never displays a number and the journey never tries to be cute, enforced by the Window pattern in `design-direction.md` | Unbuilt. Supersedes the four-tab IA in §4 and the Plan tab spec in §7 |
| DR-28 | 2026-08-12 | **Sub-checkpoints within a rung.** The creature changes form eight times ever, so the journey shows quarter-marks inside the active rung, and rung 7 (Ascendant) gets internal states at 10/25/50/75% of the FI number. Artifacts are earned from sustained guardrail streaks as well as from rungs | Founder observation: eight rungs over a lifetime is too infrequent to sustain a creature. A well-off user auto-completes rungs 0 to 5 on day one and could then see nothing change for years. Rare stage changes are correct and become a feature only when something else moves weekly | Unbuilt |
| DR-29 | 2026-08-12 | **Solo founder.** No cofounder. The equity-split, vesting and role-division sections of `business-plan.md` are void | Founder statement | Doc cleanup pending |
| DR-30 | 2026-08-12 | **Home market: US first, UK second** | Founder decision, consistent with market-research §6.2. UK stays second on the strength of mature open banking, proven willingness to pay, and the Pensions Dashboards mandate, but it carries the unresolved FCA registration question (obligations §8 Q2) | Planning |
| DR-31 | 2026-08-12 | **Product name unsettled; a placeholder is in use.** "Coiny" reads slightly crypto and is a crowded App Store term. Shortlist: **Cairn** (a trail marker built by travellers each adding a stone: accumulation, journey and waymarker in one word) and **Pip**. Must clear a USPTO and App Store search before it reaches App Store Connect, the bundle ID or a domain | Founder decision deferred | Blocks §27 store listing; cheapest to settle before TestFlight |
| DR-22 | 2026-08-12 | **Vesting is not modelled.** Employer retirement contributions count at face value in net worth. Rung 2 is unaffected: capturing a match means contributing enough to receive it, which the user controls, and vesting governs only when it becomes theirs | No integration exposes it. "Vesting" returns zero hits across Plaid's full documentation; the concept is plan-document data held by the recordkeeper, not account data an aggregator reads. Magnitude is small and self-correcting: the user's own contributions vest immediately by law, so only the employer match is at stake, roughly 4.6% of pay per year (Vanguard How America Saves 2025), and only during the first years at an employer. That is inside the tolerance of a net worth built from indexed property, depreciated vehicles and market-priced collectibles throughout. The governing principle is "never show a SILENTLY wrong number", not "never show an imprecise one", and the confidence system already covers imprecision | Decided, no code change. Revisit only if an integration ever exposes the vested split; ask Akoya during application |
| DR-21 | 2026-08-12 | The manual-versus-integration conflict is resolved by the **derived** tier, not by choosing a side. The two user complaints, "I hate manual entry" and "I do not trust integrations", are both objections to ONGOING WORK: stale values to re-enter, and connections that break. Derived assets (purchase price plus index, VIN plus mileage, pasted wallet address) require no credential and no maintenance, so neither complaint applies. The design is therefore one credential, everything else derived, and that one connection made highly reliable | Market research §1.3 (privacy-first counter-demand) and §3.1 (connection breakage as the number one churn cause) read together rather than separately | Derived valuation Unbuilt; connection resilience Unbuilt (§8) |
| DR-19 | 2026-08-12 | Subscription detection becomes a first-session payoff: reveal after the onboarding connection, before the hatch; surfacing and totalling only, never cancellation-as-a-service; no fee, referral, or affiliate revenue on this surface, ever; free-tier | Founder decision; Rocket Money wedge analysis and its fee-driven trust gap | Detection Built (`subscriptions/detect.ts`, `plaid_recurring_streams`); placement Unbuilt (R-5.5 to R-5.7) |

# APPENDIX B: Open decisions needing the founder

Each with a recommendation. An answered item becomes a DR row and is deleted from here.

**B1. Rungs 5 and 6 income basis: gross or take-home?** The published frameworks say gross; the code measures take-home because that is what bank data contains (`derived.ts:174-189` vs the "25% gross" framing). *Recommend: ratify take-home. It is measurable, honest, and slightly stricter in effect; display copy says "of what you take home." One register row ends a divergence that was resolved silently.*

> **Settled 2026-08-12: take-home basis ratified, and rung 6's target LOWERED to a 20% default, adjustable. See DR-23.**

**Vesting note (DR-22):** rung 2 is about capture, not ownership. A user controls whether they contribute enough to receive the match; vesting controls when the match becomes theirs. Vesting is deliberately not modelled, and no aggregator exposes it. Do not "fix" this by adding a vesting gate.

**B2. Rung 2: does declaration alone complete a stage-gating rung?** Code says yes: `employerMatch: 'captured'` satisfies it with no verification (`ladder.ts:148-153`), and no producer of contribution-stream verification exists. *Recommend: ratify, with a soft verify: when an investment connection later shows no contribution stream, the rung stays completed (DR-15) but the Plan tab shows a quiet "want me to check this?" prompt. The alternative, blocking a rung on a connection most users will not have, kills early momentum.*

> **Settled 2026-08-12: ratified, declaration completes the rung, with the soft-verify prompt. See also DR-22 on vesting.**

**B3. Cold-start minimum window: 30 days (code, `MIN_DAYS_FOR_MONTHLY_RATE`) or 60 (the methodology's worked example)?** *Recommend: ratify 30. The code's basis (rent landing inside the window) is the real risk and 30 days guarantees one rent cycle; 60 doubles the wait for rung targets with no added correctness argument. Pin with a test either way.*

> **Settled 2026-08-12: split. 30 days to DISPLAY a rate, 60 observed days (or history predating the window) before an essentialMonthly-derived target may COMPLETE a rung. Plus `days_requested` raised to 730 at link time, which makes the floor moot for most users.**

**B4. The third pet variable: name, driver, formula.** Two specs shipped under two names ("Energy": app opens; "Rest": whether anything needs doing) and Vitality has no weights. *Recommend: one variable named **Rest**, driver "whether anything needs doing," because rewarding app opens contradicts R-6.1 and §2's counter-metric. Vitality = weighted pass rate of the last 4 weekly guardrail periods, weights 4:3:2:1, floor 40. Decay numbers as in R-7.19.*

> **Settled 2026-08-12: Rest, driven by whether anything needs doing. Never app opens.**

**B5. Free tier live connections.** ~~Open.~~ **Settled 2026-08-12 by the founder: 2.** See R-25.6 and register row DR-20. The deciding argument was not cost but function: most people spend on a credit card and pay it from checking, so a single checking connection sees one payment a month rather than their actual spending, and the behavioural engine would run on almost no data. Two is the functional minimum, "the account you spend from and the card you spend on", which is explainable to a user in a way an arbitrary number is not. The word-of-mouth concern that argued for 3 is answered by the derived layer instead: unlimited derived and declared assets fill the screen at zero marginal cost and require no credential.

**B6. Zero-connection mode as a supported product state?** The loudest organic demand in the category is privacy-first, no linking. *Recommend: yes as a quiet capability, not a marketed mode: declared-only users keep the number, the Wealth tab, and manual goals; rung 0 still requires a connection, so the ladder holds its meaning. Revisit as marketing after launch.*

> **Settled 2026-08-12: yes, supported and unmarketed. Zero-connection users are the cheapest users, not carried cost, and the free tier already permits the state.**

**B7. Transaction retention N (days past item unlink).** *Recommend: 90. Long enough to survive an accidental unlink-relink without data loss, short enough to be defensible under "only as required."*

> **Settled 2026-08-12: 90 days. The Safeguards two-year figure is a disposal CEILING with a minimisation duty pointing the other way, so this is product judgment, not compliance.**

**B8. Field-encrypt transaction merchant/amount columns?** Turns a stolen DB dump from a reportable breach into a non-event, at the cost of losing SQL-side aggregation (sums move to app code) and migration work. *Recommend: yes, scheduled with the R-7.24 rules rewrite which already touches every consumer of those columns. If declined, record the accepted risk in this register.*

> **Settled 2026-08-12: yes for merchantName and amount; leave date and category plaintext. Cheaper than assumed (merchantName is in no SQL predicate) and the payoff is FTC-side at 500+ consumers, not state-law side. Blocked on fixing the crypto.ts plaintext passthrough first.**

**B9. App Review demo account mechanism.** *Recommend: a single reviewer account with a fixed Apple-independent credential pair accepted only by a server-side flag in production, mapped to a seeded sandbox-data user; never a client-side bypass, never the debug session mint.*

> **Settled 2026-08-12: yes, PLUS a password-authenticated login path gated to server-flagged reviewer accounts, because App Store Connect cannot accept a Sign in with Apple credential. Disclose the mechanism in Notes for Review or guideline 2.3.1 treats it as a hidden feature.**

**B10. Monthly billing option at launch?** §25 lists annual only. *Recommend: annual-only at launch. It matches the cost structure (Apple's cut drops in year two), avoids twelve churn moments, and simplifies the paywall; add monthly only if trial-to-paid conversion disappoints.*

> **Settled 2026-08-12: BOTH billing periods, annual presented first. See DR-24; the original annual-only rationale was void under the Small Business Program.**

**B11. Biometric app-lock (Face ID) on iOS at launch?** Play requires biometric support for financial data at Android parity; iOS has no such rule. *Recommend: ship it at TestFlight anyway, it is under a day with `LocalAuthentication`, testers will ask, and it front-runs the Android requirement.*

> **Settled 2026-08-12: ship at TestFlight, opt-in, default off, `.deviceOwnerAuthentication` policy, PAIRED with a backgrounding privacy screen. Google Play's criterion is 'should', not a publishing gate; this is cheap insurance, not compliance.**

**B12. Product name and entity plumbing.** Carried from vision §9: LLC vs C-Corp trajectory, whether "Coiny" survives to the App Store listing (bundle ID and domain hang on it), home market confirmation (US first, UK second per market-research §6.2), and the unresolved cofounder question. *No engineering recommendation; these are founder-only. The name decision is cheapest before TestFlight.*

# APPENDIX C: Requirement status index

Verified by reading source at `5406a7b` on 2026-08-12. Built = behaves as specified; Partial = some of it; Unbuilt = none of it. This table is the state delta: update it in the implementing PR (R-28.2).

| Req | Section | Status | Evidence (file:line) |
|---|---|---|---|
| R-2.1 to R-2.3 | North star | Unbuilt | No analytics symbols anywhere in `backend/src` or `ios/Coiny` |
| R-4.1 | Four tabs | Partial | Three tabs, `RootView.swift:7-23`; no PlanView.swift |
| R-4.2, R-4.3 | Add-account screen, Window | Unbuilt | 25 GroupBox sections with inline connects; no asset catalog, no sprites (`PetView.swift:85-88`) |
| R-5.1 | 90s TTFV | Unbuilt | No timing events exist |
| R-5.2 | Onboarding rewrite | Unbuilt | `EnterNamePage` live (`OnboardingView.swift:21,88`); purple styling (`:62,:104,:290`) |
| R-5.3, R-5.4 | declared_assets | Unbuilt | No such table in `schema.ts` |
| R-5.5 | Subscription reveal in onboarding | Unbuilt | Detection Built and serving: `subscriptions/detect.ts:21-24,39-79`, `api/subscriptions.ts:6-9`; Plaid streams seeded at link (`api/plaid-link.ts:36-47`) and served (`api/plaid-recurring.ts:5-8`). No onboarding placement, no cross-source dedupe, no annual total anywhere |
| R-5.6 | Empty-state skip + deferred reveal | Unbuilt | Standing list shows a bare "No subscriptions detected" (`SubscriptionsView.swift:14-16`); no defer mechanism |
| R-5.7 | Keep/flag actions, no-fee doctrine | Partial | List view exists reachable from Activity only (`SpendingView.swift:18`); no row actions, no guardrail feed; the no-fee constraint is doctrine, nothing to build |
| R-6.1 | Sleep as success | Unbuilt | No sleep state; mood decay renders via legacy bars |
| R-7.1 | Ladder engine | Built, unwired | `ladder.ts:115-226`; zero production callers, `api/pets.ts:5-7` returns legacy state |
| R-7.2 | Never un-complete / never fail | Built | `ladder.ts:9-16,253-282,299-315` |
| R-7.3 | Cold-start null rules | Built | `derived.ts:7-10,17,21,146-160` (fixed `25c401e`) |
| R-7.4, R-7.5, R-7.6 | Skip UI, deciles, nightly wiring | Unbuilt | Store functions exist unused (`store/goals.ts`) |
| R-7.7 to R-7.10 | Target goals | Unbuilt | Tables exist (`schema.ts:637,667`); no CRUD, no API, no UI |
| R-7.11, R-7.12 | Guardrails, streaks | Unbuilt | `goal_periods` table only |
| R-7.13 to R-7.18 | Debt module | Unbuilt | Caches exist (`plaid_liability_cache`, Spinwheel tables); no dedupe, no plan math. Note: legacy `liquidCashMonths` still divides by a fixed 3 (`net-worth.ts:575`), superseded by the substrate when wired |
| R-7.19 | Three-variable state | Partial | Stage derivation Built (`ladder.ts:309-315`); Vitality/Rest Unbuilt; legacy `healthScore`/`mood` live (`schema.ts:51-52`, `health/decay.ts:9-11`) |
| R-7.20, R-7.21 | Sleep rendering, sprites | Unbuilt | SF Symbols, bars, spring, thinMaterial all present (`PetView.swift:85-174`) |
| R-7.22 | No market reactions | Built | `external.ts:11-12,92-108` |
| R-7.23 | Soften new_liability | **Built** | neutral, sound and LED off (`external.ts:87-94`); test in `external.test.ts` |
| R-7.24 | Event taxonomy | Unbuilt | Five legacy rules incl. punitive `large_purchase` (`rules/definitions.ts:120-134`) |
| R-7.25 | Engine collect-all | Unbuilt | First-match return (`rules/engine.ts:11-18`) |
| R-7.26 | Portfolio guardrails | Unbuilt | Deferred by design (§30) |
| R-7.27, R-7.28 | Wealth rebuild | Unbuilt | 19+6 GroupBoxes; no staleness timestamp |
| R-8.1 | No silent zero | Unbuilt, BLOCKER | 27 bare `catch {` in `net-worth.ts`; Zerion zeros parse failures |
| R-8.2 | Freshness everywhere | Unbuilt, BLOCKER | No `asOf` in aggregate (`net-worth.ts:583-600`) |
| R-8.3 | connected-only-on-success | Unbuilt | Flags set before fetch (`net-worth.ts:199,231`) |
| R-8.4 | Status vocabulary | Unbuilt | Response is bare scalars |
| R-8.5 | Lifecycle webhooks | Unbuilt, MAJOR | `webhook/plaid.ts:74-84` discards/no-ops |
| R-8.6, R-8.7 | Update mode, proactive repair | Unbuilt, MAJOR | Only "Reset onboarding" (`SettingsView.swift:110`) |
| R-8.8, R-8.9, R-8.10 | State matrix, offline cache, unset-key convention | Unbuilt | iOS `API` client has no cache; five conventions across `src/api/*` |
| R-9.1 | Weekly budget + cooldown | Built (pin test Unbuilt) | `store/notifications.ts:8-13`, `dispatch.ts:10,42-43` |
| R-9.2 | Day cap | Unbuilt, MAJOR | `canSendPush` checks week + same-type only (`notifications.ts:21-41`) |
| R-9.3 | Quiet hours + timezone | Unbuilt, MAJOR | No tz column (`schema.ts:110-116`); no quiet-hours check in dispatcher |
| R-9.4 | Digest | Unbuilt | No scheduler |
| R-9.5 | Never/always lists | Built via allowlist | `PUSHABLE_ANIMATIONS` (`dispatch.ts:10`) plus taxonomy pending R-7.24 |
| R-9.6 | Session-time scheduling | Unbuilt | Pushes dispatch at event time |
| R-9.7 | Emoji-free push copy | Unbuilt, MINOR | `PUSH_TITLES` emoji (`dispatch.ts:12-19`) |
| R-9.8 | No push retry | Built | `dispatch.ts:51-59` |
| R-10.1 | Strings | Unbuilt | S-31 Built (`NetWorthView+WealthInlines.swift:432`); rest not in code |
| R-11.1 to R-11.6 | Accessibility | Unbuilt | No labels audit, no snapshot tests, no asset catalog |
| R-13.1 | Goal schema | Built | `schema.ts:556-689`; 38 migrations |
| R-13.2 | Missing tables/columns | Unbuilt | Grep-verified absences |
| R-13.3 | Legacy column deprecation | Partial | Columns live and load-bearing (`schema.ts:54-60`) |
| R-13.4 | Field encryption gaps | Partial | Tokens encrypted (`store/items.ts:21` et al.); score and transactions plaintext (`schema.ts:165,99-108`) |
| R-14.1, R-14.2 | Additive contract, server-enforced rules | Partial | Zod shapes exist; status/exclusion logic Unbuilt |
| R-14.3 | Side-effect-free GET | Unbuilt, MINOR | Write at `net-worth.ts:564` |
| R-14.4 | Route scopes, rate limit | Built | `server.ts:79-152` |
| R-15.1 | JWKS auth | Built | `api/auth.ts:9-11,29-52` |
| R-15.2 | Session TTLs | Built | `store/sessions.ts:6-8` |
| R-15.3 | Revoke-all | Unbuilt, MINOR | Single-token revoke only |
| R-15.4 | Timezone at registration | Unbuilt | With R-9.3 |
| R-15.5 | Deletion | Built | `api/account.ts:23-40`, `SettingsView.swift:80-97` |
| R-15.6 | Non-Plaid revocation | Unbuilt, MAJOR | Only Plaid revoked upstream |
| R-15.7 | Review account | Unbuilt, BLOCKER at submission | Debug mint correctly gated (`isDebugBuild`) but unusable for review |
| R-16.1 | DB-only read path | Unbuilt, BLOCKER at billing | 5 live classes; 27 iOS view models fan out (`NetWorthView.swift:5-40,58-89`) |
| R-16.2 | Scheduler | Unbuilt, BLOCKER | Zero timers in `backend/src`; `net_worth_daily` has no writer |
| R-16.3 | Minimal Plaid enrollment | Built | `plaid/client.ts:81-82` |
| R-16.4 | Balance persistence + refresh cap | Unbuilt | Webhook balances dropped at DB boundary |
| R-16.5 | Timeout adoption | Unbuilt, MAJOR | Wrapper exists (`util/fetch.ts:1-14`); read-path clients bypass it |
| R-17.1 | Kraken permission check | Unbuilt, MAJOR | Copy only |
| R-17.2 | Coinbase OAuth | Unbuilt, MAJOR | dev_key confined to non-prod (`config.ts` guard) |
| R-17.3 | Discogs suppression | **Built** | `vinylTotal` pinned to 0 (`net-worth.ts:392-407`); test in `discogs.test.ts` |
| R-17.4 | YNAB footer | Unbuilt, MINOR | No footer string in repo |
| R-18.1 | Client cache hygiene | Unbuilt | No client cache exists |
| R-20.1 to R-20.3 | Backups, rehearsal, key | Unbuilt / config-only | No dump workflow in `.github/workflows` |
| R-21.1 | Crypto opt-in no-op | Unbuilt, MINOR | Silent pass-through (`util/crypto.ts:9-14,24-32`) |
| R-21.2 | MFA verification | Unverified | Dashboard check, not code |
| R-21.3 | Webhook replay claim | Unbuilt, MINOR | Transactions idempotent only |
| R-21.4 | Path encoding | Unbuilt, MINOR | `API+Hyperliquid.swift:29`, `API+NFT.swift:31`, `API+Debug.swift:67` |
| R-22.1, R-22.2 | Privacy policy, labels, manifest | Unbuilt, BLOCKER at submission | No policy text, no `.xcprivacy` outside spm-cache |
| R-22.3 | Retention + purge | Unbuilt, MAJOR | No purge code anywhere |
| R-22.5 | Export | LATER | Trigger: UK |
| R-22.6 | Analytics privacy | Unbuilt | With §24 |
| R-23.1 to R-23.5 | Test additions | Unbuilt / Partial | No constant pins (grep-verified); derived-state suite Built; `api/auth.ts` untested |
| R-24.1 to R-24.3 | Instrumentation | Unbuilt, BLOCKER before first tester | Nothing exists |
| R-25.2 to R-25.4 | StoreKit | Unbuilt, BLOCKER at paid launch | No StoreKit symbol in `ios/Coiny` |
| R-27.1 | Org enrollment | Unverified, BLOCKER at submission | Portal check |
| R-28.1 | Staged rollout | Unbuilt | Depends on §24 |
| R-29 | Support address | Unverified | Domain/alias unconfirmed |

**Also known and out of requirement scope here:** `backend/CLAUDE.md` still claims Sydney deployment, 56 tests, and a `migrations/` directory, all false (region is `iad`, 84 test files, migrations in `backend/drizzle/`); every backend session ingests those three false facts until it is corrected. Flagged for the next docs pass; this session's write scope is this file only.

*Unverified, collected (what would settle each): Apple team enrollment type (developer portal, Membership details); MFA on Fly/Neon/Plaid/Apple (each dashboard); Spinwheel and Kalshi legal terms and the Coinbase CDP ToS (read in a browser); Plaid per-product prices and the Trial plan item limit (Plaid dashboard/first invoice); collectibles vendors' redistribution terms (one-hour reading pass); the support domain; whether the deployed Fly build matches `5406a7b` (it deploys on merge, and this branch is unmerged, so production predates every fix on it); Android client behavior against the new response shape (code exists, not exercised this session).*
