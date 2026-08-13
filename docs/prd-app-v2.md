# Coiny PRD v2: App-First

**Status:** Proposed. Written 2026-08-11.
**Author:** Product (acting PM), for Antoine Wiley / Athanor Works.
**Supersedes:** the hardware-first framing in `docs/business-plan.md` §0 and the `<TBD>` placeholders in `docs/product-brief.md` §1 through §9.
**Does not supersede:** `docs/product-brief.md` Design Decisions A and B, which remain locked and are reinforced below.

This document is decision-forcing. Where it disagrees with an existing doc, it says so and says why. Section 8 is the list of things only the founder can decide.

---

## 0. The argument in one page

Coiny today is an extraordinary data asset attached to an almost non-existent product. The backend aggregates roughly 30 asset classes across 35 API modules with ~830 passing tests. The entire goal system is four integer columns on `pet_state`: `weeklyBudgetByCategory`, `savingsGoal`, `paycheckMinAmount`, `largePurchaseThreshold`. The entire reaction system is five rules in `backend/src/rules/definitions.ts` plus twelve external events in `backend/src/reactions/external.ts`, and `evaluate()` returns on the first match, so a paycheck that is also a savings milestone produces one event and silently drops the other.

That asymmetry is the product problem. Nobody churns because you do not track their Pokemon cards. They churn because the app has nothing to tell them to do.

Three things follow, and they structure this entire document.

**1. The goal system is the product, not a settings screen.** Everything else (net worth breadth, the pet, the eventual hardware) is packaging around "here is the next thing to do, here is whether you did it." The goal system proposed in §3 is layered: a sequenced foundation ladder that gates pet evolution, user-defined target goals with run-rate math, recurring habit guardrails, and portfolio guardrails that only we can offer because only we see everything.

