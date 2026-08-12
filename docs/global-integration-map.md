# Global Integration Map

*Researched 2026-08-11. Companion to `docs/net-worth-coverage-plan.md` (which is US-centric) and `docs/global-banking-plan.md` (which this supersedes).*

**Purpose:** answer "what do we integrate to track every asset a person owns, anywhere in the world."

---

## 0. The shape of the problem

Net worth coverage is not one problem. It is six layers, and each layer has a
different globalization story:

| Layer | Globalization story | Our status |
|---|---|---|
| 1. Bank + cash + transactions | **Worst.** Fragmented per country, licensed, entity-gated | US + UK/EU/AU only |
| 2. Investments + brokerage | Semi-global, a few vendors span many markets | US-heavy |
| 3. Pensions + workplace retirement | Country-specific, mostly walled | Not covered |
| 4. Crypto | **Best.** Chains are borderless, no permission needed | Genuinely complete |
| 5. Real assets (property, vehicles) | Valuation data is nationally siloed | US only |
| 6. Collectibles + alt | Naturally global, priced in USD | Good |

The honest read: **we are a US product with a European bolt-on and a
world-class crypto layer.** Layers 1, 3 and 5 are where "global" is won or lost.

---

## 1. Bank, cash and transactions

This is the base layer. Everything else is decoration if the user cannot link
their checking account.

### What we have

| Provider | Regions | Status |
|---|---|---|
| Plaid | US, CA, and partial UK/EU | Live (sandbox) |
| TrueLayer | UK, IE, FR, DE, ES, IT, NL, AT, BE, FI, NO, PL, PT, AU | Live |

### The map by region

| Region | Recommended provider | Self-serve? | Notes |
|---|---|---|---|
| **US / Canada** | Plaid | Yes (sandbox), production needs entity + GLBA review | ~9,700 institutions, the largest single-country institution count of any vendor |
| **Canada (depth)** | Flinks | Entity | Backed by National Bank of Canada; better CA coverage than Plaid |
| **UK / EEA (indie path)** | **Enable Banking** | **Yes, fully self-serve** | Self-serve control panel, sandbox, and a "Restricted Production" tier that is free against accounts you personally own. This is the single best unblock available to us today |
| **UK / EEA (scale path)** | Tink (Visa) | Entity | PSD2-native, AISP/PISP licensed in most EU markets, deepest EEA bank coverage |
| **UK / EEA (white-label)** | Yapily | Entity | 19 countries, headless REST, can operate under Yapily's licence |
| **Widest single contract** | **Salt Edge** | Entity | **73 countries of bank connectivity**, the broadest map from one vendor. The "one integration, most of the world" option |
| **Brazil** | **Pluggy** | **Yes** | Self-serve sandbox and dev dashboard, Central Bank authorized. Unblocks BR without the company-email wall Belvo hit |
| **Mexico / Colombia / Brazil** | Belvo | Company email required | Previously blocked on Gmail signup. Athanor Works email now unblocks this |
| **Australia / NZ** | Basiq | Instant sandbox keys | Production carries a 12-month minimum commitment. TrueLayer already covers AU via CDR, so Basiq is optional |
| **Africa (NG/GH/KE/ZA/EG)** | Mono | Entity | Also Okra, and Stitch for South Africa |
| **SE Asia (SG/HK/PH/ID/TH/VN)** | Brankas or Finverse | Entity | Finverse previously returned generic errors without an entity |
| **India** | Setu (Pine Labs), Finvu, OneMoney | Entity + RBI AA framework | India uses the regulated Account Aggregator framework, not screen-scraping. Real work, real compliance |
| **Middle East (SA/BH/AE)** | Tarabut | Entity | Saudi's SAMA framework is live and mandated on a UK-Open-Banking-style standard |
| **South Korea** | KFTC Open Banking + MyData | Entity, local presence | MyData has 50M+ registered users but is effectively closed to foreign indies |
| **Japan** | Framework still maturing | n/a | Defer |

### Dead ends, confirmed

- **GoCardless Bank Account Data (formerly Nordigen)** is closed to new signups. The free-EU-banking era it defined is over. Enable Banking is the named successor for indie builders.
- **Yodlee / MX** remain enterprise-only at $15K to $100K+ per year.

### Recommendation

1. **Now, zero blockers:** add Enable Banking for EU/UK. Self-serve, and its restricted production tier lets you use real bank data on your own accounts before any commercial agreement. This is a strictly better developer path than TrueLayer for the pre-revenue phase.
2. **Now, entity is formed:** retry Belvo, add Pluggy for Brazil.
3. **When paying customers exist:** consolidate onto Salt Edge (73 countries) or Tink (EEA depth) rather than accumulating five bilateral contracts.

