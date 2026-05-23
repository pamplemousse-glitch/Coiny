# Plaid Integration — Contract Reference

**Purpose:** canonical record of how Coiny interacts with Plaid's API, what we
assume Plaid will do, and the gotchas we've already paid for. Not a tutorial;
not a plan. When Plaid changes their docs or behavior, diff against this file.

**Last reviewed:** 2026-05-23 against plaid.com/docs (live).

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

Five real API endpoints + two sandbox helpers. Each is a single POST returning JSON.

| Endpoint | When | Auth |
|---|---|---|
| `POST /link/token/create` | Mobile requests bank-link session | `client_id` + `secret` |
| `POST /item/public_token/exchange` | Mobile completes Link, sends `public_token` | `client_id` + `secret` |
| `POST /transactions/sync` | Webhook handler pulls new txns | `client_id` + `secret` + `access_token` |
| `POST /webhook_verification_key/get` | Webhook handler fetches signing key | `client_id` + `secret` |
| `POST /item/get` | (Future) inspect Item state on errors | `client_id` + `secret` + `access_token` |
| `POST /sandbox/item/fire_webhook` | Tests only — trigger webhook delivery | `client_id` + `secret` + `access_token` |
| `POST /sandbox/public_token/create` | Tests only — create Item without Link UI | `client_id` + `secret` |

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
2. Verify `alg === "ES256"` in JWT header before trusting it
3. Extract `kid` from JWT header
4. Look up the public key for `kid` (in our cache, or fetch from Plaid)
5. Verify JWT signature with that key
6. Verify `iat` is within last **5 minutes** — this is now officially documented by Plaid
7. Compute SHA-256 of raw webhook body, compare to JWT's `request_body_sha256`
8. If all pass, the webhook is authentic

**Critical whitespace gotcha:** `request_body_sha256` is sensitive to whitespace
in the webhook body. Plaid sends JSON with a tab-spacing of 2. Hash the raw bytes
exactly as received — never re-serialize or parse-and-re-encode before hashing.

### 4.3 Key fetch endpoint

