# 🔥 Coiny — 14-Day Prototype Sprint (Native Swift + Kotlin)

**Goal:** in 14 days, carry an M5StickS3 in your pocket, spend money via
Plaid sandbox from your phone, watch the device animate + buzz within 2
seconds. 3 friends installed via TestFlight.

**Stack (locked):**
- iOS: native Swift + SwiftUI + LinkKit (no React Native, no Expo)
- Android: native Kotlin + Jetpack Compose (post-iOS, not in this sprint)
- Backend: Fastify + Neon (existing, already deployed on Fly.io)
- Push: direct APNs for iOS (no Expo Push, no Firebase needed for iOS)
- BLE: CoreBluetooth in Swift (no Expo modules)

**Honest disclaimer:** this is the delusional ideal with zero setbacks.
Realistic translation: **4-6 weeks**. Phone-only MVP-A (Day 5 deliverable)
is reachable in ~10 real days. Full prototype with hardware (Day 14) is
~5 weeks. Use this as a checklist, not a schedule.

---

## What "done" means

- ☐ M5StickS3 in pocket animates + buzzes within 2 seconds of a Plaid sandbox transaction
- ☐ Pet has at least 3 distinct animations (idle / celebrate / sad)
- ☐ Mobile app installed on 3 friends' phones via TestFlight
- ☐ Push notifications working (direct APNs)
- ☐ End-to-end demo video recorded (30 seconds)
- ☐ Backend deployed on Fly.io is the same code testers use

---

## What's already done (no work needed)

### Backend
- ✅ Plaid sandbox integration (`/api/plaid/link-token`, `/api/plaid/exchange-token`, webhook verified)
- ✅ Rule engine (paycheck, overspend, savings, bills, large purchase, subscription)
- ✅ Postgres persistence on Neon (pet state, transactions, idempotency)
- ✅ Mood decay over time
- ✅ All API endpoints: `/api/pets`, `/api/spending`, `/api/plaid/*`, `/api/devices/push-token`
- ✅ Debug endpoint: `POST /api/debug/fire-transaction`
- ✅ Deployed at `https://coiny-backend.fly.dev`

### iOS app (`ios/`)
- ✅ XcodeGen project (`project.yml`) — LinkKit 5.6+ dependency declared
- ✅ 3-screen onboarding: Welcome → Link Bank → Meet Pet
- ✅ Plaid Link fully wired via LinkKit (creates token, opens sheet, exchanges public token)
- ✅ `API.swift` actor — all endpoints implemented (`getPetState`, `createLinkToken`, `exchangePublicToken`, `fireTestTransaction`)
- ✅ Pet view with breathing animation
- ✅ Apple Developer account enrolled

---

## Day 0 — Signups (45 min, Antoine only)

- [x] **Apple Developer Program** ($99/yr) ✅ done
- [ ] **Google Play Console** ($25 one-time) — skip for now; iOS-first
- [ ] **Firebase** (free) — only needed for Android push later; skip for now

That's it. iOS APNs does not require Firebase.

---

## Day 1 — Push notifications (APNs)

### Antoine (~30 min, required first)

1. Go to `developer.apple.com` → Certificates, Identifiers & Profiles → **Keys** → `+`
2. Name: "Coiny APNs", check **Apple Push Notifications service (APNs)**
3. Download the `.p8` file. Note the **Key ID** and **Team ID** (visible on the Keys page).
4. Send me: the `.p8` file contents, Key ID, and Team ID.

### Claude

- [ ] Backend: add APNs push dispatch to `dispatchReaction`
  - Library: `apns2` npm package (lightweight, no Firebase dependency)
  - On reaction: query `device_tokens` table, fan out push to each token
- [ ] iOS: register for push in `CoinyApp.swift` via `UNUserNotificationCenter`
  - Request permission on first launch (after onboarding completes)
  - On success: call `UIApplication.shared.registerForRemoteNotifications()`
  - In `AppDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`: POST token to `POST /api/devices/push-token`
- [ ] Open PR, merge

**End-of-day artifact:** trigger `POST /api/debug/fire-transaction` in simulator → push notification appears.

---

## Day 2 — Pet reactions in the UI

### Claude

- [ ] `PetStore` already polls `/api/pets` — extend it to surface `currentReaction` from the response
- [ ] `PetView`: when `currentReaction == "celebrate"`, play a bounce animation for 3 seconds, then return to idle
- [ ] `PetView`: when `currentReaction == "sad"`, play a droop animation
- [ ] `PetView`: when `currentReaction == "alert"`, pulse the pet red briefly
- [ ] Background fetch: on push notification received, wake app, re-poll `/api/pets`, update pet state
- [ ] Open PR, merge

**End-of-day artifact:** fire sandbox transaction → push arrives → app opens → pet bounces for 3 seconds.

---

## Day 3 — Polish + empty/error states

### Claude

