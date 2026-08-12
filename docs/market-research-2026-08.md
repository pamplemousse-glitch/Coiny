# Market Research, August 2026

*Three parallel research passes: mainstream US apps, non-US apps, and voice-of-customer. Companion to `docs/market-research.md` (June 2026), which covers gamified apps, physical devices, market sizing and the emotional-object thesis, and is not repeated here.*

**Read §1 first. It is the part that argues against the product.**

---

## 1. Four findings that challenge the thesis

The voice-of-customer pass was explicitly instructed to try to falsify the product thesis. It partly succeeded. These four points should shape the roadmap more than anything else in this document.

### 1.1 The pet mechanic decays, and this is documented rather than hypothetical

Finch is the closest existing analogue to Coiny, a self-care app built around a bird you care for. It has 4.9 stars across 1.3M+ App Store ratings and users report genuine behavioral impact. It also has a diagnosed long-term weakness:

> "The same pet mechanic that delights you in week one can start to feel like one more thing to tend in month three." ([habitbox.app](https://habitbox.app/blog/finch-app-review))

Fortune City users report the same shape of problem from the other direction: "it felt more like a game first, and expense tracker second."

**Consequence.** "The pet is cute" is a launch mechanic, not a retention mechanic. The Foundation Ladder has to carry month three onward, because there is always a next rung and the rungs are about real money rather than about tending something. This raises the priority of the ladder above the character work, which inverts the intuitive order.

### 1.2 The guilt thesis is thinner than assumed

Coiny's positioning assumes people abandon finance apps because the apps make them feel judged. The evidence for that specific claim is weaker than expected. What is well documented is an avoidance loop around **finances themselves**, not around app UX tone:

> "Afraid to check, avoid checking, lose track, something goes wrong, feel shame, more anxiety." ([tucope.com](https://www.tucope.com/resources/adhd-money-anxiety-checking-bank-account))

There is no large volume of "this app made me feel judged so I deleted it" complaints. The avoidance is driven by the underlying financial reality.

**Consequence.** The non-judgmental pet is still worth building, and Finch's "your bird never dies, streaks never punish you, missing a day costs you nothing" framing is explicitly praised by its users. But it addresses a *general* avoidance behavior rather than a specific complaint about competitors. Do not build the pitch on "other apps shame you." Build it on "checking your money is something you avoid, and this makes it something you do not."

### 1.3 The stated organic demand is for the opposite of what Coiny is

The clearest repeated "I wish there was an app that..." request in this category is for **privacy-first budgeting with no bank linking at all.**

> Users "ditched the apps and started using spreadsheets" because integrations "often failed" and they "ended up spending more time nursing the integration than actually watching my net worth."

The FIRE and personal finance communities, which are the core net-worth-tracking audience, are spreadsheet-first by preference, for reasons of privacy, control, and freedom from integration breakage.

**Consequence.** Coiny is a 30-integration product entering a market whose most vocal segment actively distrusts integrations. Two responses, both worth taking:
1. The declared-value onboarding is a genuine strategic asset, not just a conversion trick. It is the only path in the category that lets a privacy-conscious user get a full net worth number with **zero** connections. Consider making that an explicit supported mode rather than a temporary state.
2. Never let a connection silently go stale. See §3.1.

### 1.4 Nobody is asking for this

> "Nobody in the material I could reach explicitly wrote 'I wish there was a Tamagotchi for my money.' This idea does not have visible organic demand pull; it would have to create the category, not fill a stated gap."

**Consequence.** This is not fatal, most category-creating products have no stated demand before they exist, but it changes what marketing has to do. You are not capturing existing intent from search. Distribution has to be demonstration-led: video, App Store preview, word of mouth. It also raises the value of the character commission, since the creature has to sell the idea in three seconds with no explanation.

There is a related credibility risk worth quoting directly:

> "What is it: a tracking app, or a game? To me, they are opposites now. Gaming is for fun, changing habits is not a fun process."

This is the adult-credibility failure mode. The design direction's answer, keeping the creature quarantined to one small window and making every other surface severe and typographic, is the right structural mitigation.

---

## 2. Pricing

### 2.1 The board

| App | 2026 price | Free tier |
|---|---|---|
| Monarch | $99.99/yr Core, $199/yr Plus | None, trial requires card |
| Copilot | $95/yr, stable since 2023 | Trial only, iOS and Mac only |
| YNAB | **$109/yr direct, $179 via Apple IAP** | 34-day trial, no card |
| Tiller | $99/yr | 30-day trial, no card |
| PocketGuard | $74.99/yr | 7-day trial, card required |
| Simplifi | ~$48/yr promotional | Trial |
| Origin | $1 first year | Employer-benefit subsidized |
| Rocket Money | Free tier + $7 to $14/mo | Yes |
| Wealthica (CA) | $50 / $75 / $150 / $250 per year | Tiered by connections |
| Emma (UK) | £4.99 to £14.99/mo (~$78 to $233/yr) | Yes |
| Zaim (JP) | ~$29/yr | Yes |

### 2.2 What this says

**$99/year is correctly positioned** for the US, UK and Canada. It matches Monarch Core and Tiller exactly.

**Wealthica validates connection-based tiering** in this exact category, at four tiers running up to $250. That is direct evidence the Complete tier can go above $149.

**The YNAB Apple IAP gap is the most actionable number here.** $109 direct versus $179 through the App Store, with users discovering they have been on the expensive one for over a year. Design billing around this from day one.

**Willingness to pay is real but loyalty is thin.** Every major paid competitor has documented price-triggered churn. YNAB's increase caused visible defection, with one competitor gaining subscribers directly off the hike. Sticker shock is explicit at the $100+ level, including from satisfied users: "$200/yr between my partner and I is fucking crazy."

### 2.3 Non-US pricing does not transfer

Outside the US, UK and Canada, the category norm is **free to the user, monetized via lending referrals, credit score products, or interchange**. CRED and Jupiter (India), WeMoney (Australia), Fintonic (Spain, Mexico, Chile) and Toss (Korea) all work this way. Japan's Zaim charges roughly $29/year.

Global expansion later needs localized pricing or a different monetization layer. Cosmetics as in-app purchase is culturally native to Japan and Korea and may be the right answer there specifically.

---

## 3. Why people actually quit

Ranked by complaint frequency across App Store reviews, Hacker News, Reddit and review aggregators.

### 3.1 Broken bank connections (the top cause, by a distance)

Structural to the category, not one company's bug. Plaid has a support taxonomy dedicated to it. Reported failures include Capital One OAuth breaking client UIs, 2FA-enabled banks failing outright, and "months-long unresolved issues including missing transactions, duplicate transactions."

**This is Coiny's single largest operational risk, and the pet does not mitigate it at all.** A solo founder also has less leverage with Plaid than a VC-funded competitor when a connection breaks.

Three defenses worth building before launch:
1. **Never show a silently stale number.** Every value carries `refreshed_at` and a confidence state. A number labelled "3 days old" is fine. A number that is silently wrong is an unrecoverable trust event, and users report that a visibly wrong net worth breaks trust in the entire dashboard at once.
2. **Degrade to declared, not to broken.** When a connection dies, fall back to the last known value marked stale, with a one-tap reconnect. Never a blank or a zero.
3. **Fix connections proactively.** Detect breakage server-side and prompt, rather than waiting for the user to notice.

### 3.2 Manual categorization fatigue

Automation gets roughly 80% and the remaining 20% is a recurring chore. Still unsolved in 2026 even at the AI-forward end of the category: Copilot's categorization "needs manual rule overrides."

Coiny is structurally advantaged here because the pet reacts to aggregates rather than to individual labelled transactions, so imperfect categorization degrades gracefully instead of blocking the product. **Protect this advantage.** Any feature that requires the user to correct categories to work should be reconsidered.

### 3.3 Billing surprises

Enough of a category-wide pattern that review sites coach readers to "set a reminder for day 25 to 28." App Store IAP markups, bill-negotiation fees taken without clear consent, and large monthly-to-annual gaps all generate distrust among users who otherwise liked the product.

### 3.4 Novelty decay and the guilt loop

Covered in §1.1 and §1.2.

---

## 4. The best structural insight found

> The category conflates **budgeting**, a discipline requiring ongoing manual input, with **net worth visibility**, a passive dashboard. Nearly every app forces users through a budgeting workflow to unlock the visibility layer.

People who want a trustworthy number get dragged into categorization busywork. People who want budgeting rigor get diluted by apps trying to be both. This explains why YNAB retains a committed minority at $109 while broader apps churn on categorization fatigue rather than on price.

Coiny sits on the right side of this by construction: data arrives on its own, the pet reacts to aggregates, and no manual workflow gates the visibility layer. **This should be an explicit, written product principle so it does not erode feature by feature.**

---

## 5. The Mint lesson

Mint shut down in January 2024 with roughly 3.6M monthly actives. Intuit pushed users to Credit Karma, which imported connected accounts and net worth but **not** budgets, custom categories or savings goals, and carried only 3 years of history for users who had been on Mint for up to 15.

Users scattered rather than consolidating. Monarch captured the largest documented share: signups doubled overnight and 1 November 2023 was its biggest signup day ever. Its advantages were a **Mint data importer** and a founder who had been Mint's original PM.

> Users went wherever felt like the least disruptive migration, not wherever was cheapest or best. Import tooling beat feature superiority in the first 90 days.

**Consequence.** If Coiny ever targets Monarch or Copilot users, a CSV importer matters more than being better. Also note the trust lesson: Credit Karma was rejected because it is a lead-generation engine for credit products. This is the strongest available argument against ever monetizing Coiny through referrals.

---

## 6. International

Full detail in `docs/global-integration-map.md`. The market findings:

### 6.1 The failure pattern that validates charging money

Three close analogues had real traction and died:

| App | Market | Outcome |
|---|---|---|
| Money Dashboard | UK, ~500k users | Closed 2023, "could not find a sustainable business model" |
| Pocketbook | Australia | Acquired by Zip Co for $7.5M, shut down 2022, accounts deleted |
| GuiaBolso | Brazil | Absorbed into PicPay |

Identical cause: free aggregation monetized through loan and credit referrals, never converting enough volume to cover the engineering cost of bank connectivity.

**Charging a direct subscription from day one is a hedge against the specific thing that killed the three closest comparables.** This is the strongest argument for the pricing model.

### 6.2 The UK is the beachhead

1. No localization cost.
2. FCA Open Banking is the most mature connectivity regime in the world, and TrueLayer is already partially built.
3. Proven willingness to pay: Emma runs up to ~$233/year.
4. A real gap: Emma, Snoop, Plum and Chip are all budgeting and savings-nudge tools. None does multi-asset net worth, none has a character.
5. UK Pensions Dashboards providers must connect by 31 October 2026, which is a dated, calendared wedge.

**One structural threat:** Monzo and Starling build budgeting and savings pots into the current account itself. US checking accounts do not do this, so US competitors never face it. In the UK you compete with the bank, for free.

### 6.3 The pet, by culture

| Market | Read | Note |
|---|---|---|
| Japan | Likely native | Invented the virtual pet category; Zaim already leans cute and gamified |
| India | Favorable | CRED runs a comparable status and reward loop |
| Brazil | Neutral to positive | Gamified fintech and loyalty mechanics are popular |
| Germany, Austria | **Highest risk** | Sober, utilitarian financial culture where budgeting is private and somewhat taboo. A creature could read as infantilizing |

### 6.4 Ideas worth stealing

- **Spendee and Toshl** treat multi-currency as first-class marketed positioning aimed at travelers and nomads, not as a settings toggle. The bar: home-currency total, per-account native currency, live FX in every chart.
- **Finanzguru (DE)** sells contract and subscription cancellation as a service, in-app. Coiny already has subscription detection built and unused.
- **Couples and shared views** are a documented retention multiplier across the category. Two-person accounts churn less than single-user ones.

---

## 7. What this changes

| # | Change | Driven by |
|---|---|---|
| 1 | Prioritize the Foundation Ladder **above** the character commission | §1.1, pet novelty decays by month three |
| 2 | Make connection resilience a launch blocker: `refreshed_at` everywhere, degrade to stale-not-broken, proactive reconnect prompts | §3.1, the top churn cause in the category |
| 3 | Support a **zero-connection mode** as a real product state, not a temporary onboarding step | §1.3, the loudest stated demand is privacy and no bank linking |
| 4 | Reframe the pitch away from "other apps shame you" toward "checking your money is something you avoid" | §1.2, the guilt-at-competitors claim is not well supported |
| 5 | Write down "we never gate visibility behind a manual workflow" as a product principle | §4 |
| 6 | Keep pricing at $99, sell annual, minimize Apple IAP exposure | §2 |
| 7 | Reconsider the 2-connection free tier, possibly 3, or unlimited manual assets with 2 live connections | Stingier than Rocket Money, may suppress word of mouth |
| 8 | Never monetize via referrals or lending | §5, Credit Karma's rejection; §6.1, the three deaths |
| 9 | Plan UK as market two, with the Pensions Dashboards deadline as the wedge | §6.2 |
| 10 | Budget for demonstration-led marketing, since there is no organic search intent to capture | §1.4 |

---

## 8. Research caveats

All three passes exhausted their web search quota partway through and fell back on direct page fetches, Hacker News via Algolia, and search snippets. Reddit blocked direct automated access, so Reddit findings come from snippets and aggregators rather than full threads.

**Treat as directional and verify before use in any investor material:**
- Lunch Money's current price, Rocket Money's user and revenue scale, Origin's standard non-promotional price, Monarch's funding history.
- Exact pricing for Bankin', Linxo, Toss and CRED. Wealthica's multi-currency handling. GuiaBolso's shutdown mechanics.
- Raw complaint-volume ratios between categorization, connection failure and price. These were triangulated qualitatively, not counted.

**Recommended follow-up:** a manual human pass through r/MonarchMoney, r/ynab, r/povertyfinance and r/personalfinance. That is an afternoon of reading and it would firm up the single most important input, which is what actually makes people quit.
