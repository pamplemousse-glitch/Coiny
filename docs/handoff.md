# Coiny — Project Handoff

**Last updated: 2026-05-24 (session 3)**

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
│   ├── CoinyTests/    # XCTest unit tests (148 tests, all passing)
│   ├── CoinyUITests/  # XCUITest UI tests (54 tests; 27 pass, 27 fail — see bugs below)
│   └── project.yml    # XcodeGen project definition — edit this, never .xcodeproj directly
├── android/           # Native Kotlin + Jetpack Compose — scaffolded, not started
├── backend/           # Node.js / TypeScript / Fastify — active, hosted on Fly.io
│   ├── src/api/       # Route handlers (auth, pets, plaid, coinbase, zerion, spinwheel, account, net-worth)
│   ├── src/store/     # DB queries (users, sessions, items, pets, transactions, events)
│   ├── src/plaid/     # Plaid API client + webhook verifier + category adapter
│   ├── src/coinbase/  # Coinbase Advanced Trade client (JWT ES256)
│   ├── src/coingecko/ # CoinGecko price lookup client
│   ├── src/zerion/    # Zerion DeFi portfolio client (Basic auth)
│   ├── src/spinwheel/ # Spinwheel debt client (Bearer + SMS OTP)
│   └── tests/         # 258 Vitest tests, all passing
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
| Crypto data | Coinbase Advanced Trade + CoinGecko ✅ | — |
| DeFi | Zerion ✅ | — |
| Debt | Spinwheel (balances only; credit score not yet wired) ✅ | + credit score |
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

### Backend (Node + Fastify + Drizzle, Fly.io) — 258 Vitest tests, all passing

