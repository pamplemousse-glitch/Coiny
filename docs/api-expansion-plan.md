# API & Integration Expansion Plan
_Last updated 2026-05-25. Deep-dive research across all vendor docs and asset classes._

Goal: the most complete net worth picture possible, with every integration that feeds pet reactions.

---

## What We Already Have

| Category | Service | Notes |
|---|---|---|
| Bank accounts, transactions | Plaid | 12,000+ institutions |
| Investments (IRA, Roth, SEP, 401k, 403b, HSA, 529) | Plaid Investments | 2,400+ institutions |
| Liabilities (credit cards, student, auto, mortgage, BNPL, HELOC, personal) | Spinwheel | Direct bureau pull — Equifax/TransUnion/Experian |
| Credit score + utilization | Spinwheel | VantageScore 3.0 |
| Centralized crypto (Coinbase Advanced Trade) | Coinbase API | JWT auth — Advanced Trade users only |
| On-chain wallets, EVM DeFi, Solana, TRON | Zerion | 40+ chains, 8,000+ protocols |

---

## Existing Vendors — Expansion

### Plaid

**P0 — Directly feed pet reactions**

**Recurring transactions detection**
- Add `RECURRING_TRANSACTIONS_UPDATE` webhook handler.
- Call `POST /transactions/recurring/get` after webhook fires.
- Surface recurring debits/credits in the pet rules engine: subscription spike → sad face, recurring savings transfer → happy face.
- Schema fields: `streams[].frequency`, `streams[].average_amount.amount`, `streams[].merchant_name`, `streams[].is_user_modified`.

**Liabilities detail fields**
- Expand `PlaidLiabilitySchema` to include:
  - `credit_accounts[].is_overdue`
  - `credit_accounts[].minimum_payment_amount`
  - `credit_accounts[].next_payment_due_date`
  - `credit_accounts[].aprs[].apr_percentage`
  - `student_accounts[].minimum_payment_amount`
  - `student_accounts[].next_payment_due_date`
- Powers "due date approaching" and "high APR" pet reactions.

**`LIABILITIES: DEFAULT_UPDATE` webhook**
- Wire up handler (same pattern as `TRANSACTIONS_UPDATES`).
- On receipt: re-fetch liabilities, recalculate credit utilization, trigger sad face event.

**P1 — Data completeness**

**Investments transactions**
- Add `INVESTMENTS_TRANSACTIONS` webhook.
- Call `POST /investments/transactions/get` on receipt.
- Feed a "portfolio activity" event type.
- **[ACTION]** Enable `investments` product in Plaid Dashboard for your item.

**`NEW_ACCOUNTS_AVAILABLE` webhook**
- Handler: log it, optionally prompt re-link in iOS app.

**`PENDING_EXPIRATION` + `PENDING_DISCONNECT` webhooks**
- On `PENDING_EXPIRATION`: surface an in-app nudge to re-auth.

**P2 — Stretch**
- Payment initiation — not available on Plaid sandbox in US; skip for now.
- **[ACTION]** Confirm `recurring_transactions` product is enabled on your sandbox item.

---

### Coinbase

**P0 — Directly feed pet reactions**

**Staking / earn transaction classification**
- Add `classifyTransaction(type: string): CoinbaseTxClass` helper:
  - `earn_payout`, `staking_transfer` → `'earn'`
  - `unstaking_transfer` → `'unstake'`
  - `advanced_trade_fill` → `'trade'`
  - `wrap_asset`, `unwrap_asset` → `'defi'`
  - `send`, `receive` → `'transfer'`
  - everything else → `'other'`
- Feed `earn` events to the pet rules engine.

**Spot price caching**
- Add in-process TTL cache (60s) — `Map<string, { price: number; fetchedAt: number }>`.
- No new deps: plain Map + `Date.now()`.

**P1 — Data completeness**

**Portfolio summary via `/api/v3/brokerage/portfolios`**
- Returns `total_cash_equivalent_balance`, `total_crypto_balance`, `unrealized_pnl`.
- Add `getPortfolioSummary(): Promise<{ totalCash: number; totalCrypto: number; unrealizedPnl: number } | null>`.

