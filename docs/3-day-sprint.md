# ⚡ Coiny — 3-Day Sprint to a Demoable Prototype

**Goal:** in 72 hours, record a Loom video showing the full Coiny loop —
sandbox bank transaction → backend rule fires → mobile pet reacts on
screen. Demoable to friends, investors, on Twitter, on a landing page.

**Scope intentionally hyper-narrow:**
- iOS Simulator on Antoine's Mac (no real-device install)
- Plaid sandbox only
- No hardware
- No push notifications (polling instead)
- No Apple Developer signup needed
- No LLC
- Cost to Antoine: ~$0 (all free tiers)

This is the *cheapest possible artifact* that proves Coiny works end-to-end.
Sufficient for:
- Loom video for a landing page / Twitter / waitlist
- Friend show-and-tell on your Mac
- 1-pager investor preview
- Validating the concept before you spend the next $1k

**Realistic timeline disclaimer:** 3 days of focused work for someone who
knows the codebase. With Sentry, signups, real-device testing, or hardware:
go to `docs/14-day-sprint.md`.

---

## What we leverage (already done — no work needed)

Backend is **already shipped and deployed**. Everything you need is live at
`https://coiny-backend.fly.dev`:

- ✅ Plaid sandbox integration (link_token, exchange-token, webhook signature verified)
- ✅ Rule engine (paycheck, overspend, savings, bills, large purchase, subscription)
- ✅ Postgres persistence on Neon (pet state, transactions, idempotency)
- ✅ Mood decay over time
- ✅ Category overrides
- ✅ All API endpoints: `/api/pets`, `/api/spending`, `/api/plaid/*`, `/api/devices/push-token`, `/api/spending/overrides`, `/api/subscriptions`
- ✅ End-to-end validated: real Plaid sandbox webhook → signature verified → rule fires → reaction dispatched (just no mobile to render it yet)

What's missing for the demo: only the **mobile UI**. That's the entire 3-day scope.

---

## What "done" means in 3 days

A single Loom video, ~30 seconds, showing:

1. App launches on iOS Simulator → onboarding screen
2. User taps "Link Bank" → Plaid Link opens → user enters `user_good` / `pass_good` → success
3. Pet appears, in `idle` state
4. (In a separate Terminal tab) you fire a sandbox transaction via curl: `/sandbox/transactions/create`
5. Backend rule fires; mobile polls `/api/pets`, sees the new reaction
6. Pet animates to `celebrate` for 3 seconds, then returns to idle
7. Loom recording stops

That's it. That's the prototype.

---

## Day 1 (~6-8 h work) — Plaid Link in mobile

### Antoine setup (10 min)

- [ ] Verify Xcode + iOS Simulator works on your Mac (`open -a Simulator`)
- [ ] Verify Expo Go runs (`pnpm --filter coiny-mobile start` → press `i` for iOS sim)
- [ ] Confirm Plaid credentials are still in Keychain (`security find-generic-password -a "$USER" -s coiny-plaid-client-id -w`)

### Claude work (~6 h)

