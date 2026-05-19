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
- [ ] Set up MQTT broker (HiveMQ Cloud free tier to start)
- [ ] Publish reaction command to MQTT when a rule fires
- [ ] Build software device simulator — terminal script that subscribes to MQTT
      and logs reactions (acts as a fake device)

**End state**: trigger a fake bank transaction in Teller sandbox, watch a reaction
appear in the terminal. Full pipeline proven, no hardware required.

---

## Phase 2 — Firmware + Hardware Prototype
**Timeline: Weeks 3–6**
**Goal: replace the terminal simulator with a real device.**

- [ ] Order M5Stack CoreS3 (~$35–50)
- [ ] Write firmware: WiFi connect, MQTT subscribe, receive command payload
- [ ] Display happy/sad face on LCD based on command
- [ ] Add LED ring color changes (green/amber/red)
- [ ] Test end-to-end: Teller sandbox → backend → MQTT → device reacts

**End state**: physical device reacting to fake bank transactions.

---

## Phase 3 — Mobile App
**Timeline: Weeks 5–8 (parallel with Phase 2)**
**Goal: replace hardcoded goals with user configuration.**

- [ ] Initialize Expo project
- [ ] Build onboarding flow + Teller Connect bank linking
- [ ] Build goal/budget configuration screens
- [ ] Connect to backend API (save goals, fetch pet status)
- [ ] Push notifications as supplement to device reactions

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

- [ ] OTA firmware update pipeline
- [ ] Sound effects + servo movement
- [ ] Growth stages + health score system
- [ ] 2–3 pet types
- [ ] Recruit 5–10 beta users

---

## Who Does What

| qiaomein | Antoine |
|---|---|
| Backend + Teller integration | Mobile app |
| Rule engine | Onboarding UX |
| MQTT broker setup | Goal configuration screens |
| Device simulator | Push notifications |
| Firmware (Phase 2) | Hardware testing |

---

## Immediate Next Step

**Phase 1, Step 1**: Initialize the backend.
- `package.json`, TypeScript config, Fastify setup
- Teller sandbox account (free, instant at teller.io)
- First endpoint: receive a Teller webhook