**P2 — Stretch**
- WebSocket feed — overkill until sub-minute reactions are needed.
- **[ACTION]** Coinbase webhooks not available for personal accounts — polling is correct.

---

### Zerion

**P0 — Directly feed pet reactions**

**Per-token positions**
- `GET /v1/wallets/{address}/positions/` with `filter[positions]=no_filter&filter[trash]=only_non_trash&currency=usd`.
- Returns `attributes.value`, `attributes.quantity.float`, `attributes.fungible_info.symbol` per token.
- Fires "token up/down X%" events.
- Add `getPositions(address: string): Promise<ZerionPosition[]>` to `src/zerion/client.ts`.

**Portfolio 1d change**
- `/portfolio/` already includes `changes.absolute_1d` and `changes.percent_1d` — not yet surfaced.
- Expand `ZerionPortfolioSchema` to capture these. Feed daily change to pet rules engine.

**P1 — Data completeness**

**Realized/unrealized PnL**
- `GET /v1/wallets/{address}/pnl` — `unrealized_gain`, `realized_gain`, `total_gain`.
- Add `getPnl(address: string)` function.

**DeFi-specific positions**
- Second positions call with `filter[positions]=only_complex` — LP positions, staked assets.

**Distribution by chain / type**
- `positions_distribution_by_chain` and `positions_distribution_by_type` are already in the portfolio response but stripped by Zod schema. Expand to capture them.

**P2 — Stretch**
- Webhook subscriptions — **[ACTION]** Email `api@zerion.io` to request whitelist. Include use case and server URL.
- NFT portfolio, price charts — low priority for v1.

---

### Spinwheel

**P0 — Directly feed pet reactions**

**Liability balance refresh**
- `POST /v1/users/{spinwheelUserId}/liabilities/refresh` — real-time pull of current balances.
- Call after user requests refresh or on `NEW_LIABILITIES_REPORTED` webhook.
- Response is async: Spinwheel fires webhook when refresh completes.

**Spinwheel webhooks**
- We currently have no Spinwheel webhook handler. High-value events:
  - `USER_CREDIT_PROFILE_TRANSACTION` — new payment posted; re-fetch + trigger pet reaction.
  - `NEW_LIABILITIES_REPORTED` — new account opened; re-fetch + alert user.
  - `USER_LIABILITY_ACCOUNT_TRANSITION` — account status change (default, paid off).
  - `USER_DEBT_PROFILE_UPDATED` — general refresh complete.
- Add `POST /webhooks/spinwheel` route (same pattern as `/webhooks/plaid`).
- **[ACTION]** Register endpoint in Spinwheel Dashboard → Settings → Webhooks → add `https://<fly-app>.fly.dev/webhooks/spinwheel`. Note the signing secret → Keychain as `coiny-spinwheel-webhook-secret`.

**Monthly auto-refresh subscription**
- `POST /v1/users/{spinwheelUserId}/subscriptions` with `{ type: 'CREDIT_PROFILE', frequency: 'MONTHLY' }`.
- Call once after OTP verify. Without this, we only see data from the initial connect.

**P1 — Data completeness**

**Enhanced debt schema fields**
- Expand `SpinwheelDebtSchema` to include:
  - `dueDate` (ISO string, nullable)
  - `accountStatus` (`'OPEN'`, `'CLOSED'`, `'DELINQUENT'`)
  - `lastPaymentDate` (ISO string, nullable)
  - `openDate` (ISO string, nullable)
  - `paymentHistoryCodes` (24-month history, e.g. `['OK', 'OK', 'LATE_30']`)
- Feed `accountStatus: 'DELINQUENT'` and late payment codes to pet rules engine.

**Multi-bureau support**
- Add `SPINWHEEL_SOURCE_BUREAU` config key (default `'Equifax'`) so you can switch without a deploy.
- **[ACTION]** Confirm with Spinwheel support that your sandbox key has TransUnion/Experian enabled.

**P2 — Stretch**
- KBA fallback connect — defer to after MVP.
- Student loan payoff quotes.
- Bill pay — **[ACTION]** Contact Spinwheel account manager to enable if needed.

---

## New Integrations — By Asset Class

### Banking & Investments

