# API inventory

*Compiled 2026-08-19 by reading `backend/src/`, not by reading other docs. Every
row was verified against the client that makes the call and against
`src/config.ts`; the "configured" column was verified against
`fly secrets list -a coiny-backend`.*

**Scope:** every outbound HTTP integration the backend makes. 38 of them.
Only Plaid costs money at scale.

**Companion documents.** `global-integration-map.md` owns regional coverage and
the entity-unlock checklist. `engineering-budgets.md` owns the cost model and is
the authority on per-user budgets. This file owns *what we call and why*, and
exists because that list previously had to be reassembled by grep each time
anyone asked.

---

## Legend

- **Key** — ✅ set on staging, ❌ required by `config.ts` but not set, *per-user*
  means the credential belongs to the user and is stored encrypted per row,
  *none* means the endpoint is genuinely unauthenticated.
- A ❌ integration is **built and dead**: the code runs, throws, and the asset
  class reports a failure.

---

## 1. Banking, debt and budgets

| API | What we use it for | Key | Cost |
|---|---|---|---|
| **Plaid** | Bank balances, transactions, investment holdings, liabilities, recurring streams, institution identity | `PLAID_CLIENT_ID` + `PLAID_SECRET` ✅ | $0 on the Trial's 10 production Items. Beyond that: four monthly subscriptions per Item plus per-call Balance. See §6 |
| **TrueLayer** | UK and EU bank accounts (Open Banking) | `TRUELAYER_CLIENT_ID` + `TRUELAYER_CLIENT_SECRET` ✅ | Sandbox free; live pricing not yet sought |
| **Spinwheel** | Student loans and consumer debt | `SPINWHEEL_SECRET_KEY` ✅ | Sandbox free and self-serve; production needs a rep, pricing unpublished |
| **YNAB** | Budget account balances | `YNAB_CLIENT_ID` ✅ (PKCE, no secret) | Free |

## 2. Brokerages and exchanges

| API | What we use it for | Key | Cost |
|---|---|---|---|
| **Alpaca** | US brokerage equity and per-security positions with cost basis | per-user | Free |
| **Coinbase** | Crypto balances (available + hold) **and the spot price feed the whole app shares** | `COINBASE_API_KEY_ID` + `COINBASE_API_KEY_SECRET` ✅ | Free |
| **Kraken** | Crypto balances across five fiats, tokenized suffixes | per-user | Free |
| **Hyperliquid** | Perps account value and spot balances | none | Free |
| **Kalshi** | Prediction market cash + positions | per-user | Free |
| **Polymarket** | Prediction market positions, wallet-scoped | none | Free |

**Note on Coinbase.** It is doing two unrelated jobs: a per-user balance source
*and* the shared spot-price oracle for chain wallets, Kraken and metals. An
outage takes out pricing well beyond Coinbase holdings. `config.ts`
`isSharedCoinbaseKeyAllowed()` confines the shared-key balance mode to
non-production.

## 3. Crypto chains

| API | Chains | Key | Cost |
|---|---|---|---|
| **Zerion** | DeFi positions across all EVM chains | `ZERION_API_KEY` ✅ | Tiered, unpublished; ~$0.01/request pay-per-call anchor |
| **Helius** | Solana, liquid **and staked** | `HELIUS_API_KEY` ✅ | Free tier |
| **Alchemy** | NFT portfolios | `ALCHEMY_API_KEY` ✅ | Free tier |
| **Blockfrost** | Cardano | `BLOCKFROST_PROJECT_ID` ✅ | Free tier |
| **Subscan** | Polkadot | `SUBSCAN_API_KEY` ✅ | Free tier |
| **TonCenter** | TON | `TONCENTER_API_KEY` ❌ | Free tier |
| **Blockstream** | Bitcoin | none | Free |
| **BlockCypher** | Dogecoin, Litecoin, Bitcoin Cash | none | Free |
| **PublicNode LCD** | Cosmos, Osmosis | none | Free |
| **DexScreener** | Long-tail token prices + liquidity depth | none | Free |
| Native public RPC | XRP, Stellar, NEAR, Aptos, Sui, Hedera | none | Free |

**Known coverage gap.** Only Solana reads a staked balance. Cosmos, Polkadot,
NEAR, Aptos, Sui and TON read the liquid balance only, and those chains have
large native staking ecosystems. Cardano's balance is correct (ADA staking is
liquid) but `getCardanoBalance` reads only `lovelace` and discards native
tokens, and unwithdrawn rewards sit on the stake address we never query.

## 4. Real assets

| API | What we use it for | Key | Cost |
|---|---|---|---|
| **RentCast** | Property AVM | `RENTCAST_API_KEY` ❌ | 50 calls/month free, no card |
| **FRED** | FHFA house price index (`USSTHPI`), the index half of DR-21's derived valuation | none | Free. The graph CSV endpoint needs no key; the documented JSON API does |
| **MarketCheck** | Vehicle market value from VIN | `MARKETCHECK_API_KEY` ❌ | 500 calls/month free, then **$299/month with no middle tier** |
| **NHTSA vPIC** | VIN decode: names the car, and skips undecodable VINs before they spend a MarketCheck call | none | Free, US federal |
| **GoldAPI** | Precious metals spot | `GOLDAPI_API_KEY` ✅ | Free tier |
| **EIA** | Energy commodity spot (WTI, natural gas) | `EIA_API_KEY` ✅ | Free |
| **USDA NASS** | Farmland value per acre by state | `USDA_NASS_API_KEY` ✅ | Free |

