# Coiny — Project Handoff

Read this first. It is the single source of truth for current project state.

---

## What Is Coiny

A portable Tamagotchi-like carry device linked to the user's bank account
via Plaid. The device reacts in real time to financial behavior —
animated face, color LED, vibration, and sound — when the user does things
aligned or misaligned with their personal finance goals.

---

## Repository

- **URL**: https://github.com/pamplemousse-glitch/Coiny (private)
- **Owner**: pamplemousse-glitch (Antoine)
- **Local path**: `/Users/antoinewiley/Tamogatchi`
- **Team**: Solo (Antoine). Code is written by Claude Code; Antoine handles
  physical setup, hardware, phone testing, and signups.

---

## Repo Structure

```
Coiny/
├── backend/           # Fastify + TypeScript + Drizzle ORM — live on Fly.io
├── ios/               # Native Swift + SwiftUI (XcodeGen-managed)
├── android/           # Kotlin + Compose scaffold (early stage)
├── firmware/          # nRF52840 + Zephyr (nRF Connect SDK) — scaffolded, not flashed yet
├── shared/            # Cross-package TS types (BLE schema, pet state)
├── hardware/
│   └── case/          # OpenSCAD designs (coin_v1.scad + renders)
├── bin/               # Helper scripts (load-secrets.sh, verify-secrets.sh)
└── docs/
    ├── handoff.md           This file
    ├── architecture.md      System design, BLE flow, hardware spec
    ├── tech-stack.md        Quality-first stack decisions
    ├── proposed-changes.md  Summary table of 2026-05-20 quality audit changes
    ├── implementation-plan.md Execution sequence + milestones
    ├── feature-backlog.md   Forward-looking feature list
    ├── product-brief.md     Product north star (target user, voice, principles)
    ├── stack-map.md         Complete visual map: hardware + software layers
    ├── launch-readiness.md  Blocker checklist (MVP-Prototype vs Full Launch)
    ├── 14-day-sprint.md     14-day prototype sprint plan (realistic: 4–6 weeks)
    ├── 3-day-sprint.md      72-hour software-only demo plan (iOS Simulator, $0)
    ├── plaid-integration.md Plaid API contract reference
    ├── security.md          Threat model + per-phase security checklist
    ├── sprint-plan.md       7-day sprint cadence
    └── mqtt-topics.md       BLE command schema
```

---

## Architecture

```
Bank Transaction
      ↓
Plaid webhook (HMAC-SHA256 verified) ──► Backend (Fastify / TS, Fly.io)
      ↓
Rule engine evaluates vs user goals
      ↓
Direct APNs push notification ──► iOS app (SwiftUI)
      ↓
[Phase 2+] App relays BLE command to Coiny in pocket
      ↓
Device: animated face + LED + vibration + sound
```

Device is BLE-only. Phone is the internet bridge → 2–3 day battery target.

---

## Stack (Current)

| Layer | Technology | Notes |
|---|---|---|
| Backend | Fastify + TypeScript + Drizzle ORM | Fly.io (Sydney), Node 22 |
| Database | Neon Postgres (prod) / PGlite (tests) | 7 migrations, 0005 adds multi-user, 0006 encrypts reaction |
| Auth | Apple Sign In (AS JWT) + session tokens | ES256 JWT verified via Apple JWKS |
| Bank data | Plaid (sandbox) | `PLAID_ENV=sandbox` — zero real bank risk |
| Push | Direct APNs (HTTP/2, `@parse/node-apn`) | No intermediary (Expo/FCM bypass) |
| Integrations | CoinGecko, Coinbase Advanced Trade, Zerion, Spinwheel | PR #71, pending merge |
| iOS | Swift 5.10 + SwiftUI, iOS 17+ | XcodeGen-managed; DI API; 25+ unit tests |
| Android | Kotlin + Compose | Early scaffold, `android/` |
| Firmware | nRF52840 + Zephyr / nRF Connect SDK | Phase 2; not flashed yet |
| CI | GitHub Actions | SHA-pinned; Semgrep + Gitleaks + Trivy + SBOM + CodeQL + SwiftLint; 80% backend coverage gate |

---

## Key Decisions (Made)

