# Coiny — Product Brief

**Status:** 🔴 DRAFT — fill in each `<TBD>` placeholder. Aim for clarity over
completeness. Expected effort: 1-2 hours.

**Purpose:** This is the **only** product-vision document. Every feature
decision (sound packs, pet personality, mobile UX, hardware form factor)
should be checkable against this brief. If you can't answer "does X fit the
brief?" you're building blind.

**Update cadence:** Re-read quarterly, edit when learnings invalidate
assumptions. Lock by Phase 3 (closed beta).

---

## 1. Target user (the "who")

**In one sentence:**
> `<TBD>` — Example: "Coiny is for 22-32 year olds who feel anxious about
> money, want to be more aware without feeling shamed, and grew up with
> Tamagotchis." (replace this)

**Three user archetypes** — name three concrete people Coiny is for. Real
names if possible. If hypothetical, give each one a name, age, job, money
problem, and why Coiny fits.

| Archetype | Name + role | Money problem | Why Coiny |
|---|---|---|---|
| 1 | `<TBD>` | `<TBD>` | `<TBD>` |
| 2 | `<TBD>` | `<TBD>` | `<TBD>` |
| 3 | `<TBD>` | `<TBD>` | `<TBD>` |

**Anti-targets** — who is Coiny EXPLICITLY NOT for? (Just as important.)
- `<TBD>` — Example: "not for day traders who want serious investment tools"
- `<TBD>` — Example: "not for older users who want a traditional budgeting app"
- `<TBD>`

---

## 2. Core promise (the "what")

**In one sentence — what does Coiny do for the user?**
> `<TBD>` — Example: "Coiny gives you a pocket-sized companion that makes
> being good with money feel like caring for something you love."

**The 10-second elevator pitch:**
> `<TBD>` — How you'd describe it at a party in two sentences.

---

## 3. The magic moment (the "demo")

**The single experience that makes someone want one** — the moment that
would convince a friend at a coffee shop. Describe it concretely.

> `<TBD>` — Examples (pick or write your own, not all):
> - "Your pet does a little victory dance when your paycheck hits"
> - "Your pet looks sad and crawls into a corner when you overspend on
>   takeout three days in a row"
> - "Your pet evolves from a baby into a teenager once you've saved $500"
> - "Your pet detects you've had Netflix for 3 months and gently asks if
>   you still watch it"

**Which one is THE one you'd put in the 10-second App Store preview video?**
> `<TBD>`

---

## 4. Pet personality (the "voice")

The pet's personality determines every reaction copy, every sound choice,
every animation. Lock this down with a few words.

**Three to five trait words:**
- `<TBD>` — Example: "encouraging, never judgmental"
- `<TBD>` — Example: "playful, occasionally cheeky"
- `<TBD>` — Example: "quietly caring, like a Studio Ghibli sidekick"
- `<TBD>`
- `<TBD>`

**Pick ONE of each pair (the one that IS your pet):**

|  | OR |  |
|---|---|---|
| Encouraging | ↔ | Judgmental |
| Talkative | ↔ | Quiet |
| Cute / soft | ↔ | Edgy / weird |
| Earnest | ↔ | Sarcastic |
| Optimistic | ↔ | Realistic |
| Modern minimal | ↔ | Retro nostalgia |
| Gendered (he/she) | ↔ | Non-binary (they/it) |

**Five example reaction lines** — write the actual text your pet would say
for each event. This LOCKS the voice.

| Event | What your pet says |
|---|---|
| Paycheck received | `<TBD>` Ex: "💰 Yes! Refuel time!" vs. "Payday! Let's go!" vs. "*chirp chirp*" (mute, just sound) |
| Overspent on groceries | `<TBD>` Ex: "Oh no, the groceries got us 😢" vs. "🤔 maybe meal-prep next week?" vs. (silent sad face only) |
| Hit $500 savings | `<TBD>` |
| Detected Netflix as subscription | `<TBD>` |
| User opens the app | `<TBD>` Ex: "hi 👋" vs. "Welcome back!" vs. nothing |

---

## 5. Product principles (the "rules")

Three to five non-negotiables. When in doubt during feature decisions, check
against these. If a feature violates a principle, kill it.

- **`<TBD>`** — Example: "Never shame the user. The pet is sad/concerned, never
  judgmental. No 'you spent too much again' copy."
- **`<TBD>`** — Example: "Privacy by default. Personal recordings stay on the
  phone. We never sell or analyze user-level financial data."
- **`<TBD>`** — Example: "The device is the protagonist, the phone is the
  workshop. App UX should always nudge users toward looking at their pet."
- **`<TBD>`** — Example: "Joy over information. We are not a budgeting app.
  We are a relationship."
- **`<TBD>`** — Example: "Hardware design must be carry-friendly. If it
  doesn't fit in a pocket comfortably, redesign."

---

## 6. Business model hypothesis (the "how we make money")

Pick the closest match. Best guess — locks in nothing, just gives engineering
direction.

- [ ] **Hardware sale, no subscription** — buy the device for $X, app + service free forever
- [ ] **Hardware sale + subscription** — buy device for $X, pay $Y/month for app features
- [ ] **Subscription-only, hardware loaned/free** — pay $Z/month, device included
- [ ] **B2B / partnerships** — banks, employers, or therapists buy devices for users
- [ ] **Freemium app + paid customization** — free app + device, charge for cosmetics / sound packs
- [ ] **Don't know yet** — explicitly defer, but pick a strawman to anchor engineering