- ✅ Plaid webhooks with HMAC-SHA256 + JWT signature verification + replay protection (PR #2, enhanced in #60)
- ✅ Plaid `/transactions/sync` + paginated sync, idempotent via `processed_events` table
- ✅ Plaid Investments (`/investments/holdings/get`) and Liabilities (`/liabilities/get`) — both active and requested in every Link token
- ✅ Paycheck detection via PFC category mapping in `plaid/adapter.ts` (`INCOME_WAGES` → `paycheck`, `Income/Payroll` → `paycheck`, etc.) — no Plaid Income product needed
- ✅ Rule engine: paycheck, overspend, savings milestone, bill paid, large purchase, subscription detection, decay
- ✅ Persistent Postgres via Neon: `pet_state`, `reaction_history`, `plaid_items`, `transactions`, `category_overrides`, `device_tokens`
- ✅ Multi-user schema: `users`, `sessions`, `coinbaseConnections`, `zerionWallets`, `spinwheelConnections` + per-user FK on all tables (PR #60, migrations 0005–0007)
- ✅ Auth plugin: Apple Sign In → session token (SHA-256 hash stored, 30-day sliding TTL)
- ✅ APNs push dispatch via background notifications + `registerDeviceToken`
- ✅ REST API: `/api/auth/apple`, `/api/pets`, `/api/plaid/*`, `/api/devices/*`, `/api/spending`, `/api/account`, `/api/coinbase/*`, `/api/zerion/*`, `/api/spinwheel/*`, `/api/net-worth`, `/api/debug/*`
- ✅ Rate limiting: per-user (SHA-256 of bearer token) with IP fallback
- ✅ `GET /api/net-worth` aggregates: bank balances (Plaid) + investment holdings (Plaid) + crypto (Coinbase + CoinGecko) + DeFi (Zerion) + debts (Spinwheel), per-source try/catch so one failure doesn't block others (PR #81)
- ✅ **E2E pipeline proven** (PR #101): Vitest test fires a Plaid sandbox webhook → verifies `paycheck_received` reaction is persisted and returned by `GET /api/pets`

### iOS App (Swift + SwiftUI) — 148 unit tests passing, 54 UI tests (27 pass / 27 fail)

- ✅ XcodeGen project definition (`ios/project.yml`) with LinkKit SPM package
- ✅ `CoinyApp` with three-state routing: SignInView → OnboardingView → RootView
- ✅ `HTTPClient` / `SessionStore` / `Keychain` protocol injection — full testability
- ✅ `API` actor with Bearer auth, auto-signout on 401, all 20+ endpoints (PR #81)
- ✅ Sign In with Apple → backend JWT → Keychain session token
- ✅ **OnboardingView**: Plaid Link flow (create token → open Link → exchange public token → `bankLinked = true`)
- ✅ **PetView**: breathing animation, celebrate bounce, sad droop, WaitingForFirstReactionView with tip carousel, debug fire-transaction button
- ✅ **SpendingView** (Activity tab): reaction history feed
- ✅ **SettingsView**: bank status + unlink, goals display, sign-out, Delete Account (destructive alert → `DELETE /api/account`)
- ✅ **CryptoView**: Coinbase section (connect dev key, sync, disconnect) + Zerion section (add/remove wallets, portfolio total)
- ✅ **SpinwheelView**: SMS OTP flow (phone + DOB → OTP entry → connected), debt list, disconnect
- ✅ **NetWorthView**: net worth total (green/red), bank / crypto / DeFi / debts sections, pull-to-refresh, not-connected prompts
- ✅ **RootView**: currently 6 tabs — Pet, Activity, Wealth, Crypto, Debt, Settings — ⚠️ iOS hides tabs 5–6 behind a "More" button; Workstream A fixes this
- ✅ `--ui-testing` + `--mock-network` launch args bypass Sign In/Onboarding and inject `MockURLProtocol` stub responses (PR #102)
- ✅ 148 iOS unit tests: APIEndpointTests (22), APITests (15), CoinbaseViewModelTests (15), KeychainTests (8), NetWorthViewModelTests (11), PetStateDecodingTests (18), PetStoreTests (9), SessionStoreTests (4), SpendingViewModelTests (5), SpinwheelViewModelTests (16), ViewSmokeTests (9), ZerionViewModelTests (16) — all passing
- ✅ 54 UI tests across 7 suites — 27 passing, 27 failing (2 known bugs, see below)

---

## In-Flight PRs

| PR | Branch | Status | Action |
|---|---|---|---|
| **#102** | `test/ios-uitest-tabs` | Open — 27/54 UI tests pass | **Close without merging.** UI reform (Workstream A) will supersede this PR entirely. The 6-tab structure it tests is being replaced. |

All other PRs (#81, #91–#99, #101) are merged.

---

## Known iOS UI Test Bugs (found session 3)

### Bug 1 — App crash cascade (6 tests fail)

**Root cause:** In `PetTabUITests` and `ActivityTabUITests`, some tests call `freshApp.launch()` inside the test body. Calling `launch()` on a new `XCUIApplication` with the same bundle ID kills the class-level app (same process). After `freshApp.terminate()`, the class-level app is also dead. Every subsequent test in the class that uses the class-level app fails with "app is not running."

**Affected tests:** `testPetTabPullToRefreshTriggersReload`, `testPetTabShowsHealthBar`, `testPetTabShowsLastReactionCardWhenHistoryNonEmpty`, `testPetTabShowsLoadingThenFace`, `testPetTabShowsWaitingViewWhenNoHistory`, `testActivityTabShowsReactionWhenHistoryNonEmpty`

**Fix:** After `freshApp.terminate()` in the `defer` block, re-launch the class-level app. Resolved in Workstream B.

### Bug 2 — Debt/Settings tabs not found (21 tests fail)

**Root cause:** iOS tab bar shows only 4 tabs + a "More" button when there are 5+ tabs. With 6 tabs, Debt (tab 5) and Settings (tab 6) are hidden. Tests that call `app.tabBars.firstMatch.buttons["Debt"].tap()` fail because the button is not in the tab bar.

**Fix:** Workstream A collapses the tab bar to 3 tabs, eliminating the "More" issue. Debt/Settings UI tests get rewritten for the new structure.

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

- ❌ Credit score endpoint (Spinwheel has it; we only call `getDebtProfile` today)
- ❌ `GET /api/spending/summary` — savings rate, income total, category breakdown
- ❌ Emergency fund calculation (liquid cash ÷ monthly burn)
- ❌ Credit utilization % in debt response
- ❌ Go rewrite (target is `docs/implementation-plan.md` M2)
- ❌ AWS infrastructure (target is M1 — ECS Fargate + Aurora + CloudFront + WAF)
- ❌ Datadog observability
- ❌ WorkOS authentication (currently Apple Sign In only)
- ❌ Audit logging (`audit_log` table)
- ❌ LaunchDarkly feature flags

### Integrations (tested with mocks only — real sandbox/live tests pending Workstream D)

- ❌ Spinwheel sandbox Vitest tests (test users and sandbox URL documented below)
- ❌ Plaid Investments + Liabilities sandbox Vitest tests
- ❌ Zerion live API Vitest test (against known public wallet)
- ❌ CoinGecko Vitest test (against live free API)

### Hardware & Firmware

- ❌ Firmware project not initialized (`firmware/` is empty scaffold)
- ❌ BLE scanning / pairing / relay
- ❌ Hardware prototyping (M5StickS3 + DRV2605L ordered 2026-05-19, ETA ~2026-05-26)
- ❌ Custom PCB (nRF54L15 + Sharp Memory LCD + LRA + APA102 + MAX77654)

### Business / Legal

- ❌ App ID registration — **blocks TestFlight** (see below)
- ❌ LLC formation — needed before Plaid production + Apple Developer Org account
- ❌ Plaid production access — apply after sandbox validated end-to-end
- ❌ GLBA compliance review

---

## Next Session — Four Workstreams

Execute in order: **A → B → C → D**. C and D can be parallelized once A+B are done.

---

### Workstream A — UI Reform

**Branch:** `feat/ui-reform`
**PR title:** `feat(ios): collapse to 3-tab UI — Wealth absorbs Crypto + Debt, Settings as sheet`

**Why:** iOS tab bar on iPhone hides tabs 5+ behind a "More" button. The current 6-tab layout makes Debt and Settings unreachable. All financial data belongs in one Wealth view — this is how Mint, Monarch, and Copilot organize it. Net worth = assets (bank + investments + crypto + DeFi) minus liabilities (debt).

**New tab structure:**
1. **Pet** — pet face, health/mood bars, last reaction card, fire-transaction debug button. Navigation bar has a gear (⚙) button that presents SettingsView as a `.sheet`.
2. **Activity** — reaction history feed. Unchanged.
3. **Wealth** — net worth total at top (green/red). Sections: Bank Accounts (Plaid), Investments (Plaid), Crypto (Coinbase), DeFi Wallets (Zerion), Liabilities (Spinwheel debt + credit score). Each section shows "Connect" prompt if not linked, with connect flow as a modal sheet.

**Files to change:**
- `ios/Coiny/Views/RootView.swift` — 3 tabs only; add `.toolbar` gear button on Pet tab
- `ios/Coiny/Views/NetWorthView.swift` — add Coinbase, Zerion, and Spinwheel sections
- `ios/Coiny/ViewModels/NetWorthViewModel.swift` — absorb CoinbaseViewModel, ZerionViewModel, SpinwheelViewModel state (or inject them as environment objects)
- `ios/Coiny/Views/CryptoView.swift`, `SpinwheelView.swift` — demote from tabs to reusable sub-views embedded in NetWorthView
- `ios/CoinyUITests/TabNavigationTests.swift` — rewrite for 3 tabs
- `ios/CoinyUITests/DebtAndSettingsUITests.swift` — rewrite: Spinwheel tests navigate via Wealth tab; Settings tests navigate via gear sheet
- All other UITest launch helpers that call `buttons["Debt"]` or `buttons["Settings"]` — update to new navigation paths

**GitHub moves:**
```bash
git checkout main && git pull
git checkout -b feat/ui-reform
# ... make changes ...
git add ios/Coiny/Views/RootView.swift ios/Coiny/Views/NetWorthView.swift \
        ios/Coiny/ViewModels/NetWorthViewModel.swift \
        ios/Coiny/Views/CryptoView.swift ios/Coiny/Views/SpinwheelView.swift \
        ios/CoinyUITests/TabNavigationTests.swift \
        ios/CoinyUITests/DebtAndSettingsUITests.swift
git commit -m "feat(ios): collapse to 3-tab UI — Wealth absorbs Crypto + Debt, Settings as sheet"
gh pr create --title "feat(ios): collapse to 3-tab UI — Wealth absorbs Crypto + Debt, Settings as sheet"
# Also close the superseded PR:
gh pr close 102 --comment "Superseded by feat/ui-reform — tab structure is being redesigned"
```

---

### Workstream B — Fix UI Test Bugs

**Branch:** `fix/ios-uitest-bugs` (branch off `feat/ui-reform` after it merges, or include in the same PR)
**PR title:** `fix(ios): fix app crash cascade in PetTab + ActivityTab UITests`

**Bug 1 fix — re-launch class-level app after freshApp.terminate():**

In `PetTabUITests.swift`, `testPetTabFireTransactionButtonTappable` and `testPetTabShowsWaitingViewWhenNoHistory` both call `freshApp.launch()`. Add this to their `defer` blocks:

```swift
defer {
    freshApp.terminate()
    // freshApp.launch() killed the class-level app (same bundle ID).
    // Re-launch it so subsequent tests in this class are not orphaned.
    Self.app.launch()
    _ = Self.app.tabBars.firstMatch.waitForExistence(timeout: 20)
}
```

Same fix in `ActivityTabUITests.swift` for `testActivityTabShowsProgressViewWhilePetNil` and `testActivityTabShowsReactionWhenHistoryNonEmpty`.

**Bug 2** is resolved by Workstream A (tab restructure eliminates the unreachable tabs).

**Verify after each fix:**
```bash
cd /Users/antoinewiley/Tamogatchi/ios && xcodegen generate
xcrun simctl boot A445C692-84CF-4D18-9CE1-ADD92174D731 2>/dev/null || true
xcrun simctl bootstatus A445C692-84CF-4D18-9CE1-ADD92174D731
rm -rf /tmp/coiny-ui.xcresult
xcodebuild test \
  -scheme Coiny \
  -project /Users/antoinewiley/Tamogatchi/ios/Coiny.xcodeproj \
  -destination 'platform=iOS Simulator,id=A445C692-84CF-4D18-9CE1-ADD92174D731' \
  -only-testing:CoinyUITests \
  -resultBundlePath /tmp/coiny-ui.xcresult \
  2>&1 | xcbeautify
```

**Target:** 54/54 UI tests pass. Also run unit tests to confirm no regressions:
```bash
rm -rf /tmp/coiny-unit.xcresult
xcodebuild test \
  -scheme Coiny \
  -project /Users/antoinewiley/Tamogatchi/ios/Coiny.xcodeproj \
  -destination 'platform=iOS Simulator,id=A445C692-84CF-4D18-9CE1-ADD92174D731' \
  -only-testing:CoinyTests \
  -resultBundlePath /tmp/coiny-unit.xcresult \
  2>&1 | xcbeautify
```

**GitHub moves:**
```bash
git add ios/CoinyUITests/PetTabUITests.swift ios/CoinyUITests/ActivityTabUITests.swift
git commit -m "fix(ios): re-launch class-level app after freshApp.terminate() in UITests"
gh pr create --title "fix(ios): fix app crash cascade in PetTab + ActivityTab UITests"
```

---

### Workstream C — New Financial Metrics

**Branch:** `feat/financial-metrics`
**PR title:** `feat: add credit score, credit utilization, savings rate, emergency fund`

All use existing vendor connections. No new vendors, no new credentials, no new Plaid products.

#### C1 — Credit Score (ref: `docs/spinwheel-catalog.md`)

- **Backend:** Add `GET /api/spinwheel/credit-score` → call Spinwheel credit score endpoint for the connected user's `spinwheelUserId`
- **iOS:** Add credit score display to Wealth tab Liabilities section
- **Pet reaction:** Score drops since last check → worried; score up → celebrate
- **Test:** Vitest test for the new endpoint (mocked Spinwheel response)

#### C2 — Credit Utilization % (ref: `docs/spinwheel-catalog.md`)

- **Backend:** Spinwheel `getDebtProfile` already returns `balance` and `creditLimit` per credit card. Compute `creditUtilizationPct = totalCCBalance / totalCCLimit * 100` and include in `/api/spinwheel/debts` response.
- **iOS:** Show utilization % bar in Wealth → Liabilities section
- **Pet reaction:** Utilization crosses 30% threshold → nervous animation; drops below 10% → happy

#### C3 — Savings Rate (ref: `docs/plaid-catalog.md`, `docs/plaid-integration.md`)

- **Backend:** Add `GET /api/spending/summary` — scans last 30 days of transactions, computes income total (transactions categorized as `paycheck` or `income`), spend total, savings rate `(income - spend) / income * 100`, and top spend categories
- **iOS:** Summary card in Activity tab header
- **Pet reaction:** Month ends with negative savings rate → sad; three consecutive positive months → proud

#### C4 — Emergency Fund Coverage (ref: `docs/plaid-catalog.md`)

- **Backend:** Add `liquidCashMonths` to `GET /api/net-worth` response — sum of depository account balances divided by average monthly spend (from last 3 months of transactions)
- **iOS:** "X months runway" label in Wealth → Bank Accounts section
- **Pet reaction:** < 1 month → stressed; ≥ 6 months → secure/proud

**UI tests required (write alongside the code — not after):** Each new metric needs a `CoinyUITests` test that stubs the relevant endpoint via `MOCK_STUBS` and asserts the value appears in the Wealth or Activity tab. Add these to the same PR as the backend + iOS changes.

**GitHub moves:**
```bash
git checkout main && git pull
git checkout -b feat/financial-metrics
# ... backend changes ...
git add backend/src/api/spinwheel.ts backend/src/api/net-worth.ts \
        backend/src/spinwheel/client.ts backend/tests/
git commit -m "feat(backend): add credit score, credit utilization, savings rate, emergency fund endpoints"
# ... iOS changes ...
git add ios/Coiny/Views/NetWorthView.swift ios/Coiny/ViewModels/NetWorthViewModel.swift \
        ios/Coiny/Views/ ios/CoinyTests/
git commit -m "feat(ios): surface credit score, utilization, savings rate, emergency fund in Wealth"
gh pr create --title "feat: add credit score, credit utilization, savings rate, emergency fund"
```

---

### Workstream D — Integration Testing

**Branch:** `test/integration-vendors`
**PR title:** `test: vendor integration tests — Plaid, Spinwheel, Zerion, CoinGecko`

Goal: prove each vendor connection works against its real sandbox/live environment. All tests are Vitest, live in `backend/tests/integration/`.

#### D1 — Plaid (ref: `docs/plaid-integration.md`, `docs/plaid-catalog.md`)

- Transactions E2E already proven (PR #101). Remaining gaps:
  - Does `investmentsHoldingsGet` return data for a sandbox Item? (sandbox bank `user_good/pass_good` may have mock holdings)
  - Does `liabilitiesGet` return credit card data for sandbox user?
- Write two Vitest tests: link a sandbox item → call each endpoint → assert shape of response
- Sandbox: `user_good` / `pass_good`, any sandbox institution

#### D2 — Spinwheel (ref: `docs/spinwheel-catalog.md`)

- Sandbox base URL: `https://sandbox-api.spinwheel.io`
- Test users: **Christy Jenoval** (DOB `1967-06-08`), **Aldo Cherry** (DOB `1990-01-01`)
- Get sandbox API key: register at developer.spinwheel.io → store in Keychain as `coiny-spinwheel-sandbox-key`
- Write Vitest integration test: `sendSmsOtp` → `verifySmsOtp` → `getDebtProfile` → `getUser` (credit score) → `deleteUser`
- Assert: debt profile returns at least one liability for the test user

#### D3 — Coinbase (ref: `docs/coinbase-catalog.md`)

- No sandbox — dev key hits a real Coinbase account
- Manual smoke test only: `source bin/load-secrets.sh && curl -s localhost:3000/api/coinbase/status` (requires Coinbase dev key in Keychain)
- Write a Vitest test for `getAccounts()` that skips if `COINBASE_API_KEY_ID` is not set (`it.skipIf(...)`)

#### D4 — Zerion (ref: `docs/zerion-catalog.md`)

- No sandbox — dev key hits live chain data
- Known public wallet for testing: `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (vitalik.eth — publicly known, stable non-zero balance)
- Write Vitest test: `getPortfolio(vitalikAddress)` → assert `total_usd > 0`
- Skip if `ZERION_API_KEY` not set

#### D5 — CoinGecko (ref: `docs/coingecko-catalog.md`)

- Free Demo plan, hits live data, no credentials required for basic calls
- Write Vitest test: `getPrices(['bitcoin', 'ethereum'])` → assert both keys present and `usd > 0`
- Write Vitest test: `getCoinImageUrl('bitcoin')` → assert returns a non-null URL string

**GitHub moves:**
```bash
git checkout main && git pull
git checkout -b test/integration-vendors
# ... write tests in backend/tests/integration/ ...
git add backend/tests/integration/
git commit -m "test(backend): vendor integration tests — Plaid investments/liabilities, Spinwheel, Zerion, CoinGecko"
gh pr create --title "test: vendor integration tests — Plaid, Spinwheel, Zerion, CoinGecko"
```

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

> Read `docs/handoff.md`, `docs/tech-stack.md`, and `docs/product-brief.md`.
> Session 3 complete. 148 iOS unit tests pass. 54 UI tests ran — 27 pass, 27 fail (two known bug categories fully documented in handoff).
> Four workstreams planned: A (UI Reform), B (Fix UI Tests), C (New Metrics), D (Integration Tests). Execute A → B → C/D.
> PR #102 (`test/ios-uitest-tabs`) should be closed — superseded by Workstream A.
> Simulator: iPhone 17 Pro UDID `A445C692-84CF-4D18-9CE1-ADD92174D731`. Use `xcbeautify`. Always `xcodegen generate` before `xcodebuild`. Never open Xcode while xcodebuild runs.
> Next: [describe specific workstream task].

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
