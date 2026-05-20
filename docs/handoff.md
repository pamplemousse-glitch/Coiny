# Coiny — Project Handoff

Read this first. Then read `docs/phase1-spec.md` if starting Phase 1.

---

## What Is Coiny

A portable Tamagotchi-like carry device linked to the user's bank account
via Teller. The device reacts in real time to financial behavior —
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
├── firmware/          # ESP32-S3 C++ (PlatformIO) — empty scaffolding
├── backend/           # Node.js / TypeScript (Fastify) — empty scaffolding
├── mobile/            # React Native / Expo — empty scaffolding
├── shared/            # BLE schemas, pet model types — empty scaffolding
├── hardware/
│   └── case/          # OpenSCAD designs (coin_v1.scad + renders)
├── bin/               # Helper scripts (load-secrets.sh, etc.)
└── docs/
    ├── architecture.md      System design, BLE flow, hardware spec
    ├── development-plan.md  Phased roadmap, decisions, hardware list
    ├── sprint-plan.md       7-day MVP sprint plan
    ├── phase1-spec.md       Phase 1 deliverables (read before starting)
    ├── mqtt-topics.md       BLE command schema, event mappings
    ├── security.md          Threat model + per-phase security checklist
    ├── ota-process.md       (empty)
    └── handoff.md           This file
```

---

## Architecture in One Picture

```
Bank Transaction
      ↓
Teller webhook  ─── mTLS ────► Backend (Fastify / TS)
      ↓
Rule engine evaluates vs user goals
      ↓
Push notification → Companion app (Expo)
      ↓
App relays BLE command to Coiny in pocket
      ↓
Device: animated face + LED + vibration + sound
```

Device is BLE-only. Phone is the internet bridge → 2–3 day battery target.

---

## Key Decisions (Made)

| Decision | Choice | Reason |
|---|---|---|
| Device connectivity | **BLE** | 2–3 day battery vs 12–16 hr for WiFi |
| Bank API | **Teller** (mTLS) | Near real-time for major US banks; daily SLA worst case |
| Investments (deferred) | **Plaid Investments** | Teller's investment coverage is narrow |
| Prototype hardware | **M5StickS3** (~$22) | All-in-one ESP32-S3 dev board with speaker + mic + battery |
| Haptics (prototype) | **Adafruit DRV2605L + 10mm coin motor** | 123 named haptic patterns, no breadboard |
| Display (prototype) | M5StickS3's built-in 1.14" color LCD | Built into the board |
| Backend | **Node 22 + Fastify + TypeScript + Zod** | Fast, type-safe, lean |
| Mobile | **React Native + Expo** | Single codebase iOS + Android |
| Monorepo | **pnpm workspaces + Turborepo** | Already configured |
| Local secrets | **macOS Keychain** via `security` CLI | Encrypted at rest, no plaintext `.env` |

---

## Key Decisions (Open)

| Decision | Status |
|---|---|
| iOS background BLE reliability | Must validate in Phase 3 |
| Form factor (coin / chip / rectangle) | Deferred to v2 ID phase; driven by battery measurements |
| v2 chip (ESP32-S3 vs Nordic nRF52840) | Decide post-MVP, after measuring power |
| Pet personality & sound design | TBD |
| Pricing model | Tentative: $79 hardware + $3.99/month |

---

## What Has Been Done

- ✅ Repo created (private GitHub, pamplemousse-glitch/Coiny)
- ✅ All docs written (architecture, development plan, sprint plan, security, BLE schema)
- ✅ Teller sandbox account created
- ✅ Teller mTLS cert + private key downloaded to `~/Documents/coiny-secrets/teller-sandbox/`, `chmod 600`
- ✅ Sandbox API call verified end-to-end (cert auth works, returned fake Chase accounts)
- ✅ Teller Application ID stored in macOS Keychain under `coiny-teller-application-id`
- ✅ Sandbox Teller Connect enrollment created (fake Chase, 3 accounts)
- ✅ Node 22, pnpm 11.1.3 installed
- ✅ OpenSCAD 2026.04.26 installed; first coin-case sketch at `hardware/case/coin_v1.scad`
- ✅ Form factor explicitly deferred to v2 design phase

## What Has Been Done (cont.)

- ✅ All MVP hardware ordered — see Hardware Plan section below for vendor + ETA
- ✅ USB-C data cable already owned (Anker 240W / 40 Gbps — overkill but works)
- ✅ Branch-guard hook installed: `git commit` on main is blocked. Use feature branches.
- ✅ `CLAUDE.md` written with project conventions (auto-loaded each session)

## What Has Been Done (Phase 1 — complete as of 2026-05-19)

- ✅ Phase 1 backend fully shipped and merged to main (PR #2)
  - Fastify server, pino logging, rate limiting
  - Teller mTLS client (undici Agent, cert+key at startup)
  - Webhook handler with HMAC-SHA256 signature verification + replay protection
  - Rule engine: 5 rules (paycheck, overspend, savings milestone, bill paid, large purchase)
  - Terminal reaction dispatcher (Phase 1 stub)
  - `pnpm sim` CLI for all 5 events
  - 20 Vitest tests, all passing
- ✅ Teller signing secret generated and stored in Keychain (`coiny-teller-signing-secret`)
- ✅ Webhook registered in Teller dashboard — real sandbox events now fire through pipeline
- ✅ Hookdeck CLI tunnel set up (stable URL: `https://hkdk.events/3yv62dpjlcg6bo`)
  - Forwards `transactions.processed` + `enrollment.disconnected` to local backend
