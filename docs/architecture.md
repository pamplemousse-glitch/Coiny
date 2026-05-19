# Coiny — System Architecture

## Overview

Coiny is a portable BLE-connected companion device that reacts to the user's financial
behavior in real time. The phone acts as the internet bridge — the device never touches
WiFi directly.

---

## Connectivity: BLE, Not WiFi

The device communicates exclusively over Bluetooth Low Energy (BLE) to the companion
app on the user's phone. The phone relays messages between the device and the backend.

**Why BLE over WiFi:**
- 10–20x lower power draw → 2–3 days battery life vs 12–16 hours
- More reliable reconnection (same as AirPods — passive, automatic)
- No WiFi credentials stored on device
- Realistic tradeoff: device only reacts when phone is nearby, which is always true
  for a carry device

---

## Data Flow

```
Bank Transaction
      ↓
Teller webhook → Backend (Node.js)
      ↓
Rule engine evaluates transaction against user goals
      ↓
Health score delta calculated
      ↓
Push notification sent to companion app (FCM/APNs)
      ↓
Companion app receives notification (foreground or background)
      ↓
App relays reaction command over BLE to Coiny device
      ↓
Device animates face + LED + vibration + sound
```

---

## Hardware: M5StickS3 (Prototype)

**Chip**: ESP32-S3 (dual-core, 240MHz, WiFi + BLE 5.0)
**Why ESP32-S3**: Every serious WiFi/BLE Tamagotchi project converges on this chip.
Pre-certified module (ESP32-S3-PICO) means no FCC re-certification needed for prototype.

| Component | Spec | Notes |
|---|---|---|
| MCU | ESP32-S3-PICO | BLE 5.0, built into M5StickS3 |
| Display | 1.14" color TFT, 135×240 | Upgrade to color OLED in v2 |
| Speaker | 1W, ES8311 codec + AW8737 amp | Plays real audio files, not just beeps |
| Microphone | MEMS mic (built-in) | Voice interaction, sound detection |
| Battery | 250mAh LiPo, USB-C charging | ~2 days with BLE-only |
| Vibration | Coin motor, add via GPIO | $1, 2-wire connection |
| RGB LED | WS2812B, add via GPIO | Single LED, 3-wire connection |
| Connectivity | BLE 5.0 (primary), WiFi available | WiFi only used for OTA updates |

**v2 Custom PCB targets:**
- Color OLED display (OLED: true black = pixels off = lower power than LCD)
- 600–800mAh flat LiPo (shaped to fit enclosure)
- Egg/coin shaped enclosure (~50mm)
- Integrated vibration motor + RGB LED (no external wiring)

---

## Backend

**Stack**: Node.js + Fastify + TypeScript
**Database**: PostgreSQL (user data, goals, financial health score history)
**Cache**: Redis (session, device state)
**Bank API**: Teller (BLE-connected, real-time webhooks for major US banks)
**Push notifications**: Expo Push (wraps FCM + APNs)
**Hosting**: Railway (MVP) → AWS (scale)

**Key services:**
- `webhook/teller` — receives transaction events from Teller
- `rules/SpendingRuleEngine` — evaluates transactions against user-defined goals
- `rules/HealthScoreCalculator` — rolling 30-day financial health score
- `push/NotificationService` — triggers push to phone when reaction is needed
- `api/pets` — pet state, goals, history (consumed by mobile app)
- `api/spending` — transaction feed, category overrides

---

## Mobile App

**Stack**: React Native + Expo
**Connectivity to device**: BLE (react-native-ble-plx or Expo BLE)
**Connectivity to backend**: REST API + Expo Push Notifications

**Responsibilities:**
- Onboarding: device pairing via BLE scan
- Bank linking: Teller Connect SDK (OAuth flow)
- Goal configuration: budget categories, savings targets
- BLE relay: receives push notification → sends BLE command to device
- Pet status view: health score, recent reactions, history

---

## Monorepo Layer Boundaries

| Layer | Owns | Never does |
|---|---|---|
| **Firmware** | BLE server, display animation, sound, LED, vibration, pet state machine | Financial logic, API calls, user data |
| **Backend** | Transaction ingestion, rule engine, health score, push dispatch | Direct device communication |
| **Mobile app** | BLE relay, bank linking, goal config, UI | Financial rule evaluation |
| **Shared** | BLE command schema, pet state types, spending category types | Runtime code |

---

## BLE Command Schema

The device advertises a BLE service. The companion app connects and writes commands
to a characteristic. Schema defined in `shared/mqtt-schema/topics.ts`.

**Example command payload (JSON over BLE characteristic):**
```json
{
  "cmd": "emote",
  "animation": "happy",
  "duration": 3000,
  "sound": "chime",
  "led": "green"
}
```

**Animation values:** `happy` | `sad` | `celebrate` | `concerned` | `neutral` | `sleeping`
**LED values:** `green` | `amber` | `red` | `rainbow` | `off`
**Sound values:** `chime` | `fanfare` | `warning` | `coin` | `off`

---

## OTA Firmware Updates

OTA (over-the-air firmware updates) use WiFi, not BLE — BLE bandwidth is too low for
binary transfers. Flow:

1. Device connects to WiFi briefly (triggered by app or on schedule)
2. Checks `GET /api/ota/check?fw=1.2.0`
3. Backend responds with latest version + binary URL if update available
4. Device downloads binary over HTTPS, verifies SHA256
5. Writes to inactive partition, reboots
6. Falls back to previous partition if device fails to re-register within 5 minutes

---

## Security

- BLE pairing uses numeric comparison (6-digit confirmation) — prevents rogue device connections
- Device certificate stored in ESP32 secure flash (eFuse)
- Bank credentials never touch the device — Teller OAuth handled entirely in mobile app
- Transaction data never stored on device — only the resulting command (`emote: happy`)
- All backend traffic over TLS 1.3
- `.env` files gitignored at all directory depths — see `.gitignore`
