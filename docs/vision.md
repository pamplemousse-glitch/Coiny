# Coiny Vision (Athanor Works)

*Written 2026-08-11, after a two month gap. Supersedes the hardware-first framing in `docs/business-plan.md`.*

**Companion docs:** `docs/global-integration-map.md` (what we integrate, globally), `docs/prd-app-v2.md` (mechanics, onboarding, goals), `docs/design-direction.md` (how it looks).

---

## 1. What changed

Three things, all in the last two months:

1. **Athanor Works exists.** The company was formed specifically to unblock the API integrations that gate access behind a legal entity. That single change unblocks Plaid production, Belvo, Mono, Finverse, Akoya, Empower, TIAA, Carta, and an Apple Developer Organization account. See `docs/global-integration-map.md` §8.
2. **The product is app-first.** Hardware is deferred, not cancelled.
3. **The ambition widened.** From "a pet that reacts to your spending" to "a pet that reacts to your entire financial life, tracked as comprehensively as anyone has ever tracked it."

---

## 2. The uncomfortable part of going app-first

The existing business plan rests on one insight, stated plainly in `docs/business-plan.md`:

> 71% of budgeting app users abandon them within 90 days because opening the app requires willpower. A device sitting on your desk requires none.

**Going app-first destroys that argument.** An app-first Coiny is subject to exactly the churn dynamic the plan identifies as the reason to build hardware. Pretending otherwise would be building on a thesis we have already argued against in our own documents.

There is a second problem, found while writing the PRD: **the 71% figure does not survive checking.** No finance-specific primary source could be traced, and the finance-category retention data that does exist is contested in both directions. See `docs/prd-app-v2.md` Appendix B. It needs to come out of the business plan and the fundraising deck before an investor checks the citation and finds nothing.

Which means the hardware thesis was resting on an unverifiable number. That is an argument for the pivot, not against it, but it is also a warning about how much weight the strategy documents are putting on uncited statistics.

So app-first needs a different thesis. Here it is:

> **The reason budgeting apps get abandoned is not that they are apps. It is that they ask you to do work and give you a spreadsheet back.** Coiny inverts that: the work is done once at setup, and what comes back is a creature whose life visibly depends on decisions you were going to make anyway.

The device is then not the thesis, it is the amplifier. Hardware re-enters when there is a retained user base worth putting on a desk, and it re-enters as an accessory people already want, not as the thing that has to create the want.

This is a more honest position, and it also removes the hardest risk from the critical path. Firmware, BOM, tooling, certification and fulfilment all stop blocking first revenue.

---

## 3. Positioning

> **Coiny is the only place that knows everything you own, and the only one that cares whether you are actually getting anywhere.**

Two halves, both load-bearing.

**"Knows everything you own"** is the wedge that gets attention. The comprehensive coverage work already done, roughly 40 integrations spanning banks, brokerages, 12 chains, DeFi, real estate, vehicles, metals, sneakers, vinyl, prediction markets, trading cards, farmland and CS2 skins, is genuinely unusual. Kubera is the closest comp and charges $250 to $3,600 per year. Monarch, Copilot, Simplifi and Empower do not even support multi-currency.

**"Cares whether you are getting anywhere"** is the part that retains. Coverage tells you where you are. The pet is about where you are going.

### The competitive map

| Product | What they own | What they lack |
|---|---|---|
| Kubera ($250 to $3,600/yr) | Asset breadth, multi-currency | No behavioral layer at all. It is a very good ledger |
| Monarch, Copilot ($100/yr) | Polish, budgeting UX | US-only, no multi-currency, no alt assets, no emotional stake |
| Empower (free) | Free investment analysis | Lead-gen for wealth management. Not a product, a funnel |
| YNAB | A genuine philosophy, real devotion | Requires constant manual work. High effort, high churn |
| Cleo, Fortune City, Finch | Personality and engagement | No real financial depth underneath |

Nobody occupies both axes. That intersection is the position.

---

## 4. The moat is not the integrations

This needs saying clearly because the last six months of work went into integrations.

**Integration coverage is a cost, not a moat.** Every one of those 40 integrations carries a per-user-per-month API bill, a vendor relationship, an auth scheme, and a maintenance burden as the vendor drifts. Any funded competitor can buy the same coverage. Kubera already has most of it.

