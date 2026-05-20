# Coiny — Complete Tech Stack Map (Quality-Only)

Visual one-stop reference for the **quality-only stack** locked in
`docs/tech-stack.md`. Every layer, every tool, every chip — with what it's
used for. Updated 2026-05-20.

For decision rationale: `docs/tech-stack.md`.
For execution sequence: `docs/implementation-plan.md`.
This doc is the *map*, not the *plan*.

---

## 30-second overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  USER'S BANK ──[OAuth]──► PLAID + FINICITY ──[webhook]──► COINY BACKEND  │
│                                                              │           │
│                                                          AWS Aurora      │
│                                                              │           │
│  iOS (Swift) + Apple Watch + Widgets + Live Activities ◄────┘           │
│  Android (Kotlin) + Wear OS + Widgets                                    │
│                          │                                               │
│                       Direct                                             │
│                        BLE                                               │
│                          │                                               │
│              ┌───────────▼───────────┐                                   │
│              │  COINY DEVICE          │                                  │
│              │  nRF54L15 + Memory LCD │                                  │
│              │  + LRA + APA102        │                                  │
│              └────────────────────────┘                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

User links bank in native mobile app → Plaid sends transaction webhooks →
Go backend on AWS verifies, persists in Aurora, runs rule engine →
reactions dispatched to mobile (direct APNs/FCM push) and to the physical
nRF54L15 device (BLE).

---

## Complete end-to-end stack (one graphic)

