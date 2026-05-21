# Coiny — Tech Stack (Quality-Only)

**Date:** 2026-05-20
**Status:** This is the canonical stack. Quality and performance are the
only considerations. Cost, effort, and solo-dev velocity are explicitly
**not** factors in any decision below. If a layer says X, we build X — we
don't pick a "good enough for now" alternative.

For implementation sequence, see `docs/implementation-plan.md`. For
visual reference, see `docs/stack-map.md`. For research backing the
decisions, see `docs/plaid-integration.md` and inline citations.

---

## TL;DR — the locked stack

| Layer | Choice |
|---|---|
| **iOS app** | Native Swift + SwiftUI + Combine + SwiftData |
| **Android app** | Native Kotlin + Jetpack Compose + Coroutines + Room |
| **Mobile structure** | Two separate codebases, one monorepo. iOS-first launch (Android 3-6 mo later) |
| **Companion** | Apple Watch (watchOS) + Wear OS apps, Phase 4 |
| **Backend language** | Go (chi router) |
| **Database engine** | Postgres |
| **Database hosting** | AWS Aurora Serverless v2 in a private VPC |
| **App hosting** | AWS ECS Fargate (private subnet) + ALB + CloudFront + AWS WAF |
| **Secrets** | AWS Secrets Manager + KMS-managed keys |
| **IaC** | AWS CDK in TypeScript |
| **Bank data** | Plaid Production (Transactions + Investments + Liabilities + Income) + Finicity as secondary |
| **Authentication** | WorkOS AuthKit (SAML/SSO/SCIM-ready) |
| **Feature flags** | LaunchDarkly |
| **Observability** | Datadog APM + Logs + Metrics + RUM + Synthetics |
| **Error tracking** | Datadog Error Tracking (included) |
| **SAST / SCA** | Semgrep (managed) + Snyk + Gitleaks + Trivy + CodeQL |
| **Push** | Direct APNs + FCM (not Expo Push) |
| **Transactional email** | Postmark |
| **CDN / WAF** | CloudFront + AWS WAF |
| **CI/CD** | GitHub Actions + EAS submission gates + AWS CodeDeploy with canary |
| **Testing** | XCTest (iOS), JUnit + Compose UI tests (Android), Go testing + testify, Vitest (backend), Playwright (e2e) |
| **MCU** | Nordic nRF54L15 (BLE 5.4, single-coin-cell, 30% better power than nRF52840) |
| **Display** | Sharp Memory LCD LS013B7DH06 (color, always-on, µA draw) |
| **Haptic** | LRA motor + DRV2605L driver |
| **RGB indicator** | APA102 (better color accuracy + faster refresh than WS2812) |
| **Audio** | MAX98357A I2S amp + 8Ω dynamic speaker (or omit — use phone audio) |
| **Battery / PMIC** | 200mAh LiPo + MAX77654 integrated PMIC + USB-C PD charging |
| **Antenna** | Chip antenna with matched network + RF shield can |
| **Firmware OS** | Zephyr RTOS via Nordic nRF Connect SDK |
| **BLE stack** | Nordic SoftDevice |
| **Firmware OTA** | MCUmgr/SMP with signed firmware (NSIB secure boot) |
| **Industrial design** | Contracted ID firm, injection-molded PC/ABS, custom packaging |
| **Manufacturing** | Premium contract manufacturer (Jabil-tier, not Seeed) |

---

## §1 — Mobile: native Swift + native Kotlin, two codebases

### Decision

- **iOS:** Swift + SwiftUI + Combine + SwiftData + Xcode
- **Android:** Kotlin + Jetpack Compose + Coroutines + Hilt + Room
- **Two separate codebases**, organized as `ios/` and `android/` subdirs in
  the monorepo
- **iOS launches first by 3-6 months.** Android follows once iOS validates.

No React Native. No Flutter. No Kotlin Multiplatform. No cross-platform
shortcuts.

### Why

For a hardware companion product whose value depends on:
- 60-120fps sprite animations (pet "alive" feel)
- Always-on Live Activities + Dynamic Island (paycheck-celebration moments)
- iOS Widgets on home + lock screen (the pet is always visible)
- Background BLE that survives multi-day phone idle
- HealthKit / Health Connect integration (future health-finance overlap)
- Apple Watch companion (Phase 4 — pet on your wrist)
- App Store editorial relations + featured slots