```
POST https://<env>.plaid.com/webhook_verification_key/get
Body: { client_id, secret, key_id }
Response:
{
  key: {
    alg: "ES256",
    crv: "P-256",
    kid: "bfbd5111-...",
    kty: "EC",
    use: "sig",
    x: "hKXLGIjWvCBv-...",
    y: "shhexqPB7Y...",
    created_at: 1560466150,
    expired_at: null
  },
  request_id: "RZ6Omi1bzzwDaLo"
}
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
- Honor `expired_at` from the JWK if Plaid populates it.

### 4.5 Why this differs from Teller

| | Teller | Plaid |
|---|---|---|
| Algorithm | HMAC-SHA256 | ECDSA P-256 SHA-256 (asymmetric) |
| Key source | Static, shared secret in env | Plaid API, per-`kid`, rotatable |
| Header format | `t=<ts>,v1=<hex-sig>` | Full JWT |
| Body coverage | Raw bytes | `request_body_sha256` |
| Replay window | We enforce 3 min | Plaid documents 5 min |

---

## 5. `/transactions/sync` — the heart of the integration

### 5.1 Contract

**Request:**
```jsonc
POST /transactions/sync
{
  client_id, secret, access_token,
  cursor?: string,            // omit on first call; "now" to skip history on migration
  count?: number,             // default 100, max 500
  options?: {
    include_original_description?: boolean,  // raw institution string
    personal_finance_category_version?: 'v1' | 'v2',
    days_requested?: number,  // first call only, default 90, max 730
    account_id?: string       // filter to one account; creates a separate cursor stream
  }
}
```

**Response:**
```jsonc
{
  accounts: Account[],          // only accounts with transactions; current balances
  added: Transaction[],         // new transactions
  modified: Transaction[],      // updated (pending→posted, amount corrections, etc.)
  removed: { transaction_id, account_id }[],
  next_cursor: string,
  has_more: boolean,
  transactions_update_status: 'NOT_READY' | 'INITIAL_UPDATE_COMPLETE' | 'HISTORICAL_UPDATE_COMPLETE',
  request_id: string
}
```

### 5.2 Transaction object — key fields

| Field | Notes |
|---|---|
| `transaction_id` | Stable unique ID — our idempotency key |
| `account_id` | Account within the Item |
| `amount` | **Positive = money exits** (debit/purchase); **negative = money enters** (income, refund) |
| `date` | Posted/occurred date (ISO 8601) |
| `authorized_date` | When institution authorized; often 1 day before `date` |
| `pending` | `true` if unsettled; details may change before posted |
| `pending_transaction_id` | Links a posted transaction back to its pending version |
| `merchant_name` | Enriched, human-readable merchant — **prefer over `name`** |
| `name` | Raw institution string — legacy, less maintained |
| `payment_channel` | `online` / `in store` / `other` — replaces deprecated `transaction_type` |
| `personal_finance_category` | `{ primary, detailed, confidence_level }` — use `detailed` for rules |
| `counterparties` | Array of `{ name, type, entity_id, confidence_level, website, logo_url }` |
| `logo_url`, `website` | Merchant branding (may be null) |
| `location` | `{ address, city, region, postal_code, lat, lon, store_number }` |
| `iso_currency_code` | Standard currency; `unofficial_currency_code` for crypto/non-ISO |

**Amount sign convention is important for rules:**
- `paycheck_received`: `amount < 0` (money entering)
- `large_purchase`: `amount > 0` above threshold
- `savings_milestone`: transfers to savings will have `amount > 0` from checking perspective

**Pending transaction behavior:**
- Pending txns can change `name`, `amount`, `category`, `type` before settlement
- Once settled, `pending: false` and the transaction appears in `modified[]`
- The `pending_transaction_id` on the settled tx links back to the original pending tx ID
- Phase 1: we process `added[]` only; `modified[]` is logged but skipped

**`personal_finance_category.confidence_level`:**
- `VERY_HIGH` / `HIGH` → reliable, use for rule evaluation
- `MEDIUM` → probably right but treat with caution
- `LOW` / `UNKNOWN` → fall back to `name`-based matching

### 5.3 Cursor rules

- **First call:** omit `cursor` → returns everything Plaid has fetched so far
  (up to `days_requested` of history). Cursor in response is now your anchor.
- **`cursor: "now"`:** skips all existing history, starts fresh from this moment.
  Use for migration from `/transactions/get` or to skip initial flood.
- **Subsequent calls:** pass `cursor` from the last successful response.
- **Pagination:** while `has_more === true`, call again with `next_cursor`.
- **`TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` error:** restart from the
  cursor that began *this* pagination loop (before the first page), not the
  failed page's cursor.
- **Cursor validity:** Plaid guarantees valid for ≥1 year after reaching
  `has_more: false`.
- **`account_id` filter:** creates a *separate* cursor stream from the unfiltered
  stream — don't mix them on the same Item.

### 5.4 Initial sync flood — our handling

The first `/transactions/sync` call returns up to 90 days of history. If we
ran the rule engine on every one, the pet would dispatch dozens of
"paycheck received" and "large purchase" reactions for past events.

**Our rule:** on the very first sync per Item (cursor was null), we ingest the
cursor and balance only — **we do not run the rule engine**. From then on,
every `added` transaction goes through rules.

Tracked via `plaid_items.initial_sync_complete: boolean`. Set to `true` after
the first paginated sync finishes (`has_more === false`).

### 5.5 What we do with the three arrays

| Array | Phase 1 behavior | Future |
|---|---|---|
| `added` | Run rule engine, dispatch reactions, persist | — |
| `modified` | Log for observability, ignore | Phase 2: re-evaluate (pending→posted may flip rules) |
| `removed` | Log for observability, ignore | Phase 2+: reverse reactions if needed |

### 5.6 Balance handling

Plaid does **not** include a per-transaction running balance. The `accounts`
array in the sync response carries `available` and `current` balance for each
account at the time of the API call.

**Our rule:** `running_balance` on internal transactions is set to the current
account balance from the same sync response — the balance *after* the most
recent transaction in the batch, not after each individual transaction. The
`savings_milestone` rule fires correctly when balance crosses a threshold; the
per-tx accuracy is approximate.

### 5.7 Frequency

"Plaid typically checks for new transactions data between one and four times
per day" — so a healthy Item fires `SYNC_UPDATES_AVAILABLE` maybe 4×/day.
Webhook volume is low.

---

## 6. Webhook codes — dispatch table

### TRANSACTIONS webhook_type

| `webhook_code` | Our action | Notes |
|---|---|---|
| `SYNC_UPDATES_AVAILABLE` | Call `/transactions/sync`, paginate, run rules on `added` | The main one |
| `DEFAULT_UPDATE` | Same as above | Legacy code, treat identically for compatibility |
| `INITIAL_UPDATE` | Log, no-op | Sync will pick up the data |
| `HISTORICAL_UPDATE` | Log, no-op | Sync will pick up the data |
| `TRANSACTIONS_REMOVED` | Log, no-op | We don't reverse reactions |
| `RECURRING_TRANSACTIONS_UPDATE` | Log, no-op | Defer to Phase 5 (subscription detection) |

### ITEM webhook_type

| `webhook_code` | Our action | Notes |
|---|---|---|
| `ERROR` | Log with `error.error_code`, no recovery | Phase 2+: surface to user, prompt re-link |
| `LOGIN_REPAIRED` | Log, no-op | Resume normal operation; sync will continue |
| `PENDING_EXPIRATION` | Log, no-op | Phase 2+: prompt re-auth before expiration |
| `USER_PERMISSION_REVOKED` | Log, mark Item disabled | Stop syncing; access_token is dead |
| `USER_ACCOUNT_REVOKED` | Log, no-op | PNC-specific; rare |
| `NEW_ACCOUNTS_AVAILABLE` | Log, no-op | Phase 2+: prompt user to add accounts |
| `WEBHOOK_UPDATE_ACKNOWLEDGED` | Log, no-op | Confirms our webhook URL change |
| `PENDING_DISCONNECT` | Log, no-op | Phase 2+: prompt re-link |

### All others

Log at info level, no-op, return 200. Never 4xx an unknown webhook — Plaid
will retry-storm and our log volume balloons.

### Response time

Plaid doesn't specify a hard timeout. Industry standard: respond 200 within
~10s. We return 200 immediately and do work async.

### Retry behavior

Plaid retries on non-2xx and on timeout, with exponential backoff. Idempotency
must be transaction-level — Plaid will redeliver the same `SYNC_UPDATES_AVAILABLE`
webhook and we can't dedup at the webhook envelope level (no event ID).

---

## 7. Idempotency

### 7.1 Why webhook-level dedup doesn't work

Plaid webhooks don't carry a unique delivery ID. Two `SYNC_UPDATES_AVAILABLE`
deliveries for the same Item are functionally identical.

### 7.2 Transaction-level dedup

`transaction_id` is stable across deliveries for the same transaction.

**Our rule:** for each `added` transaction, call `claimEvent(transaction_id)`.
If false, already processed — skip. If true, run rules. Uses the
`processed_events` table keyed on Plaid transaction IDs.

### 7.3 Cursor advance is the source of truth

We advance the stored cursor on `plaid_items` only after the full paginated
sync succeeds. If the handler crashes mid-pagination, the next delivery starts
from the same cursor and re-processes in-flight pages. The `claimEvent` check
prevents double-reactions.

---

## 8. Personal Finance Category — taxonomy mapping

PFC v2 ships two levels: `primary` (~16 values) and `detailed` (~110 values),
plus `confidence_level` (`VERY_HIGH` | `HIGH` | `MEDIUM` | `LOW` | `UNKNOWN`).

The rule engine uses a simpler internal category string. Mapping:

| Plaid `detailed` | Internal `details.category` | Rule |
|---|---|---|
| `FOOD_AND_DRINK_GROCERIES` | `groceries` | `overspent_in_category` |
| `FOOD_AND_DRINK_RESTAURANT` | `restaurants` | `overspent_in_category` |
| `FOOD_AND_DRINK_FAST_FOOD` | `restaurants` | `overspent_in_category` |
| `FOOD_AND_DRINK_*` (other) | `food_and_drink` | `overspent_in_category` |
| `UTILITIES_ELECTRIC` | `utilities` | `bill_paid_on_time` |
| `UTILITIES_GAS` | `utilities` | `bill_paid_on_time` |
| `UTILITIES_WATER` | `utilities` | `bill_paid_on_time` |
| `UTILITIES_INTERNET` | `utilities` | `bill_paid_on_time` |
| `UTILITIES_CABLE` | `utilities` | — |
| `INCOME_WAGES` | `paycheck` | `paycheck_received` |
| `INCOME_*` (other) | `income` | — |
| `RENT_PAYMENT` | `rent` | — |
| `MORTGAGE_PAYMENT` | `mortgage` | — |
| `CASH_WITHDRAWAL_*` | `cash` | — |
| `TRANSFER_*` | `transfer` | `savings_milestone` |
| Everything else | `other` | — |

**Counterparty resolution** (used by `bill_paid_on_time`):
```
details.counterparty.name = plaidTx.merchant_name
                           || plaidTx.counterparties?.[0]?.name
                           || plaidTx.name
