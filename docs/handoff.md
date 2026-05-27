# Coiny — Project Handoff

**Last updated: 2026-05-27 (session 8)**

Read this first. Then read `docs/tech-stack.md` and `docs/implementation-plan.md`.

---

## Claude Code Integration Setup (READ BEFORE CODING)

### Vendor API Documentation (primary sources — always prefer these over memory)

Each vendor has a complete single-file AI-optimized doc set downloaded to `docs/context/`:

| Vendor | File | Source |
|---|---|---|
| Plaid | `docs/context/plaid.md` | plaid.com/docs/llms-full.txt (~5.9 MB, complete) |
| Coinbase CDP | `docs/context/coinbase.md` | docs.cdp.coinbase.com/llms-full.txt (~12.6 MB, complete) |
| Zerion | `docs/context/zerion.md` | developers.zerion.io/llms.txt |
| Spinwheel | `docs/context/spinwheel.md` | docs.spinwheel.io/llms.txt |

**Before implementing any vendor endpoint, read the relevant file first.** Do not rely on training knowledge for endpoint paths, field names, or auth requirements — they drift.

### MCP Servers (live API access — restart Claude Code to activate)

Two MCP servers are connected to this project:

| Server | Type | What it does |
|---|---|---|
| `zerion` | Live HTTP MCP (`developers.zerion.io/mcp`) | Query real Zerion wallet data mid-conversation |
| `coinbase-cdp` | Docs MCP (`docs.cdp.coinbase.com/mcp`) | Search Coinbase CDP documentation |

Use the Zerion MCP to verify response field names and shapes before implementing parsing logic — do not guess field names from memory (see Zerion bug below).

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
│   ├── CoinyTests/    # XCTest unit tests (148 tests, all passing)
│   ├── CoinyUITests/  # XCUITest UI tests (54 tests; 27 pass, 27 fail — see bugs below)
│   └── project.yml    # XcodeGen project definition — edit this, never .xcodeproj directly
├── android/           # Native Kotlin + Jetpack Compose — scaffolded, not started
├── backend/           # Node.js / TypeScript / Fastify — active, hosted on Fly.io
│   ├── src/api/       # Route handlers — 23 API modules covering all integrations
│   ├── src/store/     # DB queries (users, sessions, items, pets, transactions, events)
│   ├── src/plaid/     # Plaid API client + webhook verifier + category adapter
│   ├── src/coinbase/  # Coinbase Advanced Trade client (JWT ES256) + public spot prices
│   ├── src/zerion/    # Zerion DeFi portfolio client (Basic auth)
│   ├── src/spinwheel/ # Spinwheel debt client (Bearer + SMS OTP)
│   ├── src/chains/    # Per-chain balance clients: bitcoin, xrp, stellar, blockcypher, cosmos, near, aptos, sui, hedera, polkadot, cardano, ton
│   ├── src/hyperliquid/ # Hyperliquid perps (no auth)
│   ├── src/kraken/    # Kraken CEX (HMAC-SHA512, encrypted per-user keys)
│   ├── src/kicksdb/   # KicksDB sneaker price lookup
│   ├── src/discogs/   # Discogs vinyl collection (OAuth 1.0a)
│   ├── src/kalshi/    # Kalshi prediction markets (RSA-PSS, encrypted per-user key)
│   └── tests/         # 542 Vitest tests, all passing
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
   3 tabs: Pet · Activity · Wealth (reform in progress — see Workstream A)
         ↓
  iOS BLE → Coiny device (nRF52840, Zephyr)
  Animated face + LED + vibration + sound
