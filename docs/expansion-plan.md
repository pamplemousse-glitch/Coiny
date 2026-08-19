# Expansion Plan

*Written 2026-08-19. Sequences the road from "not launched" to "more than one
country". Companion to `prelaunch-verification/07-runbook.md`, which owns the
US launch itself and is not restated here.*

**Two decisions this plan assumes, both already made:**

- **DR-30 (2026-08-12):** home market is US first, UK second.
- **`prd.md:490`:** launch is US-only, English-only, USD-only.
- **New, 2026-08-19:** App Store availability is **restricted to the United
  States** at launch. Founder decision. Reversible at any time in App Store
  Connect, and it drops GDPR exposure to zero on day one.

**No calendar dates.** Every date here would be a guess, because the critical
path is made of other people's latency: an attorney, an artist, Apple, and
Plaid. The plan is expressed as ordered phases with explicit unlock conditions,
so progress is measured by what has been cleared rather than by a date that
slips.

---

## Phase 0. Launch in the US

**This phase is `prelaunch-verification/07-runbook.md`, in full.** It is 696
audited rows reduced to an ordered list across four gates, and duplicating it
here would create a second copy to drift. Work the runbook, not this file.

What this file adds is the shape of it:

| Gate | The event it precedes | Where the work sits |
|---|---|---|
| 0 | Nothing. Wrong right now. | Mostly done. T3, T4, T5, T8 are founder items of minutes each |
| 1 | First external TestFlight tester | **The critical path.** G1.1 to G1.5 are all founder, all external latency |
| 2 | First real bank connection | Plaid production, plus the deletion and encryption closes |
| 3 | App Store submission | The store record, the icon, the privacy labels |
| 4 | First paying user | Deliver what the paywall sells |

### The four things only you can do, and they gate everything

Ordered by how long you wait after acting, not by effort:

1. **G1.4, commission the character art.** Four to six weeks, $3,000–6,000. It
   blocks G3.5 (the app icon), which blocks submission independently of
   everything else. Longest pole that is purely calendar time. Start first.
2. **G1.3, legal review.** Weeks of latency. Three questions, not a retainer:
   the Reg P annual-notice exception, the accuracy disclaimer (which may change
   what gets built, see `obligations.md` §8 Q5), and whether Safeguards binds
   from the first bank connection.
3. **G1.2, the name call and the hosted pages.** You already own
   athanorworks.com. This is hours of hosting, not days of buying, and it
   unblocks G1.5, G1.6, G2.1, G2.2 and G3.1. **The single cheapest item on the
   critical path, gating the largest one.**
4. **G1.1, Apple Organization enrollment.** Weeks. Note the correction already
   recorded in the runbook: this gates App Store *submission* only. TestFlight,
   device installs and StoreKit all work on the existing Individual membership.

Plus about fifteen minutes of housekeeping that is open today: MFA on every
console (T4), a free uptime monitor (T3), branch protection (T5), and the Neon
protected-branches question (T8).

### The largest single engineering item

**G1.6**, the consent and legal surface, is one screen and it discharges Reg P
initial-notice delivery, Apple 5.1.1(i) and 5.1.1(ii), Apple 3.1.2's Terms
link, and Plaid's Link-setup consent item at once. It is blocked on G1.2 (the
URLs must exist) and G1.3 (the copy must be final), which is the real reason
those two are first.

---

## Phase 1. Operate in the US, and learn

Launching is not the end of Phase 0; it is the start of the only phase that
produces information. Nothing below this line should begin until the US product
has real users paying real money.

**One thing to build here that costs almost nothing and decides everything
later:** a demand signal.

Restricting App Store availability to the US has a cost that is easy to miss:
**you become blind to international demand.** A user in Toronto or Manchester
who wants Coiny does not appear in your analytics, your logs, or your store
listing. They see "not available in your country" and vanish.

So put a **waitlist on athanorworks.com that asks one question: which country?**
It costs one static page on hosting you are already standing up for G1.2, and
in six months it is the difference between "we should probably do the UK next"
and "four hundred people in the UK asked for this."

Without it, every decision in Phase 3 onward is a guess.

---

## Phase 2. Multi-currency

