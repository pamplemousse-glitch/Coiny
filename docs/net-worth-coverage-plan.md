# Net Worth Coverage Plan

_Quick-reference: what we cover, what the gaps are, what to build next._
_Last updated 2026-05-26. Full research detail in `docs/api-expansion-plan.md`._

---

## Coverage by Asset Class

### ✅ Already Live

| Asset | Integration | Notes |
|---|---|---|
| Bank accounts (cash, checking, savings) | Plaid | 12,000+ institutions |
| Investment portfolios (IRA, Roth, 401k, 403b, HSA, brokerage) | Plaid Investments | 2,400+ institutions |
| Credit cards / loans / student / mortgage / BNPL | Spinwheel | Direct bureau pull (Equifax default) |
| Credit score + utilization | Spinwheel | VantageScore 3.0 |
| Centralized crypto (Coinbase Advanced Trade accounts) | Coinbase API | JWT auth, Advanced Trade users only |
| On-chain wallets — EVM, Solana, TRON, DeFi positions | Zerion | 40+ chains, 8,000+ protocols |
| Bitcoin (BTC native addresses) | Blockstream Esplora | chain_wallets table |
| XRP | XRPL public nodes | chain_wallets table |
| Stellar (XLM) | Horizon | chain_wallets table |
| Dogecoin / Litecoin / BCH | BlockCypher | chain_wallets table |
| Cosmos / Osmosis (ATOM, OSMO) | Public LCD | chain_wallets table |
| NEAR / Aptos / Sui / Hedera | Public RPC | chain_wallets table |
| Polkadot (DOT) | Subscan | chain_wallets table — needs SUBSCAN_API_KEY |
| Cardano (ADA) | Blockfrost | chain_wallets table — needs BLOCKFROST_PROJECT_ID |
| TON | TonCenter | chain_wallets table — needs TONCENTER_API_KEY |
| Hyperliquid perps accounts | Hyperliquid API | hyperliquid_accounts table |
| Coinbase portfolio analytics (unrealized PnL) | Coinbase v3 | `/api/v3/brokerage/portfolios` |
| Zerion wallet PnL + DeFi positions | Zerion | `/v1/wallets/.../pnl` + positions |
| Real estate AVM | RentCast | real_estate_assets table — needs RENTCAST_API_KEY |
| Vehicle market value | MarketCheck | vehicle_assets table — needs MARKETCHECK_API_KEY |
| Precious metals (gold, silver, platinum) | GoldAPI.io | metal_holdings table — needs GOLDAPI_API_KEY |
| Brokerage aggregator (Fidelity, Vanguard, Schwab, etc.) | SnapTrade | snaptrade_connections table — needs SNAPTRADE_CLIENT_ID + SNAPTRADE_CONSUMER_KEY |

---

### 🔴 High Priority — Build Next (No Signup Required)

| Asset | API | Effort | Notes |
|---|---|---|---|
| Solana staking rewards | Helius | Low | **[ACTION]** `helius.dev` signup |
| NFT portfolio (Solana + multi-chain) | Alchemy NFT API | Medium | **[ACTION]** `alchemy.com` signup |

---

### 🟡 Medium Priority — Requires Signup/Form (Free)

| Asset | API | Effort | Action Required |
|---|---|---|---|
| Robinhood (tens of millions of US users) | Robinhood Crypto API | Medium | Apply for read-only API access |
| Gemini | Gemini API | Low | Self-serve, full sandbox — no approval needed |
| Kraken (ETH stakers) | Kraken API | Low | Self-serve — note `.S`/`.M`/`.B` staking suffixes |
| Coinbase consumer wallet (standard coinbase.com) | Coinbase v2 OAuth | Medium | **BLOCKED** — OAuth client creation disabled; partner-gated (requires Coinbase rep approval). No sandbox. Come back when product has traction. |
| Fidelity workplace 401k | Akoya | Medium | Form-based sandbox: `docs.akoya.com` |
| Empower retirement (largest 401k) | Empower API | Medium | Form: `developer.empower-retirement.com` |
| TIAA (403b) | TIAA API | Medium | Form: `developer.tiaa.org` |
| YNAB (budgeting users) | YNAB API | Low | `app.ynab.com/settings/developer` — free personal access token |
| Alpaca (brokerage) | Alpaca API | Low | User-supplied API key — no vendor signup |
| Tradier (equity + options) | Tradier API | Low | `developer.tradier.com` free sandbox |
| Trading cards (Pokémon, MTG, Yu-Gi-Oh) | TCGPlayer API | Low | OAuth flow — more complex than a simple key |
| Energy commodities (WTI, Brent, gas) | EIA Open Data | Low | Instant: `eia.gov/opendata` — `coiny-eia-api-key` |
| Agricultural commodities | USDA NASS | Low | Instant: `nass.usda.gov/developer` — `coiny-usda-nass-api-key` |
| Business net income | QuickBooks | Medium | OAuth — `developer.intuit.com` |
| P2P lending (Prosper) | Prosper API | Low | `developer.prosper.com` |
| Domain names | GoDaddy GoValue | Low | GoDaddy developer portal |