- [ ] Empty state: no transactions yet → pet sits idle with "Waiting for your first transaction…" subtitle
- [ ] Error state: backend unreachable → pet looks sad + "Having trouble connecting" message + retry button
- [ ] Settings screen: show linked bank status; "Unlink bank" action; app version
- [ ] `SpendingView`: wire it to `GET /api/spending` so it shows real recent transactions
- [ ] Open PR, merge

---

## Day 4 — Pet sprites (Antoine)

### Antoine (~1-2 h)

Generate placeholder pet sprites. Final art will be commissioned later; these just need to exist for the demo.

- [ ] Generate 16 PNGs via Midjourney / DALL-E / SDXL:
  - 4 emotions: `idle`, `celebrate`, `sad`, `alert`
  - 4 frames each = 16 total
  - 64×64px, transparent background, PNG
- [ ] Save to `ios/Coiny/Resources/Sprites/` as `idle-0.png` … `alert-3.png`
- [ ] Confirm with me so I can wire them in

### Claude (after sprites arrive)

- [ ] Replace SF Symbol placeholder in `PetView` with `Image` cycling through sprite frames
- [ ] `idle`: 500ms frame timer, breathing cycle
- [ ] `celebrate`: 250ms timer, jumping cycle, stops after 3 sec
- [ ] `sad`: 800ms timer, slow droop cycle
- [ ] Open PR, merge

**End-of-day artifact:** pet is a real animated character, not a system icon.

---

## Day 5 — 🎉 MVP-A: TestFlight

### Claude

- [ ] Bump `CFBundleShortVersionString` to `0.2.0` in `project.yml`
- [ ] Verify CI is green (run xcodebuild on simulator)
- [ ] Open PR, merge

### Antoine

- [ ] Xcode → Product → **Archive** (select the Coiny scheme, any iOS device target)
- [ ] Organizer → Distribute App → **TestFlight & App Store** → Upload
- [ ] App Store Connect → TestFlight → add 3 testers by email
- [ ] Each tester installs via TestFlight link, links sandbox bank (`user_good` / `pass_good`), fires a sandbox transaction, watches pet react

**End-of-day artifact:** 3 humans have Coiny on their phones. MVP-A complete. You could stop here. We don't stop.

---

## Day 6 — Firmware day 1 (M5StickS3 BLE GATT server)

### Antoine (~30 min)

- [ ] Confirm M5StickS3 + DRV2605L + coin motor have arrived; you have a data-capable USB-C cable
- [ ] Define BLE command schema in `shared/`: `{ animation: u8, haptic: u8, led_r/g/b: u8, duration_ms: u16 }` — 8 bytes packed

### Claude

- [ ] PlatformIO project in `firmware/`: `platformio.ini` targeting M5StickS3, NimBLE library
- [ ] BLE GATT server with one Coiny service UUID + one writable characteristic UUID
- [ ] On write: parse 8-byte payload, log via serial
- [ ] Open PR, merge

**End-of-day artifact:** open nRF Connect on your phone → scan → connect to M5StickS3 → write 8 bytes → see them in PlatformIO serial monitor.

---

## Day 7 — Firmware animations + haptics

### Claude

- [ ] On BLE write, dispatch to actuator handlers:
  - M5StickS3 LCD: draw hardcoded sprite frames (`idle` breathing, `celebrate` jumping, `sad` slumping)
  - DRV2605L: trigger haptic waveform (pattern 14 = double-click for celebrate, 52 = soft bump for bill)
  - Built-in LED: R/G/B mood color
- [ ] Idle state: cycle breathing animation when no BLE command for >5s
- [ ] Open PR, merge

**End-of-day artifact:** write `celebrate` bytes over BLE → M5StickS3 plays 3-sec animation + double-tap haptic + green LED, returns to idle.

---

## Day 8 — Native BLE in iOS Swift (CoreBluetooth)

### Claude

- [ ] New Swift file `ios/Coiny/Services/BLEManager.swift` — `@Observable` class wrapping `CBCentralManager` + `CBPeripheral`
  - `scan()` → discovers Coiny device by service UUID
  - `connect(_ peripheral: CBPeripheral)`
  - `sendReaction(_ r: BLEReaction)` → packs 8 bytes, writes to characteristic
  - Auto-reconnect on disconnect (exponential backoff, max 30s)
