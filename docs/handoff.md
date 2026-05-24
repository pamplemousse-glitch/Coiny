# Coiny — Project Handoff

**Last updated: 2026-05-24 (session 2)**

Read this first. Then read `docs/tech-stack.md` and `docs/implementation-plan.md`.

---

## What Is Coiny

A portable Tamagotchi-like carry device linked to the user's bank account via Plaid. The device reacts in real time to financial behavior — animated face, color LED, vibration, and sound — when the user does things aligned or misaligned with their personal finance goals.

---

## Repository

- **URL**: https://github.com/pamplemousse-glitch/Coiny (private)
- **Owner**: pamplemousse-glitch (Antoine)
- **Local path**: `/Users/antoinewiley/Tamogatchi`
- **Team**: Solo (Antoine). Code is written by Claude Code; Antoine handles physical setup, hardware, phone testing, and signups.

---

## Repo Structure

```
Coiny/
├── ios/               # Native Swift + SwiftUI — active development
│   ├── Coiny/         # App source (Views, ViewModels, Services, Models)
│   ├── CoinyTests/    # XCTest unit tests (40+ tests)
│   ├── CoinyUITests/  # XCUITest UI smoke tests
│   └── project.yml    # XcodeGen project definition
├── android/           # Native Kotlin + Jetpack Compose — scaffolded, not started
├── backend/           # Node.js / TypeScript / Fastify — active, hosted on Fly.io
│   ├── src/api/       # Route handlers (auth, pets, plaid, coinbase, zerion, spinwheel, account, net-worth)
│   ├── src/store/     # DB queries (users, sessions, items, pets, transactions, events)
│   ├── src/plaid/     # Plaid API client + webhook verifier
│   ├── src/coinbase/  # Coinbase Advanced Trade client (JWT ES256)
│   ├── src/coingecko/ # CoinGecko price lookup client
│   ├── src/zerion/    # Zerion DeFi portfolio client (Basic auth)
│   ├── src/spinwheel/ # Spinwheel debt client (Bearer + SMS OTP)
│   └── tests/         # 179 Vitest tests
├── firmware/          # nRF52840 + Zephyr — scaffolded, not started
├── mobile/            # Expo React Native — legacy prototype, superseded by ios/
├── shared/            # Cross-package TS types — BLE schema, pet state
├── hardware/case/     # OpenSCAD coin case (v1 sketch)
├── bin/               # Helper scripts (load-secrets.sh)
└── docs/              # All design docs — read before coding
```

---

## Architecture in One Picture

```
Bank / Crypto / DeFi / Debt APIs
         ↓
   Plaid webhooks (HMAC-verified) + Coinbase + Zerion + Spinwheel
         ↓
  Backend (Fastify/TS, Fly.io, Neon Postgres)
     Rule engine + APNs push dispatcher
         ↓
   Native iOS app (SwiftUI)
   Sign In with Apple → Plaid Link onboarding
   Pet view + Spending + Wealth + Crypto + Debt tabs
         ↓
  iOS BLE → Coiny device (nRF52840, Zephyr)
  Animated face + LED + vibration + sound
```

---

## Stack (Current vs Target)

| Layer | **Current (running today)** | **Target (docs/tech-stack.md)** |
|---|---|---|
| iOS | Native Swift + SwiftUI ✅ | Add Metal sprites, Widgets, Live Activities, Watch |
| Android | Kotlin scaffold (empty) | Full Jetpack Compose app |
| Backend | Node + Fastify + Drizzle, Fly.io, Neon | Go + chi + sqlc, AWS ECS Fargate + Aurora |
| Auth | Apple Sign In (JWT → session token) ✅ | WorkOS AuthKit |
| Bank data | Plaid (Transactions) ✅ | + Investments + Liabilities + Income |
| Crypto data | Coinbase + CoinGecko ✅ | — |
| DeFi | Zerion ✅ | — |
| Debt | Spinwheel ✅ | — |
| Firmware | nRF52840 scaffold | Nordic nRF54L15 + Zephyr RTOS |
| Observability | pino logs | Datadog full suite |
| Secrets | macOS Keychain → Fly secrets | AWS Secrets Manager + KMS |

---

## What Has Been Done

### Infrastructure & CI