```

Prefer `merchant_name` — it's more reliable than `name` (Plaid's docs confirm
`name` is legacy and less maintained). The rule does case-insensitive substring
matching on biller names so the mapping is lenient.

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
           │                               │ 10. (Async) Plaid POSTs INITIAL_UPDATE
           │                               │     webhook → we run first sync
```

### 9.1 `/link/token/create` params we send

```jsonc
{
  client_id, secret,
  client_name: "Coiny",
  language: "en",
  country_codes: ["US"],
  products: ["transactions"],
  user: { client_user_id: "<our-user-id>" },   // Phase 1: hardcoded "user_1"
  webhook: PLAID_WEBHOOK_URL,                   // https://coiny-backend.fly.dev/webhooks/plaid
  // redirect_uri: omitted Phase 1 — required for OAuth banks (Chase, BofA, WF)
  //               must match a URI registered in Plaid Dashboard → Team Settings → API
  //               must be a Universal Link (https://), never a custom URL scheme
}
```

`link_token` expires after 4 hours. Mobile generates one per Link session
(not cached).

### 9.2 Phase 1 single-user shortcut

`client_user_id` is hardcoded to `"user_1"` until T2.2 (multi-user).

---

## 10. iOS SDK (LinkKit)

We use the native Swift SDK installed as a Swift Package from
`https://github.com/plaid/plaid-ios` (see `ios/project.yml`).