```

---

## Stack (Current vs Target)

| Layer | **Current (running today)** | **Target (`docs/tech-stack.md`)** |
|---|---|---|
| iOS | Native Swift + SwiftUI ✅ | Add Metal sprites, Widgets, Live Activities, Watch |
| Android | Kotlin scaffold (empty) | Full Jetpack Compose app |
| Backend | Node + Fastify + Drizzle, Fly.io, Neon | Go + chi + sqlc, AWS ECS Fargate + Aurora |
| Auth | Apple Sign In (JWT → session token) ✅ | WorkOS AuthKit |
| Bank data | Plaid — Transactions + Investments + Liabilities ✅ | — |
| Crypto data | Coinbase Advanced Trade + public spot price API ✅ | — |
| DeFi | Zerion ✅ | — |
| Debt | Spinwheel (balances + credit score + utilization) ✅ | — |
| Firmware | nRF52840 scaffold | Nordic nRF54L15 + Zephyr RTOS |
| Observability | pino logs | Datadog full suite |
| Secrets | macOS Keychain → Fly secrets | AWS Secrets Manager + KMS |

---

## What Has Been Done

### Infrastructure & CI

- ✅ Repo created (private GitHub, pamplemousse-glitch/Coiny)
- ✅ pnpm workspaces + Turborepo monorepo
- ✅ Branch-guard hook: `git commit` on `main` is blocked at the tool level
- ✅ `CLAUDE.md` with project conventions (auto-loaded each session)
- ✅ GitHub Actions CI: iOS (xcodebuild + unit tests), Android (Gradle), backend (Vitest), CodeQL, Trivy, Gitleaks, Semgrep (PR #60)
- ✅ CI hardening: SHA-pinned actions, SBOM, SCA, SwiftLint (PR #60)
- ✅ Backend deployed on Fly.io (`coiny-backend.fly.dev`)
- ✅ Postgres via Neon (prod + dev connection strings in Fly secrets)

### Backend (Node + Fastify + Drizzle, Fly.io) — 542 Vitest tests, all passing

- ✅ Plaid webhooks with HMAC-SHA256 + JWT signature verification + replay protection
- ✅ Plaid `/transactions/sync` + paginated sync, idempotent via `processed_events` table
- ✅ Plaid Investments + Liabilities — active, returned by `/api/net-worth`
- ✅ Plaid recurring streams cached (`plaid_recurring_streams` table); liability payment metadata cached (`plaid_liabilities_cache` table) with live fallback
- ✅ Paycheck detection via PFC category mapping (`INCOME_WAGES` → `paycheck`, etc.)
- ✅ Rule engine: paycheck, overspend, savings milestone, bill paid, large purchase, subscription detection, decay, net worth milestone, credit score change
- ✅ Multi-user schema with per-user FK on all tables; AES-256-GCM encryption for all stored tokens/keys
- ✅ Auth plugin: Apple Sign In → session token (SHA-256 hash, 30-day sliding TTL)
- ✅ APNs push dispatch via background notifications + `registerDeviceToken`
- ✅ Rate limiting: per-user (SHA-256 of bearer token) with IP fallback
- ✅ **`GET /api/net-worth`** aggregates 14 data sources: bank + investments (Plaid) + crypto (Coinbase) + DeFi (Zerion) + on-chain wallets (12 chain clients) + Hyperliquid perps + Kraken CEX + SnapTrade brokerage + YNAB budgets + real estate (RentCast) + vehicles (MarketCheck) + metals (GoldAPI) + sneakers (KicksDB) + debts (Spinwheel) — plus pending: vinyl (Discogs) + prediction markets (Kalshi)
- ✅ **Portfolio performance analytics**: `GET /api/coinbase/performance`, `GET /api/zerion/pnl`, `GET /api/zerion/positions`
- ✅ **Credit score + utilization**: Spinwheel VantageScore 3.0 + per-card utilization calc
- ✅ **Emergency fund runway**: `liquidCashMonths` in net-worth (depository balance ÷ 90-day avg burn)
- ✅ **Chain wallets** (12 chains): Bitcoin (Blockstream Esplora), XRP (XRPL), Stellar (Horizon), DOGE/LTC/BCH (BlockCypher), ATOM/OSMO (Cosmos LCD), NEAR/Aptos/Sui/Hedera (public RPC), Polkadot/Cardano/TON (API-keyed, keys optional)
- ✅ **Hyperliquid**: perp account state, unrealized PnL, position list
- ✅ **Real estate**: `real_estate_assets` table — address + last_value_usd via RentCast AVM (needs `RENTCAST_API_KEY`)
- ✅ **Vehicles**: `vehicle_assets` table — VIN + last_value_usd via MarketCheck (needs `MARKETCHECK_API_KEY`)
- ✅ **Metals**: `metal_holdings` table — metal + oz + last_value_usd via GoldAPI (needs `GOLDAPI_API_KEY`)
- ✅ **SnapTrade**: brokerage aggregator — OAuth account link → holdings sync → `snaptrade_connections.lastBrokerageTotal`
- ✅ **YNAB**: personal access token → budgets sync → `ynab_connections.lastNetWorthUsd`
- ✅ **Kraken**: HMAC-SHA512 NONCE auth, encrypted per-user keys → spot balance sync
- ✅ **KicksDB (sneakers)**: `sneaker_holdings` table (SKU + size + qty) → price sync via KicksDB StockX endpoint
- ✅ **Discogs (vinyl)**: OAuth 1.0a — connect/verify flow → collection sync → marketplace pricing → `discogsConnections.lastCollectionUsd` (PR #138, auto-merging)
- ✅ **Kalshi (prediction markets)**: RSA-PSS auth — connect + sync + net-worth rollup (PR #139, auto-merging)
- ✅ **`GET /api/plaid/recurring`**: subscription detection, stream list, spending summary
- ✅ **E2E pipeline proven**: Vitest fires Plaid sandbox webhook → `paycheck_received` reaction persisted

### iOS App (Swift + SwiftUI) — 148+ unit tests passing

- ✅ XcodeGen project definition (`ios/project.yml`) with LinkKit SPM
- ✅ `CoinyApp`: SignInView → OnboardingView → RootView (3-tab)
- ✅ `HTTPClient` / `SessionStore` / `Keychain` protocol injection — full testability
- ✅ `API` actor with Bearer auth, auto-signout on 401
- ✅ Sign In with Apple → backend JWT → Keychain session token
- ✅ **OnboardingView**: Plaid Link flow end-to-end
- ✅ **PetView**: breathing animation, celebrate bounce, sad droop, empty state with tip carousel, debug fire-transaction button
- ✅ **SpendingView** (Activity tab): reaction history feed
- ✅ **SettingsView**: bank status + unlink, goals, sign-out, Delete Account
- ✅ **NetWorthView** (Wealth tab): total, bank, crypto (Coinbase), DeFi (Zerion), on-chain wallets, Hyperliquid, debts (Spinwheel + credit score + utilization), emergency runway, performance section
- ✅ **RootView**: 3 tabs — Pet, Activity, Wealth. Settings as gear-button sheet.
- ✅ **ChainWalletsView**: add/remove wallets per chain, balances, sync
- ✅ **HyperliquidView**: add accounts by wallet address, PnL, sync
- ✅ **PerformanceView**: Coinbase unrealized PnL + Zerion PnL + DeFi positions
- ❌ **Not yet surfaced in iOS**: Kraken, SnapTrade, YNAB, Real estate, Vehicles, Metals, Sneakers, Discogs, Kalshi — all live on backend, `NetWorthResponse` model + `NetWorthView` need updating

---

## In-Flight PRs

| PR | Branch | Status | Action |
|---|---|---|---|
| **#138** | `feat/discogs` | **Auto-merging** | Discogs vinyl OAuth integration — all checks green, squash-merge pending |
| **#139** | `feat/kalshi` | **Auto-merging** | Kalshi prediction market integration — all checks green, squash-merge pending |

All previously open PRs (#108, #116–#137) merged. No blockers.

---

## Known Issues

No known backend bugs. Previously-tracked Spinwheel + Coinbase bugs all fixed (PR #108, merged).

**iOS gap:** `NetWorthResponse` Swift model is behind the backend. Backend returns `realEstate`, `vehicles`, `metals`, `kraken`, `snaptrade`, `ynab`, `sneakers` (and soon `vinyl`, `kalshi`) — none of these fields are decoded by the iOS model, and none have sections in `NetWorthView`. This is the primary iOS work item for next session.

---

## What Has NOT Been Done

### iOS — Primary Gap (next work item)

The Wealth tab model and view are behind the backend. The following integrations are live in `GET /api/net-worth` but not rendered in iOS:

| Integration | Backend field | iOS status |
|---|---|---|
| Investments (Plaid holdings) | `investments` | Model has field, no section in view |
| Real estate | `realEstate` | Not in model, no section |
| Vehicles | `vehicles` | Not in model, no section |
| Metals | `metals` | Not in model, no section |
| Kraken | `kraken` | Not in model, no section |
| SnapTrade | `snaptrade` | Not in model, no section |
| YNAB | `ynab` | Not in model, no section |
| Sneakers | `sneakers` | Not in model, no section |
| Vinyl (Discogs) | `vinyl` (pending PR #138) | Not in model, no section |
| Kalshi | `kalshi` (pending PR #139) | Not in model, no section |

Fix: update `NetWorthResponse` + `NetWorthConnections` in `ios/Coiny/Services/API+Performance.swift`, add sections to `NetWorthView.swift`. Pattern is already established — each section is a `GroupBox` with a `sectionHeader` + connect/sync inline flow.

### iOS — Other Missing

- ❌ Metal-rendered sprite animations at 120fps (currently SF Symbols placeholders)
- ❌ Widgets (home screen, lock screen, StandBy)
- ❌ Live Activities + Dynamic Island
- ❌ Apple Watch companion app
- ❌ Pet customization (species selection, commissioned art)
- ❌ Sound packs
- ❌ Cash flow forecast UI (`GET /api/spending/summary` exists on backend)
- ❌ SwiftData local persistence (all state fetched live)

### Backend

- ❌ `GET /api/spending/summary` — savings rate, income total, category breakdown (transactions exist, endpoint not built)
- ❌ Go rewrite (deferred)
- ❌ AWS infrastructure (ECS Fargate + Aurora + CloudFront + WAF)
- ❌ Datadog observability
- ❌ WorkOS authentication (Apple Sign In only today)
- ❌ Audit logging (`audit_log` table)

### Integrations

- ✅ Plaid sandbox — 3/3 endpoints pass
- ✅ Zerion — Vitalik's wallet used for testing (no sandbox)
- ✅ Coinbase — Advanced Trade sandbox validates shape
- ✅ Spinwheel — sandbox exists; integration tests in `tests/integration/`
- ✅ Chain wallets — 9 chains live, 3 keyed (Polkadot/Cardano/TON) need API keys from Antoine
- ⏳ KicksDB — needs `KICKSDB_API_KEY` from kicks.dev (backend live, key optional — returns 402 without it)
- ⏳ RentCast — needs `RENTCAST_API_KEY` (real estate AVM)
- ⏳ MarketCheck — needs `MARKETCHECK_API_KEY` (vehicle values)
- ⏳ GoldAPI — needs `GOLDAPI_API_KEY` (metals pricing)
- ⏳ Helius — needs signup at `helius.dev` (Solana staking)
- ⏳ Alchemy — needs signup at `alchemy.com` (NFTs)

Run integration tests: `source bin/load-secrets.sh && INTEGRATION_TEST=1 pnpm --filter coiny-backend test tests/integration/`

### Hardware & Firmware

- ❌ Firmware not started (`firmware/` is empty scaffold)
- ❌ BLE scanning / pairing / relay
- ❌ Hardware: M5StickS3 + DRV2605L (ordered 2026-05-19, arrived ~2026-05-26)
- ❌ Custom PCB (nRF54L15 + Sharp Memory LCD + LRA + APA102 + MAX77654)

### Business / Legal

- ❌ App ID registration — **blocks TestFlight** (see below — 10-minute step)
- ❌ LLC formation — needed before Plaid production + Apple Developer Org account
- ❌ Plaid production access — apply after sandbox validated end-to-end
- ❌ GLBA compliance review

---

## Next Session

### Priority 1 — Surface all integrations in iOS (`feat/ios-wealth-expansion`)

The Wealth tab model and view are behind the backend. One PR covers all of it:

**Files to change:**
- `ios/Coiny/Services/API+Performance.swift` — add missing fields to `NetWorthResponse` and `NetWorthConnections`
- `ios/Coiny/Views/NetWorthView.swift` — add `investmentsSection`, `realEstateSection`, `vehiclesSection`, `metalsSection`, `krakenSection`, `snaptradeSection`, `ynabSection`, `sneakersSection`, `vinylSection`, `kalshiSection`
- `ios/CoinyTests/NetWorthViewModelTests.swift` — update decode tests for new fields

**Pattern for each new section** (all follow the same GroupBox structure already used by chainWalletsSection):
- If connected and value > 0: show total + "Sync" button
- If not connected: show "Connect" prompt with deep-link or in-sheet flow
- Manual-entry assets (real estate, vehicles, metals, sneakers): show list + "Add" button → POST to `/api/{asset}`

**New fields to add to `NetWorthResponse`:**
```swift
let investments: Double      // already in model, just needs a section
let realEstate: Double
let vehicles: Double
let metals: Double
let kraken: Double
let snaptrade: Double
let ynab: Double
let sneakers: Double
let vinyl: Double            // after PR #138 merges
let kalshi: Double           // after PR #139 merges
```

**New fields to add to `NetWorthConnections`:**
```swift
let kraken: Bool
let snaptrade: Bool
let ynab: Bool
let kalshi: Bool
```

Connect/sync API endpoints already exist for all of these. Use `API.swift` pattern already established for Coinbase/Zerion/Kraken.

---

### Priority 2 — TestFlight (Antoine, 10 minutes)

App ID registration in Apple Developer Portal — see TestFlight section below. Unblocks distribution to Jack for first human test.

---

### Priority 3 — Next backend integrations (Sprint G)

See `docs/net-worth-coverage-plan.md` § Medium Priority. Highest-value next targets: WatchCharts (watches), SportsCardsPro (graded cards), CS2/Steam skins, Yahoo Fantasy Sports.

---

## TestFlight (blocked — Antoine must do this manually)

Apple Developer enrolled ✅, Team ID = `UKL98DS9D3` ✅. **Blocked on App ID registration:**

1. Go to developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → +
2. App IDs → App → Bundle ID: **Explicit** → `app.coiny.ios` → enable **Sign In with Apple** → Register
3. In Xcode: Product → Archive (destination: Any iOS Device arm64)
4. Xcode Organizer → Distribute App → App Store Connect → Upload
5. In App Store Connect → TestFlight → add Antoine as internal tester

---

## Local Dev Setup

### Backend

```bash
# Load secrets from macOS Keychain into env
source bin/load-secrets.sh