The full quality-only product stack, top (user) to bottom (user's bank).
Every layer labeled with its tools.

```
                  ╔═══════════════════════════════════════════════╗
                  ║                    USER                        ║
                  ║       carries device · uses iPhone / Android   ║
                  ╚═══════════════════════════════════════════════╝
                          │                              │
                  ┌───────┴──────┐               ┌──────┴────────────┐
                  │  device      │               │  native app +     │
                  │  in pocket   │               │  watch + widgets  │
                  ▼              ▼               ▼                   ▼
   ╔══════════════════════════════════╗   ╔══════════════════════════════════════╗
   ║         COINY DEVICE             ║   ║      NATIVE MOBILE STACK              ║
   ║  ┌─────────────────────────────┐ ║   ║  ┌─────────────────────────────────┐ ║
   ║  │ HARDWARE                    │ ║   ║  │ iOS — Swift + SwiftUI + Combine │ ║
   ║  │  • Nordic nRF54L15 MCU      │ ║   ║  │       + SwiftData + Xcode       │ ║
   ║  │    (BLE 5.4, 30% better      │ ║   ║  ├─────────────────────────────────┤ ║
   ║  │     power than nRF52840)    │ ║◄──║  │ Apple Watch companion (watchOS) │ ║
   ║  │  • Sharp Memory LCD          │ ║BLE║  │ iOS Widgets (small/med/large +  │ ║
   ║  │    LS013B7DH06 (color, µA)  │ ║   ║  │   lock-screen accessory family) │ ║
   ║  │  • LRA + DRV2605L driver    │ ║   ║  │ Live Activities + Dynamic Island│ ║
   ║  │  • APA102 single RGB LED    │ ║   ║  │ Auth:  WorkOS AuthKit Swift SDK │ ║
   ║  │  • 1-2 tactile buttons      │ ║   ║  │ Bank:  Plaid Link iOS SDK       │ ║
   ║  │  • 200mAh LiPo + USB-C PD   │ ║   ║  │ BLE:   CoreBluetooth (native)   │ ║
   ║  │  • MAX77654 integrated PMIC │ ║   ║  │ Push:  Direct APNs              │ ║
   ║  │  • Knowles I2S MEMS speaker │ ║   ║  │ Obs:   Datadog RUM iOS SDK      │ ║
   ║  │  • Chip antenna + RF shield │ ║   ║  ├─────────────────────────────────┤ ║
   ║  ├─────────────────────────────┤ ║   ║  │ Android — Kotlin + Jetpack      │ ║
   ║  │ FIRMWARE                    │ ║   ║  │   Compose + Coroutines + Hilt   │ ║
   ║  │  • Zephyr RTOS              │ ║   ║  │   + Room (3-6 mo after iOS)     │ ║
   ║  │  • Nordic SoftDevice (BLE)  │ ║   ║  ├─────────────────────────────────┤ ║
   ║  │  • Nordic nRF Connect SDK   │ ║   ║  │ Wear OS companion               │ ║
   ║  │  • NSIB secure boot         │ ║   ║  │ Android Widgets (Jetpack Glance)│ ║
   ║  │  • MCUmgr signed OTA        │ ║   ║  │ Plaid Link Android SDK          │ ║
   ║  └─────────────────────────────┘ ║   ║  │ BluetoothLeScanner + fg service │ ║
   ║                                  ║   ║  │ Direct FCM                      │ ║
   ║  Manufacturing: premium CM        ║   ║  │ Datadog RUM Android SDK         │ ║
   ║  (Jabil-tier, not Seeed)          ║   ║  └─────────────────────────────────┘ ║
   ║  Industrial design: contracted    ║   ║                                       ║
   ║  ID firm; injection-molded PC/ABS ║   ║  Two codebases, one monorepo:         ║
   ║  Certifications: FCC + CE + UL    ║   ║   ios/   android/                     ║
   ╚══════════════════════════════════╝   ╚════════════════╤═════════════════════╝
                                                            │
                                                            │ HTTPS (TLS 1.3)
                                                            │ + WorkOS session JWT
                                                            ▼
                  ╔══════════════════════════════════════════════════════════════╗
                  ║                COINY BACKEND (Go + chi)                       ║
                  ║                                                               ║
                  ║   ┌───────────────────────────────────────────────────────┐  ║
                  ║   │                                                         │  ║
                  ║   │  ┌──────────────────────┐  ┌────────────────────────┐  │  ║
                  ║   │  │ POST /webhooks/plaid │  │ /api/* (REST + OpenAPI)│  │  ║
                  ║   │  │ verify ES256 JWT     │  │ pets · spending ·      │  │  ║
                  ║   │  │ (crypto/ecdsa)       │  │ subscriptions · etc.   │  │  ║
                  ║   │  │ + request_body_sha256│  │ + WorkOS auth middleware│  │  ║
                  ║   │  └─────────┬────────────┘  └──────────┬─────────────┘  │  ║
                  ║   │            │                          │                │  ║
                  ║   │            ▼                          ▼                │  ║
                  ║   │  ┌─────────────────────────────────────────────────┐   │  ║
                  ║   │  │            Rule Engine (pure Go)                 │   │  ║
                  ║   │  │   paycheck · overspend · savings · bill · large  │   │  ║
                  ║   │  │   purchase · subscription · investment milestone │   │  ║
                  ║   │  │   · debt paydown · net-worth threshold           │   │  ║
                  ║   │  └─────────┬──────────────────────────────────────┘   │  ║
                  ║   │            │                                            │  ║
                  ║   │            ▼                                            │  ║
                  ║   │  ┌─────────────────────────────────────────────────┐   │  ║
                  ║   │  │  Reaction Dispatcher (Asynq jobs via Redis)      │   │  ║
                  ║   │  │   → animation · sound · LED · haptic            │   │  ║
                  ║   │  │   → push via direct APNs/FCM                    │   │  ║
                  ║   │  │   → BLE command relayed by mobile               │   │  ║
                  ║   │  └─────────────────────────────────────────────────┘   │  ║
                  ║   └────────────────────────┬───────────────────────────────┘  ║
                  ║                            │ sqlc + Atlas migrations           ║
                  ║                            ▼                                   ║
                  ║   ┌──────────────────────────────────────────────────────┐    ║
                  ║   │ AWS AURORA SERVERLESS v2 · Postgres 16 · VPC-private  │    ║
                  ║   │   pet_state · reaction_history · processed_events ·   │    ║
                  ║   │   plaid_items · transactions · category_overrides ·   │    ║
                  ║   │   device_tokens · audit_log · users · sessions ·      │    ║
                  ║   │   subscriptions · investments · liabilities · income  │    ║
                  ║   └──────────────────────────────────────────────────────┘    ║
                  ║                                                               ║
                  ║   Hosting:        AWS ECS Fargate (us-east-1 + us-west-2)    ║
                  ║                   active-active, private subnets             ║
                  ║   CDN + WAF:      CloudFront + AWS WAF (managed + custom)    ║
                  ║   Secrets:        AWS Secrets Manager + KMS, auto-rotation   ║
                  ║   Cache:          AWS ElastiCache (Redis) for Asynq + kid    ║
                  ║                   cache + rate limit                         ║
                  ║   Observability:  Datadog APM + Logs + Metrics + RUM +       ║
                  ║                   Synthetics + Profiler + Error Tracking     ║
                  ║   Feature flags:  LaunchDarkly                                ║
                  ║   Auth:           WorkOS AuthKit                              ║
                  ║   Email:          Postmark (transactional)                   ║
                  ║   Status page:    Better Uptime managed                       ║
                  ║   Outbound HTTP:  net/http → Plaid + Finicity APIs            ║
                  ║   Idempotency:    Postgres advisory locks + transaction_id   ║
                  ║   Tests:          stdlib + testify + dockertest (real PG)   ║
                  ║                   90%+ coverage required                     ║
                  ╚════════════════════════════════╤════════════════════════════╝
                                                   │
                                                   │ HTTPS + auth body
                                                   ▼
                                       ╔════════════════════════════╗
                                       ║   PLAID PRODUCTION         ║
                                       ║                             ║
                                       ║  Products enabled day 1:    ║
                                       ║   • Transactions            ║
                                       ║   • Investments             ║
                                       ║   • Liabilities             ║
                                       ║   • Income                  ║
                                       ║                             ║
                                       ║  Webhook: ES256 JWT signed  ║
                                       ╚════════════════════════════╝
                                                   │
                                       (fallback for coverage gaps)
                                                   │
                                                   ▼
                                       ╔════════════════════════════╗
                                       ║   FINICITY                  ║
                                       ║   (Mastercard Data Connect) ║
                                       ║   Secondary aggregator      ║
                                       ║   ~5-10% coverage gap fill  ║
                                       ╚════════════════════════════╝
                                                   │
                                                   │ OAuth + screen-scrape
                                                   ▼
                                       ╔════════════════════════════╗
                                       ║      USER'S BANK            ║
                                       ║   Chase, BoA, Wells Fargo,  ║
                                       ║   Capital One, ~11,000 US   ║
                                       ║   banks                     ║
                                       ╚════════════════════════════╝


╔══════════════════════════════════════════════════════════════════════════╗
║                    BUILD / DEPLOY (sidecar to runtime)                    ║
║                                                                           ║
║   Developer  ──git push──►  GitHub (pamplemousse-glitch/Coiny)            ║
║                                  │                                        ║
║                                  ├──► Dependabot (weekly grouped PRs)     ║
║                                  │                                        ║
║                                  ├──► Required CI checks                  ║
║                                  │      backend-ci.yml  → go test, lint,  ║
║                                  │                        90% coverage    ║
║                                  │      ios-ci.yml      → XCTest +        ║
║                                  │                        XCUITest        ║
║                                  │      android-ci.yml  → JUnit + Compose ║
║                                  │                        UI tests        ║
║                                  │      security.yml    → Semgrep +       ║
║                                  │                        Snyk + CodeQL + ║
║                                  │                        Gitleaks +      ║
║                                  │                        Trivy           ║
║                                  │      Required: 2-reviewer approval     ║
║                                  │                + signed commits         ║
║                                  │                                        ║
║                                  ▼                                        ║
║                          Squash-merge to main                             ║
║                                  │                                        ║
║                                  │ OIDC-trusted GitHub Actions → AWS     ║
║                                  ▼                                        ║
║                          AWS CodeDeploy canary deployment                 ║
║                          10% → 50% → 100% over 30 min                    ║
║                          auto-rollback on Datadog SLI breach              ║
║                                  │                                        ║
║                                  ├──► ECS Fargate (Go binary)             ║
║                                  ├──► AWS Aurora (Atlas migrations)       ║
║                                  ├──► AWS Secrets Manager (rotation)      ║
║                                  └──► CloudFront cache invalidation       ║
║                                                                           ║
║   IaC: AWS CDK in TypeScript                                              ║
║   Mobile builds: Xcode Cloud + Gradle CI (post-launch);                   ║
║                  EAS Build during early native rewrite phase              ║
║   App Store: EAS Submit (interim) / Xcode upload + ASC                    ║
║   Play Store: Gradle play-publisher                                        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## Layer-by-layer breakdown

### Layer 1 — Hardware

| Component | Part | Why this exact part |
|---|---|---|
| **MCU** | Nordic nRF54L15 | BLE 5.4, 30% better power than nRF52840, RISC-V coprocessor, smaller package |
| **Display** | Sharp Memory LCD LS013B7DH06 | 3-bit color, always-on at µA draw, 144×168 pixel |
| **Haptic** | LRA motor + DRV2605L driver | Apple-Watch-grade taps, 123 waveform library |
| **RGB LED** | APA102 single | Better color accuracy + faster refresh than WS2812 |
| **Battery** | 200mAh single-cell LiPo | Right size for coin form, USB-C PD rechargeable |
| **PMIC** | Maxim MAX77654 | Integrated charger + fuel gauge + 3 LDOs (one chip) |
| **Speaker** | Knowles SPH0645LM4H-B I2S MEMS (or omit) | Best quality at lowest power if audio in scope |
| **Antenna** | Saluki chip antenna + matching network | Omnidirectional, well-matched 2.4GHz |
| **RF shield** | Stamped sheet metal can over radio | Eases FCC certification, reduces interference |
| **Case** | PC/ABS injection-molded | Premium feel, polished or soft-touch finish |
| **Charging port** | USB-C with PD-compliant negotiation | Modern standard |

### Layer 2 — Firmware

| Layer | Tool | Purpose |
|---|---|---|
| **RTOS** | Zephyr | Preemptive multitasking, power management |
| **BLE stack** | Nordic SoftDevice | Production-grade, certified, gold standard |
| **SDK** | Nordic nRF Connect SDK | Build + flash via `west` |
| **Bootloader** | NSIB (Nordic Secure Immutable Bootloader) | Signed firmware verification |
| **OTA** | MCUmgr / SMP | Signed firmware updates over BLE |
| **Language** | C / C++ | Embedded standard |

### Layer 3 — iOS

| Layer | Tool | Purpose |
|---|---|---|
| **Language** | Swift (latest) | Apple-native |
| **UI** | SwiftUI | Modern, declarative, Metal-rendered |
| **State** | Combine + SwiftData | Reactive streams + persistence |
| **Build** | Xcode + Xcode Cloud | Apple-native CI |
| **Auth SDK** | WorkOS Swift SDK | Sign-in flow |
| **Bank link** | Plaid Link iOS SDK | Drop-in bank-link UI |
| **BLE** | CoreBluetooth (native) | Background BLE + CoreBluetooth state restoration |
| **Push** | Direct APNs (UserNotifications framework) | Live Activity payloads + critical alerts |
| **Observability** | Datadog iOS SDK (RUM + crash + APM) | Mobile telemetry |
| **Watch** | watchOS SwiftUI + ClockKit complications | Wrist app |
| **Widgets** | WidgetKit | All sizes + lock screen accessory |
| **Live Activities** | ActivityKit + Dynamic Island | Pro-tier polish |
| **Tests** | XCTest + XCUITest + AWS Device Farm | 90%+ coverage |

### Layer 4 — Android

| Layer | Tool | Purpose |
|---|---|---|
| **Language** | Kotlin (latest) | Google-native |
| **UI** | Jetpack Compose | Modern, declarative |
| **State** | Coroutines + Hilt | Async + DI |
| **DB** | Room | Local persistence |
| **Build** | Gradle + Android Studio | Standard |
| **Auth SDK** | WorkOS Kotlin SDK | Same auth flow as iOS |
| **Bank link** | Plaid Link Android SDK | Drop-in |
| **BLE** | BluetoothLeScanner + foreground service | Background BLE |
| **Push** | Direct FCM (Firebase Cloud Messaging) | Direct delivery |
| **Observability** | Datadog Android SDK | Mobile telemetry |
| **Watch** | Wear OS via Wearable Data Layer | Wrist companion |
| **Widgets** | Jetpack Glance | Compose-native widgets |
| **Tests** | JUnit + Compose UI + Espresso + Firebase Test Lab | 90%+ coverage |

### Layer 5 — Backend (Go)

| Layer | Tool | Purpose |
|---|---|---|
| **Runtime** | Go 1.23+ | Server runtime |
| **Router** | chi | Lightweight, idiomatic |
| **Logging** | zerolog | Structured, fast, low alloc |
| **Validation** | ozzo-validation | Composable rules |
| **Database driver** | pgx | Type-safe Postgres |
| **Query layer** | sqlc | Type-safe Go from raw SQL |
| **Migrations** | Atlas | Declarative |
| **Background jobs** | Asynq (Redis-backed) | Push fan-out, scheduled tasks |
| **JWT verification** | crypto/ecdsa stdlib | Plaid webhook verification |
| **HTTP client** | net/http stdlib | Calls to Plaid + Finicity |
| **Tests** | stdlib testing + testify + dockertest | Real Postgres in tests, 90%+ coverage |
| **OpenAPI** | swag from code annotations | iOS + Android SDK generation |

### Layer 6 — Data + integrations

| Service | Tool | Purpose |
|---|---|---|
| **Bank data primary** | Plaid Production (Transactions + Investments + Liabilities + Income) | All four products enabled day 1 |
| **Bank data secondary** | Finicity (Mastercard Data Connect) | Coverage gap fill |
| **Database engine** | Postgres 16 | Industry default |
| **Database host** | AWS Aurora Serverless v2 in VPC | Multi-AZ, PITR, KMS, CloudTrail |
| **Cache** | AWS ElastiCache (Redis) | Asynq, kid cache, rate limit |
| **Auth** | WorkOS AuthKit | SAML/SSO/SCIM-ready |
| **Push** | Direct APNs + FCM | Full delivery control |
| **Email** | Postmark | Transactional |
| **Feature flags** | LaunchDarkly | Enterprise-grade |
| **Observability** | Datadog | Full suite |

### Layer 7 — DevOps / Infra

| Layer | Tool | Purpose |
|---|---|---|
| **Source control** | GitHub | Standard |
| **CI** | GitHub Actions | Tests, lint, security scans |
| **Required reviews** | 2-reviewer mandatory | Quality gate |
| **Signed commits** | GPG/SSH-signed | Supply chain |
| **IaC** | AWS CDK in TypeScript | Reproducible infra |
| **Deploy** | AWS CodeDeploy canary | 10% → 50% → 100% with auto-rollback |
| **Container builds** | Multi-stage Docker → AWS ECR | Lean images |
| **Secrets** | AWS Secrets Manager + KMS | Auto-rotation |
| **WAF** | AWS WAF | Managed + custom rules |
| **CDN** | CloudFront | Geographic latency + DDoS protection |
| **DNS** | Route 53 | Apex management |
| **Status page** | Better Uptime managed | Public ops surface |
| **Synthetic monitoring** | Datadog Synthetics | 5-region uptime |
| **Penetration testing** | Cobalt or HackerOne quarterly | External validation |
| **SAST** | Semgrep + Snyk + CodeQL | Defense in depth |
| **Container scanning** | Trivy on every image | CVE catches |
| **Secret scanning** | Gitleaks (pre-commit + CI) | Catch leaks |
| **SBOM** | Syft + Sigstore signed | Supply chain artifact |
| **SOC 2** | Vanta + A-LIGN auditor | Year-1 audit window |

### Layer 8 — Compliance + insurance

| Item | Detail |
|---|---|
| **Privacy Policy** | Lawyer-drafted, annual review |
| **Terms of Service** | Lawyer-drafted, annual review |
| **Cyber liability insurance** | $5M coverage (Coalition or Embroker) |
| **General liability insurance** | $2M (hardware product liability) |
| **E&O insurance** | $2M (fintech advice/automation) |
| **D&O insurance** | Once board exists |
| **Trademark** | USPTO Class 9 + Class 36 filed pre-launch |
| **GDPR + CCPA + CPRA** | Delete-my-account endpoint + audit logging |
| **GLBA review** | Outside counsel annually |
| **PCI DSS** | SAQ A via Stripe |
| **SOC 2 Type 2** | Year-1 audit window, annual renewal |

---

## What stays from the original plan

- Plaid as primary aggregator (now full product suite)
- Postgres engine (now on Aurora)
- GitHub source control + Actions CI (now with required gates)
- Conventional Commits + semantic versioning
- Squash-merge workflow
- macOS Keychain for local secrets (during dev)
- Monorepo structure (now `ios/` + `android/` + `backend/` + `firmware/`)

---

## What's deleted from the original plan

- React Native + Expo (except week-1 throwaway prototype)
- Drizzle ORM → sqlc
- Neon → AWS Aurora
- Fly.io → AWS ECS Fargate
- Sentry + Grafana free tier → Datadog full suite
- Clerk → WorkOS AuthKit
- GrowthBook → LaunchDarkly
- Expo Push → Direct APNs + FCM
- Resend → Postmark
- M5StickS3 → nRF54L15-DK from day 1 of firmware
- nRF52840 as production target → nRF54L15
- WS2812 → APA102
- MAX17048 + MCP73831 → MAX77654 (one chip)
- AI-generated sprites → commissioned indie pixel artist
- CC0 sounds → commissioned sound design
- Seeed Studio / JLCPCB → premium CM (Jabil-tier)
- Self-merge → 2-reviewer mandatory (when team ≥3)
- "Phase 5 Investments" → day 1 Investments
- "Phase 4 Apple Watch" → ships with iOS v1.0
- "Trigger event for native rewrite" → native from MVP+1, locked

---

## Throwaway prototype lane (separate path)

For week-1 validation only, the previously-documented RN-based prototype
path (`docs/3-day-sprint.md`) still exists as a *throwaway*. Its purpose
is purely: prove the concept resonates with 3 friends, produce a 30-second
Loom for the landing page, get a yes/no on whether to build the real
quality-only stack.

**The RN prototype code does not evolve into the production codebase.**
It's deleted when the native iOS rewrite begins.
