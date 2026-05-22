# Plaid API Catalog — Complete Reference (May 2026)

Pulled from Plaid docs + changelog. Update this file when Plaid releases breaking changes.
Currently using: **Transactions only**. See §20 for Coiny-specific decision framework.

---

## Architecture

REST/JSON over HTTPS. 12,000+ institutions. One "Item" = one user at one institution.
Auth: `client_id` + `secret` in body. Item calls also require `access_token`.

Base URLs: `https://sandbox.plaid.com` / `https://production.plaid.com`

---

## 1. Transactions ✅ (in use)

Up to 24 months of transaction history. Depository, credit, student loan accounts.

### Key endpoints

| Endpoint | Purpose |
|---|---|
| `POST /transactions/sync` | Cursor-based incremental updates — **use this** |
| `POST /transactions/recurring/get` | Recurring inflow/outflow stream detection |
| `POST /transactions/refresh` | Force-fetch (per-request fee) |

### Key transaction fields

- `transaction_id` — stable across redeliveries (idempotency key)
- `amount` — positive = outflow, negative = inflow
- `payment_channel` — `"online"` / `"in store"` / `"other"`
- `pending` — settlement status
- `personal_finance_category.primary` / `.detailed` / `.confidence_level` (PFCv2)
- `counterparties[].name`, `.type`, `.logo_url`, `.website`, `.phone_number`
- `location` — street, city, state, lat/lon, store_number
- `logo_url`, `personal_finance_category_icon_url` — 100×100 PNGs
- `merchant_name` — enriched

### Webhooks

| webhook_code | Trigger |
|---|---|
| `SYNC_UPDATES_AVAILABLE` | New incremental data ready — main one |
| `RECURRING_TRANSACTIONS_UPDATE` | Recurring patterns changed — **we log/ignore; should use** |
| `INITIAL_UPDATE` | First batch complete |
| `HISTORICAL_UPDATE` | Extended history complete |
| `TRANSACTIONS_REMOVED` | Institution retracted transactions |

### Rate limits
- `/transactions/sync`: 50/min per Item, 2,500/min per client
- `/transactions/refresh`: 2/min, 120/hr, 2,880/day per Item

### Breaking changes
- May 20, 2025: Legacy `category_id` and `category` fields **permanently removed**
- Dec 3, 2025: PFCv2 is now default for all new customers

---

## 2. Balance

Real-time (live-fetch) balance — always reaches the institution, never cached.

**Billing:** Per-request flat fee.

### Key endpoint

`POST /accounts/balance/get`

**Response per account:**
- `balances.available` — withdrawable funds (nullable)
- `balances.current` — total balance (nullable)
- `balances.limit` — credit limit / overdraft allowance
- `balances.last_updated_datetime` — Capital One only

**Rate limits:** 5/min, 30/hr per Item

**Gotchas:**
- Can take 30+ seconds (live institution call)
- No webhook — purely request/response

---

## 3. Identity

Account holder name, address, email, phone from the institution. KYC / name matching.

**Billing:** One-time fee per Item.

### Key endpoints

| Endpoint | Purpose |
|---|---|
| `POST /identity/get` | Full identity data |
| `POST /identity/match` | Score-based comparison (0–100) vs. bank identity |

Only `names` is guaranteed to be populated; all other fields may be empty.

---

## 4. Investments

Holdings + transaction history for brokerage, 401k, IRA, Roth, 529, crypto exchange accounts.

**Billing:** Monthly subscription per Item.

### Key endpoints

| Endpoint | Purpose |
|---|---|
| `POST /investments/holdings/get` | Current positions |
| `POST /investments/transactions/get` | Up to 24 months of investment transactions |

**Holdings fields:** `quantity`, `cost_basis`, `institution_price`, `ticker_symbol`, `cusip`, `isin`, `type`, `sector`

**Webhooks:** `HOLDINGS.DEFAULT_UPDATE`, `INVESTMENTS_TRANSACTIONS.DEFAULT_UPDATE`

