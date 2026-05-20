# Plaid Integration — Contract Reference

**Purpose:** canonical record of how Coiny interacts with Plaid's API, what we
assume Plaid will do, and the gotchas we've already paid for. Not a tutorial;
not a plan. When Plaid changes their docs or behavior, diff against this file.

**Decision date:** 2026-05-19. Reviewed against
[plaid.com/docs](https://plaid.com/docs/) as of that date.

---

## 1. Why Plaid

| Aspect | Plaid | Teller (rejected) |
|---|---|---|
| Industry default | Yes — Robinhood, Venmo, Coinbase, Chime, Acorns | No |
| Sandbox friction | Sign-up only, no questionnaire | Same |
| Production friction | ~6h security questionnaire + approval gate | Click-wrap only |
| Cost at 100 users | ~$60–300 / mo | ~$20–40 / mo |
| Coverage | Largest in US, OAuth-supported banks | Major banks only |
| Transaction categorization | ML-enriched (Personal Finance Category v2) | None |
| Investments product | First-class | None |

Decision: take the industry default, eat the cost. Sandbox-only through
Phases 1–4 means we don't hit the production gate until launch.

---

## 2. Endpoints we use

Five real API endpoints + one sandbox helper. Each is a single POST returning JSON.

| Endpoint | When | Auth |
|---|---|---|
| `POST /link/token/create` | Mobile requests bank-link session | `client_id` + `secret` |
| `POST /item/public_token/exchange` | Mobile completes Link, sends `public_token` | `client_id` + `secret` |
| `POST /transactions/sync` | Webhook handler pulls new txns | `client_id` + `secret` + `access_token` |
| `POST /webhook_verification_key/get` | Webhook handler fetches signing key | `client_id` + `secret` |
| `POST /item/get` | (Future) inspect Item state on errors | `client_id` + `secret` + `access_token` |
| `POST /sandbox/item/fire_webhook` | Tests only — trigger webhook delivery | `client_id` + `secret` + `access_token` |

**Base URLs:**
- Sandbox: `https://sandbox.plaid.com`
- Development: `https://development.plaid.com` (skipped; we go sandbox→production)
- Production: `https://production.plaid.com`

Selected via `PLAID_ENV` env var.

**No SDK.** We use `undici` directly. The official `plaid` npm package is
~5 MB with all endpoints; we only need 5. Direct HTTPS keeps the surface
small and dependency-tree light.

---

## 3. Auth model

Two static credentials per environment:
- `client_id` — same across all envs, public-ish
- `secret` — per-env, sensitive

Both sent in the request body (not headers — Plaid accepts either; body is the
canonical recommendation). Stored as Fly secrets in production
(`PLAID_CLIENT_ID`, `PLAID_SECRET`) and as macOS Keychain entries locally
(`coiny-plaid-client-id`, `coiny-plaid-sandbox-secret`).

**No mTLS.** Plain HTTPS. Simpler than Teller — no cert/key files outside the
repo, no base64 hydration in `entrypoint.sh`.

**Access tokens.** Long-lived, opaque, per-Item. Plaid's docs don't commit to
an explicit lifetime — "persists until you explicitly call `/item/remove` or
the user revokes permissions." Treat as effectively permanent until an Item
error tells us otherwise.

---

## 4. Webhook security model

### 4.1 What Plaid sends

Every webhook POST carries:
- Header: `Plaid-Verification` — a JWT signed with ES256 (ECDSA P-256 + SHA-256)
- JWT header: `alg=ES256`, `kid=<key-id>`, `typ=JWT`
- JWT payload: `iat` (issued-at), `request_body_sha256` (SHA-256 of raw webhook body)

### 4.2 Verification flow

1. Parse `Plaid-Verification` header → JWT
2. Extract `kid` from JWT header
3. Look up the public key for `kid` (in our cache, or fetch from Plaid)
4. Verify JWT signature with that key
5. Verify `iat` is within last 5 minutes (replay protection — Plaid doesn't
   document a timestamp window, but webhook delivery should always be prompt;
   5 min matches the Teller pattern we already use)
6. Compute SHA-256 of raw webhook body, compare to JWT's `request_body_sha256`
7. If all pass, the webhook is authentic

### 4.3 Key fetch endpoint

```
POST https://<env>.plaid.com/webhook_verification_key/get
Body: { client_id, secret, key_id }
Response: { key: { alg, crv, kid, kty, use, x, y, created_at, expired_at } }
```

The returned `key` is a JWK with EC P-256 coordinates. The `jose` library
accepts JWKs directly.

### 4.4 Caching strategy

- In-memory `Map<kid, { key, fetchedAt }>` keyed by `kid`
- On incoming webhook with unknown `kid`: fetch and cache
- Refresh policy: trust the cached key. If Plaid rotates and we have a stale
  key for a given `kid`, verification fails and we return 401; Plaid retries;
  by retry time the rotated key will have a new `kid` that triggers a fresh
  fetch. **Don't TTL-evict** — keys are immutable for their `kid`.
- Optionally honor `expired_at` from the JWK if Plaid populates it

### 4.5 Why this differs from Teller

| | Teller | Plaid |
|---|---|---|
| Algorithm | HMAC-SHA256 | ECDSA P-256 SHA-256 (asymmetric) |
| Key source | Static, shared secret in env | Plaid API, per-`kid`, rotatable |
| Header format | `t=<ts>,v1=<hex-sig>` | Full JWT |
| Body coverage | Raw bytes | `request_body_sha256` |
| Replay window | We enforce 3 min | We enforce 5 min (no Plaid spec) |

---

## 5. `/transactions/sync` — the heart of the integration

### 5.1 Contract

**Request:**
```
POST /transactions/sync
{
  client_id, secret, access_token,
  cursor?: string,            // omit on first call
  count?: number,             // default 100, max 500
  options?: {
    include_original_description?: boolean,
    personal_finance_category_version?: 'v1' | 'v2',
    days_requested?: number   // first call only, default 90, max 730
  }
}
```

**Response:**
```
{
  accounts: Account[],                      // current balances included
  added: Transaction[],                     // new transactions
  modified: Transaction[],                  // updated (pending → posted, etc.)
  removed: { transaction_id, account_id }[],// deleted
  next_cursor: string,
  has_more: boolean,
  transactions_update_status: 'NOT_READY' | 'INITIAL_UPDATE_COMPLETE' | 'HISTORICAL_UPDATE_COMPLETE',
  request_id: string
}
```

### 5.2 Cursor rules

- **First call:** omit `cursor` → returns everything Plaid has fetched so far
  (up to `days_requested` of history). Cursor in response is now your anchor.
- **Subsequent calls:** pass `cursor` from the last successful response → returns
  delta since that cursor.
- **Pagination:** while `has_more === true`, call again with `next_cursor`.
- **Pagination error recovery:** if a sync call during pagination returns
  `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION`, restart from the cursor that
  began *this* pagination loop (the cursor before the first call), not the
  failed page's cursor.
- **Cursor validity:** "at least 1 year after reaching `has_more: false`" per
  Plaid. Effectively permanent for our purposes.

### 5.3 Initial sync flood — our handling

The first `/transactions/sync` call returns up to 90 days of history. If we
ran the rule engine on every one, the pet would dispatch dozens of
"paycheck received" and "large purchase" reactions for past events.

**Our rule:** on the very first sync per Item (cursor was null), we ingest the
cursor and balance only — **we do not run the rule engine**. From then on,
every `added` transaction goes through rules.

Tracked via `plaid_items.initial_sync_complete: boolean`. Set to `true` after
the first paginated sync finishes (`has_more === false`).

### 5.4 What we do with the three arrays

| Array | Phase 1 behavior | Future |
|---|---|---|
| `added` | Run rule engine, dispatch reactions, persist | — |
| `modified` | Log for observability, ignore | Phase 2: re-evaluate (e.g., pending → posted may flip a `large_purchase` rule) |
| `removed` | Log for observability, ignore | Phase 2+: reverse reactions if needed (probably never) |

### 5.5 Balance handling — running_balance

Plaid does **not** include a per-transaction running balance. The `accounts`
array in the sync response carries `available` and `current` balance for each
account at the time of the API call.

**Our rule:** for each transaction we adapt to internal `Transaction` shape,
we set `running_balance` to the current account balance from the same sync
response. This is the balance *after* the most recent transaction in the
batch — not after this specific transaction. The `savings_milestone` rule
still fires correctly when the balance crosses a threshold; the per-tx
accuracy of `running_balance` is approximate.

Annotated in `backend/src/rules/definitions.ts` and `backend/src/plaid/adapter.ts`.

### 5.6 Frequency

"Plaid typically checks for new transactions data between one and four times
per day" — so a healthy Item will fire `SYNC_UPDATES_AVAILABLE` maybe 4×/day.
Webhook volume is low.

---

## 6. Webhook codes — dispatch table

Plaid sends many webhook codes scoped under `webhook_type`. Our handler must
recognize them; behavior listed.

### TRANSACTIONS webhook_type

| `webhook_code` | Our action | Notes |
|---|---|---|
| `SYNC_UPDATES_AVAILABLE` | Call `/transactions/sync`, paginate, run rules on `added` | The main one |
| `DEFAULT_UPDATE` | Same as above | Legacy code, treat identically for compatibility |
| `INITIAL_UPDATE` | Log, no-op | Sync will pick up the data |
| `HISTORICAL_UPDATE` | Log, no-op | Sync will pick up the data |
| `TRANSACTIONS_REMOVED` | Log, no-op | We don't reverse reactions |
| `RECURRING_TRANSACTIONS_UPDATE` | Log, no-op | Defer to Phase 5 (T2.6 subscription detection) |

### ITEM webhook_type

| `webhook_code` | Our action | Notes |
|---|---|---|
| `ERROR` | Log with `error.error_code`, no recovery | Phase 2+: surface to user, prompt re-link |
| `LOGIN_REPAIRED` | Log, no-op | Resume normal operation; sync will continue |
| `PENDING_EXPIRATION` | Log, no-op | Phase 2+: prompt re-auth before expiration |
| `USER_PERMISSION_REVOKED` | Log, mark Item disabled | Stop syncing; don't try to re-fetch |
| `USER_ACCOUNT_REVOKED` | Log, no-op | PNC-specific; rare |
| `NEW_ACCOUNTS_AVAILABLE` | Log, no-op | Phase 2+: prompt user to add new accounts |
| `WEBHOOK_UPDATE_ACKNOWLEDGED` | Log, no-op | Confirms our webhook URL change |
| `PENDING_DISCONNECT` | Log, no-op | Phase 2+: prompt re-link |

### All others

Log at info level, no-op, return 200. Never 4xx an unknown webhook — Plaid
will retry-storm and our log volume balloons.

### Response time

Plaid docs don't specify a hard timeout. Industry standard: respond 200 within
~10 s. We use the same `setImmediate` fast-200 pattern as the Teller handler:
return 200 immediately, do the work async.

### Retry behavior

Not formally documented. Empirically Plaid retries on non-2xx and on timeout,
with exponential backoff. **This is why our idempotency must be transaction-
level** — Plaid will redeliver the same `SYNC_UPDATES_AVAILABLE` webhook
multiple times and we can't dedup at the webhook envelope level (no event ID).

---

## 7. Idempotency

### 7.1 Why webhook-level dedup doesn't work

Plaid webhooks don't carry a unique delivery ID. Two `SYNC_UPDATES_AVAILABLE`
deliveries for the same Item are functionally identical and both legitimate
(retry behavior).

### 7.2 Transaction-level dedup

`/transactions/sync` returns `transaction_id` on every transaction.
`transaction_id` is stable across deliveries for the same transaction.

**Our rule:** after sync, for each `added` transaction, call
`claimEvent(transaction_id)`. If it returns false, this transaction was
already processed by a prior delivery — skip rule eval. If true, we own it;
run rules.

This is the same `processed_events` table from T2.1, just keyed on
Plaid transaction IDs.

### 7.3 Cursor advance is the source of truth

We advance the stored cursor on the `plaid_items` row only after the full
paginated sync succeeds. If the handler crashes mid-pagination, the next
delivery starts from the same cursor and we re-process the in-flight pages.
The `claimEvent` check ensures no double-reactions.

---

## 8. Personal Finance Category — taxonomy mapping

Plaid's PFC ships two levels: `personal_finance_category.primary` (broad,
~16 values) and `.detailed` (specific, ~110 values).