**SnapTrade** (`dashboard.snaptrade.com`) — broad brokerage/IRA aggregator: Fidelity, Vanguard, Schwab, Robinhood, Webull, M1, Betterment, Wealthfront, Interactive Brokers, Empower, tastytrade, Public, and 20+ more. $0 dev tier, $1–$2/user/month in prod. Use as catch-all for anything Plaid misses.

**[ACTION]** Sign up at `dashboard.snaptrade.com/signup` — free tier, no CC.

---

### Retirement Accounts

Five-layer stack. Layer 1 (Plaid) already integrated. Layers 2–5 are new:

**Layer 2 — Akoya** (`akoya.com`) — FDX-standard OAuth backed by Fidelity + 11 major US banks. Fills Fidelity workplace 401k gap. Free sandbox.

**[ACTION]** Request sandbox at `docs.akoya.com/docs/getting-started`.

**Layer 3 — Empower** (`developer.empower-retirement.com`) — largest US 401k recordkeeper (~$1.8T AUM, ~18M participants). OAuth 2.0 + OpenID Connect. Returns vested balance, loan balance, investment detail. Free developer portal.

**[ACTION]** Submit access request at `developer.empower-retirement.com`.

**Layer 4 — TIAA** (`developer.tiaa.org`) — ~$1.3T AUM in 403(b) plans for universities, hospitals, nonprofits. FDX-standard OAuth 2.0. Largest remaining retirement gap after the above.

**[ACTION]** Apply for developer access at `developer.tiaa.org`.

**Layer 5 — SnapTrade** — catch-all fallback (see above).

**Manual entry only (no viable API):**
TSP, Principal 401k, Vanguard workplace 401k, Guideline/Vestwell/Human Interest, pensions, annuities, out-of-Plaid 529s.

---

### Real Estate

**Home value AVM — RentCast** (`rentcast.io/api`) — 50 free calls/month, $74/mo for 1k. Returns AVM + rental AVM + comps in one call. 140M+ US properties.

**Home equity = AVM − mortgage balance** (mortgage available from Plaid/Spinwheel).

**[ACTION]** Sign up at `rentcast.io/api`. Store as `coiny-rentcast-api-key` in Keychain.

**Vehicle enrichment (free, no auth):** NHTSA API — VIN decode, recall status. Add recall detection as a bonus feature.

---

### Vehicles

**Cars — MarketCheck** (`marketcheck.com/apis`) — 500 free calls/month (no CC). Market-derived predicted price from live listings.

**[ACTION]** Sign up at `marketcheck.com`. Store as `coiny-marketcheck-api-key` in Keychain.

**Do not use:** Edmunds (restricted to advertising partners), KBB (B2B partnership), CarGurus/CarFax (dealer-oriented).

Boats/RVs/motorcycles, classic cars, aircraft: B2B licensing required — manual entry fallback.

---

### Precious Metals & Commodities

**Precious metals — GoldAPI.io** (`goldapi.io`) — free tier, Google login. Covers XAU, XAG, XPT, XPD.

**[ACTION]** Sign up at `goldapi.io`. Store as `coiny-goldapi-key` in Keychain.

**Energy — EIA Open Data** (`eia.gov/opendata`) — free, instant API key. WTI/Brent crude, natural gas, gasoline. Relevant for users with oil royalties.

**[ACTION]** Register at `eia.gov/opendata`. Store as `coiny-eia-api-key` in Keychain.

**Agricultural — USDA NASS QuickStats** (`nass.usda.gov/developer`) — free, instant. Wheat, corn, soybeans, livestock. Relevant for farmland investors.

**[ACTION]** Register at `nass.usda.gov/developer`. Store as `coiny-usda-nass-api-key` in Keychain.

---

### Crypto — Full Coverage

#### ⚠️ Critical Facts
- **SimpleHash is dead** — acquired by Phantom Feb 2025, API shut down March 27 2025. Do not use.
- **Bybit hard-blocks US users** — US IP and KYC banned. Do not plan.
- **Bitfinex US-restricted** since 2017. Do not plan.
- **Zerion does NOT cover native Bitcoin addresses** — BTC self-custody is a gap.
- **Coinbase gap:** JWT Advanced Trade client does NOT reach standard coinbase.com consumer accounts.

