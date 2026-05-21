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
├── bin/               # Helper scripts (load-secrets.sh, etc.)
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
| Database | Neon Postgres (prod) / PGlite (tests) | 6 migrations, 0005 adds multi-user |
| Auth | Apple Sign In (AS JWT) + session tokens | ES256 JWT verified via Apple JWKS |
| Bank data | Plaid (sandbox) | `PLAID_ENV=sandbox` — zero real bank risk |
| Push | Direct APNs (HTTP/2, `@parse/node-apn`) | No intermediary (Expo/FCM bypass) |
| iOS | Swift 5.10 + SwiftUI, iOS 17+ | XcodeGen-managed, `ios/` |
| Android | Kotlin + Compose | Early scaffold, `android/` |
| Firmware | nRF52840 + Zephyr / nRF Connect SDK | Phase 2; not flashed yet |
| CI | GitHub Actions | Node 22, pnpm 11.1.3, Biome, Semgrep, Gitleaks, Trivy |
| Observability | pino JSON logs on Fly | Sentry not yet wired |

---

## Key Decisions (Made)

| Decision | Choice | Reason |
|---|---|---|
| Bank API | **Plaid** (replaced Teller) | Broader coverage, sandbox safety, Plaid production path |
| Mobile | **Native Swift/SwiftUI** (replaced React Native/Expo) | Direct APNs, better BLE, no bridge layer |
| Auth | **Apple Sign In** | Privacy-preserving, no email/password infra |
| Session storage | **SHA-256 hash in DB, raw in iOS Keychain** | Token compromise doesn't expose DB |
| Access token encryption | **AES-256-GCM** (`DATA_ENCRYPTION_KEY`) | GLBA / Plaid production requirement |
| Device connectivity | **BLE** | 2–3 day battery vs 12–16 hr for WiFi |
| Prototype hardware | **nRF52840** (replaced ESP32-S3) | 10× better battery life; nRF Connect SDK |
| Monorepo | **pnpm workspaces + Turborepo** | Cross-package builds, single lockfile |
| Local secrets | **macOS Keychain** via `security` CLI | Encrypted at rest, no plaintext `.env` |

---

## What Has Been Done

### Infrastructure (pre-May-20)
- ✅ Repo, CI, hosting, monorepo scaffold
- ✅ Fly.io backend deployed (`coiny-backend.fly.dev`)
- ✅ Neon Postgres wired (Drizzle ORM, 6 migrations)
- ✅ Plaid sandbox account + webhook registration
- ✅ Biome 2.0 linting, Semgrep + Gitleaks + Trivy security CI
- ✅ Branch-guard hook: commits on `main` are blocked
- ✅ `CLAUDE.md` with project conventions

### Backend (PRs #2, #5, #42, #45, #46, #47 — all merged to main)
- ✅ Fastify server: pino logging, rate limiting, error handler
- ✅ Plaid webhook handler: HMAC-SHA256 signature verification + replay protection
- ✅ Rule engine: paycheck, overspend, savings milestone, bill paid, large purchase,
  subscription detection
- ✅ Health score (0–100), mood, reaction history ring buffer
- ✅ REST API: `GET /api/pets`, `PUT /api/pets/goals`, `GET /api/spending`,
  `GET /api/subscriptions`, `POST /api/devices/push-token`,
  `POST /api/plaid/link-token`, `POST /api/plaid/exchange-token`,
  `POST /api/plaid/sync`, `GET/PUT /api/overrides`