**This is the gate to every other market, and it is the flagship of the
six-month block (`prd.md` §30).** Nothing after this phase can start before it.

It is not a formatting change. `prd.md:490` lists guardrails against painting
into a corner and they are all about display: no string concatenation,
locale-aware formatters, no hardcoded `$`. Those are right and they are being
followed. **The corner is in the schema, and it is not covered.**

Every value column is USD-denominated by name (`selfReportedValueUsd`,
`bucketedValueUsd`, `totalUsd`), and TrueLayer converts GBP to USD at sync and
stores the result in a column still called `lastBalanceGbp`. So the display
layer is being kept portable while the storage layer is being cemented.

**Cheap thing to do before this phase, ideally now:** store the native currency
alongside every USD value. One column per value table, no product work, no UI.
It means the Phase 2 migration has real data to convert rather than a backfill
that cannot be reconstructed.

### What Phase 2 must deliver

- Native currency stored per value, per account, per manual asset
- A user-selected **display currency**, independent of the currencies their
  assets are held in
- Live FX with an `asOf`, treated as vendor data like any other

### The bug this phase must fix, and why it belongs here

A non-US user's balance is converted to USD at sync. `liquidDeposits` feeds
`liquidCash`, which drives the ladder's emergency-fund rungs
(`goals/ladder.ts:144,187`), and `ladder_rung_completed` carries
`healthDelta: 15` and `push: 'always'` — the loudest moment in the app.

So a pure FX move can complete a rung and make the creature celebrate something
the user did not do. `contract.ts:18` states the principle being violated:
*"an exogenous event with an animation is a contract violation."* You already
guarded `net_worth_milestone` this way; the FX path routes around that guard by
arriving as a rung, which is classed `direct`.

**Hyperinflation makes it worse than noise.** An Argentine holding the peso
equivalent of $10,000 in 2016 had about $114 of purchasing power by 2026. In
local-currency terms that net worth number goes *up*, enormously, while the
person is ruined. A naive local-currency display does not merely add noise, it
**inverts the signal**, and the creature would celebrate throughout.

Consequence for the design: the reactive progress signal must be computed in a
stable reference currency for users in high-inflation economies, even where the
display currency is local. Start the volatile list at Zimbabwe, Argentina,
Venezuela, Lebanon and Turkey.

No competitor was found to have solved this for a *reactive* product. For
everyone else a wrong-direction number is merely wrong; here it drives an
animation. That makes it a potential differentiator rather than only a defect.

---

## Phase 3. Manual-only, worldwide

**The cheapest expansion available, and it is not a country.**

Once multi-currency exists, lift App Store availability worldwide with **no new
aggregator**. Users outside supported countries get crypto, precious metals,
collectibles and manual entry. No bank linking.

### Why this is nearly free

- Crypto is borderless by construction. Metals price globally. Collectibles
  price in USD.
- Shared price feeds are cached (`util/price-cache.ts`), so an extra user in an
  unsupported country adds no vendor cost at all.
- Per-connection cost (Plaid, TrueLayer, Spinwheel) is **zero** for these users,
  because there is nothing for them to connect.

**A user in an unsupported country costs approximately nothing to serve.** The
countries you cannot reach with bank links are the countries that are free.

### Why it is worth doing at all

Manual-first is a real market, not a consolation. Money Manager has 23–50M
downloads with no bank connection of any kind. Net worth tolerates a slower
update cadence than transaction tracking, because balances move slowly — and a
creature that reacts to your entries is a better retention loop for manual entry
than anything a competitor has.

Nobody was found serving "crypto plus manual, no bank link" as a *primary*
persona rather than a fallback.

### What it requires

- **Never show a Connect button that cannot work.** Detect the country and route
  to a manual-first onboarding. This is named as the highest-abandonment failure
  mode in this category.
- **GDPR** applies the moment an EU resident signs up, regardless of a US LLC.
  This is the phase that incurs it, so budget the privacy notice and data
  subject rights work here.
- Localisation is optional; English-only worldwide is acceptable to start.

---

## Phase 4. The United Kingdom, the first full market

DR-30 puts the UK second. It is the first market where bank linking works, and
it is a genuinely thinner product than the US one. Enter with that priced in.