**Gotchas:**
- Initial retrieval can take 1–2 minutes; use `async_update: true`
- CUSIP/ISIN null by default; requires licensing

---

## 5. Liabilities

Structured debt data: credit cards, student loans, mortgages.

**Billing:** Monthly subscription per Item.

### Key endpoint

`POST /liabilities/get`

**Credit card fields:** APRs, `minimum_payment_amount`, `next_payment_due_date`, `last_statement_balance`, `is_overdue`

**Student loan fields:** `expected_payoff_date`, `interest_rate_percentage`, `repayment_plan.type`, `pslf_status`

**Mortgage fields:** `interest_rate.percentage/.type`, `origination_date`, `maturity_date`, `has_pmi`, `ytd_interest_paid`

**Webhooks:** `LIABILITIES.DEFAULT_UPDATE` (with `account_ids_with_new_liabilities` + `account_ids_with_updated_liabilities`)

**Gotchas:** Data refreshes ~1×/day; not real-time.

---

## 6. Income

Two flavors: (1) Bank Income — transaction-derived; (2) Payroll Income — direct payroll connections + document upload (pay stubs, W-2, 1099).

**Billing:** One-time fee per Item.

### Key endpoints

| Endpoint | Purpose |
|---|---|
| `POST /credit/bank_income/get` | Bank-derived income streams |
| `POST /credit/payroll_income/get` | Payroll data |

**Income source categories:** `SALARY`, `UNEMPLOYMENT`, `GIG_ECONOMY`, `RENTAL`, `RETIREMENT`, `CHILD_SUPPORT`, `MILITARY`, `BANK_INTEREST`, `TAX_REFUND`, `OTHER`

**Income stream fields:** `income_category`, `pay_frequency`, `status` (`ACTIVE`/`INACTIVE`/`UNKNOWN`), `start_date`, `next_payment_date`

**Webhooks:** `INCOME.BANK_INCOME_REFRESH_COMPLETE`, `INCOME.INCOME_VERIFICATION`

**Breaking change (May 20, 2026):** `income_streams` returns `[]` instead of being omitted when none exist.

---

## 7. Assets

Point-in-time snapshot of up to 24 months of balance history. For mortgage/lending. Generates structured PDF/JSON report.

**Billing:** Per-request flexible fee.

Not relevant for Coiny until lending features are added.

---

## 8. Auth

Bank account + routing numbers for ACH/EFT/wire. Three methods: Instant Auth, micro-deposits, Database Auth.

**Billing:** One-time fee per Item.

`POST /auth/get` returns `numbers.ach[].account`, `.routing`, `.wire_routing`.

**Gotchas:**
- Chase, PNC, US Bank return tokenized account numbers (TANs) — use `account_token_id`
- When `AUTH.DEFAULT_UPDATE` fires, discontinue all existing Auth data for those accounts
- Micro-deposit verification expires after 7 days

---

## 9. Signal

ACH return risk scoring. ML scores (1–99) + 80+ attributes. No-code Rules engine.

**Billing:** Per-request flat fee.

`POST /signal/evaluate` → `scores.customer_initiated_return_risk.score` + `scores.bank_initiated_return_risk.score`

Not relevant until Coiny initiates payments/transfers.

---

## 10. Transfer

End-to-end ACH, Same Day ACH, RTP, FedNow, wire origination. Includes Plaid Ledger (FBO balance) and recurring transfers.

Not relevant for Coiny currently.

---

## 11. Layer

Phone number-based instant onboarding. Checks Plaid Network, device KYC, returns verified identity + linked accounts in one flow.

**Billing:** One-time per converted session.

US only. Could replace Plaid Link + Apple Sign In onboarding in the future.

---

## 12. Statements

PDF bank statements, up to 2 years. `POST /statements/list` + `/statements/download`.

Not relevant for Coiny.

---

## 13. Enrich

Standalone enrichment for non-Plaid transaction data. Send raw strings, get merchant names, categories, logos, websites. For banks/processors that already have raw transaction data. Not needed since Coiny uses Transactions product (enrichment is included).

---

## 14. Consumer Report (Plaid Check)

