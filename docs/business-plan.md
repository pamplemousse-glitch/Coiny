# Coiny — Business Plan

*Last updated: June 2026. All market figures cited inline with sources.*

---

## 0. What This Is

Coiny is a physical desk/pocket device that reacts to your real financial behavior. It connects to your bank via Plaid and responds in real time — overspend and your pet looks worried, hit a savings goal and it celebrates. No app to open. No dashboard to check.

**The core insight:** 71% of budgeting app users abandon them within 90 days because opening the app requires willpower. A device sitting on your desk requires none. Physical presence solves the activation energy problem that has killed every budgeting app.

No direct hardware competitor exists. The category is genuinely greenfield.

---

## Current Product State

**What's already built:**
- Backend (Node.js / Fastify): Plaid integration, transaction processing, financial rules engine, net worth calculation, 15+ data vendor integrations (investments, crypto, real estate, vehicles, metals, trading cards, energy, farmland). ~830 tests. Running on Fly.io.
- iOS app (Swift / SwiftUI): auth, pet screen, activity feed, wealth dashboard — functional.
- Android app (Kotlin / Compose): scaffold built, auth + wealth tab in progress.

**What's not built yet:**
- Hardware — parts sourced, firmware planned (nRF52840 + Zephyr RTOS). This is Phase 2.

---

## Team

**Antoine Wiley** — product vision, full-stack development. Built the backend, iOS app, Android scaffold. Domain: product instincts, financial integrations, rules engine.

