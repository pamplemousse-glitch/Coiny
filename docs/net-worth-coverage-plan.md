# Net Worth Coverage Plan

_Quick-reference: what we cover, what the gaps are, what to build next._
_Last updated 2026-05-27. Full research detail in `docs/api-expansion-plan.md`._

---

## Competitor Landscape

The closest direct comp is **Kubera** ($250/year). They cover: banks, brokerages, crypto, DeFi, NFTs, real estate (Zillow URL), vehicles (VIN), domain names, precious metals, Carta (private equity), and as of 2025 a jewelry/watch AI appraiser. They've also added MCP integration (Claude/ChatGPT can query your portfolio).

**Kubera's gaps — where Coiny can leapfrog them:**
- No sneaker market data
- No sports cards (automated)
- No vinyl records
- No wine/spirits pricing
- No fantasy sports
- No prediction markets / sports betting exchange
- No airline miles / loyalty points
- No in-game assets (CS2 skins, etc.)
- No behavioral feedback loop (our actual moat)

Other notable comps:
- **Capitally** — strongest analytics (TWR, MWR, IRR, 11 tax jurisdictions); manual-import only, no broker auto-sync
- **Vyzer** — targets HNW/family office; strong on private equity (capital calls, DPI/TVPI); no collectibles pricing
- **Altoo** — Swiss enterprise, explicitly markets watches/wine/art for UHNWi; not consumer
- **Monarch Money** — Mint replacement, budgeting-first; alternatives are 100% manual
- **Snowball Analytics** — EU-focused, SnapTrade brokerage sync, no alt-asset pricing

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
| Vehicle market value (daily drivers) | MarketCheck | vehicle_assets table — needs MARKETCHECK_API_KEY |
| Precious metals (gold, silver, platinum) | GoldAPI.io | metal_holdings table — needs GOLDAPI_API_KEY |
| Brokerage aggregator (Fidelity, Vanguard, Schwab, etc.) | SnapTrade | snaptrade_connections table — needs SNAPTRADE_CLIENT_ID + SNAPTRADE_CONSUMER_KEY |
| Kraken exchange (spot balances) | Kraken REST API | kraken_connections table — HMAC-SHA512 auth, encrypted per-user keys |
| Budget / spending tracking | YNAB API | ynab_connections table — user-supplied personal access token |
| Sneaker collection (StockX + GOAT prices) | KicksDB (`kicks.dev`) | sneaker_holdings table — SKU + size + quantity; sync prices on demand; needs KICKSDB_API_KEY |
| Vinyl records collection | Discogs OAuth | discogs_connections table — full OAuth 1.0a; syncs lastCollectionUsd from marketplace stats |
| Prediction markets — Kalshi | Kalshi REST API | kalshi_connections table — RSA-PSS auth; encrypted per-user key pair; portfolioUsd in cents |

---

### 🔴 High Priority — Build Next

| Asset | API | Effort | Notes |
|---|---|---|---|
| Solana staking rewards | Helius | Low | **[ACTION]** `helius.dev` signup |
| NFT portfolio (Solana + multi-chain) | Alchemy NFT API | Medium | **[ACTION]** `alchemy.com` signup |
| Prediction markets — Polymarket | Polymarket REST API | Low | Free read-only; no key needed; requires user's Polygon wallet address; EIP-712 auth for writes |
| Airline miles / loyalty points | AwardWallet API | Medium | "Plaid for points" — 700+ loyalty programs; OAuth; free base tier Business account |

---

### 🟡 Medium Priority — Self-Serve (No Application)

**Collectibles:**

| Asset | API | Effort | Notes |
|---|---|---|---|
| Trading cards — 85+ TCGs (Pokemon, MTG, One Piece, Lorcana) | TCG API (`tcgapi.dev`) | Low | 100 req/day free; broader than TCGPlayer |
| Video games + TCG + comics (condition-specific) | PriceCharting API | Low | Paid subscription; REST/JSON |
| Watches | WatchCharts API | Medium | Requires Professional plan + distribution license contact |
| Watches (alternative) | The Watch API (`thewatchapi.com`) | Low | Free tier available; simpler |
| Fine wine portfolio | Wine-Searcher API | Medium | Apply for trial API key |
| Sports cards (PSA/BGS graded + raw) | SportsCardsPro API | Medium | Paid subscription |
| Coins (numismatic, PCGS/NGC graded) | PCGS CoinFacts API | Low | API exists; investigate access |
| Comic books | GoCollect API | Low | API exists; investigate access |
| Whisky / spirits | Rare Whisky 101 / Whisky Hammer | Medium | Auction price data; investigate API access |
| Classic / collector cars | Hagerty Valuation Tool | Medium | Distinct from MarketCheck (daily drivers); Hagerty covers collector market |

