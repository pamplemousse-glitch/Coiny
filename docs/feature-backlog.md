# Coiny — Feature Backlog

Forward-looking feature list. For each feature: scope, dependencies, effort
estimate, and priority. Reordered as the product evolves; treat this as a
living doc.

**Reading guide:** 🟢 high priority / engagement-critical, 🟡 medium, ⚪ later /
Phase 4-5.

---

## Currently shipped (Phase 1)

- Paycheck-received reaction
- Overspent-in-category reaction
- Savings-milestone reaction
- Bill-paid-on-time reaction
- Large-purchase reaction
- Mood decay over time
- Category override layer (user can re-classify merchants)
- Subscription detection (data layer + API; not yet surfaced as a pet reaction)
- Plaid Link integration (link-token + exchange-token endpoints)
- Push-token registration endpoint (T2.5)

---

## 🟢 High-priority — engagement-critical for a Tamagotchi-style product

### F1. Pet visual customization

**What:** The user can change the pet's appearance. Different "species,"
color schemes, accessories, and evolution stages unlocked by financial
milestones.

**Why it matters:** Tamagotchi-style products live or die on emotional
attachment. A pet that *evolves* as the user builds healthy financial habits
creates the engagement loop. Without customization, every Coiny looks
identical and feels disposable.

**Scope:**

- **Skin library** — 4-6 starter "species" (e.g., chick, cat, slime, robot,
  alien). Each ships with a sprite sheet for the device screen + a 2-3× scaled
  version for the mobile preview.
- **Evolution stages** — each species has 3-4 evolution stages (egg → baby →
  adult → master). Unlocked by hitting financial milestones (e.g., "save $500"
  → evolve to next stage).
- **Cosmetics** — accessories: hats, glasses, scarves, backgrounds. Unlocked
  by streaks, milestones, or seasonal events.
- **Color tinting** — user picks a primary color for their pet.

**Schema additions:**
```
pet_appearance (singleton in Phase 1, per-user in Phase 2)
  species          TEXT NOT NULL DEFAULT 'chick'
  stage            INTEGER NOT NULL DEFAULT 1
  primary_color    TEXT
  unlocked_skins   TEXT[]    -- array of unlocked species/cosmetic IDs

milestones (catalog table — what unlocks what)
  id               TEXT PRIMARY KEY
  description      TEXT
  unlocks          TEXT  -- skin/cosmetic id
  trigger_type     TEXT  -- 'savings_total' | 'streak_days' | 'transactions_count' | ...
  trigger_value    INTEGER

user_milestones (which ones the user has hit)
  user_id          TEXT
  milestone_id     TEXT
  achieved_at      TIMESTAMPTZ
  PRIMARY KEY (user_id, milestone_id)
```

**Dependencies:**
- Asset pipeline — sprite art for each species × each stage × each cosmetic
- Mobile UI — customization screen, milestone progress display
- Firmware — needs to load sprite assets via BLE (initial set baked in, new
  ones pushed OTA-style)
- Push notification — "you unlocked X" celebrations

**Effort:** ~2 weeks across mobile + backend + firmware (asset creation
TBD; could be AI-generated, contracted from an indie pixel artist, or
licensed)

**Status:** 🟢 Phase 3 — engagement validation depends on this

---

### F2. Audio customization (sounds + sound packs)

**What:** The pet plays sounds on financial events. User picks a sound pack
(e.g., "8-bit Tamagotchi," "Kawaii Cute," "Subtle Minimalist," "Synth-wave"),
or customizes per-event-type sounds individually.

**Why it matters:** Sound is half the personality of a Tamagotchi. Coiny's
existing rule engine already names reactions like `fanfare` / `chime` /
`coin` / `warning` — but no actual audio assets exist yet. Filling this in is
table-stakes for the "alive" feel.

**Scope:**

- **Sound asset library** — 5-8 starter sound packs, each with a sound per
  event type:
  - `paycheck_received` (celebratory)
  - `bill_paid_on_time` (satisfying chime)
  - `savings_milestone` (triumphant)
  - `overspent_in_category` (sad/concerned)
  - `large_purchase` (warning)
  - `idle_happy` (occasional contented chirp)
  - `idle_sad` (occasional whimper, when mood is low)
  - `pet_interaction` (when user opens the app)
- **Pack selector** — user picks one pack in settings
- **Per-event override** — power-user can swap individual sounds across packs
- **Volume control** — global + per-event-type
- **Quiet hours** — no audio between configurable hours

