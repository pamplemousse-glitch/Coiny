# Coiny — 7-Day Delusional Sprint Plan

## Purpose

Prove the end-to-end loop works on physical hardware in one week. This is a smoke
test, not a product. Bank transaction → reaction on a device in your pocket.

If smoke comes out the other end of the pipe, the architecture is validated and
we move to the real 10–14 week plan in `development-plan.md`.

---

## Scope

### In scope
- Backend that ingests Teller **sandbox** webhooks
- Rule engine for 3–5 financial events (paycheck, overspend, savings milestone, bill paid, idle)
- Push notification dispatch (Expo Push)
- Firmware on M5StickS3: BLE server, 3 animations (happy/sad/celebrate), 3 sounds, LED, motor
- Expo app: BLE scan + pair, Teller Connect OAuth (sandbox), push receive, BLE relay
- iOS background BLE validation (top architectural risk)
- Both Antoine and qiaomein carrying working units by Day 7

### Out of scope
- Real bank data (sandbox only)
- Custom PCB
- Finished enclosure (breadboard + tape is fine)
- GLBA compliance work
- App Store / TestFlight public release
- Growth stages, health score tuning, onboarding polish
- More than 3 animation states
- Pet personality finalization
- Sound design beyond placeholder clips
- Durability — wires will fall off, that's expected

---

## Day-by-Day

| Day | Goal |
|---|---|
| **Day 1** | Backend: Fastify + TypeScript scaffold. Teller sandbox webhook receiver wired. mTLS Teller client working against sandbox. Terminal simulator (`pnpm sim <event>`) prints reactions |
| **Day 2** | Rule engine: paycheck, overspend, savings milestone, bill paid, large purchase. Vitest coverage on signature verification + rules + webhook handler. Phase 1 done test passes |
| **Day 3** | Firmware: BLE GATT server with `coiny-cmd` characteristic on M5StickS3. JSON parser. 3 animations rendered on display. Sound playback. DRV2605L wired and reacting via I2C |
| **Day 4** | End-to-end test: backend pushes BLE command via a desktop BLE relay script → device reacts physically. No phone in the loop yet |
| **Day 5** | Expo project init. BLE scan + pair flow. Teller Connect sandbox OAuth. Expo Push subscription |
| **Day 6** | BLE relay in Expo: push notification → write BLE command to device. **Validate iOS `bluetooth-central` background mode** (the #1 architectural risk) |
| **Day 7** | Carry the unit in a pocket. Trigger sandbox transactions from a script. Confirm reactions fire reliably across 5+ trials. Record demo |

---

## Execution Model

Antoine is solo. Code is written by Claude Code; Antoine handles physical
setup, hardware assembly, phone testing, and signups (Teller, Apple Developer,
etc.). Sprint becomes serial rather than parallel — realistic timeline with
standard breakage tax is **9–10 days**, not 7. That's fine.

---

## Realistic Risk Adjustments

- **Standard breakage tax**: 7 days → realistically 9–10 days.
- **iOS background BLE fails reliably**: switch to BLE + WiFi hybrid (Option B in
  `development-plan.md`). Adds 2–3 days.
- **Teller sandbox webhook flakiness**: fall back to manual transaction injection
  via backend admin endpoint. No timeline impact.
- **Hardware shipping delay**: order Day 0, treat Day 1 as backend-only if motors/LEDs late.

---

## Definition of Done

A passing smoke test looks like this:
1. Antoine walks to a different room with phone + Coiny in pocket.
2. qiaomein fires a sandbox "overspend" transaction from her laptop.
3. Within 10 seconds: Antoine feels a buzz, sees Coiny's face turn sad, hears warning sound, LED pulses amber.
4. Repeat with "paycheck received" — celebrate animation + fanfare + rainbow LED.
5. Both reactions are repeatable across at least 5 trials each without manual intervention.

If this works → architecture is validated → start the real 10–14 week plan with
confidence.