#### Centralized Exchanges (CEX)

Users generate a read-only API key in their exchange dashboard and paste it into Coiny. We store it encrypted and build a client per exchange.

| Exchange | Priority | Sandbox | US Legal | Notes |
|---|---|---|---|---|
| **Coinbase Advanced Trade** | Done | Yes | Yes | JWT auth — already integrated |
| **Coinbase consumer wallet** | **Tier 1 — GAP** | No | Yes | Standard coinbase.com users; separate OAuth `/v2/accounts` client needed |
| **Robinhood** | **Tier 1 — BIGGEST** | No | Yes | Tens of millions of US users; official read-only Crypto API launched 2024 |
| **Gemini** | **Tier 1** | Full sandbox | Yes | Best-in-class sandbox |
| **Kraken** | **Tier 1** | Futures testnet | Yes | Staking suffixes (`.B`, `.S`, `.M`) important for ETH stakers |
| **Binance US** | **Tier 2** | No | Yes (~46 states) | |
| **OKX (US entity)** | **Tier 2** | No | Yes (not KY/NY/TX) | US-legal post-DOJ settlement April 2025 |
| **eToro** | **Tier 2** | No | Yes | Official Builders Portal + MCP server; crypto + equities + ETFs |
| **tastytrade** | **Tier 2** | No | Yes | OAuth API; crypto via Zero Hash |
| **Webull** | **Tier 2** | Shared test credentials | Yes | Stocks + options + crypto in one call |
| **Crypto.com** | **Tier 2** | No | Yes | Per-coin breakdown with locked/normal split |
| **KuCoin** | **Tier 2** | No | Yes (limited KYC) | |
| **Bitget** | **Tier 2** | Full sandbox with virtual funds | Yes | Best sandbox of this tier |
| **Revolut X** | **Tier 3** | No | Primarily EU/UK | |
| **Binance Global / Bybit / Bitfinex** | **Skip** | — | No | US-blocked |

#### On-Chain / Self-Custody

Zerion handles EVM + Solana + TRON automatically. Gaps:

| Chain | Priority | API | Cost | Notes |
|---|---|---|---|---|
| **Bitcoin (BTC) native** | **Tier 1** | Blockstream Esplora | Free, no key | `GET /api/address/{addr}` — `chain_stats.funded_txo_sum - spent_txo_sum` = balance |
| **XRP Ledger** | **Tier 1** | Public XRPL nodes | Free, no key | |
| **Cardano (ADA)** | **Tier 1** | Blockfrost | 50k req/day free | **[ACTION]** Sign up at `blockfrost.io` → `coiny-blockfrost-project-id` |
| **TON** | **Tier 1** | TonCenter API | Free (key via `@tonapibot`) | **[ACTION]** DM `@tonapibot` on Telegram → `coiny-toncenter-api-key` |
| **Dogecoin / Litecoin / BCH** | **Tier 2** | BlockCypher | 2k calls/day free | Same endpoint covers all three |
| **Stellar (XLM)** | **Tier 2** | Horizon API | Free, no auth | |
| **Cosmos (ATOM, OSMO, TIA, INJ)** | **Tier 2** | Public LCD endpoints | Free, no auth | |
| **Polkadot (DOT)** | **Tier 3** | Subscan API | Free tier | |
| **NEAR / Aptos / Sui / Hedera** | **Tier 3** | Various | Free tier | Low priority |
| **Monero / Filecoin / ICP** | **Skip** | — | — | Private or tiny retail footprint |

BNB Chain, Base, Arbitrum, Optimism, zkSync, Avalanche C-Chain, Blast, etc. — all covered by Zerion.

#### Staking Rewards

| Asset | Zerion? | Solution |
|---|---|---|
| ETH staking (stETH, rETH, cbETH) | Yes | Already handled |
| SOL staking (epoch rewards) | Balance only | Helius API — **[ACTION]** Sign up at `helius.dev` → `coiny-helius-api-key` |
| ATOM / OSMO staking | No | Cosmos LCD: `/cosmos/distribution/v1beta1/delegators/{addr}/rewards` |
| ADA staking | No | Blockfrost: `/accounts/{stake_addr}/rewards` |
| DOT staking | No | Subscan API |