**Bets / Markets / Finance:**

| Asset | API | Effort | Notes |
|---|---|---|---|
| Sports betting exchange (UK/EU) | Betfair Exchange API | Medium | Full position + balance API; free delayed key; £499 live key (one-time) |
| California water futures (NQH2O) | Any stock data API (Polygon, Yahoo Finance) | Low | NQH2O is a Nasdaq-listed index; treat as a ticker |

**In-game / Digital:**

| Asset | API | Effort | Notes |
|---|---|---|---|
| CS2 / Steam skins | Steam API + SteamAnalyst | Low | Steam inventory API free; SteamAnalyst pricing free personal tier; 100K+ items |
| Domain names | GoDaddy GoValue API | Low | Free; 20K calls/month |

**Other:**

| Asset | API | Effort | Notes |
|---|---|---|---|
| Fantasy sports roster value | Yahoo Fantasy Sports API | Medium | Free; NFL, NBA, MLB, NHL; map players to KTC/FantasyPros trade values |
| Real estate crowdfunding (Fundrise) | Fundrise Connect API | Low | Email connect@fundrise.com |
| YouTube creator revenue | YouTube Analytics API | Medium | OAuth (Google API Console); returns CPM, RPM, revenue data |
| Solar panel / energy asset value | NREL PVWatts API | Low | Free government API; user inputs system specs → annual kWh production value |
| Gemini exchange | Gemini API | Low | Self-serve, full sandbox — retry signup |
| Alpaca (brokerage) | Alpaca API | Low | User-supplied API key — no vendor signup |
| Prosper (P2P lending) | Prosper API | Low | `developer.prosper.com` |
| Energy commodities (WTI, Brent, gas) | EIA Open Data | Low | Instant: `eia.gov/opendata` |
| Agricultural commodities + livestock | USDA NASS + LMPRS | Low | Free government APIs; price benchmarks for held agricultural assets |

---

### 🟠 Medium Priority — Requires Signup/Form (Approval-Gated)

| Asset | API | Effort | Action Required |
|---|---|---|---|
| Robinhood | Robinhood Crypto API | Medium | Apply for read-only API access |
| Fidelity workplace 401k | Akoya | Medium | Form-based sandbox: `docs.akoya.com` |
| Empower retirement (largest 401k) | Empower API | Medium | Form: `developer.empower-retirement.com` |
| TIAA (403b) | TIAA API | Medium | Form: `developer.tiaa.org` |
| Business net income | QuickBooks | Medium | OAuth — `developer.intuit.com` |
| Private equity / startup equity / cap table | Carta API | High | Invite-only partner program — apply at `carta.com/api` |
| Fine art (secondary market pricing) | Artsy Partner API | Medium | Public API covers public domain only; contact for auction data |

---

### 🟠 Long-Tail — Apply + Wait or Tier 2 CEX

| Asset | API | Notes |
|---|---|---|
| Sneakers (official StockX) | StockX API | Application required — use KicksDB instead for now |
| Watches (Chrono24) | Chrono24 | No official public API — third-party scrapers only |
| Luxury handbags (Birkin, Chanel) | Rebag / Fashionphile / Vestiaire | No clean public APIs; explore scraping or manual + CPP valuation |
| Jewelry / gemstones | Worthy / Circa estimate APIs | Contact for API access |
| Stamps (philatelic) | Stanley Gibbons / StampWorld | Contact for pricing data |
| Musical instruments (vintage) | Reverb.com sold listings | Unofficial; Blue Book of Guitar Values |
| Sports memorabilia (game-worn, not cards) | Goldin / PWCC auction data | Auction result data; investigate API |
| Music / film royalties | Royalti.io / Revelator | APIs exist; no self-serve consumer pricing |
| Binance US, OKX (US entity), eToro, tastytrade, Webull, Crypto.com, KuCoin, Bitget | Various CEX APIs | All accessible; Tier 2 priority |
| dYdX v4 perps | dYdX Indexer | Free but US-blocked (geo-issue) |
| EigenLayer restaking | EigenLayer SDK | Complex; defer |