- [ ] Install `react-native-plaid-link-sdk` in mobile
- [ ] Create Expo Development Build config (`eas build:configure --platform ios --profile development`) — runs locally, no Apple Dev needed for Simulator builds
- [ ] Build the dev client for iOS Simulator (`eas build --profile development --platform ios --local` — uses your Mac's Xcode, no $99 needed)
- [ ] Wire link-bank screen:
  - Tap "Link Bank" → fetch link_token from `/api/plaid/link-token`
  - Open Plaid Link with the token
  - On success, post `public_token` to `/api/plaid/exchange-token`
  - Persist a flag in AsyncStorage so onboarding skips next time
- [ ] Add error/loading/empty states

### End of Day 1 artifact

iOS Simulator → tap "Link Bank" → use `user_good` / `pass_good` → see a green checkmark + the `plaid_items` row appears in Neon DB (verify via Drizzle Studio or psql).

---

## Day 2 (~6-8 h work) — Pet view + polling

### Antoine work (~1-2 h)

- [ ] Generate the pet sprite via Midjourney / SDXL / DALL·E. Prompt suggestion:
  > "Cute Tamagotchi-style pixel art chick with big eyes, 4-frame sprite sheet: idle (1 frame), celebrate (jumping, 2 frames), sad (slumping, 1 frame). Transparent background. 64×64 pixels each."
- [ ] Save 4 PNG frames to `mobile/assets/sprites/`:
  - `idle.png` (or `idle-1.png`)
  - `celebrate-1.png`, `celebrate-2.png`
  - `sad.png`

If you don't have time for art: just use 4 emoji as placeholders (🐣 idle, 🎉 celebrate, 😢 sad, 💀 broke). Truly. The prototype lives on flow, not art.

### Claude work (~6 h)

- [ ] Pet view screen:
  - Shows current sprite based on `mood` or last reaction type
  - Cycles through animation frames every 500ms when in `celebrate` mode
  - Displays health score as a hearts bar or progress ring
  - Shows the last reaction reason text ("paycheck_received (Direct Deposit $2400.00)")
- [ ] Polling hook (`use-pet-state`):
  - Calls `GET /api/pets` every 3 seconds
  - When `reactionHistory[0].at` changes vs. previous, trigger animation transition
  - Stops polling when app is backgrounded
- [ ] Onboarding flow: 2 screens — Welcome → Link Bank → (auto-route to Pet after success)
- [ ] Settings stub: just a sign-out button (clears AsyncStorage + reloads)

### End of Day 2 artifact

iOS Simulator → fresh launch → onboarding → link sandbox bank → land on pet view → see your AI-generated chick blinking. Backend transactions visibly drive the pet (test by manually inserting a `reaction_history` row via Drizzle Studio).

---

## Day 3 (~4-6 h work) — Wire end-to-end + record demo

### Claude work (~4 h)

- [ ] Add a debug "Fire test transaction" button on the pet view (only visible if env says dev). Calls Plaid's `/sandbox/transactions/create` (with our access_token) to inject a fake $2400 paycheck.
- [ ] When this fires:
  - Backend webhook receives → rule engine sees paycheck_received → reaction recorded in DB
  - Mobile polls → sees new reaction → pet animates `celebrate` for 3s → returns to idle
- [ ] Polish: loading skeletons, error states (Plaid offline, no internet), smooth transitions
- [ ] Add a visible "last reaction" timeline (just last 3 entries from `/api/spending`)

### Antoine work (~1 h)

- [ ] Test the full flow on simulator end-to-end. Should be silky.
- [ ] Open Loom (or QuickTime screen recording — File → New Screen Recording → select Simulator window)
- [ ] Record the 30-second demo:
  1. Hit the debug "Fire test" button (or run `curl` in Terminal off-screen)
  2. Watch the pet celebrate
  3. Done
- [ ] Save the .mp4 / Loom link somewhere — this is your first marketing artifact

### End of Day 3 artifact

🎬 **30-second screen-recorded demo of working Coiny.** Frame the demo as if it's a real user with a real bank:

> "I just got paid → my pet is celebrating in real time."

This is the artifact that goes into:
- A landing page hero video
- A waitlist email
- An "I built this in 3 days" Twitter post
- The cover of an investor deck

---

## What you skip vs. the 14-day plan

| Cut | Why it's safe to cut for this scope |
|---|---|
| Apple Developer signup ($99, 24-48h wait) | iOS Simulator on your Mac doesn't need it |
| Google Play Console ($25) | We're iOS-only for this demo |
| LLC, domain, insurance | Not relevant for a screen-recorded demo |
| Push notifications (T2.3) | Polling every 3s works for a 30-sec demo |
| TestFlight distribution | Demo is the video; nobody needs to install yet |
| Sentry / Grafana / observability | Backend already works; you can read `fly logs` directly |
| Hardware (M5StickS3, BLE, firmware) | Phone-only demo proves the concept |
| Native BLE modules (Swift/Kotlin) | Same |
| Audio packs, sound effects | Demo's silent or you record with Mac mic — fine |
| Multi-user / auth (Clerk) | Hardcoded `user_1` — only person testing is you |
| Sprite sheet polish | One AI-generated chick is enough for the demo |
| Real-device testing | iOS Simulator is fine for the recording |

---

## What this prototype CAN'T do (be honest with yourself)

- ❌ Live in a friend's pocket (no hardware)
- ❌ Push notifications when phone is locked
- ❌ Work on Android (we only built for iOS Sim in this sprint)
- ❌ Run reliably for >1 hour (polling-based + no error recovery)
- ❌ Pass App Store review (not the goal)

But it CAN:
- ✅ Show the full Coiny vision in 30 seconds
- ✅ Be screen-recorded into a landing page hero
- ✅ Convince a skeptical friend that the concept is real
- ✅ Be shown on your Mac to anyone
- ✅ Live on your laptop forever as a demo artifact

---

## Day 0 (before Day 1) — 15 minutes

Run these to confirm we're ready to start tomorrow:

```bash
# 1. Verify backend is alive
curl https://coiny-backend.fly.dev/health
# Expect: {"ok":true}

# 2. Verify Plaid creds are in Keychain
security find-generic-password -a "$USER" -s coiny-plaid-client-id -w
# Expect: a UUID-shaped string

# 3. Verify Xcode + Simulator
open -a Simulator
# Expect: iOS Simulator window opens

# 4. Verify mobile dev works
cd /Users/antoinewiley/Tamogatchi/mobile && pnpm install
# Expect: clean install

# 5. Boot the mobile app in Simulator
pnpm --filter coiny-mobile start
# Then press `i` to launch iOS sim
```

If all 5 succeed, you're ready. If anything fails, fix it tonight — that's the only Day-0 work needed.

---

## What I (Claude) need from you

Across all 3 days: **~3 hours of your time, $0 spent.**

| Day | Antoine task | Time |
|---|---|---|
| 0 | Run the 5 health checks above | 15 min |
| 1 | None (Claude does Plaid Link wiring) | 0 min |
| 2 | Generate pet sprite or pick 4 emojis | 1-2 h |
| 3 | Test the demo on simulator, hit Loom record, save the .mp4 | 30 min |

That's it. Everything else is me writing code against the existing backend.

---

## Start tonight

Run the 5 health-check commands above. If anything fails, paste me the error.
If all 5 succeed, just message me "ready" and I start Day 1 work tomorrow.

In 72 hours you have a recorded artifact you can show your mom, your VC, and
your skeptical friend. **No money spent, no LLC filed, no hardware needed.**