Cross-platform frameworks ceiling out before any of these reach top-quality.
React Native showcases zero hardware-companion or fintech apps; the
ecosystem points the wrong direction for Coiny's category. Pebble, Oura,
Whoop, Fitbit, Tile, Ring — every meaningful BLE wearable ships native.

### iOS-first launch rationale

- iPhone users have 2.4× the disposable income of Android-primary users (Statcounter / Apple Pay data); they buy hardware companions at higher rates
- App Store review pipeline is more reliable than Play Store
- Apple Watch companion + Live Activities + Widgets give iOS an outsized first-impression advantage
- Iterating on one platform is faster; Android can copy the validated design
- Pebble, Tile, Oura, Ring all launched iOS-first

### Apple-specific features locked in (Phase 4)

- **Live Activities** for paycheck celebrations
- **Dynamic Island** integration on iPhone 14 Pro+
- **iOS Widgets** (small, medium, large, lock-screen accessory family)
- **Apple Watch companion app** with complications
- **App Clip** for first-time-user demo flow
- **AirDrop sharing** of pet customizations
- **Shortcuts** integration for "Hey Siri, how's my pet?"

### Android-specific features locked in (3-6 months post-iOS)

- **Jetpack Compose-native UI** matching Material You theming
- **Android Widgets** (Glance-based, all sizes)
- **Wear OS companion** with watch face complications
- **Android-specific tiles** (Always-On Display)
- **Background BLE** via foreground service with WorkManager fallback

### Trigger for re-evaluation: none

There is no "go back to RN" trigger. Native is the production target. The
RN prototype is throwaway validation, not foundation.

---

## §2 — Backend: Go + chi

### Decision

- **Language:** Go (latest stable, currently 1.23)
- **Router:** chi
- **Database access:** sqlc (typed Go from SQL) — not GORM
- **Validation:** ozzo-validation or custom
- **Migrations:** Atlas
- **Logging:** zerolog
- **Observability:** OpenTelemetry SDK with Datadog exporter

No Node.js. No TypeScript backend. No Fastify.

### Why

Fintech tier of the stack (Plaid, Brex, Mercury, Stripe, Robinhood, Cash
App) tilts Go for hot-path services. For Coiny's webhook-ingestion
workload, Go gives:
- p99 latency consistently <10ms vs Node's 50-150ms tail
- No event-loop blocking surprises (single biggest production-fintech foot-gun)
- No GC pause cliffs that hit at scale
- Single static binary deploys in milliseconds
- ~10× lower memory footprint per concurrent request
- True parallel goroutines for fan-out (e.g., parallel push notification dispatch)

The "Fastify is good enough" argument loses when quality is the only axis.

### Backend specifics

- **HTTP server:** stdlib net/http + chi for routing
- **Background jobs:** Asynq (Redis-backed) for retries + scheduled tasks
- **Cache:** Redis (AWS ElastiCache) — for Plaid webhook key cache, session cache, rate limit counters
- **Webhooks:** verify Plaid JWT inline with crypto/ecdsa + chi middleware
- **Idempotency:** Postgres advisory locks + transaction_id row insert
- **Tests:** stdlib testing + testify + dockertest (real Postgres in tests, not pglite)
- **OpenAPI:** generated from code via swag; clients regenerated for iOS/Android

---

## §3 — Database: AWS Aurora Serverless v2 in VPC

### Decision

- **Engine:** Postgres 16 on AWS Aurora Serverless v2
- **Network:** private VPC subnet, no public internet
- **Access:** IAM database authentication (no static passwords for app)
- **Encryption:** KMS-managed at rest + TLS 1.3 in transit
- **Replication:** Multi-AZ writer + 1 read replica + cross-region backup
- **Connection pooling:** AWS RDS Proxy
- **Schema migrations:** Atlas (declarative) — not Drizzle Kit

No Neon. No Supabase. No Fly Postgres. Neon is excellent for branching and
prototyping; Aurora is the SOC 2 / PCI / banking-partnership-acceptable
production database.

### Why Aurora over alternatives