#### NFT Portfolio

| API | Chains | Free Tier | Notes |
|---|---|---|---|
| **Zerion** (already have) | 40+ EVM + Solana | — | Primary |
| **Alchemy NFT API** | 30+ chains | 30M CUs/month | Best SimpleHash replacement — explicit migration guide |
| **Zapper API** (GraphQL) | 50+ chains | Free key | Tokens + NFTs + DeFi in one query |

**[ACTION]** Sign up at `alchemy.com` → `coiny-alchemy-api-key`.

#### DeFi Gaps

| Gap | Solution |
|---|---|
| **Hyperliquid perps** | Free unauthenticated: `POST https://api.hyperliquid.xyz/info` `{"type":"clearinghouseState","user":"0x..."}` |
| **dYdX v4** | `indexer.dydx.trade` |
| **EigenLayer restaking** | EigenLayer SDK or P2P.org Restaking API |
| **Solana DeFi** (Raydium, Orca, Kamino) | Helius supplements Zerion |

---

### Private Equity / Equity Compensation

**Carta** (`carta.com/api`) — RSUs, options, SAFE notes, warrants for equity administered on Carta (most funded startups). Invite-only partner program.

**[ACTION]** Apply at `carta.com/api` — approval takes weeks, free to apply. Use manual entry at MVP.

---

### Business / Freelancer

**QuickBooks** — OAuth 2.0. Pull trailing-12-month net revenue + balance sheet total equity. Free Builder tier (500K reads/month).

**[ACTION]** Create Intuit developer account at `developer.intuit.com`. Store as `coiny-quickbooks-client-id` + `coiny-quickbooks-client-secret` in Keychain.

---

### P2P Lending

**Prosper** (`developer.prosper.com`) — self-serve registration. Portfolio read. Real gap for P2P investors.

**[ACTION]** Register at `developer.prosper.com`.

---

### Domain Names

**GoDaddy GoValue** — estimates domain market value (5k valuations/day). Combined with GoDaddy Domains API to list owned domains.

**[ACTION]** Sign up at GoDaddy developer portal for GoValue access.

---

### Collectibles

| Asset class | API | Access | Notes |
|---|---|---|---|
| **Trading cards** (Pokémon, MTG, Yu-Gi-Oh) | TCGPlayer (`developer.tcgplayer.com`) | Self-serve, free tier | **[ACTION]** Sign up → `coiny-tcgplayer-api-key` |
| **Sneakers** | StockX (`developer.stockx.com`) | Application required | **[ACTION]** Apply |
| **Watches** | WatchCharts (`watchcharts.com/api`) | Paid, 7–30 day trial | 29,000+ watches |
| **Wine** | Wine-Searcher | Free trial (100 calls/day) | |
| **Coins (numismatic)** | PCGS Public API | Self-serve (likely) | |
| **Art / handbags / antiques** | No API | Manual entry only | |

---

### Gaming

**Steam** (`steamcommunity.com/dev`) — official Valve API. Item inventories + market prices for CS2, Dota2, Rust. Free, self-serve. Low priority but trivially easy.

---

### Manual Asset Buckets

Add `manual_assets` table for all classes with no viable API:

```sql
manual_assets (id, user_id, name, category, self_reported_value, last_updated_at)
```

Categories: life insurance (cash value), art, luxury handbags, aircraft, collector cars, pension/defined benefit, annuities, real estate crowdfunding (Fundrise/RealtyMogul/CrowdStreet), mineral rights, water rights, intellectual property.

---

## Build Sequence

### Sprint A — Reactions from existing data (no new endpoints, no new signups)
1. Expand `PlaidLiabilitySchema` — overdue, APR, min-payment fields.
2. Add `classifyTransaction()` to Coinbase client.
3. Expand `ZerionPortfolioSchema` — `changes.absolute_1d` / `percent_1d`.
4. Expand `SpinwheelDebtSchema` — dueDate, accountStatus, paymentHistoryCodes.
5. Wire `LIABILITIES: DEFAULT_UPDATE` and `PENDING_EXPIRATION` Plaid webhook handlers.

