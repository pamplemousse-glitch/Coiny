# Asset Coverage Map

*Compiled 2026-08-21. Every asset class a person can own, every API that could
represent it, whether we have access, what it costs, and what the licence
forbids.*

**Why this file exists.** The answer to "what do we cover and what would it take
to cover more" was spread across five documents and had to be reassembled by
hand each time it was asked. This is the single table.

**Sources it consolidates:** `api-inventory.md` (what we call today),
`asset-api-atlas-2026-08.md` (the five-sweep research), `crypto-pricing-atlas-2026-08.md`,
`global-integration-map.md` (regional coverage), plus a live sweep of fifteen
alternative-asset classes none of those covered.

---

## How to read the status column

| | Meaning |
|---|---|
| **LIVE** | Built, keyed, working |
| **DEAD KEY** | Built and throwing. A free signup away |
| **BLOCKED** | Built and deliberately disabled. Not a key problem |
| **MANUAL** | User types a value. No automatic pricing |
| **NONE** | Not represented at all |

**The column that actually decides things is "Paid-app OK?".** Most of what
follows fails there rather than on availability or price. A licence that
forbids charging for a feature built on the data is a disqualifier for a
subscription app, not a footnote.

---

## 1. Cash, banking and transactions

| Asset | Status | Provider | Access | Price | Paid-app OK? |
|---|---|---|---|---|---|
| US/CA bank accounts | **LIVE** | Plaid | Have it | $0 on Trial's 10 Items | Yes |
| UK/EU bank accounts | **LIVE** | TrueLayer | Have it | Sandbox free; live needs paid Scale | Yes |
| UK/EEA indie path | **NONE** | Enable Banking | Self-serve | Free on your own accounts | Yes |
| Budget accounts | **LIVE** | YNAB | Have it | Free | Yes |
| PayPal, Venmo, Cash App | **LIVE** | via Plaid | Have it | — | Yes |
| Brazil / AU / Canada | **NONE** | Pluggy / Basiq / Flinks | Self-serve | Free tiers, then minimums | Yes |
| Gift card balances | **NONE** | — | — | — | **No API exists.** Issuer APIs are merchant-side only |

## 2. Investments, brokerage and retirement

| Asset | Status | Provider | Access | Price | Paid-app OK? |
|---|---|---|---|---|---|
| Brokerage holdings | **LIVE** | Plaid Investments | Have it | Per-Item subscription | Yes |
| US brokerage direct | **LIVE** | Alpaca | Per-user keys | Free | Yes |
| **RSU/ESPP vesting** | **LIVE** | Plaid `vested_value` | Have it | Free | Yes |
| 401(k) at Fidelity NetBenefits | **NONE** | **Akoya** | Sandbox self-serve; production = security review | Sandbox free; production unpublished | Yes |
| 401(k) at Empower | **NONE** | **Empower** | Self-serve signup, then per-API approval | Unpublished | Yes — only API advertising **vesting balances** |
| Startup equity / cap table | **NONE** | **Carta** | Playground self-serve; production needs demo + form | Unpublished | Yes. Startup equity only, never public-company RSUs |
| Pre-IPO secondary marks | **NONE** | Caplight | Sales-gated | Institutional pricing | Likely prohibitive |
| TIAA, Vanguard workplace, US TSP | **MANUAL** | — | — | — | **No API at any price** |
| UK Pensions Dashboard | **NONE** | — | Requires FCA authorisation | — | **Regulatory moat, not a signup** |

## 3. Crypto

| Asset | Status | Provider | Access | Price | Paid-app OK? |
|---|---|---|---|---|---|
| Coinbase, Kraken, Alpaca, Hyperliquid | **LIVE** | direct | Per-user keys | Free | Yes |
| DeFi across 50+ chains | **LIVE** | Zerion | Have it | Tiered, ~$0.01/req anchor | Yes |
| 13 chains incl. staking | **LIVE** | various | Mostly keyless | Free | Yes |
| Long-tail token prices + liquidity | **LIVE** | DexScreener | No key | Free | Yes, bar building a competitor |
| NFTs | **LIVE** | Alchemy | Have it | Free tier | Yes |
| TON | **DEAD KEY** | TonCenter | Self-serve | Free tier | Yes |
| Binance, Bybit, OKX, Gemini | **NONE** | direct | Self-serve read-only keys | Free | Yes — connector work, not an access problem |
| Scam-token detection | **NONE** | GoPlus | Self-serve | Free | Yes |
| Monero | **NONE** | — | — | — | **Impossible.** Ring signatures; no API can ever read it |
| CoinGecko / CoinMarketCap | — | — | — | — | **No.** Free tiers not licensed for commercial use |