- ✅ Security review + simplify pass completed on Phase 1 code
- ✅ Production guard: `TELLER_SIGNING_SECRET` required at startup when `NODE_ENV=production`

## What Has Been Done (Pre-hardware backend — complete as of 2026-05-19, PR #5)

- ✅ **Webhook idempotency** — `store/events.ts` deduplicates on `payload.id` with LRU eviction
  at 10 000 entries; duplicate payloads log a warning and are skipped
- ✅ **In-memory pet state store** — `store/pet.ts` holds healthScore (0–100), mood, goals,
  and a 50-entry reaction history ring buffer; exposes typed mutations
- ✅ **Health score** — `health/score.ts` applies per-event deltas (+10 paycheck, +5 bill paid,
  +15 savings milestone, −10 overspent, −5 large purchase); clamped to [0, 100]
- ✅ **Live goal binding** — `rules/definitions.ts` reads goals from the store at evaluation time;
  `PUT /api/pets/goals` immediately changes thresholds for all 5 rules
- ✅ **REST API** — two new route modules:
  - `GET /api/pets` — returns full pet state (healthScore, mood, lastReactionAt, goals, reactionHistory)
  - `PUT /api/pets/goals` — Zod-validated patch (weeklyBudgetByCategory, savingsGoal,
    paycheckMinAmount, largePurchaseThreshold)
  - `GET /api/spending` — reaction history with extracted dollar amounts
- ✅ **Test suite** — 24 Vitest tests, all passing; server auto-start guarded by `import.meta.url`
  so test imports no longer trigger `process.exit(1)`

## What Has NOT Been Done

- ❌ Apple Developer Program ($99/yr) — needed before TestFlight (Phase 3)
- ❌ Firmware project not initialized (limited utility without hardware)
- ❌ Teller production access — apply when sandbox is proven end-to-end
- ❌ GLBA compliance — sandbox stage needs nothing; see `docs/security.md` cost ladder
- ❌ LLC formation — recommended before TestFlight / Teller production (see `docs/security.md`)

## Pre-Hardware Work Status

### Done ✅

