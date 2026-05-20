# Coiny — Implementation Plan (Quality-Only)

Executable milestone sequence to deliver the quality-only stack locked in
`docs/tech-stack.md`. No velocity-aware compromises. Cost and effort are
documented but never used to downgrade a decision.

**This is the production-build plan.** A separate `docs/3-day-sprint.md`
exists for a throwaway RN validation prototype only — that code does not
evolve into the production codebase.

---

## Milestones

| Milestone | Definition | What unlocks |
|---|---|---|
| **M0 — Throwaway prototype** | RN demo on iOS Simulator validates the concept with friends (existing `docs/3-day-sprint.md`) | Decision-to-proceed gate; code is discarded |
| **M1 — AWS infrastructure** | Aurora + ECS Fargate + CloudFront + WAF + Secrets Manager + CDK in `us-east-1` + `us-west-2` live with the existing Node backend running on them | Production-grade hosting for Go rewrite to land on |
| **M2 — Backend Go rewrite + Datadog + WorkOS** | Coiny backend reimplemented in Go (chi + sqlc + Atlas) with full Datadog observability and WorkOS auth | Backend is production-grade; mobile teams have a target API |
| **M3 — Native iOS app + Apple Watch + Widgets + Live Activities** | Swift + SwiftUI app with full Plaid Link, Apple Watch companion, Widgets, Live Activities. Plaid Investments + Liabilities + Income wired. Native BLE via CoreBluetooth. | iOS-first launch ready |
| **M4 — iOS public launch on App Store** | App Store submission, marketing site live, waitlist converted, hardware shipping | First public users |
| **M5 — Native Android app + Wear OS + Widgets** | Kotlin + Jetpack Compose app with full Plaid + Wear OS companion + Widgets | Android-first users 3-6 months after iOS |
| **M6 — Hardware production (nRF54L15 + Sharp Memory LCD + LRA + APA102 + MAX77654)** | First production run (1000-5000 units) shipped from contracted CM, FCC + CE + UL certified | Hardware in user hands |

---

## M1 — AWS infrastructure stand-up

Estimated effort: ~3-4 weeks solo, ~1-2 weeks with help.

| # | PR / task | Output |
|---|-----------|--------|
| 1.1 | AWS account + Organizations setup (sandbox + production sub-accounts) | IAM-isolated environments |
| 1.2 | CDK in TS scaffold + VPC + private subnets + NAT gateway + Route 53 zone | Networking foundation |
| 1.3 | Aurora Serverless v2 cluster + RDS Proxy + Secrets Manager + KMS key | Database in private subnet |
| 1.4 | ECS Fargate cluster + ALB + target group + health checks | Compute target |
| 1.5 | CloudFront distribution + AWS WAF with managed rule sets | CDN + DDoS protection |
| 1.6 | OpenTelemetry collector deployed as ECS sidecar; OIDC trust GitHub Actions → AWS | Observability + deploy path |
| 1.7 | GitHub Actions: build Docker image → push to ECR → CodeDeploy canary | CI/CD pipeline |
| 1.8 | Migrate existing Node backend to ECS Fargate temporarily (interim) | Sandbox environment proven |
| 1.9 | Atlas migrations from Drizzle schema | Same schema, new home |
| 1.10 | Decommission Fly + Neon **after** Aurora cutover + 1 week soak | Old infra retired |
| 1.11 | Multi-region active-active replication (us-east-1 + us-west-2) | Geographic resilience |
| 1.12 | DR drill: take a region down, fail over, restore, validate | RTO/RPO verified |

**M1 gate:** sandbox webhook from Plaid lands on the AWS-deployed
backend, signature verified, transactions persisted in Aurora, traces in
Datadog, region failover drill successful.

---

## M2 — Backend Go rewrite + Datadog + WorkOS

Estimated effort: ~6-8 weeks solo.