## 4. Real assets

| Asset | Status | Provider | Access | Price | Paid-app OK? |
|---|---|---|---|---|---|
| Property (derived) | **LIVE** | FRED / FHFA index | No key | Free | Yes |
| Property (AVM) | **DEAD KEY** | **RentCast** | Self-serve | 50/mo free, then $74/mo | Yes |
| Property, EU 27 states | **NONE** | Eurostat | No key | Free | Yes — best effort-to-value ratio in this file |
| Property, UK | **NONE** | HM Land Registry | No key | Free | Yes |
| Vehicle identity | **LIVE** | NHTSA vPIC | No key | Free | Yes |
| Vehicle value | **DEAD KEY** | **MarketCheck** | Self-serve | 500/mo free, then **$299/mo** | Yes |
| Classic/collector cars | **MANUAL** | Hagerty | Sales-gated | Unpublished | Unclear |
| Precious metals | **LIVE** | GoldAPI | Have it | Free tier | Yes |
| Energy commodities | **LIVE** | EIA | Have it | Free | Yes |
| Farmland | **LIVE** | USDA NASS | Have it | Free | Yes, US only |
| Aircraft, boats, timeshares | **MANUAL** | — | — | — | **No API of any kind found** |

## 5. Collectibles

| Asset | Status | Provider | Access | Price | Paid-app OK? |
|---|---|---|---|---|---|
| Sneakers | **LIVE** | KicksDB | Have it | Free tier | Yes |
| Pokémon cards | **LIVE** | PokemonPriceTracker | Have it | Free tier | Yes |
| Trading cards | **LIVE** | TCGapi | Have it | Free, 100/day | Yes |
| Graded coins | **LIVE** | PCGS | Have it | Free tier | Yes, but **retains image rights** |
| **Vinyl** | **BLOCKED** | Discogs | Have the key | Free | **Needs written permission** — see below |
| Coins & stamps (broad) | **NONE** | **Numista** | Self-serve | 2,000/mo free; commercial €100 setup + €100/mo | **Yes — cleanest terms found anywhere.** Requires N# display + attribution, 7-day cache limit |
| Comics | **NONE** | GoCollect | Account + request | Free tier; Pro gates endpoints | Unconfirmed — ask before building |
| Card authentication | **NONE** | PSA | Self-serve token | Free | Yes, but **cert lookup only, no pricing** |
| Card pricing (deep) | **NONE** | Card Ladder | Enterprise sales | Unpublished | Unclear |
| **Watches** | **MANUAL** | WatchCharts | — | +50% w/ attribution, +100% white-label | Yes, at a surcharge |
| Watch metadata | **NONE** | WatchBase | Self-serve | $0.30/entry | Yes — **specs only, no valuation** |
| **Wine & whisky** | **MANUAL** | Liv-ex, Wine-Searcher | Trade membership | Bundled/unpublished | Built for merchants; awkward fit |
| **Art** | **MANUAL** | Artprice, Artnet | Subscription terminals | $29–749/mo | **Not licensable for embedding** |
| Musical instruments | **MANUAL** | Reverb | Self-serve | Credit-based | **Likely no** — ToS bars charging for features integrating the API |
| Handbags | **MANUAL** | Rebag Clair | — | — | **No third-party API exists** |
| Firearms | **MANUAL** | GunBroker | Self-serve dev key | Unpublished | Unclear for resale |
| LEGO | **NONE** | Rebrickable | Self-serve | Free | **Yes — one of only two clean image sources** |

## 6. Liabilities

| Asset | Status | Provider | Access | Price | Paid-app OK? |
|---|---|---|---|---|---|
| Credit cards, mortgages, loans | **LIVE** | Plaid Liabilities | Have it | Per-Item subscription | Yes |
| Student & consumer debt | **LIVE** | Spinwheel | Sandbox keyed | Prod needs a rep, unpublished | Ask lawyer Q8 first (FCRA) |
| Broader US liabilities, medical debt | **NONE** | Method Financial | Sales | Unpublished | Worth evaluating |
| BNPL (Klarna, Afterpay) | **MANUAL** | — | — | — | **Deliberately not reported to bureaus.** No API will ever surface them |