### Unlock conditions

| Condition | Status |
|---|---|
| Multi-currency (Phase 2) | Prerequisite |
| **`obligations.md` §8 Q2 answered**: do we need our own RAISP registration, or can we operate under TrueLayer's licence? | **Open. Long pole. Weeks of legal latency** |
| UK GDPR | Incurred in Phase 3 |
| An aggregator | TrueLayer is already built and in sandbox |

### What the UK user does NOT get, and it is a lot

- **No debts and no credit score.** Spinwheel is pinned to VantageScore and
  Equifax US. There is no drop-in equivalent. Net worth becomes assets-only,
  which is wrong in the flattering direction, and the debt tooling — a
  headline feature — is simply absent.
- **No property valuation from RentCast**, though the index-forward strategy
  works: HM Land Registry publishes a free UK house price index.
- **No vehicle valuation.** DVLA and DVSA give identity and MOT free; valuation
  is commercial everywhere in the UK market.
- **No pensions.** The Pensions Dashboards mandate (31 October 2026) is real,
  but consuming that data commercially requires FCA authorisation as a
  qualifying pensions dashboard service under PS24/15. That is a regulated
  permission, not a developer signup. It is a moat for incumbents.
- **No ISAs, SIPPs or JISAs.** PSD2 and UK Open Banking cover **payment
  accounts only**; investment wrappers are outside the mandate entirely. This
  is not unbuilt, it is unavailable. Budget zero engineering time on it.

**The honest framing: the UK v1 is a bank, crypto, collectibles and manual
product with no debt layer.** Decide deliberately whether that is worth
shipping, or whether the debt gap needs an answer first.

---

## Phase 5. The EU

Cheaper than the UK once the UK is done, because the hard parts are already
paid for.

- **Aggregator: Enable Banking.** Self-serve, no entity gate, and its Restricted
  Production tier is free against accounts you own — so it can be built and
  tested before any commercial commitment. It is the named successor to
  GoCardless/Nordigen, which closed to new signups in July 2025.
- **Property: one Eurostat integration covers all 27 member states**, free, no
  key. The best return on effort in the whole research file.
- **GDPR** already handled in Phase 3.
- **New cost: localisation.** This is the first phase where English-only stops
  being defensible.

---

## Phase 6. Everything else, only with revenue

`global-integration-map.md` §11 already states the rule: *"Only worth signing
once there is revenue."* This plan does not improve on it.

The economics that make it a rule rather than a preference: **regional
aggregators carry minimum commitments.** Basiq has a 12-month minimum, Flinks a
monthly floor, and most sales-gated vendors will have one. So entering a region
is a **fixed monthly bet, not a variable cost** — your first user there costs
you the whole minimum. That is the opposite shape from Plaid's Trial, where ten
connections cost nothing.

Candidates, in rough order of ease:

| Market | Vendor | Note |
|---|---|---|
| Canada | Plaid (already) or Flinks | Technically the cheapest non-US market; Plaid covers it self-serve |
| Australia / NZ | Basiq | 12-month minimum |
| Brazil | Pluggy | Self-serve |
| Mexico / Colombia | Belvo | Sales-gated |
| 73 countries, one contract | **Salt Edge** | If you ever go broadly international, one contract beats eight |

Zimbabwe, and most of Sub-Saharan Africa, Central Asia and South Asia, are
**not purchasable at any price**. No aggregator covers them. Phase 3 is the
whole product there, permanently, and that is fine because Phase 3 is free.

---

## The one measurement that drives all of it

Every decision from Phase 3 onward is "is there demand here". The instruments:

1. **The waitlist country field** (Phase 1). The only signal available while
   availability is US-restricted.
2. **Signup country**, once availability is lifted. Not currently stored
   anywhere in the schema; one column.
3. **`declared_assets`**, already built. Onboarding asks what people own and
   stores it bucketed per class. It tells you which *asset* integrations are
   worth paying for, before you pay.

The rule that follows: **declaration before integration.** At $99/yr you net
roughly $8.25 a month per subscriber, so a $30/month API needs about four
subscribers who would otherwise churn. Most of the long tail does not clear that
bar today, and the free tiers should be exhausted first in every case.
