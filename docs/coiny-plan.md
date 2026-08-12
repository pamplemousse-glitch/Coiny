# Coiny — Business & Fundraising Plan

*Last updated: June 2026. All market figures cited inline with sources.*

---

## 1. What We're Building

Coiny is a physical desk/pocket device that reacts to your real financial behavior. It connects to your bank via Plaid and responds in real time — overspend and your pet looks worried, hit a savings goal and it celebrates. No app to open. No dashboard to check.

**The core insight:** 71% of budgeting app users abandon them within 90 days because opening the app requires willpower. A device sitting on your desk requires none. Physical presence solves the activation energy problem that has killed every budgeting app.

No direct hardware competitor exists. The category is genuinely greenfield.

---

## 2. The Problem

Personal finance apps have a retention crisis. Not because the math is wrong — because opening the app requires willpower, and willpower runs out.

The apps that exist fall into two failure modes:

- **Dashboard apps** (Monarch, Copilot, YNAB): beautiful, accurate, and ignored. You check them once a week if you're disciplined. You stop checking when you're not.
- **Gamified apps** (Habitica, Fortune City): engaging at first, require manual input, drift into irrelevance.

Meanwhile, the target demographic — Gen Z and younger millennials — reports the highest financial anxiety of any generation on record:

- **48% don't feel financially secure** (up 60% in one year per Deloitte 2025)
- **62% are financially stressed more than 3 days per week**
- **72% took steps to improve financial health** in the last year — but more than half are still living paycheck to paycheck
- **71% of all app users churn within 90 days**; traditional fintech retains only 16% annually

The demand is there. The behavior change isn't sticking.

---

## 3. The Product

### Hardware
A small BLE-connected carry/desk device with:
- E-ink or OLED display (pet face with expressions)
- RGB LED ring
- Haptic motor
- Speaker (reaction sounds)
- Rechargeable battery

Form factor: pocket-sized, desk-friendly. Closer to a Tamagotchi than a smartwatch. Tech stack: nRF52840 + Zephyr RTOS — low power draw, reliable BLE.

### Software
- **Backend**: Node.js (Fastify) — Plaid integration, transaction processing, financial rules engine, REST API. Running on Fly.io.
- **iOS app**: Native Swift + SwiftUI — Plaid Link, pet state, activity feed, wealth dashboard.
- **Android app**: Kotlin + Jetpack Compose — in progress.
- **Rules engine**: Translates financial events (overspend, paycheck, savings milestone, bill due) into pet reactions (face, LED color, vibration, sound).

### Current Build State
- **Backend**: fully built. Plaid integration, 15+ data vendor integrations (investments, crypto, real estate, vehicles, metals, trading cards, energy, farmland), net worth calculation, spending analysis. ~830 tests.
- **iOS**: auth, pet screen, activity feed, wealth dashboard — functional.
- **Android**: scaffold built, auth + wealth tab in progress.
- **Hardware**: not yet built. Parts sourced, firmware planned for Phase 2.

---

## 4. Market

### Total Addressable Market
The personal finance app market: **$165.9B in 2025 → $507B by 2030** (25.2% CAGR). The gamified fintech segment alone is projected to grow from $15B to $48B by 2029.

