# Asset API Atlas

*Researched 2026-08-19 across five parallel sweeps: bank/cash, investments and
pensions, real assets, collectibles, and everything else. Companion to
`global-integration-map.md`, which it extends rather than replaces: that file
owns the regional banking argument, this one owns "for any asset a person can
own, is there an API, and can a solo bootstrapper get it".*

**The filter applied throughout:** a solo US founder on a US LLC, no funding,
very limited capital. Every provider is sorted into **self-serve today**,
**needs an entity or a contract**, or **closed to indies**. A free tier and a
signup form beat a better API behind a sales call.

**Read the honesty note before acting on any figure.** Several prices below come
from third-party SaaS-pricing aggregators rather than vendor pricing pages,
because most of these vendors keep production pricing behind a sales gate.
Directionally right, verify before committing.

---

## 1. What to do next, in order

1. **Nothing new for the US.** Plaid's free Trial already gives real production
   bank data on 10 Items, and PayPal, Venmo and Cash App are reachable *through
   Plaid* rather than as separate integrations. The US is covered.
2. **Enable Banking when Europe matters**, not before, and after multi-currency
   exists. Self-serve, and its Restricted Production tier is free against
   accounts you personally own. It is the confirmed successor to the free-EU-
   banking era GoCardless ended.
3. **Build manual entry properly**, because it is the only answer for the
   largest gaps: employer equity (RSUs, ESPP, options), life insurance cash
   value, and every direct-from-government savings product. These are not
   backlog items waiting on an integration; no API exists at any price.
4. **Free national house price indices** are the highest-leverage cheap win for
   property. One Eurostat integration covers all 27 member states.
5. **Do not ship vendor images.** See §5. The licensing is worse than the
   availability.

---

## 2. Confirmed dead ends

These are settled. Recorded so nobody spends another evening looking.

| Thing | Status |
|---|---|
| **GoCardless Bank Account Data** (ex-Nordigen) | New signups disabled since July 2025, stated on their own status page |
| **Okra** (Nigeria) | Company shut down May 2025 and returned investor funds |
| **TreasuryDirect** personal holdings | No API. Only aggregate public Treasury data is exposed. Moving to ID.me login Oct 2026, tightening further |
| **NS&I Premium Bonds** | No official developer API. Third-party prize-checkers hit undocumented endpoints |
| **UK State Pension forecast** | Government Gateway login only |
| **US TSP** | No API, and TSP actively warns against sharing credentials with third parties |
| **Australian superannuation via CDR** | Not live. Banking (2020) and energy (2022) only; super is a proposed future sector with no date |
| **India EPF, PPF** | Account Aggregator status still "Proposed", zero live data providers |
| **Japan NISA / iDeCo, Hong Kong MPF** | No personal-holdings read API |
| **Robinhood** stocks/options | No official API; ToS bans automation. Crypto only |
| **Trading212, Degiro** | No public API |
| **Zillow / Zestimate API** | Retired 2021. Only path back is MLS-gated Bridge Interactive at $500+/mo |
| **Edmunds Open API** | Closed to new developers, existing partners only |
| **ABS house price index** (Australia) | Discontinued after Dec 2021, no free successor |
| **GOAT, Chrono24** | No official API exists at all. Everything available is unauthorised scraping |
| **eBay Marketplace Insights** (sold comps) | Limited Release, closed to new applicants. Browse API (active listings) is fine |
| **Aircraft, boat, self-storage, parking, timeshare valuation** | No API of any kind found |
| **China consumer account aggregation** | Claims that Plaid/Tink/TrueLayer reach Chinese banks appear only in low-quality SEO sources and are contradicted by the providers' own coverage pages. Treat as false |

---

## 3. Bank and cash

