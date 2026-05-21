# Coiny — Proposed Changes (Quality-Only Plan)

Summary of every change between the current prototype and the
quality-only target locked in `docs/tech-stack.md`. No velocity-aware
compromises. For execution sequence see `docs/implementation-plan.md`.

**Status legend:** 🟢 do now · 🟡 do before launch · ⚪ post-launch / Phase 4+

---

## Hardware changes

| # | Change | Current | Target | Why | When |
|---|--------|---------|--------|-----|------|
| H1 | **MCU** | M5StickS3 (ESP32-S3) prototype | **Nordic nRF54L15** (BLE 5.4, 30% better power than nRF52840) | Battery life + RF performance + production-grade chip | 🟡 At PCB tape-out |
| H2 | **Display** | TBD | **Sharp Memory LCD LS013B7DH06** (3-bit color, always-on, µA draw) | "Pet is always visible" feel; color > monochrome | 🟡 PCB design |
| H3 | **Battery** | Coin cell (if any) | **200mAh LiPo + USB-C PD charging** | User expects plug-in charging | 🟡 PCB design |
| H4 | **Haptic** | ERM (already ordered) | **LRA + DRV2605L driver** | Apple-Watch-grade taps vs ERM buzz | 🟡 PCB design |
| H5 | **PMIC** | None | **Maxim MAX77654** (integrated charger + 3 LDOs + fuel gauge) | One chip vs three; less PCB space; better firmware UX (used by Oura Ring Gen3) | 🟡 PCB design |
| H6 | **RGB indicator** | None | **APA102** RGB LED | Better color accuracy + faster refresh than WS2812 | 🟡 PCB design |
| H7 | **Audio** | M5StickS3 built-in speaker | **MAX98357A I2S amp + small 8Ω dynamic speaker** OR omit entirely (use phone audio) | SPH0645LM4H-B is a mic not a speaker; MAX98357A drives a passive speaker directly over I2S | 🟡 PCB design |
| H8 | **Antenna + shielding** | None planned | **Chip antenna with matched network + RF shield can** over radio | RF performance is the #1 hardware-quality dimension; bad antenna = BLE disconnects | 🟡 PCB design |
| H9 | **Industrial design** | DIY OpenSCAD prints | **Contracted ID firm + injection-molded PC/ABS shell + custom packaging** | Apple-unboxing-grade first impression | 🟡 Pre-manufacturing |
| H10 | **Contract manufacturer** | TBD | **Premium-tier CM (Jabil, Flex, or similar)** | Not Seeed Studio / JLCPCB Assembly; QA, certifications, supply chain | 🟡 Manufacturing prep |
| H11 | **Firmware OS** | PlatformIO/Arduino | **Zephyr RTOS via Nordic nRF Connect SDK** | Production-grade BLE stack, OTA, secure boot | 🟡 Firmware development |
| H12 | **Secure boot + signed firmware** | None | **NSIB secure boot + signed OTA via MCUmgr** | Required for any consumer hardware; tamper resistance | 🟡 Firmware development |
| H13 | **Certifications** | None | **FCC Part 15 + CE + UL + RoHS + REACH** | Required for any US/EU consumer sale | 🟡 Pre-launch |

## Software changes

