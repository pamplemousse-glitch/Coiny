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

## What Has NOT Been Done

- ❌ No backend code written yet (Phase 1 begins fresh from here)
- ❌ Hardware not yet ordered (on hold per Antoine's call)
- ❌ Teller signing secret not generated (no webhook configured yet — Phase 1 wires this up)
- ❌ Apple Developer Program not yet signed up ($99/year, needed Phase 3)
- ❌ Expo project not initialized
- ❌ Firmware project not initialized
- ❌ Teller production access not applied for
- ❌ GLBA compliance work not started

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
coiny-teller-signing-secret        ⏳ create when webhook URL is set
coiny-teller-sandbox-token         optional (regenerable from dashboard)
```

**Read with:**
```bash
security find-generic-password -a "$USER" -s "coiny-teller-application-id" -w
```

**Production**: secrets move to Railway/AWS Secrets Manager. Same env var
contract; only the loader changes.

---

## Hardware Plan (1 unit MVP, paused on ordering)

| Source | Item | Cost |
|---|---|---|
| Amazon Prime | Adafruit DRV2605L (PID 2305) | ~$8 |
| Amazon Prime | SparkFun Qwiic-to-Grove cable | ~$3 |
| Amazon Prime | 10× pack 10mm coin vibration motor 3V | ~$8 |
| Amazon Prime | Anker PowerLine III USB-C data cable | ~$10 |
| DigiKey / M5Stack | M5StickS3 | ~$22 |
| **Total** | | **~$60** |

Soldering required: 1 joint (motor leads → DRV2605L pads). Antoine has an iron.

WS2812B LED removed from list — M5StickS3's LCD covers mood color via background.
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

- MVP cost: ~$60 hardware + $99/year Apple Developer = ~$160
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

> Read `docs/handoff.md`, `docs/phase1-spec.md`, `docs/architecture.md`,
> `docs/security.md`, `docs/sprint-plan.md`, and `docs/mqtt-topics.md`.
> Then scaffold Phase 1 per the spec.

That's the entire context transfer.