| # | PR / task | Output |
|---|-----------|--------|
| 2.1 | Go module scaffold + chi router + zerolog + ozzo-validation | Go skeleton |
| 2.2 | sqlc + Atlas migrations matching existing Postgres schema | Type-safe query layer |
| 2.3 | Plaid webhook signature verifier in Go (crypto/ecdsa) | Webhook security |
| 2.4 | `/transactions/sync` paginated handler + idempotency via Postgres advisory locks | Sync flow |
| 2.5 | Rule engine ported to pure Go (paycheck, overspend, savings, bill_paid, large_purchase, subscription) | Business logic |
| 2.6 | Asynq + Redis (ElastiCache) for background jobs | Push fan-out, scheduled tasks |
| 2.7 | Datadog APM SDK + Logs + Profiler + Custom Metrics wired | Full observability |
| 2.8 | WorkOS AuthKit middleware (JWT verification + refresh flow) | Auth |
| 2.9 | `user_id` FK on every table; multi-user data isolation | Multi-user |
| 2.10 | `audit_log` table + middleware on every financial-data mutation | SOC 2 evidence |
| 2.11 | LaunchDarkly SDK wired for kill switches | Production-safe feature gates |
| 2.12 | Plaid Investments + Liabilities + Income product integrations | Full Plaid stack |
| 2.13 | `AggregatorClient` interface + PlaidAggregator + stub FinicityAggregator | Multi-vendor ready |
| 2.14 | OpenAPI spec generated from Go code; iOS + Android SDKs auto-generated | Type-safe clients |
| 2.15 | 90%+ test coverage via stdlib testing + testify + dockertest | Quality floor |
| 2.16 | Decommission Node backend; cutover to Go | Single backend |

**M2 gate:** Datadog dashboard shows p99 webhook latency <10ms; 90%+
test coverage; WorkOS sign-in working from a test iOS client; LaunchDarkly
kill switch flips traffic in <60s.

---

## M3 — Native iOS app + Watch + Widgets + Live Activities

Estimated effort: ~10-14 weeks solo (iOS app + Watch + Widgets in parallel).

### iOS app (Swift + SwiftUI)

| # | PR / task | Output |
|---|-----------|--------|
| 3.1 | Xcode project scaffold + SwiftUI app structure + SwiftData models | App skeleton |
| 3.2 | WorkOS SDK integration + sign-in/sign-up screens | Auth |
| 3.3 | Datadog RUM iOS SDK | Mobile observability |
| 3.4 | Plaid Link iOS SDK + bank-linking flow | Bank connection |
| 3.5 | Pet view (Metal-rendered sprites at 120fps, full animation set) | Core pet UX |
| 3.6 | Onboarding flow (Welcome → Link Bank → Meet Pet → notification permission) | First-launch |
| 3.7 | Goals + settings screens + delete-account flow | Account management |
| 3.8 | Spending feed + subscription detection UI | Insights |
| 3.9 | Net worth tracking (uses Plaid Liabilities + Investments) | Killer feature |
| 3.10 | Cash flow forecast UI | Killer feature |
| 3.11 | Pet customization (≥6 species + evolution stages, commissioned art) | Engagement |
| 3.12 | Sound packs (Tier 1 curated + Tier 2 meme bank + Tier 3 personal recordings) | Audio polish |
| 3.13 | Direct APNs registration + handling (Live Activity tokens, critical alerts) | Push |
| 3.14 | Accessibility audit: VoiceOver + Dynamic Type + Reduce Motion | App Store-grade |

### Apple Watch companion (watchOS)

| # | PR / task | Output |
|---|-----------|--------|
| 3.15 | watchOS app target + SwiftUI Watch UI | Wrist app |
| 3.16 | Watch complications (corner, modular, infograph) | Always-on glance |
| 3.17 | Background notification handling on watch | Wrist-first reactions |
| 3.18 | Pet "tap to feed" gesture from watch face | Wrist interaction |

### iOS Widgets

| # | PR / task | Output |
|---|-----------|--------|
| 3.19 | WidgetKit small/medium/large widgets | Home screen presence |
| 3.20 | Lock Screen accessory widgets (inline, rectangular, circular) | Lock screen |
| 3.21 | Widget intent configuration | User-configurable |

### Live Activities + Dynamic Island

| # | PR / task | Output |
|---|-----------|--------|
| 3.22 | ActivityKit integration for paycheck celebration | Ambient Live Activity |
| 3.23 | Dynamic Island compact + expanded + minimal layouts | Pro-tier polish |

### Native BLE module

| # | PR / task | Output |
|---|-----------|--------|
| 3.24 | CoreBluetooth wrapper: scan + connect + write + subscribe | BLE foundation |
| 3.25 | Background BLE mode (`bluetooth-central` Info.plist) + reconnection logic | Pocket-grade reliability |
| 3.26 | Reaction → BLE command translator | Device control |
| 3.27 | OTA firmware update via MCUmgr from app | Firmware updateable |

### Testing