The rule engine consumes a simpler internal category string. The adapter
maps Plaid's detailed → internal. Mapping table (mirrors `weeklyBudgetByCategory`
keys and the `bill_paid_on_time` rule's known billers):

| Plaid `detailed` | Internal `details.category` | Used by rule |
|---|---|---|
| `FOOD_AND_DRINK_GROCERIES` | `groceries` | `overspent_in_category` |
| `FOOD_AND_DRINK_RESTAURANT` | `restaurants` | `overspent_in_category` |
| `FOOD_AND_DRINK_FAST_FOOD` | `restaurants` | `overspent_in_category` |
| `FOOD_AND_DRINK_*` (other) | `food_and_drink` | `overspent_in_category` |
| `UTILITIES_ELECTRIC` | `utilities` | `bill_paid_on_time` (electric company) |
| `UTILITIES_GAS` | `utilities` | `bill_paid_on_time` |
| `UTILITIES_WATER` | `utilities` | `bill_paid_on_time` (water utilities) |
| `UTILITIES_INTERNET` | `utilities` | `bill_paid_on_time` (internet provider) |
| `UTILITIES_CABLE` | `utilities` | — |
| `INCOME_WAGES` | `paycheck` | `paycheck_received` |
| `INCOME_*` (other) | `income` | — |
| `RENT_PAYMENT` | `rent` | — |
| `MORTGAGE_PAYMENT` | `mortgage` | — |
| `CASH_WITHDRAWAL_*` | `cash` | — |
| `TRANSFER_*` | `transfer` | `savings_milestone` (when going to savings) |
| Everything else | `other` | — |