- [ ] `Info.plist` already has `bluetooth-central` background mode (it's in `project.yml`) — verify characteristic write works when app is backgrounded
- [ ] Add a "Device" tab to `RootView` showing: connection status, last reaction, "Scan" button
- [ ] Open PR, merge

**End-of-day artifact:** tap "Scan" in iOS app → connects to M5StickS3 → tap debug button → device reacts. Backgrounding the app doesn't disconnect.

---

## Day 9 — End-to-end integration

### Claude

- [ ] `PetStore`: when reaction fires, if BLE is connected, call `BLEManager.shared.sendReaction()`
- [ ] Mapping: `celebrate → animation:1 haptic:14 led:0,255,0`, `sad → animation:2 haptic:52 led:255,0,0`, `alert → animation:3 haptic:1 led:255,165,0`
- [ ] Backend: extend `dispatchReaction` payload to include `animation` + `haptic` + `led` fields so iOS can pass them straight to BLE without translation logic on device
- [ ] Open PR, merge

### Antoine (carry test)

- [ ] Carry M5StickS3 in pocket all day
- [ ] Fire sandbox transactions from the app's debug button
- [ ] Verify each fires a reaction on the device within 2 sec
- [ ] Note any latency / disconnect / failure modes

**End-of-day artifact:** full prototype loop in the wild. Tap → backend → push → BLE → pocket buzz. ✨

---

## Day 10 — Reliability

### Claude

- [ ] BLE: animation queue on device — if 3 reactions fire within 5s, queue them, don't drop
- [ ] BLE: reconnect UI — show "Coiny disconnected" banner + auto-reconnect progress
- [ ] Battery GATT characteristic on firmware: device updates a BLE characteristic every 60s with battery %; iOS reads and displays it in Device tab
- [ ] Open PR, merge

---

## Day 11 — Audio (placeholder)

### Antoine (~20 min)

- [ ] Download ~6 CC0 sound effects from Pixabay: fanfare, ding, sad-whistle, alert-beep, coin-drop, level-up
- [ ] Save to `ios/Coiny/Resources/Sounds/` as `celebrate.mp3`, `sad.mp3`, `alert.mp3`, etc.

### Claude

- [ ] Wire `AVAudioPlayer` (or `AVAudioEngine`) in `PetStore`: when reaction fires, play matching sound
- [ ] Mapping: `paycheck → fanfare`, `bill_paid → ding`, `overspent → sad`, `large_purchase → alert`
- [ ] Settings screen: mute toggle (`@AppStorage("soundEnabled")`)
- [ ] Open PR, merge

**End-of-day artifact:** phone plays a satisfying sound alongside every device reaction.

---

## Day 12 — Tester onboarding kit + fresh TestFlight build

### Claude

- [ ] Bump version to `0.3.0`
- [ ] "Send feedback" button in Settings → opens `mailto:` with device info + iOS version pre-filled
- [ ] Open PR, merge

### Antoine

- [ ] Xcode → Archive → Upload to TestFlight
- [ ] Write a 1-page "What is Coiny" note for testers (product brief content + sandbox instructions)
- [ ] Invite 3 testers; if remote, mail each an M5StickS3

**End-of-day artifact:** 3 testers have the full hardware+software experience.

---

## Day 13 — Bug fixes from tester feedback

- [ ] Claude monitors for crashes / API errors in Fly logs; hot-fixes immediately
- [ ] Antoine collects tester notes; prioritize any show-stoppers

---

## Day 14 — 🎬 Demo day

- [ ] Record a 30-second demo on a real iPhone: spend money → see push → device buzzes + animates in pocket
- [ ] Capture a tester's first reaction on video (their face = the only marketing asset you ever need)
- [ ] Post the video somewhere (Loom unlisted, Vimeo, or MP4 for the investor deck)
- [ ] Update `docs/handoff.md`: mark prototype as ✅ delivered

🎉 **You now have a real prototype.**

This artifact:
- Goes on a landing page / Kickstarter
- Demos to angel investors
- Justifies a YC application
- Validates whether to invest the next $30k+ in production hardware

---

## Realistic timeline

| Sprint day | Realistic calendar | Why it slips |
|---|---|---|
| Day 0-1 | Day 1-3 | APNs certificate first-time setup has gotchas |
| Day 2-5 (phone MVP) | Day 4-10 | Push on real iOS has provisioning profile edge cases |
| Day 6-7 (firmware) | Day 11-16 | First-time NimBLE + DRV2605L debugging |
| Day 8-9 (CoreBluetooth) | Day 17-26 | iOS BLE background mode is the slowest step in the sprint — plan a week |
| Day 10-14 (integration + polish) | Day 27-35 | Always more polish than expected |

**Realistic total: 5-6 weeks of focused solo work.**

---

## What this prototype is NOT

- ❌ Not the production form factor (M5StickS3 is big; final Coiny is coin-sized)
- ❌ Not the production battery life (3-5 days vs 6-9 months on nRF54L15)
- ❌ Not the final pet art (AI placeholders)
- ❌ Not the final sound design (CC0 placeholders)
- ❌ No real bank data (Plaid sandbox only)
- ❌ No auth / multi-user (singleton `user_1`)
- ❌ No Android (iOS-first; Android comes 3-6 months post-iOS-launch)

**It IS:** a complete end-to-end loop proving the concept works. Enough to validate, demo, build a waitlist, and prep for fundraising.

---

## Android (post-prototype)

Android development begins after iOS TestFlight is live and validated. Stack:
- Kotlin + Jetpack Compose
- Plaid Link Android SDK
- BluetoothLeScanner + `BluetoothGatt` (no Expo)
- FCM for push (requires Firebase project)
- Foreground service for background BLE

See `docs/implementation-plan.md` M5 for the full Android milestone.