---

## 2. Investments and brokerage

| Provider | Coverage | Status |
|---|---|---|
| SnapTrade | 30+ major retail brokerages **globally**, read and write, 95%+ connection success | Live |
| Plaid Investments | US brokerages, IRA/Roth/401k rollover/HSA, 2,400+ institutions | Live |
| Alpaca, Kraken, Coinbase | Direct API, user-supplied keys, global | Live |
| Wealthica | Canada, reporting-grade balances/positions/transactions | Not integrated |
| Flanks | EU wealth management grade | Entity, not integrated |

**Gap:** Europe and Asia retail brokerages (Trade Republic, Scalable Capital,
Degiro, Trading 212, Zerodha, Groww, Tiger, Futu). SnapTrade covers some;
the rest are unaddressed. For these markets, brokerage holdings often surface
through the open banking layer as an investment account, so fixing layer 1
partially fixes this.

---

## 3. Pensions and workplace retirement (the biggest uncovered layer)

For most working adults over 30, the pension **is** the largest asset. We
currently track none of them outside of US brokerage-held IRAs.

| Market | Mechanism | Access |
|---|---|---|
| **UK** | **Pensions Dashboards Programme.** Providers and schemes are legally required to connect by **31 October 2026** | This is the single most timely opportunity in this document. Moneyhub is the leading commercial aggregator positioned on it |
| US | Akoya (Fidelity NetBenefits), Empower, TIAA | Entity + form application each |
| Australia | Superannuation, partially via CDR | Basiq / CDR path |
| EU | No single framework; national pillar-2/3 products vary per country | Manual entry |
| TSP (US federal) | Terms prohibit credential sharing | Ruled out permanently |

**Recommendation:** treat UK Pensions Dashboards as a dated, calendared
opportunity. A "your whole UK pension picture, plus everything else you own"
product in late 2026 is a genuinely differentiated wedge into the UK market.

---

## 4. Crypto (already solved, globally)

Coinbase, Zerion (40+ chains, 8,000+ protocols), 12 native chain clients,
Kraken, Hyperliquid, Polymarket, Alchemy NFTs. This layer needs no geographic
expansion because chains have no geography.

The only regional wrinkle is **exchange availability**: Binance Global, Bybit
and Bitfinex are US-blocked; Binance US, OKX US, Crypto.com and KuCoin are the
US-legal set. A read-only multi-exchange abstraction (CCXT-style) would add
20+ exchanges for roughly the cost of one bespoke integration.

---

## 5. Real assets (US-locked today, and the fix is not more AVM vendors)

### Current state

| Asset | Vendor | Coverage |
|---|---|---|
| Property | RentCast | **US only** |
| Vehicles | MarketCheck | **US only** |
| Metals | GoldAPI | Global (spot price is global) |

### Regional AVM vendors that exist

| Region | Property | Vehicles |
|---|---|---|
| US | RentCast, HouseCanary, ATTOM, Homesage | MarketCheck, Vehicle Databases |
| UK | PropertyData (Land Registry, EPC, planning, valuations in one API) | Brego, One Auto API |
| EU | Fragmented, mostly national portals | CarAPI.dev (MOT/TÜV records + yearly market value), One Auto API |
| Australia | CoreLogic and Domain are B2B only | AutoGrab (rego + VIN valuation) |
| Multi-country | n/a | CarsXE (claims 50+ countries) |

### The better answer: index-based valuation

Chasing an AVM vendor per country is an unbounded integration treadmill with a
per-country contract at the end of each one. The scalable alternative:

> **User enters purchase price and purchase date. We index it forward using a
> free national house price index or a depreciation curve.**

Every developed market publishes a house price index for free: UK Land Registry
and ONS, Eurostat for the EU, ABS for Australia, Statistics Canada, FHFA and
Case-Shiller for the US. Vehicles follow well-known depreciation curves by
segment and age.

This gives **global coverage on day one**, at zero marginal cost per country,
with an accuracy that is honestly labelled ("estimated from regional index")
rather than falsely precise. Keep RentCast and MarketCheck as a US accuracy
upgrade layered on top, not as the mechanism.

This is a strictly better architecture than what is built today and should
replace the "find an AVM for each country" plan.

---

## 6. Currency (the invisible requirement)

Once users are global, every stored value needs a **native currency**, not an
implied USD. Today `lastBalanceGbp`, `lastEquityUsd`, `lastPortfolioUsd` bake
currency into column names, and FX is applied at sync time via Frankfurter.

That is not sufficient for a global product. Required changes:

1. Store `(amount, currency)` per asset, never a pre-converted USD scalar.
2. Convert at **read** time into a user-selected display currency.
3. Store **historical** rates so the net worth time series is not retroactively
   rewritten every time FX moves.