What cannot be copied quickly is **the layer that turns comprehensive data into a creature that responds correctly.** That layer is currently the thinnest part of the entire codebase:

- The backend has ~830 tests and 35 API modules.
- The complete goal system is **four integer columns** on the `pet_state` table: a weekly budget map, a savings goal, a paycheck minimum, and a large-purchase threshold.
- `docs/product-brief.md`, described in `CLAUDE.md` as "the **only** product-vision document" and the thing every feature decision should check against, is **entirely unfilled `<TBD>` placeholders.**

That imbalance is the single most important finding of this review. The product has a world-class sensory system and almost no nervous system.

**The next phase of work is not more integrations. It is the goal and reaction layer.** That is what `docs/prd-app-v2.md` specifies.

The long-tail integrations still earn their keep, just not as retention drivers. "The only net worth tracker that knows about your CS2 skins and your farmland" is excellent marketing surface, press bait, and a real reason for an enthusiast to switch. Treat them as acquisition, not engagement.

---

## 5. The one principle that must not be broken

> **The pet reacts to what the user controls. Never to the market.**

If Bitcoin drops 20% and the creature gets sad, the app has just punished someone for something they did not do, on a day they already feel bad. They will stop opening it. This is precisely how you manufacture the 90-day churn we are trying to escape.

Behavior is: savings rate, contributions made, spending against plan, debt paid down, bills paid, goals funded, not touching the emergency fund.

Market is: unrealized gains and losses, price moves, FX swings.

**Mood comes from behavior. Market is reported, calmly and neutrally, and never moves the creature's emotional state.** This extends the already-locked Design Decision A in `docs/product-brief.md` from the activity feed to the pet itself. The full event taxonomy lives in the PRD.

---

## 6. Honest assessment of what exists

Reviewed the actual code, not just the docs.

**Genuinely strong:**
- Backend: Fastify + Drizzle on Fly.io with Neon, ~830 passing tests, AES-256-GCM on every stored token, Plaid webhook signature verification done properly, per-user rate limiting, multi-user schema throughout. This is real production engineering, not a prototype.
- iOS: ~8,600 lines of native SwiftUI, 28 view models, protocol-injected HTTP/session/keychain for testability, 148 unit tests. Sign In with Apple through to Plaid Link works end to end.
- The crypto layer is the most complete part of the product and is already global, because chains have no geography.

**The real gaps:**
- The goal system, as above. Four integers.
- The product brief is unfilled, so there is no written definition of who this is for or what the pet sounds like.
- The pet is SF Symbols placeholders. There is no character yet, in a product whose entire premise is a character.
- 27 of 54 UI tests fail.
- 10 asset classes are returned by the backend but never rendered in iOS.
- `GET /api/net-worth` fans out to every external API on every single request. This is a cost and latency bomb at any real user count, and needs caching plus scheduled sync before beta, not after.
- Everything real-asset is US-only (RentCast, MarketCheck, Spinwheel), which caps the global ambition.

**Four bugs found and verified in code during this review**, none of which are in `docs/handoff.md` (which says "No known backend bugs"):

| Bug | Location | Effect |
|---|---|---|
| Any credit ≥ $50 counts as income | `backend/src/store/transactions.ts:114` | Refunds, transfers between your own accounts and card payments all inflate income, so the savings rate is wrong. Savings rate is about to become a core metric, so this is load-bearing |
| Plaid and Spinwheel debts double-count | `backend/src/api/net-worth.ts:149` and `:546` | `bankTotal` already subtracts credit and loan balances, then `debtsTotal` subtracts the bureau-sourced version of the same cards again. Any user who connects both sees a materially wrong net worth |
| The pet reacts to market moves | `backend/src/reactions/external.ts` | `crypto_price_surge` fires celebrate + fanfare + rainbow, `crypto_price_drop` fires concerned + warning + amber. This directly violates §5 above and ships the Robinhood-confetti mechanic |
| Every reaction sends a push | `backend/src/reactions/dispatch.ts:24` | No frequency cap, no quiet hours, no allowlist. At 15 to 40 reactions per week this burns push permission in the first fortnight, and push permission is not recoverable |

