# PayPal REST API Catalog — Reference (May 2026)

Used for: reading a user's PayPal transaction history and account balance.
Auth type: OAuth 2.0 client credentials (server-side, no user OAuth needed for reporting).

---

## Architecture

REST/JSON over HTTPS. OAuth 2.0 client credentials flow — access token lasts ~8.8 hours.

**Base URLs:**
- Sandbox: `https://api-m.sandbox.paypal.com`
- Production: `https://api-m.paypal.com`

**Auth flow:**
```
POST /v1/oauth2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:SECRET)
Body: grant_type=client_credentials
```

Response: `{ access_token, token_type: "Bearer", expires_in: ~31668 }`

Use token in all subsequent calls:
```
Authorization: Bearer {access_token}
```

---

## Key Endpoints

### Transaction history
```
GET /v1/reporting/transactions
```
| Param | Notes |
|---|---|
| `start_date` | RFC 3339, seconds required (e.g. `2026-01-01T00:00:00-0700`) |
| `end_date` | RFC 3339 — max 31-day range per call |
| `transaction_status` | `D`=denied, `P`=pending, `S`=success, `V`=reversed |
| `page_size` | 1–500 (default 100) |
| `fields` | `transaction_info`, `payer_info`, `shipping_info`, `cart_info` |

Response: `transaction_details[]` with `transaction_info` (ID, amounts, status, dates) + `payer_info`.

Note: up to 3-hour delay for new transactions. Max 3 years of history.

### Account balance
```
GET /v1/reporting/balances
```
Balance at a specific point in time.

### Daily summary
```
GET /v1/reporting/get-daily-summary
```
Daily net activity by currency — useful for rolling up PayPal activity.

---

## Sandbox

- Sandbox: `sandbox.paypal.com/signin`
- Two test accounts auto-created in Developer Dashboard → Testing Tools → Sandbox Accounts
  - Buyer (personal) account
  - Seller (business) account
- Full parity with production

---

## Webhooks

| Event | Trigger |
|---|---|
| `PAYMENT.SALE.COMPLETED` | Payment received |
| `PAYMENT.SALE.REFUNDED` | Refund issued |
| `PAYMENT.SALE.REVERSED` | Payment reversed |
| `BILLING.SUBSCRIPTION.ACTIVATED` | Subscription started |
| `BILLING.SUBSCRIPTION.CANCELLED` | Subscription cancelled |

Full webhook setup in Developer Dashboard → Event simulator.

---

## Coiny Usage Pattern

1. User connects PayPal via OAuth (future — for reading their transactions)
2. For dev: use client credentials + reporting endpoints against your own sandbox account
3. Poll `/v1/reporting/transactions` for new PayPal activity
4. PayPal payments/receipts feed into reaction engine same as bank transactions
5. Venmo transactions appear as PayPal transactions (same API)

---

## Error Codes

| Code | Meaning |
|---|---|
| 400 | Bad request / invalid params |
| 401 | Invalid/expired token |
| 403 | Insufficient scope |
| 404 | Resource not found |
| 429 | Rate limited |
| 500 | Server error |