4. Show the user which part of a net worth change was FX and which was real.

Research note: Monarch, Copilot, Simplifi and Empower **do not support
multi-currency at all**. Kubera does, and charges $250 to $3,600 per year for
it. Multi-currency done properly is a real competitive position, not a chore.

---

## 7. Liabilities and credit

Spinwheel gives US bureau data (balances, VantageScore 3.0, utilization).
There is no equivalent consumer-facing API in most other markets.

Outside the US, debt should come from the **open banking layer** (loans, cards
and mortgages appear as accounts with balances). Credit **score** should be
scoped as a US-only feature rather than a core promise, or the product will
feel broken in every other market.

---

## 8. Athanor Works: the entity unlock checklist

The company was formed specifically because a large share of the integrations
in this document gate API access behind a legal entity. This section is the
action list that unlock produces.

### Prerequisites to have in hand before applying to anything

Almost every vendor below asks for the same five things. Assemble them once.

| Item | Why | Notes |
|---|---|---|
| Legal entity name, exactly as registered | Every application form | Must match everywhere. DBAs and trade names are rejected by Apple and by most data vendors |
| EIN / company registration number | Vendor KYB | |
| **Company domain email** (`@athanorworks.com` or `@coiny.app`) | Belvo, Mono, Finverse, and most enterprise signups reject Gmail | This alone unblocked several previously-dead applications |
| **Public website with a real privacy policy and terms** | Plaid, Apple, and every data vendor review this | The privacy policy must specifically describe financial data collection, use, retention and deletion. This is a real gating item, not a formality |
| **D-U-N-S number** registered to the legal entity | Apple Developer **Organization** account requires it | Free from Dun & Bradstreet, allow **up to 5 business days**. Registered legal entity name must match the D&B record exactly |

### Applications now actionable, in recommended order

| # | Vendor | What it unlocks | Requirement notes |
|---|---|---|---|
| 1 | **Apple Developer Organization** | App Store distribution under the company, not a personal name | Needs D-U-N-S. Start this first because of the 5-day D&B lag. Enroller must have authority to bind the entity |
| 2 | **Plaid Production** | Real US bank data | Requires completed application profile, company profile, signed MSA, and a **security questionnaire**. See the Trial-plan note below |
| 3 | **Belvo** | Mexico, Brazil, Colombia, Argentina, Peru, Chile | Previously blocked purely on the Gmail signup wall |
| 4 | **Mono** | Nigeria, Ghana, Kenya, South Africa, Egypt | |
| 5 | **Finverse** or **Brankas** | Singapore, Hong Kong, Philippines, Indonesia, Thailand, Vietnam | Finverse previously returned generic errors without an entity |
| 6 | **Akoya, Empower, TIAA** | US employer-administered 401k and 403b, the largest uncovered US asset class | Form-based, one application each, each with its own data agreement |
| 7 | **Carta** | Private equity and startup cap table positions | Invite-only partner program, expect a slow yes or no |
| 8 | Salt Edge / Tink / Yapily | Commercial terms for wide EU or global coverage | Only worth signing once there is revenue, see §11 |

### Two findings that change the near-term plan

**Plaid Trial plans replaced Limited Production on 2026-04-15.** Teams created
on or after that date get a Trial plan that provides **real production data at
no cost**, supports **up to 10 Production Items**, and grants access to most
OAuth institutions *before* full Production approval. This means real bank data
for a small beta is available without waiting on the full production review.
Confirm which plan the existing Plaid team is on, since the team predates the
cutoff.

**Plaid EU/UK production is a separate process.** Accessing European
institutions in production requires a distinct compliance process, and a
support ticket must be filed to request European production access if the
business is not based in Europe. Athanor Works is US-based, so European
coverage through Plaid carries extra friction. This strengthens the case for
Enable Banking or Tink as the European path rather than stretching Plaid
across both continents.

### One decision this raises

Entity type matters downstream. An LLC satisfies Apple and most data vendors.
A Delaware C-Corp is what `docs/business-plan.md` assumed, and is what any
future venture financing or accelerator will require. If Athanor Works is an
LLC and outside investment is still on the table, converting later is possible
but costs money and lawyer time. Worth settling deliberately rather than by
default.

---

## 9. The cost reality

Every integration in this document has a per-user-per-month cost. Current
estimate is $0.30 (Plaid only) to ~$4 (all integrations). Layering global
aggregators on top pushes the ceiling higher, and aggregators price per
connection, not per user.

Three consequences:

1. **A subscription is structurally required.** There is no free tier that
   survives a user linking eight accounts across three aggregators.
