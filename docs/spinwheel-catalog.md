# Spinwheel API Catalog — Reference (May 2026)

Used for: student loan, credit card, auto loan, and mortgage data. Debt profile,
real-time balances, payment history, refinance eligibility.

---

## Architecture

REST/JSON over HTTPS. Secret key auth.

**Base URLs:**
- Sandbox: `https://sandbox-api.spinwheel.io`
- Production: `https://api.spinwheel.io`
- Secure user endpoints (sandbox): `https://secure-sandbox-api.spinwheel.io/v1/users`
- Secure user endpoints (production): `https://secure-api.spinwheel.io/v1/users`

**Auth:** Bearer token — secret key in Authorization header:
```
Authorization: Bearer ${secretKey}
```

---

## User Connection (3 methods)

Users must connect via one of:

**SMS OTP:**
```
POST /v1/users/connect/sms/          — send OTP (5-min expiry)
POST /v1/users/connect/sms/verify    — verify OTP code
```
Params: `phone`, `dateOfBirth`, `extUserId`

**Knowledge-Based Auth (KBA):**
```
POST /v1/users/connect/kba/
POST /v1/users/connect/kba/verify
```
Fallback for users who can't receive SMS.

**Pre-Verified (single step, requires Spinwheel approval):**
```
POST /v1/users/connect/pre-verified
```

---

## Key Endpoints

### Debt profile (liability snapshot)
```
GET /v1/users/{userId}/debtProfile
```
Returns all liabilities with payment history codes, credit limits.

### Detailed liabilities
```
GET /v1/users/{userId}/liabilities
```
Student loans, credit cards, auto loans, mortgages.

### Real-time balances
```
GET /v1/users/{userId}/balances?liabilityIds={ids}
```
Live credit card / loan balances at request time.

### Refresh user data
```
POST /v1/users/{userId}/refresh
```
Updates top-level user + liability data, detects new liabilities.

---

## Data Available

- Credit profiles (Equifax, TransUnion) — PDF reports available
- Student loans, credit cards, auto loans, mortgages
- Real-time balances, payment history, credit limits
- Bank account balances
- Refinance eligibility

---

## Webhooks

**Sandbox IPs:** 34.203.72.127, 52.2.114.95, 52.12.60.65
**Production IPs:** 44.232.30.137, 3.230.55.249

| Event | Trigger |
|---|---|
| `SUBSCRIPTION_ACTIVATED` | User enrolled in Debt Profile Refresh |
| `SUBSCRIPTION_FAILED` | Enrollment failure |
| `USER_CREDIT_PROFILE_TRANSACTION` | Credit report pull succeeded |
| `USER_CREDIT_PROFILE_TRANSACTION_FAILED` | Credit report pull failed |
| `REFRESH_TRANSACTION_STATUS` | Real-time balance refresh complete |
| `USER_PAYMENT_STATUS` | User payment status change |
| `PLATFORM_PAYMENT_STATUS` | Payment request state change |
| `USER_REFINANCE_STATUS` | Refinance application status |
| `BANK_ACCOUNT_LOOKUP_STATUS_CHANGE` | Bank lookup complete |
| `LIABILITY_GROUP_PAYOFF_QUOTE_STATUS_CHANGE` | Student loan payoff quote |

---

## Sandbox

Full parity with production. Test users at: `https://developer.spinwheel.io/docs/test-users`

Simulate payment transactions:
```
PATCH /sandbox/transactions/{transactionId}/simulate
```

Webhook simulator available in developer portal.

---

## Coiny Usage Pattern

1. User connects via SMS OTP or KBA during onboarding
2. Call `/v1/users/{userId}/debtProfile` — add liabilities to net worth (negative)
3. Subscribe to `REFRESH_TRANSACTION_STATUS` webhook for balance updates
4. Debt paydown events (balance decreases) → positive reaction
5. New liability detected → alert reaction
6. Minimum payment missed → negative reaction

---

## Error Codes

| Code | Meaning |
|---|---|
| 400 | Bad request / invalid params |
| 401 | Invalid secret key |
| 404 | User not found |
| 429 | Rate limited (OTP: 1 resend / 30s / phone) |
| 500 | Server error |