**Playback split:**

| Sound | Where it plays | Why |
|---|---|---|
| Quick chirps (idle, interaction) | Device speaker (piezo or small spk) | Tamagotchi feel, doesn't need phone in hand |
| Rich celebration audio | Mobile (Expo Audio) | Higher fidelity, only fires when phone is unlocked or via push notification with custom sound |
| Pure haptic patterns | Device LRA | Subtler reactions when audio would be intrusive |

**Schema additions:**
```
sound_preferences (singleton in Phase 1, per-user in Phase 2)
  pack             TEXT NOT NULL DEFAULT 'tamagotchi_8bit'
  overrides        JSONB DEFAULT '{}'    -- {event_type: sound_id}
  volume           INTEGER DEFAULT 80    -- 0-100
  quiet_hours      JSONB                 -- {start: '22:00', end: '07:00'}
```

**Dependencies:**
- Asset pipeline — sound files (need a sound designer or licensed packs from
  Pixabay/Freesound + curation)
- Mobile — Expo Audio integration for rich playback + APNs custom-sound
  attachments
- Firmware — piezo/speaker driver, ability to load short PCM samples or use
  parameterized synthesis for size-constrained device sounds
- Backend — preference store, sound-asset CDN URLs

**Effort:** ~1 week mobile + backend + asset curation; firmware (when Phase 2
hardware exists) ~3-4 days for speaker driver + sample loader

**Status:** 🟢 Phase 3 — pairs with F1 (customization) as the engagement
feature pair

---

### F3. Surface subscription detection as a pet reaction

**What:** The detection logic already runs (T2.6 ✅), the API returns it, but
the pet doesn't react. Add a `subscription_detected` reaction the first time
a recurring charge is identified.

**Scope:** When subscription detection promotes a new merchant to "confirmed
subscription" (3+ occurrences with monthly cadence), dispatch a
`subscription_detected` reaction. Surface in the app as "Coiny noticed Netflix
is a $15.99/mo subscription — want to keep it?"

**Effort:** 4-6 hours

**Status:** 🟢 cheap win, builds on existing T2.6 work

---

## 🟢 High-priority — financial value-add

### F4. Pet "moods" beyond happy/sad

**What:** Multi-dimensional mood (e.g., happy, anxious, sleepy, excited,
content, hungry) instead of a single 0-100 axis.

**Why:** A pet that's just "smiling at 50%" feels lifeless. A pet that's
"anxious because you're close to your budget limit" or "sleepy because no
income hit this month" is alive.

**Scope:**
- New mood dimensions: `energy`, `confidence`, `attachment`, `anxiety`
- Each driven by different financial signals
- Pet visual + audio responds to dominant mood

**Effort:** ~3 days (logic) + asset work for new emotion sprites

**Status:** 🟢 pairs with F1 customization

---

### F5. Net worth tracking

**What:** Show total net worth across all linked accounts (sum of balances
minus liabilities), trend over time.

**Scope:** Requires Plaid Liabilities product. New `/api/net-worth` endpoint
returning current + historical snapshots. Mobile screen.

**Effort:** ~2 days backend + ~1 day mobile

**Status:** 🟢 Phase 3 — foundational for cash flow / financial insights

---

### F6. Cash flow forecast

**What:** "Based on your recurring bills + average income, you'll have
$X on date Y." Pet reacts to the projection (calm if comfortable, anxious
if tight).

**Scope:** Use subscription detection data + paycheck cadence detection to
project balance forward. Show a 30/60/90-day forecast graph in mobile.

**Effort:** ~3-4 days

**Status:** 🟢 Phase 3 — killer feature for retention

---

## 🟡 Medium-priority

### F7. Streaks & achievements

**What:** "7 days no large purchases" / "3 months paying credit card in full"
/ "5 bills paid on time." Each unlocks a cosmetic in F1.

**Effort:** ~2 days

**Status:** 🟡

### F8. Daily / weekly digest push notification

**What:** Configurable push at user's chosen time with a summary of the
period: how the pet feels, key events.

**Dependencies:** Push pipeline (T2.3) must ship first.

**Effort:** ~1 day after push pipeline lands

**Status:** 🟡

### F9. Goal types beyond savings target

**What:** "Pay off X credit card by date," "X months positive cash flow,"
"Stay under $Y in groceries this month." Each is a custom rule with a
progress bar.