2. **Sync must be scheduled and cached, not live-on-request.** `GET /api/net-worth`
   currently fans out to every external API on every request. That is a cost
   and latency bomb at any real user count. Cache in Postgres, refresh on
   schedule, serve instantly with a `refreshed_at` timestamp.
3. **Tier the integrations.** Free/base tier gets one aggregator plus crypto
   plus manual. Paid tier unlocks the long tail.

---

## 10. Architectural recommendation

There are 35 bespoke API modules in `backend/src/api/`. Each new country today
means a new bespoke module. That does not scale to "global."

Introduce a **connector interface** for anything that behaves like an account
aggregator:

```
link(user) -> redirect/token
accounts(connection) -> [{ id, type, currency, balance, institution }]
transactions(connection, cursor) -> [{ amount, currency, date, category }]
```

Plaid, TrueLayer, Enable Banking, Belvo, Pluggy, Basiq, Mono and Salt Edge all
fit this shape. With the interface in place, adding a region becomes
configuration plus a thin adapter, not a new subsystem. Asset-valuation
integrations (property, vehicles, collectibles) want a second, simpler
interface: `value(holding) -> { amount, currency, asOf, source, confidence }`.

---

## 11. Prioritized sequence

| # | Work | Why now | Blocked? |
|---|---|---|---|
| 1 | Multi-currency data model | Everything global depends on it; retrofitting later is painful | No |
| 2 | Connector interface refactor | Makes every later item cheap | No |
| 3 | Enable Banking (EU/UK) | Fully self-serve, free on own accounts | No |
| 4 | Index-based property + vehicle valuation | Global coverage at zero per-country cost | No |
| 5 | Cached net worth + scheduled sync | Cost and latency, needed before any real users | No |
| 6 | Plaid production application | Entity now exists | No |
| 7 | Pluggy (Brazil) + Belvo retry (LatAm) | Entity now exists | No |
| 8 | UK Pensions Dashboards positioning | Legally mandated connection deadline 31 Oct 2026 | Timing |
| 9 | Salt Edge or Tink consolidation | Only worth the contract once there is revenue | Revenue |
| 10 | Mono, Brankas, Setu, Tarabut | Long tail of regions | Revenue |

---

## Sources

- [Open Banking Tracker, API aggregator comparison](https://www.openbankingtracker.com/api-aggregators/compare)
- [Open Banking Tracker, best providers for developers 2026](https://www.openbankingtracker.com/blog/best-open-banking-api-providers-developers-2026)
- [Open Banking Tracker, free and indie open banking APIs](https://www.openbankingtracker.com/guides/free-open-banking-apis)
- [Open Banking Tracker, banking data aggregation](https://www.openbankingtracker.com/banking-data-aggregation)
- [Open Banking Compare, best providers for developers 2026](https://www.openbankingcompare.com/blog/best-open-banking-api-providers-for-developers-2026)
- [Pluggy, Open Finance Brasil](https://github.com/pluggyai/meu-pluggy)
- [Belvo API docs](https://developers.belvo.com/apis/belvoopenapispec)
- [Setu Account Aggregator](https://setu.co/data/financial-data-apis/account-aggregator/)
- [SnapTrade vs Wealthica, 2026](https://wealthica.com/blog/snaptrade-vs-wealthica/)
- [UK Pensions Dashboards Programme](https://www.pensionsdashboardsprogramme.org.uk/)
- [Moneyhub data aggregation](https://moneyhub.com/products/data-aggregation/)
- [PropertyData UK API](https://propertydata.co.uk/api)
- [AutoGrab valuation API, Australia](https://docs.autograb.com.au/guide/valuation/)
- [Brego UK vehicle valuations](https://brego.io/products/api)
- [Multi-currency net worth tracker comparison](https://popadex.com/multi-currency-net-worth-tracker)
- [Kubera review 2026](https://www.wallstreetzen.com/blog/kubera-app-review/)
- [Open Banking Tracker, Saudi Arabia directory](https://www.openbankingtracker.com/providers/country/sa)
- [Plaid: Sandbox, Production, Trial plan and Limited Production differences](https://support.plaid.com/hc/en-us/articles/16110110883479-How-are-Sandbox-Production-Trial-plan-and-Limited-Production-different)
- [Plaid launch checklist](https://plaid.com/docs/launch-checklist/)
- [Plaid: access to OAuth institutions](https://support.plaid.com/hc/en-us/articles/15769780649751-How-do-I-get-access-to-OAuth-institutions)
- [Apple Developer: D-U-N-S number requirements](https://developer.apple.com/help/account/membership/D-U-N-S/)
- [Apple Developer: program enrollment](https://developer.apple.com/help/account/membership/program-enrollment/)
