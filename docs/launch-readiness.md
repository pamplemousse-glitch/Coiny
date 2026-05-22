# Coiny — Launch Readiness

Actionable checklist of every blocker to (1) ship an internal MVP-Prototype
and (2) launch publicly in the App Store / Play Store with real users.

**How to use this doc:**
- Check off items as they're completed
- Per blocker: status, what's blocking it, who can do it, effort, cost
- Updated as we progress; treat as living doc
- For execution sequence + plumbing details see `docs/implementation-plan.md`

**Last updated:** 2026-05-20

---

## Part 1 — MVP / Prototype blockers

> **Definition:** A working demo you can hand to a friend via TestFlight (or
> sideload on Android). Plaid sandbox only, no real money, dev hardware (no
> custom PCB). Goal: prove the concept works end-to-end.

### MVP-A — Software-only MVP (no hardware)

Demoable scope: friend installs the app, signs in, links a Plaid sandbox
bank, sees their (fake) transactions trigger pet reactions on the phone.

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ✅ | **Apple Developer Program account** | Antoine | done | $99/yr | Confirmed active |
| ☐ | **Google Play Console account** | Antoine | 15 min | $25 one-time | For internal testing track + later Play Store submission |
| ✅ | **iOS Plaid Link wiring** | Claude | done | $0 | `OnboardingView.swift` imports LinkKit, calls `Plaid.create()`, handles token exchange end-to-end |
| ✅ | **Push pipeline (APNs backend → iOS)** | done | done | $0 | `backend/src/push/apns.ts` full HTTP/2 APNs client; `CoinyApp.swift` registers, gets device token, posts to backend |
| ✅ | **First-launch flow** | Claude | done | $0 | Goals → bank link → push opt-in → pet view; education card carousel + "Coiny is watching…" empty state (PR #70) |
| ✅ | **Mobile API wiring** to render real pet state | Claude | done | $0 | `API.swift` + `PetStore` hit `/api/pets` live |
| ✅ | **Minimum 1 mobile test** in CI | Claude | done | $0 | 25+ XCTest unit tests + UITest launch; iOS CI on macOS-15 |
| ☐ | **Xcode Archive configured for TestFlight** | Antoine (needs DEVELOPMENT_TEAM set) | 2 h | $0 | Fill `ios/project.yml:19` Team ID → `xcodegen generate` → Archive → Distribute |
| ☐ | **TestFlight build distributed to ≥2 testers** | Antoine | 30 min | $0 | Antoine + Jack internal test |

**MVP-A milestone:** Antoine + Jack install the app, link their Plaid sandbox bank,
spend a sandbox transaction, see Coiny react on their phone with a push +
animation.

**Estimated time to MVP-A from today:** ~2-3 days of Claude work (EAS build config +
first-launch flow). Apple Dev account already active.

---

### MVP-B — MVP with hardware prototype

Demoable scope: everything in MVP-A, plus a physical M5StickS3 device that
animates / blinks / buzzes when reactions fire. Hardware is in a 3D-printed
case (your OpenSCAD design); no custom PCB.

Add these on top of MVP-A:

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ☐ | **Firmware: BLE GATT server on M5StickS3** | Claude (firmware code) | 3-4 days | $0 | Defines characteristics for reactions: animation, sound, LED, haptic, duration |
| ☐ | **BLE protocol schema** in `shared/` | Claude | 0.5 day | $0 | Cross-package TS types so mobile and firmware speak the same dialect |
| ☐ | **Native BLE module — iOS Swift** | Claude (needs Apple Dev for testing) | 2-3 days | $0 | Wraps CoreBluetooth via Expo Modules API |
| ☐ | **Native BLE module — Android Kotlin** | Claude | 2-3 days | $0 | Wraps BluetoothLeScanner + foreground service for background BLE |
| ☐ | **Reaction-to-BLE-command translator** in mobile | Claude | 1 day | $0 | Animation → bytes, sound → bytes, LED → bytes |
| ☐ | **Pet sprite assets** (minimum set) | Antoine — choose pipeline | 1-3 days (depending on pipeline) | $0-$300 | AI-generated for v1 prototype; ≥4 frames × 4 emotions (happy/sad/excited/neutral) |
| ☐ | **Solder DRV2605L + coin motor to M5StickS3** | Antoine | 1 h | $0 (already ordered) | Hardware setup |
| ☐ | **Firmware OTA via BLE** (optional for MVP) | Claude | 2 days | $0 | Skip for v1; flash via USB |

**MVP-B milestone:** Antoine carries a working Coiny prototype, makes a
Plaid sandbox transaction from the phone, the M5StickS3 in his pocket
animates + buzzes within 2 seconds.

**Estimated time to MVP-B from today:** ~4-6 weeks of solo work, on top of MVP-A.

---

## Part 2 — Full Launch blockers

> **Definition:** Coiny is available on the App Store and Play Store. Real
> users link real banks (Plaid production). Hardware is for sale (or
> distributed). Real money is on the line for the business. SOC 2-grade
> infra and process.

Grouped by category for parallelization. Items within a category often have
dependencies (LLC blocks insurance blocks banking partnership, etc.).

### 1. Legal + business entity

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ☐ | **LLC formation** (T1.4) | Antoine | 2-4 weeks (DE filing via Stripe Atlas or local) | $300-800 | Required for: Plaid production agreement, App Store organization account, business bank account, insurance |
| ☐ | **EIN** (federal tax ID) | Antoine | 15 min after LLC | $0 | Required for business bank account + payroll |
| ☐ | **Business bank account** | Antoine | 30 min after EIN | $0 | Mercury, Brex, or local. Required for Stripe + vendors. |
| ☐ | **Privacy Policy** | Antoine (template) + lawyer review | 1 day template + lawyer review | $200-1k (template) or $1-3k (lawyer drafted) | Termly, iubenda, or Stripe Atlas templates. App Stores reject without it. |
| ☐ | **Terms of Service** | Same | Same | Same | Same |
| ☐ | **Cyber liability insurance** | Antoine | 1-2 weeks application | $1-3k/yr | Coalition, Vouch, Embroker. Required by banking partnerships. |
| ☐ | **General liability insurance** | Antoine | 1 week | $500-1k/yr | For hardware product liability |
| ☐ | **Trademark "Coiny"** (optional but recommended pre-public-launch) | Antoine + IP lawyer | 1-3 months | $1-3k | USPTO Class 9 (electronics) + Class 36 (financial services) |

**Critical dependency:** LLC → EIN → business bank account → everything else
that requires a business identity. Start LLC immediately.

### 2. Compliance + security

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ☐ | **Plaid Production approval** | Antoine + Claude (security questionnaire) | ~6h answering + 1-3 weeks Plaid review | $0 application; ~$0.30/Item/mo at scale | Cannot use real bank data until this is approved |
| ☐ | **Threat model doc** (`docs/threat-model.md`) | Claude | 1 day | $0 | STRIDE analysis per attack surface (webhook, API, mobile, BLE, firmware) |
| ☐ | **Disaster recovery doc** (`docs/disaster-recovery.md`) | Claude | 1 day | $0 | RTO/RPO targets, restore procedure |
| ☐ | **Audit log table + middleware** (M3) | Claude | 1 day | $0 | "Who changed what, when" for every financial-data mutation |
| ☐ | **Data retention + deletion process** (`docs/data-retention.md` + delete endpoint) | Claude | 1 day | $0 | GDPR/CCPA: "delete my account" must purge data |
| ☐ | **SOC 2 Type 2 readiness** | Antoine engages auditor | 3-6 months parallel | $5-15k vendor (Vanta/Drata) + $15-30k auditor | Required by some banking partners |
| ☐ | **Penetration test** | External firm (Cobalt, HackerOne, Synack) | 1-2 weeks engagement | $5-15k one-time | Before public launch with real money |
| ☐ | **GLBA compliance review** | Lawyer | 1 week | $1-3k | Federal law for financial-data handlers |
| ☐ | **PCI DSS posture** (if charging cards) | Stripe handles most | Self-assessment SAQ A if Stripe Checkout | $0 | Only relevant if we charge users directly for hardware/subscription |
| ☐ | **Apple Privacy Nutrition Label** (Privacy Manifest) | Claude | 0.5 day | $0 | Required for App Store submission since 2024 |
| ☐ | **CCPA / state privacy law compliance** | Lawyer review | 1 week | $1-3k | "Do Not Sell My Info" link, consumer rights endpoint |

### 3. App Store / Play Store distribution

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ☐ | **Apple Developer Program organization (not personal)** | Antoine, requires LLC + D-U-N-S number | 1-4 weeks Apple approval | $99/yr | D-U-N-S takes ~1 week from Dun & Bradstreet (free) |
| ☐ | **D-U-N-S number for the LLC** | Antoine | 1 week | $0 | https://developer.apple.com/support/D-U-N-S |
| ☐ | **Google Play Console organization** | Antoine | 1 week verification | $25 one-time | |
| ☐ | **App icon + branding** | Designer (Fiverr/contracted) | 1-2 weeks | $300-2k | Multiple sizes per Apple + Google specs |
| ☐ | **App Store screenshots** (1284×2778, 2796×2436, 6.7", 6.5", 5.5") | Designer | 1 week | Included with icon | Required per device class |
| ☐ | **App preview video** (15-30s) | Designer | 1 week | $500-3k | Optional but boosts conversion |
| ☐ | **App Store + Play Store copy** (description, keywords, what's new) | Antoine + maybe contractor | 1-2 days | $0-500 | ASO matters |
| ☐ | **Demo account for Apple App Review** | Claude | 0.5 day | $0 | Apple's reviewer needs to test the bank-link flow without a real bank |
| ☐ | **App Store Connect submission** | Antoine | 1 day initial + ~1 week review per submission | $0 | First submission often rejected — plan 2-3 review cycles |
| ☐ | **Code signing certificates + provisioning profiles** | EAS handles | 1 h setup | $0 | One-time |
| ☐ | **Accessibility audit pass** (VoiceOver, contrast, dynamic type, reduced motion) | Claude | 2-3 days | $0 | App Store flags accessibility regressions |
| ☐ | **EAS Submit configured** | Claude | 2 h | $0 | One-command submission |

### 4. Hardware certification + manufacturing

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ☐ | **Production PCB design** (nRF52840-based, not dev board) | Contracted EE | 2-4 weeks | $5-10k | Includes schematic, layout, antenna matching, DFM review |
| ☐ | **FCC Part 15 certification** | Test lab (Element, MET Labs, etc.) | 4-8 weeks | $3-10k | US law for intentional radiators (BLE) |
| ☐ | **FCC ID + label** on the device | EE + manufacturer | Part of cert | Included | Required on the product |
| ☐ | **CE marking** (if shipping to EU) | Same | 4-8 weeks parallel | $3-10k | European equivalent |
| ☐ | **UL/IEC battery safety** | Battery vendor often provides | 2-4 weeks | $0-2k | LiPo + charging circuit |
| ☐ | **RoHS compliance** | Component selection | Part of BOM | $0 | No lead/etc. in components |
| ☐ | **Contract manufacturer relationship** | Antoine evaluates | 2-4 weeks | Variable | Seeed Studio, JLCPCB Assembly (low volume); Jabil, Foxconn at scale |
| ☐ | **Industrial design** (case form, materials, color, finish) | Designer | 2-4 weeks | $3-10k contract | Or DIY in OpenSCAD if you have ID experience |
| ☐ | **Injection-mold tooling** for case | Tooling vendor | 4-6 weeks | $5-20k one-time | At >1k unit volume; for <1k stick with SLA/SLS 3D prints |
| ☐ | **First production run inventory** (100-1000 units) | Manufacturing partner | 6-10 weeks lead time | $10-30k all-in for 1000 units | Chips + PCB + assembly + case + packaging |
| ☐ | **Packaging design** (box, insert card, charging cable) | Designer | 1-2 weeks | $500-3k | Brand presentation + FCC labels |
| ☐ | **Warranty policy + repair/returns process** | Antoine + lawyer | 1 week | $1-2k legal | Required by consumer protection laws |
| ☐ | **Shipping/fulfillment partner** | Antoine | 2-4 weeks | $0 setup, ~$3-8/unit | ShipBob, ShipStation, or DIY in early days |

### 5. Production infrastructure

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ☐ | **AWS migration** (Neon → Aurora, Fly → ECS Fargate) | Claude | 1 weekend | ~$50-100/mo | Per `docs/proposed-changes.md` |
| ☐ | **AWS CDK in TypeScript for IaC** | Claude | 1 day | $0 | Reproducible infra |
| ☐ | **AWS Secrets Manager** (replaces Fly secrets) | Claude | 0.5 day | $0.40/secret/mo | IAM-managed access, audit trail |
| ☐ | **Observability** — Sentry + OpenTelemetry → Grafana Cloud | Claude (needs Antoine signups) | 1 day | $0 free tier | M1 from implementation plan |
| ☐ | **Auth provider — Clerk or WorkOS** | Claude (needs Antoine signup) | 1-2 days wiring | $0 free tier; ~$25/mo at scale | Required for multi-user |
| ☐ | **Feature flags — GrowthBook self-hosted** | Claude | 0.5 day | ~$5/mo Fly compute | Kill switches + rollouts |
| ☐ | **CDN + WAF in front of API** | Claude | 0.5 day | $0 CloudFront + AWS WAF basic | DDoS protection |
| ☐ | **Synthetic monitoring** (Better Uptime / Checkly) | Claude | 1 h | $0 free tier | External pinger for outages |
| ☐ | **Backup + tested restore drill** | Claude + Antoine | 1 day | $0 | Required for SOC 2 |
| ☐ | **Performance budget / SLO targets defined** | Antoine + Claude | 0.5 day | $0 | "p99 webhook latency < 500ms" |
| ☐ | **Multi-region failover plan** (optional v1) | Defer | Multi-week | $$$ | Single-region `us-east-1` is fine for v1 |

### 6. Ops + support

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ☐ | **Status page** (Instatus / Better Uptime) | Antoine | 30 min | $0 free tier | Public-facing |
| ☐ | **Support inbox** (Front, Help Scout, or `support@coiny.app` → Gmail) | Antoine | 1 h | $0-30/mo | Real users will email |
| ☐ | **Transactional email** (Resend / Postmark) | Claude wires | 2 h | $0 free tier | Welcome emails, password recovery, weekly digests |
| ☐ | **Help center / FAQ** | Antoine writes; Notion-public for v1 | 1-2 weeks content | $0 | Common questions, troubleshooting |
| ☐ | **Incident response playbook** (`docs/runbooks/`) | Claude | 1 day | $0 | Per-incident-class procedures |
| ☐ | **On-call paging** (PagerDuty/Opsgenie or just SMS via Better Uptime) | Antoine | 1 h | $0-25/mo | Solo dev OK with SMS for v1 |

### 7. Product polish

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ☐ | **Product Brief filled in** (`docs/product-brief.md`) | Antoine | 1-2 h | $0 | Locks target user, voice, principles before customization work |
| ☐ | **Pet visual customization** (F1, ≥3 species + evolution stages) | Claude code + asset commission | 2-3 weeks | $300-1k assets | Engagement-critical for Tamagotchi-style product |
| ☐ | **Audio packs Tier 1 — curated** (F2.1, ≥3 polished defaults) | Antoine + audio designer | 2 weeks | $300-700 assets | Plus meme bank + personal recordings tiers later |
| ☐ | **Onboarding flow** (3-5 screens) | Claude code + product brief | 3-5 days | $0 | "First 30 seconds" experience |
| ☐ | **Empty states** | Claude | 1 day | $0 | What users see before any transactions |
| ☐ | **Error states** | Claude | 1 day | $0 | Plaid offline, no internet, BLE disconnect, etc. |
| ☐ | **Settings / account screens** | Claude | 2-3 days | $0 | Change goals, manage devices, sign out, delete account |
| ☐ | **Pet "moods" beyond happy/sad** (F4) | Claude | 3 days | $0 | Sleepy, anxious, content, excited — adds personality |
| ☐ | **Subscription detection as a pet reaction** (F3) | Claude | 4-6 h | $0 | Surface T2.6 work to the user |
| ☐ | **Net worth tracking** (F5, needs Plaid Liabilities product) | Claude | 2-3 days | adds ~$0.30/Item/mo | High-priority retention feature |
| ☐ | **Cash flow forecast** (F6) | Claude | 3-4 days | $0 | Killer feature for financial products |

### 8. Marketing + growth

| ✓ | Blocker | Owner | Effort | Cost | Notes |
|---|---|---|---|---|---|
| ☐ | **Domain name** (`coiny.app` or similar) | Antoine | 5 min | $12-50/yr | Buy now before squatters; Cloudflare or Namecheap |
| ☐ | **Marketing site / landing page** | Antoine + designer or Framer | 1-2 weeks | $200-2k | Where do people land when they hear about Coiny? |
| ☐ | **Waitlist + email capture** (Beehiiv, ConvertKit, or Resend Audiences) | Antoine | 1 day | $0 free tier | Pre-launch demand validation |
| ☐ | **Product analytics** (PostHog / Mixpanel / Amplitude) | Claude wires; Antoine signs up | 1 day | $0 free tier | How users engage; separate from Sentry/observability |
| ☐ | **Press kit** (logos, screenshots, founder bio, contact) | Antoine + designer | 1 week | $0-500 | For reviewers/press |
| ☐ | **Product Hunt launch plan** | Antoine | 1 week prep | $0 | Optional but high-impact |
| ☐ | **ASO** (App Store Optimization — keywords, ratings strategy) | Antoine | Ongoing | $0 | Title, subtitle, keywords field |
| ☐ | **Influencer / PR outreach list** | Antoine | 1 week | $0 | Fintech podcasts, finance Twitter, FinTok creators |
| ☐ | **Referral / invite mechanic** | Claude implements | 3-4 days | $0 | Optional for v1 but powerful |

---

## Recommended sequence

If we tackled everything in priority order:

### Phase A — Set up the table (Antoine, week 1 in parallel with Claude work)
1. Buy domain
2. File LLC (Stripe Atlas or local)
3. Apple Developer + Google Play Console signups
4. Sentry + Grafana Cloud free signups (unblocks M1 in implementation plan)
5. Pick auth provider (Clerk recommended)
6. Fill in `docs/product-brief.md`

### Phase B — Software MVP (weeks 1-3, Claude)
7. M1 quality floor — Sentry, OTel, Semgrep already done, Biome done
8. Mobile Plaid Link wiring + first-launch flow
9. Push pipeline (T2.3) — needs Apple Dev + Firebase from Antoine
10. TestFlight build out to ≥3 testers

### Phase C — Hardware MVP (weeks 3-9)
11. Firmware on M5StickS3 + BLE protocol + native BLE modules
12. AI-generated sprite set + audio pack v1
13. Solder DRV2605L + motor
14. Carry-test the device

### Phase D — Legal + compliance (weeks 4-12, parallel to MVP)
15. EIN + business bank
16. Privacy Policy + ToS (templates)
17. Cyber liability insurance application
18. Trademark filing
19. Begin SOC 2 readiness (Vanta/Drata)

### Phase E — Production infra (weeks 10-14)
20. AWS migration (Aurora + ECS Fargate + Secrets Manager)
21. Audit log + threat model + DR docs
22. Status page + synthetic monitoring + support inbox
23. Apple Privacy Manifest + accessibility audit

### Phase F — Hardware production (weeks 8-20, parallel)
24. Hire EE for PCB
25. FCC + CE certification
26. CM relationship + first production run
27. Industrial design + packaging

### Phase G — Pre-launch (weeks 16-22)
28. Plaid Production approval
29. Pet customization v1 (F1) + audio packs (F2)
30. Onboarding + empty/error states + settings screens
31. App Store submission + review cycles
32. Marketing site + waitlist + press kit

**Realistic total: 5-6 months solo with parallel Antoine work, or 3-4 months
with a small contractor team.**

---

## Status snapshot (as of 2026-05-22)

What we already have toward each milestone:

**MVP-A (software-only):** ~95% there. Backend complete: Plaid + rule engine +
multi-user auth + Apple Sign In + APNs push + DELETE /api/account + per-user rate
limiting + AES-256-GCM for both access_token and reaction column + debug react
endpoint + 7 DB migrations + 56 Vitest tests passing. iOS complete: SwiftUI app,
DI API client, 25+ XCTest tests, full onboarding flow, education card carousel,
waiting-for-first-reaction empty state. CI hardened: SHA-pinned actions, SBOM,
CodeQL, SwiftLint, 80% coverage gate, Semgrep, Gitleaks, Trivy, docs-only skip gate,
always-reporting checks (no more required-check deadlocks).

Remaining gap: Antoine must set `DEVELOPMENT_TEAM` in `ios/project.yml:19`, enable
Sign In with Apple in Developer Portal, then archive and upload to TestFlight.
That's a 30-minute manual step — no code work left for MVP-A.

External integrations (CoinGecko, Coinbase, Zerion, Spinwheel) are implemented on
the backend (PR #71 pending merge). iOS display of crypto reactions is next after
that merges.

**MVP-B (with hardware):** ~10% there. nRF52840 dev kit still to order,
DRV2605L haptic driver + coin motor ordered. Firmware not started. Native BLE
module not started.

**Full Launch:** ~10% there. Backend production-grade-adjacent (live on
Fly, Postgres on Neon, hardened CI, Plaid sandbox webhook validated end-to-end,
non-root Docker, 0 HIGH/CRITICAL CVEs, GLBA right-to-delete implemented). Remaining:
LLC + compliance docs + AWS migration + App Store submission + hardware certification.

---

## Owner key

- **Antoine** — requires signup, payment, physical action, or product/business decision
- **Claude** — pure software work, executable without external accounts (or with Antoine providing credentials)
- **Contractor** — needs outside hire (EE, designer, sound designer, lawyer)
- **Vendor** — handled by service signup (Plaid, AWS, etc.)