Counterparty mapping (used by `bill_paid_on_time` rule):

```
details.counterparty.name = plaidTx.merchant_name
                           || plaidTx.counterparties?.[0]?.name
                           || plaidTx.name
```

The rule already does case-insensitive substring matching on biller names
(`electric company`, `water utilities`, `internet provider`, `insurance`),
so the counterparty mapping is lenient.

---

## 9. Plaid Link flow (mobile)

```
┌─────────────────────┐         ┌─────────────────────┐
│   Mobile app        │         │   Coiny backend     │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           │ 1. POST /api/plaid/link-token │
           ├──────────────────────────────►│
           │                               │
           │                               │ 2. POST /link/token/create
           │                               ├─────────────────► Plaid
           │ 3. { link_token }             │ ◄─────────────────
           │ ◄─────────────────────────────┤
           │                               │
           │ 4. Open Plaid Link UI         │
           │    (native SDK)               │
           │                               │
           │ 5. onSuccess(public_token)    │
           │                               │
           │ 6. POST /api/plaid/exchange   │
           │    { public_token }           │
           ├──────────────────────────────►│
           │                               │
           │                               │ 7. POST /item/public_token/exchange
           │                               ├─────────────────► Plaid
           │                               │ ◄ { access_token, item_id }
           │                               │
           │                               │ 8. Persist plaid_items row
           │ 9. { ok: true }               │    (cursor=null, initial_sync_complete=false)
           │ ◄─────────────────────────────┤
           │                               │
           │                               │ 10. (Async, eventually) Plaid POSTs
           │                               │     INITIAL_UPDATE webhook → we
           │                               │     run first sync
```

