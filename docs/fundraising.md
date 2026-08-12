'# Coiny — Fundraising Plan

Last updated: 2026-05-21

---

## Business Entity

- **Structure:** Delaware C-Corp (not LLC)
- **Why C-Corp:** Required for VC investment (preferred stock), employee stock options (ISOs),
  hardware manufacturing loans, and API business partnerships (Kraken, etc.)
- **Why Delaware:** Industry standard for US startups — predictable corporate law,
  familiar to all VCs and startup lawyers
- **Setup:** Stripe Atlas or Clerky (~$500, a few days)
- **Name change later:** Not a big deal — file a DBA or Delaware amendment ($50–200),
  EIN stays the same
- **Annual overhead:** ~2–3 hours/year if set up correctly (written board consents,
  Delaware franchise tax ~$400–500/year via assumed par value method, $50 annual report)

---

## What Similar Companies Did

| Company | Path | Total Raised | Key Insight |
|---|---|---|---|
| Pebble | Kickstarter ($10M, goal $500K) → VC | ~$15M+ | Kickstarter proved demand; VC funded scale |
| Oura Ring | VC only | ~$1.5B | Skipped crowdfunding entirely; health wearable angle |
| Whoop | VC only | ~$979M | Pure VC path; subscription model |
| Tile | VC ($104M) → acquired ($205M by Life360) | $104M | Hardware-focused VCs from day 1 |
| Pavlok | Indiegogo → minimal VC | ~$350K VC | Bootstrapped-friendly; crowdfunding as primary |
| Mighty | Kickstarter ($300K+) | ~$1M | Stayed crowdfunding-focused |

---

## Kickstarter — Honest Assessment

### The case for it
- Validates real demand before committing to manufacturing
- Pebble raised 20× their goal — wearables resonate strongly on Kickstarter
- Builds a community of early believers who become advocates
- Generates press in both fintech and wearables verticals simultaneously
- Crowdfunded backers more forgiving of early bugs than app store reviewers

### The real risks
- Backers expect delivery in 6–12 months — hardware + fintech compliance in parallel is brutal
- "Unknown startup wants access to my bank account" is a high-friction pitch to strangers
- Manufacturing delays + regulatory delays = refund requests
- Median hardware Kickstarter nets ~$210K after fees, taxes, returns — not enough for real manufacturing
- Fintech component adds regulatory timeline that hardware-only Kickstarters don't face

### What makes hardware Kickstarters succeed
- Working demo video showing real functionality (not renders)
- First 48 hours critical — need early momentum to hit homepage
- Early-bird pricing (e.g. $79 vs $129 retail)
- Conservative goal ($300–500K) — oversubscription generates more press than a barely-funded campaign
- Do not launch without a working prototype

---

## Recommended Fundraising Path

### Stage 1 — Pre-seed (now, 3–6 months)
**Goal:** Get a working prototype in front of 50–100 real users

**Raise:** $500K–1M

**From:** Angels with fintech or hardware background, or SOSV/HAX accelerator

**SOSV/HAX:** Invests $500K at inception specifically for hardware + software startups.
Runs a 4–6 month acceleration program. Directly relevant to Coiny's category.
Contact: hax.co

**What to show:** Working iOS app + Plaid integration + prototype device reacting to
real transactions. The demo sells itself.

**Use of funds:** Prototype iteration, first small batch (50–100 units), Plaid production
approval groundwork, C-Corp setup, compliance counsel.

---

### Stage 2 — Kickstarter (after working prototype, ~6–12 months)
**Goal:** $300–500K (conservative — let oversubscription do the work)

**Purpose:** Manufacturing validation + community building.
Not your primary capital source — a supplement to VC.

**Strategy:**
- Launch only after working demo exists
- Emphasize the Tamagotchi nostalgia angle + financial wellness angle
- Lead with device experience (animations, haptics, sound) — bank connection is the engine,
  not the headline
- Security messaging front and center (bank-grade encryption, read-only access, no credentials stored)

**Use of funds:** First manufacturing tooling run, packaging, first 500–1000 units for backers.

---

### Stage 3 — Seed (~6–12 months post-Kickstarter)
**Raise:** $2–4M

**From:** Dedicated seed VCs — Floodgate, First Round, Initialized, Felicis,
or hardware-focused funds (Forerunner, GGV)

**What investors want to see:**
- Working product in hands of real users
- Retention data (do people keep using it after week 1?)
- Unit economics tracked (CAC vs LTV)
- Manufacturing path de-risked (first tooling run complete)
- Plaid production approval in progress

**Use of funds:** Manufacturing tooling (injection mold: $20–50K), first production run
(1K–5K units), Plaid production approval, compliance framework, small team.

---

### Stage 4 — Series A (~18–24 months)
**Raise:** $10–15M

**From:** Tier-1 VCs — a16z, Sequoia, Lightspeed, Bessemer, Index

**What investors want to see:**
- 10K+ units shipped
- Clear unit economics (CAC < 1/5 LTV)
- Subscription revenue established ($4–6/month per user)
- Full regulatory compliance (GLBA, CCPA, privacy policy, incident response)
- SOC 2 Type 2 audit in progress
- Team with hardware + fintech domain expertise

**Use of funds:** Scaled manufacturing (10K–50K units), full team build-out (EE, firmware,
iOS/Android, backend, compliance), global distribution, Series B preparation.

---

## Hardware-Specific Investor Landscape

| Fund | Focus | Notes |
|---|---|---|
| **SOSV / HAX** | Hardware + software startups | $500K at inception, 4–6 month program — most relevant for Coiny now |
| **Forerunner Ventures** | Consumer products, wearables | Oura investor |
| **GGV Capital** | Consumer tech, hardware | Tile + Oura investor |
| **Khosla Ventures** | Deep tech, hardware | Broad hardware mandate |
| **Monozukuri Ventures** | Hardware, IoT, wearables | Hardware-specialist fund |
| **Francisco Partners** | Hardware, tech | Tile Series C lead |
| **Lightspeed** | Multi-stage | Wearables expertise |

---

## Equity Dilution Expectations

| Round | Typical dilution | Founder ownership after |
|---|---|---|
| Pre-seed | 10–15% | ~85–90% |
| Seed | 15–20% | ~65–75% |
| Series A | 20–25% | ~50–55% |

Hardware startups dilute more than pure software due to higher capital requirements.
Option pool (for future employees) typically 20% reserved — this comes out of founder equity
before investor dilution is calculated.

---

## Key Risk: Hardware + Fintech in Parallel

This is harder than either alone. Investors will scrutinize both:
- **Manufacturing timeline** — tooling, DFM validation, supplier relationships
- **Regulatory timeline** — Plaid production approval, GLBA compliance, privacy policy,
  incident response plan, SOC 2

Plan for 12–24 months of compliance groundwork before Plaid production access.
Do not promise backers fintech features on a Kickstarter timeline that doesn't
account for regulatory review.

---

## Immediate Actions (Antoine)

1. **Incorporate as Delaware C-Corp** — Stripe Atlas or Clerky (~$500, this week)
2. **Contact SOSV/HAX** — hax.co — pitch Coiny for their hardware acceleration program
3. **Build the demo** — the working prototype (iOS + Plaid + device reacting) is the pitch.
   Everything else is secondary.