FCRA-compliant CRA product. LendScore, cash flow analysis, income verification for lenders. Not relevant for Coiny.

---

## 15. Identity Verification (IDV)

Hosted KYC flow — document verify, selfie liveness, database KYC, risk scoring. Not relevant for Coiny currently.

---

## 16. Monitor

Ongoing sanctions/PEP/adverse media screening. AML compliance. Not relevant.

---

## 17. Beacon (Beta)

Cross-institution fraud consortium network. Not relevant.

---

## PFC v2 Taxonomy (Complete)

PFCv2 is default for all new customers since Dec 3, 2025. Coiny should use it.

**INCOME:** `SALARY`, `CONTRACTOR`, `DIVIDENDS`, `GIG_ECONOMY`, `INTEREST_EARNED`, `LONG_TERM_DISABILITY`, `MILITARY`, `RENTAL`, `RETIREMENT_PENSION`, `TAX_REFUND`, `UNEMPLOYMENT`, `OTHER`

**LOAN_DISBURSEMENTS (new in v2):** `AUTO`, `CASH_ADVANCES`, `EWA`, `MORTGAGE`, `PERSONAL`, `STUDENT`, `OTHER`

**LOAN_PAYMENTS:** `BNPL` *(new)*, `CAR_PAYMENT`, `CASH_ADVANCES`, `CREDIT_CARD_PAYMENT`, `EWA` *(new)*, `MORTGAGE_PAYMENT`, `PERSONAL_LOAN_PAYMENT`, `STUDENT_LOAN_PAYMENT`, `OTHER`

**TRANSFER_IN:** `ACCOUNT_TRANSFER`, `DEPOSIT`, `INVESTMENT_AND_RETIREMENT_FUNDS`, `SAVINGS`, `TRANSFER_IN_FROM_APPS`, `WIRE` *(new)*, `OTHER`

**TRANSFER_OUT:** `ACCOUNT_TRANSFER`, `CRYPTO` *(new)*, `INVESTMENT_AND_RETIREMENT_FUNDS`, `SAVINGS`, `TRANSFER_OUT_FROM_APPS`, `WIRE` *(new)*, `WITHDRAWAL`, `OTHER`

**BANK_FEES:** `ATM_FEES`, `INSUFFICIENT_FUNDS`, `INTEREST_CHARGE`, `FOREIGN_TRANSACTION_FEES`, `OVERDRAFT_FEES`, `LATE_FEES` *(new)*, `CASH_ADVANCE` *(new)*, `OTHER`

**ENTERTAINMENT:** `CASINOS_AND_GAMBLING`, `MUSIC_AND_AUDIO`, `SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS`, `TV_AND_MOVIES`, `VIDEO_GAMES`, `OTHER`

**FOOD_AND_DRINK:** `BEER_WINE_AND_LIQUOR`, `COFFEE`, `FAST_FOOD`, `GROCERIES`, `RESTAURANT`, `VENDING_MACHINES`, `OTHER`

**GENERAL_MERCHANDISE:** `BOOKSTORES_AND_NEWSSTANDS`, `CLOTHING_AND_ACCESSORIES`, `CONVENIENCE_STORES`, `DEPARTMENT_STORES`, `DISCOUNT_STORES`, `ELECTRONICS`, `GIFTS_AND_NOVELTIES`, `OFFICE_SUPPLIES`, `ONLINE_MARKETPLACES`, `PET_SUPPLIES`, `SPORTING_GOODS`, `SUPERSTORES`, `TOBACCO_AND_VAPE`, `OTHER`

**HOME_IMPROVEMENT:** `FURNITURE`, `HARDWARE`, `REPAIR_AND_MAINTENANCE`, `SECURITY`, `OTHER`

**MEDICAL:** `DENTAL_CARE`, `EYE_CARE`, `NURSING_CARE`, `PHARMACIES_AND_SUPPLEMENTS`, `PRIMARY_CARE`, `VETERINARY_SERVICES`, `OTHER`

