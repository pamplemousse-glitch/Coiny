# Coiny — Complete Tech Stack Map

Visual one-stop reference. Every layer, every tool, every chip, with what
it's used for. Updated 2026-05-20.

For decision rationale see `docs/tech-stack.md`. For execution sequence see
`docs/implementation-plan.md`. This doc is the *map*, not the *plan*.

---

## 30-second overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  USER'S BANK ──[OAuth]──► PLAID ──[webhook]──► COINY BACKEND ──► PET     │
│                                                       │           ▲      │
│                                                  Postgres        BLE     │
│                                                       │           │      │
│                                                       └───►  MOBILE APP  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

User links bank in mobile app → Plaid sends transaction webhooks → backend
runs rule engine → reactions dispatched to mobile (push notification) and
to the physical pet device (BLE).

---

## Layer 1 — Hardware (Phase 2)

The physical Coiny device. Prototype on M5StickS3 dev board today; ship on
nRF52840 production design later.

```
┌──────────────────────────────────────────────────────┐
│                  COINY DEVICE                        │
│                                                       │
│  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌─────────┐  │
│  │ Display  │  │ Speaker │  │ Haptic │  │ Battery │  │
│  └────┬─────┘  └────┬────┘  └───┬────┘  └────┬────┘  │
│       │             │           │            │       │
│  ┌────┴─────────────┴───────────┴────────────┴────┐  │
│  │              MCU + BLE radio                    │  │
│  │       (Bluetooth Low Energy → phone)            │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────┐  ┌─────────┐                              │
│  │ Buttons│  │ RGB LED │                              │
│  └────────┘  └─────────┘                              │
└──────────────────────────────────────────────────────┘
```

### Components

| Component | Prototype (today) | Production (Phase 2 PCB) | Why / Purpose |
|---|---|---|---|
| **MCU** | M5StickS3 (ESP32-S3) | **nRF52840** (Nordic Semi) | Runs the firmware. Production chip is nRF52840 because BLE-only workloads last 9-12 months on a coin cell vs ESP32-S3's 3-5 days. Same chip Pebble / Oura / Fitbit / Tile use. |
| **BLE radio** | Integrated in MCU | Integrated in MCU | Bluetooth Low Energy connection to user's phone. The only way the pet receives reactions. |
| **Display** | M5StickS3 backlit color LCD | **Sharp Memory LCD** (LS013B7DH03 or similar) | Shows the pet sprite + animations. Memory LCD draws ~µA when static — enables the "always-on pet" feel without crushing battery. |
| **Haptic driver** | Adafruit DRV2605L (I2C) | Same DRV2605L (transfers) | Drives the vibration motor with 123 named haptic patterns. I2C — works with any MCU. |
| **Haptic motor** | 10mm ERM coin motor | **LRA motor** | LRA gives Apple-Watch-style taps, not ERM's buzz. Better "personality" feel. Drives subtle pet reactions when audio would be intrusive. |
| **Battery** | M5StickS3's built-in 250mAh LiPo + USB-C charging | **150-200mAh LiPo + USB-C** | Rechargeable LiPo vs swap-coin-cell because users expect plug-in charging in 2026. |
| **Charging IC + fuel gauge** | M5StickS3 built-in | **MCP73831 charging + MAX17048 fuel gauge** | Fuel gauge enables accurate battery % display. Users notice when this is wrong. |
| **Speaker** | M5StickS3 1W speaker + mic | **Drop or piezo only** | Most BLE wearables skip audio (office-friendliness + battery). Rich celebration audio plays on the user's phone, not the device. |
| **Buttons** | M5StickS3 2 built-in buttons | **1-2 tactile switches** | Tamagotchi feel: "feed pet," "check status," "interact." |
| **RGB LED** | (None on prototype) | **1 WS2812 or APA102** | Color-coded mood feedback (green=good, amber=warning, red=overspend). Visible even when screen is off. |
| **Antenna** | Internal M5StickS3 trace | **Chip antenna + matching network** | More forgiving RF for first PCB; lowers FCC certification risk. |
| **Case** | OpenSCAD 3D-printed prototype | Injection-molded ABS/PC | $0.50-2/unit at 1k volume. |