**Backend** (PRs #2, #5)
- Phase 1: Fastify server, Teller mTLS, signed webhooks, rule engine, terminal dispatcher, 24 Vitest tests
- Webhook idempotency, health score, REST API (`GET /api/pets`, `PUT /api/pets/goals`, `GET /api/spending`)
- Hookdeck tunnel + webhook registered in Teller dashboard

**Mobile** (PR #7)
- Expo SDK 54 + expo-router scaffold, TypeScript strict, monorepo Metro config
- Pet tab (health, mood, recent reactions), Activity tab, Settings hub
- Goal config screens (wired to `PUT /api/pets/goals`)
- Teller Connect via `react-native-webview` (institution name only — enrollment not yet POSTed to backend)
- Expo push token registration UI (token not yet POSTed to backend)

### Not buildable pre-hardware
- BLE scanning / pairing
- BLE relay (push → BLE command to device)
- iOS background BLE validation (#1 architectural risk)
- Production firmware testing
- Battery measurement
- DRV2605L + motor soldering

### Pre-Hardware Backlog — actionable tickets

A fresh Claude Code session should execute these top-to-bottom. Each item is sized to fit in a single session. **C** = Claude can do it; **A** = needs Antoine; **C+A** = Claude scaffolds, Antoine provides account/asset.

#### Tier 1 — Unblockers (do first)

- [ ] **T1.1  Backend hosting on Fly.io or Railway** (C+A · 2–4 h)
      Deploys backend so the mobile app can reach it from a physical device.
      New: `backend/Dockerfile`, `backend/fly.toml`. Secrets via Fly secrets (Keychain → Fly). Antoine creates account + provides API token.
- [ ] **T1.2  GitHub Actions CI** (C · 1 h)
      `.github/workflows/ci.yml` — Node 22, pnpm 11.1.3 — runs `pnpm --filter coiny-backend test`, `pnpm --filter coiny-mobile typecheck`, `pnpm --filter coiny-mobile lint` on every PR.
- [ ] **T1.3  Sentry error tracking** (C+A · 2 h)
      Free tier. `backend/src/plugins/sentry.ts`, `mobile/services/sentry.ts`. Antoine creates Sentry org + provides DSN as env var.
- [ ] **T1.4  LLC formation (Wyoming, ~$200)** (A · 90 min)
      Northwest Registered Agent. Then EIN (IRS, free), Mercury account (free), BOI report to FinCEN. Unblocks Apple Developer Org account and Teller production.

#### Tier 2 — Backend feature work (highest leverage)

- [ ] **T2.1  Persistent storage (Postgres on Supabase or Neon)** (C+A · 1–2 d)
      Replaces `store/pet.ts`, `store/events.ts` with Postgres. Migrations in `backend/migrations/`. Pick `pg` or `drizzle-orm`. Antoine creates Supabase/Neon project + provides connection string.
- [ ] **T2.2  Multi-user accounts** (C · 2–3 d)
      `users` table; all API routes derive `userId` from auth. Auth: magic-link email via Resend/Postmark, or Apple/Google sign-in via Expo. Depends on T2.1.
- [ ] **T2.3  Push pipeline backend → APNs/FCM via Expo Push API** (C · 4–6 h)
      New: `services/push.ts`. Wire into `reactions/dispatch.ts`. Depends on T2.1, T2.5.
- [ ] **T2.4  `POST /api/banks/connect`** (C · 4–6 h)
      Receives Teller enrollment from mobile, stores `(user_id, encrypted_access_token, enrollment_id, institution_name)`. Encrypt access token with env-supplied key. Depends on T2.1, T2.2.
- [ ] **T2.5  `POST /api/devices/push-token`** (C · 2–3 h)
      Receives Expo push token, stores `(user_id, token, platform, last_seen)`. Depends on T2.1, T2.2.
- [ ] **T2.6  Subscription detection** (C · 1–2 d)
      New: `subscriptions/detector.ts` (group by merchant + amount, infer cadence from gaps). New: `store/transactions.ts` (bounded ring buffer, 90-day window). New rule `new_subscription_detected` fires on 3rd matching charge. Update privacy-policy retention disclosure (see `docs/security.md`).
- [ ] **T2.7  Mood / health decay over time** (C · 2–3 h)
      Cron tick decrements `healthScore` by N per day if no recent reactions. Pet gets sad if ignored. Add to test suite.
- [ ] **T2.8  Categorization override layer** (C · 3–4 h)
      `rules/categorize.ts` — regex on `counterparty.name` → canonical category. Fixes Teller miscategorizations (Uber Eats → food_and_drink, not transportation).
- [ ] **T2.9  More rules** (C · 4–6 h total)
      Weekend spending, time-of-day rules, payday streak, subscription price bump. One PR per 1–2 rules to keep them reviewable.
- [ ] **T2.10  Test suite expansion** (C · 4–6 h)
      Target 50+ tests (currently 24). Cover the new rules, store, subscription detector.

#### Tier 3 — Mobile integration (most depend on Tier 2)

- [ ] **T3.1  Wire link-bank → `POST /api/banks/connect`** (C · 1–2 h) · depends T2.4
- [ ] **T3.2  Wire push registration → `POST /api/devices/push-token`** (C · 1 h) · depends T2.5
- [ ] **T3.3  Onboarding flow** (C · 4–6 h) · depends T3.1, T3.2
      `app/onboarding/` multi-step: welcome → goals → bank link → push opt-in. First-run gate via AsyncStorage.
- [ ] **T3.4  Account signup / login UI** (C · 4–6 h) · depends T2.2
- [ ] **T3.5  Manual transaction entry** (C · 4–6 h)
      For cash. Mobile form → `POST /api/transactions`. Flows into the same rule engine.
- [ ] **T3.6  Dark-mode QA + state polish** (C · 2–4 h)
      Loading shimmers, empty states, error toasts.
- [ ] **T3.7  E2E tests with Maestro on iOS Simulator** (C · 4–6 h)
      `mobile/.maestro/` flow files covering onboarding, goals edit, link-bank happy path.

#### Tier 4 — Design / content (Antoine, parallelizable)

- [ ] **T4.1  App icon + splash design** (A) — replace default Expo art in `mobile/assets/images/`
- [ ] **T4.2  Pet animation frames** (A) — 6 mood faces × N frames each (PNG sequence or sprite sheet)
- [ ] **T4.3  Sound design** (A) — `.wav` files for chime / fanfare / warning / coin
- [ ] **T4.4  Brand** (A) — logo, name lockup, color palette
- [ ] **T4.5  Pet personality bible** (A) — `docs/personality.md`, voice + tone for reactions

#### Tier 5 — Business / launch prep (mostly Antoine)

- [ ] **T5.1  LLC formation** (A) — see T1.4 (listed in both tiers because it unblocks downstream items)
- [ ] **T5.2  Domain** (A) — `coiny.app` or `.io`
- [ ] **T5.3  Landing page + email waitlist** (C+A) — Framer or static HTML on Vercel; Claude can scaffold
- [ ] **T5.4  Termly privacy policy + ToS** (A) — free tier; needs domain + LLC name
- [ ] **T5.5  Apple Developer Program** (A · $99/yr) — Organization account after LLC + DUNS
- [ ] **T5.6  Public roadmap on Canny** (A) — free tier

#### Tier 6 — DevOps polish

- [ ] **T6.1  Renovate or Dependabot** (C · 1 h) — `renovate.json` or `.github/dependabot.yml`
- [ ] **T6.2  Backup + restore plan** (C · 2 h doc) — document Supabase/Neon restore procedure · depends T2.1

#### Tier 7 — Firmware scaffolding (no flashing yet — useful prep for hardware day)

- [ ] **T7.1  PlatformIO project structure** (C · 2–3 h) — `firmware/platformio.ini`, `firmware/src/main.cpp` for ESP32-S3 / M5StickS3
- [ ] **T7.2  BLE command serialization / schema code** (C · 3–4 h) — matches `docs/mqtt-topics.md`

#### Tier 8 — Hardware case iteration

- [ ] **T8.1  OpenSCAD case iteration** (C+A) — Claude can edit `hardware/case/coin_v1.scad` via OpenSCAD MCP; Antoine prints
- [ ] **T8.2  3D print test shells** (A)

### Execution order recommendation

Fresh Claude session, optimizing for leverage:

1. **T1.2 CI** (1 h) — fail-fast for everything below
2. **T1.1 Hosting** (3 h) — backend reachable from real device
3. **T2.1 Postgres** (1–2 d) — state survives restart
4. **T2.6 Subscription detection** (1–2 d) — highest-value new feature
5. **T2.7 Mood decay** (3 h) — gives the pet life
6. **T2.8 Categorization** (4 h) — existing rules become accurate
7. **T6.1 Dependabot** (1 h) — set and forget
8. **T7.1 + T7.2 Firmware scaffolding** (6 h) — ready for hardware day

Then the **"ready for friends" track** (~1–2 weeks): T2.2 → T2.3 → T2.4 → T2.5 → T3.1 → T3.2 → T3.3.

Antoine attacks Tier 4 + Tier 5 in parallel.

---

## Local Secrets Convention

**Cert + private key (files):**
```
~/Documents/coiny-secrets/teller-sandbox/certificate.pem   (chmod 600)
~/Documents/coiny-secrets/teller-sandbox/private_key.pem   (chmod 600)
```
These are outside the repo so they can never be accidentally committed.

**Other secrets (macOS Keychain via `security` CLI):**
```
coiny-teller-application-id        ✅ stored
coiny-teller-signing-secret        ✅ stored (webhook registered 2026-05-19)
coiny-teller-sandbox-token         optional (regenerable from dashboard)
```

**Read with:**
```bash
security find-generic-password -a "$USER" -s "coiny-teller-application-id" -w
```

**Production**: secrets move to Railway/AWS Secrets Manager. Same env var
contract; only the loader changes.

---

## Hardware (1 unit MVP — all ordered as of 2026-05-19)

| Source | Item | Cost | Status | ETA |
|---|---|---|---|---|
| MTools Tec | M5StickS3 (K150) | $36.59 (incl. ship + tax) | ✅ Ordered | 5–10 business days |
| DigiKey | Adafruit DRV2605L (1528-1346-ND / PID 2305) | $7.95 + ship | ✅ Ordered | 2–3 business days |
| Amazon | SparkFun Qwiic-to-Grove cable (100mm) | $7.95 + $5.97 ship | ✅ Ordered | by 2026-05-26 |
| Amazon | uxcell 10× 10mm coin vibration motor 3V pack | $8.99 | ✅ Ordered | by 2026-05-24 |
| (already owned) | Anker USB-C to USB-C cable (240W / 40 Gbps data) | $0 | ✅ Own | — |
| **Total spend** | | **~$75** | | |

**Procurement notes (for v2 reference):**
- M5StickS3 supply is tight as of May 2026 (4 months post-launch). M5Stack
  direct + DigiKey + Mouser + Amazon all out at order time. MTools Tec (US-based
  M5Stack reseller, Texas) had 9 units in stock at $24.99 + shipping. Backup:
  eBay's Official M5Stack listing.
- DRV2605L: Adafruit direct + Amazon listing both out at order time. DigiKey
  had 982 units in stock at $7.95 — best single source for the breakout.
- Grove-to-STEMMA-QT cable: Adafruit (PID 4528) out; SparkFun PRT-15109 on
  Amazon is the functional equivalent (Qwiic = STEMMA QT physically).
- USB-C cable: any data-capable USB-C-to-USB-C cable works. Charge-only cables
  silently fail to flash firmware. Cables rated for USB 2.0+ or any data
  spec are safe. Avoid "charging only" listings.

Soldering required: 1 joint (motor leads → DRV2605L pads). Antoine has iron + solder.

WS2812B LED removed — M5StickS3's LCD covers mood color via background.
Breadboard + jumper wires removed — Grove + STEMMA QT is solderless via cable.

---

## Development Phases (Sprint Plan = 7 Days)

See `docs/sprint-plan.md` for day-by-day. Realistic with breakage tax: 9–10 days.

| Phase | Goal | Days | Needs hardware? |
|---|---|---|---|
| 1 | Backend + Teller sandbox + terminal simulator | 1–2 | No |
| 2 | Firmware on M5StickS3 | 3–4 | Yes |
| 3 | Expo app (BLE pair, Teller Connect, push relay, iOS bg BLE) | 5–6 | Yes (phone) |
| 4 | Full integration end-to-end | 7 | Yes |
| 5 | Real Teller production, custom PCB, beta | Weeks 10–14 | Yes |

**Phase 1 doesn't need hardware.** It can start immediately while hardware ships.

---

## Economics (Reference)

- MVP cost: ~$75 hardware (actual) + $99/year Apple Developer = ~$175
- Production BOM at 1K units: ~$20
- Retail target: $59–$79 hardware + $3.99/month
- Per-user/month cost: $0.30 (Teller only) to $4 (Teller + Plaid Investments)
- Bank-data APIs dominate opex; subscription is structurally required

---

## Legal (Reference)

- **GLBA**: applies because we read bank data. Realistic cost path is the
  indie minimum (LLC + generated privacy policy + this-doc-as-WISP) for
  sandbox/closed-beta, ~$2–8K for public launch (lawyer review + cyber
  liability insurance). The $15–30K "fintech attorney" figure is the all-in
  upfront program — only needed when raising or scaling past 5,000 users.
  Full phase-by-phase cost ladder + indie precedents in `docs/security.md`
  ("Compliance Posture & Realistic Cost Path").
- **FCC**: pre-certified ESP32-S3 module covers prototype. Custom PCB needs DoC.
- **Teller ToS**: cannot resell or share transaction data.
- **App Store**: Apple guideline 3.2.1(viii) carves out apps using a public
  API of the financial institution (Teller qualifies). Reviewers treat Coiny
  closer to a quantified-self app than a banking app, provided privacy policy
  URL + App Privacy nutrition label match reality.
- **CCPA / GDPR**: applies if any users in CA / EU.
- **Aggregator landscape + pricing** (Teller / Plaid / MX / Yodlee / Finicity):
  see `docs/aggregators.md`. Coiny's plan is Teller-only through Phase 4,
  add Plaid Investments in Phase 5.

---

## Resuming Work

Start a fresh Claude Code session in `/Users/antoinewiley/Tamogatchi` and say:

> Read `docs/handoff.md`, `docs/architecture.md`, `docs/security.md`,
> `docs/aggregators.md`, `docs/sprint-plan.md`, and `docs/mqtt-topics.md`.
> Phase 1 + the pre-hardware mobile work are complete (PRs #2, #5, #7).
> Execute the "Pre-Hardware Backlog" in `docs/handoff.md` top-to-bottom,
> starting with T1.2 (CI). Open one PR per ticket; squash-merge after the
> simplify skill passes. Ask before touching items marked **A** (Antoine).

### Local dev startup (two terminals)
```bash
# Terminal 1 — tunnel
hookdeck listen 3000 teller-webhooks --path /webhooks/teller

# Terminal 2 — backend
cd /Users/antoinewiley/Tamogatchi
source bin/load-secrets.sh && pnpm --filter coiny-backend dev
```