| Decision | Choice | Reason |
|---|---|---|
| Bank API | **Plaid** (replaced Teller) | Broader coverage, sandbox safety, Plaid production path |
| Mobile | **Native Swift/SwiftUI** (replaced React Native/Expo) | Direct APNs, better BLE, no bridge layer |
| Auth | **Apple Sign In** | Privacy-preserving, no email/password infra |
| Session storage | **SHA-256 hash in DB, raw in iOS Keychain** | Token compromise doesn't expose DB |
| Access token encryption | **AES-256-GCM** (`DATA_ENCRYPTION_KEY`) | GLBA / Plaid production requirement |
| Reaction column encryption | **AES-256-GCM** (`DATA_ENCRYPTION_KEY`) | Merchant names + amounts in reaction_history |
| Device connectivity | **BLE** | 2–3 day battery vs 12–16 hr for WiFi |
| Prototype hardware | **nRF52840** (replaced ESP32-S3) | 10× better battery life; nRF Connect SDK |
| Monorepo | **pnpm workspaces + Turborepo** | Cross-package builds, single lockfile |
| Local secrets | **macOS Keychain** via `security` CLI | Encrypted at rest, no plaintext `.env` |

---

## What Has Been Done

### Infrastructure
- ✅ Repo, CI, hosting, monorepo scaffold
- ✅ Fly.io backend deployed (`coiny-backend.fly.dev`)
- ✅ Neon Postgres wired (Drizzle ORM, 7 migrations)
- ✅ Plaid sandbox account + webhook registration
- ✅ Branch-guard hook: commits on `main` are blocked
- ✅ `CLAUDE.md` with project conventions
- ✅ CI hardening: SHA-pinned actions, Semgrep SAST, Gitleaks, Trivy container scan, SBOM (CycloneDX), CodeQL, SwiftLint `--strict`, 80% backend coverage gate, docs-only skip gate
- ✅ Auto-merge: all non-draft PRs auto-squash-merge when checks pass

### Backend (PRs #2, #5, #23–#25, #42, #45–#47, #50–#53 — all merged)
- ✅ Fastify server: pino logging, rate limiting (per-user, not per-IP), error handler
- ✅ Plaid webhook handler: HMAC-SHA256 signature verification + replay protection
- ✅ Rule engine: paycheck, overspend, savings milestone, bill paid, large purchase,
  subscription detection
- ✅ Health score (0–100), mood, reaction history ring buffer
- ✅ REST API: `GET /api/pets`, `PUT /api/pets/goals`, `GET /api/spending`,
  `GET /api/subscriptions`, `POST /api/devices/push-token`,
  `POST /api/plaid/link-token`, `POST /api/plaid/exchange-token`,
  `POST /api/plaid/sync`, `GET/PUT /api/overrides`