| # | Change | Current | Target | Why | When |
|---|--------|---------|--------|-----|------|
| S1 | **iOS app** | React Native + Expo + TS | **Native Swift + SwiftUI + Combine + SwiftData** | 60-120fps animations, Widgets, Live Activities, Dynamic Island, Watch | 🟢 Begin immediately after RN prototype validates |
| S2 | **Android app** | React Native + Expo + TS | **Native Kotlin + Jetpack Compose + Coroutines + Room** | Same reasons, Android-native idioms | 🟡 3-6 mo after iOS native launch |
| S3 | **Mobile structure** | One RN codebase | **Two separate codebases, one monorepo (`ios/` + `android/`)** | No cross-platform abstraction tax | 🟢 With S1 |
| S4 | **iOS-first launch** | Simultaneous iOS+Android assumed | **iOS launches 3-6 months before Android** | Higher disposable income, better review pipeline, Apple Watch tie-in | 🟢 Strategic choice |
| S5 | **Apple Watch companion** | Not planned for v1 | **Ships with iOS v1.0** (not Phase 4) | "Pet on your wrist" is unfair engagement; complications + watch face | 🟢 With iOS launch |
| S6 | **iOS Widgets + Live Activities + Dynamic Island** | Not planned | **All three at launch** (small/medium/large/lock-screen widget + Live Activity for paycheck + Dynamic Island integration) | Always-glanceable pet; massive engagement multiplier | 🟢 With iOS launch |
| S7 | **Wear OS companion** | Not planned | **Ships with Android v1.0** | Parity with Apple Watch on Android side | 🟡 With Android launch |
| S8 | **Android Widgets** (Jetpack Glance) | Not planned | **All sizes at Android launch** | Android home-screen parity | 🟡 With Android launch |
| S9 | **Backend language** | Node + Fastify + TS | **Go + chi + sqlc** | <10ms p99 vs Node's 50-150ms tail; predictable concurrency; lower memory; what real fintech runs server-side | 🟢 Rewrite in parallel with native mobile |
| S10 | **Database hosting** | Neon (serverless Postgres) | **AWS Aurora Serverless v2 in private VPC** | SOC 2 / banking partnership-acceptable; multi-AZ; PITR; KMS-encrypted; CloudTrail audit | 🟡 Before any production user |
| S11 | **ORM / data layer** | Drizzle ORM | **sqlc + Atlas migrations** | Generated typed Go from raw SQL; banking auditors prefer SQL transparency over ORM magic; declarative migrations | 🟢 With Go backend |
| S12 | **Hosting** | Fly.io | **AWS ECS Fargate in VPC + ALB + CloudFront + WAF** | VPC isolation, IAM-controlled, CloudTrail audit | 🟡 Before any production user |
| S13 | **IaC** | None | **AWS CDK in TypeScript** | Reproducible infra, multi-env, OIDC-trusted deploys | 🟡 With S12 |
| S14 | **Multi-region deployment** | Single region (iad) | **Active-active in us-east-1 + us-west-2** | Banking-grade availability | 🟡 Pre-launch |
| S15 | **Secrets** | Fly secrets | **AWS Secrets Manager + KMS-managed keys + auto-rotation** | Audit-trail, IAM-controlled, SOC 2 acceptable | 🟡 With S12 |
| S16 | **Authentication** | None (hardcoded `user_1`) | **WorkOS AuthKit** (SAML/SSO/SCIM-ready) | Standards-based, less lock-in than Clerk, B2B-ready, audit logs | 🟢 Day 1 of native rewrite |
| S17 | **Multi-user data model** | Singleton | **`user_id` FK on every table; per-user isolation** | Required for multi-user; banking-partner-acceptable | 🟢 With S16 |
| S18 | **Feature flags** | None | **LaunchDarkly** | Approval workflows, audit logs, rollback semantics auditors love | 🟡 Pre-launch |
| S19 | **Observability** | `pino` logs + planned Sentry + planned Grafana free tier | **Datadog full suite** (APM + Logs + Metrics + RUM + Synthetics + Profiler + Error Tracking) | Single pane of glass; cross-signal root cause; what every meaningful fintech runs | 🟢 Day 1 of native rewrite |
| S20 | **SAST / SCA / secret scanning** | Semgrep + Gitleaks + Trivy + Dependabot ✅ | **Add Snyk + CodeQL + Trivy + signed commits required** | Defense in depth; CodeQL catches what Semgrep misses; signed commits = supply-chain | 🟡 Pre-launch |
| S21 | **Audit logging** | None | **`audit_log` table + middleware on every financial-data mutation** | SOC 2 + GLBA + banking partner requirements | 🟢 With S16 |
| S22 | **Push notifications** | None / planned Expo Push | **Direct APNs + FCM** (native SDKs in iOS/Android) | Full control over delivery, Live Activity payloads, critical alerts, no Expo middleman | 🟢 With native apps |
| S23 | **Transactional email** | None | **Postmark** | Best deliverability + transactional templating; not Resend (newer) | 🟡 With user registration |
| S24 | **CDN** | None (Fly direct) | **CloudFront in front of ALB** | DDoS protection + geographic latency + WAF coverage | 🟡 With S12 |
| S25 | **WAF** | None | **AWS WAF with managed rules + custom rules** | Required for banking-grade API protection | 🟡 With S12 |
| S26 | **Mobile sprite assets** | Plan was AI-generated for prototype | **Commissioned indie pixel artist; ≥6 species × 4 evolution stages; Aseprite source files in repo** | App Store IP-clean; uncanny-valley-free; brand voice consistent | 🟡 Pre-launch |
| S27 | **Audio packs** | Plan was CC0 placeholders | **Custom-commissioned sound design** (Berklee-trained or Soundsnap pro) for all curated packs | Production-grade audio; brand-consistent | 🟡 Pre-launch |
| S28 | **Plaid product suite** | Transactions only | **Transactions + Investments + Liabilities + Income from day 1** | Net worth + portfolio milestones + debt paydown reactions + verified income | 🟢 Day 1 of Plaid Production access |
| S29 | **Aggregator abstraction** | Direct Plaid imports | **`AggregatorClient` interface; Plaid + Finicity as second source** | Coverage gaps in Plaid (~5-10% US) filled by Finicity | 🟡 Before launch |
| S30 | **Tests** | Vitest + PGlite | **iOS: XCTest + XCUITest on real devices via AWS Device Farm; Android: JUnit + Compose UI + Espresso via Firebase Test Lab; Backend Go: stdlib + testify + dockertest; e2e: Playwright + Detox** | Production-grade testing across the matrix | 🟢 With native rewrite |
| S31 | **Code coverage floor** | None | **90%+ on every package** | Quality-only standard | 🟢 With native rewrite |

