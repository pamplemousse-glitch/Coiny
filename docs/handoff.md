# Coiny — Project Handoff Document

## What Is Coiny

A portable Tamagotchi-like carry device (~50mm, <25g) linked to the user's bank account
via Teller API. The device reacts in real time to financial behavior — animated face,
RGB LED color, vibration, and sound effects — when the user does things aligned or
misaligned with their personal finance goals.

---

## Repository

- **URL**: https://github.com/pamplemousse-glitch/Coiny (private)
- **Owner**: pamplemousse-glitch (Antoine)
- **Collaborator**: qiaomein (write access, invitation sent)
- **Local path**: `/Users/antoinewiley/Tamogatchi`

---

## Current Repo Structure

```
Coiny/
├── firmware/          # ESP32-S3 C++ (PlatformIO) — empty scaffolding
├── backend/           # Node.js/TypeScript (Fastify) — empty scaffolding
├── mobile/            # React Native (Expo) — empty scaffolding
├── shared/            # MQTT/BLE schemas, pet model types — empty scaffolding
├── hardware/          # Schematics, PCB Gerbers, STL files — empty scaffolding
└── docs/
    ├── architecture.md       — full system design, BLE flow, hardware spec
    ├── development-plan.md   — phased roadmap, component list, open questions
    ├── mqtt-topics.md        — BLE command schema, financial event mappings
    ├── ota-process.md        — empty, to be written
    └── handoff.md            — this file
```

---

## Key Architectural Decisions (Made)

| Decision | Choice | Reason |
|---|---|---|
| Device connectivity | **BLE** (not WiFi) | 2–3 day battery vs 12–16hr; phone always nearby |
| Bank API | **Teller** | Near real-time (seconds) for major US banks |
| Prototype hardware | **M5StickS3** (~$21) | Has speaker + mic built in; 48×24×15mm; 20g |
| Backend framework | **Node.js + Fastify** | TypeScript-first, fast, built-in schema validation |
| Mobile framework | **React Native + Expo** | Single codebase iOS + Android |
| Monorepo tooling | **pnpm workspaces + Turborepo** | Shared BLE schema types across firmware/backend/mobile |
| Form factor | **Portable carry device** | Pocketable alongside phone, not desktop |
| Display (prototype) | **Color LCD** (built into M5StickS3) | Fast animation, built-in |
| Display (v2) | **Color OLED** | True black = lower power, more vivid |
| Haptics (prototype) | **Coin vibration motor** ($1) | Basic buzz, direct GPIO |
| Haptics (v2) | **DRV2605L driver IC** | Named waveform patterns, premium feel |

---

## Key Architectural Decisions (Open)

See `docs/development-plan.md` — Open Architectural Decisions section for full detail.

| Decision | Options | Status |
|---|---|---|
| iOS background BLE | Core Bluetooth background mode vs WiFi hybrid | Must validate in Phase 3 week 1 |
| Bank API fallback | Teller only vs Teller + Plaid | Defer to beta feedback |
| Button layout | 2 front + 1 side (proposed) | Not finalized |
| Form factor shape | Egg vs coin (round) vs stick | Not finalized |
| Pet personality/sound design | TBD | Not started |

---

## Prototype Component List (~$38 total)

| Component | Purpose | Cost |
|---|---|---|
| M5StickS3 | Main board (display, speaker, mic, BLE, battery) | ~$21 |
| Coin vibration motor (10mm) | Haptic feedback | ~$1 |
| WS2812B RGB LED (single) | Mood color indicator | ~$0.50 |
| 2N2222 transistor | GPIO motor driver | ~$0.10 |
| 100Ω resistor | LED data line protection | ~$0.05 |
| Half-size breadboard | Prototyping | ~$3 |
| Jumper wire kit | Connections | ~$5 |

**Order from Amazon Prime** (1–2 day delivery to Edinburg, TX).
Search "M5StickS3" — available on Amazon with Prime.
Soldering iron (~$20) needed to attach motor + LED directly to GPIO pins (no breadboard
in final carry prototype).

---

## Development Phases

| Phase | Goal | Timeline |
|---|---|---|
| 1 | Backend + Teller sandbox integration + terminal simulator | Weeks 1–3 |
| 2 | Firmware + hardware prototype (M5StickS3) | Weeks 3–6 |
| 3 | Mobile app + BLE relay (parallel with Phase 2) | Weeks 5–8 |
| 4 | Real bank data (Teller production) | Week 8+ |
| 5 | Polish, custom PCB, beta users | Weeks 10–14 |

**Immediate next step**: Initialize the backend — `package.json`, TypeScript config,
Fastify setup, Teller sandbox account at teller.io.

---

## Team Split

| qiaomein | Antoine |
|---|---|
| Backend + Teller integration | Mobile app (React Native/Expo) |
| Rule engine | Onboarding + BLE pairing UX |
| Push notification dispatch | Goal configuration screens |
| Device simulator | BLE relay + iOS background BLE validation |
| Firmware (Phase 2) | Hardware testing |

---

## Tools Installed on This Machine

| Tool | Purpose | Status |
|---|---|---|
| OpenSCAD 2026.04.26 | 3D enclosure CAD | Installed via Homebrew |
| OpenSCAD MCP server | Render 3D models in Claude Code | Configured in `~/.claude.json` |
| gh CLI | GitHub repo management | Installed, authenticated as pamplemousse-glitch |
| pnpm | Package manager | Available |
| uv | Python package manager (for MCP server) | Installed |

**OpenSCAD MCP**: Restart Claude Code to activate. Once active, Claude can write
OpenSCAD code and render PNG images of 3D models directly in the conversation.

---

## Design Tools (Not Yet Installed)

| Tool | Purpose | URL |
|---|---|---|
| Flux.ai | AI-assisted PCB schematic design | flux.ai |
| Wokwi | ESP32 circuit simulator (browser) | wokwi.com |
| Zoo.dev | Text-to-CAD AI for enclosure | zoo.dev |
| Fusion 360 | Enclosure refinement CAD | autodesk.com/fusion360 |

---

## Legal Concerns

- **GLBA**: Reading bank data puts Coiny in scope. Requires written security program,
  privacy notice, FTC breach notification. Budget $15–30K for fintech attorney.
  Do this before any real users connect bank accounts.
- **FCC**: Pre-certified ESP32-S3-MINI module covers prototype. Custom PCB needs
  Declaration of Conformity review.
- **Teller ToS**: Cannot resell or share transaction data. Read before building
  data-export features.
- **App Store**: Apple requires privacy policy and additional review for financial
  data apps. Research requirements before submitting.
- **CCPA/GDPR**: Applies if any users in California or EU.

---

## Data Flow (BLE Architecture)

```
Bank Transaction
      ↓
Teller webhook → Backend (Node.js/Fastify)
      ↓
Rule engine evaluates vs user goals
      ↓
Push notification → Companion app (Expo)
      ↓
App relays BLE command to Coiny in pocket
      ↓
Device: animated face + LED color + vibration + sound
```

---

## Battery Life Target

**12–16 hours** from a 600–800mAh flat LiPo (v2 custom PCB).
M5StickS3 prototype: ~6–8 hours with BLE modem sleep (polls every 60s).
BLE draws 5–10x less power than WiFi — key reason for BLE architecture choice.

---

## What Has NOT Been Started

- No code written anywhere (all files are empty scaffolding)
- No Teller sandbox account created
- No Expo project initialized
- No PCB design started
- No enclosure designed
- No sound/animation assets created
- GLBA compliance work not started
- Teller production access not applied for