# Start backend with hot reload
pnpm --filter coiny-backend dev

# Run all backend tests
pnpm --filter coiny-backend test

# Lint
pnpm --filter coiny-backend check
```

### iOS

Always regenerate the Xcode project after any `project.yml` change:

```bash
cd /Users/antoinewiley/Tamogatchi/ios && xcodegen generate
```

Run tests from the terminal (do NOT open Xcode while xcodebuild is running — they fight over the simulator):

```bash
# Pre-flight: boot simulator and wait for SpringBoard
xcrun simctl boot A445C692-84CF-4D18-9CE1-ADD92174D731 2>/dev/null || true
xcrun simctl bootstatus A445C692-84CF-4D18-9CE1-ADD92174D731

# Unit tests (~2 seconds)
xcodebuild test \
  -scheme Coiny \
  -project /Users/antoinewiley/Tamogatchi/ios/Coiny.xcodeproj \
  -destination 'platform=iOS Simulator,id=A445C692-84CF-4D18-9CE1-ADD92174D731' \
  -only-testing:CoinyTests \
  -resultBundlePath /tmp/coiny-unit.xcresult \
  2>&1 | xcbeautify

# UI tests (~16 minutes)
xcodebuild test \
  -scheme Coiny \
  -project /Users/antoinewiley/Tamogatchi/ios/Coiny.xcodeproj \
  -destination 'platform=iOS Simulator,id=A445C692-84CF-4D18-9CE1-ADD92174D731' \
  -only-testing:CoinyUITests \
  -resultBundlePath /tmp/coiny-ui.xcresult \
  2>&1 | xcbeautify

