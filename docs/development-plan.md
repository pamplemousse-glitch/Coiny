# Coiny — Development Plan

## Core Principle: Validate Before You Build Hardware

The biggest risk is spending weeks on firmware only to find the bank → reaction pipeline
doesn't work. Build the backend first, simulate the device in software, prove the full
loop works — then add hardware.

---

## Open Architectural Decisions

These are either/or choices that will affect the entire build. Decide before Phase 2.

### 1. Device Connectivity: BLE-only vs. BLE + WiFi hybrid
**Option A — BLE only (current plan)**
Device talks only to phone over BLE. Phone relays commands from backend.
- Pro: 2–3 day battery life, simpler device firmware, no WiFi credentials on device
- Con: device is silent when phone is away or dead; iOS background BLE needs validation
- Risk: iOS `bluetooth-central` background mode must be tested early in Phase 3

**Option B — BLE + WiFi hybrid**
BLE for local interaction and status; WiFi for receiving reaction commands directly.
- Pro: device works independently of phone; more reliable command delivery
- Con: higher power draw (~12–16hr battery), more complex firmware, WiFi credentials on device

**Current recommendation**: Option A. Validate iOS background BLE in Phase 3 week 1.
If it fails reliably, switch to Option B before going further.

---

### 2. Bank API: Teller vs. Plaid
**Option A — Teller (current plan)**
Direct bank API connections. Near real-time (seconds to minutes) for major US banks.
Covers Chase, BoA, Wells Fargo, Citi, US Bank (~70% of US checking accounts).
- Pro: faster transaction data, better quality connections, simpler pricing
- Con: ~50 institutions only; users at credit unions or small banks get no connection

**Option B — Plaid**
Screen-scraping + bank APIs. Covers 12,000+ institutions but data syncs 1–4x per day.
- Pro: widest coverage, mature ecosystem, free sandbox
- Con: not real-time — Coiny reacts to yesterday's transactions, not today's

**Option C — Teller primary + Plaid fallback**
Teller for supported banks (real-time), Plaid for everything else (delayed).
- Pro: best of both worlds
- Con: two integrations to maintain

**Current recommendation**: Start with Teller only. Add Plaid fallback in v2 if
coverage complaints come in from beta users.

---

### 3. Display: Color OLED vs. Color LCD
**Option A — Color OLED (v2 plan)**
True black pixels = zero power when off. More vivid. Better for battery life.
- Pro: premium look, lower average power draw, true black backgrounds
- Con: more expensive (~$15–20 vs $5), OLED burn-in over years, fewer small modules available
- Specific module to evaluate: SSD1351 128×128 or SSD1306 for mono

**Option B — Color IPS LCD (prototype plan, M5StickS3 built-in)**
Constant backlight power regardless of content.
- Pro: cheap, widely available, fast refresh, M5StickS3 already has one
- Con: backlight always on = higher idle power