### 10.1 Setup flow

```swift
// 1. Fetch link_token from our backend, then:
var config = LinkTokenConfiguration(
    token: linkToken,
    onSuccess: { success in
        // success.publicToken — exchange server-side
        // success.metadata.institution — institution name/id
        // success.metadata.accounts — linked account details
    }
)
config.onExit = { exit in
    // exit.error?.errorCode — nil on user-dismissed
    // exit.metadata.status — where user exited (e.g. "requires_credentials")
}
config.onEvent = { event in
    // analytics milestones: open, selectInstitution, error, exit, etc.
    // fires before, after, or surrounding terminal callbacks
}

// 2. Create handler early (enables preloading)
let result = Plaid.create(config)
// or with onLoad: Plaid.create(config, onLoad: { /* safe to present */ })

// 3. Open when user taps button
if case .success(let handler) = result {
    handler.open(presentUsing: .viewController(self))
}
```

**Critical:** keep a **strong reference** to `handler` for the entire Link session,
including any OAuth redirect. Losing the reference closes Link.

### 10.2 OAuth banks (Phase 2+)

Chase, BofA, Wells Fargo, US Bank require OAuth — they redirect the user to
their own app or web portal, then back to Coiny.

To support OAuth on iOS:

1. **Register a redirect URI** in Plaid Dashboard → Team Settings → API.
   Must be `https://` (a Universal Link). Custom URL schemes (`coiny://`) are
   **not supported by Plaid**.

