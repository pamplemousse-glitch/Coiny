# Zerion API Catalog — Reference (May 2026)

Used for: crypto wallet portfolio tracking across 38+ chains (Ethereum, Solana, Base, Polygon, etc.).
Covers: token balances, DeFi positions, NFTs, transaction history — all normalized across chains.

---

## Architecture

REST/JSON over HTTPS. Basic Auth with API key.

**Base URL:** `https://api.zerion.io`

**Auth:** HTTP Basic Auth — append colon to API key, Base64-encode:
```
Authorization: Basic BASE64(API_KEY:)
```

No sandbox — development keys hit live chain data.

---

## Rate Limits

| Tier | Requests/min | Requests/day |
|---|---|---|
| Development | 120 | 5,000 |
| Enterprise | Custom | Custom |

HTTP 429 on breach.

---

## Supported Chains

38+ chains including: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, Solana, BNB Chain, Fantom, and more.

Same endpoint schema for EVM and non-EVM chains — responses are normalized.

---

## Key Endpoints

### Full portfolio (single call)
```
GET /v1/wallets/{address}/portfolio
```
Returns total USD value across all tokens + DeFi positions + NFTs. Best single call for net worth contribution.

### Token + DeFi positions (detailed)
```
GET /v1/wallets/{address}/positions/
```
Params:
- `filter[position_types]`: `wallet`, `deposited`, `borrowed`, `staked`, `locked`
- `filter[chain_ids]`: filter by chain
- `currency`: `usd` (default)

Returns individual holdings with `value`, `quantity`, `price`, `unrealized_gains`.

### Transaction history
```
GET /v1/wallets/{address}/transactions/
```
Params:
- `filter[operation_types]`: `trade`, `send`, `receive`, `deposit`, `withdraw`, `stake`, `unstake`
- `filter[chain_ids]`
- `filter[asset_types]`
- `page[size]` / `page[after]` (cursor pagination)

Returns human-readable transactions — includes what was swapped, sent, received.

### Balance chart (sparkline)
```
GET /v1/wallets/{address}/balance-chart
```
Returns time-series USD value for charting portfolio history.

---

## Webhooks

Real-time wallet activity and price change events. Available on paid tiers.

Events:
- Wallet transaction confirmed
- Token price threshold crossed
- DeFi position health factor change

---

## Coiny Usage Pattern

1. User connects wallet address (or detected from Coinbase/exchange)
2. Call `/v1/wallets/{address}/portfolio` — add to net worth calculation
3. Poll `/v1/wallets/{address}/transactions/` for new activity → reaction engine
4. Staking rewards, DeFi yield, and swaps all generate reactions
5. Pair with CoinGecko for price data if needed (Zerion already includes USD values)

---

## MCP Server

Zerion has an MCP server for AI agent integration:
```bash
npx -y zerion-cli init -y --browser
```

---

## Error Codes

| Code | Meaning |
|---|---|
| 400 | Bad request / invalid address |
| 401 | Invalid API key |
| 404 | Wallet not found / no data |
| 429 | Rate limited |
| 500 | Server error |