### 9.1 `/link/token/create` params we send

```jsonc
{
  client_id, secret,
  client_name: "Coiny",
  language: "en",
  country_codes: ["US"],
  products: ["transactions"],
  user: { client_user_id: "<our-user-id>" },  // Phase 1: hardcoded "user_1"
  webhook: PLAID_WEBHOOK_URL,                  // https://coiny-backend.fly.dev/webhooks/plaid
  // redirect_uri: omitted Phase 1 — only needed for OAuth banks; revisit
  //               when we add Chase / Capital One / Wells Fargo on real banks
}
```

`link_token` expires after 4 hours. Mobile generates one per Link session
(not cached).

### 9.2 Phase 1 single-user shortcut

`client_user_id` is hardcoded to `"user_1"` until T2.2 (multi-user). The
mobile app doesn't authenticate; backend stores one Item row.

---

## 10. Sandbox testing

### 10.1 Credentials in Link

When using Plaid Link in sandbox mode, any institution works. The user
enters:
- Username: `user_good`
- Password: `pass_good`

For MFA flows, the code is whatever Plaid's docs specify per institution
(usually `1234`).

### 10.2 Firing webhooks manually

```
POST /sandbox/item/fire_webhook
{
  client_id, secret, access_token,
  webhook_code: "SYNC_UPDATES_AVAILABLE",
  webhook_type: "TRANSACTIONS"
}
```