## 5. Collectibles

| API | What we use it for | Key | Cost |
|---|---|---|---|
| **KicksDB** | Sneaker prices (StockX, GOAT) | `KICKSDB_API_KEY` ✅ | Free tier |
| **Discogs** | Vinyl collection valuation | `DISCOGS_CONSUMER_KEY` + `DISCOGS_CONSUMER_SECRET` ✅ | Free |
| **PCGS** | Graded coin price guide | `PCGS_API_KEY` ✅ | Free tier |
| **TCGapi** | Trading card market prices | `TCGAPI_KEY` ✅ | Free, 100 req/day |
| **PokemonPriceTracker** | Pokémon card prices | `POKEMONPRICETRACKER_API_KEY` ✅ | Free tier |

## 6. Platform

| API | What we use it for | Key | Cost |
|---|---|---|---|
| **Sign in with Apple** | Identity token verification, and grant revocation on account deletion (TN3194) | `APPLE_SIGN_IN_KEY_ID` + `APPLE_SIGN_IN_PRIVATE_KEY` ❌ | Free |
| **APNs** | Push notifications | `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID` ✅ | Free |
| **App Store Server API** | Subscription entitlement verification | certificate-based | Free |
| **Google Identity** | Android sign-in. `/api/auth/google` returns 503 while unset | `GOOGLE_AUTH_CLIENT_ID` ❌ | Free |
| **Frankfurter** | FX rates | none | Free, no daily or monthly caps |

---

## 7. What Plaid actually bills

From `plaid.com/docs/account/billing/`, read 2026-08-19. Plaid publishes billing
*models* but not prices, so this is the shape, not the invoice.

**Per-request flat fee** — *"a flat fee is charged for each successful API call
to that product endpoint."* Of Plaid's per-request list we call exactly one:

| Endpoint | Where |
|---|---|
| `/accounts/balance/get` | `goals/snapshot.ts`, once **per Item** |

We call none of the other per-request endpoints (`/transactions/refresh`,
`/investments/refresh`, `/signal/evaluate`, `/investments/auth/get`,
`/identity/match`, Asset Report PDF).

**Monthly subscription per Item** — *"as long as a valid `access_token`
exists,"* whether or not we call:

| Endpoint | Product |
|---|---|
| `/transactions/sync` | Transactions |
| `/transactions/recurring/get` | **Recurring Transactions — a separate subscription** |
| `/liabilities/get` | Liabilities |
| `/investments/holdings/get` | Investments |
| `/investments/transactions/get` | Investments |

**Free** — `/item/get`, `/item/remove`, `/item/webhook/update`,
`/item/public_token/exchange`, `/institutions/get_by_id`, `/link/token/create`,
`/webhook_verification_key/get`, and the sandbox endpoints.

**Open question, check on the first invoice.** `recurring_transactions` appears
in neither `products` nor `required_if_supported_products` in
`linkTokenCreate`, yet `api/plaid-link.ts` calls the endpoint on every link.
Whether that first call enrolls the Item in a fourth subscription is not stated
in Plaid's docs. Plaid also gates the endpoint behind a product access request,
so confirm it is enabled at all.

**What bounds the billed call.** `GET /api/net-worth` is a pure DB read
(R-16.1). The scheduler cannot reach the balance pull: `ScheduledClass` is
`investments | crypto | defi | debts`. The only path is
`POST /api/net-worth/refresh`, behind a 5/minute rate limit and a daily budget
spent in **calls, not refreshes** (`MANUAL_BANK_BALANCE_CALLS_PER_DAY`).

---

## 8. Gaps, as of 2026-08-19

**Five required keys are unset.** Each integration is built and throws:

| Key | Consequence |
|---|---|
| `RENTCAST_API_KEY` | Property AVM throws. Partly mitigated: FRED derived valuation now covers a property with a purchase price on file |
| `MARKETCHECK_API_KEY` | Vehicle valuation throws. vPIC still names the car |
| `TONCENTER_API_KEY` | TON wallets resolve to unknown |
| `APPLE_SIGN_IN_KEY_ID` + `APPLE_SIGN_IN_PRIVATE_KEY` | Account deletion cannot revoke the Apple grant, which TN3194 requires |
| `GOOGLE_AUTH_CLIENT_ID` | `/api/auth/google` returns 503; Android sign-in unavailable |

**Dead secrets.** `SNAPTRADE_CLIENT_ID` and `SNAPTRADE_CONSUMER_KEY` are still
set on staging. The code was removed in migration `0037_drop_snaptrade` and
`config.ts` no longer reads them. Unset them.

**No API exists at any price**, so manual or derived entry is the answer, not a
vendor hunt: defined-benefit pensions, life insurance cash surrender value,
annuities, TreasuryDirect savings bonds, trusts and donor-advised funds.

**Entity or partner gated**, all with free sandboxes worth starting because the
wait is the cost: Akoya (the only route to Fidelity NetBenefits 401k), Empower
(the only API advertising **vesting balances**), Carta (`read_portfolio_securities`
covers RSUs and options, but only for equity administered on Carta, never
public-company RSUs).

**Do not sign up.** CoinGecko and CoinMarketCap free tiers are not licensed for
commercial use.