**Self-serve today:** Plaid (US/CA, free Trial on real data, 10 Items), Enable
Banking (UK/EEA, free on your own accounts), TrueLayer (dev tier free, real
accounts need paid Scale), Pluggy (Brazil), Basiq (AU/NZ, free credits then a
12-month minimum on paid), Yapily Connect (under Yapily's own AISP licence),
Akoya (sandbox self-serve, production vetted), Flinks (Canada, free sandbox),
Salt Edge (73 countries, sandbox free, production sales-quoted).

**Entity or contract:** Tink, Belvo, Mastercard/Finicity, MX, Tarabut, Brankas,
Finverse, Mono, Setu (India AA needs an RBI-licensed intermediary).

**Neobanks and wallets:** Revolut, Monzo, Starling, N26 and Nubank are regulated
banks reachable as ordinary panel banks through the aggregators above, so they
need no separate work. PayPal, Venmo, Cash App and Coinbase are reachable
**through Plaid**. Wise, Alipay, WeChat Pay and M-Pesa expose merchant/payments
APIs, not consumer balance reads.

---

## 4. Investments, pensions and tax-advantaged wrappers

**The single most useful fact for us:** Plaid Investments already claims ~20
account types including 401(k), 403(b), HSA, 529, RRSP and TFSA. Per-provider
live-data reliability is unverified without testing a real login, but the
subtypes arrive on the wire today. This is what
`backend/src/networth/account-taxonomy.ts` now classifies.

**Self-serve:** Plaid Investments (US/CA), SnapTrade (~30 US brokerages, has a
sandbox), Schwab Individual Developer (scoped to the developer's own accounts),
eToro Builders, Saxo sandbox, Zerodha Kite Connect Personal (free, India),
Upstox, Tiger. Market data: Twelve Data (800 req/day, 50+ exchanges, best free
breadth), Finnhub, Alpha Vantage (25 req/day).

**Watch the licence, not just the API:** Interactive Brokers' Non-Commercial
Licence forbids building a product for *other* users' accounts. Fine for your
own portfolio, not for Coiny's customers without a separate deal.

**Entity-gated:** Akoya (Fidelity NetBenefits, Empower, TIAA), Moneyhub,
Flinks, Carta/Pulley, Singapore CPF via Singpass, India NPS.

### The UK Pensions Dashboard, honestly

The 31 October 2026 connection deadline is real. But it obligates *schemes* to
connect; consuming that data in a commercial app requires becoming an
FCA-authorised "qualifying pensions dashboard service" firm under PS24/15. That
is a full regulatory authorisation, not a developer signup. **It is a moat for
incumbents, not an opening for us.** The earlier note in
`global-integration-map.md` §3 calling it "the single most timely opportunity"
should be read with this correction attached.

---

## 5. Collectibles, and the image question

**The answer on images is: don't, for now.**

Almost every provider that returns good pricing either omits a per-item photo or
gives you one without a commercial redisplay licence. Specifically:

- **Artsy is explicitly non-commercial** and limited to public-domain works. Do
  not integrate it in a paid app.
- **StockX's licence bars using the service "on behalf of any third party"**,
  and applications from small apps have been rejected. High risk.
- **GOAT and Chrono24 have no official API**; everything is scraping.
- **WatchCharts prices display as a separate, more expensive licence tier** —
  50% surcharge with attribution, 100% white-label.
- **Discogs** permits commercial use but images must stay proxied through
  Discogs URLs, be under 6 hours stale, and you may not charge for features
  Discogs gives away free.
- **BrickLink** allows display but prohibits *charging* for features built on
  its data, which matters for a subscription app.
- **PSA's actual API End User Agreement is not public**; the adjacent T&C only
  licenses displaying the certification *label*, not the card photo.
- **PCGS retains image rights** even where TrueView images are described as
  freely usable.

**The two clean ones:** **Rebrickable** (free, self-serve, official LEGO set
images) and, with the charging caveat, BrickLink.

**Recommended posture:** pull the *value* from the API, and for the picture
either let the user upload their own photo or show a category icon. Revisit
per-vendor only when a specific licence has been read in full.

**Worth knowing:** **GemRate** is the one credible multi-grader cert aggregator
(PSA/BGS/SGC/CGC) and has a dedicated images endpoint, but it is apply-first
with unpublished pricing. There is no official CGC, SGC or Beckett API.

---

## 6. Real assets

**Property, the cheap global strategy.** The "user enters purchase price and
date, we index it forward" approach sidesteps the fact that almost every
valuation-grade AVM is entity-gated or enterprise-priced. Free official indices:

| Country | Source | Auth |
|---|---|---|
| US | FHFA HPI; FRED (Case-Shiller) | None; free key |
| UK | HM Land Registry UK HPI + Price Paid Data | None |
| **EU, all 27** | **Eurostat `prc_hpi_a` / `prc_hpi_q`** | **None** |
| France | DVF, transaction-level rather than an index | None |
| Spain | INE IPV (Tempus3 JSON) | None |
| Japan | MLIT Real Estate Information Library, licence explicitly permits commercial use | Free key |
| Canada | Teranet–National Bank HPI, CSV/PDF only, no API | — |
| Australia | **No free current national index** since ABS discontinued its own | — |

The single Eurostat integration is the best return on effort in this document.

**Paid but self-serve:** RentCast (50 calls/mo free, then $74/mo), HouseCanary
($79/mo), PropertyData UK (£28/mo).

**Vehicles.** Identity is free, value is not, anywhere. **NHTSA vPIC** decodes a
VIN free with no key; the UK's **DVLA VES** and **DVSA MOT History** APIs are
free and official. For value, the cheapest self-serve are CarsXE (100 free
sandbox calls) and VinAudit. KBB, Edmunds, JD Power/NADA and Autovista are all
closed or enterprise. Note the strategy does **not** transfer from property:
cars follow a depreciation curve, not an index.

**Farmland:** USDA NASS (already integrated) is the only thing that exists, and
only for the US.

---

## 7. The gaps that no API can close

Ranked by how much of a typical person's net worth they represent. For all of
these the correct engineering answer is **good manual entry**, not an
integration hunt.

1. **Employer equity: RSUs, ESPP, options.** Can be 20–50% of net worth for the
   tech-sector users most likely to be early adopters. Fidelity NetBenefits and
   Shareworks have no consumer connection flow; Carta's APIs serve cap-table
   admins, not individual holders.
2. **Life insurance cash surrender value.** Large when present. No carrier or
   aggregator API exists at all.
3. **Direct government savings**: TreasuryDirect, NS&I. Permanent.
4. Trusts, private business value, royalties, receivables, club equity,
   timber/water rights, franchise interests, Islamic finance instruments.

**One genuinely interesting opportunity:** points, miles and gift-card balances.
Near-universal, real cash value, and essentially nobody in personal finance
treats them as net worth. **AwardWallet** has a real aggregation API across 607
loyalty programs, pricing unpublished. It is the only large-population gap here
with a working API behind it, and it fits Coiny's "everything you own"
positioning.

**On liabilities:** Klarna and Afterpay deliberately do not report short-term
BNPL to credit bureaus, so no credit-pull API will ever surface them. Affirm
does report to Experian. UK Student Loans Company, Australian HECS-HELP,
Canadian NSLSC and IRS tax debt are all login-only with no API. **Method
Financial** is worth evaluating as a broader US liability sweep alongside
Spinwheel, particularly for medical debt.

---

## 8. Honesty notes

- Exact prices for Pluggy, Setu and Salt Edge come from third-party aggregators,
  not vendor pages. Verify before committing.
- Plaid's claimed coverage of 401(k)/HSA/529/RRSP/TFSA is a documentation claim,
  not something we have observed against a live login. Test before promising it
  in the product.
- Zoopla's developer programme status is ambiguous across sources.
- Whether a non-Korean founder can register for KFTC MyData at all is unverified;
  treat as closed until proven otherwise.
- Nothing here has been re-verified against the vendors' own terms by a lawyer.
  The image-licensing section in particular describes what was found in public
  documentation, and §5's recommendation is to avoid the question rather than to
  rely on that reading.