- **Auto-failover** under 30 seconds vs Neon's slower compute restart
- **Point-in-time recovery** to the second (RPO ~5 min)
- **Read replicas** for analytics queries without touching the hot path
- **VPC isolation** required by every banking partner and SOC 2 auditor
- **KMS key separation** at column level if needed for PII
- **CloudTrail audit logs** for every connection and query (SOC 2 evidence)
- **Aurora Global Database** option for multi-region disaster recovery

### Schema + ORM choice

- **Migrations:** Atlas (HCL-based declarative migrations, version-controlled)
- **Query layer:** sqlc — typed Go code generated from raw SQL files
  - More auditable than ORM-generated queries
  - Banking auditors prefer "show me the exact SQL" over ORM magic
  - Faster (no query builder overhead)

---

## §4 — Hosting: AWS ECS Fargate

### Decision

- **Compute:** AWS ECS Fargate (no EC2 management)
- **Networking:** ALB → ECS task in private subnet
- **CDN:** CloudFront in front of ALB
- **WAF:** AWS WAF with managed rule sets + custom rules
- **DNS:** Route 53
- **Secrets:** AWS Secrets Manager with automatic rotation
- **IaC:** AWS CDK in TypeScript
- **Multi-region:** active-active in `us-east-1` + `us-west-2` from day 1
- **CD:** AWS CodeDeploy with canary deployment (10% → 50% → 100% over 30 min)

No Fly.io. No Render. No Railway. No Heroku. No Vercel.

### Why AWS over alternatives

- VPC isolation, IAM, KMS, CloudTrail — the entire SOC 2 / PCI / GLBA evidence chain
- Every banking partner expects "where is data encrypted at rest" and the
  acceptable answer is "AWS KMS in us-east-1"
- AWS PrivateLink to Plaid (if Plaid offers it on enterprise tier) avoids
  internet-routed bank data