2. **Configure Universal Links** on your domain:
   - Host `/.well-known/apple-app-site-association` with:
     ```json
     {
       "applinks": {
         "details": [{ "appIDs": ["<teamId>.app.coiny.ios"], "components": [{"/" : "/plaid/*"}] }]
       }
     }
     ```
   - Add `applinks:<your-domain>` to the app's Associated Domains entitlement
     in Xcode / `project.yml`

3. **Pass `redirect_uri`** in `/link/token/create` (must match Dashboard registration).

4. **Resume after OAuth redirect** in your `SceneDelegate`/`AppDelegate`:
   ```swift
   handler.continueFrom(redirectUri: url)
   ```

**Sandbox:** OAuth testing uses Platypus OAuth Bank (`ins_127287`). The OAuth
pane is simulated — no real bank screen. Sandbox allows `http://` redirect URIs
(production requires `https://`). We skip this in Phase 1 since major US OAuth
banks are production-only.

### 10.3 Handler callbacks

| Callback | When | Contains |
|---|---|---|
| `onSuccess` | Link completed | `publicToken`, `SuccessMetadata` (institution, accounts) |
| `onExit` | User dismissed or error | `ExitError?` (nil = user tapped X), `ExitMetadata` (where they stopped) |
| `onEvent` | Analytics milestones | Event name + `EventMetadata`; don't rely on ordering |

---

## 11. Sandbox testing

### 11.1 Test credentials

All sandbox institutions accept these credentials in Link. Password `pass_good`
unless noted; any non-empty string works for "any" entries.

| Username | Password | Scenario |
|---|---|---|
| `user_good` | `pass_good` | Standard account with basic transaction history |
| `user_transactions_dynamic` | any | Realistic transaction history that updates on refresh — **best for pet reaction testing** |
| `user_credit_profile_excellent` | any | Positive cash flow, high salary + rental income |
| `user_credit_profile_good` | any | Neutral cash flow, gig economy income |
| `user_credit_profile_poor` | any | Net loss cash flow, no consistent income — **best for sad pet** |
| `user_credit_bonus` | any | Multiple salary streams with bonus variations |
| `user_credit_joint_account` | any | Two salary streams, two identities |
| `user_bank_income` | `{}` | Wide variety of income streams |
| `user_yuppie` | any | Persona-based spending data |
| `user_small_business` | any | Small business spending patterns |
| `user_limited_purpose_checking` | `pass_good` | Rent/mortgage limited checking accounts |
| `user_prism_1`…`user_prism_8` | any | Partner Insights report testing |
| `user_good` | `microdeposits_good` | Auth micro-deposit flow |
| `user_good` | `mfa_device` | Device OTP MFA (code: `1234`) |
| `user_good` | `mfa_questions_<n>_<m>` | Question-based MFA |
| `user_good` | `mfa_selections` | Selection-based MFA |
| `user_good` | `error_ITEM_LOGIN_REQUIRED` | Simulate Item needing re-auth |
| `user_good` | `error_<ERROR_CODE>` | Any error condition by code |
| `user_good` | `{"recaptcha":"bad"}` | reCAPTCHA failure |

### 11.2 Sandbox Item lifecycle

- Items auto-expire to `ITEM_LOGIN_REQUIRED` **30 days** after creation.
- Force expiry immediately: `POST /sandbox/item/reset_login`
- This fires an `ERROR` webhook with `ITEM_LOGIN_REQUIRED` — use to test §6
  Item error handling.

### 11.3 Firing webhooks manually

```jsonc
POST /sandbox/item/fire_webhook
{
  client_id, secret, access_token,
  webhook_code: "SYNC_UPDATES_AVAILABLE",
  webhook_type: "TRANSACTIONS"
}
```

