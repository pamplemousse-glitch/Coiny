# Coiny — Project Handoff

**Last updated: 2026-05-25 (session 6)**

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
│   ├── src/api/       # Route handlers (auth, pets, plaid, coinbase, zerion, spinwheel, account, net-worth)
│   ├── src/store/     # DB queries (users, sessions, items, pets, transactions, events)
│   ├── src/plaid/     # Plaid API client + webhook verifier + category adapter
│   ├── src/coinbase/  # Coinbase Advanced Trade client (JWT ES256) + public spot prices
│   ├── src/zerion/    # Zerion DeFi portfolio client (Basic auth)
│   ├── src/spinwheel/ # Spinwheel debt client (Bearer + SMS OTP)
│   └── tests/         # 259 Vitest tests, all passing
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

### Backend (Node + Fastify + Drizzle, Fly.io) — 259 Vitest tests, all passing

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
- ✅ `GET /api/net-worth` aggregates: bank balances (Plaid) + investment holdings (Plaid) + crypto (Coinbase + public spot prices) + DeFi (Zerion) + debts (Spinwheel), per-source try/catch so one failure doesn't block others (PR #81)
- ✅ CoinGecko removed (PR #107) — replaced with Coinbase's public `/v2/prices/{sym}-USD/spot` endpoint (no auth, no extra dependency). Price-surge/drop reactions removed (no 24h delta from spot API).
- ✅ Coinbase JWT `typ: "JWT"` header fix — required by Coinbase docs, was missing from protected header
- ✅ **E2E pipeline proven** (PR #101): Vitest test fires a Plaid sandbox webhook → verifies `paycheck_received` reaction is persisted and returned by `GET /api/pets`

### iOS App (Swift + SwiftUI) — 148 unit tests passing, 1 UI smoke test passing

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
- ✅ **RootView**: **3 tabs — Pet, Activity, Wealth** (PR #103). Settings moved to gear-button sheet on Pet. Crypto + Debt folded into Wealth as inline sections.
- ✅ 148 iOS unit tests: APIEndpointTests (22), APITests (15), CoinbaseViewModelTests (15), KeychainTests (8), NetWorthViewModelTests (11), PetStateDecodingTests (18), PetStoreTests (9), SessionStoreTests (4), SpendingViewModelTests (5), SpinwheelViewModelTests (16), ViewSmokeTests (9), ZerionViewModelTests (16) — all passing
- ✅ 1 UI smoke test (`AppLaunchSmokeTests`) — checks cold-launch SignIn screen

---

## In-Flight PRs

| PR | Branch | Status | Action |
|---|---|---|---|
| **#107** | `test/integration-vendors` | **Open** | CoinGecko removal + Coinbase spot price API + JWT fix. 259 tests pass. Merge when ready. |

PRs #81, #91–#99, #101, #103, #104, #105 merged. PR #102 closed (superseded by #103).

---

## Known Integration Bugs (NOT YET FIXED — fix before production)

Found via audit against official docs in `docs/context/`. Priority order:

### 1. Spinwheel — `getCreditScore` always returns null ⛔
**File:** `backend/src/spinwheel/client.ts`
**Bug:** Reads `vantageScore3 / creditScore / score` from the user profile GET endpoint. Docs confirm credit scores live inside `debtProfile.creditReports`, not the user object. Will return `null` every time.
**Fix:** Call `getDebtProfile` with `creditScoreModel: 'VANTAGE_SCORE_3_0'` in the body, then read the score from `creditReports[0]`.

### 2. Spinwheel — `getDebtProfile` sends empty body ⛔
**File:** `backend/src/spinwheel/client.ts`
**Bug:** Sends `{}` as request body. Docs require `creditReportType` (`1_BUREAU.FULL`), `sourceBureau`, and `creditScoreModel`. API may return incomplete or errored data without these.
**Fix:** Pass the required fields in the body.

### 3. Zerion — `transfers[].value` field name unconfirmed ⚠️
**File:** `backend/src/zerion/client.ts`
**Bug:** Parses `transfers[].value` for USD amount. Docs list `quantity` as the field name — `value` may be wrong and silently return `$0` for every transaction.
**Fix:** Use Zerion live MCP (`zerion` MCP server in Claude Code) to query a real wallet transaction and confirm the exact field name before coding.

---

## Known iOS UI Test Issues

### Bug 1 — App crash cascade (historical, files deleted)

**Status:** The UITest files that had this bug (`PetTabUITests.swift`, `ActivityTabUITests.swift`, etc.) were deleted from main when PR #102 was cleaned up. The root cause is documented here for future reference.

**Root cause:** Calling `freshApp.launch()` on a new `XCUIApplication` with the same bundle ID kills the class-level app. After `freshApp.terminate()`, the class-level app is dead — every subsequent test using it fails.

**Fix when re-adding these tests:** After `freshApp.terminate()` in the defer block, call `Self.app.launch()` to re-launch the class-level app.

### Bug 2 — Debt/Settings tabs not found (21 tests) — ✅ FIXED in PR #103

**Root cause:** iOS tab bar shows only 4 tabs + a "More" button when there are 5+ tabs. With 6 tabs, Debt (tab 5) and Settings (tab 6) were hidden.

**Fix:** PR #103 collapses to 3 tabs. Debt is now a section in the Wealth tab. Settings is a gear-button sheet on the Pet tab.

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

### Integrations

- ✅ Plaid sandbox — `sandboxPublicTokenCreate` + `investmentsHoldingsGet` + `liabilitiesGet` (3/3 pass)
- ✅ Zerion — `getPortfolio` + `getTransactions` against Vitalik's wallet (2/2 pass). No sandbox — Zerion has none; Vitalik's public wallet is the standard test approach.
- ✅ Coinbase — Advanced Trade sandbox (`api-sandbox.coinbase.com`) validates endpoint shape. Auth path untested (sandbox ignores JWT). No official TS SDK for Advanced Trade — hand-rolled client is correct.
- ⚠️ Spinwheel — test written; **needs `SPINWHEEL_TEST_PHONE`**. Also has two production bugs (see Known Integration Bugs above).
- ❌ CoinGecko — **removed entirely** (PR #107). Replaced with Coinbase public spot price API.

Run integration tests: `source bin/load-secrets.sh && INTEGRATION_TEST=1 pnpm --filter coiny-backend test tests/integration/`

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

### Workstream A — UI Reform ✅ IN PR

**Branch:** `feat/ui-reform`  
**PR:** [#103](https://github.com/pamplemousse-glitch/Coiny/pull/103) — open, build compiles clean, awaiting test run + merge

**PR title:** `feat(ios): reform tab structure from 6 to 3 tabs`

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