---

### ❌ Ruled Out (No Viable API or Not Buildable)

| Asset | Reason |
|---|---|
| DraftKings / FanDuel / BetMGM open bets | No public API for reading user positions or open bet balances |
| Masterworks / Rally / Otis (fractional collectibles) | Closed ecosystems; no developer APIs |
| Republic / WeFunder / StartEngine (crowdfunded equity) | No developer APIs; Owntric (third-party) exists but isn't an API |
| Zillow / Redfin / ATTOM | Zillow public API retired 2021; B2B-only direct access |
| KBB / Edmunds | B2B partnership required |
| Yodlee / MX Technologies | Enterprise only, $15K–$100K+/year |
| SimpleHash | Dead — acquired by Phantom, shut down March 2025 |
| Vivino (wine) | No official public API; scrapers only |
| Art, antique furniture | No public API anywhere for valuations |
| Commercial fishing licenses | Highly regional; no marketplace or valuation API |
| Life insurance cash value | No API |
| Pensions / annuities | No API; future value too complex |
| Mineral rights | No public API |
| TSP (Thrift Savings Plan) | ToS prohibits credential sharing |
| Bybit / Bitfinex / Binance Global | US-blocked |
| Monero | Private blockchain |
| Royalty Exchange | Marketplace only; no developer API |
| Tradier | Non-professional attestation incompatible with commercial use; SnapTrade covers brokerage anyway |
| Timeshare / vacation club points | No account linking possible; user manually inputs balance |
| TikTok / Instagram account value | No official API; FameSwap-style estimation is informal |
| Fortnite cosmetic account value | No official API; community estimators only |
| Water rights (commercial) | WestWater Research / Nasdaq NQH2O index covers California water futures (trackable as ticker); actual rights holdings require manual input |
| Private credit / promissory notes | No consumer-facing API; manual input |
| Structured notes | No API; institutional product |

---

### 📝 Manual Entry Fallback

For all asset classes with no viable API, add a `manual_assets` table:

```sql
manual_assets (id, user_id, name, category, self_reported_value, last_updated_at)
```

Categories: life insurance cash value, art, luxury handbags, aircraft, collector cars (if Hagerty too complex), pension/defined benefit, annuities, real estate crowdfunding (non-Fundrise), mineral rights, water rights, intellectual property, watches (if WatchCharts license too complex), wine (if Wine-Searcher too costly), timeshare points (balance manual; value = balance × CPP rate), fractional collectibles (Masterworks/Rally/Otis), crowdfunded equity (Republic/WeFunder).

---

## Build Sequence

| Sprint | Focus | Status |
|---|---|---|
| **A** | Reactions from existing data | ✅ Done |
| **B** | New data surfaces on existing vendors | ✅ Done |
| **C** | Free chain clients + RentCast + MarketCheck + GoldAPI + SnapTrade | ✅ Done (chains, real estate, vehicles, metals, SnapTrade all live) |
| **D** | Kraken, YNAB, brokerage depth | ✅ Done (Kraken + YNAB live; Akoya/Empower/TIAA deferred) |
| **E** | Hyperliquid, Solana staking, Alchemy NFTs | ✅ Hyperliquid done; Helius + Alchemy still need signups |
| **F** | Alt assets Tier 1: KicksDB, Discogs, Kalshi, Polymarket, AwardWallet | ✅ KicksDB + Discogs + Kalshi live; Polymarket + AwardWallet still next |
| **G** | Alt assets Tier 2: WatchCharts, Wine-Searcher, SportsCardsPro, PriceCharting, Hagerty, PCGS, GoCollect, CS2 skins, Yahoo Fantasy Sports, Fundrise, Betfair | ⏳ Next up |
| **H** | Alt assets Tier 3: YouTube creator revenue, NREL solar, USDA agricultural, Prosper, EIA/USDA commodities | ⏳ Later |
| **I** | Long-tail CEX: Binance US, OKX US, eToro, tastytrade, Webull, Crypto.com, KuCoin, Bitget | ⏳ Later |

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
