# 🔥 Coiny — 14-Day Hyper-Aggressive Delusional Prototype Sprint

**Goal:** in 14 days, carry an M5StickS3 in your pocket, spend money via
Plaid sandbox from your phone, watch the device animate + buzz within 2
seconds. 3 friends installed via TestFlight.

**Honest disclaimer:** this is the **delusional ideal** with zero
setbacks. Realistic translation: **4-6 weeks**. Phone-only MVP-A (Day 5
deliverable) is reachable in ~10 real days. Full prototype with hardware
(Day 14) is ~5 weeks of real work. The day-by-day ordering + deliverables
are correct; the calendar pacing is fantasy. **Use this as a checklist,
not a schedule.**

---

## What "done" means

- ☐ M5StickS3 in pocket animates + buzzes within 2 seconds of a Plaid sandbox transaction
- ☐ Pet has at least 3 distinct animations (idle / celebrate / sad)
- ☐ Pet has at least 5 sound effects (CC0 placeholders fine)
- ☐ Mobile app installed on 3 friends' phones via TestFlight
- ☐ End-to-end demo video recorded (30 seconds)
- ☐ Push notifications working (Expo Push)
- ☐ Sentry + Grafana receiving real production telemetry
- ☐ Backend deployed on Fly.io is the same code testers use

When all 7 boxes are checked, you have a real prototype.

---

## Day 0 — Tonight (90 min, all signups)

These don't need Claude. Do them serially in the next hour and a half.