This causes Plaid to POST a real webhook to our `webhook` URL. We use this
in the G2 validation gate.

### 10.3 Injecting test transactions

```
POST /sandbox/transactions/create
{
  client_id, secret, access_token,
  transactions: [
    { amount, date_posted, date_transacted, description, ... }
  ]
}
```

Up to 10 transactions per call, dates within last 14 days, depository
accounts only, Item must have been created with `user_transactions_dynamic`
test user.

### 10.4 Forcing Item errors

```
POST /sandbox/item/reset_login
{ client_id, secret, access_token }
```

Puts the Item into `ITEM_LOGIN_REQUIRED` state, triggering an `ERROR`
webhook. Used to test our Item-error handling in Phase 2.

### 10.5 Behavior differences vs production

- Sandbox doesn't always reflect institution-specific quirks
- No transaction history limits
- No real SMS / email
- `redirect_uri` over `http://` is allowed (production requires `https://`)
- Some products return randomized data
- Latency not formally documented

---

## 11. Error model

### 11.1 Response shape

Any non-2xx response from a Plaid endpoint includes:

```jsonc
{
  error_type: "ITEM_ERROR" | "INSTITUTION_ERROR" | "API_ERROR"
            | "INVALID_REQUEST" | "INVALID_INPUT" | "INVALID_RESULT"
            | "RATE_LIMIT_EXCEEDED" | "OAUTH_ERROR" | ...,
  error_code: string,           // programmatic; what we branch on
  error_reason?: string,        // OAuth only
  error_message: string,        // dev-facing, may change
  display_message: string|null, // user-facing, surface if non-null
  request_id: string,
  causes: any[],                // per-Item breakdown for multi-Item calls
  documentation_url: string,
  suggested_action: string
}
```

### 11.2 Retry classification

Plaid doesn't formally document retry-ability. Our classification:

| `error_type` | `error_code` examples | Retry? |
|---|---|---|
| `API_ERROR` | `INTERNAL_SERVER_ERROR` | Yes, exponential backoff |
| `INSTITUTION_ERROR` | `INSTITUTION_NOT_RESPONDING`, `INSTITUTION_DOWN` | Yes, exponential backoff |
| `ITEM_ERROR` | `PRODUCT_NOT_READY` | Yes |
| `ITEM_ERROR` | `ITEM_LOGIN_REQUIRED`, `USER_PERMISSION_REVOKED` | No — surface to user |
| `INVALID_REQUEST` | * | No — our bug, log + alert |
| `INVALID_INPUT` | * | No — our bug, log + alert |
| `RATE_LIMIT_EXCEEDED` | * | Yes, backoff with jitter |
| `OAUTH_ERROR` | * | No — surface to user |