Causes Plaid to POST a real webhook to our registered URL. Used in G2 gate.

### 11.4 Creating Items without Link UI

```jsonc
POST /sandbox/public_token/create
{
  client_id, secret,
  institution_id: "ins_109508",   // Chase sandbox ID
  initial_products: ["transactions"]
}
// → { public_token } → exchange as normal
```

Useful for automated testing — no need to click through the Link UI.

### 11.5 Injecting test transactions

```jsonc
POST /sandbox/transactions/create
{
  client_id, secret, access_token,
  transactions: [{ amount, date_posted, date_transacted, description, ... }]
}
```

- Up to 10 transactions per call
- Dates within last 14 days
- Depository accounts only
- **Item must have been created with `user_transactions_dynamic`**

### 11.6 Sandbox vs production differences

- No real SMS / email / OTP
- `redirect_uri` over `http://localhost` allowed (production requires `https://`)
- Institution-specific OAuth flows not exercised (Platypus panes shown instead)
- Transaction history is randomized, may lack consistency across calls
- No OCR / image processing
- Sandbox items expire 30 days after creation (see §11.2)

---

## 12. Error model

### 12.1 Response shape

```jsonc
{
  error_type: string,         // category (see §12.2)
  error_code: string,         // programmatic; what we branch on
  error_message: string,      // dev-facing; may change between releases
  display_message: string | null,  // user-facing; null if error is not user-actionable
  request_id: string,         // omitted on webhook-delivered errors
  causes: any[],              // per-Item breakdown for multi-Item calls
  documentation_url: string,
  suggested_action: string
}
```

**`display_message`:** only non-null when the user can take action (e.g.,
"Your credentials are incorrect"). For infrastructure errors, it's null —
show a generic "Please try again" instead.

**`request_id`:** use for Plaid support tickets. Not present on webhook errors.

### 12.2 Error types and retry classification

| `error_type` | Common codes | Retry? |
|---|---|---|
| `API_ERROR` | `INTERNAL_SERVER_ERROR` | Yes, exponential backoff |
| `INSTITUTION_ERROR` | `INSTITUTION_NOT_RESPONDING`, `INSTITUTION_DOWN` | Yes, exponential backoff |
| `ITEM_ERROR` | `PRODUCT_NOT_READY` | Yes |
| `ITEM_ERROR` | `ITEM_LOGIN_REQUIRED`, `USER_PERMISSION_REVOKED`, `ACCESS_NOT_GRANTED` | No — surface to user |
| `ITEM_ERROR` | `PRODUCTS_NOT_SUPPORTED`, `NO_ACCOUNTS` | No — our configuration bug |
| `TRANSACTIONS_ERROR` | `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` | Yes — restart from saved cursor |
| `INVALID_REQUEST` | * | No — our bug, log + alert |
| `INVALID_INPUT` | * | No — our bug, log + alert |
| `RATE_LIMIT_EXCEEDED` | * | Yes, backoff with jitter |
| `OAUTH_ERROR` | * | No — surface to user |
| `SANDBOX_ERROR` | * | No — sandbox-only; investigate |

Note: Plaid has two separate types: `TRANSACTIONS_ERROR` (sync-level) and
`TRANSACTION_ERROR` (individual transaction); both are relevant to our sync path.

### 12.3 Phase 1 retry policy

Webhook-driven calls already get retried by Plaid. For our outbound calls
(`/transactions/sync`, `/link/token/create`, `/item/public_token/exchange`):
one immediate retry on retriable errors, otherwise return error to caller.
Revisit with exponential backoff in Phase 5.

---

## 13. Item lifecycle gotchas

- An Item's `access_token` persists until explicitly removed via `/item/remove`
  or the user revokes at the institution.
- `/item/get` returns current Item state including `error` if any.
- `ITEM_LOGIN_REQUIRED` puts the Item into a passive state — sync won't succeed
  until the user re-authenticates via Link's "update mode."
