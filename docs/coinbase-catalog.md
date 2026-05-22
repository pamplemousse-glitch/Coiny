# Coinbase App API Catalog — Reference (May 2026)

Used for: reading a user's Coinbase crypto holdings and transaction history.
Auth type: ECDSA JWT (dev key against your own account; OAuth2 for users' accounts at launch).

---

## Architecture

REST/JSON over HTTPS. JWT-authenticated — token generated per-request, 2-minute TTL.

**Base URL:** `https://api.coinbase.com`

**Auth:** Generate a JWT signed with your ECDSA private key:
```
Authorization: Bearer $JWT
```

JWT payload fields:
- `iss: 'cdp'`
- `sub: organizations/{org_id}/apiKeys/{key_id}`
- `uri`: HTTP method + host + path (e.g. `GET api.coinbase.com/api/v3/brokerage/accounts`)
- `nbf` / `exp`: issued at / expires at (120s window)

**Important:** Must use ECDSA (P-256 / ES256) — Ed25519 is NOT supported for Coinbase App SDK.

---

## Rate Limits

| Method | Limit |
|---|---|
| GET (read) | 600 req / 10s |
| POST/PUT/DELETE (write) | 500 req / 10s |

HTTP 429 on breach. Implement exponential backoff.

---

## Sandbox

No true sandbox for Coinbase App API — dev keys hit production with real account data.

A separate **Advanced Trade sandbox** exists at `https://api-sandbox.coinbase.com` with static responses, but it only covers Orders/Accounts, not the full portfolio endpoints.

**Dev strategy:** Use your own Coinbase account with the dev API key (ECDSA) for testing. Keep balances small.

---

## Key Endpoints

### List accounts (wallets + balances)
```
GET /api/v3/brokerage/accounts
```
Returns all accounts (BTC, ETH, etc.) with `balance.value` and `balance.currency`.

### Single account
```
GET /api/v3/brokerage/accounts/{account_id}
```

### Transaction history
```
GET /api/v3/brokerage/transactions
```
Params: `account_id`, `limit`, `cursor` (pagination)

---

## Coinbase App (OAuth2) — for users' accounts

For the actual product, users connect their Coinbase via OAuth2:

- Auth URL: `https://www.coinbase.com/oauth/authorize`
- Token URL: `https://api.coinbase.com/oauth/token`
- Scopes needed:
  - `wallet:accounts:read` — balances
  - `wallet:transactions:read` — transaction history
  - `wallet:user:read` — user profile

**Redirect URI (dev):** `http://localhost:3000/auth/coinbase/callback`

OAuth2 implementation: standard PKCE flow. Tokens expire in 2 hours; use refresh token.

---

## Coiny Usage Pattern

1. User connects Coinbase via OAuth2 (or dev key for own account)
2. Call `/api/v3/brokerage/accounts` to get all crypto holdings
3. Pair with CoinGecko `/simple/price` for USD values
4. Poll `/api/v3/brokerage/transactions` for new activity → reaction engine
5. Crypto gains/losses computed same as bank gains — feed into pet reaction

---

## Error Codes

| Code | Meaning |
|---|---|
| 400 | Bad request |
| 401 | Invalid/expired JWT |
| 403 | Insufficient scope |
| 429 | Rate limited |
| 500 | Server error |