## Process changes

| # | Change | Current | Target | When |
|---|--------|---------|--------|------|
| P1 | **PR review** | Self-merge while solo | **Mandatory 2-reviewer approval on every PR to main** | When team ≥3; until then, AI-augmented self-review documented in PR body |
| P2 | **Required status checks** | Advisory only | **All CI gates blocking** (backend Go test, iOS XCTest, Android JUnit, security scans, integration, coverage floor) | 🟢 Immediate |
| P3 | **Signed commits on main** | None | **Required GPG/SSH-signed commits on main; `Verified` badge mandatory** | 🟢 Immediate (GitHub Pro or public repo) |
| P4 | **Canary deployments** | None (atomic Fly deploy) | **CodeDeploy canary 10% → 50% → 100% over 30 min with auto-rollback on Datadog SLI breach** | 🟡 With S12 AWS migration |
| P5 | **Quarterly external penetration test** | None | **Cobalt or HackerOne** | 🟡 Year 1 |
| P6 | **SOC 2 Type 2 audit** | None | **Vanta/Drata + A-LIGN auditor — start collecting evidence immediately, first audit window Year 1** | 🟡 Year 1 |
| P7 | **GLBA review** | None | **Outside counsel review annually** | 🟡 Year 1 |
| P8 | **Linear git history on main** | Not enforced | **Required + force-push disabled** | 🟢 Immediate |
| P9 | **OIDC trust GitHub Actions → AWS** | None (PAT-based) | **OIDC required; no long-lived tokens in CI** | 🟡 With S12 |
| P10 | **SBOM generation per release** | None | **Syft + signed in transparency log (Sigstore)** | 🟡 Pre-launch |

## Compliance + insurance

| # | Change | Target | When |
|---|--------|--------|------|
| C1 | **Privacy Policy + ToS** | **Lawyer-drafted; not template; reviewed annually** | Pre-launch |
| C2 | **Cyber liability insurance** | **$5M coverage (Coalition or Embroker)** | Pre-launch |
| C3 | **General liability insurance** | **$2M (hardware product liability)** | Pre-launch |
| C4 | **E&O insurance** | **$2M (fintech advice/automation)** | Pre-launch |
| C5 | **D&O insurance** | **Once board exists** | Post-Series A |
| C6 | **Trademark "Coiny"** | **USPTO Class 9 (electronics) + Class 36 (financial services)** | Pre-public-launch |
| C7 | **GDPR + CCPA + CPRA compliance** | **Audited delete-my-account endpoint; comprehensive audit logging** | Pre-launch |

## Decisions LOCKED (no longer open)

These were marked "open decisions" in prior drafts — now committed:

- ✅ **Mobile:** native Swift + Kotlin, two codebases, iOS-first
- ✅ **Backend:** Go + chi + sqlc + Atlas
- ✅ **DB host:** AWS Aurora Serverless v2 in VPC (not Neon, not Supabase, not Fly Postgres)
- ✅ **App host:** AWS ECS Fargate (not Fly, not Render, not Vercel)
- ✅ **Auth:** WorkOS AuthKit (not Clerk, not Auth0, not custom)
- ✅ **Feature flags:** LaunchDarkly (not GrowthBook, not Statsig)
- ✅ **Observability:** Datadog (not Sentry+Grafana split)
- ✅ **IaC:** AWS CDK in TypeScript (not Terraform)
- ✅ **MCU:** Nordic nRF54L15 (not nRF52840, not ESP32-S3)
- ✅ **RGB LED:** APA102 (not WS2812)
- ✅ **PMIC:** Maxim MAX77654 (not separate MCP73831 + MAX17048)

## What gets DELETED from the prior plan

Items that were "good enough for solo dev" and are now removed:

- React Native + Expo (anywhere beyond a week-1 throwaway validation prototype)
- Drizzle ORM
- Neon serverless Postgres
- Fly.io hosting
- Clerk auth
- GrowthBook feature flags
- Sentry + Grafana free tier split observability
- Expo Push
- M5StickS3 / ESP32-S3 as a production path
- nRF52840 as the locked production MCU (replaced by nRF54L15)
- WS2812 RGB LED
- MAX17048 + MCP73831 two-chip power approach
- AI-generated sprite assets for production
- CC0-scraped sound packs for production
- Seeed Studio / JLCPCB Assembly as the manufacturing path
- "Phase 5 Plaid Investments" deferral (Investments enabled from day 1)
- "Phase 4 Apple Watch companion" deferral (ships with iOS v1.0)
- Self-merge workflow on main (replaced by mandatory 2-reviewer when team ≥3)