### Sprint B — New data surfaces (existing vendors)
1. Zerion `getPositions()` — per-token holdings.
2. Plaid `RECURRING_TRANSACTIONS_UPDATE` webhook + `/transactions/recurring/get`.
3. Coinbase spot price cache.
4. Spinwheel `POST /subscriptions` after OTP verify (monthly auto-refresh).

### Sprint C — New asset classes (requires action items first)
1. Bitcoin self-custody — Blockstream Esplora client (no signup).
2. XRP / Stellar / Cosmos — public node clients (no signup).
3. Real estate — RentCast AVM client + home equity calculation.
4. Vehicles — MarketCheck client.
5. Precious metals — GoldAPI client.
6. Cardano — Blockfrost client (requires Blockfrost signup).
7. TON — TonCenter client (requires Telegram bot key).
8. Spinwheel webhook handler (requires **[ACTION]** first: register in Spinwheel Dashboard).
9. Plaid `INVESTMENTS_TRANSACTIONS` webhook (requires **[ACTION]** first: enable investments product).

### Sprint D — Brokerage/retirement depth
1. SnapTrade client (retirement catch-all).
2. Akoya client (Fidelity 401k).
3. Empower client (401k).
4. TIAA client (403b).
5. Coinbase consumer OAuth client (standard coinbase.com users).
6. Robinhood crypto client.
7. Gemini + Kraken clients.

### Sprint E — DeFi, NFTs, enrichment
1. Hyperliquid perps (no signup).
2. Solana staking rewards — Helius.
3. Alchemy NFT client (Solana NFT gap).
4. Zerion webhook subscriptions (requires **[ACTION]** first: email Zerion).
5. QuickBooks OAuth client.
6. Coinbase portfolio summary.
7. Zerion PnL + DeFi positions.

### Sprint F — Long-tail asset classes
1. CEX Tier 2 clients (Binance US, OKX, KuCoin, Bitget, Crypto.com, eToro, Webull).
2. Prosper P2P lending client.
3. TCGPlayer trading cards client.
4. GoldAPI energy + ag commodities (EIA, USDA NASS).
5. Manual asset buckets table + UI.
6. Steam gaming inventory.

---

## All Manual Action Items (Antoine)

### Instant self-serve (no approval, no CC needed)

| # | Service | Action |
|---|---|---|
| 1 | **RentCast** | `rentcast.io/api` → `coiny-rentcast-api-key` |
| 2 | **MarketCheck** | `marketcheck.com` → `coiny-marketcheck-api-key` |
| 3 | **GoldAPI.io** | `goldapi.io` (Google login) → `coiny-goldapi-key` |
| 4 | **SnapTrade** | `dashboard.snaptrade.com/signup` → client ID + secret |
| 5 | **QuickBooks** | `developer.intuit.com` → `coiny-quickbooks-client-id` + secret |
| 6 | **Helius** (Solana staking) | `helius.dev` → `coiny-helius-api-key` |
| 7 | **Blockfrost** (Cardano) | `blockfrost.io` → `coiny-blockfrost-project-id` |
| 8 | **TonCenter** (TON) | Telegram `@tonapibot` → `coiny-toncenter-api-key` |
| 9 | **Alchemy** (NFTs) | `alchemy.com` → `coiny-alchemy-api-key` |
| 10 | **TCGPlayer** (trading cards) | `developer.tcgplayer.com` → `coiny-tcgplayer-api-key` |
| 11 | **EIA Open Data** (energy) | `eia.gov/opendata` → `coiny-eia-api-key` |
| 12 | **USDA NASS** (ag commodities) | `nass.usda.gov/developer` → `coiny-usda-nass-api-key` |

### Requires form / review (free but not instant)

| # | Service | Action |
|---|---|---|
| 13 | **Empower** (401k) | `developer.empower-retirement.com` — form; credentials via secure email |
| 14 | **Robinhood** (crypto) | Apply for read-only API access |
| 15 | **Akoya** (Fidelity 401k) | `docs.akoya.com/docs/getting-started` — form-based sandbox request |
| 16 | **TIAA** (403b) | `developer.tiaa.org` — apply for FDX API access |
| 17 | **StockX** (sneakers) | `developer.stockx.com` — apply for pricing API |
| 18 | **Prosper** (P2P lending) | `developer.prosper.com` — register for investor portfolio read |
| 19 | **GoDaddy GoValue** (domains) | GoDaddy developer portal |