Sources: [Business Research Insights](https://www.businessresearchinsights.com/market-reports/personal-finance-app-market-117811), [The Business Research Company](https://www.thebusinessresearchcompany.com/report/personal-finance-apps-global-market-report)

### Target User
22–35-year-olds who:
- Have tried budgeting apps and given up
- Feel financially anxious but not broke
- Already buy emotional comfort objects (the Labubu/Jellycat demographic)

The same user spending $50 on a Labubu to manage anxiety is the user who would buy Coiny. Adults 18+ spent **$1.8B on toys in Q1 2025 alone**. The emotional object market is a direct proof of concept for Coiny's value proposition at mass scale.

### Why Now
1. **Mint shut down March 2024** — 3M+ displaced users with no engaging replacement.
2. **ChatGPT entered personal finance May 2026** — AI analysis is now a commodity. The physical + emotional dimension is the last uncrowded moat.
3. **Gen Z financial anxiety at an all-time high** — the pain is acute, the solutions aren't landing.

### SAM
~8–12M US users willing to spend on a physical finance companion device → **$400M–1.2B SAM** (at $79 early-bird hardware + $60/year subscription). Scales to $1.5–2B including UK, Canada, Australia.

### SOM (3-year projection)

| Year | Units Sold | Revenue (Hardware + Sub) | Notes |
|------|-----------|--------------------------|-------|
| Y1 | 2,000–5,000 | $200K–$650K | Kickstarter backers + waitlist + press |
| Y2 | 15,000–30,000 | $1.5M–$3.5M | DTC + 1–2 retail partners |
| Y3 | 50,000–100,000 | $5M–$14M | B2B wellness pilots + scale |

Assumptions: $99 blended hardware ASP (early-bird $79 / retail $129), $5/month subscription, 40% attach rate Y1 rising to 65% by Y3.

**SOM: $6–10M ARR by end of Year 3** without institutional-scale distribution.

---

## 5. Comparable Companies

| Company | Relevance | Key Data Point |
|---------|-----------|----------------|
| **Tamagotchi / Bandai** | Closest form-factor analog | 100M lifetime units, 7–8M/year, "kidult" market driving growth |
| **Oura Ring** | Business model template (hardware + sub) | $1B revenue 2025, $11B valuation, >80% annual renewal |
| **WHOOP** | Subscription-first model proof | $979M raised, $10.1B valuation — users pay monthly for behavioral insights |
| **Cleo** | Emotional finance engagement proof | 7M+ users, $500M valuation — Gen Z engages with finance when it has personality |
| **Finch** | Self-care pet mechanic proof | 10M+ downloads — caring for a pet = caring for yourself, works in pure software |
| **Qapital** | Behavioral finance mechanic proof | 2M+ users — rules-based nudges change savings behavior in 25–40 cohort |
| **Pebble** | Crowdfunding precedent | Kickstarter raised $10M (goal: $500K) → VC funded scale |

---

## 6. Business Model

### Pricing
- **Hardware:** $79 early-bird / $129 retail
- **Subscription:** $4.99–$7.99/month — Plaid connection, cloud sync, pet customization, advanced insights
- **Free tier:** Basic pet reactions work without subscription — hardware never dies when you cancel, experience degrades gracefully

### Revenue Model
**Primary:** Hardware sale + optional subscription (Option A — mirrors Oura's DTC trajectory)
**Additive:** Cosmetic in-app purchases (pet skins, sound packs, LED themes at $1.99–$4.99)
**Phase 3:** B2B wellness/HR benefit ($25–40/unit wholesale + $2/user/month license)

### Unit Economics
- Hardware BOM target: $25–35 at volume → 60–70% gross margin at $79–129 ASP
- Subscription LTV (12 months at $5/month): ~$60
- Combined Year-1 LTV: ~$140–190
- CAC target: <$30 via organic/community channels

### Year 3 Projection
100K devices at $99 blended ASP = $9.9M hardware + 65K subscribers at $60/year = $3.9M ARR. Total: ~$13.8M.

---

## 7. Fundraising Path

### Business Entity
**Delaware C-Corp** — not an LLC. Required for VC preferred stock, employee ISOs, hardware manufacturing loans, and API partnerships.

Setup: Stripe Atlas or Clerky (~$500, a few days). Annual overhead: ~$400–500 Delaware franchise tax + $50 annual report. Name change later is easy ($50–200 amendment, EIN stays the same).

**This is the first action — incorporate before anything else.** You need it to split equity legally, open a business bank account, and be eligible for the programs below.

---

### Stage 1 — Pre-seed (now, 0–6 months)
**Raise:** $500K–1M

**Best fit: SOSV/HAX** (hax.co) — invests $500K at inception specifically in hardware + software startups. 4–6 month acceleration program. The most directly relevant program for Coiny.

**Other sources:** Angels with fintech or hardware background.

**What to show:** Working iOS app + Plaid integration + prototype device reacting to real transactions. The demo sells itself.

**Use of funds:** Prototype iteration, first small batch (50–100 units), Plaid production approval groundwork, compliance counsel.

---

### Stage 2 — Kickstarter (~6–12 months, after working prototype)
**Goal:** $300–500K (conservative — let oversubscription generate press)

**Purpose:** Manufacturing validation + community building. A supplement to pre-seed VC, not the primary capital source.

**What makes it work:**
- Working demo video (not renders — real reactions to real transactions)
- First 48 hours critical — need early backer momentum to hit homepage
- Early-bird at $79 vs $129 retail creates urgency
- Lead with the device experience (animations, haptics, sound) — bank connection is the engine, not the headline
- Security messaging front and center (read-only access, no credentials stored)

**Real risks to plan for:**
- Backers expect delivery in 6–12 months — hardware + fintech compliance in parallel is brutal
- Median hardware Kickstarter nets ~$210K after fees — not enough alone for real manufacturing
- Fintech regulatory timeline doesn't move on a Kickstarter schedule

**Use of funds:** First manufacturing tooling run, packaging, first 500–1,000 units for backers.

---

### Stage 3 — Seed (~6–12 months post-Kickstarter)
**Raise:** $2–4M

**From:** Floodgate, First Round, Initialized, Felicis, Forerunner, GGV

**What investors want to see:**
- Working product in real users' hands
- Retention data (do people keep using it after week 1?)
- Unit economics tracked (CAC vs LTV)
- Manufacturing path de-risked (first tooling run complete)
- Plaid production approval in progress

**Use of funds:** Manufacturing tooling (injection mold: $20–50K), first production run (1K–5K units), Plaid production approval, compliance framework, small team.

---

### Stage 4 — Series A (~18–24 months)
**Raise:** $10–15M

**From:** a16z, Sequoia, Lightspeed, Bessemer, Index

**What investors want to see:**
- 10K+ units shipped
- CAC < 1/5 LTV
- Subscription revenue established
- Full regulatory compliance (GLBA, CCPA, SOC 2 Type 2 in progress)
- Team with hardware + fintech domain expertise

**Use of funds:** Scaled manufacturing (10K–50K units), full team (EE, firmware, iOS/Android, backend, compliance), global distribution.

---

### Hardware-Focused Investor Landscape

| Fund | Focus | Notes |
|------|-------|-------|
| **SOSV / HAX** | Hardware + software | $500K at inception — most relevant now |
| **Forerunner Ventures** | Consumer products, wearables | Oura investor |
| **GGV Capital** | Consumer tech, hardware | Tile + Oura investor |
| **Monozukuri Ventures** | Hardware, IoT, wearables | Hardware-specialist fund |
| **Khosla Ventures** | Deep tech, hardware | Broad hardware mandate |
| **Lightspeed** | Multi-stage | Wearables expertise |

### Equity Dilution Expectations

| Round | Typical dilution | Founder ownership after |
|-------|-----------------|------------------------|
| Pre-seed | 10–15% | ~85–90% |
| Seed | 15–20% | ~65–75% |
| Series A | 20–25% | ~50–55% |

Hardware startups dilute more than pure software due to capital requirements. Option pool (~20% for future employees) comes out of founder equity before investor dilution is calculated — factor this into the equity split conversation with your cofounder.

---

## 8. Team

**Antoine Wiley** — product vision, full-stack development. Built the backend, iOS app, Android scaffold. Domain: product instincts, financial integrations, rules engine.

**Jack [Last Name]** — technical cofounder. [Fill in: firmware, mobile, backend, infra — whichever lanes Jack owns.]

**Before incorporating, agree on:**
- Equity split
- Vesting: 4 years, 1-year cliff (standard)
- Roles: who owns what

**Future hires (not immediate):**
- Hardware engineer / EE with BLE + embedded experience
- Industrial designer for the physical form factor
- Community / early customer success

---

## 9. Risks

| Risk | Mitigation |
|------|-----------|
| Hardware is hard | Start with 100–500 unit Kickstarter run. Prove the loop before committing to mass manufacturing. |
| Hardware + fintech compliance in parallel | Plan 12–24 months for Plaid production approval + GLBA/CCPA/SOC 2. Don't promise fintech features on a hardware timeline. |
| Plaid dependency | Plaid powers 8,000+ apps, 12,000+ institutions. Infrastructure-level, not a single vendor. |
| Big tech copies the app layer | The physical device is the moat. An app is copyable in a week; a hardware product with community attachment is not. |
| Pet reactions aren't compelling enough | Core design risk. Validated by 20-person beta before any manufacturing commitment. |
| Regulatory (financial product) | Coiny doesn't hold funds, give financial advice, or execute trades. Display layer only. Low surface. |

---

## 10. Investor Pitch Angles

**The behavioral finance gap:** Every major fintech app has the same problem — 70–80% of users disengage within 90 days. Physical, tangible nudges outperform digital notifications for habit change. Coiny creates an always-present ambient feedback loop that a phone screen cannot replicate.

**Gen Z financial anxiety is structurally unsolved:** Financial insecurity among Gen Z surged from 30% to 48% in a single year (Deloitte 2025, 23,000+ respondents). Every existing product pitches "more information." Coiny pitches "less anxiety."

**Physical objects win on retention:** Apps can be deleted in three seconds. A device on your desk cannot be uninstalled. Oura's >80% annual renewal rate and Tamagotchi's 100M units sold prove physical form factors create stickier relationships.

**The kidult + fintech timing convergence:** Three independent trends converging: (1) Tamagotchi revival at 100M units with kidult demand, (2) Gen Z financial anxiety at a cultural inflection point, (3) gamification fintech growing from $15B to $48B by 2029. Coiny sits at the center of all three.

**Hardware + subscription = proven investor narrative:** Oura ($11B valuation, IPO filing May 2026) and WHOOP ($10.1B) have validated the model. Coiny applies the same architecture to financial wellness — a category larger and more universal than sleep or fitness tracking.

---

## 11. Immediate Next Steps

1. **Incorporate as Delaware C-Corp** — Stripe Atlas or Clerky (~$500, this week). Agree on equity split and vesting with Jack first.
2. **Polish iOS + Android** to demo quality.
3. **Build hardware prototype** — first unit, proves the physical feedback loop.
4. **20-person beta** — structured feedback, validates the emotional hook.
5. **Apply to SOSV/HAX** (hax.co) — the working demo is the pitch.
6. **Kickstarter campaign** — after prototype, $300–500K goal, community-first.

---

*Sources cited inline throughout. All market figures from 2024–2026 research unless otherwise noted.*