## 7. The interesting one nobody does

| Asset | Status | Provider | Access | Price | Paid-app OK? |
|---|---|---|---|---|---|
| **Points, miles** | **NONE** | **AwardWallet** | Business account + key request | $4/managed member/mo; API quote-based | Intended use case, but **no public commercial ToS** — confirm first |

607 loyalty programmes. Real cash value, near-universal, and essentially nobody
in personal finance counts it as net worth. The single largest-population gap
with a working API behind it.

## 8. Domains

| Asset | Status | Provider | Access | Price | Paid-app OK? |
|---|---|---|---|---|---|
| Domain names | **NONE** | **HumbleWorth** | Self-serve, no account gate | **Free, unlimited** | Appears unrestricted — **verify ToS in writing** |
| | | GoDaddy Appraisals | Paid tier | $109.99/mo for API volume | Yes |

---

## Permanent gaps: no API at any price

Manual entry is the engineering answer, not an integration hunt. Ranked by how
much of a typical net worth they represent:

1. **Employer equity at unreachable recordkeepers** — 20–50% of net worth for
   tech workers. Plaid reaches it where the plan is connectable; Fidelity
   NetBenefits needs Akoya; Shareworks has no consumer flow at all.
2. **Life insurance cash surrender value.** Large when present. No carrier or
   aggregator exposes it.
3. **TreasuryDirect / I-Bonds, NS&I.** Permanent. TreasuryDirect moves to ID.me
   in Oct 2026, tightening further.
4. **Defined-benefit pensions.** Portal-only everywhere.
5. **Royalties and IP income.** Marketplaces value in-house; no lookup product.
6. Trusts, DAFs, private business value, timber and water rights, franchise
   interests.

## Disqualified by licence, not availability

Recorded so nobody re-derives them:

- **Artsy** — explicitly non-commercial, public-domain works only
- **StockX** — bars acting "on behalf of any third party"; small apps rejected
- **BrickLink** — permits display, **prohibits charging** for features built on it
- **Reverb** — ToS bars charging for the part of an app integrating the API
- **Interactive Brokers** — Non-Commercial Licence forbids serving other users
- **CoinGecko / CoinMarketCap** free tiers — not licensed commercially
- **eBay sold comps** — Limited Release, closed to new applicants
- **Zillow Zestimate** — retired 2021; only path back is MLS-gated Bridge at $500+/mo

## The Discogs situation

Vinyl is built, keyed, and **serves $0 on purpose**. DR-10 pins it because
Discogs marketplace data is Restricted Data: no commercial use without written
permission, mandatory attribution, and nothing older than six hours may be
displayed.

Re-enabling needs all three together — permission, both attribution strings,
and the six-hour staleness rule, which needs scheduler work. **It is a request,
not a fee.** Worth asking.

---

## What to do, in order

**Free, self-serve, unblocks a class today:**

1. `RENTCAST_API_KEY` — property AVM
2. `MARKETCHECK_API_KEY` — vehicles
3. `TONCENTER_API_KEY` — TON wallets

**Free, not asset coverage, but ranks above all of the above:**

4. `APPLE_SIGN_IN_*` — account deletion cannot revoke the Apple grant, which
   TN3194 requires. An App Review rejection risk.

**Start now because the wait is the cost:**

5. **Akoya** and **Empower** sandboxes — the only routes to workplace 401(k),
   and Empower is the only API advertising vesting
6. **Carta** playground — startup equity
7. **Discogs** written permission — unblocks a class we already built

**Cheap wins with clean licences:**

8. **Eurostat** — all 27 EU states in one integration, no key
9. **Numista** — the only alternative-asset API in this file with published,
   self-serve, unambiguous commercial terms
10. **GoPlus** — free scam-token detection

**Explicitly do not pursue:** Reverb, Rebag, Artprice/Artnet, Royalty Exchange,
livestock and machinery, CoinGecko/CoinMarketCap free tiers.

---

## Where the money actually is

*Added 2026-08-21. The map above answers "what could we add". This answers
"what is worth adding", which is a different question and has a less
comfortable answer.*

**Source:** Federal Reserve Survey of Consumer Finances 2022, the authoritative
US dataset, plus the Fed's Distributional Financial Accounts. **Caveat that
applies to every number here:** SCF 2022 was released Oct 2023 and the 2025
wave does not publish until late 2026, so this predates the crypto ETF boom and
the 2024-26 run-up.