# Both together
xcodebuild test \
  -scheme Coiny \
  -project /Users/antoinewiley/Tamogatchi/ios/Coiny.xcodeproj \
  -destination 'platform=iOS Simulator,id=A445C692-84CF-4D18-9CE1-ADD92174D731' \
  -resultBundlePath /tmp/coiny-all.xcresult \
  2>&1 | xcbeautify
```

If a test hangs (xcodebuild stuck, no output for 2+ minutes):
```bash
killall xcodebuild
xcrun simctl erase A445C692-84CF-4D18-9CE1-ADD92174D731
xcrun simctl boot A445C692-84CF-4D18-9CE1-ADD92174D731 2>/dev/null || true
xcrun simctl bootstatus A445C692-84CF-4D18-9CE1-ADD92174D731
rm -rf ~/Library/Developer/Xcode/DerivedData/Coiny-*
```

**Tooling notes:**
- Formatter: `xcbeautify` (at `/usr/local/bin/xcbeautify`) — not `xcpretty` (not installed)
- Simulator: iPhone 17 Pro, UDID `A445C692-84CF-4D18-9CE1-ADD92174D731`, iOS 26.5
- Xcode: 26.5

### Secrets (macOS Keychain)

```bash
# Read a secret
security find-generic-password -a "$USER" -s "coiny-plaid-client-id" -w