**Jack [Last Name]** — technical cofounder. [Fill in: firmware, mobile, backend, infra — whatever Jack's lanes are.]

**To incorporate, we need to agree on:**
- Equity split
- Vesting: standard is 4 years, 1-year cliff
- Roles: who owns what area (firmware, mobile, backend, product, etc.)
- The 6-month test: working hardware prototype + 20-person beta, then decide whether to go all-in

Incorporate as Delaware C-Corp via Stripe Atlas or Clerky (~$500, a few days). This is the first action — not the last. We need it to split equity legally, open a business bank account, and be eligible for VC investment or accelerator programs.

---

## What We Need to Get to First Revenue

In order:

1. **Incorporate** — Delaware C-Corp via Stripe Atlas/Clerky. Do this now, before anything else.
2. iOS + Android polished to demo quality
3. Hardware prototype (first unit — proves the physical feedback loop)
4. 20-person beta with structured feedback
5. **Apply to SOSV/HAX** (hax.co) — $500K pre-seed for hardware+software startups at inception. The working demo is the pitch. This funds the manufacturing run so we don't depend on Kickstarter alone.
6. **Kickstarter** ($300–500K goal) — after prototype exists. Community building + manufacturing validation. Not the primary capital source — supplements pre-seed.

Steps 2–4 are buildable with what we have before raising anything.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Hardware is hard | Start with 100–500 unit Kickstarter run. Don't over-commit to manufacturing before demand is validated. |
| Plaid dependency | Plaid powers 8,000+ apps and 12,000+ institutions. Infrastructure-level, not a single vendor. |
| Big tech copies the app layer | The physical device is the moat. An app is copyable in a week. A hardware product with community attachment is not. |
| Pet reactions aren't compelling enough | This is the core design risk. Validated by 20-person beta before any manufacturing commitment. |
| Regulatory | Coiny doesn't hold funds, give financial advice, or execute trades. Display layer only. Low surface. |

---

---

## 1. Market Sizing

Coiny sits at the intersection of three markets: personal finance tools, consumer wellness hardware, and behavioral gamification. The framing below builds a credible TAM/SAM/SOM using a bottom-up approach anchored in defensible public data.

### 1.1 TAM — Total Addressable Market

**Personal finance apps (global):** Multiple research firms put this market between $31B and $166B in 2025, depending on whether broader digital banking infrastructure is included. A conservative mid-point is $38B in 2026 growing at roughly 20% CAGR through 2035. ([Business Research Insights](https://www.businessresearchinsights.com/market-reports/personal-finance-app-market-117811), [The Business Research Company](https://www.thebusinessresearchcompany.com/report/personal-finance-apps-global-market-report))

**Wearable consumer technology (global):** The wearable technology market is valued at approximately $85–93B in 2025 across multiple research sources, projected to reach $176B by 2030 at a CAGR of ~15.9%. ([Grand View Research](https://www.grandviewresearch.com/industry-analysis/wearable-technology-market), [MarketsandMarkets](https://www.marketsandmarkets.com/Market-Reports/wearable-electronics-market-983.html))

**Financial wellness programs (B2B, global):** The corporate financial wellness market was $2.34B in 2024, growing to an estimated $5.21B by 2033 at 9.3% CAGR. ([Verified Market Research](https://www.verifiedmarketresearch.com/product/financial-wellness-benefits-market/))

**Gamification in fintech (global):** The gamified fintech market is projected to grow from $15.43B in 2024 to $48B by 2029. ([GMInsights](https://www.gminsights.com/industry-analysis/financial-wellness-software-market))

**Combined TAM:** Coiny competes in an overlapping space of physical consumer gadgets + behavioral finance software. The most defensible combined TAM is approximately **$120–150B** globally (wearable consumer electronics intersecting with personal finance app users), with fintech gamification as the fastest-growing sub-segment. This figure is intentionally conservative: it excludes investment platforms, neo-banks, and broader consumer electronics.

### 1.2 SAM — Serviceable Addressable Market

Coiny's addressable segment is narrower: English-speaking markets (US, UK, Canada, Australia) with Plaid coverage, smartphone ownership, and disposable income for discretionary gadgets. Practically, this is the 18–35 cohort in the US and UK who:

- Use at least one personal finance app or budgeting tool
- Have expressed interest in financial wellness or gamified savings
- Are open to purchasing a physical accessory priced $79–$129

**US personal finance app users (18–35):** Approximately 80M Americans use mobile banking or budgeting apps. The 18–35 cohort represents roughly 30% of the adult population (≈75M people), with smartphone penetration near 98%. Even conservative estimates put active personal finance app users in the target age group at 20–25M.

**Tamagotchi / collector gadget buyers:** Bandai's Tamagotchi reached 100M lifetime shipments in 2025, with 33% of global sales in the US, and 7–8M units sold annually by 2026. ([Japan Times](https://www.japantimes.co.jp/business/2025/09/02/companies/tamagotchi-100-million/), [NSS Magazine](https://www.nssmag.com/en/lifestyle/38204/tamagotchi-y2k-nostalgia-100-millions-sales)) This signals a proven, sustained demand for nostalgic physical companion devices — Coiny's closest analog in form factor.

**SAM estimate:** ~8–12M US users willing to spend on a physical finance companion device, generating an SAM of roughly **$400M–1.2B** (at $79 early-bird hardware + $60/year subscription per user across the addressable cohort). This scales to $1.5–2B including UK, Canada, and Australia.

### 1.3 SOM — Serviceable Obtainable Market (3-year)

In the first three years (prototype → commercial launch → scale), a realistic obtainable share is based on hardware unit economics similar to early Oura Ring or Tamagotchi relaunch trajectories:

| Year | Units Sold | Revenue (Hardware + Sub) | Notes |
|------|-----------|--------------------------|-------|
| Y1 (waitlist + launch) | 2,000–5,000 | $120K–$500K | Prototype backers, waitlist, press coverage |
| Y2 (retail + DTC) | 15,000–30,000 | $900K–$2.4M | DTC + 1–2 retail partners |
| Y3 (scale) | 50,000–100,000 | $3M–$8M | B2B wellness pilots + scale |

Assumptions: $99 hardware ASP blended (early-bird $79 / retail $129), $5/month subscription with ~40% attach rate in Y1 rising to 65% by Y3. These unit economics are conservative relative to Oura ($299–$499 hardware, $6/month subscription, 80% renewal rate after year 1).

**SOM: $6–10M ARR by end of Year 3** is achievable without institutional-scale distribution.

---

## 2. Comparable Products & Companies

### 2.1 Tamagotchi / Bandai Namco
The most direct form-factor comparable. Tamagotchi reached 100M lifetime shipments in 2025, with annual run-rate of 7–8M units. Sales doubled from 2022 to 2023 on nostalgia + "kidult" demand. The key signal: younger buyers who never owned the original are now buying it, demonstrating the form factor has cross-generational pull. Bandai opened its first UK retail store in 2025. ([MarketScreener](https://www.marketscreener.com/quote/stock/BANDAI-NAMCO-HOLDINGS-INC-6497993/news/Tamagotchi-is-all-the-way-back-iconic-toy-soars-in-global-sales-and-opens-first-store-in-Britain-47913155/)) Coiny's differentiation: live bank data replaces artificial hunger stats. The stakes are real.

### 2.2 Oura Ring
The most relevant business model comparable for hardware + subscription. Oura generated $1B in revenue in 2025 (100% YoY growth), with ~2M paying subscribers at $6/month. Hardware drives ~80% of revenue; subscription is ~20% but growing faster. Valuation reached $11B in October 2025 with a confidential IPO filing in May 2026. ([CNBC](https://www.cnbc.com/2025/10/14/oura-ringmaker-valuation-fundraise.html), [Sacra](https://sacra.com/c/oura/)) Key investor lesson: the hardware-plus-subscription flywheel is validated at scale. Retention matters: Oura reports >80% renewal after year one.

### 2.3 WHOOP
Whoop's model inverts Oura: hardware is free, subscription ($30/month or annual) is the entire business. Raised $575M at a $10.1B valuation. The model proves users will pay recurring fees for behavioral health insights if the engagement is high enough. ([Ringing the Bell / Substack](https://ringingthebell.substack.com/p/whoop-vs-oura-the-10-billion-question)) Coiny's relevance: financial behavior change has the same high-engagement potential as fitness tracking. The question is whether users will pay monthly for a financial pet.

### 2.4 Finch (Mental Health / Self-Care App)
Finch is a "self-care pet" app where you care for a digital bird by completing mental health check-ins and wellness goals. Finch passed 10M downloads and has consistently ranked in the App Store's Health & Fitness top charts. It demonstrates that the emotional attachment mechanic (caring for a pet = caring for yourself) works in a pure-software format. Coiny applies the same mechanic to financial behavior and adds a physical artifact.

### 2.5 Cleo
An AI-powered financial assistant with a sassy, anthropomorphized personality. Cleo has 7M+ users and raised at a $500M valuation. It proves Gen Z will engage with a finance product that has a distinct voice and makes money feel less scary. Coiny's differentiation: the physical object creates a presence in real life that an app cannot.

### 2.6 Qapital
A savings app that uses behavioral nudges and rules-based automation (e.g., "round up every coffee purchase to savings"). Qapital has 2M+ users. Demonstrates that behavioral finance mechanics drive real savings behavior change in the 25–40 cohort. ([NYU Stern Fintech Nudges](https://www.stern.nyu.edu/experience-stern/about/departments-centers-initiatives/centers-of-research/fubon-center-technology-business-and-innovation/research/research-papers/doctoral-fellow-research/fintech-nudges))

### 2.7 LearnLux / BrightDime (B2B Financial Wellness)
LearnLux (gamified financial wellness for employers) and BrightDime (AI-driven debt management) represent the B2B channel. The employer financial wellness software market is projected to grow from $2.33B in 2024 to $2.67B in 2025 at 14.4% CAGR. ([GM Insights](https://www.gminsights.com/industry-analysis/financial-wellness-software-market)) Coiny could enter this market as a physical benefit device distributed by HR departments — the novelty value alone drives adoption.

---

## 3. Investor Pitch Angles

### Angle 1: The Behavioral Finance Gap
Every major fintech app (Mint, YNAB, Copilot) has the same problem: 70–80% of users disengage within 90 days. The data is there. The engagement is not. Behavioral economics research shows that physical, tangible nudges outperform digital notifications for habit change — the same reason cash-in-hand feels more "real" than a credit card. Coiny creates an always-present ambient financial feedback loop that a phone screen cannot. The pet dying is a more powerful emotional cue than a push notification. Source: research on overspending nudges shows recipients spent C$8.15 (5.4% of daily average) less the day after receiving a personalized message — Coiny delivers this nudge through emotional attachment, not a banner. ([NYU Stern](https://www.stern.nyu.edu/experience-stern/about/departments-centers-initiatives/centers-of-research/fubon-center-technology-business-and-innovation/research/research-papers/doctoral-fellow-research/fintech-nudges))

### Angle 2: Gen Z Financial Anxiety Is Structurally Unsolved
70% of Gen Z cannot sleep due to financial anxiety. Financial insecurity among Gen Z surged from 30% to 48% in a single year (Deloitte 2025 survey, 23,000+ respondents). 33% avoid thinking about their finances entirely when stressed. ([Fortune](https://fortune.com/2025/09/19/gen-z-are-so-anxious-about-money-they-cant-sleep-bed-rotting-doom-scrolling-budgeting-advice/)) Every existing product pitches "more information." Coiny pitches "less anxiety" — a companion that translates financial data into emotional language a person can act on. This is a wedge into a structurally underserved cohort with high LTV potential.

### Angle 3: Physical Objects Win on Retention
Apps can be deleted in three seconds. A device you carry in your pocket cannot be uninstalled. The physical presence of the Coiny device creates a passive engagement loop: users glance at it throughout the day the same way they glance at a fitness tracker. Oura Ring's >80% annual renewal rate and Tamagotchi's 100M units sold prove that physical form factors create stickier relationships than apps alone. Hardware is a moat.

### Angle 4: The Kidult + Nostalgia + Fintech Timing Convergence
Three independent trends are converging simultaneously: (1) the Tamagotchi revival hitting 100M units in 2025 with a "kidult" market driving growth, (2) Gen Z's documented financial anxiety reaching a cultural inflection point with mainstream coverage, and (3) the gamification fintech market growing from $15B to $48B by 2029. Coiny is positioned at the center of all three. The timing is not manufactured — it is structural.

### Angle 5: Hardware + Subscription = Proven Investor Narrative
Oura ($11B valuation, confidential IPO filed May 2026) and WHOOP ($10.1B valuation) have proven that consumer health hardware + subscription is an investable and scalable model. Coiny applies the same architecture to financial wellness — a category that is arguably larger and more universal than sleep or fitness tracking. Every adult has finances. Not every adult tracks their HRV.

---

## 4. Revenue Model Options

### Option A: Hardware Sale + Optional Subscription (Recommended Anchor)
- **Hardware:** $79 early-bird / $129 retail. Covers COGS (~$25–35 BOM) with healthy margin. Early-bird pricing creates Kickstarter urgency; retail pricing anchors long-term value.
- **Subscription:** $4.99–$7.99/month for Plaid connection, cloud sync, pet customization, and advanced spending insights. Free tier: basic pet reactions, no history, no cloud.
- **Rationale:** Minimizes barrier to first purchase while building recurring revenue. Oura's 80% renewal rate demonstrates that users who engage with the physical device convert to subscribers. B2B license model (see below) can layer on top.
- **Year 3 projection:** 100K devices at $99 blended ASP = $9.9M hardware revenue + 65K subscribers at $60/year = $3.9M ARR. Total: ~$13.8M.

### Option B: Subscription-Only (WHOOP Model)
- Device subsidized or included with annual subscription ($79–$99/year).
- Pros: pure recurring revenue, high valuation multiples, better unit economics at scale.
- Cons: higher upfront cash requirement, requires faster subscriber acquisition to cover device COGS.
- Not recommended for pre-Series A stage due to capital intensity.

### Option C: Freemium App + Paid Cosmetics
- App and basic device features free. Revenue from digital cosmetic packs (new pet skins, sound packs, LED themes at $1.99–$4.99 each).
- Comparable to Finch's in-app purchase model.
- Pros: low barrier to adoption, viral potential.
- Cons: unpredictable revenue, ARPU typically low ($1–3/year on cosmetics in consumer apps).
- Best as a supplement to Option A, not standalone.

### Option D: B2B Wellness / HR Benefit
- Sell to employers or banks as a benefit: $25–40/unit wholesale + $2/user/month software license.
- Employers pay per-employee for a financial wellness program that's tangible and memorable versus another app.
- Financial wellness is the "hottest employee perk of 2025" per HR Executive. ([HR Executive](https://hrexecutive.com/money-matters-is-financial-wellness-tech-the-hottest-employee-perk-of-2025/))
- The US B2B financial wellness market is projected to reach $1.21B by 2029. ([Arizton](https://www.arizton.com/market-reports/us-financial-wellness-benefits-market))
- Best as a Phase 3+ channel after consumer validation. Can dramatically accelerate unit volume.

### Recommended Model
**Option A (hardware + subscription) as primary, Option C (cosmetics) as additive, Option D (B2B) as Phase 3 expansion.** This mirrors Oura's proven trajectory: start DTC consumer, add subscription stickiness, expand into enterprise health partnerships.

---

*Sources cited inline throughout. All market figures from 2024–2026 research unless otherwise noted.*