**Best guess price point for the device:**
> `<TBD>` (e.g., "$49 one-time, like a fancy keychain")

**Best guess monthly recurring (if any):**
> `<TBD>` (e.g., "$3/month for Plaid + cloud features, free tier with single bank")

**Why this model?**
> `<TBD>` — One paragraph defending the pick.

---

## 7. Device vs phone primacy

Pick one — affects every feature decision.

- [ ] **Device-primary, phone-secondary** — Tamagotchi-like. Most interactions happen with the device. Phone is for setup, settings, deep history.
- [ ] **Phone-primary, device-secondary** — Fitbit-like. Pet lives in the app, device is a fancy notifier + ambient display.
- [ ] **Equal partners** — both rich experiences (most expensive, hardest to ship)

**Why?**
> `<TBD>`

---

## 8. Competitive positioning (the "what is this?")

**The one-liner positioning** — fill in the blanks:

> "Coiny is `<TBD>` for `<TBD>` — like `<X>` meets `<Y>`."

Examples:
- "Coiny is a financial pet for anxious millennials — like a Tamagotchi meets Cleo"
- "Coiny is a money companion for finance-curious young adults — like Finch meets Mint"
- "Coiny is a savings buddy for budget-conscious students — like a desk plant meets YNAB"

---

## 9. North star metric (one thing we'll measure)

Pick ONE metric. Everything else is secondary.

- [ ] **Daily active devices** (engagement)
- [ ] **Average savings growth per user** (financial impact)
- [ ] **Weekly retention (% of users still active 4 weeks after signup)** (habit formation)
- [ ] **Net promoter score / Would Recommend %** (love)
- [ ] **`<TBD>` — Other:** _______________________

---

## 10. Validation questions (you ARE NOT trying to answer these now, just listing them)

Things we don't know that we'll need to learn. Use this to prioritize user
research / beta testing.

1. Will users actually use a separate device, or just want it in the app?
2. Does the pet's reactions actually change spending behavior?
3. What's the right pet personality balance (encouraging vs accountability)?
4. Is sound on the device worth the battery cost?
5. Will users pay for cosmetics / sound packs?
6. ~~Do users want their pet to know about investments, or stay scoped to spending?~~ **Decided: cash flows only.** See Design Decisions §A.
7. Do users want minute-by-minute stock/ETF prices in the Wealth tab, or is daily-updated enough?
8. `<TBD>`

---

## Out of scope for this brief

- Detailed UX design (mockups, flows)
- Pricing math (CAC, unit economics)
- Marketing strategy
- Hiring plan
- Investor narrative

Those come AFTER this brief is locked. This brief is the prerequisite, not
the whole product strategy.

---

## Design Decisions (locked, do not re-litigate without new evidence)

### A — Activity feed: cash flows only, no unrealized gains

**Decision (2026-05-23):** The "Spending" tab is renamed "Activity." It shows only events where money actually moved — paychecks, purchases, bills, crypto received. Unrealized price changes (stock up 3%, SOL surged 15%) do NOT appear here.

**Rationale:** Every major consumer fintech (Robinhood, Coinbase, Cash App) separates the transaction history feed from portfolio performance. Mixing "you spent $85 at Whole Foods" with "BTC is up 10%" in the same list conflates fundamentally different things and erodes trust — users may mistake a paper gain for real cash. Unrealized events live on the Crypto/Wealth tabs where the asset context already exists.

**Consequence for rules:** The pet only reacts to cash flow events (Plaid transactions, Coinbase received/sent). Rules that fire on unrealized changes (crypto price surge) still fire the pet animation but the event does NOT appear in the Activity feed. If we ever want to notify users of investment milestones, those notifications should land on the relevant asset tab, not the Activity feed.

---

### B — Investment holdings: Plaid Investments for positions, market data API for live prices (deferred)

**Decision (2026-05-23):** Plaid Investments is already wired up and gives us holdings (ticker, quantity, cost basis) for brokerage, 401k, HSA, and IRA accounts. We currently use `institution_price` for net worth, which updates once per day.

**Live pricing:** Plaid does not provide real-time market prices. For minute-by-minute stock/ETF values we would need a separate market data provider (Polygon.io for $29/mo, or Finnhub free tier). This work is **deferred post-TestFlight** — the Wealth tab showing yesterday's prices labeled "as of [date]" is acceptable for prototype.

**401k / HSA / mutual funds:** These are priced once daily at NAV — there is no intraday price regardless of the data provider. Only brokerage accounts with publicly traded ETFs/stocks can update in real time.

**Consequence for net worth:** `GET /api/net-worth` currently makes live calls to all external APIs on every request. This is fine at small scale. When latency becomes a problem, the fix is: cache last-known values in Postgres, refresh on a 1-hour background schedule, serve cached values instantly with a `refreshed_at` timestamp and a manual pull-to-refresh trigger.

---

## How to use this doc

1. Fill in all `<TBD>` placeholders. 1-2 hours.
2. Read it back to a friend who doesn't know Coiny. If they get it in 60
   seconds, it's working.
3. Share with `qiaomein` and any future collaborators. Get their reactions.
4. Pin it. Every feature decision references this doc.
5. Re-read quarterly. Update when learnings invalidate any answer.
