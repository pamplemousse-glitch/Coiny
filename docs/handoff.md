# Coiny — Project Handoff

**Last updated: 2026-05-24**

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
│   ├── src/plaid/     # Plaid API client + webhook verifier + adapter
│   ├── src/coinbase/  # Coinbase Advanced Trade client (JWT ES256)
│   ├── src/coingecko/ # CoinGecko price lookup client
│   ├── src/zerion/    # Zerion DeFi portfolio client (Basic auth)
│   ├── src/spinwheel/ # Spinwheel debt client (Bearer + SMS OTP)
│   └── tests/         # 186 Vitest tests
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
| Bank data | Plaid (Transactions + Investments + Liabilities) ✅ | + Income |
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
- ✅ GitHub Actions CI: iOS (xcodebuild + unit tests), Android (Gradle), backend (Vitest), CodeQL, Trivy, Gitleaks, Semgrep
- ✅ CI hardening: SHA-pinned actions, SBOM, SCA, SwiftLint
- ✅ Backend deployed on Fly.io (`coiny-backend.fly.dev`)
- ✅ Postgres via Neon (prod + dev connection strings in Fly secrets)

### Backend (Node + Fastify + Drizzle, Fly.io)

- ✅ Plaid webhooks with HMAC-SHA256 + JWT signature verification + replay protection
- ✅ Plaid `/transactions/sync` + paginated sync, idempotent via `processed_events` table
- ✅ Rule engine: paycheck, overspend, savings milestone, bill paid, large purchase, decay
- ✅ Persistent Postgres via Neon: all tables with cascade deletes, AES-256-GCM encryption on sensitive fields
- ✅ Multi-user schema: `users`, `sessions`, `coinbaseConnections`, `zerionWallets`, `spinwheelConnections`, `spinwheelPending`
- ✅ Auth plugin: Apple Sign In → session token (SHA-256 hash stored, 30-day sliding TTL)
- ✅ APNs push dispatch via background notifications + `registerDeviceToken`
- ✅ Full REST API across all integrations + debug endpoints (sandbox-only)
- ✅ Rate limiting: per-user (SHA-256 of bearer token) with IP fallback
- ✅ `GET /api/net-worth` aggregates bank + crypto + DeFi + debts with per-source error isolation
- ✅ **254 Vitest tests across 27 test files — all passing**

### Integration Audit (completed 2026-05-23)

All four external integrations were audited against their full API documentation and fixed:

- ✅ **Plaid** — missing `Plaid-Version` header, cursor-before-persist bug, sequential balance fetching, credit accounts adding to net worth, PFC icon URL field, paycheck detection (PRs #A and #B)
- ✅ **Spinwheel** — two-step OTP flow rewired (pending table for spinwheelUserId), base URL moved to config, secret key validation, OTP rate limiting (PR #91, merged)
- ✅ **Zerion** — 429 retry with `RateLimit-Org-Second-Reset`, 202 polling for new wallets, spam filter (`filter[trash]=only_non_trash`), `filter[positions]=no_filter` for DeFi, opaque cursor handling, pagination (PR #92, merged)
- ✅ **Coinbase** — JWT `nbf` claim, account schema (`uuid`/`available_balance`), switched transactions to v2 API (v3 endpoint doesn't exist — feature was completely broken), transaction pagination, 429 retry, coin map expanded from 12 → 45 coins (PR #93, merged)

### iOS App (Swift + SwiftUI)

- ✅ XcodeGen project definition with LinkKit SPM package
- ✅ `CoinyApp` with three-state routing: SignInView → OnboardingView → RootView
- ✅ Full `API` actor with Bearer auth, auto-signout on 401, all endpoints
- ✅ Sign In with Apple → backend JWT → Keychain session token
- ✅ Debug: `Skip Sign In` button + `Fire test transaction` button (sandbox only)
- ✅ OnboardingView: full Plaid Link flow
- ✅ PetView: breathing animation, celebrate bounce, sad droop, 30s polling loop
- ✅ SpendingView: reaction history feed
- ✅ SettingsView: bank status, goals display, sign-out, delete account
- ✅ CryptoView, CoinbaseView, ZerionView, SpinwheelView, NetWorthView
- ✅ RootView: 5 tabs — Pet, Spending, Wealth, Crypto, More
- ✅ 40+ iOS unit tests + AppLaunchSmokeTest (XCUITest)

### Core Loop Validated (2026-05-23)

Ran end-to-end on iOS Simulator (iPhone 17 Pro, iOS 26.5):

- ✅ App launches, debug sign-in works
- ✅ Plaid Link opens, First Platypus Bank linked
- ✅ Webhook hits `/webhooks/plaid`, signature verified, 51 transactions ingested
- ✅ `POST /api/debug/react` fires reaction, pet updates within 30s poll
- ✅ Reaction history visible in Pet and Activity tabs
- ✅ Transaction inspector, rule trace, cursor reset all implemented
- ❌ Full Plaid path (new transaction → rule → reaction) not yet proven end-to-end — use `POST /api/debug/reset-cursor` then "Fire test transaction" to verify

---

## Open PRs

None — all merged as of 2026-05-24.

---

## Known Bugs

All validation bugs from 2026-05-23 have been fixed:

- ✅ `overspent_in_category` now accumulates weekly spend (PR #97)
- ✅ "Unlink bank" calls backend `DELETE /api/plaid/items/:itemId` (PR #95)
- ✅ `recordReaction()` wrapped in DB transaction (PR #95)
- ✅ DB indexes added on `reactionHistory.userId` and `plaidItems.userId` (PR #95)
- ✅ Activity tab (formerly Spending) shows rule results (PR #98)
- ✅ Full PFC taxonomy mapped + legacy category fallback (PR #94)
- ✅ `bill_paid_on_time` rewired to PFC codes (PR #94)
- ✅ Transaction inspector, rule trace, cursor reset added (PR #96)
- ✅ Fire test transaction shows rule result (PR #98)

---

## What Has NOT Been Done

### iOS

- ❌ Metal-rendered sprite animations at 120fps (currently SF Symbols placeholders)
- ❌ Widgets (home screen, lock screen, StandBy)
- ❌ Live Activities + Dynamic Island
- ❌ Apple Watch companion app
- ❌ Pet customization (species selection, commissioned art)
- ❌ Sound packs
- ❌ SwiftData local persistence

### Backend

- ❌ Go rewrite (target is `docs/implementation-plan.md` M2)
- ❌ AWS infrastructure
- ❌ Datadog observability
- ❌ WorkOS authentication
- ❌ Audit logging
- ❌ Plaid Income product

### Hardware & Firmware

- ❌ Firmware project not initialized (`firmware/` is empty scaffold)
- ❌ BLE scanning / pairing / relay
- ❌ Hardware prototyping (M5StickS3 + DRV2605L ordered, ETA 2026-05-24/26)
- ❌ Custom PCB

### Business / Legal

- ❌ Apple Developer Program ($99/yr) — needed before TestFlight
- ❌ LLC formation
- ❌ Plaid production access
- ❌ GLBA compliance review

---

## Local Dev Setup

### Backend

```bash
source bin/load-secrets.sh
pnpm --filter coiny-backend dev
pnpm --filter coiny-backend test
```

### iOS

```bash
cd ios && xcodegen generate
open Coiny.xcodeproj
```

### Secrets (macOS Keychain)

Keys: `coiny-plaid-client-id`, `coiny-plaid-sandbox-secret`. Loaded by `bin/load-secrets.sh`.

---

## Next Session Priorities

All bugs fixed. Goal is proving the full Plaid path then TestFlight prep:

1. **Prove full Plaid → rule → reaction end-to-end**: In simulator, link First Platypus Bank, then `POST /api/debug/reset-cursor`, then tap "Fire test transaction" — verify "Last reaction" updates with a real rule match (not debug)
2. **Simulator backend URL**: `ios/Coiny/Services/API.swift` now uses `http://127.0.0.1:3000` in simulator builds, `https://coiny-backend.fly.dev` on device — keep this
3. **Xcode MCP**: `xcrun mcpbridge` registered globally (`--scope user`) — available in all future sessions when Xcode is running
4. **TestFlight prep**: Apple Developer Program ($99), then archive + upload

---

## Resuming Work

Start a fresh Claude Code session in `/Users/antoinewiley/Tamogatchi` and say:

> Read `docs/handoff.md`. All integration bugs are fixed (PRs #91–#99 merged). Need to prove the full Plaid → rule → reaction path end-to-end in simulator using the cursor-reset debug endpoint, then prep for TestFlight. Backend runs locally on 127.0.0.1:3000 for simulator. Start the backend with `source bin/load-secrets.sh && pnpm --filter coiny-backend dev`.

### Plaid sandbox credentials

- Institution: First Platypus Bank (use this, not TrustedAuth — TrustedAuth opens OAuth browser which is slow)
- Username: `user_good` / Password: `pass_good`
- Debug sign-in: tap "Debug: Skip Sign In" on the sign-in screen

---

## Hardware (1 unit MVP — ordered 2026-05-19)

| Item | Cost | Status |
|---|---|---|
| M5StickS3 (K150) — ESP32-S3 prototype board | $36.59 | ✅ Ordered |
| Adafruit DRV2605L haptic driver | $7.95 + ship | ✅ Ordered |
| SparkFun Qwiic-to-Grove cable | $13.92 | ✅ Ordered (ETA 2026-05-26) |
| uxcell 10mm coin vibration motor 3V (10-pack) | $8.99 | ✅ Ordered (ETA 2026-05-24) |
| **Total** | **~$75** | |

**Note:** throwaway prototype. Production targets Nordic nRF54L15 + Sharp Memory LCD + LRA + APA102 + MAX77654 + LiPo.

---

## Economics (Reference)

- MVP cost: ~$75 hardware + $99/yr Apple Developer = ~$175
- Production BOM at 1K units: ~$20
- Retail target: $59–$79 hardware + $3.99/month
- Per-user/month API cost: ~$0.30 (Plaid) to $4 (Plaid + all integrations)