- `LOGIN_REPAIRED` fires when the user re-authenticated **outside** our app
  (via another Plaid integration). Cursors and access_tokens remain valid.
- `USER_PERMISSION_REVOKED` is terminal — access_token is dead. Mark Item
  disabled in DB and stop syncing.
- Sandbox Items auto-expire 30 days after creation (§11.2).

---

## 14. Our concrete assumptions

These are treated as Plaid contract guarantees. If any becomes false, our code
breaks.

1. `transaction_id` is stable across `/transactions/sync` redeliveries for the
   same transaction (used for idempotency).
2. `Plaid-Verification` header is present on every webhook POST.
3. JWT `request_body_sha256` covers the exact raw bytes received — Plaid sends
   JSON with 2-space tab indentation; don't re-serialize.
4. Cursor returned by `/transactions/sync` is valid for ≥1 year.
5. Webhook codes from §6 cover everything Plaid currently sends; new ones
   default to "log + 200" without breaking us.
6. `accounts[].balances.current` in sync response is fresher than or equal to
   the balance after the transactions in `added` were applied.
7. `personal_finance_category.detailed` is present on transactions ≥7 days old;
   may be null on very recent pending transactions.
8. `merchant_name` is more reliable than `name` for counterparty identification;
   fall back to `counterparties[0].name`, then `name`.
9. `personal_finance_category.confidence_level` of `VERY_HIGH` or `HIGH` is
   reliable enough to drive rule evaluation; `LOW`/`UNKNOWN` should fall back
   to name-based matching.
10. JWT replay window is **5 minutes** — now officially documented by Plaid
    (not arbitrary as it was when this doc was first written).

---

## 15. Known gaps / things we haven't validated

- **OAuth banks in production.** Chase, Capital One, Wells Fargo require
  `redirect_uri` (Universal Link) in the link_token. We skip this in Phase 1.
  Before production: register a domain, configure apple-app-site-association,
  add Associated Domains entitlement, update link_token creation. See §10.2.
- **Cursor migration cost.** If we ever call `/transactions/get` alongside
  `/transactions/sync`, the migration uses `cursor: "now"` to fast-forward.
  Untested.
- **Sandbox vs production parity for PFC.** The category taxonomy is
  version-pinned (`v1` or `v2`); we use the default. Verify all sandbox
  transactions populate `personal_finance_category.detailed` consistently.
- **Multi-account handling.** Plaid Items typically contain multiple accounts
  (checking + savings). Phase 1 stores one cursor per Item. The `account_id`
  filter option creates a *separate cursor stream* — don't use it without
  migrating to per-account cursor storage.
- **`modified[]` re-evaluation.** We log but ignore modified transactions.
  A `pending → posted` transition can change amount and category, which could
  flip a rule from fire to not-fire (or vice versa). Phase 2 concern.
- **Rate limits.** Plaid doesn't publish per-Item or per-account quotas. We
  expect webhook-driven volume (≤4 syncs/day per Item) to stay well under any
  limit.

---

## 16. Diff base

Reviewed against (live as of 2026-05-23):

- https://plaid.com/docs/link/ios/ — iOS SDK setup, OAuth redirect, callbacks
- https://plaid.com/docs/link/oauth/ — OAuth requirements, Universal Links
- https://plaid.com/docs/api/products/transactions/ — sync endpoint, Transaction fields
- https://plaid.com/docs/api/webhooks/webhook-verification/ — JWT verification
- https://plaid.com/docs/api/link/ — link_token, public_token exchange
- https://plaid.com/docs/api/sandbox/ — sandbox endpoints
- https://plaid.com/docs/sandbox/ — sandbox behavior, test credentials
- https://plaid.com/docs/sandbox/test-credentials/ — full credentials table
- https://plaid.com/docs/errors/ — error types and codes
- https://plaid.com/docs/api/items/ — item lifecycle

Update this doc when Plaid releases a new PFC taxonomy version, a new webhook
code, or a breaking change to any endpoint we use.
