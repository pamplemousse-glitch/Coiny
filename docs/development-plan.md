# Coiny — Development Plan

## Core Principle: Validate Before You Build Hardware

The biggest risk is spending weeks on firmware only to find the bank → reaction pipeline
doesn't work. Build the backend first, simulate the device in software, prove the full
loop works — then add hardware.

---

## Phase 1 — Backend + Teller Integration
**Timeline: Weeks 1–3**
**Goal: prove transactions flow through to a reaction.**

- [ ] Initialize Node.js/TypeScript backend with Fastify
- [ ] Connect Teller sandbox (fake bank data, no real account needed)
- [ ] Build webhook receiver — Teller fires → transaction lands in system
- [ ] Build spending rule engine — categorize transaction, evaluate against goals
- [ ] Set up push notification dispatch (Expo Push → phone)
- [ ] Build software device simulator — terminal script that receives push events
      and logs reactions (acts as a fake device)

**End state**: trigger a fake bank transaction in Teller sandbox, watch a reaction
appear in the terminal. Full pipeline proven, no hardware required.

---

## Phase 2 — Firmware + Hardware Prototype
**Timeline: Weeks 3–6**
**Goal: replace the terminal simulator with a real device.**

- [ ] Order M5StickS3 (~$21) + coin vibration motor + WS2812B LED
- [ ] Write firmware: BLE server, advertise service, receive command characteristic
- [ ] Display happy/sad face on color TFT based on BLE command
- [ ] Trigger vibration motor on reaction
- [ ] Trigger WS2812B LED color on reaction
- [ ] Play sound effect via built-in speaker on reaction
- [ ] Test end-to-end: Teller sandbox → backend → push → app → BLE → device reacts

**End state**: physical device in pocket reacting to fake bank transactions via phone.

---

## Phase 3 — Mobile App
**Timeline: Weeks 5–8 (parallel with Phase 2)**
**Goal: connect the phone as the BLE bridge.**

- [ ] Initialize Expo project
- [ ] Build BLE scanning + device pairing flow (onboarding)
- [ ] Build Teller Connect bank linking flow
- [ ] Build goal/budget configuration screens
- [ ] Connect to backend API (save goals, fetch pet status)
- [ ] Implement BLE relay: push notification received → write command to device
- [ ] Background BLE relay (app relays even when not in foreground)

---

## Phase 4 — Connect Real Bank Data
**Timeline: Week 8+**
**Goal: use a real bank account.**

- [ ] Apply for Teller production access
- [ ] Test with a real account
- [ ] Tune rule engine against real transaction data
- [ ] Handle edge cases (failed connections, token expiry, merchant name quirks)

---

## Phase 5 — Polish + Beta
**Timeline: Weeks 10–14**

- [ ] OTA firmware update pipeline (WiFi, triggered from app)
- [ ] Growth stages + health score system
- [ ] 2–3 animation sets / pet personalities
- [ ] Upgrade display to color OLED for v2 PCB
- [ ] Custom PCB design (Flux.ai + freelancer)
- [ ] Recruit 5–10 beta users

---

## Who Does What

| qiaomein | Antoine |
|---|---|
| Backend + Teller integration | Mobile app |
| Rule engine | Onboarding + BLE pairing UX |
| Push notification dispatch | Goal configuration screens |
| Device simulator | BLE relay implementation |
| Firmware (Phase 2) | Hardware testing |

---

## Design & Prototyping Tools

### PCB / Schematic Design
- **Flux.ai** — AI-assisted browser-based PCB design. Describe components in plain
  language, AI helps generate schematic. Collaborative (both of you can work in browser).
  Best tool for the custom PCB phase.
- **EasyEDA Pro** — free, browser-based, directly integrated with JLCPCB for ordering.
  Good for first PCB if not using Flux. AI component search built in.
- **KiCad** — open-source, industry standard. Use for production-ready designs.
  Espressif publishes official KiCad libraries for all ESP32 modules.

### 3D Enclosure / Physical Product CAD
- **Zoo.dev** — text-to-CAD AI tool. Describe the enclosure shape in words, get a 3D
  model. Best for generating a first draft of the egg/coin shaped Coiny body.
- **Fusion 360** — industry standard for consumer product enclosures. Free for startups.
  Use to refine the Zoo.dev output and prepare STL files for 3D printing.
- **Onshape** — browser-based, fully collaborative. Both of you can design simultaneously.
  No AI features but strong mechanical CAD. Good alternative to Fusion 360.

### Circuit Simulation / Wiring Validation
- **Wokwi** — simulate ESP32 + components (displays, LEDs, motors) in the browser.
  Run actual firmware code against a virtual circuit before touching real hardware.
  Free. Use this before wiring anything physically.
- **Fritzing** — visual wiring diagrams. Use to document how components connect for
  reference and handoff.

### Manufacturing
- **JLCPCB** — PCB fabrication + PCBA (they solder components for you). Ships from
  Shenzhen. Cheapest option for prototype quantities.
- **PCBWay** — alternative to JLCPCB. Slightly better quality, slower, offers a PCB
  design service (~$200–800 for layout if needed).

---

## Immediate Next Step

**Phase 1, Step 1**: Initialize the backend.
- `package.json`, TypeScript config, Fastify setup
- Teller sandbox account (free, instant at teller.io)
- First endpoint: receive a Teller webhook