| # | PR / task | Output |
|---|-----------|--------|
| 3.28 | XCTest unit tests for view models + services (90%+) | Unit coverage |
| 3.29 | XCUITest end-to-end on real iPhones via AWS Device Farm | E2E coverage |
| 3.30 | Performance tests — frame rate, BLE latency, battery drain | Quality gates |

**M3 gate:** TestFlight build runs end-to-end on real iPhone (Plaid Link
→ pet reacts to sandbox transactions → Widgets show pet → Live Activity
fires on paycheck → Watch complication updates). Real-device test passes
on iPhone 14, 15, 16. Accessibility audit clean.

---

## M4 — iOS public launch

Estimated effort: ~4-6 weeks (mostly external dependencies).

| # | PR / task | Output |
|---|-----------|--------|
| 4.1 | Plaid Production approval submission + responses | Real bank access |
| 4.2 | SOC 2 readiness evidence collection complete; Year-1 audit window begins | Audit started |
| 4.3 | Penetration test (Cobalt or HackerOne); remediation | Pre-launch security validated |
| 4.4 | Privacy Policy + ToS lawyer-drafted; reviewed | Legal floor |
| 4.5 | Cyber + GL + E&O insurance bound | Risk floor |
| 4.6 | Trademark filings submitted (Class 9 + Class 36) | IP protection started |
| 4.7 | App Store submission + Apple review iterations | App Store approval |
| 4.8 | Marketing site (Framer or Next.js + Vercel) + waitlist + press kit | Acquisition surface |
| 4.9 | Status page (Better Uptime managed) | Public ops surface |
| 4.10 | Customer support inbox (Front or Help Scout) + help center | Support surface |
| 4.11 | Postmark transactional email wired | Onboarding emails |
| 4.12 | Launch (announce + waitlist conversion + Product Hunt) | Public availability |

**M4 gate:** app live on App Store; first 100 real users onboarded; SOC
2 audit evidence collection running; Datadog dashboard shows production
traffic under SLO targets.

---

## M5 — Native Android + Wear OS + Widgets

Estimated effort: ~10-14 weeks (~3-6 months after iOS launch).

Parallels M3 but in Kotlin + Compose. Each iOS item has an Android twin:

| iOS item | Android equivalent |
|---|---|
| Swift + SwiftUI app | Kotlin + Jetpack Compose app |
| WorkOS Swift SDK | WorkOS Kotlin SDK |
| Datadog iOS RUM | Datadog Android RUM |
| Plaid Link iOS SDK | Plaid Link Android SDK |
| Apple Watch companion | Wear OS companion |
| iOS Widgets (WidgetKit) | Android Widgets (Jetpack Glance) |
| Live Activities + Dynamic Island | Android-native Always-On Display tiles |
| CoreBluetooth wrapper | BluetoothLeScanner + foreground service |
| XCTest + XCUITest + AWS Device Farm | JUnit + Espresso + Compose UI tests + Firebase Test Lab |

**M5 gate:** Google Play production release; Android user count
ramps; both platforms maintain feature parity.

---

## M6 — Hardware production

Estimated effort: ~6-9 months from PCB design start to first units shipping.

### Sub-milestones

| # | Task | Effort |
|---|------|--------|
| 6.1 | Contracted EE for PCB design (nRF54L15 + Sharp Memory LCD + LRA + APA102 + MAX77654 + chip antenna + RF shield) | 4-6 weeks |
| 6.2 | Industrial design firm engaged (case + packaging + branding) | 6-8 weeks |
| 6.3 | First PCB rev fabricated + assembled (engineering build, 20 units) | 4 weeks |
| 6.4 | Firmware development on real PCB (port from nRF54L15-DK) | 4-6 weeks |
| 6.5 | Internal testing + bug fixes + EE rev 2 if needed | 2-4 weeks |
| 6.6 | FCC Part 15 + CE + UL certifications (parallel tracks) | 4-8 weeks |
| 6.7 | Pre-production run (50-100 units) at premium CM | 4-6 weeks |
| 6.8 | Beta program to ~100 alpha testers | 4-8 weeks |
| 6.9 | First mass production run (1000-5000 units) | 8-12 weeks |
| 6.10 | Fulfillment partner integration (ShipBob or Shipmonk) | 2 weeks |

**M6 gate:** units shipping to paying customers; reliability metrics
within target (>99% BLE uptime, >6-month battery life on a single charge,
<0.5% RMA rate).

---

## What I (Claude) can execute alone