- ✅ Direct APNs push (HTTP/2, `@parse/node-apn`) — no Expo/FCM
- ✅ Multi-user + Apple Sign In (PR #47)
  - `users` + `sessions` tables (migration 0005)
  - `POST /api/auth/apple`: verifies Apple JWT via JWKS, creates/finds user, issues session
  - `POST /api/auth/logout`: deletes session
  - Auth plugin: `Bearer` token → SHA-256 → DB lookup → `req.user.id`
  - All store functions and routes scoped by `userId` (BOLA/IDOR protection)
  - AES-256-GCM encryption of Plaid `access_token` in DB
- ✅ `DELETE /api/account` (PR #50): Plaid item removal + full user data purge (GLBA right-to-delete)
- ✅ `POST /api/debug/react` (PR #53): bypass Plaid for TestFlight demo (`?animation=celebrate`)
- ✅ AES-256-GCM encryption of `reaction_history.reaction` column (PR #52, migration 0006)
- ✅ Reaction rules for external events: 9 event types covering CoinGecko price alerts, Coinbase account activity, Zerion DeFi portfolio, Spinwheel debt payoff (`backend/src/reactions/external.ts`, PR #71 pending)

### Backend integrations (PR #71 — pending merge)
- ✅ CoinGecko: `getPrices()`, `getCoinImageUrl()`, typed rate-limit error
- ✅ Coinbase Advanced Trade: ECDSA JWT (ES256 via `jose`), `getAccounts()`, `getTransactions()`, connect/sync/disconnect REST routes under `/api/coinbase`
- ✅ Zerion: Basic auth (`API_KEY:` base64), portfolio + transaction endpoints, wallet CRUD + sync under `/api/zerion`
- ✅ Spinwheel: SMS OTP connect flow, `getDebts()`, connect/debts/status under `/api/spinwheel`
- ✅ DB migration `0007_external_integrations.sql`: `coinbase_connections`, `zerion_wallets`, `spinwheel_connections` tables
- ✅ 5 new optional env vars wired through Zod config: `COINGECKO_API_KEY`, `COINBASE_API_KEY_ID`, `COINBASE_API_KEY_SECRET`, `ZERION_API_KEY`, `SPINWHEEL_SECRET_KEY`

### iOS (PRs #39, #42, #45, #46, #48, #54, #56–#58 — all merged; PR #70 pending)
- ✅ XcodeGen project, SwiftUI, strict Swift, `SWIFT_TREAT_WARNINGS_AS_ERRORS: YES`
- ✅ `API.swift`: typed client with constructor DI (URLSession, SessionStore, base URL); `API.shared` singleton for production; test-injectable
- ✅ Plaid Link (web view), transaction polling, JSON parsing
- ✅ Pet animation (breathing, celebrate, sad) + health bar
- ✅ APNs push token registration + `POST /api/devices/push-token`
- ✅ Onboarding flow (goals → bank link → push opt-in)
- ✅ `SettingsView`: bank status, goal display, sign-out, reset
- ✅ Apple Sign In + Keychain session (PR #48)
  - `SignInView.swift`: `SignInWithAppleButton`, extracts identity token + user ID
  - `Keychain.swift`: generic password item, `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`
  - `CoinyApp.swift`: three-state flow — `SignInView → OnboardingView → RootView`
- ✅ 25+ unit tests: PetStore state machine, API layer, view construction smoke tests, UITest launch
- ✅ Onboarding education card carousel + "Coiny is watching…" empty state (PR #70 pending)

### CI
- ✅ iOS CI: macOS-15 runner, XcodeGen, SwiftLint `--strict`, dynamic simulator selection, xcresult upload on failure
- ✅ Android CI: JVM unit tests + Lint on Ubuntu
- ✅ Backend CI: pnpm, Biome lint, Vitest with coverage gate (80%)
- ✅ Security CI: Semgrep SAST, Gitleaks secret scan, Trivy container scan, SBOM (CycloneDX), CodeQL
- ✅ docs-only CI skip gate: security scans skip on PRs touching only `docs/`, `.github/workflows/`, `*.md`
- ⚠️ Required checks deadlock fix (PR #73 pending): iOS/Android CI switched from workflow-level `paths:` to job-level gate + always-reporting `result` job

---

## What Needs Antoine Action (Blocking — before device testing)

All code is correct. Before the app can be built and run on a real iPhone, Antoine must:

1. **Set `DATA_ENCRYPTION_KEY` in Fly**
   ```bash
   fly secrets set DATA_ENCRYPTION_KEY=$(openssl rand -hex 32) -a coiny-backend
   ```

2. **Set `DEVELOPMENT_TEAM` in `ios/project.yml` line 19**
   10-char Team ID from developer.apple.com/account → Membership Details.
   ```yaml
   DEVELOPMENT_TEAM: "XXXXXXXXXX"
   ```

3. **Enable "Sign In with Apple" in Developer Portal**
   Identifiers → `app.coiny.ios` → Edit → Sign In with Apple → Save

4. **Regenerate Xcode project + archive for TestFlight**
   ```bash
   cd /Users/antoinewiley/Tamogatchi/ios && xcodegen generate
   ```
   Then: Xcode → Product → Archive → Distribute App → App Store Connect → TestFlight

5. **Configure required status checks in GitHub branch protection** (after PR #73 merges)
   Settings → Branches → main → Required status checks:
   - `iOS CI / result`
   - `Android CI / result`
   - `Backend CI / test`
   - `Security / gitleaks`

---

## What Needs Antoine Action (Non-Blocking, Next Sprint)

- [ ] **Add external integration secrets to Fly** (after PR #71 merges):
  ```bash
  fly secrets set \
    COINGECKO_API_KEY=... \
    COINBASE_API_KEY_ID=... \
    COINBASE_API_KEY_SECRET=... \
    ZERION_API_KEY=... \
    SPINWHEEL_SECRET_KEY=... \
    -a coiny-backend
  ```
  Keys are already in local macOS Keychain (`source bin/load-secrets.sh` for dev).

- [ ] **Incident response plan** (one-page doc) — Plaid production approval requires it

- [ ] **Privacy policy** (technical sections) — Plaid production approval + App Store require it

---

## Open PRs (as of 2026-05-22)

| PR | Branch | Title | Status |
|---|---|---|---|
| #70 | feat/ios-onboarding-polish | feat(ios): onboarding education cards + waiting-for-first-reaction empty state | CI running, auto-merge on |
| #71 | feat/external-integrations | feat(backend): CoinGecko + Coinbase + Zerion + Spinwheel integrations | CI running, auto-merge on |
| #73 | chore/ci-always-reporting-checks | chore(ci): fix required-check deadlock on non-iOS/Android PRs | CI running, auto-merge on |
| #69 | chore/docs-only-ci-skip | chore(ci): skip heavy security scans on docs-only PRs | CI green, auto-merge on |
| #61–64 | dependabot/* | Dependabot action/dep bumps | CI green/running, auto-merge on |

---

## Recently Merged PRs (sprint 2026-05-21 – 2026-05-22)

| PR | Title | What it added |
|---|---|---|
| #48 | feat(ios): Apple Sign In + Keychain session token | SignInView, Keychain.swift, three-state app flow |
| #50 | feat(backend): DELETE /api/account for right-to-delete | GLBA purge — Plaid item remove + cascade delete |
| #51 | feat(backend): per-user rate limiting on @fastify/rate-limit | `keyGenerator: req.user.id` |
| #52 | feat(backend): encrypt reaction_history.reaction at rest | AES-256-GCM, migration 0006 |
| #53 | feat(backend): POST /api/debug/react for TestFlight demos | Demo bypass without real Plaid transaction |
| #54 | ci+test(ios+android): native pipelines + 19 new iOS unit tests | iOS + Android CI; PetStore + API + view tests |
| #55 | docs: gains/losses detection inventory | Gap analysis + integration roadmap |
| #56 | test(ios): add CoinyUITests target with launch smoke test | UITest target |
| #57 | test(ios): inject API into PetStore + 6 state-machine tests | DI API, PetStore state tests |
| #58 | test(ios): construct-and-layout smoke for every top-level view | View construction tests |
| #59 | docs: add fundraising plan + update hardware spec | Coin cell + IP67 spec |
| bda212d | chore(ci): fintech CI hardening | SHA pins, SBOM, CodeQL, SwiftLint, coverage gate |

---

## Sensitive Data Audit

| Data | Where stored | Protection |
|---|---|---|
| Plaid `access_token` | Neon Postgres `plaid_items.access_token` | AES-256-GCM, key in Fly secrets |
| `reaction_history.reaction` | Neon Postgres | AES-256-GCM, same key |
| Session token (raw) | iOS Keychain only | `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` |
| Session token (hash) | Neon Postgres `sessions.token_hash` | SHA-256, one-way |
| Apple `sub` | Neon Postgres `users.apple_sub` | Pseudonymous opaque ID |
| User email | Neon Postgres `users.email` | Optional; user can withhold |
| APNs device token | Neon Postgres `device_tokens.token` | Rotating; revocable |
| Transaction data | Neon Postgres `transactions` | Scoped by `user_id`; pseudonymous IDs in logs |
| Coinbase key pair | macOS Keychain (dev) / Fly secrets (prod) | Never in `.env` or logs |
| Zerion API key | macOS Keychain (dev) / Fly secrets (prod) | Same |
| Spinwheel secret | macOS Keychain (dev) / Fly secrets (prod) | Same |
| Plaid sandbox creds | Not stored | `user_good`/`pass_good` only in Link UI |

Nothing sensitive is in `.env` files or logs. Local dev secrets use macOS Keychain.

---

## Plaid Sandbox Safety

- `PLAID_ENV=sandbox` means the Plaid client can only reach sandbox endpoints.
  No path exists to real bank data without a deliberate Fly secrets change to
  `PLAID_ENV=development` AND Plaid approving the upgrade.
- Sandbox tokens (`access-sandbox-…`) are structurally blocked from touching
  real institutions.
- Safe to test end-to-end with `user_good` / `pass_good` credentials.

---

## Plaid Production Approval Path

Plaid reviews apps manually before granting `development` or `production` access.
Requirements we already meet: HMAC signature verification, HTTPS, sandbox isolation,
AES-256-GCM at rest, SHA-256 session tokens, `DELETE /api/account`.

Remaining gaps before applying:
- Privacy policy (URL required in application)
- Incident response plan
- Encryption at rest for all PII fields (`reaction_history.reaction` ✅ done; verify no others)

---

## Local Dev Startup

```bash
# Two terminals

# Terminal 1 — backend (loads all secrets from Keychain)
cd /Users/antoinewiley/Tamogatchi
source bin/load-secrets.sh && pnpm --filter coiny-backend dev

# Terminal 2 — tests
pnpm --filter coiny-backend test
```

**Keychain secrets** (run `bin/verify-secrets.sh` to check status):
```
coiny-plaid-sandbox-client-id            ✅ stored
coiny-plaid-sandbox-secret               ✅ stored
coiny-coingecko-api-key                  ✅ stored
coiny-coinbase-sandbox-api-key-id        ✅ stored
coiny-coinbase-sandbox-api-key-secret    ✅ stored
coiny-zerion-sandbox-api-key             ✅ stored
coiny-paypal-sandbox-client-id           ✅ stored
coiny-paypal-sandbox-secret              ✅ stored
coiny-spinwheel-sandbox-secret-key       ✅ stored
```

To add a missing secret (never pass value inline — it ends up in shell history):
```bash
security add-generic-password -a "$USER" -s "coiny-KEY-NAME" -w
```

---

## Hardware

### Prototype (1 unit — hardware acquired)

| Item | Status |
|---|---|
| nRF52840 dev kit | To order (replaced ESP32-S3) |
| Adafruit DRV2605L haptic driver | ✅ Ordered (DigiKey) |
| 10mm coin vibration motor | ✅ Ordered (Amazon) |
| SparkFun Qwiic-to-Grove cable | ✅ Ordered (Amazon) |
| M5StickS3 (original plan, replaced) | ✅ Ordered but superseded |

See `docs/tech-stack.md` § Hardware for the rationale for the ESP32-S3 →
nRF52840 swap (battery life: hours vs weeks).

### Firmware

`firmware/` is scaffolded but not flashed. Phase 2 work. nRF Connect SDK
(Zephyr RTOS). BLE command schema in `docs/mqtt-topics.md`.

---

## Resuming Work

Open a fresh Claude Code session in `/Users/antoinewiley/Tamogatchi` and say:

> Read `docs/handoff.md`. Several PRs are currently open and auto-merging:
> #70 (iOS education cards), #71 (external integrations backend), #73 (CI
> required-check deadlock fix), #69 (docs-only CI skip), and a few Dependabot
> bumps. Once those land, main will be fully caught up.
>
> Antoine still needs to do 4 blocking steps before the app runs on device:
> (1) `fly secrets set DATA_ENCRYPTION_KEY=$(openssl rand -hex 32) -a coiny-backend`,
> (2) fill in `DEVELOPMENT_TEAM` in `ios/project.yml:19`,
> (3) enable Sign In with Apple in the Developer Portal,
> (4) `cd ios && xcodegen generate` then archive for TestFlight.
>
> The next code work is:
> - Wire external integration data (CoinGecko prices, Coinbase balances, Zerion
>   portfolio) into the iOS pet view so users can see crypto reactions
> - Incident response plan (1-page doc) for Plaid production approval
> - Privacy policy technical sections for App Store + Plaid
> - After CI PR #73 merges: configure required checks in GitHub branch protection

### Key commands

```bash
# Run all backend tests
pnpm --filter coiny-backend test

# Regenerate Xcode project after ios/project.yml changes
cd ios && xcodegen generate

# Deploy to Fly
fly deploy -a coiny-backend --dockerfile backend/Dockerfile

# Check Fly logs
fly logs -a coiny-backend

# Verify all Keychain secrets present
bin/verify-secrets.sh
```