### Firmware toolchain

| Layer | Prototype | Production | Purpose |
|---|---|---|---|
| **RTOS** | ESP-IDF / Arduino-flavored | **Zephyr RTOS** | Schedules tasks, manages power, runs BLE stack |
| **BLE stack** | NimBLE (ESP) | **Nordic SoftDevice** | The industry-standard BLE stack; certified by Nordic |
| **Build system** | PlatformIO | **nRF Connect SDK** (`west`) | Compile + flash. Both have great VS Code integration. |
| **Language** | C++ | C / C++ | Standard embedded toolchain |
| **OTA updates** | TBD | **MCUmgr / SMP** (Zephyr-native) | Push firmware updates over BLE without USB |

---

## Layer 2 — Mobile App

```
┌──────────────────────────────────────────────────┐
│              MOBILE APP (iOS + Android)           │
│                                                   │
│   ┌────────────────────────────────────────────┐ │
│   │      React Native + Expo + TypeScript      │ │
│   │   ┌──────────────┐    ┌──────────────────┐ │ │
│   │   │  UI screens  │    │  State / hooks   │ │ │
│   │   └──────┬───────┘    └────────┬─────────┘ │ │
│   │          │                     │           │ │
│   │          ▼                     ▼           │ │
│   │   ┌──────────────┐    ┌──────────────────┐ │ │
│   │   │  Plaid Link  │    │   API client     │ │ │
│   │   │   SDK (RN)   │    │   (undici)       │ │ │
│   │   └──────────────┘    └──────────────────┘ │ │
│   └────────────────────────────────────────────┘ │
│                                                   │
│   ┌────────────────────────────────────────────┐ │
│   │   Native BLE module (Phase 2)              │ │
│   │   Swift on iOS + Kotlin on Android         │ │
│   │   wraps CoreBluetooth / BluetoothLeScanner │ │
│   └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Components

| Layer | Tool | Purpose |
|---|---|---|
| **Framework** | React Native | Cross-platform iOS + Android from one codebase |
| **Meta-framework** | Expo (SDK 54) | Build tooling, OTA updates, EAS Build, native module wrappers |
| **Language** | TypeScript (strict) | Type-safe code |
| **Router** | `expo-router` | File-based routing, deep links |
| **Sign-in** | **Clerk** (planned, M2) | Auth UI + session management. Easier than custom JWT for fintech. |
| **Bank linking** | `react-native-plaid-link-sdk` | Drop-in Plaid Link flow → returns `public_token` |
| **HTTP client** | Native `fetch` (Expo) | Talks to backend `/api/*` endpoints |
| **Push notifications** | Expo Push | Receives reaction notifications |
| **BLE (Phase 2)** | Native Swift module (Expo Modules API) + Native Kotlin module | Wraps CoreBluetooth (iOS) and BluetoothLeScanner (Android). Handles background BLE. Needed because `react-native-ble-plx` background story is fragile. |
| **Audio (Phase 3)** | Expo Audio | Plays celebration sounds + personalized recordings |
| **Local storage** | AsyncStorage / SecureStore | Personal voice recordings stay on phone (privacy-by-default) |
| **Lint** | Expo ESLint (default) | Code style |
| **Error tracking** | **Sentry** for Expo (planned, M1) | Capture mobile crashes |
| **Build** | EAS Build | Hosted iOS + Android builds without local Xcode pain |

---

## Layer 3 — Backend

```
┌────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│                                                             │
│   ┌──────────────────────────────────────────────────────┐ │
│   │           Fastify + TypeScript + Zod                  │ │
│   │                                                       │ │
│   │   ┌─────────────────┐    ┌─────────────────────────┐ │ │
│   │   │ /webhooks/plaid │    │  /api/* (REST)          │ │ │
│   │   │  (JWT verify)   │    │  pets / spending /      │ │ │
│   │   │                 │    │  plaid-link / devices / │ │ │
│   │   │                 │    │  subscriptions / etc.   │ │ │
│   │   └────────┬────────┘    └────────┬────────────────┘ │ │
│   │            │                      │                  │ │
│   │            ▼                      ▼                  │ │
│   │   ┌──────────────────────────────────────────────┐  │ │
│   │   │           Rule Engine (pure TS)              │  │ │
│   │   │   paycheck / overspend / savings / bill /    │  │ │
│   │   │   large_purchase / subscription_detected     │  │ │
│   │   └────────┬─────────────────────────────────────┘  │ │
│   │            │                                         │ │
│   │            ▼                                         │ │
│   │   ┌──────────────────────────────────────────────┐  │ │
│   │   │       Reaction dispatcher                     │  │ │
│   │   │   → push notification → mobile               │  │ │
│   │   │   → BLE command (via mobile) → device        │  │ │
│   │   └──────────────────────────────────────────────┘  │ │
│   └──────────────────────────────────────────────────────┘ │
│                                                             │
│   Drizzle ORM ──► Postgres                                  │
│   jose (JWT) ──► Plaid signature verify                     │
│   undici ────► outbound Plaid API calls                     │
└────────────────────────────────────────────────────────────┘
```

### Components

| Layer | Tool | Purpose |
|---|---|---|
| **Runtime** | Node 22 | Server runtime |
| **Language** | TypeScript (strict) | Type safety + shared types with mobile |
| **HTTP framework** | **Fastify** | Fast, type-friendly, near-Go performance for I/O-bound workloads |
| **Schema validation** | **Zod** | Validates env vars, HTTP bodies, webhook payloads |
| **ORM** | **Drizzle** | Type-safe SQL queries, schema-as-code, idiomatic migrations |
| **Database driver** | `postgres` (PG production) / `@electric-sql/pglite` (tests + dev fallback) | Connection pool to Postgres |
| **HTTP client** | **`undici`** | Calls to Plaid API |
| **JWT verification** | **`jose`** | Verifies Plaid webhook signatures (ES256) |
| **Linter** | **Biome 2.0** | Single-binary lint + format |
| **Test runner** | **Vitest** | Fast, ESM-native, in-memory test execution |
| **Test DB** | **PGlite** (in-memory Postgres) | Hermetic tests with real Postgres semantics |
| **Migrations** | `drizzle-kit` | Generates SQL migrations from schema |
| **Rate limiting** | `@fastify/rate-limit` | Protects webhook + API endpoints from floods |
| **Logging** | `pino` (Fastify built-in) | Fast JSON logs |
| **Error tracking** | **Sentry** for Node (planned, M1) | Captures backend errors |
| **Observability** | **OpenTelemetry → Grafana Cloud** (planned, M1) | Metrics, logs, traces |

### Backend tables (Postgres schema)

```
pet_state           ── singleton (id=1): mood, health, lastReactionAt, goals
reaction_history    ── append-only: every reaction with timestamp
processed_events    ── idempotency keyed on Plaid transaction_id
plaid_items         ── per-Item: access_token, cursor, sync state
category_overrides  ── user-defined merchant → category
device_tokens       ── Expo push tokens
transactions        ── all Plaid txns persisted (subscription detection)
```

---

## Layer 4 — Data + integrations

```
                 ┌───────────────────────┐
                 │       PLAID           │
                 │  (US bank aggregator) │
                 └──────────┬────────────┘
                            │
                            │ webhooks (JWT ES256)
                            │ /transactions/sync
                            ▼
   ┌────────────────────────────────────────────────┐
   │                COINY BACKEND                    │
   │                                                 │
   │  Drizzle ──► Postgres                           │
   └─────────────┬──────────────────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │      NEON       │
        │  Serverless PG  │
        │  (us-east-1)    │
        └─────────────────┘
```

### Components

| Service | Tool | Purpose | Replaces with at scale |
|---|---|---|---|
| **Bank data** | **Plaid** (sandbox now → production Phase 5) | Connects to ~11,000 US banks. Sends transaction webhooks. | (stays Plaid; Finicity as secondary for coverage gaps in Phase 5) |
| **Database** | **Neon** (serverless Postgres) | Persistence layer. Scales to zero. Branching for staging. | **AWS Aurora Serverless v2** in VPC at scale (SOC 2 requires VPC + KMS + CloudTrail) |
| **Auth (planned)** | **Clerk** | User identity, session management | (stays Clerk, or WorkOS at enterprise scale) |
| **Hosting** | **Fly.io** (`coiny-backend.fly.dev`) | Runs Docker container, handles HTTPS, manages secrets | **AWS ECS Fargate** in VPC at scale |
| **Push notifications** | Expo Push (planned) | Sends notifications to mobile | Direct APNs + FCM at scale |
| **Feature flags (planned)** | **GrowthBook** self-hosted | Kill switches + rollouts | (stays GrowthBook, or LaunchDarkly enterprise) |

---

## Layer 5 — DevOps / Infra

```
┌────────────────────────────────────────────────────────────────┐
│                  GitHub (pamplemousse-glitch/Coiny)             │
│                                                                 │
│  ┌──────────────────────┐   ┌────────────────────────────────┐ │
│  │  Branches            │   │   CI / Workflows               │ │
│  │   main (protected)   │   │                                │ │
│  │   feat/*  fix/*      │   │   backend-ci.yml               │ │
│  │   docs/*  chore/*    │   │   mobile-ci.yml                │ │
│  └──────────────────────┘   │   security.yml                 │ │
│                             │     ├─ Semgrep (SAST)          │ │
│  ┌──────────────────────┐   │     ├─ Gitleaks (secrets)     │ │
│  │  Dependabot          │   │     └─ Trivy (CVE scan)       │ │
│  │  weekly grouped      │   └────────────────────────────────┘ │
│  └──────────────────────┘                                       │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ gh CLI: fly deploy
                              ▼
                ┌──────────────────────────┐
                │        Fly.io            │
                │   coiny-backend.fly.dev  │
                │   iad region (Virginia)  │
                └──────────────────────────┘
                              │
                              │ Postgres connection (SSL)
                              ▼
                ┌──────────────────────────┐
                │     Neon Postgres        │
                │   us-east-1 (Virginia)   │
                └──────────────────────────┘
```

### Components

| Layer | Tool | Purpose |
|---|---|---|
| **Source control** | **GitHub** | Code repository |
| **CI** | **GitHub Actions** | Runs tests, lint, typecheck, security scans on every PR |
| **Dependency updates** | **Dependabot** | Weekly grouped PRs for npm + GitHub Actions |
| **SAST** | **Semgrep** (CI) | Static analysis — finds insecure patterns |
| **Secret scanning** | **Gitleaks** (CI) | Catches committed secrets |
| **Container scanning** | **Trivy** (CI) | Scans Docker image for CVEs |
| **Branch protection** | (paywalled until GH Pro $4/mo on private repo) | Prevents force-pushes, requires CI green |
| **Container build** | **Docker** (multi-stage) | Produces lean ~100MB Alpine image |
| **Hosting** | **Fly.io** | Runs Docker container, auto-restart, secrets vault |
| **Local secrets** | **macOS Keychain** + `bin/load-secrets.sh` | Never in `.env` files |
| **Production secrets** | **Fly secrets** (encrypted at rest) | `PLAID_CLIENT_ID`, `PLAID_SECRET`, `DATABASE_URL` |
| **CDN** | (none yet; Fly serves directly) | At scale: CloudFront in front of ALB |
| **DNS** | Fly's automatic | `coiny-backend.fly.dev` |

---

## Layer 6 — Monorepo + tooling

| Tool | Purpose |
|---|---|
| **pnpm** (v11.1.3) | Package manager — fast, disk-efficient, monorepo-native |
| **pnpm workspaces** | Defines `backend/`, `mobile/`, `shared/` as workspace packages |
| **Turborepo** | Build cache + task orchestration across packages |
| **Conventional Commits** | Commit message standard (`feat(scope): subject`) |
| **branch-guard hook** | Local git hook blocking direct commits to `main` |

---

## Layer 7 — Documentation

| Doc | Purpose |
|---|---|
| `README.md` | Quickstart + repo map |
| `CLAUDE.md` | Working conventions for code agents |
| `docs/handoff.md` | Current state, what's done, what's not |
| `docs/architecture.md` | System design + BLE flow |
| `docs/tech-stack.md` | Layer-by-layer decision rationale |
| `docs/proposed-changes.md` | Summary of every quality-audit change |
| `docs/implementation-plan.md` | 5-milestone PR sequence |
| `docs/feature-backlog.md` | Forward-looking feature list |
| `docs/product-brief.md` | Product north star (fill-in template) |
| `docs/plaid-integration.md` | Plaid API contract reference |
| `docs/security.md` | Security model |
| `docs/aggregators.md` | Why Plaid (with landscape) |
| **`docs/stack-map.md`** | **This doc — the visual map** |

---

## End-to-end product flow (one example)

A user gets paid. Here's what happens:

```
1. EMPLOYER ACH ──► USER'S CHASE ACCOUNT
                              │
2.                            │ (Plaid pollers see the new transaction)
                              ▼
                        ┌────────────┐
                        │   PLAID    │
                        └─────┬──────┘
                              │
3.                            │ POST https://coiny-backend.fly.dev/webhooks/plaid
                              │ Plaid-Verification: <JWT signed with ES256>
                              ▼
                  ┌────────────────────────┐
                  │   COINY BACKEND        │
                  │   (Fly.io, Fastify)    │
                  └────────┬───────────────┘
                           │
4. JWT verified via `jose` (kid → /webhook_verification_key/get)
   200 returned immediately
5. setImmediate(async () => { ... })
                           │
6.                         │ POST /transactions/sync (cursor, paginate)
                           │
                           ▼
                  ┌────────────────────────┐
                  │   PLAID                │
                  │   returns 1 added tx:  │
                  │   {amount: -2400.00,   │
                  │    name: "ACH DEPOSIT",│
                  │    pfc: INCOME_WAGES}  │
                  └────────────────────────┘
                           │
7. plaidTxToInternal()     │  (sign-flips, maps PFC)
8. persistTransactions()   ▼
                  ┌────────────────────────┐
                  │   NEON Postgres        │
                  │   transactions += 1    │
                  └────────────────────────┘
9. claimEvent(txn_id) → true (first time)
10. rule engine: evaluate(tx, goals)
    → matches paycheck_received
11. applyHealthDelta(+10), recordReaction("paycheck_received", {animation: celebrate, ...})
                           │
                           ▼
12. dispatchReaction()
    → push notification to mobile  ───► PHONE
    → BLE command via mobile       ───► PET (animation + sound + LED + haptic)
```

End-to-end: ~1-3 seconds from bank transaction settling to pet doing a
victory dance.

---

## What's missing / planned upgrades

See `docs/tech-stack.md` for full reasoning. Headlines:

| Now | Upgrading to | When |
|---|---|---|
| No error tracking | **Sentry** (backend + mobile) | M1 (this week, needs your free signup) |
| No metrics | **OpenTelemetry → Grafana Cloud** | M1 |
| No auth (hardcoded user_1) | **Clerk** | M2 (before multi-user) |
| Fly + Neon (sandbox-ready) | **AWS Aurora + ECS Fargate in VPC** | Before first real-money user |
| ESP32-S3 prototype | **nRF52840 production** | At PCB tape-out |
| `react-native-ble-plx` | **Native Swift + Kotlin BLE module** | Phase 2 |
| No feature flags | **GrowthBook** self-hosted | Before first real user |