**Current recommendation**: LCD for prototype (it's built into M5StickS3).
OLED for v2 custom PCB.

---

### 4. Haptics: Basic coin motor vs. DRV2605L driver
**Option A — Basic coin vibration motor (prototype)**
Direct GPIO → motor. Feels like a phone buzz.
- Pro: $1, 2 wires, trivial to wire
- Con: imprecise, all reactions feel the same

**Option B — DRV2605L haptic driver IC (v2)**
Dedicated haptic driver with named waveform patterns (sharp tap, heartbeat, ramp).
- Pro: premium feel, distinct patterns per financial event, same approach as Apple Taptic Engine
- Con: requires I2C wiring, $2 IC, more firmware work

**Current recommendation**: Coin motor for prototype. DRV2605L on v2 custom PCB.

---

## Open Design Questions

These need answers before or during Phase 5. Not blockers for prototype.

### Hardware / Physical
- [ ] **Form factor**: explicitly deferred to v2 industrial design phase. MVP uses
      M5StickS3 rectangular dev board — final shape decision driven by battery
      measurements + ID exploration. Coin shape is brand-aligned but not locked;
      rectangular gives more display options and ~25% more battery capacity.
- [ ] **Exact dimensions**: target is ~50mm longest dimension, <20g
- [ ] **Button count and placement**: recommendation is 2 front + 1 side (3 total)
      but not finalized. What gestures should buttons trigger?
- [ ] **Color options at launch**: how many colorways?
- [ ] **Clip vs. lanyard**: how does user carry it? keychain loop? belt clip? loose in pocket?
- [ ] **Display model for v2**: which specific color OLED module? Need to evaluate
      SSD1351, GC9A01 (round), and SH8601 options.

### Software / Product
- [ ] **Offline behavior**: what does Coiny do when phone is away for hours?
      Options: sleep animation, slowly get "hungry", stay at last known state.
- [ ] **Pet personality**: what is Coiny's character? Cheeky? Calm? Anxious?
      This defines animation style, sound design, and copy in the app.
- [ ] **Health score formula**: exact algorithm for rolling 30-day financial health score.
      What weights different events? How fast does it recover after bad spending?
- [ ] **Growth stages**: how many? What triggers each? What visually changes?
- [ ] **Pet types at launch**: 1 or multiple? If multiple, do they behave differently
      or just look different?
- [ ] **Sound design**: who makes the audio files? What do they sound like?
      Retro 8-bit? Soft organic tones? Voice?
- [ ] **Onboarding experience**: exact flow from unboxing to first reaction.

### Legal / Business
- [ ] GLBA compliance — start on the indie minimum (LLC + generated privacy
      policy + `docs/security.md` as starter WISP); flat-fee lawyer review
      ($1.5–3K) before public paid launch. Full cost ladder in `docs/security.md`
- [ ] Teller production access — apply when backend is proven in sandbox
- [ ] FCC certification path — pre-certified ESP32-S3-MINI module handles this for prototype;
      custom PCB needs a Declaration of Conformity review
- [ ] Pricing — hardware and subscription not decided
- [ ] App Store submission — Apple financial app review requirements need research

---

## User Experience + Mechanics

### Core Loop
1. User carries Coiny in pocket alongside phone
2. User makes a financial transaction (swipe card, tap phone, online purchase)
3. Teller detects transaction within seconds–minutes (for supported banks)
4. Backend evaluates: was this good or bad relative to user's goals?
5. Push notification sent to phone
6. Companion app relays BLE command to Coiny
7. Coiny reacts: face changes, LED pulses, vibrates, plays sound
8. User feels emotional feedback without looking at a screen

### Pet Mood System
- Mood is a 0–100 score updated by financial events
- Mood decays slowly over time if no positive events occur (encourages engagement)
- Score is NOT account balance — it reflects behavior vs. goals (avoids penalizing
  lower-income users for having less money)
- Mood maps to display state: 80–100 = happy/healthy, 50–79 = neutral, 20–49 = tired,
  0–19 = sick/wilting

### Reaction Design Principles
- **Never punish catastrophically**: pet gets sick but never dies. Always shows recovery path.
- **Variable rewards**: occasional rare "jackpot" celebration for the same positive event.
  Dopamine fires on unpredictable rewards — don't make every reaction identical.
- **Proportional response**: paying a small bill = gentle tap + chime.
  Hitting a savings goal = full celebration with sound + rainbow LED + animation.
- **Shame-free negatives**: sad/concerned reactions are gentle and brief.
  Never aggressive or guilt-inducing.

### Button Interactions (Proposed)
| Button | Short Press | Long Press |
|---|---|---|
| Main (front) | Wake screen / acknowledge reaction | Open quick status |
| Back (rear) | Dismiss / snooze reaction | — |
| Side (right edge) | Cycle status screens | Trigger BLE re-pair |

### Haptic Language (v2 with DRV2605L)
| Event | Haptic Pattern |
|---|---|
| Paycheck received | Sharp triple tap + escalating rumble |
| Savings goal hit | Clean double tap |
| Bill paid on time | Single crisp tap |
| Overspent in category | Slow heavy pulse |
| Budget exceeded | Repeated dull throb (until dismissed) |
| Button press | Subtle click (confirms input) |
| Device wakes | Gentle single tap |

### Onboarding Flow (To Be Designed)
1. User unboxes Coiny — device boots, shows welcome animation
2. User downloads companion app, opens it
3. App scans for Coiny over BLE, pairs automatically
4. User links bank account via Teller Connect (OAuth in-app)
5. App pulls 90 days of transaction history, suggests budget categories
6. User approves suggested goals (opt-out, not opt-in)
7. First reaction fires — demo transaction triggers celebration
8. Done — Coiny is live

---

## Prototype Component List (as ordered, 2026-05-19)

Everything needed for the 1-unit MVP. Order status, vendors, and actual costs.

### Hardware
| Component | Purpose | Vendor | Cost | Status |
|---|---|---|---|---|
| M5StickS3 (K150) | Main dev board — ESP32-S3, 1.14" color LCD, 1W speaker + codec, mic, BLE 5.0, 250mAh battery, USB-C | MTools Tec | $36.59 | ✅ Ordered |
| Adafruit DRV2605L (PID 2305) | Haptic driver IC — I2C, STEMMA QT, 123 named waveforms | DigiKey (1528-1346-ND) | $7.95 + ship | ✅ Ordered |
| SparkFun Qwiic-to-Grove cable, 100mm | Connects DRV2605L (STEMMA QT) to M5StickS3 (Grove) | Amazon | $7.95 + ship | ✅ Ordered |
| uxcell 10mm coin vibration motor, 3V, 10-pack | Haptic feedback motor + 9 spares | Amazon | $8.99 | ✅ Ordered |
| USB-C to USB-C cable (data-capable) | Flash firmware + charge | (already owned) | $0 | ✅ |
| **Total spent** | | | **~$75** | |

### Why these choices
- **DRV2605L over bare motor + transistor + diode**: skips analog motor drive
  circuit, gives 123 distinct haptic patterns, plugs in via Grove cable with
  one solder joint (motor leads → driver pads). +$10 vs raw motor, but
  eliminates breadboard and gives premium haptic vocabulary.
- **WS2812B LED removed**: M5StickS3's color LCD background covers mood color.
- **Breadboard + jumpers removed**: Grove + STEMMA QT is solderless via cable.
- **1 unit, not 2**: solo project; no second collaborator.

### Development Tools
| Tool | Purpose | Cost |
|---|---|---|
| PlatformIO (VS Code extension) | Firmware dev | Free |
| M5Unified Arduino library | Display, speaker, BLE drivers | Free |
| Wokwi (browser) | ESP32 circuit simulation if needed before wiring | Free |

---

## Phase Roadmap

### Phase 1 — Backend + Teller Integration (Weeks 1–3)
- [ ] Initialize Node.js/TypeScript backend with Fastify
- [ ] Connect Teller sandbox
- [ ] Build webhook receiver
- [ ] Build spending rule engine
- [ ] Set up push notification dispatch (Expo Push)
- [ ] Build software device simulator (terminal script)

**End state**: fake transaction → terminal reaction. Pipeline proven.

### Phase 2 — Firmware + Hardware Prototype (Weeks 3–6)
- [ ] Order components from prototype list above
- [ ] Write firmware: BLE server, command characteristic
- [ ] Display happy/sad face based on BLE command
- [ ] Trigger vibration motor on reaction
- [ ] Trigger WS2812B LED color on reaction
- [ ] Play sound effect via built-in speaker
- [ ] Test end-to-end with backend

**End state**: physical Coiny in pocket reacting to fake transactions.

### Phase 3 — Mobile App (Weeks 5–8, parallel with Phase 2)
- [ ] Initialize Expo project
- [ ] **Validate iOS background BLE first** — this is the top risk
- [ ] BLE scanning + device pairing flow
- [ ] Teller Connect bank linking
- [ ] Goal/budget configuration screens
- [ ] BLE relay: push notification → BLE command to device
- [ ] Background BLE relay

### Phase 4 — Real Bank Data (Week 8+)
- [ ] Apply for Teller production access
- [ ] Test with real account
- [ ] Tune rule engine on real transactions
- [ ] Handle edge cases

### Phase 5 — Polish + Beta (Weeks 10–14)
- [ ] OTA firmware update pipeline
- [ ] Growth stages + health score
- [ ] Animation sets + sound design
- [ ] Custom PCB design (Flux.ai)
- [ ] Upgrade to color OLED + DRV2605L haptics
- [ ] 5–10 beta users

---

## Who Does What

Solo project. Code is written by Claude Code; Antoine handles physical
setup, hardware assembly, phone testing, and signups. No collaborator
contributing work.

---

## Design & Prototyping Tools

### PCB / Schematic Design
- **Flux.ai** — AI-assisted browser-based PCB design. Collaborative.
- **EasyEDA Pro** — free, integrated with JLCPCB. Good for first PCB.
- **KiCad** — open-source industry standard. Use for production designs.

### 3D Enclosure CAD
- **Zoo.dev** — text-to-CAD AI. Describe enclosure in words, get a 3D model.
- **Fusion 360** — industry standard for consumer enclosures. Free for startups.
- **Onshape** — browser-based, fully collaborative. No AI but strong mechanical CAD.

### Circuit Simulation
- **Wokwi** — simulate ESP32 + components in browser, run real firmware. Use before
  wiring anything physically.
- **Fritzing** — visual wiring diagrams for documentation.

### Manufacturing
- **JLCPCB** — PCB fab + PCBA. Cheapest for prototype quantities.
- **PCBWay** — alternative, slightly better quality, offers design services.

---

## Immediate Next Step

**Phase 1, Step 1**: Initialize the backend.
- `package.json`, TypeScript config, Fastify setup
- Teller sandbox account (free, instant at teller.io)
- First endpoint: receive a Teller webhook