**2. The pet must react to what the user controls.** This is the single most important design constraint in the document and it is currently violated. `evaluateExternalEvent` fires `crypto_price_surge` as `celebrate/fanfare/rainbow` and `crypto_price_drop` as `concerned/warning/amber`. That is a slot machine, and it is the exact mechanic the SEC sanctioned Robinhood $7.5M over, where gamified UI treatments raised trading volume ~5.17% and frequency 12.5% among novice investors ([Berkeley Technology Law Journal](https://btlj.org/2025/11/the-gamification-of-investments-a-comparative-approach-between-the-us-and-eu/)). Worse, a sad pet on a red day trains avoidance. Karlsson, Loewenstein and Seppi documented the ostrich effect precisely here: investors check portfolios in rising markets and stop checking in falling ones ([Journal of Risk and Uncertainty, 2009](https://link.springer.com/article/10.1007/s11166-009-9060-6)). Gladstone et al. then showed across six studies and n=9,110 that *shame* specifically, not guilt, causes financial withdrawal, which causes worse decisions, which causes more shame ([OBHDP 167:42-56, 2021](https://www.sciencedirect.com/science/article/abs/pii/S0749597821000662)). A pet that looks miserable because Bitcoin fell 8% is a shame machine pointed at something the user cannot fix.

**3. App-first is correct, and the business plan's central claim is the thing to abandon.** `docs/business-plan.md` says "71% of budgeting app users abandon them within 90 days because opening the app requires willpower" and concludes the device solves it. Two problems. First, that 71% figure could not be traced to any finance-specific primary source; it appears to be the inverse of a generic cross-category 90-day retention number, re-applied to finance apps by secondary blogs. The best finance-specific figures available point the other way: Alchemer's engagement data puts finance-app 30-day retention at 73%, 90-day at 65%, annual at 48%, attributed to switching costs ([via Sendbird](https://sendbird.com/blog/finance-and-payment-app-retention)), while Adjust's cross-industry 2026 medians sit near 25% D1 and 4-6% D30 ([summary](https://semnexus.com/mobile-app-retention-benchmarks-by-category-2026)). The honest statement is "retention benchmarks for budgeting apps are contested and the low ones are real," not "71%." Second, even if the number were right, the causal claim (willpower to open the app) is unsupported. Finch has no hardware and retains extraordinarily well: ~10M+ Play Store downloads, 4.9 stars across ~1.3M ratings, reportedly ~$900K/month ([Similarweb](https://www.similarweb.com/app/google/com.finch.finch/)). Finch does not solve activation energy with an object. It solves it by making the user responsible for something that is waiting for them, and by never punishing them for going away.

Ship the app. Earn the right to the hardware. §7 says when.

---

## 1. Positioning

### 1.1 The one-sentence promise

> **Coiny sees everything you own and everything you owe, and turns it into one next step, held by something that is counting on you.**

### 1.2 The 10-second version

"It is a Tamagotchi for your actual money. It connects to every account you have, works out where you actually are, and gives you one thing to do next. The creature grows when you do it, and it never guilts you when you do not."

### 1.3 Competitive positioning line (fills `product-brief.md` §8)

> "Coiny is a financial companion for people with scattered money and no plan, like **Finch** meets **Kubera**."

Finch supplies the mechanic (a dependent creature that displaces self-motivation) and Kubera supplies the substance (net worth breadth across assets nobody else tracks, at $250 to $2,499/year with no gamification at all, [WallStreetZen](https://www.wallstreetzen.com/blog/kubera-app-review/)). Nobody occupies the middle. That gap is the position.

### 1.4 Target user (fills `product-brief.md` §1)

**In one sentence:** Coiny is for 24 to 38 year olds whose money is spread across six to fifteen places (a checking account, two cards, an old 401k, a Coinbase balance, a Robinhood account, a car, maybe a house), who are not broke and not organized, and who avoid looking at the whole picture because the whole picture has never been assembled.

This is a deliberate re-aim from `docs/business-plan.md` §1.2, which targets "18-35 who use at least one budgeting app" and leans on Tamagotchi nostalgia. Nostalgia sells a device. It does not sell a subscription. The people who will pay $69/year already have money in enough places to feel the fragmentation, and they are older and richer than the Tamagotchi cohort.

### 1.5 Three archetypes

| # | Name, age, role | Money problem | Why Coiny |
|---|---|---|---|
| 1 | **Maya, 27, senior support rep, $68K** | $9,400 across three cards at 24% APR. Pays more than the minimum "when she can." Has a Roth she opened in 2023 and has not funded since. Checks her balance and immediately closes the app. | The ladder tells her the cards come before the Roth and shows a real debt-free date. The pet reacts to the payment she made, not to the balance she still has. The ostrich loop breaks because opening the app produces an action, not a verdict. |
| 2 | **Deven, 33, backend engineer, $185K + RSUs** | Net worth is genuinely unknown: Fidelity 401k, a Schwab brokerage, ~40% of liquid net worth in his employer's stock, $22K spread over four chains, a leased car, a Kalshi account he forgot about. Saves a lot by accident, plans nothing. | Coiny is the only product that can assemble all of it, and the only one that will then say "63% of your investable assets are one ticker" (§3.6). His savings rate is already good, so the pet mostly confirms and occasionally warns. He is the paying user. |
| 3 | **Priya, 31, freelance designer, income $3.2K to $11K/month** | No stable paycheck, so every budgeting app's monthly frame is wrong. Feast-or-famine. Wants to know how many months she can survive, not what she spent on coffee. | Runway and income volatility are first-class (§3.2). Her emergency fund target is sized off volatility, not a flat 3x. The pet reacts to buffer months, not to a monthly budget she can never hit. |

### 1.6 Anti-targets

- **Not for active traders.** No price alerts, no watchlists, no intraday P&L celebration. Design Decision A already bans market moves from the Activity feed; §5 extends the ban to the pet.
- **Not for zero-based budgeters.** YNAB owns them, charges $14.99/month, and earns it through a 30-plus-minute guided setup and a methodology most users report takes two to three months to click ([Page Flows](https://pageflows.com/post/desktop-web/onboarding/ynab/)). We are not going to out-YNAB YNAB and we should not try.
- **Not for people with one bank account and no assets.** Our cost structure is per-connection ([`docs/global-integration-map.md` §9](./global-integration-map.md)) and our value is aggregation. A user with a single checking account gets almost nothing from us and costs us real money.
- **Not for children or teens.** Greenlight owns that, it requires a card product, and it invites COPPA scope we do not want.
- **Not for the anti-shame-proof.** If someone wants to be roasted, Cleo exists. See §5.1 for why we will never build that, and the $17M FTC settlement Cleo took in 2025 ([FTC](https://www.ftc.gov/legal-library/browse/cases-proceedings/cleo-ai-inc-ftc-v)) for why the adjacent monetization is a trap.

### 1.7 The magic moment (fills `product-brief.md` §3)

Not the paycheck dance. Not the sad face. Here it is:

> **Ninety seconds after signup, before the user has linked a single account, Coiny shows them a number they have never seen: their complete net worth, assembled from one bank login plus three taps of "yes I have one of those." Then the egg cracks, and the pet says one sentence about what comes next. Not "you spent $47 on DoorDash." One sentence: "Your next rung is a $2,000 buffer. You are $1,340 away. At your current pace that is nine weeks."**

The App Store preview video is that: egg, number, one instruction, hatch. Ten seconds.

This is a direct steal from Finch's onboarding sequencing (hatch the pet first, personalize second, paywall third, [UX teardown](https://medium.com/@deepthi.aipm/ux-teardown-finch-self-care-app-18122357fae7)) and from Copilot's trust move of letting users add accounts manually before ever asking for bank credentials ([Mobbin flow](https://mobbin.com/explore/flows/bec90a3f-1c1b-490a-b27d-8445cc6e62a7)).

### 1.8 Pet voice (fills `product-brief.md` §4)

Trait words: **quietly competent, specific, unbothered, never disappointed in you, slightly odd.**

Pick-one, resolved:

| | Choice | Why |
|---|---|---|
| Encouraging vs judgmental | **Encouraging** | Shame causes avoidance ([Gladstone 2021](https://www.sciencedirect.com/science/article/abs/pii/S0749597821000662)). Non-negotiable. |
| Talkative vs quiet | **Quiet** | Fewer than 3 pushes/week (§5.6). A quiet pet can afford to be listened to. |
| Cute vs edgy | **Cute** | Cute survives being wrong about your finances. Edgy does not. |
| Earnest vs sarcastic | **Earnest** | Sarcasm about money is Cleo's lane and Cleo got sued. |
| Optimistic vs realistic | **Realistic** | We show real payoff dates and real run rates. Optimism that gets falsified once destroys trust permanently. |
| Modern vs retro | **Retro** | It is the only bit of the nostalgia thesis worth keeping, and it is free. |
| Gendered vs non-binary | **They/it** | No reason to add a decision to onboarding. |

Five locked reaction lines:

| Event | Copy |
|---|---|
| Paycheck received | "Paycheck landed. $240 of it is already spoken for. Want me to move it now?" |
| Overspent on groceries | "Groceries went $38 over the plan this week. Nothing to fix today. I moved the line for next week." |
| Hit the $2,000 starter buffer | "That is rung one. You have a floor now. *(the egg cracks)*" |
| Netflix detected as a subscription | "You have paid Netflix $17.99 for 14 months. That is $251. Keeping it?" |
| User opens the app | *(nothing. the pet is doing something. it notices after about a second.)* |

Note what the overspend line does: it names the fact, states there is no action, and takes the corrective step itself. That is the guilt-not-shame framing the research demands. It is specific and about the behavior, never about the person.

### 1.9 Product principles (fills `product-brief.md` §5)

1. **React to what they control.** Contributions, payments, spend against plan, debt paydown, connections. Never to market moves, never to the balance itself. §5.1 is the enforcement mechanism.
2. **Never shame, never regress.** Stage never goes down. Streaks are repairable. A missed day costs nothing.
3. **Compute it, do not ask it.** Every question in onboarding must justify why it cannot be derived from data we already have. §2.
4. **One next step.** The home screen answers "what do I do" before it answers "how am I doing." Kubera answers the second question and charges $250/year; that is a different product.
5. **Precision or silence.** If we cannot state a number with a date and a confidence, we do not state it. Every projection carries its assumptions inline.

### 1.10 North star metric (fills `product-brief.md` §9)

> **W4: the percentage of signups who complete a foundation-ladder rung or a habit-goal period within 4 weeks of signup, and are still active in week 4.**

Not DAU (Duolingo optimized engagement and is regularly accused of producing users who still cannot hold a conversation after six months, [Helfant](https://www.aidanhelfant.com/duolingo-is-not-a-free-language-learning-app-its/)). Not net worth growth (mostly market beta, which we have just banned the pet from reacting to). W4 is the only metric that is simultaneously a retention measure and a "did the product do its job" measure.

Supporting counter-metrics, watched to make sure W4 is not gamed: push opt-out rate, D1-after-negative-event return rate, and median connections per active user.

**Target:** 25% W4 at 1,000 users. Justification: fintech activation is front-loaded, with roughly 76% of fintech users who ever become active doing so inside the first seven days ([Avow](https://avow.tech/blog/10-fintech-retention-tactics-for-churn-reduction/)), so a four-week window is generous, and the ladder gives even a slow user a reachable rung.

---

## 2. Onboarding

### 2.1 The problem, stated honestly

Coiny wants more connections than any competitor. Every connection raises value and raises churn risk at the same moment, because Plaid Link's documented drop-off points (institution search, login, OTP/MFA, account selection, [Plaid docs](https://plaid.com/docs/link/measuring-conversion/)) each present a fresh chance to quit. Plaid publishes only relative lift numbers, 10 to 20% conversion improvement for customers using Plaid ([Plaid](https://plaid.com/blog/seven-ways-enterprises-can-scale-and-optimize-the-user-experience/)), and up to 80% completion in high-intent lending flows ([Fintegration](https://www.fintegrationfs.com/post/top-10-tips-to-improve-plaid-link-conversion-what-is-plaid-link-recovery)). PFM linking is lower-intent than a loan application. Assume worse.

Meanwhile the paywall timing question has an answer from data: hard paywalls with a trial convert at a 10.7% median day-35 rate versus 2.1% for freemium, and higher-priced apps produce $34.82 monthly realized LTV per payer versus $10.69 for low-priced ones ([RevenueCat, State of Subscription Apps 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/)). But Monarch's flow requires a card before the user has seen anything ([teardown](https://johnstone.substack.com/p/product-teardown-monarch-money)), and that only works because Monarch inherited Mint's refugees with pre-formed intent. We have no such inheritance.

### 2.2 The resolution

**Ask for exactly one connection. Get everything else through declaration, not authentication.**

The insight is that a net worth number does not require an API to be *useful*, only to be *maintained*. A user who taps "I have a car" and types "2021 Civic, ~48K miles" has given us a valuation input good to within a few percent using a depreciation curve, exactly as `docs/global-integration-map.md` §5 recommends. A user who types "about $18,000" for their old 401k has given us a number that is right today and stale in a month, which is fine, because the ask to connect Fidelity now has a reason attached: "connect it so I stop guessing."

So: **declare first, authenticate later, one connection at a time, each with a named payoff.**

### 2.3 Screen by screen

Time-to-first-value target: **the net worth number on screen in under 90 seconds, the pet hatched and holding a specific instruction in under 3 minutes.** Nothing may be inserted into this flow without removing something else.

| # | Screen | Ask | Deferred / computed | Notes |
|---|---|---|---|---|
| 0 | Sign in | Sign in with Apple (existing) | Everything | No email, no password, no name entry. Delete the current `EnterNamePage` from `OnboardingView.swift`: we do not need a name, and it is the first place a user can decide this is work. |
| 1 | "What do you have?" | A grid of ~14 chips: Checking, Savings, Credit cards, 401k/pension, Brokerage, Crypto, Car, Home, Student loans, Business, Collectibles, Other. Multi-select. **No amounts.** | Everything else | This is the single most important screen. It takes 8 seconds, it feels like a quiz not a form, and it determines the entire rest of the app. It is also the personalization step that earns the later paywall, per Finch's quiz-then-paywall order. |
| 2 | "Roughly how much?" | For each chip selected, a slider with log scale and a "skip" affordance. Sliders, never keyboards. | Precision | Sliders are the difference between 20 seconds and abandonment. The value is bucketed and stored with `confidence: 'declared'`. |
| 3 | **The number** | Nothing | Net worth, assembled | Full-screen, animated count-up, with a "this is an estimate, let's make it real" subtitle and a per-line confidence indicator. This is the magic moment. Nobody has ever shown them this. |
| 4 | One connection | Plaid Link, framed as: "Connect the account you actually spend from. That is the only one I need to start." | All other connections | Single institution. If the user abandons Link, they land on screen 5 anyway with a persistent "connect" affordance. Abandonment must not be terminal. |
| 5 | Hatch | Nothing | Ladder position, first rung, run rate | Egg cracks. Pet appears. One sentence: current rung, gap, weeks at current pace. |
| 6 | Notifications | System prompt, pre-framed: "I will message you at most twice a week. Never at night. Never about the market." | | Finance apps enjoy ~72.3% push opt-in, the highest of any category ([ContextSDK](https://contextsdk.com/blogposts/finance-apps-push-secret-understanding-the-72-3-opt-in-rate-success)), and we protect that by promising the cap out loud before asking. |

**Paywall: not in onboarding.** It appears on day 7, or on the first attempt to add connection number three, whichever comes first. Rationale in §6.

### 2.4 The connection ladder (post-onboarding)

Connections are requested one at a time, each triggered by a moment where the user already wants the thing the connection unlocks.

| Trigger | Ask | Payoff stated |
|---|---|---|
| User's declared debt is above $0 and no card is linked | Spinwheel or Plaid Liabilities | "Link your cards and I will give you a real payoff date instead of an estimate." |
| Declared 401k/brokerage, day 3 | SnapTrade or Plaid Investments | "Your retirement number is currently a guess. One connection fixes it forever." |
| Declared crypto, day 5 | Wallet address paste (no auth needed) | "Paste an address, I will track it. Read only, no keys." |
| Declared home, week 2 | Address or purchase price + date | "I will index it forward. No account needed." |
| Any declared value untouched for 60 days | Refresh prompt | "Your car estimate is 2 months old." |

**Never** batch these. Never show a "connect 8 more things" checklist. That is the screen every user closes.

### 2.5 What we compute rather than ask

Currently the app asks for `weeklyBudgetByCategory`, `savingsGoal`, `paycheckMinAmount`, and `largePurchaseThreshold` in `SettingsView`. All four should be derived and then *offered for correction*, never asked cold.

| Today's ask | Derive from | Fallback |
|---|---|---|
| `paycheckMinAmount` | `GET /api/plaid/recurring` inflow streams. Take the modal recurring inflow, set the threshold to 60% of it. | 60% of largest single credit in 90 days |
| `largePurchaseThreshold` | P95 of the last 180 days of outflows | 3% of monthly income |
| `weeklyBudgetByCategory` | Trailing 8-week median per category, then propose a 10% reduction on the top discretionary category only | Do not set one |
| `savingsGoal` | The current foundation-ladder rung target (§3.3) | $2,000 starter buffer |

**Recommended deletion:** the "Current goals" section of `SettingsView.swift` as a primary surface. Goals move to their own tab (§3.8), and the numbers arrive pre-filled with an "adjust" affordance.

---

## 3. The goal system

This is the centerpiece and the thing that does not exist today.

### 3.1 Design commitments

Five commitments, each traceable to evidence, that constrain every mechanic below.

1. **Sequenced, not simultaneous.** Every serious framework is a ladder: [Money Guy's Financial Order of Operations](https://moneyguy.com/guide/foo/) has nine steps, [Ramsey](https://www.ramseysolutions.com/dave-ramsey-7-baby-steps) has seven, the r/personalfinance Prime Directive is a flowchart. They disagree on ordering details and agree completely that order matters. An app that shows a user eight goals at once has told them nothing.
2. **Concentrated, not dispersed.** Kettle, Trudel, Blanchard and Häubl found consumers are more motivated to keep paying down debt when payments are concentrated on one account rather than spread evenly, an effect they name debt account aversion ([JCR 43(3):460-477, 2016](https://academic.oup.com/jcr/article-abstract/43/3/460/2200459)). This generalizes: one active goal beats five.
3. **Partitioned and labeled.** Cheema and Soman found low-income workers given earmarked savings in two envelopes saved 414 rupees versus 241 for a single pooled envelope, a 72% lift, with visual goal reminders adding more ([JMR, 2011](https://journals.sagepub.com/doi/10.1509/jmkr.48.SPL.S14)). Goals get names, avatars, and their own visible balances.
4. **Automated beats contingent.** The CFPB's analysis of 127,243 Qapital savings goals found guaranteed rules (save every Friday) produced 1.5x to 3.5x larger gains in amount saved and milestone attainment than contingent round-up rules, even though contingent rules were far more popular (81% of goals) and fired far more often, 58 times/month at $1.40 versus 5 times/month at $32.57 ([CFPB, Dec 2022](https://files.consumerfinance.gov/f/documents/cfpb_qapital-savings-app-outcomes_report_2022.pdf)). **Round-ups are the fun mechanic and the weak mechanic.** Default to scheduled recurring.
5. **Endowed progress.** Kivetz, Urminsky and Zheng showed a 12-stamp card with 2 stamps pre-filled was completed faster than a plain 10-stamp card despite identical remaining effort ([JMR 43(1):39-58, 2006](https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf)). Every goal starts with visible progress already banked, honestly labeled (existing balance counts toward the goal, and it does).

### 3.2 Layer 0: derived financial state

Not a goal layer. The substrate every goal reads from. Computed nightly, cached, versioned.

| Field | Definition | Source today | Gap |
|---|---|---|---|
| `takeHomeMonthly` | Median of trailing 6 monthly sums of recurring inflow streams | `plaid_recurring_streams` | Exists |
| `incomeVolatility` | stdev / mean of trailing 12 monthly income | `transactions` | New computation |
| `essentialMonthly` | Trailing 90d mean of outflows in rent, mortgage, utilities, insurance, loan_payment, groceries, transport | `transactions.category` | New computation |
| `discretionaryMonthly` | Trailing 90d mean of all other outflows excluding transfers | `transactions` | New; **must exclude transfers**, which the current `getSpendingSummary` does not |
| `liquidCash` | Sum of depository balances | `net-worth.bankTotal` / `liquidDeposits` | Exists |
| `runwayMonths` | `liquidCash / essentialMonthly` | `liquidCashMonths` | Exists, but denominator is total burn not essentials. Change it. |
| `savingsRate` | `(takeHomeMonthly - totalOutflow + debtPrincipalPaid) / takeHomeMonthly` | `getSpendingSummary` | **Currently wrong.** `backend/src/store/transactions.ts:114` counts *any* credit over $50 as income, so internal transfers, refunds, Venmo reimbursements and credit card payments all inflate income and therefore savings rate. Fix before any goal depends on it. |
| `netWorthSeries` | Daily net worth points | `petState.lastNetWorthUsd` | **Only a scalar exists.** No time series. Blocks every trend goal, every on-pace calculation, every projection. Highest-priority schema gap. |
| `debtMap` | Per-account balance, APR, min payment, due date, limit, status | Spinwheel `SpinwheelDebt` + `plaid_liabilities_cache` | Both exist; **no dedupe** (§4.1) |
| `ladderRung` | Current foundation rung 0-7 | none | New |

### 3.3 Layer 1: the Foundation Ladder ("the Climb")

Eight rungs. Sequenced, gated, one active at a time, and **this is what drives pet evolution**. Rungs never un-complete.

The sequence is a synthesis: it takes FOO's insurance-and-match-first ordering, Ramsey's psychological staging, and the Prime Directive's high-interest-debt priority, and corrects each where the evidence says they are wrong.

| Rung | Name | Target | Default value and derivation | Pet stage |
|---|---|---|---|---|
| 0 | **Sighted** | One spending account connected, net worth assembled | Automatic on link | Egg |
| 1 | **Floor** | Starter cash buffer | `max($2,000, 0.5 × essentialMonthly)` | Hatchling |
| 2 | **Free money** | Capture full employer match | Declared once, verified via 401k contribution stream if `snaptrade`/Plaid Investments connected | Sprout |
| 3 | **Bleeding stopped** | Zero balance on every debt above 10% APR | APR from `debtMap`; 10% threshold | Fledgling |
| 4 | **Buffer** | Full emergency fund | `essentialMonthly × months`, where `months = 3` if `incomeVolatility < 0.15`, `4.5` if `< 0.35`, `6` otherwise | Adolescent |
| 5 | **Sheltered** | Tax-advantaged accounts funded to a user-set rate | Default 15% of gross across all tax-advantaged vehicles | Adult |
| 6 | **Surplus** | 25% gross savings rate sustained 3 consecutive months | Money Guy's hyperaccumulation figure | Elder |
| 7 | **Freedom** | `25 × essentialAnnual` invested | Never "complete"; shows a percentage forever | Ascendant |

**Rung 1 is deliberately not $1,000.** Ramsey's $1,000 starter fund is an unadjusted 1990s number and is now widely criticized as such ([Yahoo Finance](https://finance.yahoo.com/news/critics-call-dave-ramseys-1-154607123.html)). The JPMorgan Chase Institute's cash-buffer work is the better anchor: typical household income and spending each swing roughly 30% month to month, and a middle-income household needs about $4,800 liquid to absorb a simultaneous income drop and spending spike while typically holding about $3,000 ([JPMorgan Chase Institute](https://www.jpmorganchase.com/institute/all-topics/financial-health-wealth-creation/household-cash-buffer-management-from-the-great-recession-through-covid-19)). $2,000 or half a month of essentials is a defensible first rung that is reachable, given 59% of Americans cannot cover a $1,000 emergency from savings and 27% have zero emergency savings ([Bankrate 2026, via summary](https://getoutofdebt.org/230188/bankrate-emergency-savings-2026)).

**Rung 4's variable sizing is the Priya feature.** The flat "3 to 6 months" convention treats a salaried engineer and a freelancer identically. Sizing off measured income volatility is the correct implementation of the JPMorgan finding and is a genuine differentiator; no competitor does it.

**Rung 6 uses 25% of gross, not 20%.** The 50/30/20 rule is the popular alternative and it does not survive contact with current data: the median US household spends over 80% of take-home on needs alone, and the personal savings rate was 2.7% in June 2026 ([BEA](https://www.bea.gov/news/2026/personal-income-and-outlays-june-2026)). 20% is not a soft target for most people, it is unreachable, and the users who *can* reach rung 6 are exactly the Devens for whom 25% is the right stretch. Pair it with the years-to-FI table from [Mr. Money Mustache's "Shockingly Simple Math"](https://www.mrmoneymustache.com/2012/01/13/the-shockingly-simple-math-behind-early-retirement/), which is the single best gamification asset in personal finance: 10% savings rate is ~51 years to FI, 25% is ~32, 50% is ~17, 65% is ~10.5, 75% is ~7. A live slider showing years-to-FI moving as savings rate changes belongs on the Goals tab.

**Rung 7 uses 4% / 25x as the headline with an adjustable range.** Bengen's original work and the Trinity Study converged on ~4% for 30 years; Bengen has since raised his own figure to 4.7%; Morningstar's most recent State of Retirement Income puts the base-case safe starting rate at 3.9% for 2026 retirees, rising to as much as 5.7% under dynamic withdrawal strategies ([Morningstar](https://www.morningstar.com/retirement/whats-safe-retirement-withdrawal-rate-2026)). Ship 4% as the default because 25x is legible, expose 3.5% to 5% on a slider, and show the citation in the tooltip.

**Skipping.** Any rung can be skipped with a stated reason ("I don't have an employer plan"), which marks it `not_applicable` and advances the ladder. No rung can be *failed*.

### 3.4 Layer 2: target goals (user-defined)

The classic "save $X by date Y" goal, done properly.

**Fields:**

```
goal_id, user_id, name, emoji, kind: 'save' | 'payoff' | 'purchase'
target_amount, target_date (nullable)
funding_account_id        -- which account holds the money
counts_existing_balance   -- endowed progress; default true
contribution_rule: { type: 'recurring'|'roundup'|'manual', amount, cadence, day_of_month }
created_at, achieved_at, archived_at
```

**Computed, every night:**

- `current` = balance of `funding_account_id` attributable to this goal (or the tracked sub-balance if multiple goals share an account)
- `requiredRunRate` = `(target_amount - current) / months_remaining`
- `actualRunRate` = trailing 90-day mean net contribution to that account
- `pace` = `actualRunRate / requiredRunRate`, rendered as **Ahead** (>1.1), **On pace** (0.9 to 1.1), **Behind** (0.5 to 0.9), **Off pace** (<0.5)
- `projectedDate` = date at which `actualRunRate` reaches target
- `gapAction` = the single smallest change that returns the goal to on-pace, expressed as one number ("+$61/month" or "push the date 7 weeks")

**Rules:**

- **Maximum three active target goals.** Enforced. This is commitment 2 applied. A fourth requires archiving one. Users will complain. The research says they will also finish more of them.
- **The default contribution rule is `recurring`, not `roundup`,** per the CFPB finding. Round-ups are offered as a supplement with honest framing: "This is the fun one. It saves less."
- **When a goal goes off pace, the app never says "you are behind."** It says "the date moved to March 14" or "+$61/month gets you back." Loss framing is used on the *committed money*, not on the person: field evidence on loss-framed incentives is strong (Fryer, Levitt, List and Sadoff found loss-framed teacher bonuses improved outcomes 0.124 to 0.398 SD while gain-framed produced no significant effect, [summary](https://www.invespcro.com/blog/13-loss-aversion-marketing-strategies-to-increase-conversions/)), but it must attach to a thing, not a self-image.
- **Goal creation prompts fire on temporal landmarks.** Dai, Milkman and Riis showed aspirational behavior spikes after new weeks, new months, new years, birthdays and holidays, because landmarks open a new mental accounting period that detaches the person from past failure ([Management Science 60(10), 2014](https://pubsonline.informs.org/doi/10.1287/mnsc.2014.1901)). Schedule the "want to start something?" prompt for Mondays and the 1st, never randomly.
- **Every goal is created with an implementation intention.** The creation flow's last step is not "done," it is "when should this happen?" and the answer is stored as the contribution rule trigger. Gollwitzer and Sheeran's meta-analysis across 94 studies puts the effect of if-then plans on goal attainment at d = 0.65 ([meta-analysis](https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes)). Note the honest caveat: the savings-specific evidence is thinner and mixed, so this is a cheap addition, not the load-bearing mechanic.
- **Sinking funds are a goal kind, not a feature.** A recurring known expense (annual insurance, holidays, car maintenance) is a `save` goal with `target_date` set and `recurring_annual: true` so it resets on completion. `target_amount / months_until_due` is the whole mechanic.

**Optional commitment lock (paid tier, ship later).** Ashraf, Karlan and Yin's SEED experiment in the Philippines found offering an illiquid commitment savings account raised savings balances 81% after one year versus control ([QJE 121:635-672, 2006](https://academic.oup.com/qje/article-abstract/121/2/635/1884028)). We cannot hold funds and should not try. The software analogue: a user-set lock where withdrawing from a goal account requires a 24-hour delay and a confirmation, implemented purely as UI friction plus a notification. It is weaker than a real commitment device and it is free.

### 3.5 Layer 3: habit goals and guardrails

Recurring, period-based, pass/fail per period, streak-tracked. These are what the pet reacts to most often, because they fire weekly rather than yearly.

| Guardrail | Period | Default | Data needed | Exists? |
|---|---|---|---|---|
| **Savings rate floor** | Month | 15% starting, +2pp per achieved quarter, cap at ladder rung target | `savingsRate` (fixed) | Needs fix |
| **Discretionary cap** | Week | Trailing 8-week median minus 10%, top category only | `transactions` + category | Yes |
| **Bills on time** | Month | All accounts with `nextDueDate` paid before due | `plaid_liabilities_cache.nextDueDate`, `isOverdue` | Yes, unused |
| **Utilization before statement close** | Month | Every card under 30%; alert at 10% for score-optimizers | Spinwheel `creditLimit` + `balance`; statement close date | Partial (§4.6) |
| **Contribution streak** | Week | At least one net positive transfer to any goal account | `transactions` | Yes |
| **No new recurring** | Month | No new subscription detected | `GET /api/subscriptions` | Yes, unused for goals |
| **Debt principal paid** | Month | Any payment above minimum on any debt | `debtMap` + `transactions` | Partial |

**Streak rules, and they matter more than the guardrails themselves:**

- Streaks are **weekly, not daily.** Money does not have daily resolution. A daily streak on a financial app is a lie that will break.
- **Two free repairs banked at all times, one earned every 3 completed periods.** This is Finch's Streak Repair Saver mechanic verbatim, and it is the single most-cited reason users describe Finch as safe to come back to ([Finch help](https://help.finchcare.com/hc/en-us/articles/37780736136205-Understanding-Streaks)). Duolingo's layered Streak Freeze plus Repair plus periodic Revival events serve the same function ([teardown](https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/)).
- **A broken streak resets the counter and nothing else.** No stage loss, no pet distress, no push notification. The what-the-hell effect (one lapse triggering total abandonment) is exactly what a punitive streak produces.
- **No leaderboards, ever.** Duolingo's leagues demonstrably penalize users who have already met their own daily goal ([UX Collective](https://uxdesign.cc/the-good-the-bad-and-the-ugly-of-duolingo-gamification-3a12f0e80dc7)). Applying competitive pressure to spending and saving data, among users we have defined as financially anxious, would be materially worse than applying it to language XP.

### 3.6 Layer 4: portfolio and risk guardrails

**This is the layer nobody else can ship, and it is the reason the 30-integration backend was worth building.** Monarch, Copilot, Simplifi and Empower do not even support multi-currency ([per `docs/global-integration-map.md` §6](./global-integration-map.md)). Kubera has the breadth and deliberately offers no interpretation of it.

These are **observations with thresholds, not recommendations.** That distinction is load-bearing: the Investment Advisers Act attaches to firms or persons who advise about *securities* for compensation ([FINRA overview](https://www.finra.org/investors/investing/working-with-investment-professional/investment-advisers)). "63% of your investable assets are in one ticker" is a fact about the user's data. "Sell some NVDA" is advice. Coiny states facts and links to education. Debt payoff sequencing, savings rates and budgeting are not securities advice and carry no equivalent exposure, which is one more reason the debt mechanic in §4 is the safest high-value feature we have.

| Guardrail | Default threshold | Rationale | Data source |
|---|---|---|---|
| **Single-position concentration** | Warn at 10% of investable assets, escalate at 20% | Common advisor rule of thumb treats 10-20% in one position as overconcentrated; T. Rowe Price flags above 5% as worth addressing and above 10% as needing immediate planning ([T. Rowe Price](https://www.troweprice.com/personal-investing/resources/insights/actions-can-take-if-your-portfolio-is-too-concentrated-in-one-equity.html)) | `net-worth.accounts.investments[]` (has `ticker`, `value`) |
| **Employer-stock concentration** | Warn at 10%, distinct copy | Correlated with income; job loss and asset loss arrive together | Same, plus declared employer |
| **Cash drag** | Warn when `liquidCash > essentialMonthly × 12` | Vanguard's framework recommends 3 to 12 months accessible and investing the rest; investors are twice as likely to hold cash unintentionally as deliberately ([Vanguard](https://corporate.vanguard.com/content/corporatesite/us/en/corp/articles/out-sight-out-market-ira-cash-drag.html)) | `liquidCash`, `essentialMonthly` |
| **Illiquidity** | Warn when liquid < 15% of net worth | Coiny uniquely sees house + car + collectibles, so it uniquely sees when a "rich" net worth cannot pay a $3,000 bill | Full net-worth response |
| **Crypto share** | Inform at 20%, warn at 40% | Stated as a fact plus volatility context, never as a market call | `crypto + defi + chainWallets + hyperliquid` |
| **Currency exposure** | Inform when >25% of net worth is in a non-display currency | Requires the multi-currency model in `global-integration-map.md` §6 | Blocked on that work |
| **Custodian concentration** | Inform above 40% at one institution | Simple, useful, nobody shows it | `accounts.bank[]` + connections |
| **Debt-to-liquid** | Warn when high-APR debt exceeds `liquidCash` | Directly feeds the rung 3 sequencing decision | `debtMap`, `liquidCash` |

**The pet does not react to any of these.** They are surfaced as at most one card per week on the Wealth tab. They are observations about structure, which the user controls slowly, not events, which the user controls now. Making a pet sad about portfolio structure is a category error and would violate §5.1.

### 3.7 Schema

New tables, minimal:

```
goals            -- Layer 2, fields per §3.4
goal_periods     -- Layer 3, one row per guardrail per period, with outcome + repair_used
ladder_state     -- current rung, per-rung completed_at / skipped_reason
net_worth_daily  -- (user_id, date, total, by_class jsonb, currency) PRIMARY KEY (user_id, date)
pet_progression  -- stage, stage_entered_at, unlocked_cosmetics[]
notification_log -- for the frequency cap in §5.6
```

`net_worth_daily` is the highest-priority item on this list. Every on-pace calculation, every projection, every trend, and the entire Wealth tab's credibility depend on a time series that does not currently exist.

Deprecate on `pet_state`: `weeklyBudgetByCategory`, `savingsGoal`, `paycheckMinAmount`, `largePurchaseThreshold`. Keep them read-only through one release for the existing iOS build, then drop.

### 3.8 Information architecture

Current tabs: Pet, Activity, Wealth, with Settings behind a gear. Proposed:

| Tab | Contents | Change |
|---|---|---|
| **Pet** | The creature, current rung, one instruction, streak state | Becomes the answer to "what do I do" |
| **Plan** | **New.** Ladder, target goals, guardrails, years-to-FI slider | The goal system needs a home |
| **Activity** | Cash-flow feed (Design Decision A preserved) | Add the spending summary card already specified in `handoff.md` Priority 2 |
| **Wealth** | Net worth, breakdown, portfolio guardrails | Collapse the 27 asset sections into 6 groups with disclosure. The current design shows a user with a checking account 20 empty GroupBoxes. |

Settings stays behind the gear. Goals move out of it.

---

## 4. Debt

Debt is the highest-value, lowest-regulatory-risk, most emotionally charged surface in the product, and it is currently a single line item in the net worth total. US household debt stood at $18.8T in Q1 2026 with credit card balances at $1.25T ([NY Fed](https://www.newyorkfed.org/newsevents/news/research/2026/20260512)), and the average APR on accounts actually accruing interest was 22.15% in Q2 2026 ([Federal Reserve G.19](https://www.federalreserve.gov/releases/g19/current/)).

### 4.1 Ingestion, and the dedupe problem nobody has noticed

Three sources currently produce debt, and they overlap:

| Source | Gives | Live? |
|---|---|---|
| Spinwheel `getDebtProfile()` | Bureau-level: `id, type, balance, interestRate, minimumPayment, creditLimit, dueDate, accountStatus, lastPaymentDate, openDate, paymentHistoryCodes[]` | Yes, sandbox |
| Plaid Liabilities (`plaid_liabilities_cache`) | Per-account: `minPayment, nextDueDate, isOverdue, primaryApr` | Yes |
| User declaration (onboarding chip) | Rough balance | Proposed |

**These are not deduplicated.** A user who links Chase through Plaid and connects Spinwheel will have their Chase card counted twice in `debtsTotal`, because `net-worth.ts` sums `getDebtProfile()` output independently of `bankAccounts` liability balances. This is a real bug waiting for the first user who connects both. Required: a `debt_accounts` table with a match key on `(normalized_issuer, last4 or open_date, credit_limit)`, source precedence **Plaid > Spinwheel > declared** for balance (Plaid is more current) and **Spinwheel > Plaid** for APR and limit (bureau data is more complete), with a manual "these are the same account" merge affordance.

Merged record per debt:

```
debt_id, user_id, issuer, nickname, type, source_ids[]
balance, apr, min_payment, credit_limit, due_day, statement_close_day
is_promotional, promo_end_date, promo_apr
status: open | closed | delinquent
```

`statement_close_day` and promotional APR are not returned by either provider and must be user-entered or inferred (§4.6). Both matter enough to ask for.

### 4.2 Strategy selection: avalanche, snowball, or blend

**The math is not in dispute.** Avalanche (highest APR first) minimizes total interest, always.

**The behavior is where it gets interesting, and the research is stronger than most people realize:**

- Gal and McShane, using real debt-settlement-firm data, found that **closing an account predicts eventual full debt elimination regardless of that account's balance**, and that the dollar balance of closed accounts is *not* predictive once you control for the fraction of accounts closed ([JMR 2012, Kellogg summary](https://insight.kellogg.northwestern.edu/article/to_beat_debt_consider_starting_small)). What predicts finishing is the count of wins, not the dollars retired.
- Brown and Lahey found people complete unequal subtasks faster in smallest-first order, and, revealingly, choose that ordering *least* often when free to pick ([JMR 52(6):768-783, 2015, PDF](https://files.consumerfinance.gov/f/documents/P2d_-_Brown_-_Small_Victories.pdf)). They explicitly caveat that the motivation gain may not offset the extra interest.
- Kettle et al. supply the mechanism: concentration on one account beats dispersal across many ([JCR, 2016](https://academic.oup.com/jcr/article-abstract/43/3/460/2200459)).

**Recommendation: default to a rule-based Blend, and always show the cost of the choice in dollars.**

```
Blend rule:
  1. Order all debts by APR descending.
  2. If any debt can be cleared in <= 3 months at the current
     extra-payment amount, promote it to first regardless of APR.
  3. Otherwise pure avalanche.
  4. Recompute after every payoff.
```

This buys the early win that predicts completion, then hands the plan back to the math. Copy: "Card 4 first. It is not the most expensive, but you will kill it in six weeks, and that is the one that matters." Under it, always: **"Blend costs you $214 more than pure avalanche and $806 less than pure snowball."** The user picks with the number in view. Hamilton et al. quantified this tradeoff directly if we want a validated cost model ([Southern Economic Journal, 2023](https://onlinelibrary.wiley.com/doi/full/10.1002/soej.12612)).

Both pure strategies remain selectable, one tap, no lecture.

### 4.3 The payoff plan

Inputs: merged `debt_accounts`, a single **extra monthly payment** number, and a strategy.

The extra-payment number is the *only* thing we ask for, and it is pre-filled from `takeHomeMonthly - essentialMonthly - discretionaryMonthly - sum(min_payments)`, floored at $25.

Projection math, standard revolving amortization with monthly rate `r = APR/12`:

```
months_to_payoff = -log(1 - (r * B) / P) / log(1 + r)      requires P > r * B
```

The guard matters: if the payment does not exceed accrued interest the balance never shrinks, and that is a *finding to surface*, not an error to swallow. Copy: "At $85/month this card never goes away. $141 clears it in 8 years. $310 clears it in 2."

Outputs, all displayed:

- **Debt-free date** for the whole portfolio, as a calendar date, not a duration
- Per-debt payoff order with individual dates
- Total interest paid under this plan
- The delta versus minimum-payments-only, in dollars and in years

### 4.4 The extra-payment simulator

A single slider from $0 to (discretionary + current extra), which live-updates:

1. Debt-free date
2. Total interest saved
3. Which debt disappears next and when

This is the goal-gradient effect applied to debt: the whole point is to make the marginal $50 feel like it moves something, because it does. It is also the one screen most likely to be screenshotted and shared, which matters for organic acquisition.

### 4.5 Minimum payments: how to display them without doing harm

Stewart's UK field experiment found simply *showing* a minimum-payment figure on a statement anchors people to pay less ([Psychological Science 20:39-41, 2009, PDF](https://wrap.warwick.ac.uk/id/eprint/2552/1/WRAP_Stewart_D8573940-070409-stewart_2009.pdf)). Navarro-Martinez et al. replicated the anchoring harm and, critically, found that **adding supplemental disclosures about interest cost and time-to-repay does not offset it** ([JMR 48(SPL):S60-S77, 2011](https://journals.sagepub.com/doi/10.1509/jmkr.48.SPL.S60)). The CARD Act's mandated 36-month payoff box moved average payments by only about $19/month and produced roughly $62M/year in realized interest savings against an estimated $2B/year potential ([summary of the research](https://phys.org/news/2014-06-minimum-payment-nudge-credit-card.html)).

**Rule: Coiny never displays a minimum payment as the primary number.** The primary number on every debt card is **the payment that clears it in 36 months**, with the minimum shown smaller and labeled "minimum (the trap)". If the user's plan already beats 36 months, the primary number is their plan's payment. The contrast frame is what works; the raw disclosure is not.

### 4.6 Credit utilization: the feature nobody ships

FICO puts "amounts owed" at 30% of the score and explicitly notes that a low utilization ratio can score better than using none of your available credit ([myFICO](https://www.myfico.com/credit-education/credit-scores/amount-of-debt)). The practical mechanic almost no consumer knows: **the balance reported to the bureaus is the statement-closing balance, not the balance after you pay the due-date bill.** Paying in full every month and still showing 60% utilization is extremely common and entirely fixable.

Ship a **pay-before-close reminder**: two days before each card's statement close date, if projected utilization on that card exceeds 30%, notify with the exact amount that brings it under. Per-card, not aggregate, because per-card utilization is scored independently.

This requires `statement_close_day`, which neither provider returns. Ask for it once, on the debt card, framed as "when does your statement close? Check your last statement, it is a huge deal for your score." It is the one manual input in the product worth its friction.

### 4.7 Consolidation: say the true thing

Users will ask. TransUnion's work found consolidators cut card balances 57% at the moment of consolidation, and within 18 months many had rebuilt, with median utilization climbing back to 42% ([CNBC](https://www.cnbc.com/2026/03/11/personal-loan-credit-card-debt-consolidation.html)). An older Indiana study found 37.5% took on new debt within three months and 87.5% within a year.

Coiny will show consolidation math when asked (blended APR, break-even on origination fees) and will always show it next to the reborrowing statistic. **Coiny will never refer users to a lender, take a referral fee, offer an advance, or monetize debt in any way.** Cleo's $17M FTC settlement over cash-advance advertising, undisclosed express fees and subscription-before-disclosure enrollment ([FTC](https://www.ftc.gov/legal-library/browse/cases-proceedings/cleo-ai-inc-ftc-v)) is the precise map of what happens when a fun persona sits on top of lending economics. This is a permanent constraint, not a phase-1 constraint.

### 4.8 How the pet participates

| Moment | Pet | Push? |
|---|---|---|
| Payment above minimum detected | Happy, one-line: "$180 above the minimum. That moved your debt-free date to Mar 2028." | No (in-app only) |
| A debt hits $0 | **Celebrate. Largest animation in the product. Confetti-equivalent. Stage progress if it clears rung 3.** | Yes |
| Balance increased (new spending on a card) | **Nothing.** | Never |
| Payment missed / `isOverdue` true | Concerned, once, with the one-tap action "pay now" deep link | Yes, once, never repeated |
| Utilization crosses 30% before statement close | Neutral, with the exact figure | Yes, this is the pay-before-close nudge |
| Credit score drops | **Nothing.** Score is lagging, noisy, and mostly not same-day controllable. Show it on Wealth. | Never |
| Total debt balance rises | **Nothing.** | Never |

The asymmetry is the design. **Payments are celebrated, balances are never punished.** A user who is $9,000 in debt already knows. Telling them is not information, it is shame, and shame produces the withdrawal spiral Gladstone et al. documented.

---

## 5. The pet reaction model

### 5.1 The controllability principle (enforced, not aspirational)

> **The pet may only react to events the user caused in the last 7 days and could have caused differently.**

Operationally, every event type carries a `controllability` field with three values, and the value determines what is allowed:

| Class | Definition | Pet reacts? | Push allowed? | Appears in Activity? |
|---|---|---|---|---|
| `direct` | User's own action: payment, transfer, contribution, purchase, connection | Yes | Yes, subject to §5.6 | Yes (cash flows only, per Design Decision A) |
| `structural` | Slowly-changing state: concentration, runway, utilization ratio | No animation. Card on the relevant tab. | Only utilization-before-close | No |
| `exogenous` | Market moves, price changes, FX, score changes, valuation updates | **Never** | **Never** | **No** |

**Required deletions from `backend/src/reactions/external.ts`:**

- `crypto_price_surge` returning `celebrate/fanfare/rainbow` at >10%: **delete.** This is the Robinhood confetti mechanic. It teaches users that volatility is a reward.
- `crypto_price_drop` returning `concerned/warning/amber`: **delete.** This is the ostrich trigger.
- `credit_score_improved` / `credit_score_dropped` at ±20 points: **downgrade to `structural`.** Move to the Wealth tab as a card. VantageScore moves for reasons a user cannot connect to yesterday's behavior.
- `net_worth_milestone` at $10K/$25K/$50K/...: **downgrade to `structural`.** Crossing $100K because the S&P rose 2% is not an achievement, and celebrating it means we must also stay silent when it crosses back down, which reads as inconsistent. Replace with **contribution milestones**: total dollars the user has personally moved into savings, investments and debt principal. That number only goes up, it is entirely theirs, and it is a better thing to be proud of.
- `new_liability` returning `concerned/warning`: **soften.** Opening a card is not a moral failure. Neutral acknowledgment, no push.

**Additions:**

- `contribution_made`, `extra_debt_payment`, `goal_period_passed`, `ladder_rung_completed`, `debt_cleared`, `connection_added`, `streak_extended`, `subscription_cancelled`.

### 5.2 The state model: three variables, not two

Today: `healthScore` and `mood`, both integers, both moved together by `applyHealthDelta`, both decaying via `computeMoodWithDecay`. That conflates three different things. Split them.

| Variable | Range | Driven by | Decays? | Can decrease? |
|---|---|---|---|---|
| **Stage** | 0-7 | Foundation ladder rung (§3.3) | No | **Never.** Monotonic by design. |
| **Vitality** | 0-100 | Trailing 30-day guardrail pass rate, weighted by recency | Slowly, floor 40 | Yes, gently |
| **Energy** | 0-100 | App opens and user actions | Yes, floor 0 | Yes |

**Why the split matters.** Stage is the long-term reward and must be safe, so a bad month cannot undo six good ones. Vitality is the honest signal about recent behavior. Energy is the only thing that responds to app absence, and **low energy must never render as distress**. A sleeping pet is fine. A sad pet because you did not open the app is emotional blackmail, and it is the mechanic that turns "I should check my money" into "I am avoiding that app."

**Revised decay.** Current: 5 points/day after a 24-hour grace, floor 20 ([`backend/src/health/decay.ts`](../backend/src/health/decay.ts)). Proposed: Energy decays 8/day after a **72-hour** grace to floor 0, rendering as the pet napping. Vitality decays 1/day after **14 days** to floor 40. Stage does not decay. Grace extends automatically during a declared "away" period (a one-tap pause, borrowed from Finch's guilt-free pause).

### 5.3 Evolution and progression

Eight stages, mapped one-to-one onto ladder rungs (§3.3). Each stage change is a real visual transformation, not a palette swap, and each unlocks cosmetics.

This is deliberately Finch's structure: Baby, Toddler, Child, Teenager, Adult across five stages with cosmetic unlocks at each ([Finch wiki](https://finch.fandom.com/wiki/Stages_of_Growth)). Our advantage over Finch is that our stages are gated by real financial achievement rather than by activity volume, so a stage means something outside the app. Our risk is that stages are consequently *much* harder to reach. Rung 4 (full emergency fund) could take a real user two years.

**Mitigation, and it is essential: sub-stage progress must be continuously visible.** Each rung shows percentage complete, so the pet visibly changes within a stage (grows slightly, gains a small accessory, changes posture) every ~10% of rung progress. And per the endowed-progress finding, **every rung starts pre-filled with whatever the user already has**, which for most users means rung 1 opens at 30 to 60% rather than 0.

### 5.4 Event taxonomy (complete)

| Event | Class | Animation | Stage impact | Push |
|---|---|---|---|---|
| `paycheck_received` | direct | happy | none | No, unless a goal contribution is due |
| `contribution_made` | direct | happy | rung progress | No |
| `extra_debt_payment` | direct | happy | rung 3 progress | No |
| `debt_cleared` | direct | celebrate | possible rung | **Yes** |
| `ladder_rung_completed` | direct | celebrate + transform | **stage +1** | **Yes** |
| `goal_achieved` | direct | celebrate | none | **Yes** |
| `goal_period_passed` | direct | happy | vitality + | Weekly digest only |
| `goal_period_missed` | direct | neutral | vitality - | **Never** |
| `streak_extended` | direct | happy | vitality + | No |
| `streak_broken` | direct | **neutral** | none | **Never** |
| `overspend_vs_plan` | direct | concerned, once per week max | vitality - | **Never** |
| `large_purchase` | direct | **neutral + question**, not concern | none | No |
| `bill_paid_on_time` | direct | happy | vitality + | No |
| `bill_overdue` | direct | concerned | vitality - | **Yes**, once |
| `subscription_detected` | direct | curious | none | Weekly digest |
| `subscription_cancelled` | direct | celebrate | none | No |
| `connection_added` | direct | happy | rung 0 | No |
| `utilization_high_pre_close` | structural | none | none | **Yes** (the one structural push) |
| `concentration_high` | structural | none | none | No |
| `runway_low` | structural | none | none | Weekly digest |
| `cash_drag_high` | structural | none | none | No |
| `net_worth_milestone` | exogenous | **none** | none | **Never** |
| `credit_score_*` | exogenous | **none** | none | **Never** |
| `crypto_price_*` | exogenous | **none** | none | **Never** |
| `asset_revalued` | exogenous | **none** | none | **Never** |

**Note on `large_purchase`.** The current rule fires `concerned/warning/amber` above a $200 threshold. That is wrong for a product whose users buy things. A $700 purchase might be a flight the user saved for. The pet should ask, not judge: "That was a big one. Planned?" with two taps, "yes" (logs it, no vitality effect) and "not really" (offers to create a goal so the next one is planned). That converts a shame moment into a goal-creation moment, which is the single highest-value conversion in the app.

**Fix the engine.** `evaluate()` in `backend/src/rules/engine.ts` returns on first match. A transaction that is simultaneously a paycheck and a goal contribution produces one event and drops the other. Change to collect all matches, then apply a priority ordering and a per-day event budget so the Activity feed does not flood.

### 5.5 What the pet says

Every reaction copy must satisfy three tests:

1. **Specific.** A number, a name, or a date. Never "you're doing great."
2. **About the behavior, never the person.** "The dining line went over" not "you overspent." Guilt, not shame. This is the exact distinction Gladstone et al. found separates productive from avoidance-inducing financial emotion.
3. **Terminal states are banned.** Every negative reaction ships with a one-tap action. If there is no action, there is no reaction.

### 5.6 Notification policy

Finance apps enjoy the highest push opt-in of any category, roughly 72.3% ([ContextSDK](https://contextsdk.com/blogposts/finance-apps-push-secret-understanding-the-72-3-opt-in-rate-success)), and the way to keep it is restraint: 46% of users opt out after receiving 2 to 5 messages in one week ([Pushwoosh benchmarks](https://www.pushwoosh.com/blog/push-notification-benchmarks/)).

**Hard limits, enforced server-side in the dispatcher, not in the client:**

| Rule | Value |
|---|---|
| Maximum pushes per rolling 7 days | **2** |
| Maximum per day | 1 |
| Minimum gap before the same event type repeats | 24 hours |
| Quiet hours | 21:00 to 08:00 user-local, no exceptions |
| Weekly digest | Sunday 18:00 local. **Opt-in, off by default.** Counts against the 2 when on |

> **Reconciled 2026-08-12.** This table said 3 while §2.3's onboarding copy promised
> "at most twice a week" and `backend/src/store/notifications.ts:9` shipped 2. Settled at
> **2**, for two reasons. The number the user is promised at onboarding is the binding
> one: shipping a cap looser than the promise is a broken promise, and push permission is
> not recoverable once revoked. And the Pushwoosh figure cited above puts the opt-out
> cliff at 2 to 5 messages per week, so 2 sits below it and 3 sits inside it.
>
> The weekly digest becomes opt-in as a consequence. At a cap of 2 a default digest would
> consume half the budget every week for something the user did not ask for, leaving one
> slot for everything that actually happened.
| Timing for the re-engagement nudge | ~23.5 hours after the user's last session, matching their own prior session time, per [Duolingo's mechanic](https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/) |

**Never push, under any circumstance:** any `exogenous` event, a missed goal period, a broken streak, a net worth decrease, a credit score change, a rising debt balance, a single overspend, or any message whose only content is "come back."

**Always push:** rung completion, debt cleared, goal achieved, bill overdue (once), pay-before-close utilization warning.

`backend/src/reactions/dispatch.ts` currently fans out a push for **every** reaction, with the title taken from a static map keyed on animation ("😢 Coiny noticed something"). That is roughly 15 to 40 pushes/week for an active user, half of them about things they cannot control. It must be gated behind a `notification_log`-backed budget before any real user sees it. This is a shipping blocker, not a polish item.

---

## 6. Monetization

### 6.1 The cost floor

`docs/global-integration-map.md` §9 puts per-user-per-month API cost at $0.30 (Plaid only) to about $4 (all integrations), and aggregators price per connection, not per user. A free tier that permits unlimited connections is not a growth strategy, it is a liability. At $4/user/month, 10,000 free users cost $480K/year.

### 6.2 Tiers

> **Revised 2026-08-11.** Prices raised and a household plan added, see
> §6.5. The table below is retained for its reasoning; where it conflicts with
> §6.5, §6.5 wins.

| | **Free** | **Coiny Plus** | **Coiny Complete** |
|---|---|---|---|
| Price | $0 | **$6.99/mo or $59/yr** | **$16.99/mo or $149/yr** |
| Connections | **2** | **8** | Unlimited |
| Asset classes | Bank, cards, crypto wallets, manual | + investments, real estate, vehicles, metals, brokerage aggregation | + all 30, multi-currency, international open banking |
| Net worth history | 30 days | 2 years | Unlimited + export |
| The pet, all stages, all reactions | **Yes** | Yes | Yes |
| Foundation ladder | **Yes, all 8 rungs** | Yes | Yes |
| Target goals | **1** | 3 | 3 + commitment lock |
| Habit guardrails | **2** | All | All |
| Debt payoff plan | Read-only debt-free date | Full plan, simulator, strategy choice, pay-before-close | + consolidation math |
| Portfolio guardrails | No | Concentration + cash drag | All, including currency and custodian |
| Cosmetics | Starter set | Full library | Full + seasonal |

### 6.3 The reasoning, and the two rules that govern it

**Never gate the pet or the ladder.** Fortune City's most-cited complaint is that its core gamification loop is paywalled, which users correctly identify as defeating the purpose ([Product Hunt reviews](https://www.producthunt.com/products/fortune-city-track-your-spending-grow-a-city/reviews)). The pet is the habit loop. Gating it kills the thing we are monetizing. **Gate breadth and depth, never the relationship.**

**Gate on connections, because connections are what cost money.** This is the rare case where the pricing metric and the cost driver are the same variable, which makes the tiers defensible and the margins predictable. Two connections is genuinely useful (a bank and a card, or a bank and a wallet) and costs us under $1/month.

**Price positioning.** Plus at $59/year sits below Origin ($99), Kubera ($250), Monarch ($99 to $199), Copilot ($95) and YNAB ($109), and just below Finch ($69.99), which is the psychological comparison our users will actually make. Complete at $149 undercuts Kubera by 40% while offering strictly more asset classes plus a behavior layer Kubera does not have. RevenueCat's data supports pricing up rather than down: higher-priced apps produce $34.82 monthly realized LTV per payer versus $10.69 for low-priced apps, a 3.3x spread, and convert at a higher median rate (2.8% versus 1.4%) ([RevenueCat 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/)).

**Trial: 14 days, no card required, converting to Free rather than to a lockout.** RevenueCat's data favors card-required hard paywalls (10.7% versus 2.1% day-35 conversion), and trials in the 17 to 32 day band convert at 42.5% median versus 25.5% for trials under 4 days. But those numbers come from apps where value is immediate. Ours compounds: the user needs to hit a rung. A soft landing into a usable free tier protects the pet relationship, which is the asset, and lets us re-convert on the day they try to add connection three.

**No cosmetics-as-primary-revenue, no advances, no lending, no referral fees on financial products, no leaderboards, no data sale.** Cosmetics ship as a retention mechanic inside Plus, not as an à la carte store; à la carte cosmetics ARPU in consumer apps is $1 to $3/year and the merchandising surface it requires would compete with the one-next-step principle.

**Android and iOS pricing must be identical.** Finch's iOS/Android price gap generates disproportionate negative-review volume relative to the revenue it captures.

### 6.4 Unit economics sanity check

At $59/year Plus with an 8-connection cap, worst-case API cost is roughly $2.50/user/month, or $30/year, leaving ~$29 gross before Apple's cut. After Apple's 30% year-one commission that is roughly $11 net. That is thin. Three consequences, all of which should be treated as requirements:

1. **Annual billing must be the default presentation** (Apple drops to 15% after year one, and annual plans avoid twelve chances to churn).
2. **Sync must be scheduled and cached, not live-per-request.** `GET /api/net-worth` currently fans out to every external API on every request. At any real user count this is the dominant cost line and it is entirely avoidable. `docs/global-integration-map.md` §9 already flags this; this PRD escalates it to a **launch blocker**.
3. **Complete at $149 is where the margin is.** Plus is the acquisition tier.

### 6.5 Revised tiers (locked 2026-08-11)

Raised after the August market research: $99 matches Monarch Core and Tiller
exactly, Wealthica already runs four tiers to $250 in this category, and the
$59 tier left roughly $11 per user in year one after Apple's cut. See
`docs/market-research-2026-08.md` §2.

| Tier | Price | Who |
|---|---|---|
| Free | $0 | 2 to 3 connections, 1 goal, 2 guardrails, 30 days of history |
| Individual | **$99/yr** | 12 connections, 3 goals, all guardrails, full debt tooling |
| **Household** | **$169/yr** | Up to 5 members, unlimited connections, portfolio guardrails |

**Household replaces "couples."** Couples is a subset of the real unit.
Households cover partners with joint plus separate accounts, a parent and an
adult child, roommates splitting bills, and someone supporting family abroad,
which every US-built app currently miscategorises as discretionary spending.
Two-person accounts churn materially less than single-user ones across the
whole category, which makes this the strongest retention feature available and
the clearest thing to charge for.

**Household architecture, and the part that must not be got wrong.** Each
member keeps their own private accounts and their own creature. The household
gets a *shared* creature fed only by shared goals and shared guardrails, with
per-account visibility toggles. **Default is that nothing is shared until
someone shares it, and un-sharing is instant and silent.** Get this boundary
wrong and the product becomes a surveillance tool that damages relationships.

### 6.6 Paid features, in build order

1. **Household** (above)
2. **Portfolio guardrails**: concentration, cash drag, liquidity ratio,
   currency exposure, allocation drift. Only possible because we track
   everything, only interesting to someone who has something. This is what
   makes the top tier defensible, and it is what serves the user who finished
   the ladder on day one.
3. **Multi-currency**: native per account, user-selected display currency.
   Monarch, Copilot, Simplifi and Empower do not have it at all.
4. **Export**: scheduled push of net worth history, balances and transactions
   into a spreadsheet the user owns. See §6.7.
5. **Subscription cancellation help**: Finanzguru's model. Subscription
   detection already exists and is unused.
6. **Cosmetics and habitat**: bundled inside the tier as retention, never sold
   à la carte.
7. **The simulator**: savings rate against years to freedom, as a toy.

### 6.7 Export and MCP, replacing the earlier "read-only API" idea

**A developer API is cancelled.** There is no third-party ecosystem waiting to
build on Coiny and creating one is a business we are not in. It would be a
support burden and a security surface with no revenue attached.

Two things underneath it survive, and they are not the same thing.

**Export (build it).** Tiller is a $99/year business built entirely on syncing
bank data into Google Sheets, so the demand is proven and priced. The
spreadsheet holdouts identified in `docs/market-research-2026-08.md` §1.3 are
the loudest segment in this category and their objection is specific: they do
not trust apps to keep working and they want their own copy. A scheduled push
into a sheet the user owns answers that directly and costs us almost nothing,
because the data is already assembled. This is not an API, it is an export on a
timer.

**MCP (later, and worth it).** Let the user's own AI assistant query their
finances: "how much did I spend eating out last quarter", "what is my runway if
I quit". Kubera already shipped this, so it is validated against a $250/year
competitor. It is cheap because the REST API already exists, it demos well, and
it fits the product rather than fighting it: the creature gives the glanceable
state, the assistant answers the specific question, and we avoid building a
chat interface inside our own app that would compete with the one-next-step
principle. It sells nothing on its own; it is a reason a top-tier subscriber
does not churn.

**Security constraints on both, non-negotiable:** aggregates by default with
raw transactions only on explicit opt-in, scoped and revocable and expiring
tokens with a visible list of what is connected, rate limited, fully audit
logged, and never write access.

### 6.8 Never paid

Connection repair, data accuracy, notification quality, account deletion, or
getting your data out. Reliability is never held hostage. The pet, all eight
stages, and the full ladder are never gated.

---

## 6A. Game mechanics (locked 2026-08-11)

### 6A.1 The state model

Three variables, not one mood score. Separating them is what lets the creature
respond to a bad week without ever removing what the user has earned.

| Variable | Driven by | Changes | Regresses? |
|---|---|---|---|
| **Stage** | Ladder rung | Rarely, months apart | **Never** |
| **Vitality** | This week's guardrails | Weekly | Yes, and recovers |
| **Rest** | Whether anything needs doing | Daily | Yes |

### 6A.2 What a rung is, and what it is not

A rung is a **gate**: a condition evaluated from the user's data that must be
satisfied before the next becomes the active focus. "Ladder" is the internal
model, not a picture.

**The creature is not standing on a ladder.** The rung controls *what the
creature is*. Two displays of the same fact: the creature is the ambient
wordless version, the Plan tab is the explicit version as a quiet vertical
sequence with past rungs settled, one active with a real number attached, and
future rungs dimmed until they are close.

**Do not draw a literal ladder, staircase or progress bar.** It fights the art
direction in `docs/design-direction.md`, it looks like every fitness app, and
it makes eight steps read as a chore list.

**Name the rungs for users.** "Rung 4 of 8" is engineering language. "You're on
Buffer" reads as a place rather than a score.

### 6A.3 Ship these four in v1 (~18 hours beyond the goal system)

1. **Evolution through the ladder.** Eight permanent stages. Already in the
   goal system, no extra cost.
2. **Sleep as a success state.** On track and nothing to do means the creature
   rests. Makes "nothing happened" a good outcome rather than an empty screen,
   and stops the app demanding attention it has not earned. This is the direct
   antidote to Finch's documented "one more thing to tend" decay.
3. **Forgiving weekly streaks.** On guardrails only, never on app opens.
   Missing a week costs the streak, not the creature, and a repair restores it.
4. **Milestone artifacts.** A permanent, non-tradeable, non-purchasable object
   per rung cleared. Makes the long game cumulative.

### 6A.4 After a retention signal exists

Seasons (three-month chapters using the fresh-start effect, the real weapon
against month-three decay, but build it once we know whether and when users
decay), molting (clearing a debt shown as the creature shedding what it
carried), the simulator as a toy, and quests generated from real subscription
data.

### 6A.5 Never build

| Mechanic | Why |
|---|---|
| Leaderboards, social comparison | Money shame at scale |
| The creature dying or devolving | Habitica's punishment loop is a documented demotivator, and it lands hardest at the user's worst moment |
| Daily login rewards | Rewards opening the app, not managing money. Exactly Fortune City's inverted incentive |
| Loot boxes, gacha, mystery pets | Gambling mechanics adjacent to real money |
| Anything triggered by spending | Robinhood confetti, and a $7.5M Massachusetts settlement |

The rule underneath all of it: **whatever the creature rewards, people do more
of.** So it rewards money moving in the right direction, and nothing else.

---

## 7. Roadmap

### Next 4 weeks: make the goal system exist

The bar is: a user can link one account, see a net worth number, get placed on the ladder, and complete rung 1.

1. `net_worth_daily` table plus a nightly snapshot job. Blocks everything.
2. Fix `savingsRate` in `backend/src/store/transactions.ts` to exclude transfers and internal credits. Currently every credit over $50 counts as income.
3. `ladder_state` + `goals` + `goal_periods` tables; ladder engine computing rungs 0 through 4.
4. Onboarding rewrite per §2.3: declaration grid, sliders, the number, one Plaid connection, hatch. Delete the name-entry screen.
5. Notification budget in `dispatch.ts`. Shipping blocker.
6. Strip `exogenous` events from the pet per §5.1.
7. New **Plan** tab: ladder, one target goal, two guardrails.

Explicitly **not** in these four weeks: the 10 missing asset sections from `handoff.md` Priority 1, the Android app, hardware, cosmetics. The Wealth tab is already ahead of the rest of the product.

### 3 months: make it worth paying for

8. Debt module end to end: dedupe, merged `debt_accounts`, Blend/avalanche/snowball, payoff projection, extra-payment simulator, pay-before-close reminder.
9. Scheduled sync and cached net worth. Cost blocker.
10. Three target goals with run-rate and on-pace math; recurring contribution rules; sinking funds.
11. Full habit guardrails with weekly streaks and repair savers.
12. Stages 0 through 5 with real art. This is the first spend that requires a contractor, and it should be commissioned in week 5, not week 12.
13. Paywall, RevenueCat, tiers per §6.
14. TestFlight to 30 people, recruited for the Maya and Deven archetypes specifically.

### 6 months: depth and the differentiators nobody else has

15. Portfolio guardrails (§3.6): concentration, cash drag, illiquidity, custodian.
16. Multi-currency data model per `global-integration-map.md` §11 item 1, plus Enable Banking for EU/UK. This is what makes Coiny globally viable and it is self-serve today.
17. Index-based property and vehicle valuation, replacing the per-country AVM treadmill.
18. Widgets and Live Activities. The pet on the home screen is the closest software analogue to the device thesis and costs 1% of the hardware effort.
19. Connector interface refactor (`global-integration-map.md` §10) before adding any more regions.
20. Android to parity.
21. Stages 6 and 7, cosmetics library, seasonal events.

### Where hardware re-enters

**Gate: 1,000 paying subscribers, or a signed HAX/SOSV term sheet, whichever comes first.**

Until that gate, hardware work is limited to keeping `firmware/` compiling and the BLE GATT skeleton alive, which is roughly where it is today. Rationale:

- The app must prove the pet mechanic *works* before we spend $50K to $200K putting it in plastic. `docs/business-plan.md` correctly identifies "pet reactions aren't compelling enough" as the core design risk. That risk is testable for $0 in software and is not testable at all in hardware until after tooling.
- The device is a *better display* for a loop that must already exist. It is not the loop.
- A hardware campaign with 1,000 paying subscribers behind it is a fundamentally different Kickstarter than one with a prototype and a waitlist.

When it returns, the framing changes: not "buy the device, get the app," but "you already have the pet, now it can live on your desk." That is a far easier sell and it inverts the risk.

**Consequence for `docs/product-brief.md` §7:** the device-vs-phone question resolves to **phone-primary, device-secondary**. Recommend recording that as a locked Design Decision C.

---

## 8. Open questions for the founder

Each has a recommendation. Each needs a decision before the 4-week block starts.

**Q1. Does the app-first pivot mean hardware is deferred, or dropped?**
*Recommendation: deferred, with a written numeric gate (1,000 paying subs).* An undated "later" becomes a permanent distraction that quietly shapes every architectural choice. A number ends the argument.

**Q2. Is the 71% churn claim staying in the business plan and fundraising deck?**
*Recommendation: remove it.* It could not be traced to a finance-specific primary source and the best available finance-category data points the other way. A sophisticated investor who checks the citation will find nothing, and that costs more than the stat gains. Replace with the specific contested-benchmark framing in §0.

**Q3. Do we cap active target goals at three?**
*Recommendation: yes, hard cap.* Concentration beats dispersal in the debt research and there is no reason to think savings differs. Users will ask for more. The answer is "finish one."

**Q4. Do we build the manual-declaration onboarding, given it produces "wrong" numbers?**
*Recommendation: yes, and label confidence per line.* A user's net worth being 8% off on day one, with a clear path to precision, is infinitely better than the user never seeing it. Every alternative requires 6+ authentications before first value.

**Q5. Does the free tier get the pet and the full ladder?**
*Recommendation: yes.* Fortune City's paywall-the-loop mistake is the clearest documented anti-pattern in the competitive set. Gate connections, not the relationship.

**Q6. Kill the market-reaction events?**
*Recommendation: yes, immediately, before TestFlight.* This is the one item where I would override a founder objection. The mechanic is a documented harm vector, the SEC has sanctioned a company over its close cousin, and it trains exactly the avoidance behavior the product exists to break. It is also four deleted cases in `external.ts`.

**Q7. Snowball, avalanche, or Blend as the default?**
*Recommendation: Blend, with the dollar cost of the choice always visible.* Pure snowball costs real money and the research supports the early-win *count*, not smallest-first specifically. Blend captures the win where it is cheap and defers to the math where it is not.

**Q8. Do we ask for statement close dates?**
*Recommendation: yes.* It is the only manual input in the product that earns its friction, it powers a feature no competitor ships, and it produces a visible credit score improvement, which is the most shareable outcome we can generate.

**Q9. Price: $59 or $69 for Plus?**
*Recommendation: $59/year, $6.99/month.* Sitting just under Finch's $69.99 is deliberate: Finch is the comparison our users will actually make, and being cheaper than the self-care app while doing something financially consequential is a strong position. Revisit after the first 500 subscribers with real conversion data.

**Q10. Who are the first 30 testers?**
*Recommendation: recruit Maya and Deven explicitly, 15 each, and do not recruit friends.* Friends will not tell you the pet is annoying. Recruit through r/personalfinance and r/financialindependence, which map almost exactly onto the two archetypes.

**Q11. Does Coiny ever say the word "advice"?**
*Recommendation: no, and treat this as a copy rule with a lint check.* Debt sequencing, savings rates and budgeting carry no Advisers Act exposure. Anything touching securities must be phrased as an observation about the user's own data with a link to third-party education, never as a recommendation. The distinction is cheap to maintain now and expensive to retrofit.

**Q12. Product brief: rewrite it, or retire it?**
*Recommendation: retire it and point `CLAUDE.md` at this document.* Sections 1 through 9 of `product-brief.md` are answered here. Its two locked Design Decisions should be moved into this file, joined by Decision C (phone-primary) from §7.

---

## Appendix A: what changes in the existing code

| File | Change | Priority |
|---|---|---|
| `backend/src/db/schema.ts` | Add `net_worth_daily`, `goals`, `goal_periods`, `ladder_state`, `debt_accounts`, `pet_progression`, `notification_log`. Deprecate 4 goal columns on `pet_state`. | P0 |
| `backend/src/store/transactions.ts` | `getSpendingSummary` counts any credit ≥$50 as income. Exclude transfers, refunds, card payments. | P0 |
| `backend/src/reactions/external.ts` | Delete `crypto_price_surge`, `crypto_price_drop`. Downgrade `net_worth_milestone`, `credit_score_*` to non-reacting. | P0 |
| `backend/src/reactions/dispatch.ts` | Every reaction currently sends a push. Add budget, quiet hours, allowlist. | P0 |
| `backend/src/rules/engine.ts` | `evaluate()` returns first match only. Collect all, prioritize, budget. | P1 |
| `backend/src/rules/definitions.ts` | Rewrite against the goal system. `large_purchase` becomes a question, not a concern. | P1 |
| `backend/src/api/net-worth.ts` | Live fan-out on every request. Move to scheduled sync + cache. Also: Spinwheel and Plaid debts double-count. | P1 |
| `backend/src/health/decay.ts` | Split into Stage / Vitality / Energy per §5.2. | P1 |
| `ios/Coiny/Views/OnboardingView.swift` | Full rewrite per §2.3. Delete `EnterNamePage`. | P0 |
| `ios/Coiny/Views/` | New `PlanView` + ladder, goal, guardrail components. | P0 |
| `ios/Coiny/Views/NetWorthView*.swift` | Collapse ~27 asset sections into 6 disclosure groups. | P2 |
| `ios/Coiny/Views/SettingsView.swift` | Remove the goals section; goals move to Plan. | P1 |

## Appendix B: research caveats worth carrying forward

Three numbers in circulation around this product do not survive checking, and should not appear in investor materials:

1. **"71% of budgeting app users churn in 90 days."** No finance-specific primary source found. Likely the inverse of a generic cross-category retention figure. Finance-category data is contested and ranges from 65% 90-day *retention* ([Alchemer via Sendbird](https://sendbird.com/blog/finance-and-payment-app-retention)) to single-digit D30 in some Adjust cuts ([summary](https://semnexus.com/mobile-app-retention-benchmarks-by-category-2026)). The spread is a bucketing artifact: neobanks behave nothing like budgeting apps.
2. **"Gamification increases savings ~22%."** Traces to a single 331-person, 4-week RCT at Bayes Business School finding roughly 20% greater goal achievement ([Bayes](https://www.bayes.citystgeorges.ac.uk/news-and-events/news/2022/january/turning-long-term-savings-goals-into-a-game-can-increase-consumer-financial-well-being)). Real, small, unreplicated. The commitment-device and mental-accounting evidence is an order of magnitude stronger and should carry the product thesis.
3. **YNAB's "$600 in month one, $6,000 in year one."** Self-reported and unaudited from [YNAB's own stats page](https://www.ynab.com/campaign/ynab-stats). Fine as a competitor observation, not as a benchmark to promise against.
