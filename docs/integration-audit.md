# Integration Audit

_One integration per section. Status: ✅ Clean / ⚠️ Fixed / 🔴 Bug / ⏳ Not yet audited._
_Last updated: 2026-05-28. Audit branch: test/integration-vendors (then PRs per fix)._

---

## Audit method

For each integration:
1. Find the official llms.txt or primary API docs (not the saved context file alone)
2. Read the client source against the live spec
3. Check: auth params, endpoint URLs, response parsing, error handling
4. Fix anything wrong on a dedicated branch → PR

---

## 1. Kalshi — prediction markets

**Status: ⚠️ Fixed (PR #143)**

Source: `https://docs.kalshi.com/llms.txt` (exists — used during build)
Auth: RSA-PSS SHA256 (signing headers)

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Header names | KALSHI-ACCESS-KEY / TIMESTAMP / SIGNATURE | ✓ | ✅ |
| Timestamp unit | milliseconds | `Date.now().toString()` | ✅ |
| Message format | `timestamp + METHOD + path` (no query) | ✓ | ✅ |
| Salt length | RSA_PSS_SALTLEN_DIGEST (= 32 for SHA-256) | `saltLength: 32` | ✅ equivalent |
| Base URL | `https://external-api.kalshi.com/trade-api/v2` (primary) | Was `api.elections.kalshi.com` (alt) | ⚠️ Fixed |
| Response field | `portfolio_value` cents → USD | ÷100, falls back to `balance` | ✅ |

---

## 2. Discogs — vinyl collection OAuth 1.0a

**Status: ⚠️ Fixed (PR #144)**

Source: `https://www.discogs.com/developers/` (403 from CI env); cross-referenced against official Python client + context doc
Auth: OAuth 1.0a HMAC-SHA1

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Request token URL | `GET https://api.discogs.com/oauth/request_token` | ✓ | ✅ |
| Authorize URL | `https://www.discogs.com/oauth/authorize?oauth_token=…` | ✓ | ✅ |
| Access token URL | `POST https://api.discogs.com/oauth/access_token` | ✓ | ✅ |
| Identity endpoint | `GET https://api.discogs.com/oauth/identity` | ✓ | ✅ |
| Signature method | HMAC-SHA1 | ✓ | ✅ |
| User-Agent required | Yes, on every request | ✓ present on all calls | ✅ |
| OAuth base string — no query params in URL | Must strip query string from URI in base string; query params go into param set | URL with `?per_page=100&page=1` passed directly into `pct(url)` in base string; query params not added to `params` | 🔴 **Bug** |

**Fix applied in `buildAuthHeader`:** `new URL(url)` splits base URL from query string; `searchParams` merged into `params` for signing; Authorization header filtered to `oauth_*` keys only. Test added to verify `per_page`/`page` never appear in the Authorization header.

---

## 3. Kraken — CEX spot balances

**Status: ✅ Clean**

Source: no llms.txt; verified against https://docs.kraken.com/api/docs/guides/spot-rest-auth/
Auth: HMAC-SHA512 (private key signing)

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Signing algo | SHA256(nonce+postData) binary → HMAC-SHA512(path+hash, base64-decode(key)) | ✓ | ✅ |
| Nonce | always-increasing ms timestamp | `Date.now().toString()` | ✅ |
| postData | URLSearchParams({nonce, ...params}) | ✓ | ✅ |
| Headers | API-Key, API-Sign | ✓ | ✅ |
| Response | `{error: [], result: {}}` | ✓ | ✅ |
| Asset name normalization | XXBT→BTC, ZUSD→USD etc., strip .S/.M/.B/.F | ✓ | ✅ |

---

## 4. SnapTrade — brokerage aggregator

**Status: ✅ Clean**

Source: https://docs.snaptrade.com/llms.txt (exists); verified against https://docs.snaptrade.com/docs/request-signatures
Auth: HMAC-SHA256 partner signing

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Signing payload | canonical JSON `{content, path, query}` with alphabetically sorted keys at every level | `sortedStringify({ content, path, query })` | ✅ |
| Key | consumerKey | `config.SNAPTRADE_CONSUMER_KEY` | ✅ |
| Digest | HMAC-SHA256 → base64 | ✓ | ✅ |
| Header | `Signature` | ✓ | ✅ |
| Required query params | `clientId` + `timestamp` (Unix seconds) | `{ clientId, timestamp, ...params }` | ✅ |

---

## 5. YNAB — budgeting

**Status: ✅ Clean**

Source: https://github.com/ynab/ynab-sdk-js (SDK); v4.0.0 release notes confirm `/budgets` still supported
Auth: OAuth 2.0 PKCE

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Token endpoint | `https://api.ynab.com/oauth/token` | ✓ | ✅ |
| Authorize URL | `https://app.ynab.com/oauth/authorize` | ✓ | ✅ |
| PKCE params | `code_challenge`, `code_challenge_method: S256`, `code_verifier` | ✓ | ✅ |
| API base | `https://api.ynab.com/v1` | ✓ | ✅ |
| Budgets path | `GET /budgets` → `data.budgets[]` | ✓ (still supported, old API) | ✅ |
| Accounts path | `GET /budgets/{id}/accounts` → `data.accounts[]` | ✓ | ✅ |
| Balance units | milliunits ÷ 1000 | ✓ | ✅ |
| Bearer auth | `Authorization: Bearer {token}` | ✓ | ✅ |

---

## 6. KicksDB — sneaker pricing

**Status: ⚠️ Fixed (PR #145)**

Source: `docs/context/kicksdb-openapi.json` (OpenAPI spec — high confidence)
Auth: API key in `Authorization` header

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Base URL | `https://api.kicks.dev` | ✓ | ✅ |
| Auth header | `Authorization: {api_key}` | ✓ | ✅ |
| Endpoint | `GET /v3/stockx/products` | ✓ | ✅ |
| market param | enum: `US`, `UK`, `DE`, … (country codes) | Was `USD` → fixed to `US` | ⚠️ Fixed |
| Response | `{ data: StockXProduct[] }` | ✓ | ✅ |
| Product fields | `min_price`, `variants[].lowest_ask`, `variants[].size` | ✓ | ✅ |

---

## 7. Hyperliquid — perps

**Status: ✅ Clean**

Source: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
Auth: none (read-only public endpoint)

| Check | Spec | Implementation | Result |
|---|---|---|---|
| URL | `https://api.hyperliquid.xyz/info` | ✓ | ✅ |
| Request | POST `{ type: 'clearinghouseState', user: address }` | ✓ | ✅ |
| crossMarginSummary.accountValue | string → parseFloat | ✓ | ✅ |
| assetPositions[].position fields | coin, szi, entryPx, unrealizedPnl (all strings) | ✓ | ✅ |
| Zero-position filter | `szi !== '0'` | ✓ | ✅ |

---

## 8. GoldAPI — precious metals

**Status: ✅ Clean**

Source: https://www.goldapi.io/llms.txt (exists)
Auth: `x-access-token` header

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Base URL | `https://www.goldapi.io` | ✓ | ✅ |
| Endpoint | `GET /api/{metal}/USD` | ✓ | ✅ |
| Auth header | `x-access-token` | ✓ | ✅ |
| Metal symbols | XAU, XAG, XPT, XPD | passed via `metal` param | ✅ |
| Response field | `price` (number) | ✓ | ✅ |

---

## 9. RentCast — real estate AVM

**Status: ✅ Clean**

Source: https://developers.rentcast.io/llms.txt (exists)
Auth: `X-Api-Key` header

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Endpoint | `GET https://api.rentcast.io/v1/avm/value?address=...` | ✓ | ✅ |
| Auth header | `X-Api-Key` | ✓ | ✅ |
| Response field | `price` (number) | ✓ | ✅ |

---

## 10. MarketCheck — vehicle values

**Status: ⚠️ Fixed (PR #146)**

Source: https://docs.marketcheck.com/llms.txt (exists)
Auth: `api_key` query param

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Endpoint | `https://api.marketcheck.com/v2/predict/car/us/marketcheck_price` | Was `mc-api.marketcheck.com/v2/predict/car/value` (404) | ⚠️ Fixed |
| Response field | `marketcheck_price` | Was `listing_price`/`predicted_price` (don't exist) | ⚠️ Fixed |
| Required params | `vin`, `miles`, `dealer_type`, `zip` | Was missing `miles`, `dealer_type`, `zip` | ⚠️ Fixed |

---

## 11. Bitcoin (Blockstream Esplora)

**Status: ✅ Clean**

Source: https://blockstream.info/api (public REST)
Auth: none

| Check | Spec | Implementation | Result |
|---|---|---|---|
| URL | `GET https://blockstream.info/api/address/{address}` | ✓ | ✅ |
| Balance calc | `chain_stats.funded_txo_sum - chain_stats.spent_txo_sum` (confirmed only) | ✓ | ✅ |
| Units | satoshis ÷ 1e8 | ✓ | ✅ |
| 404 → 0 | yes | ✓ | ✅ |

---

## 12. XRP (XRPL JSON-RPC)

**Status: ✅ Clean**

Source: https://xrplcluster.com (public cluster)
Auth: none

| Check | Spec | Implementation | Result |
|---|---|---|---|
| URL | `POST https://xrplcluster.com` | ✓ | ✅ |
| Request | `{ method: 'account_info', params: [{ account, ledger_index: 'validated' }] }` | ✓ | ✅ |
| Balance field | `result.account_data.Balance` (drops) ÷ 1e6 | ✓ | ✅ |
| actNotFound → 0 | yes | ✓ | ✅ |

---

## 13. Stellar (Horizon)

**Status: ✅ Clean**

Source: https://horizon.stellar.org
Auth: none

| Check | Spec | Implementation | Result |
|---|---|---|---|
| URL | `GET https://horizon.stellar.org/accounts/{address}` | ✓ | ✅ |
| Balance | find `asset_type === 'native'` in `balances[]`, parse `balance` string | ✓ | ✅ |
| 404 → 0 | yes | ✓ | ✅ |

---

## 14. DOGE / LTC / BCH (BlockCypher)

**Status: ⚠️ Fixed (PR #147)**

Source: https://www.blockcypher.com/dev/bitcoin/#address-balance-endpoint
Auth: none (optional API key)

| Check | Spec | Implementation | Result |
|---|---|---|---|
| URL pattern | `GET /v1/{coin}/{chain}/addrs/{addr}/balance` with `doge/main`, `ltc/main`, `bch/main` | ✓ | ✅ |
| Balance field | `balance` = confirmed only; `final_balance` = confirmed + unconfirmed | Was `final_balance` → fixed to `balance` | ⚠️ Fixed |
| Units | satoshis ÷ 1e8 | ✓ | ✅ |

---

## 15. Cosmos / Osmosis (public LCD)

**Status: ✅ Clean**

Source: https://cosmos-rest.publicnode.com (publicnode LCD)
Auth: none

| Check | Spec | Implementation | Result |
|---|---|---|---|
| URL | `GET /cosmos/bank/v1beta1/balances/{address}` | ✓ | ✅ |
| Endpoints | cosmos-rest.publicnode.com, osmosis-rest.publicnode.com | ✓ | ✅ |
| Denominations | `uatom` (Cosmos), `uosmo` (Osmosis) | ✓ | ✅ |
| Units | micro-units ÷ 1e6 | ✓ | ✅ |

---

## 16. NEAR / Aptos / Sui / Hedera

**Status: ✅ Clean**

Sources: public RPCs
Auth: none

| Chain | URL | Key fields | Units | Result |
|---|---|---|---|---|
| NEAR | `https://rpc.mainnet.near.org` | `query/view_account` → `result.amount` | yoctoNEAR ÷ 1e24 | ✅ |
| Aptos | `https://fullnode.mainnet.aptoslabs.com/v1/accounts/{addr}/resources` | Find `0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>` → `data.coin.value` | octas ÷ 1e8 | ✅ |
| Sui | `https://fullnode.mainnet.sui.io` `suix_getBalance` | `result.totalBalance` | MIST ÷ 1e9 | ✅ |
| Hedera | `https://mainnet-public.mirrornode.hedera.com/api/v1/balances?account.id=...` | `balances[0].balance` | tinybars ÷ 1e8 | ✅ |

---

## 17. Polkadot (Subscan)

**Status: ✅ Clean (unverifiable — requires API key)**

Source: https://polkadot.api.subscan.io/api/v2/scan/search
Auth: `X-API-Key` header

Implementation uses `parseFloat(data.account.balance)` with no division — consistent with Subscan returning human-readable DOT format. API requires key (Antoine hasn't signed up yet); units can't be verified without live data.

---

## 18. Cardano (Blockfrost)

**Status: ✅ Clean**

Source: https://docs.blockfrost.io
Auth: `project_id` header

| Check | Spec | Implementation | Result |
|---|---|---|---|
| URL | `GET https://cardano-mainnet.blockfrost.io/api/v0/addresses/{address}` | ✓ | ✅ |
| Auth header | `project_id` | ✓ | ✅ |
| Balance | find `unit === 'lovelace'` in `amount[]` → `quantity` ÷ 1e6 | ✓ | ✅ |

---

## 19. TON (TonCenter)

**Status: ✅ Clean**

Source: https://toncenter.com/api/v2/getAddressBalance (probed live)
Auth: `X-API-Key` header (optional)

| Check | Spec | Implementation | Result |
|---|---|---|---|
| URL | `GET https://toncenter.com/api/v2/getAddressBalance?address=...` | ✓ | ✅ |
| Auth header | `X-API-Key` | ✓ | ✅ |
| Response | `{ ok: boolean, result: string }` — result is nanotons as string | ✓ | ✅ |
| Units | nanotons ÷ 1e9 | ✓ (parseInt / 1e9) | ✅ |

---

## 20. Zerion — EVM / Solana / DeFi wallets

**Status: ✅ Clean**

Source: `docs/context/zerion.md` (from llms.txt)
Auth: Basic auth (API key as username, empty password)

Previously audited and fixed in PR #92. Re-verified this session: auth encoding, retry logic, spam filter, pagination, and totals all match spec.

---

## 21. Coinbase — CEX spot balances + analytics

**Status: ✅ Clean**

Source: `docs/context/coinbase.md` (from llms.txt)
Auth: JWT ECDSA ES256 with `kid` + `nonce` in protected header; `uri` claim = `METHOD api.coinbase.com/path`

Previously audited and fixed across PRs #93, #106, #107, #108. Re-verified this session: JWT signing, v2 spot price endpoint, advanced trade sandbox, all correct.

---

## 22. Plaid — bank accounts + investments

**Status: ✅ Clean**

Source: `docs/context/plaid.md` (from plaid.com/docs/llms-full.txt)
Auth: `client_id` + `secret` in POST body; `Plaid-Version: 2020-09-14` header

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Base URLs | sandbox/development/production.plaid.com | ✓ switch on `PLAID_ENV` | ✅ |
| API version header | `Plaid-Version: 2020-09-14` | `plaid-version: 2020-09-14` (case-insensitive HTTP header) | ✅ |
| Auth | `client_id` + `secret` in body | ✓ | ✅ |
| `transactions/sync` options | `include_personal_finance_category: true` | ✓ | ✅ |
| `removed[]` fields | `transaction_id` + `account_id` (account_id added in 2024) | ✓ | ✅ |
| Webhook signature | ES256 JWT via `plaid-verification` header; verify `request_body_sha256` | ✓ full impl in `plaid/signature.ts` | ✅ |
| Webhook age check | ±5 minutes | ✓ `MAX_AGE_SECONDS = 5 * 60` | ✅ |
| `webhookVerificationKeyGet` | `POST /webhook_verification_key/get` with `key_id` | ✓ | ✅ |
| Key cache | Per-kid, never evict (rotation → new kid) | ✓ `Map<string, CryptoKeyLike>` | ✅ |
| Cursor pagination | Loop until `has_more === false`; advance cursor after persist | ✓ | ✅ |
| `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` | Restart from original cursor | ✓ | ✅ |
| `link/token/create` | `products`, `language`, `country_codes`, `user.client_user_id`, `webhook` | ✓ | ✅ |
| Response 200 before async dispatch | `setImmediate` for processing | ✓ | ✅ |

---

## 23. Spinwheel — debt + credit score

**Status: ⚠️ Fixed (PR #148)**

Source: `docs/context/spinwheel.md` (from docs.spinwheel.io/llms.txt); verified against live API reference
Auth: `Authorization: Bearer {secretKey}` header

| Check | Spec | Implementation | Result |
|---|---|---|---|
| Base URL | `sandbox-api.spinwheel.io` / `api.spinwheel.io` | `SPINWHEEL_BASE_URL` config key | ✅ |
| Auth header | `Authorization: Bearer {key}` | ✓ | ✅ |
| SMS connect endpoint | `POST /v1/users/connect/sms` | ✓ | ✅ |
| SMS connect body | `{ phoneNumber, dateOfBirth, extUserId }` | ✓ | ✅ |
| SMS verify endpoint | `POST /v1/users/{userId}/connect/sms/verify` | ✓ | ✅ |
| SMS verify body | `{ code }` only | ✓ | ✅ |
| Debt profile body | `{ creditReport: { type, sourceBureau }, creditScore: { model, sourceBureau } }` | Was flat `{ creditReportType, sourceBureau, creditScoreModel }` | ⚠️ Fixed |
| Credit score path | `creditReports[0].profile.creditScore` | ✓ | ✅ |
| Subscribe body | `{ subscriptions: [{ subscriptionType: 'DEBT_PROFILE.REFRESH', configuration: { refreshFrequency, creditReport, creditScore } }] }` | Was `{ type: 'CREDIT_PROFILE', frequency: 'MONTHLY' }` | ⚠️ Fixed |
| Delete user | `DELETE /v1/users/{userId}` | ✓ | ✅ |
| Response envelope | `{ status: { code, desc, messages }, data: {...} }` | ✓ | ✅ |