**Inherited dirty state, worth knowing:** you are on `feat/firmware-scaffold` with uncommitted changes to `docs/business-plan.md`, `docs/fundraising.md`, three firmware files and the Xcode project, plus ~18 untracked docs. Given the app-first pivot, the firmware branch is now off the critical path. Worth committing or shelving it deliberately rather than leaving it to rot.

---

## 7. The product in three layers

**Layer 1: The Ledger.** Everything you own, in one place, in your currency. This is mostly built. It needs multi-currency done properly, index-based valuation for property and vehicles outside the US, and caching. It is the reason someone downloads the app.

**Layer 2: The Compass.** Goals: a sequenced foundation ladder, user-defined targets with dates and pacing, recurring habit guardrails, and portfolio risk guardrails that are only possible because Layer 1 sees everything. This is the reason someone comes back. It is almost entirely unbuilt.

**Layer 3: The Creature.** The pet: expression, evolution, reaction, voice. This is the reason someone tells a friend. It is currently a placeholder.

Every one of those layers is currently inverted in effort relative to its value. Layer 1 has had almost all the work.

---

## 8. Phasing

| Phase | Focus | Outcome |
|---|---|---|
| **Now, next 4 weeks** | Layer 2 and 3 foundations. Fill the product brief. Goal system. Commission the character. Cache net worth. Close the 10 missing iOS asset sections | An app that is coherent, not just capable |
| **Months 2 to 3** | Plaid Trial plan for real data, TestFlight with real testers, Enable Banking for EU, multi-currency, index-based valuation | First real users, first non-US users |
| **Months 4 to 6** | Monetization, Android parity, App Store launch, retention instrumentation | Revenue, and a retention number that either validates the thesis or kills it |

### Hardware: a post-launch expansion, not a phase

Hardware is **not on the roadmap**. It is an expansion item to consider after the app
has launched and retained, and it should be treated that way in every plan, deck and
conversation until then.

When it returns, it returns as an **accessory sold to people who already subscribe**,
not as the thing that has to create demand. That is a much easier product to sell and a
much smaller bet: a $59 to $79 device offered to an existing paying base, rather than a
cold-start hardware business with a BOM, tooling, certification and fulfilment on the
critical path.

### The gate (locked 2026-08-12)

> **No firmware work until 1,000 paying subscribers are still active at 3 months.**

Until that number is hit: firmware is not worked on, the `feat/firmware-scaffold` branch
stays parked, no further parts are bought, and hardware does not appear in any roadmap,
deck or plan except as a post-launch expansion item.

**Why this shape.** It is a number, so it cannot be reinterpreted in a moment of
boredom. It counts people who **paid and stayed**, not downloads, because downloads can
look healthy while nobody comes back, and that is precisely the situation where hardware
feels most tempting and is most wrong.

**Why it is written down now.** In three months the app work will be tedious: goal
system, broken bank connections, privacy policies. There is $76 of hardware on a shelf
and firmware is more fun than any of that. At that moment there will be a very
convincing argument for picking the device back up, made by the person who wants to pick
it back up. This sentence settles that argument in advance.

**If the number is never reached, hardware never happens, and that is the correct
outcome.** The cost of being wrong that way is $76 and some weekends. The cost of
building a device for a userbase that does not exist is very much higher.

---

## 9. Decisions needed from Antoine

1. **Entity type.** Is Athanor Works an LLC or a C-Corp? An LLC is fine for Apple and every data vendor. Outside investment eventually wants a Delaware C-Corp, and converting later costs money and lawyer time.
2. **Product name.** Does the product stay "Coiny" under Athanor Works, or does the pivot warrant a rename? This determines the domain, the App Store listing, and the bundle ID, and it is cheapest to decide before TestFlight.
3. ~~**Is hardware deferred or dropped?**~~ **Settled 2026-08-12: deferred, reclassified as a post-launch expansion item, gated at 1,000 paying subscribers still active at 3 months.** See §8.
4. **Home market.** Global ambition is right long term, but the first 100 users should be from one market. US via Plaid is the path of least resistance. UK is more interesting: the Pensions Dashboards mandate lands 31 October 2026, and "every asset you own including your whole pension picture" is a sharper wedge than anything available in the US.
5. **Cofounder.** `docs/business-plan.md` names a technical cofounder with an unfilled last name and undefined lanes. Equity, vesting and role split are unresolved, and they are much harder to resolve later.