- [ ] **Buy domain** at Cloudflare Registrar (5 min, ~$12-50). Try `coiny.app`, `coiny.io`, `getcoiny.com`.
- [ ] **File LLC via Stripe Atlas** (30 min, ~$500). Delaware. Use placeholder name like `AW Holdings LLC` — operate Coiny as DBA later.
- [ ] **Apple Developer Program signup as individual** ($99, ~24-48h approval). Switch to organization when LLC arrives.
- [ ] **Google Play Console signup** ($25 one-time).
- [ ] **Free signups (5 min each, batch them):**
  - [ ] Sentry (https://sentry.io/signup) — create org + one project (TypeScript / Node.js)
  - [ ] Grafana Cloud (https://grafana.com/products/cloud) — Connections → Add OpenTelemetry
  - [ ] Clerk (https://clerk.com) — create application "Coiny"
  - [ ] PostHog (https://posthog.com/signup) — US Cloud, project name "coiny"
  - [ ] Resend (https://resend.com) — create API key
  - [ ] Better Uptime (https://betterstack.com/better-uptime) — add monitor for `coiny-backend.fly.dev/health`
  - [ ] Firebase (https://console.firebase.google.com) — project "coiny" with Cloud Messaging enabled
- [ ] **Paste each key/DSN/credential** to me in chat as it arrives. I queue them.
- [ ] **Confirm M5StickS3 + DRV2605L + motors** have arrived and you have a data-capable USB-C cable
- [ ] **Read `docs/product-brief.md`** (just skim — fill it in Day 1)

---

## Day 1 — Observability + product brief

**Claude:**
- [ ] Wire Sentry into backend (Fastify SDK), capture exceptions
- [ ] Wire Sentry into mobile (Expo SDK), capture crashes
- [ ] Wire OpenTelemetry SDK into Fastify, OTLP exporter → Grafana Cloud
- [ ] Open PR, merge

**Antoine:**
- [ ] Fill in every `<TBD>` in `docs/product-brief.md` (~1-2 h). Lock target user, pet personality, magic moment.
- [ ] Apply for D-U-N-S number (~1 week processing; free) for future Apple Dev org
- [ ] Apple Dev approves overnight 🤞

**End-of-day artifact:** Sentry dashboard shows zero errors (good); Grafana shows `/health` latency p50/p95/p99 trending.

---

## Day 2 — Mobile Plaid Link

**Claude:**
- [ ] Install `react-native-plaid-link-sdk` in mobile
- [ ] Wire link-bank screen: tap → calls `/api/plaid/link-token` → opens Plaid Link sheet → on success, posts `public_token` to `/api/plaid/exchange-token`
- [ ] Show "linking…" state, "success" state, error state
- [ ] Open PR, merge

**Antoine:**
- [ ] Test on iOS simulator with `user_good` / `pass_good`
- [ ] Verify `plaid_items` row appears in production Neon DB (`fly logs` or query directly)

**End-of-day artifact:** simulator → tap "Link Bank" → complete Plaid sandbox flow → see Item created in backend.

---

## Day 3 — Push pipeline (T2.3)

**Antoine (~30 min — required first):**
- [ ] Apple Dev: generate **APNs Authentication Key** (`.p8` file). Send me the file + Key ID + Team ID.
- [ ] Firebase: create a Cloud Messaging API key. Download `google-services.json` (Android) + `GoogleService-Info.plist` (iOS). Send both.

**Claude:**
- [ ] Backend: install `expo-server-sdk`, wire it into `dispatchReaction`. When a reaction fires, query `device_tokens` table, send push to each.
- [ ] Mobile: wire `expo-notifications`. On app open, register for push → POST token to `/api/devices/push-token`.
- [ ] Open PR, merge.

**End-of-day artifact:** trigger sandbox transaction via Plaid sandbox dashboard → push notification appears on iOS simulator.

---

## Day 4 — First-launch flow

**Antoine (~1-2 h):**
- [ ] Generate placeholder pet sprite via Midjourney / SDXL. Subject: cute Tamagotchi-style chick (or slime, or whatever your product brief picks). 4 emotions × 4 animation frames each = 16 sprites. PNG, ~64×64 each, transparent background.
- [ ] Save as `mobile/assets/sprites/<emotion>-<frame>.png`

**Claude:**
- [ ] 3-screen onboarding: Welcome → Link Bank → Meet Pet
- [ ] Pet view: cycles through idle frames on a 500ms timer
- [ ] Open PR, merge.

**End-of-day artifact:** fresh install on simulator → 3-screen onboard → see your pet breathing on screen.

---

## Day 5 — 🎉 Phone-only MVP-A complete

**Claude:**
- [ ] Polish: empty states (no transactions yet), error states (Plaid down, no internet), settings screen stub (just sign out for now)
- [ ] EAS Build → TestFlight first build
- [ ] Open PR, merge

**Antoine:**
- [ ] Install on real iPhone via TestFlight link
- [ ] Invite 2 friends to TestFlight
- [ ] Each tester: link sandbox bank, fire sandbox transactions, watch pet react via push + on-screen animation
- [ ] Sanity check: do real-iPhone notifications work? Does Sentry capture any crashes?

**End-of-day artifact:** **3 humans have Coiny installed on their phones.** Phone-only experience is demoable. You could legitimately stop here and have a respectable software demo. We don't stop.

---

## Day 6 — Firmware day 1 (M5StickS3 BLE)

**Antoine (~30 min):**
- [ ] Solder DRV2605L + coin motor to M5StickS3 Grove port (or use the Qwiic-to-Grove cable you bought)
- [ ] Define BLE command schema in `shared/` package: `{ animation: 0-4, haptic: 0-3, led_r/g/b: 0-255, duration_ms: u16 }` packed into 8 bytes

**Claude:**
- [ ] PlatformIO project in `firmware/`: `platformio.ini` targeting M5StickS3, NimBLE library
- [ ] BLE GATT server with one Coiny service + one writable characteristic
- [ ] On write: parse 8-byte payload, log it via serial
- [ ] Flash to M5StickS3 via USB-C
- [ ] Open PR, merge.

**End-of-day artifact:** open LightBlue or nRF Connect on phone → scan → connect to M5StickS3 → write 8 bytes to the characteristic → see them in PlatformIO serial monitor.

---

## Day 7 — Firmware animations + haptics

**Claude:**
- [ ] On BLE write, dispatch to actuator handlers:
  - LCD: draw sprite frames (3 hardcoded animations: `idle` breathing, `celebrate` jumping, `sad` slumping)
  - DRV2605L: trigger haptic pattern from waveform library (123 named patterns)
  - LED on M5StickS3 (built-in): R/G/B mood color
  - Buzzer: optional placeholder beep
- [ ] Idle state: cycle the breathing animation when no command for >5s

**End-of-day artifact:** write `celebrate` over BLE → M5StickS3 plays 3-sec celebrate animation + double-tap haptic + green LED, then returns to idle.

---

## Day 8 — Native BLE module (iOS Swift)

**Claude:**
- [ ] New Expo module via `expo-modules-core`: `expo-coiny-ble`
- [ ] Swift implementation wraps CoreBluetooth:
  - `scanForCoiny()` → returns first device matching our advertised service UUID
  - `connect(deviceId)` → opens connection, discovers our characteristic
  - `sendReaction({animation, haptic, led, duration_ms})` → packs into 8 bytes, writes to characteristic
  - Auto-reconnect on disconnect (within 30s)
- [ ] Background mode: declare `bluetooth-central` in `Info.plist` so the connection persists when app is backgrounded

**End-of-day artifact:** in mobile app, tap a debug button → calls `expo-coiny-ble.sendReaction()` → M5StickS3 reacts. Backgrounding the app doesn't disconnect.

---

## Day 9 — Native BLE module (Android Kotlin)

**Claude:**
- [ ] Same module surface as iOS, Kotlin implementation wrapping `BluetoothLeScanner` + `BluetoothGatt`
- [ ] Foreground service for background BLE (Android requirement)
- [ ] Permission request flow (Bluetooth + Location for older Android)

**End-of-day artifact:** Android emulator (or Android phone) does the same dance — scan, connect, send, react.

---

## Day 10 — 🔥 End-to-end integration

**Claude:**
- [ ] Mobile: when push notification arrives (or pet state polls a new reaction), call `expo-coiny-ble.sendReaction()` with the matching payload
- [ ] Add a "device" tab in mobile: shows connected status, battery (read from device GATT characteristic), last reaction
- [ ] Backend: extend `dispatchReaction` to include a `device_payload` field that mobile passes through to BLE

**Antoine (carry test):**
- [ ] Carry M5StickS3 in pocket all day
- [ ] Fire sandbox transactions from phone (`/sandbox/transactions/create` via shortcut button in app)
- [ ] Verify each fires a reaction on the device within 2 sec
- [ ] Note any latency / disconnect / failure modes

**End-of-day artifact:** **full prototype loop working in the wild.** Tap → backend → push → BLE → pocket buzz. ✨

---

## Day 11 — Polish + reliability

**Claude:**
- [ ] BLE reconnect handling — device goes to sleep / leaves Bluetooth range → mobile reconnects when in range again
- [ ] Animation queueing on device — if 3 reactions fire in 5 seconds, queue them, don't drop
- [ ] Mobile UI: device connection status with reconnect button
- [ ] Battery indicator from device (BLE GATT characteristic the firmware updates every minute)
- [ ] Sentry crash test — force a crash, confirm it lands in Sentry

**Antoine:**
- [ ] Test on a real workday — log every reaction observed, every miss, every disconnect

---

## Day 12 — Audio (placeholder pack)

**Antoine (~30 min):**
- [ ] Download ~10 CC0 sound effects from Pixabay (cheer, sad whistle, ding, magical ascending, error buzz). Save to `mobile/assets/sounds/`.

**Claude:**
- [ ] Wire Expo Audio: when reaction dispatches on mobile, play matching sound
- [ ] Mapping: `paycheck → fanfare`, `bill_paid → ding`, `overspent → sad`, etc.
- [ ] Settings screen: master volume, quiet hours toggle
- [ ] Open PR, merge.

**End-of-day artifact:** phone plays a satisfying sound alongside every device reaction.

---

## Day 13 — Tester onboarding kit

**Antoine:**
- [ ] EAS Build → fresh TestFlight build with everything
- [ ] Write a 1-page "What is Coiny" doc for testers (use the product-brief content) + how-to-install instructions
- [ ] Email to 3 friends

**Claude:**
- [ ] Monitor Sentry + Grafana for any tester-induced crashes; hot-fix immediately
- [ ] Add a "Send feedback" link in mobile settings → opens email to you with device info pre-filled

**End-of-day artifact:** 3 testers have Coiny on their phones. If they're remote, mail them an M5StickS3 each. If local, hand-deliver.

---

## Day 14 — 🎬 Demo day

- [ ] Record a 30-second demo video on a real phone. Frame: spend money in the app → see push → device buzzes + animates in your pocket.
- [ ] Post the video somewhere (private link is fine — Loom, Vimeo unlisted, or just save the MP4 for the investor deck later).
- [ ] Capture a tester's first reaction on video (their face when their pocket buzzes for the first time = the only marketing asset you ever need).
- [ ] Update `docs/handoff.md`: mark Phase 2 prototype as ✅ delivered.

🎉 **You now have a real prototype.**

This is the artifact that:
- Goes on a Kickstarter landing page
- Demos to angel investors
- Justifies the YC application
- Validates whether to invest the next $30k+ in production hardware

---

## What will actually happen (the real timeline)

Honest realistic mapping of the days above to calendar time:

| Sprint day | Realistic calendar time | Why it slips |
|---|---|---|
| Day 0-1 | Day 1-3 | Apple Dev approval takes 3 days not 1; signups have onboarding flows |
| Day 2-5 (phone MVP) | Day 4-10 | Plaid Link first-time integration has corner cases; push notifications on real iOS have certificate gotchas |
| Day 6-7 (firmware) | Day 11-16 | First-time PlatformIO + NimBLE setup; BLE characteristic schema debugging |
| Day 8-9 (native modules) | Day 17-26 | iOS BLE background mode is the slowest single step in the entire sprint. Plan a week of bugs. |
| Day 10-14 (integration + polish) | Day 27-35 | Always more polish than expected |

**Realistic total: 5-6 weeks of focused solo work.**

If you want the actually-realistic version, multiply each day above by ~2.5x and assume one full week of pure debugging somewhere. But the order is right and the deliverables are right.

---

## What this prototype is NOT

Be honest with yourself + testers:

- ❌ Not the production form factor (M5StickS3 is bulkier than the final coin shape)
- ❌ Not the production battery life (3-5 days, not 9-12 months — that needs nRF52840)
- ❌ Not the final pet design (AI sprites are placeholders)
- ❌ Not the final sound design (CC0 placeholders)
- ❌ Not the final UX (onboarding is rough)
- ❌ No real bank (Plaid sandbox only)
- ❌ No multi-user (everything is `user_1`)

**It IS:** a complete end-to-end loop that proves the concept works. Enough to validate engagement, demo to investors, build a waitlist around, prep for Kickstarter.

---

## What I (Claude) can do alone vs. what needs Antoine

| Day | Antoine actions | Time |
|---|---|---|
| 0 | All signups, hardware unboxing | 90 min |
| 1 | Fill product brief | 2 h |
| 3 | APNs key + Firebase config | 30 min |
| 4 | AI sprite generation | 1-2 h |
| 5 | TestFlight install on real iPhone + invite friends | 30 min |
| 6 | Solder DRV2605L + define BLE schema | 1 h |
| 10 | Carry test | passive (whole day) |
| 12 | CC0 sounds | 30 min |
| 13 | Tester onboarding email | 30 min |
| 14 | Record demo | 30 min |

**Total Antoine effort across 14 days:** ~8-12 hours of focused work (most of it Day 0 + product brief).

**Everything else is Claude doing software work.** The hardware bottleneck is M5StickS3 being on your desk + DRV2605L being soldered.

---

## Start now

The 90-minute Day 0 list is the bottleneck. Until those signups happen, nothing else moves. **Open the first 4 links and go:**

1. https://dash.cloudflare.com/?to=/:account/domains/register/
2. https://stripe.com/atlas
3. https://developer.apple.com/programs/enroll/
4. https://sentry.io/signup

Paste me the credentials as they arrive. I'll start staging Day 1 code immediately.