All software development across M1-M5 in pure code: backend Go rewrite,
native iOS app, native Android app, infrastructure CDK, all integrations,
all tests.

## What requires Antoine (or contractors)

| Item | Owner | When |
|---|------|------|
| AWS account + payment | Antoine | M1 start |
| Datadog account ($104k/yr) | Antoine | M2 start |
| LaunchDarkly account | Antoine | M2 |
| WorkOS account | Antoine | M2 start |
| Plaid Production approval (security questionnaire) | Antoine + Claude help | M4 |
| Apple Developer Program organization (requires LLC + D-U-N-S) | Antoine | M3 start |
| Google Play Console organization | Antoine | M5 start |
| LLC + EIN + business bank | Antoine | M1 start |
| Cyber + GL + E&O insurance | Antoine | M4 |
| Trademark filings | Antoine + IP lawyer | M4 |
| Privacy Policy + ToS lawyer drafting | Antoine + lawyer | M4 |
| SOC 2 readiness platform + auditor | Antoine | M3-M4 |
| Penetration test engagement | Antoine | M4 |
| Pet sprite artist commission | Antoine + artist | M3 |
| Sound design commission | Antoine + sound designer | M3 |
| Contracted EE for PCB | Antoine + EE | M6 start |
| Industrial design firm | Antoine + ID firm | M6 |
| FCC + CE + UL certification labs | Antoine | M6 |
| Premium CM relationship (Jabil-tier) | Antoine | M6 |
| App Store + Play Store submissions | Antoine | M4, M5 |

---

## Estimated total timeline

If everything is funded and contractors are available:

- **M1 (AWS):** months 1-2
- **M2 (Go backend):** months 2-4 (overlaps M1 end)
- **M3 (native iOS + Watch + Widgets):** months 3-7 (parallel with M2)
- **M4 (iOS launch):** months 7-9
- **M5 (Android):** months 9-13
- **M6 (hardware production):** months 4-13 in parallel (long lead time)

**End-to-end: 12-14 months** from quality-only plan kickoff to hardware
shipping with iOS + Android live.

Faster paths require either compromising quality (we are not doing this)
or hiring engineers (acceptable — adds ~$300k/yr per senior eng).

---

## Cost summary (estimated, year 1)

| Category | Cost |
|---|---|
| AWS infrastructure (year 1, low volume) | $5-10k |
| Datadog (SMB tier) | ~$104k |
| LaunchDarkly | $15-25k |
| WorkOS | $0 (free to 1M MAU) |
| Plaid Production (all 4 products, ~1k users) | $5-10k |
| SOC 2 (Vanta + audit) | $30-50k |
| Penetration test | $10-25k |
| Cyber + GL + E&O insurance | $5-15k |
| Privacy + ToS legal | $5-15k |
| Trademark filings | $2-5k |
| Apple Dev + Google Play | $124 |
| EE contractor for PCB | $20-40k |
| Industrial design firm | $30-60k |
| Pet art commission | $10-30k |
| Sound design commission | $10-20k |
| FCC + CE + UL certifications | $20-40k |
| First production run (1000 units) | $80-200k |
| Marketing site + branding | $10-30k |
| Postmark + Better Uptime + ancillary tools | $1-3k |
| **Total year 1** | **~$360-700k** |

These are costs to acknowledge, not to optimize against. Quality is the
constraint.

---

## What got cut from the prior plan

Items previously in `docs/implementation-plan.md` that no longer exist
because they were velocity compromises:

- ❌ "M1 quality floor" (Sentry+Grafana, Semgrep, Biome) — replaced by full Datadog from day 1 of M2
- ❌ "M2 auth + multi-user with Clerk" — replaced by WorkOS in M2
- ❌ "M3 compliance docs" as a separate step — folded into M4 launch readiness
- ❌ "M4 AWS migration" as a *future* step — moved to M1, the foundation
- ❌ "M5 native BLE module inside RN shell" — replaced by full native iOS+Android (M3, M5)
- ❌ "21 PR sequence over 3 weeks" — replaced by month-scale milestones because the work is real

The RN-with-native-BLE-bridge compromise no longer exists in this plan.

---

## Reference

- Stack rationale: `docs/tech-stack.md`
- Change summary: `docs/proposed-changes.md`
- Visual map: `docs/stack-map.md` (will be updated to reflect quality-only stack)
- Launch readiness: `docs/launch-readiness.md` (will be updated)
- Throwaway prototype path: `docs/3-day-sprint.md` (kept as validation step only)
