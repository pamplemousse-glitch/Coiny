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

## What Has NOT Been Done

- ❌ Apple Developer Program not yet signed up ($99/year, needed Phase 3)
- ❌ Expo project not initialized (partial work possible pre-hardware — see below)
- ❌ Firmware project not initialized (needs hardware)
- ❌ Teller production access not applied for
- ❌ GLBA compliance work not started
- ❌ Backend: webhook idempotency (dedup on payload.id)
- ❌ Backend: health score calculator (rolling 30-day)
- ❌ Backend: /api/pets and /api/spending endpoints (needed by mobile in Phase 3)

## Pre-Hardware Work (can start now)

These can be built and tested before the M5StickS3 arrives:

### Backend
1. **Webhook idempotency** — in-memory Set dedup on `payload.id`; prevents double-reactions on Teller retries
2. **Health score calculator** — rolling 30-day financial health score (in architecture.md)
3. **REST API** — `/api/pets` (pet state, goals, history) and `/api/spending` (transaction feed)

### Mobile (Expo)
4. **Project init** — Expo + React Native scaffold, navigation skeleton
5. **Goal config screens** — budget categories, savings targets (testable in iOS Simulator)
6. **Pet status view** — health score, recent reactions
7. **Teller Connect OAuth flow** — bank linking (testable in iOS Simulator, no BLE needed)
8. **Push notification subscription** — Expo Push token registration

### Not buildable pre-hardware
- BLE scanning/pairing
- BLE relay (push notification → BLE command to device)
- iOS background BLE validation (the #1 architectural risk)

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

- **GLBA**: applies because we read bank data. Written security program +
  privacy notice required. Engage fintech attorney ($15–30K) before real users.
- **FCC**: pre-certified ESP32-S3 module covers prototype. Custom PCB needs DoC.
- **Teller ToS**: cannot resell or share transaction data.
- **App Store**: financial app requires extra Apple review + privacy policy.
- **CCPA / GDPR**: applies if any users in CA / EU.

Full per-phase security checklist in `docs/security.md`.

---

## Resuming Work

Start a fresh Claude Code session in `/Users/antoinewiley/Tamogatchi` and say:

> Read `docs/handoff.md`, `docs/architecture.md`, `docs/security.md`,
> `docs/sprint-plan.md`, and `docs/mqtt-topics.md`.
> Phase 1 is complete. Continue pre-hardware work per the "Pre-Hardware Work"
> section of handoff.md.

### Local dev startup (two terminals)
```bash
# Terminal 1 — tunnel
hookdeck listen 3000 teller-webhooks --path /webhooks/teller

# Terminal 2 — backend
cd /Users/antoinewiley/Tamogatchi
source bin/load-secrets.sh && pnpm --filter coiny-backend dev
```