- ✅ Repo created (private GitHub, pamplemousse-glitch/Coiny)
- ✅ pnpm workspaces + Turborepo monorepo
- ✅ Branch-guard hook: `git commit` on main is blocked
- ✅ `CLAUDE.md` with project conventions (auto-loaded each session)
- ✅ GitHub Actions CI: iOS (xcodebuild + unit tests), Android (Gradle), backend (Vitest), CodeQL, Trivy, Gitleaks, Semgrep (PR #60)
- ✅ CI hardening: SHA-pinned actions, SBOM, SCA, SwiftLint (PR #60)
- ✅ Backend deployed on Fly.io (`coiny-backend.fly.dev`)
- ✅ Postgres via Neon (prod + dev connection strings in Fly secrets)

### Backend (Node + Fastify + Drizzle, Fly.io)

- ✅ Plaid webhooks with HMAC-SHA256 + JWT signature verification + replay protection (PR #2, enhanced in #60)
- ✅ Plaid `/transactions/sync` + paginated sync, idempotent via `processed_events` table
- ✅ Rule engine: paycheck, overspend, savings milestone, bill paid, large purchase, subscription detection, decay
- ✅ Persistent Postgres via Neon: `pet_state`, `reaction_history`, `plaid_items`, `transactions`, `category_overrides`, `device_tokens`
- ✅ Multi-user schema: `users`, `sessions`, `coinbaseConnections`, `zerionWallets`, `spinwheelConnections` + per-user FK on all tables (PR #60, migrations 0005–0007)
- ✅ Auth plugin: Apple Sign In → session token (SHA-256 hash stored, 30-day sliding TTL)
- ✅ APNs push dispatch via background notifications + `registerDeviceToken`
- ✅ REST API: `/api/auth/apple`, `/api/pets`, `/api/plaid/*`, `/api/devices/*`, `/api/spending`, `/api/account`, `/api/coinbase/*`, `/api/zerion/*`, `/api/spinwheel/*`, `/api/net-worth`, `/api/debug/*`
- ✅ Rate limiting: per-user (SHA-256 of bearer token) with IP fallback
- ✅ `GET /api/net-worth` aggregates bank (Plaid) + crypto (Coinbase + CoinGecko) + DeFi (Zerion) + debts (Spinwheel), per-source try/catch (PR #81)
- ✅ **E2E pipeline proven** (PR #101): Vitest test proves full Plaid → rule engine → reaction path. Test fires a sandbox webhook, verifies `paycheck_received` reaction is persisted to DB and returned by `GET /api/pets`.
- ✅ 258 Vitest tests across 23 test files — all passing

### iOS App (Swift + SwiftUI)

- ✅ XcodeGen project definition (`ios/project.yml`) with LinkKit SPM package
- ✅ `CoinyApp` with three-state routing: SignInView → OnboardingView → RootView
- ✅ `HTTPClient` / `SessionStore` / `Keychain` protocol injection — full testability
- ✅ `API` actor with Bearer auth, auto-signout on 401, all 20+ endpoints (PR #81)
- ✅ **Sign In with Apple** → backend JWT → Keychain session token
- ✅ **OnboardingView**: Plaid Link flow (create token → open Link → exchange public token → `bankLinked = true`)
- ✅ **PetView**: breathing animation, celebrate bounce, sad droop, WaitingForFirstReactionView with tip carousel, debug fire-transaction button
- ✅ **ActivityView** (formerly SpendingView): reaction history feed
- ✅ **SettingsView**: bank status + unlink, goals display, sign-out, **Delete Account** (destructive alert → `DELETE /api/account` → coinySignedOut)
- ✅ **CryptoView** tab container (Coinbase + Zerion sub-tabs)
- ✅ **CoinbaseView**: connection status, connect with dev key, sync, disconnect
- ✅ **ZerionView**: wallet list (add/remove), portfolio total, sync
- ✅ **SpinwheelView**: SMS OTP flow (phone + DOB → OTP entry → connected), debt list, disconnect
- ✅ **NetWorthView**: large net-worth number (green/red), bank / crypto / DeFi / debts sections, pull-to-refresh, not-connected prompts with tab hints (PR #81)
- ✅ **RootView**: 6 tabs — Pet, Activity, Wealth, Crypto, Debt, Settings
- ✅ **`--ui-testing` bypass** in `CoinyApp`: XCUITests pass `--ui-testing` launch arg to skip Sign In/Onboarding and land on `RootView` with a best-effort debug session (PR #102)
- ✅ 76 iOS unit tests: APITests (15), CoinbaseViewModelTests (8), KeychainTests (3), NetWorthViewModelTests (3), PetStateDecodingTests, PetStoreTests (8), SessionStoreTests, SpinwheelViewModelTests (9), ViewSmokeTests (6), ZerionViewModelTests (7)
- ✅ `AppLaunchSmokeTests` UI test (XCUITest) — verifies SignInView renders at cold launch
- ✅ `TabNavigationTests` (8 XCUITests, PR #102) — programmatically taps all 6 tabs, asserts navigation bar title per tab (Pet/Activity/Wealth/Crypto/Debt Tracker/Settings)
- ✅ `ExportOptions.plist` ready for TestFlight archive (method: app-store-connect, automatic signing)

---

## In-Flight PRs

| PR | Title | Status | Notes |
|---|---|---|---|
| **#102** | `test(ios): comprehensive UITests for all 6 tabs — 54 XCUITests + MockURLProtocol` | Open | 54 UITests + MockURLProtocol; needs Cmd+U confirmation in Xcode before merge |

PRs #81, #91–#99, #101 merged. Backend at 258 tests. iOS at 130 tests (76 unit + 54 UI).

---

## What Has NOT Been Done

### iOS

- ❌ Metal-rendered sprite animations at 120fps (currently SF Symbols placeholders)
- ❌ Widgets (home screen, lock screen, StandBy)
- ❌ Live Activities + Dynamic Island (paycheck celebration in notification banner)
- ❌ Apple Watch companion app
- ❌ Pet customization (species selection, commissioned art)
- ❌ Sound packs
- ❌ Cash flow forecast UI
- ❌ SwiftData local persistence (all state is fetched live from backend)

### Backend

- ❌ Go rewrite (target is `docs/implementation-plan.md` M2)
- ❌ AWS infrastructure (target is M1 — ECS Fargate + Aurora + CloudFront + WAF)
- ❌ Plaid Investments + Liabilities + Income (only Transactions active)
- ❌ Datadog observability
- ❌ WorkOS authentication (currently Apple Sign In only)
- ❌ Audit logging (`audit_log` table)
- ❌ LaunchDarkly feature flags

### Hardware & Firmware

- ❌ Firmware project not initialized (`firmware/` is empty scaffold)
- ❌ BLE scanning / pairing / relay
- ❌ Hardware prototyping (M5StickS3 + DRV2605L ordered as of 2026-05-19)
- ❌ Custom PCB (nRF54L15 + Sharp Memory LCD + LRA + APA102 + MAX77654)

### Business / Legal

- ❌ Apple Developer Program ($99/yr) — needed before TestFlight
- ❌ LLC formation — needed before Plaid production + Apple Developer Org account
- ❌ Plaid production access — apply after sandbox validated end-to-end
- ❌ GLBA compliance review

---

## Local Dev Setup

### Backend

```bash
# Load secrets from macOS Keychain
source bin/load-secrets.sh

# Start backend (hot reload)
pnpm --filter coiny-backend dev

# Run tests
pnpm --filter coiny-backend test
```

### iOS

```bash
cd ios
xcodegen generate          # regenerates .xcodeproj from project.yml
open Coiny.xcodeproj       # then build + run in Xcode
```

Or from repo root:
```bash
xcodebuild -project ios/Coiny.xcodeproj -scheme Coiny -destination 'name=iPhone 17 Pro' build
xcodebuild -project ios/Coiny.xcodeproj -scheme Coiny -destination 'name=iPhone 17 Pro' test
```

### Secrets (macOS Keychain)

```bash
security find-generic-password -a "$USER" -s "coiny-plaid-client-id" -w
security find-generic-password -a "$USER" -s "coiny-plaid-sandbox-secret" -w
```

Keys stored: `coiny-plaid-client-id`, `coiny-plaid-sandbox-secret`. Loaded by `bin/load-secrets.sh` into env vars `PLAID_CLIENT_ID` and `PLAID_SECRET`.

---

## Next Session Priorities

### Immediate

1. **Confirm PR #102 UITests pass**: Open Xcode → Cmd+U with iPhone 17 Pro Simulator. Use Xcode MCP to pull results. Should show 130 tests (76 unit + 54 UI). Note: some UITests may fail due to view label mismatches — fix those before merging.

2. **TestFlight** — Apple Developer enrolled ✅, certs created ✅, Team ID = `UKL98DS9D3` ✅. **Blocked on App ID registration:**
   - Go to developer.apple.com/account → Certificates, Identifiers & Profiles → Identifiers → +
   - App IDs → App → Bundle ID: Explicit → `app.coiny.ios` → enable Sign In with Apple → Register
   - Then in Xcode: Product → Archive (destination: Any iOS Device arm64)
   - Xcode Organizer → Distribute App → App Store Connect → Upload
   - Add Antoine + Jack as internal testers in App Store Connect → TestFlight

3. **Spinwheel sandbox integration tests**: Spinwheel has a real sandbox at `sandbox-api.spinwheel.io`. Register at developer.spinwheel.io for a sandbox API key. Test users: Christy Jenoval (DOB 1967-06-08), Aldo Cherry (DOB 1990-01-01). Write backend Vitest tests hitting the real sandbox endpoint.

4. **Manual E2E smoke test**: tap "Debug: Skip Sign In" → link First Platypus Bank (user_good/pass_good) → tap "Reset cursor" → tap "Fire test transaction" → verify pet reacts

### iOS (highest leverage for demo readiness)

4. Replace SF Symbol face with an actual sprite / Lottie animation
5. Add Widgets (WidgetKit) — small widget with net worth + pet face
6. Live Activities for paycheck events

### Backend

7. Add Plaid Investments product to sync loop → net-worth crypto from Plaid
8. Add `GET /api/spending/summary` — weekly totals by category for ActivityView charts
9. Begin AWS infrastructure work (M1 in `docs/implementation-plan.md`)

### Firmware (once hardware arrives ~2026-05-26)

10. Init `firmware/` as a Zephyr workspace (nRF Connect SDK)
11. BLE GATT service schema matching `docs/mqtt-topics.md` command format
12. CoreBluetooth in the iOS app (CBCentralManager, scan/connect/write)

---

## Resuming Work

Start a fresh Claude Code session in `/Users/antoinewiley/Tamogatchi` and say:

> Read `docs/handoff.md`, `docs/tech-stack.md`, `docs/implementation-plan.md`, and `docs/product-brief.md`.
> The full Plaid → rule → reaction pipeline is proven (backend E2E test, PR #101).
> The backend has 258 passing tests; the iOS app has 86 tests (76 unit + 10 UITests).
> PR #102 (iOS UITests) is open — merge after confirming TabNavigationTests pass.
> Next: [describe specific task].

### Plaid sandbox credentials (for testing Link flow)

- Institution: any sandbox bank
- Username: `user_good`
- Password: `pass_good`

---

## Hardware (1 unit MVP — ordered 2026-05-19)

| Item | Cost | Status |
|---|---|---|
| M5StickS3 (K150) — ESP32-S3 prototype board | $36.59 | ✅ Ordered |
| Adafruit DRV2605L haptic driver | $7.95 + ship | ✅ Ordered |
| SparkFun Qwiic-to-Grove cable | $13.92 | ✅ Ordered (ETA 2026-05-26) |
| uxcell 10mm coin vibration motor 3V (10-pack) | $8.99 | ✅ Ordered (ETA 2026-05-24) |
| **Total** | **~$75** | |

**Note:** this is the throwaway prototype. Production hardware targets Nordic nRF54L15 + Sharp Memory LCD + LRA + APA102 + MAX77654 + LiPo (see `docs/proposed-changes.md` H1–H10).

---

## Economics (Reference)

- MVP cost: ~$75 hardware + $99/yr Apple Developer = ~$175
- Production BOM at 1K units: ~$20
- Retail target: $59–$79 hardware + $3.99/month
- Per-user/month API cost: ~$0.30 (Plaid) to $4 (Plaid + all integrations)
- Bank-data APIs dominate opex; subscription is structurally required