**Effort:** ~1 day per goal type

**Status:** 🟡

### F10. Monthly summary screen

**What:** End-of-month: top categories, comparison to prior month, pet's
overall mood trend.

**Effort:** ~2 days

**Status:** 🟡 (after a couple months of real user data accumulates)

---

## ⚪ Phase 4-5 — defer

### F11. Plaid Investments product

**What:** Surface portfolio holdings, dividend events, investment milestones.

**Cost:** ~doubles per-Item Plaid cost (~$0.30 → $0.60/mo).

**Effort:** ~3-4 days backend + new reactions + mobile screen.

**Status:** ⚪ Phase 5 launch, *unless* user research shows our audience is
investing-first (then accelerate to Phase 3)

### F12. ML-based insights

**What:** "You spent $42/mo on coffee — try this $5 grocery alternative." /
Anomaly detection. / Smart category prediction.

**Why later:** Requires actual user data to train. Hand-tuned heuristics
might cover 80% of the value for the first 100 users.

**Dependencies:** Python ML service alongside Node backend, dataset of
transactions to train on, ML expertise.

**Effort:** Multi-week, possibly a contractor

**Status:** ⚪ Phase 4+

### F13. Social / family pet

**What:** Couples / family share a pet whose health reflects combined
finances.

**Why complex:** Privacy model, consent flows, shared-account dynamics,
regulatory (joint custody of financial data is non-trivial).

**Status:** ⚪ Phase 5+

### F14. Pet-to-pet interactions

**What:** Users can "visit" friends' pets, send "gifts," see leaderboards.

**Why later:** Social-graph is a massive scope expansion. Worth only if
core habit-formation works.

**Status:** ⚪ Phase 5+

### F15. Education content

**What:** In-app articles or tips triggered by user behavior ("you've never
contributed to a 401k — here's why that matters").

**Status:** ⚪ Phase 4+

---

## Feature → implementation phase mapping

| Phase | Features | Why this phase |
|---|---|---|
| **Phase 2** (hardware MVP) | Existing reactions, F3 (subscription reaction surfacing) | Validate the basic loop |
| **Phase 3** (closed beta) | F1 (pet customization), F2 (audio), F4 (moods), F5 (net worth), F6 (cash flow forecast), F7 (streaks), F8 (digests), F9 (goal types) | The engagement layer. This is what makes Coiny a product, not a demo. |
| **Phase 4** (public launch) | F10 (monthly summary), F12 (ML insights) | After accumulating real user data |
| **Phase 5** (scale) | F11 (Plaid Investments), F13 (social), F14 (pet-to-pet), F15 (education) | High-leverage features that benefit from scale |

---

## Asset pipeline needs

Pet customization (F1) and audio customization (F2) both need creative
assets we can't generate from code alone. Options:

| Approach | Cost | Quality | Time |
|---|---|---|---|
| **AI-generated (Midjourney/SDXL for sprites, ElevenLabs for sounds)** | $20-100 | Inconsistent, may lack the "Tamagotchi feel" | Fast (days) |
| **Indie pixel artist + sound designer (Fiverr/Upwork)** | $500-2k for starter pack | Decent, consistent style | 2-4 weeks |
| **Licensed sound packs (Soundsnap, Pond5)** | $50-200 | Professional, but not custom | Same day |
| **Custom commission (Etsy, freelance artists)** | $2-5k | Highest, original style | 1-2 months |

**Recommended starter approach:**
- Sprites: AI-generated for v1, replace with custom pixel art once we have user data
- Sounds: mix of licensed packs (Pixabay/Freesound CC0) + a small custom batch from Fiverr

Budget for a complete customization launch (F1 + F2): ~$500-1000 in assets.

---

## Decisions still owed

- **Pet species lineup** — pick the starter 4-6 species. Recommend wide
  variety (cute, edgy, weird, classic) to hit different aesthetics.
- **Asset pipeline** — AI-generated, hired artist, or hybrid?
- **Audio playback split** — device speaker vs phone vs both? Defaults to
  phone-only for v1 to dodge the firmware audio complexity.
- **Customization unlock economy** — pure achievement-based (financial
  milestones), time-based (login streaks), or paid (cosmetics store)?
  Phase 3 question.
- **Sprite resolution on device** — depends on final display choice (see
  `docs/tech-stack.md` §1). Memory LCD ~96x96; OLED ~128x128.