### 11.3 Phase 1 retry policy

Webhook-driven calls already get retried by Plaid (they redeliver on non-2xx).
For our outbound calls (`/transactions/sync`, `/link/token/create`,
`/item/public_token/exchange`): one immediate retry on retriable errors,
otherwise return error to caller. No exponential backoff loop yet —
overengineered for our volume. Revisit in Phase 5.

---

## 12. Item lifecycle gotchas

- An Item's `access_token` persists until explicitly removed via
  `/item/remove` or the user revokes at the institution.
- `/item/get` returns the current Item state including `error` if any.
- `ITEM_LOGIN_REQUIRED` puts the Item into a passive state — sync won't
  succeed until the user re-authenticates via Link's "update mode."
- `LOGIN_REPAIRED` webhook fires when the user re-authenticated **outside**
  our app (e.g., via another Plaid integration). Cursors and access_tokens
  remain valid; just resume sync.
- `USER_PERMISSION_REVOKED` is terminal — the access_token is dead. We
  should mark the Item disabled in our DB and stop syncing.

---

## 13. Our concrete assumptions

These are what we treat as Plaid contract guarantees. If any becomes false,
our code breaks; revisit.

1. `transaction_id` is stable across `/transactions/sync` redeliveries for
   the same transaction (used for idempotency).
2. `Plaid-Verification` header is present on every webhook POST.
3. JWT `request_body_sha256` covers the *exact* raw bytes we received
   (we don't re-serialize before hashing).
4. Cursor returned by `/transactions/sync` is valid for ≥1 year.
5. Webhook codes from §6 cover everything Plaid currently sends; new ones
   default to "log + 200" without breaking us.
6. `accounts[].balances.current` in sync response is fresher than or equal
   to the balance after the transactions in `added` were applied.
7. `personal_finance_category.detailed` is present on transactions ≥7 days
   old; may be null on very recent pending transactions.

---

## 14. Known gaps / things we haven't validated yet

- **JWT timestamp window.** Plaid doesn't document one. We're picking 5 min
  arbitrarily. May need to widen if we see legitimate webhooks rejected.
- **Cursor migration cost.** If we ever need to call `/transactions/get`
  alongside `/transactions/sync`, the migration path uses cursor value `"now"`
  to fast-forward. Untested.
- **Sandbox vs production parity for PFC.** The category taxonomy is
  documented as version-pinned (`v1` or `v2`); we use the default. Need to
  verify all sandbox transactions populate `personal_finance_category.detailed`
  consistently.
- **Multi-account handling.** Plaid Items typically contain multiple accounts
  (checking + savings). Phase 1 stores one cursor per Item, not per account.
  If we need per-account cursors later, schema changes.
- **OAuth banks.** Chase, Capital One, Wells Fargo require `redirect_uri` in
  the link_token. Sandbox doesn't exercise OAuth. Production may surprise us.
- **Rate limits.** No per-Item or per-account quota documented. We expect
  webhook-driven volume (≤4 syncs/day per Item) to stay well under any limit.

---

## 15. Diff base

Reviewed against:
- https://plaid.com/docs/api/products/transactions/ (sync endpoint)
- https://plaid.com/docs/api/webhooks/webhook-verification/ (JWT verification)
- https://plaid.com/docs/api/link/ (link_token, public_token exchange)
- https://plaid.com/docs/api/sandbox/ (sandbox endpoints)
- https://plaid.com/docs/sandbox/ (sandbox behavior)
- https://plaid.com/docs/errors/ (error model)
- https://plaid.com/docs/api/items/ (item lifecycle)
- https://plaid.com/docs/transactions/sync-migration/ (sync best practices)

Update this doc when Plaid releases a new PFC taxonomy version, a new webhook
code, or a breaking change to any endpoint we use.