# Add a new secret (use -w flag — never inline the value)
security add-generic-password -a "$USER" -s "coiny-spinwheel-sandbox-key" -w
```

Keys currently stored:
- `coiny-plaid-client-id`
- `coiny-plaid-sandbox-secret`

Keys to add before Workstream D:
- `coiny-spinwheel-sandbox-key` (get from developer.spinwheel.io)

---

## Resuming Work

Start a fresh Claude Code session in `/Users/antoinewiley/Tamogatchi` and say:

> Read `docs/handoff.md`. Session 6 complete.
> Before touching any vendor integration (Plaid, Coinbase, Zerion, Spinwheel), read the relevant file in `docs/context/` — these are the official AI-optimized docs, always prefer them over training knowledge.
> Two MCP servers are connected: `zerion` (live wallet queries) and `coinbase-cdp` (doc search). Use the Zerion MCP to verify field names before implementing response parsing.
> Fix the two Spinwheel bugs and the Zerion field name issue (see "Known Integration Bugs") before any other backend work.
> Then merge PR #107 (CoinGecko removal).
> Simulator: iPhone 17 Pro UDID `A445C692-84CF-4D18-9CE1-ADD92174D731`. Use `xcbeautify`. Always `xcodegen generate` before `xcodebuild`.

### Plaid sandbox credentials

- Institution: any sandbox bank (e.g. First Platypus Bank)
- Username: `user_good`
- Password: `pass_good`

### Spinwheel sandbox test users

- **Christy Jenoval** — DOB `1967-06-08`
- **Aldo Cherry** — DOB `1990-01-01`
- Sandbox URL: `https://sandbox-api.spinwheel.io`

---

## Hardware (1 unit MVP — ordered 2026-05-19)

| Item | Cost | Status |
|---|---|---|
| M5StickS3 (K150) — ESP32-S3 prototype board | $36.59 | ✅ Ordered |
| Adafruit DRV2605L haptic driver | $7.95 + ship | ✅ Ordered |
| SparkFun Qwiic-to-Grove cable | $13.92 | ✅ Ordered (ETA 2026-05-26) |
| uxcell 10mm coin vibration motor 3V (10-pack) | $8.99 | ✅ Ordered (ETA 2026-05-24) |
| **Total** | **~$75** | |

This is the throwaway prototype. Production hardware targets Nordic nRF54L15 + Sharp Memory LCD + LRA + APA102 + MAX77654 + LiPo (see `docs/proposed-changes.md` H1–H10).

---

## Economics (Reference)

- MVP cost: ~$75 hardware + $99/yr Apple Developer = ~$175
- Production BOM at 1K units: ~$20
- Retail target: $59–$79 hardware + $3.99/month
- Per-user/month API cost: ~$0.30 (Plaid) to ~$4 (all integrations)
- Bank-data APIs dominate opex; subscription is structurally required