| Asset | % of households owning | Median value when owned |
|---|---|---|
| Checking / savings | **98.6%** | $8,000 |
| Vehicles | **86.6%** | $27,700 |
| Primary residence | **66.1%** | $323,200 |
| Retirement accounts (401k/IRA) | **54.3%** | $86,900 |
| Direct stocks | 21.0% | $15,000 |
| Cash-value life insurance | 16.1% | $9,700 |
| DB pension | 15.6% (was 40% in 1992) | n/a |
| Private business equity | 14.6% | $90,000 (mean $1.62M) |
| Other real estate | 12.9% | $225,000 |
| Mutual funds / ETFs | 11.5% | $150,000 |
| CDs | 6.5% | $26,000 |
| Savings bonds | 6.4% | $2,000 |
| **Crypto** | **4.3%** | not reported |

**The single strongest signal in the dataset:** households with a retirement
account have a median net worth of **$442,900** against **$47,450** for those
without. It is the largest predictor of net worth there is.

**It changes by wealth decile.** For the bottom 50%, roughly half of assets are
real estate and the balance sheet is essentially home equity plus retirement.
For the top 1% and the 90th-99th, real estate drops below 20% and **equities
are about half of assets**. A mass-market app lives on home equity and
retirement; an affluent-skewing app lives on brokerage.

### What this says about our priorities

**Ranks 1 through 5 — cash, retirement, home equity, brokerage, vehicles — are
the whole game, and we already cover four of them.** The gap is workplace
retirement at recordkeepers Plaid cannot reach, which is exactly what Akoya and
Empower unlock, and which is the highest-value application on the list above.

**Employer equity (RSU/ESPP) is the strongest differentiator.** No competitor
handles it natively, and it is disproportionately relevant to the tech
professional most likely to pay $99-169/yr. We shipped vested-value handling on
2026-08-20. Note honestly that its ranking rests on inference from buyer
demographics, not on a measured prevalence statistic — no source isolates
personal-finance-app users.

**Crypto is a loud minority, not a driver.** SCF says 4.3%; 2026 panel surveys
claim 22-42% but are not SCF-grade and mix "ever owned" with "currently hold".
What is consistent everywhere is that holdings are **small**: most holders sit
between $100 and $5,000. It generates support demand out of all proportion to
its balance-sheet weight. Our crypto depth is already well beyond what this
justifies, which is fine as a differentiator but should not absorb more effort.

**Collectibles are unproven, and we have a lot of them.** There is NO SCF or
DFA breakout for cards, coins, sneakers, wine, art, domains or loyalty points;
they fall into a residual bucket that is historically small. The
$320-535B "collectibles market" figures measure trading volume, not household
ownership, and are not a demand proxy. **Treat as vanity features until our own
users prove otherwise.** This is a pointed finding given how much of the app is
collectibles, and it is recorded rather than softened.

### The tension worth naming

`market-research-2026-08.md` §3.1 finds the top reason people quit this
category is **broken connections, "by a distance"** — not missing asset
classes. §1.3 finds the core FIRE audience is spreadsheet-first and actively
distrusts integrations.

Competitor evidence agrees: Monarch's most-cited complaint is investment
connection reliability, not breadth.

**So every integration added expands the surface area of the number-one churn
cause.** Breadth is a real position — Kubera charges $249/yr and markets it
explicitly — but it is not free, and it trades against the thing that retains
people.

The resolution is a third axis beyond prevalence and value: **how likely is
this to break, and what happens to trust when it does.** A class DR-21's
derived tier can serve — property from purchase price plus an index, vehicles
from a VIN — beats a class needing a fragile credentialed connection, even
when the fragile one holds more dollars. That is an argument for finishing the
derived tier before adding vendors.

---

## Honesty notes

- Prices marked unpublished are genuinely sales-gated. Nothing here is guessed.
- Plaid's claimed coverage of 401(k)/HSA/529/RRSP/TFSA is a documentation
  claim, not something observed against a live login.
- HumbleWorth's and AwardWallet's commercial terms could not be verified from
  their own pages. Confirm in writing before building.
- The licence readings here are what public documentation says. None has been
  reviewed by a lawyer, and §5's posture is to avoid the question rather than
  rely on the reading.
- Nothing in the collectibles section has been tested against a live key.