### Waitlist (approval takes weeks)

| # | Service | Action |
|---|---|---|
| 20 | **Carta** (RSUs/options) | `carta.com/api` — partner program; free to apply |

### Existing vendor action items

| # | Service | Action |
|---|---|---|
| 21 | **Plaid** | Enable `recurring_transactions` + `investments` products on your sandbox item |
| 22 | **Plaid** | Confirm `liabilities` product enabled on all sandbox items |
| 23 | **Zerion** | Email `api@zerion.io` to request webhook whitelist |
| 24 | **Spinwheel** | Dashboard → Settings → Webhooks → add `https://<fly-app>.fly.dev/webhooks/spinwheel`; store signing secret as `coiny-spinwheel-webhook-secret` |
| 25 | **Spinwheel** | Confirm sandbox key has multi-bureau (TransUnion, Experian) enabled |
| 26 | **Spinwheel** | Contact account manager to enable bill pay product (P2, deferred) |

### Crypto exchanges — no vendor signup needed from us
Users generate read-only API keys in their own exchange dashboards and paste them into Coiny.

**Tier 1:** Coinbase (consumer OAuth), Robinhood, Gemini, Kraken
**Tier 2:** Binance US, OKX (US), eToro, tastytrade, Webull, Crypto.com, KuCoin, Bitget
**Skip:** Bybit (US-blocked), Bitfinex (US-restricted), Binance Global (US-blocked)

---

## Services Researched and Ruled Out

| Service | Why |
|---|---|
| Yodlee (Envestnet) | $100K+/year; enterprise only |
| MX Technologies | $15K–$90K/year; enterprise only |
| Pontera | Advisor-facing; not accessible to consumer fintech |
| Capitalize | 401k rollover only; not a balance-read API |
| Bestow | Life insurance sales embed; not a read API |
| Masterworks / Rally / Fundrise / RealtyMogul | No portfolio read API |
| Belvo | Latin America only |
| Tink | EU/PSD2 only |
| Guideline / Vestwell / Human Interest | Payroll integration only; no participant balance-read |
| KBB / Edmunds | B2B partnership required |
| BatchData | $1k/mo minimum |
| Estated | Being deprecated after ATTOM acquisition |
| SimpleHash | Dead — acquired by Phantom, shut down March 27 2025 |
| Reservoir | Dead — wound down October 2025 |
| Bybit | Hard-blocks US IP + KYC |
| Bitfinex | US-restricted since 2017 |
| Binance Global | Hard US geo-block |
| DeBank | No free tier; not worth it vs Zerion |
| Nansen | Analytics only; paid; no net worth value |
| IBKR direct API | Compliance-gated; SnapTrade covers it |
| Stripe Financial Connections | Bank-only; Plaid is better |
| Acorns / Stash | Walled gardens; no API anywhere |
| Apex Fintech / DriveWealth | B2B clearing; not a read-only aggregator |
| J.D. Power (boats/RVs) | Requires direct sales contract |
| Hagerty (collector cars) | B2B licensing required |
| VREF (aircraft) | Enterprise sales only |
| Monero (XMR) | Private blockchain; impossible to read without spend key |
| Filecoin / ICP | Tiny retail wallet count; high complexity |
| SPARK Institute API | B2B/TPA back-office; not consumer-app relevant |
| Artprice / Artnet / MutualArt | No public developer API |
| PSA / Beckett / CGC (graded cards) | No public developer API |
| Rebag CLAIR (handbags) | Consumer-only; no developer access |
| LendingClub | Shut down retail P2P investing in 2020 |
| Mineral rights (Enverus MineralSoft) | No public API |
| Deferred compensation / NQDC | No API; employer-held obligations |
| TSP (Thrift Savings Plan) | No official API; ToS prohibits credential sharing |
| Schwab direct API | Requires personal Schwab account + thinkorswim; SnapTrade covers it |