- ✅ Direct APNs push (HTTP/2, `@parse/node-apn`) — no Expo/FCM
- ✅ Multi-user + Apple Sign In (PR #47, merged 2026-05-21)
  - `users` + `sessions` tables (migration 0005)
  - `POST /api/auth/apple`: verifies Apple JWT via JWKS, creates/finds user, issues session
  - `POST /api/auth/logout`: deletes session
  - Auth plugin: `Bearer` token → SHA-256 → DB lookup → `req.user.id`
  - All store functions and routes scoped by `userId` (BOLA/IDOR protection)
  - AES-256-GCM encryption of Plaid `access_token` in DB
  - Three-scope server: unauthenticated (`/health`, `/webhooks/plaid`),
    public (`/api/auth/*`), protected (all others)
  - 56 Vitest tests, all passing

### iOS (PRs #39, #42, #45, #46, #48 — all merged to main)
- ✅ XcodeGen project, SwiftUI, strict Swift
- ✅ `API.swift`: typed client for all backend endpoints
- ✅ Plaid Link (web view), transaction polling, JSON parsing
- ✅ Pet animation (breathing, celebrate, sad) + health bar
- ✅ APNs push token registration + `POST /api/devices/push-token`
- ✅ Onboarding flow (goals → bank link → push opt-in)
- ✅ SettingsView: bank status, goal display, sign-out, reset
- ✅ Apple Sign In + Keychain session (PR #48, merged 2026-05-21)
  - `SignInView.swift`: `SignInWithAppleButton`, extracts identity token + user ID
  - `Keychain.swift`: generic password item, `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`
  - `CoinyApp.swift`: three-state flow — `SignInView → OnboardingView → RootView`
  - Session token stored raw in Keychain, never in UserDefaults
  - `API.swift`: injects `Authorization: Bearer` on all authenticated calls,
    auto-signs-out on 401, `isSignedIn` property
  - `coinySignedOut` notification triggers full sign-out across the app

---

## What Needs Antoine Action (Blocking — before device testing)

All PRs are merged. The code is correct. Before the app can be built and run on
a real iPhone, Antoine must do three things in the Developer Portal:

1. **Set `DATA_ENCRYPTION_KEY` in Fly**
   ```bash
   fly secrets set DATA_ENCRYPTION_KEY=$(openssl rand -hex 32) -a coiny-backend
   ```
   Required for AES-256-GCM encryption of Plaid tokens in production.

2. **Set `DEVELOPMENT_TEAM` in `ios/project.yml` line 19**
   10-char Team ID from developer.apple.com/account → Membership Details.
   ```yaml
   DEVELOPMENT_TEAM: "XXXXXXXXXX"
   ```

3. **Enable "Sign In with Apple" in Developer Portal**
   Identifiers → `app.coiny.ios` → Edit → Sign In with Apple → Save

4. **Regenerate Xcode project**
   ```bash
   cd /Users/antoinewiley/Tamogatchi/ios && xcodegen generate
   ```
   Then open `ios/Coiny.xcodeproj`, select your iPhone, Build & Run.

---

## What Needs Antoine Action (Non-Blocking, Next Sprint)

- [ ] **`DELETE /api/account`** — calls Plaid `/item/remove` for all user items,
  deletes user row (cascades), needed for GLBA right-to-delete
- [ ] **Per-user rate limiting** — `keyGenerator: (req) => req.user?.id`
  on `@fastify/rate-limit`
- [ ] **Encrypt `reaction_history.reaction` field** — plaintext merchant names
  + amounts currently stored; needs migration + new AES column
- [ ] **Incident response plan** (one-page doc) — Plaid approval requires it
- [ ] **Privacy policy** (technical sections) — Plaid approval requires it
- [ ] **`POST /api/debug/react`** — bypass Plaid for TestFlight demo
  (`?animation=celebrate` triggers a test reaction without a real transaction)
- [ ] **Apple Developer Program** ($99/yr) — needed before TestFlight

---

## Merged PRs (this sprint, 2026-05-21)

| PR | Title | What it added |
|---|---|---|
| #44 | fix(docs): speaker part correction | docs only |
| #45 | feat(ios+backend): wire direct APNs push | APNs HTTP/2 push, device token registration |
| #46 | feat(ios+backend): finish MVP-A | Background push, sad animation, bank status UI |
| #47 | feat(auth): Apple Sign In + multi-user data model | users/sessions tables, auth API, AES-256-GCM, 56 tests |
| #48 | feat(ios): Apple Sign In + Keychain session token | SignInView, Keychain.swift, three-state app flow |

No open PRs. `main` is clean.

---

## Sensitive Data Audit

| Data | Where stored | Protection |
|---|---|---|
| Plaid `access_token` | Neon Postgres `plaid_items.access_token` | AES-256-GCM, key in Fly secrets |
| Session token (raw) | iOS Keychain only | `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` |
| Session token (hash) | Neon Postgres `sessions.token_hash` | SHA-256, one-way |
| Apple `sub` | Neon Postgres `users.apple_sub` | Pseudonymous opaque ID |
| User email | Neon Postgres `users.email` | Optional; user can withhold |
| APNs device token | Neon Postgres `device_tokens.token` | Rotating; revocable |
| Transaction data | Neon Postgres `transactions` | Scoped by `user_id`; pseudonymous IDs in logs |
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
Requirements we already meet: HMAC signature verification, HTTPS, sandbox isolation.

Remaining gaps before applying:
- Privacy policy (URL required in application)
- Incident response plan
- `DELETE /api/account` (right-to-delete = GLBA/CCPA)
- Encryption at rest for all PII fields (access_token done; `reaction.reason` not yet)

---

## Local Dev Startup

```bash
# Two terminals

# Terminal 1 — backend (loads secrets from Keychain)
cd /Users/antoinewiley/Tamogatchi
source bin/load-secrets.sh && pnpm --filter coiny-backend dev

# Terminal 2 — tests
pnpm --filter coiny-backend test
```

**Keychain secrets in use:**
```
coiny-plaid-client-id        ✅ stored
coiny-plaid-sandbox-secret   ✅ stored
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

> Read `docs/handoff.md`. All PRs are merged to main as of 2026-05-21. Antoine
> still needs to do the 4 blocking steps (Fly secret, DEVELOPMENT_TEAM, Sign In
> with Apple capability, xcodegen generate) before the app runs on device. The
> next code sprint is security gap closure: `DELETE /api/account`, per-user rate
> limiting, encrypt `reaction_history.reaction` field, `POST /api/debug/react`
> debug endpoint, and the incident response plan + privacy policy docs needed for
> Plaid production approval. Start with the backend endpoints, one PR each.

### Key commands

```bash
# Run all 56 backend tests
pnpm --filter coiny-backend test

# Regenerate Xcode project after ios/project.yml changes
cd ios && xcodegen generate

# Deploy to Fly
fly deploy -a coiny-backend --dockerfile backend/Dockerfile

# Check Fly logs
fly logs -a coiny-backend
```