**PERSONAL_CARE:** `GYMS_AND_FITNESS_CENTERS`, `HAIR_AND_BEAUTY`, `LAUNDRY_AND_DRY_CLEANING`, `OTHER`

**GENERAL_SERVICES:** `ACCOUNTING_AND_FINANCIAL_PLANNING`, `AUTOMOTIVE`, `CHILDCARE`, `CONSULTING_AND_LEGAL`, `EDUCATION`, `INSURANCE`, `POSTAGE_AND_SHIPPING`, `STORAGE`, `OTHER`

**GOVERNMENT_AND_NON_PROFIT:** `DONATIONS`, `GOVERNMENT_DEPARTMENTS_AND_AGENCIES`, `TAX_PAYMENT`, `OTHER`

**TRANSPORTATION:** `BIKES_AND_SCOOTERS`, `GAS`, `PARKING`, `PUBLIC_TRANSIT`, `TAXIS_AND_RIDE_SHARES`, `TOLLS`, `OTHER`

**TRAVEL:** `FLIGHTS`, `LODGING`, `RENTAL_CARS`, `OTHER`

**RENT_AND_UTILITIES:** `GAS_AND_ELECTRICITY`, `INTERNET_AND_CABLE`, `RENT`, `SEWAGE_AND_WASTE_MANAGEMENT`, `TELEPHONE`, `WATER`, `OTHER_UTILITIES`

**OTHER:** `OTHER`

---

## Rate Limits (Production)

| Endpoint | Per-Item/min | Per-Client/min |
|---|---|---|
| `/transactions/sync` | 50 | 2,500 |
| `/transactions/refresh` | 2 (120/hr) | 100 |
| `/accounts/balance/get` | 5 (30/hr) | 1,200 |
| `/auth/get` | 15 | 12,000 |
| `/identity/get` | 15 | 2,000 |
| `/investments/holdings/get` | 15 | 2,000 |
| `/investments/transactions/get` | 30 | 20,000 |

---

## Breaking Changes Timeline

| Date | Change |
|---|---|
| May 20, 2025 | Legacy `category_id` + `category` fields removed from Transactions |
| Oct 15, 2025 | Signal `scores` field made nullable |
| Dec 3, 2025 | PFCv2 default for new Transactions customers |
| Feb 26, 2026 | Webhook error objects: `display_message: null` instead of omitting |
| Apr 15, 2026 | Trial plan: 10 free production Items for new teams |
| Apr 30, 2026 | Limited-purpose checking accounts omitted from Link by default |
| May 20, 2026 | Income: `income_streams` returns `[]` instead of being omitted |
| May 20, 2026 | New: `/user/items/remove`, `/user/products/terminate` endpoints |

---

## 20. Coiny Decision Framework

| Product | Relevance | Priority | Notes |
|---|---|---|---|
| **Recurring Transactions** | Subscription + bill detection | **High — do now** | Replaces keyword matching in rule engine; free (included in Transactions) |
| **PFCv2** | Better category taxonomy | **High — do now** | Already on sync; just pass `personal_finance_category_version: "v2"` and update adapter |
| **`counterparties[]` / `logo_url`** | Merchant enrichment | **Medium** | Already in sync response; just start using these fields in push notifications |
| **`payment_channel`** | Online vs. in-store reactions | **Medium** | Field already present; use it in rule engine |
| **Balance** | Low balance warning reaction | **Medium** | New real-time API call; per-request cost |
| **Liabilities** | Credit card due date / overdue reactions | **Medium** | Monthly subscription; powerful for debt milestone reactions |
| **Income (Bank Income)** | Better paycheck detection | **Medium** | Replace `INCOME_WAGES` keyword matching with verified income streams |
| **`modified` array** | Re-evaluate pending→posted flips | **Low** | Currently log/ignore; worth handling for gas station hold accuracy |
| **Investments** | Net worth tracking | **Future** | Phase 4+; feature-backlog item |
| **Auth** | Savings automation | **Future** | Only if Coiny initiates transfers |
| **Layer** | Faster onboarding | **Future** | Alternative to current Apple Sign In + Plaid Link two-step |