- Multi-region failover capability from day 1 (Fly doesn't offer this at indie tier)
- CloudWatch + CloudTrail provide audit trails auditors expect

### CI/CD specifics

- GitHub Actions for tests + builds
- AWS CodeBuild → CodeDeploy for production rollout
- Canary deployments with automatic rollback on alert (Datadog SLI-based)
- OIDC trust between GitHub Actions and AWS (no long-lived PATs)
- Mobile builds via EAS Build (for the development phase only — replaced by
  pure native Xcode + Gradle once mobile is fully native)

---

## §5 — Observability: Datadog from day 1

### Decision

- **APM:** Datadog APM with OpenTelemetry semantic conventions
- **Logs:** Datadog Logs with structured logging from zerolog
- **Metrics:** Datadog Metrics + Watchdog (anomaly detection)
- **Real User Monitoring:** Datadog RUM on iOS + Android
- **Synthetic monitoring:** Datadog Synthetics from 5 global regions
- **Error tracking:** Datadog Error Tracking (replaces Sentry — same vendor)
- **Profiling:** Datadog Continuous Profiler for Go backend
- **Notebooks + dashboards** mandatory per service

No Sentry+Grafana free tier. No Honeycomb. No New Relic.

### Why Datadog

What Plaid, Stripe, Mercury, Robinhood, Coinbase, Brex all run in
production. Single pane of glass means root-cause analysis crosses
APM/logs/metrics/RUM seamlessly. Watchdog catches anomalies free dashboards
miss. Datadog's APM is the gold standard for distributed tracing.

Cost is real (~$104k/yr SMB tier) but quality-only means we don't optimize
for cost on this layer.

---

## §6 — Auth: WorkOS AuthKit

### Decision

- **Auth provider:** WorkOS AuthKit
- **iOS SDK:** WorkOS Swift SDK
- **Android SDK:** WorkOS Kotlin SDK
- **Session model:** WorkOS JWT + refresh token flow
- **MFA:** WebAuthn + TOTP fallback (required for production)
- **Audit logs:** all auth events streamed to Datadog Logs

No Clerk. No Supabase Auth. No custom JWT.

### Why WorkOS over Clerk

- **Enterprise-ready from day 1** — SAML/SSO/SCIM included if Coiny ever
  ships B2B (employer-distributed devices, financial-wellness benefit)
- **Less lock-in** — built on standard protocols, easier to migrate out
- **Lower opinion-cost** — Clerk has strong UX opinions (good for solo, bad
  if you want full design control)
- **Audit logs** built-in, exportable, banking-partner-acceptable

Auth0 also viable but more expensive at scale.

---

## §7 — Feature flags: LaunchDarkly

### Decision

- **Platform:** LaunchDarkly
- **Targeting:** user-id, device-id, geo, app-version, OS-version
- **Kill switches:** every new feature ships behind a flag, default-off
- **A/B testing:** native LD experimentation, not a separate tool
- **Audit log:** every flag change logged, SOC 2-grade

No GrowthBook. No Statsig free tier. No homegrown.

### Why LaunchDarkly

Industry standard for regulated fintech. Approval workflows, audit logs,
session-replay integration, and rollback semantics that satisfy SOC 2.
Stripe, Netflix, JPMorgan all run it. Cost is per-MAU but flat at
enterprise tier.

---

## §8 — Bank data: Plaid (full product suite) + Finicity

### Decision

- **Primary aggregator:** Plaid Production from day 1
- **Products enabled:** Transactions + Investments + Liabilities + Income
- **Secondary aggregator:** Finicity (Mastercard Data Connect) for
  institutions Plaid misses (~5-10% of US coverage gap)
- **Architecture:** `AggregatorClient` interface with Plaid + Finicity
  implementations — switchable per Item based on coverage

### Why all four Plaid products from day 1

- **Transactions** — the core feed (mandatory)
- **Investments** — surfaces portfolio milestones (huge engagement lever for
  fintech-curious users)
- **Liabilities** — credit cards, mortgages, student loans → unlocks
  net-worth tracking + debt-paydown reactions
- **Income** — verified payroll for confidence in paycheck-detection rules

Paying for all four from day 1 (~$0.60-0.90/Item/mo) vs adding them as
"phase 5 nice-to-haves" means the pet has the richest financial context
from the user's first day.

---

## §9 — Hardware specs

### MCU

- **Chip:** Nordic nRF54L15 (released late 2024)
- **Why:** 30% better power efficiency than nRF52840, integrated Bluetooth
  5.4, smaller package, RISC-V coprocessor for sensor processing
- **Toolchain:** Nordic nRF Connect SDK (Zephyr-based)
- **BLE stack:** Nordic SoftDevice (gold-standard)

### Display

- **Part:** Sharp Memory LCD LS013B7DH06 (3-bit color, 144×168)
- **Why:** always-on at µA draw, color (vs LS013B7DH03 monochrome), better
  pet visibility than OLED for ambient use
- **Driver:** SPI

### Haptic

- **Motor:** LRA (linear resonant actuator) — TI DRV2605L driver IC
- **Why:** Apple-Watch-grade taps (not ERM buzz), tunable waveforms via
  DRV2605L's 123 named patterns

### RGB indicator

- **Part:** APA102 single RGB LED
- **Why:** better color accuracy than WS2812, faster refresh rate, no
  precise timing required (vs WS2812's 800kHz tight timing)

### Audio

- **Part:** MAX98357A I2S class-D amp + small 8Ω dynamic speaker (if audio in scope)
- **Why:** SPH0645LM4H-B is a microphone, not a speaker; MAX98357A drives a passive speaker directly over I2S with no external components; alternative is phone-only audio (likely choice for v1)

### Battery + PMIC

- **Battery:** 200mAh single-cell LiPo (rechargeable)
- **PMIC:** Maxim MAX77654 (integrated charger + 3 LDOs + fuel gauge in one
  chip)
- **Charging:** USB-C with PD-compliant negotiation
- **Why MAX77654:** one chip instead of separate charging IC + fuel gauge +
  regulators; saves PCB space, simpler firmware, used in Oura Ring Gen3

### Antenna

- **Type:** Saluki chip antenna (omnidirectional, well-matched at 2.4GHz)
- **Matching network:** designed by EE during PCB phase
- **RF shielding:** stamped sheet-metal can over radio section
- **Why:** RF performance is the most-overlooked hardware-quality dimension;
  bad antenna = constant BLE disconnects = product-killing

### Industrial design

- **Approach:** contracted ID firm (not DIY-OpenSCAD)
- **Materials:** PC/ABS injection-molded shell, polished or soft-touch
  finish; aluminum back option for premium SKU
- **Packaging:** custom box with foam insert, printed insert card, charging
  cable, sticker — like Apple unboxing

### Manufacturing

- **Tier:** premium contract manufacturer (Jabil, Flex, or equivalent — not
  Seeed Studio)
- **First production run:** 1000-5000 units (not 100 hand-assembled)
- **QA:** in-line ICT (in-circuit test) + functional test + visual
- **Certifications:** FCC Part 15, CE, UL, RoHS, REACH

---

## §10 — Audio + visual customization (production-quality)

### Pet sprites

- **Commission:** indie pixel artist or animation studio for ≥6 species,
  each with 4-6 evolution stages
- **Style:** original, not AI-generated (avoids App Store IP scrutiny + the
  AI-art uncanny valley)
- **Animation tooling:** Aseprite source files committed to repo
- **Rendering:** native Metal (iOS) + Vulkan (Android) for smooth 60-120fps

### Sound packs

- **Tier 1 (curated packs):** custom-commissioned from a sound designer
  (Soundsnap professional tier or commissioned from a Berklee-trained sound
  designer)
- **Tier 2 (meme bank):** commissioned voice-actor library, not CC0
  scrapings
- **Tier 3 (personal recordings):** Expo AV → native AVAudioRecorder /
  MediaRecorder; phone-local only (privacy posture preserved)

---

## §11 — Process: production-grade engineering

### Code review

- **Mandatory two-reviewer approval** on every PR to main (requires team
  ≥3; until then, AI-augmented self-review must be documented in PR body)
- **Required status checks:** all CI (backend Go test, iOS XCTest, Android
  JUnit, security scans, integration tests) green before merge
- **Branch protection rules enforced:** no force-push, no deletion, linear
  history, signed commits required on main

### Compliance

- **SOC 2 Type 2 audit:** Vanta or Drata-driven, audited by A-LIGN or
  Insight Assurance starting Year 1
- **Penetration test:** quarterly external pen-test by Cobalt or HackerOne
- **GLBA review:** outside counsel reviews data handling annually
- **PCI DSS:** SAQ A via Stripe (or higher if direct card storage ever)
- **Privacy:** GDPR + CCPA + CPRA compliant data-deletion endpoints,
  comprehensive audit logging

### Testing

- **iOS:** XCTest unit + UI tests, XCUITest end-to-end on real devices via
  AWS Device Farm
- **Android:** JUnit + Compose UI tests + Espresso, real-device matrix via
  Firebase Test Lab
- **Backend Go:** ≥90% line coverage required to merge, dockertest for
  integration tests against real Aurora-equivalent Postgres
- **End-to-end:** Playwright + Detox for cross-platform mobile e2e flows
  driven from CI on real devices

### Releases

- **Mobile:** weekly release cadence after launch, fast-follow patches via
  EAS Update or Apple/Google review
- **Backend:** continuous deployment via canary; instant rollback on
  Datadog SLO breach
- **Firmware:** monthly OTA via MCUmgr, signed firmware with NSIB secure
  boot

---

## §12 — Insurance + legal floor

- **Cyber liability:** $5M coverage minimum (Coalition or Embroker)
- **General liability:** $2M for hardware product liability
- **E&O (Errors & Omissions):** $2M for fintech advice/automation claims
- **D&O (Directors & Officers):** once board exists
- **LLC → C-Corp conversion** when raising priced round
- **Trademark "Coiny":** USPTO Class 9 (electronics) + Class 36 (financial)
  filed pre-public launch
- **Privacy Policy + ToS:** drafted by IP/data-protection lawyer (not
  template), reviewed annually

---

## §13 — Companion ecosystem

- **Apple Watch** companion launches alongside iPhone v1.0 (not deferred to
  Phase 4 — quality means parity from launch)
- **Wear OS** companion launches alongside Android v1.0
- **iOS Widgets** at all sizes — small, medium, large, lock-screen accessory
- **Android Widgets** via Jetpack Glance, all sizes
- **macOS menu bar app** for power users (Phase 3+)
- **CarPlay** integration (Phase 4+) — pet check-ins during driving

---

## What gets DELETED from prior plan

Items previously framed as "good enough" or "phase 1 acceptable" that are
now explicitly removed:

| Deleted | Replaced with |
|---|---|
| React Native + Expo (any role beyond throwaway prototype) | Native Swift + Kotlin from day 1 |
| Drizzle ORM | sqlc + Atlas migrations |
| Node + Fastify backend | Go + chi |
| Neon serverless Postgres | AWS Aurora Serverless v2 in VPC |
| Fly.io hosting | AWS ECS Fargate |
| Sentry + Grafana free tier | Datadog (full suite) |
| Clerk | WorkOS AuthKit |
| GrowthBook self-hosted | LaunchDarkly |
| Expo Push | Direct APNs + FCM |
| Resend | Postmark |
| M5StickS3 / ESP32-S3 prototyping path | nRF52840-DK or nRF54L15-DK from day 1 |
| nRF52840 production target | nRF54L15 production target |
| WS2812 RGB LED | APA102 |
| MAX17048 fuel gauge + MCP73831 charger (two ICs) | MAX77654 integrated PMIC |
| AI-generated sprite assets | Commissioned indie pixel artist |
| CC0 / scraped sound packs | Custom-commissioned sound design |
| Seeed Studio / JLCPCB Assembly | Premium contract manufacturer (Jabil-tier) |
| Self-merge + branch-guard hook (solo workflow) | Mandatory 2-reviewer PR approval |
| "Phase 5 add Investments to Plaid" | Plaid Investments from day 1 |
| "Defer Apple Watch to Phase 4" | Apple Watch ships alongside iPhone v1.0 |
| "Defer Widgets to later" | iOS Widgets at launch |

---

## What stays (correct under both lenses)

| Decision | Why it remains the right call |
|---|---|
| **Postgres engine** | Industry default for fintech, unchanged |
| **Plaid as primary aggregator** | Industry default, full product suite enabled |
| **Conventional Commits + semantic versioning** | Standard professional practice |
| **GitHub as source control + GitHub Actions for CI** | Industry default; only the workflows get harder |
| **OpenTelemetry as the instrumentation layer** | Vendor-neutral standard |
| **Zephyr RTOS + Nordic SoftDevice** | Already the production-grade BLE choice |
| **LRA haptic + DRV2605L driver** | Already the premium choice |
| **Sharp Memory LCD** | Already the right always-on display |

---

## Process: how this plan gets executed

1. **Throwaway prototype on RN** is still acceptable for week-1 validation
   (Loom demo for friends), but it is **explicitly thrown away** when
   native development starts. RN code does not evolve into production code.
2. **Native iOS development begins by week 2** in parallel with backend
   Go rewrite.
3. **Backend Go rewrite** happens in parallel with iOS work; cutover
   when both are at parity.
4. **AWS infrastructure** stands up first (week 1-2 of native phase) since
   it's the deployment target.
5. **Hardware** moves to nRF54L15-DK immediately for firmware prototyping;
   M5StickS3 work, if any exists, is also throwaway.
6. **Quality gates** at each milestone (90%+ test coverage, p99 latency
   targets met, SOC 2 control evidence collected, accessibility audit
   passed).

For the full milestone sequence and PR-by-PR plan, see
`docs/implementation-plan.md` (next update).

---

## Cost (informational only — not a constraint)

| Annual ongoing cost (year 1, low volume) | Estimate |
|---|---|
| AWS Aurora + ECS + CloudFront + WAF + KMS | ~$3-6k |
| Datadog (SMB tier) | ~$104k |
| LaunchDarkly | ~$10-20k |
| WorkOS AuthKit | $0 (free to 1M MAU) |
| Plaid Production (all 4 products, 100 users) | ~$1-2k |
| SOC 2 + Vanta + auditor | ~$30-45k |
| Cyber + GL + E&O insurance | ~$5-10k |
| Postmark | ~$200 |
| **Total ongoing year 1** | **~$155-190k** |

| One-time costs to launch | Estimate |
|---|---|
| Contracted EE for PCB design | $10-20k |
| Industrial design firm | $20-50k |
| Sprite artist commission (≥6 species × 4 stages) | $5-15k |
| Sound design commission | $5-10k |
| FCC + CE + UL certifications | $15-30k |
| Tooling (injection molding) | $20-50k |
| First production run (1000-5000 units, full stack) | $50-200k |
| Lawyer-drafted Privacy + ToS + GLBA review | $5-10k |
| Trademark filings | $2-5k |
| Penetration test (pre-launch) | $10-25k |
| App branding (icon, screenshots, preview video) | $10-30k |
| **Total one-time to launch** | **~$150-450k** |

These costs are documented so the plan's premise is honest, not because
they shape any decision in this doc. Quality is the constraint; everything
else gets fundraised against.