---

### 🟠 Long-Tail — Apply + Wait

| Asset | API | Notes |
|---|---|---|
| RSUs / options / warrants | Carta API | Invite-only partner program — apply at `carta.com/api` |
| Sneakers (StockX) | StockX API | Application required — `developer.stockx.com` |
| Watches | WatchCharts API | Paid subscription, 7-day trial |
| Binance US, OKX (US entity), eToro, tastytrade, Webull, Crypto.com, KuCoin, Bitget | Various CEX APIs | All accessible, Tier 2 priority |
| dYdX v4 perps | dYdX Indexer | Free but US-blocked (geo-issue) |
| EigenLayer restaking | EigenLayer SDK | Complex; defer |

---

### ❌ Ruled Out (No Viable API)

| Asset | Reason |
|---|---|
| KBB / Edmunds / CarFax | B2B partnership required |
| Zillow / Redfin / ATTOM | Dead API / $95/month / B2B |
| Yodlee / MX Technologies | Enterprise only, $15K–$100K+/year |
| SimpleHash | Dead — acquired by Phantom, shut down 2025 |
| Art, luxury handbags, antiques | No public API anywhere |
| Graded cards (PSA, Beckett, CGC) | No public API |
| Life insurance cash value | No API |
| Pensions / annuities | No API |
| Mineral rights | No public API |
| TSP (Thrift Savings Plan) | ToS prohibits credential sharing |
| Bybit / Bitfinex / Binance Global | US-blocked |
| Monero | Private blockchain |

---

### 📝 Manual Entry Fallback

For all asset classes with no viable API, add a `manual_assets` table:

```sql
manual_assets (id, user_id, name, category, self_reported_value, last_updated_at)
```

Categories: life insurance cash value, art, luxury handbags, aircraft, collector cars, pension/defined benefit, annuities, real estate crowdfunding, mineral rights, water rights, intellectual property.

---

## Build Sequence

| Sprint | Focus | Requires |
|---|---|---|
| **A** | Reactions from existing data (no new endpoints) | Nothing — just schema expansion |
| **B** | New data surfaces on existing vendors | Nothing |
| **C** | Free chain clients ✅ + RentCast + MarketCheck + GoldAPI + SnapTrade ✅ | Antoine signups: RentCast, MarketCheck, GoldAPI, Blockfrost, TonCenter, Helius |
| **D** | Brokerage/retirement depth (Akoya, Empower, TIAA, Gemini, Kraken, YNAB, Alpaca, Tradier) | Antoine signups + form approvals |
| **E** | DeFi gaps: Hyperliquid ✅, Solana staking (Helius), Alchemy NFTs, Zerion webhooks, QuickBooks | Antoine signups |
| **F** | Long-tail: CEX Tier 2, Prosper, TCGPlayer, EIA, USDA NASS, manual buckets UI | Antoine signups |

---

## Current Chain Wallet Coverage

| Chain | Status | Table |
|---|---|---|
| Bitcoin (BTC) | ✅ Live | `chain_wallets` via Blockstream Esplora |
| XRP | ✅ Live | `chain_wallets` via XRPL |
| Stellar (XLM) | ✅ Live | `chain_wallets` via Horizon |
| Dogecoin / Litecoin / BCH | ✅ Live | `chain_wallets` via BlockCypher |
| Cosmos (ATOM, OSMO) | ✅ Live | `chain_wallets` via public LCD |
| NEAR / Aptos / Sui / Hedera | ✅ Live | `chain_wallets` via public RPC |
| EVM (ETH, Polygon, Base, Arbitrum, etc.) | ✅ Live | Zerion |
| Solana | ✅ Live | Zerion |
| TRON | ✅ Live | Zerion |
| Polkadot (DOT) | ⏳ Needs Subscan API key | `chain_wallets` |
| Cardano (ADA) | ⏳ Needs Blockfrost project ID | `chain_wallets` |
| TON | ⏳ Needs TonCenter API key | `chain_wallets` |
| Hyperliquid perps | ✅ Live | `hyperliquid_accounts` |
| Brokerage aggregator | ✅ Live | `snaptrade_connections` via SnapTrade |

---

_For full API details, auth patterns, and endpoint specs: see `docs/api-expansion-plan.md`._
