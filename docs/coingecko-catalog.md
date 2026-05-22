# CoinGecko API Catalog — Reference (May 2026)

Used for: crypto price data alongside Zerion (wallet tracking).
Currently using: **not yet wired**. Free Demo plan for sandbox.

---

## Architecture

REST/JSON over HTTPS. No dedicated sandbox — Demo plan (free) is used for development.

**Base URLs:**
- Free/Demo: `https://api.coingecko.com/api/v3`
- Pro (paid): `https://pro-api.coingecko.com/api/v3`

**Auth:** Pass API key in header (recommended):
```
x-cg-pro-api-key: YOUR_KEY
```
Or as query param: `?x_cg_pro_api_key=YOUR_KEY`

---

## Rate Limits

| Plan | Cost | Credits/mo | Calls/min | Notes |
|---|---|---|---|---|
| Demo (free) | $0 | 10,000 | 100 | Use for dev/sandbox |
| Basic | $35/mo | 100,000 | 300 | Production minimum |
| Analyst | $129/mo | 500,000 | 500 | Webhooks + WebSocket |

All requests count toward limit including failed ones. HTTP 429 = rate limited.

---

## Key Endpoints

### Current price
```
GET /simple/price
```
| Param | Notes |
|---|---|
| `ids` | Coin IDs, comma-separated (e.g. `bitcoin,ethereum`) |
| `vs_currencies` | Target currency (e.g. `usd`) |
| `include_24hr_change` | Boolean — include 24h % change |
| `include_market_cap` | Boolean |
| `include_last_updated_at` | Boolean — UNIX timestamp |

Response:
```json
{
  "bitcoin": {
    "usd": 45200.50,
    "usd_24h_change": 2.45,
    "last_updated_at": 1684756800
  }
}
```

### Coin metadata + images
```
GET /coins/{id}
```
Key response fields:
- `image.thumb` / `.small` / `.large` — logo URLs
- `symbol`, `name`
- `market_data.current_price.usd`
- `market_data.price_change_percentage_24h`
- `market_data.all_time_high.usd`

### Coins list (ID lookup)
```
GET /coins/list
```
Returns full list of all coins with `id`, `symbol`, `name`. Use to map
ticker symbols (e.g. `BTC`) to CoinGecko IDs (e.g. `bitcoin`).

### Historical price range
```
GET /coins/{id}/market_chart/range
```
| Param | Notes |
|---|---|
| `vs_currency` | e.g. `usd` |
| `from` | UNIX timestamp or YYYY-MM-DD |
| `to` | UNIX timestamp or YYYY-MM-DD |

Response: `{ prices: [[timestamp, price], ...] }`

Auto granularity: 1 day → 5min, 1–90 days → hourly, 90+ days → daily.

### Market data (batch, with filtering)
```
GET /coins/markets
```
| Param | Notes |
|---|---|
| `vs_currency` | e.g. `usd` |
| `ids` | Up to 250 coin IDs |
| `price_change_percentage` | `"1h,24h,7d"` |

Key response fields: `current_price`, `image`, `price_change_percentage_24h`,
`market_cap_rank`, `high_24h`, `low_24h`

### Token price by contract address (for DeFi tokens)
```
GET /simple/token_price/{platform}
```
- `platform`: `ethereum`, `solana`, `polygon`, etc.
- `contract_addresses`: token contract address(es)
- Max 515 addresses per request

---

## Webhooks

Available on Analyst plan ($129/mo) and above only. Not needed for prototype.

---

## No Portfolio Endpoints

CoinGecko has no portfolio API. We store user holdings in our DB
(`coin_id`, `amount`, `purchase_price`, `purchase_date`) and call
`/simple/price` to compute current value and gains/losses.

---

## Coiny Usage Pattern

1. Zerion fires webhook when wallet transaction occurs → we get coin + amount
2. Call `/simple/price?ids={coin}&vs_currencies=usd&include_24hr_change=true`
3. Compute gain/loss → feed into reaction engine
4. Use `/coins/{id}` for logo URL in push notification

---

## Error Codes

| Code | Meaning |
|---|---|
| 400 | Bad request / invalid params |
| 404 | Coin not found |
| 429 | Rate limit exceeded — implement exponential backoff |
| 500 | Server error |
