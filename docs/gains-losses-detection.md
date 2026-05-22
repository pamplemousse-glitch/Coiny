# Gains & Losses Detection — Full Inventory

Current state, gaps, and how to close each one.

Status key: ✅ detected · ⚠️ partial · ❌ not detected

---

## Latency Tiers

| Tier | Typical Latency | What Enables It |
|---|---|---|
| **Proactive** | Before event occurs | Pinwheel/Argyle payroll API — knows pay date in advance |
| **Near-instant** | < 1 min | Crypto (Zerion webhooks); own card (Marqeta — Phase 4+) |
| **Intraday** | 1–8 hrs | Plaid `SYNC_UPDATES_AVAILABLE` webhook — ceiling for all US bank data |
| **Daily** | ~24 hrs | Plaid Liabilities, credit score services |
| **On-demand** | 30s+ | Plaid Balance product (real-time fetch, per-request cost) |

Everything via Plaid has intraday latency. This is a banking infrastructure constraint — not fixable without issuing our own card.

---

## Gains

### Regular Income

| Event | Status | Current Method | Gap | How to Close |
|---|---|---|---|---|
| Paycheck / direct deposit | ⚠️ Partial | Any credit ≥ `paycheckMinAmount` — no category check | False-positives (refunds, gifts trigger same rule) | **Short:** Add `personal_finance_category.primary === 'INCOME'` check alongside amount threshold. **Better:** Pinwheel — knows exact pay amount and date *before* deposit clears (proactive tier). Latency: Proactive vs 1–8hr |
| Freelance / contractor payment | ⚠️ Partial | Same threshold rule as paycheck | No distinction; gig amounts often below threshold | PFCv2: `INCOME_CONTRACTOR`. Check counterparty name (PayPal, Venmo, Gusto, Deel). Latency: 1–8hr |
| Gig economy payment (Uber, DoorDash, Instacart) | ⚠️ Partial | Same threshold — usually misses (small/frequent) | Gig payments come in $20–80 batches, often below paycheckMinAmount | PFCv2: `INCOME_GIG_ECONOMY`. Lower threshold only for this category. Argyle has best gig coverage (Uber, DoorDash, TaskRabbit). Latency: 1–8hr |
| Government benefits (SS, unemployment, disability) | ❌ | Not detected | No rule | PFCv2: `INCOME_UNEMPLOYMENT`, `INCOME_LONG_TERM_DISABILITY`. Counterparty match: "Social Security", "SSA", "state unemployment". Latency: 1–8hr |
| Military pay | ❌ | Not detected | No rule | PFCv2: `INCOME_MILITARY`. Counterparty: "DFAS". Pinwheel covers military payroll. Latency: 1–8hr (Plaid) or Proactive (Pinwheel) |
| Tax refund | ❌ | Not detected | No rule | PFCv2: `INCOME_TAX_REFUND`. Counterparty: "IRS", "US Treasury", state tax authority. Latency: 1–8hr |
| Pension / retirement distribution | ❌ | Not detected | No rule | PFCv2: `INCOME_RETIREMENT_PENSION`. Latency: 1–8hr |
| Rental income | ❌ | Not detected | No rule | PFCv2: `INCOME_RENTAL`. Recurring credit pattern from same counterparty. `/transactions/recurring/get` would auto-detect this. Latency: 1–8hr |
| Child support / alimony received | ❌ | Not detected | No rule | PFCv2: `INCOME_CHILD_SUPPORT`. Recurring credit detection. Latency: 1–8hr |

### Passive / Investment Income

| Event | Status | Current Method | Gap | How to Close |
|---|---|---|---|---|
| Interest earned (HYSA, CD, savings) | ❌ | Not detected | No rule | PFCv2: `INCOME_INTEREST_EARNED`. Small monthly credit from bank counterparty. Latency: 1–8hr |
| Investment dividend | ❌ | Not detected | No rule | PFCv2: `INCOME_DIVIDENDS`. Plaid Transactions covers brokerage-linked accounts. Latency: 1–8hr |
| Investment sale / capital gain | ❌ | Not in scope | Needs investment account data | Plaid Investments (`/investments/transactions/get`) — returns sell transactions with gain/loss. Latency: 1–8hr (webhook: `INVESTMENTS_TRANSACTIONS.DEFAULT_UPDATE`) |
| Crypto gain (realized) | ❌ | Not in scope | No crypto data source | Zerion API — monitors wallet, fires webhook on transaction. CoinGecko for pricing. Latency: Near-instant |
| Crypto staking / yield | ❌ | Not in scope | No crypto data source | Zerion API. Latency: Near-instant |

### One-Time / Irregular

| Event | Status | Current Method | Gap | How to Close |
|---|---|---|---|---|
| Refund / return credited | ❌ | Not detected | Credit that isn't income | Check for credit + matching debit merchant within 30 days. Or flag any credit with `TRANSFER_IN` category from a retail counterparty. Latency: 1–8hr |
| Cashback credited | ❌ | Not detected | No rule | Counterparty match (credit card issuer name) + small credit amount. PFCv2: `TRANSFER_IN_OTHER_TRANSFER_IN`. Latency: 1–8hr |
| Bank opening bonus | ❌ | Not detected | No rule | One-time large credit from bank counterparty. Hard to distinguish automatically — low priority. Latency: 1–8hr |
| Venmo / Zelle / CashApp received | ⚠️ Partial | Caught only if ≥ paycheckMinAmount | Missed below threshold | PFCv2: `TRANSFER_IN_TRANSFER_IN_FROM_APPS`. Any amount positive reaction. Latency: 1–8hr |
| Lottery / gambling win | ❌ | Not detected | No rule | PFCv2: `ENTERTAINMENT_CASINOS_AND_GAMBLING` + positive amount = win. Counterparty name match. Latency: 1–8hr |
| Legal / insurance settlement | ❌ | Not detected | No rule | Large one-time credit from law firm / insurance counterparty. Low frequency; not worth a dedicated rule. Latency: 1–8hr |

### Milestones

| Event | Status | Current Method | Gap | How to Close |
|---|---|---|---|---|
| Savings balance milestone (25/50/100%) | ✅ | `running_balance` vs `savingsGoal` | Only 3 breakpoints | Add configurable milestones (any % the user sets). Latency: 1–8hr |
| Savings transfer into savings account | ❌ | Not detected as positive event | No rule | PFCv2: `TRANSFER_OUT_SAVINGS` from checking = good behavior. Trigger celebrate. Latency: 1–8hr |
| Debt fully paid off | ❌ | Not detected | Needs liability balance = 0 | Plaid Liabilities (daily refresh) — detect when outstanding balance hits $0. Spinwheel for credit bureau data. Latency: Daily |
| Net worth crosses threshold | ❌ | Not in scope | Multi-source aggregation required | Sum: Plaid balances + Plaid Investments holdings + Zerion crypto. Store computed net worth, fire when it crosses a user-set milestone. Latency: Daily (investment) to 1–8hr (bank) |

---

## Losses

### Regular Bills & Obligations

| Event | Status | Current Method | Gap | How to Close |
|---|---|---|---|---|
| Bill paid (utilities, insurance) | ⚠️ Partial | Counterparty name match — 4 hardcoded strings only | Misses 90%+ of billers | `/transactions/recurring/get` auto-detects recurring outflows as bills. No hardcoded strings needed. Latency: 1–8hr (webhook: `RECURRING_TRANSACTIONS_UPDATE`) |
| Rent payment | ❌ | Not detected | No rule | PFCv2: `RENT_AND_UTILITIES_RENT`. Large monthly recurring debit. Latency: 1–8hr |
| Mortgage payment | ❌ | Not detected | No rule | PFCv2: `LOAN_PAYMENTS_MORTGAGE_PAYMENT`. Plaid Liabilities for balance + interest split. Latency: 1–8hr (payment) / Daily (balance) |
| Credit card payment | ❌ | Not detected | No rule | PFCv2: `LOAN_PAYMENTS_CREDIT_CARD_PAYMENT`. Good behavior — worth a positive reaction. Latency: 1–8hr |
| Student loan payment | ❌ | Not detected | No rule | PFCv2: `LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT`. Track remaining balance via Plaid Liabilities. Latency: 1–8hr (payment) / Daily (balance) |
| Car loan payment | ❌ | Not detected | No rule | PFCv2: `LOAN_PAYMENTS_CAR_PAYMENT`. Latency: 1–8hr |
| Personal loan payment | ❌ | Not detected | No rule | PFCv2: `LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT`. Latency: 1–8hr |
| BNPL payment (Klarna, Afterpay, Affirm) | ❌ | Not detected | No rule | PFCv2: `LOAN_PAYMENTS_BNPL`. Latency: 1–8hr |
| Subscription charge | ❌ | In handoff, not in rules | No rule | `/transactions/recurring/get` — Plaid's ML-powered subscription detector. Replace our planned keyword matching entirely. Latency: 1–8hr (webhook: `RECURRING_TRANSACTIONS_UPDATE`) |
| Subscription price increase | ❌ | Not detected | No rule | `/transactions/recurring/get` returns `average_amount` per stream — compare each charge vs average. Flag deviation > 5%. Latency: 1–8hr |

### Discretionary Spending

| Event | Status | Current Method | Gap | How to Close |
|---|---|---|---|---|
| Overspend in food (groceries/restaurants) | ✅ | Debit > weekly budget for 3 food categories | Only 3 categories; no rolling window | Expand to all PFCv2 categories. Use rolling 7-day window vs user baseline instead of per-transaction flat limit. Latency: 1–8hr |
| Large purchase | ✅ | Debit > `largePurchaseThreshold` | Flat threshold, no category context | Add category weighting: same dollar amount at a casino vs grocery store should react differently. Latency: 1–8hr |
| Overspend in entertainment | ❌ | Not detected | No rule | PFCv2: `ENTERTAINMENT_*`. Add to budget categories. Latency: 1–8hr |
| Overspend in shopping | ❌ | Not detected | No rule | PFCv2: `GENERAL_MERCHANDISE_*`. Latency: 1–8hr |
| Travel spending | ❌ | Not detected | No rule | PFCv2: `TRAVEL_*`. Context-sensitive: travel is often planned and high-value. Latency: 1–8hr |
| Gambling / casino loss | ❌ | Not detected | No rule | PFCv2: `ENTERTAINMENT_CASINOS_AND_GAMBLING` + debit = loss. Latency: 1–8hr |
| Online vs in-store distinction | ❌ | `payment_channel` field unused | Already in Plaid response | Use `transaction.payment_channel` (`"online"` / `"in store"` / `"other"`) — already returned by Plaid, zero cost to use. Latency: 1–8hr |

### Bank Fees (High Emotional Signal)

| Event | Status | Current Method | Gap | How to Close |
|---|---|---|---|---|
| Overdraft fee | ❌ | Not detected | No rule | PFCv2: `BANK_FEES_OVERDRAFT_FEES`. Highest emotional signal — user is already stressed. Trigger concerned/sad animation. Latency: 1–8hr |
| NSF / insufficient funds fee | ❌ | Not detected | No rule | PFCv2: `BANK_FEES_INSUFFICIENT_FUNDS`. Same treatment as overdraft. Latency: 1–8hr |
| Late payment fee | ❌ | Not detected | No rule | PFCv2: `BANK_FEES_LATE_FEES`. Avoidable — pair with a future "upcoming bill" reminder. Latency: 1–8hr |
| ATM fee | ❌ | Not detected | No rule | PFCv2: `BANK_FEES_ATM_FEES`. Small but frequent; a gentle nudge reaction. Latency: 1–8hr |
| Interest charge (credit card) | ❌ | Not detected | No rule | PFCv2: `BANK_FEES_INTEREST_CHARGE`. Signals carrying a balance. Latency: 1–8hr |
| Foreign transaction fee | ❌ | Not detected | No rule | PFCv2: `BANK_FEES_FOREIGN_TRANSACTION_FEES`. Latency: 1–8hr |
| Cash advance fee | ❌ | Not detected | No rule | PFCv2: `BANK_FEES_CASH_ADVANCE`. High-signal negative behavior. Latency: 1–8hr |

### Balance & Credit

| Event | Status | Current Method | Gap | How to Close |
|---|---|---|---|---|
| Balance drops below user threshold | ❌ | Not detected | No rule | Plaid Balance product — on-demand real-time fetch (`/accounts/balance/get`). Per-request cost. Trigger: after each transaction sync, check if `available` < user's set floor. Latency: On-demand (30s+) |
| Credit card balance growing (utilization) | ❌ | Not detected | Needs liability data | Plaid Liabilities — daily refresh of `last_statement_balance` + `credit_limit`. Flag when utilization > 30%. Latency: Daily |
| Credit score drop | ❌ | Not in scope | Needs credit bureau | Spinwheel (phone + DOB) or Equifax API. Check weekly. Latency: Weekly |
| Minimum payment missed | ❌ | Not in scope | Needs liability data | Plaid Liabilities `is_overdue` field. Latency: Daily |

---

## Integration Summary

### Free (already in Plaid response — just not used)

These close the most gaps at zero additional cost:

| Change | Gaps Closed |
|---|---|
| Upgrade to PFCv2 (`personal_finance_category_version: "v2"`) | All income subcategories, BNPL, crypto transfers, late fees, cash advances |
| Use `personal_finance_category.primary === 'INCOME'` in paycheck rule | Eliminates false-positives on refunds / gifts |
| Expand rule engine to cover all PFCv2 primary categories | ~20 new detectable events |
| Use `payment_channel` field | Online vs in-store distinction on all transactions |
| Expand `KNOWN_BILLERS` → use `RENT_AND_UTILITIES` + `LOAN_PAYMENTS` categories | Rent, mortgage, all loan payments, utilities |

### Plaid products not yet enabled

| Product | Cost | Gaps Closed |
|---|---|---|
| `/transactions/recurring/get` + `RECURRING_TRANSACTIONS_UPDATE` | Included in Transactions subscription | Subscriptions, bills, recurring income, price change detection |
| Plaid Balance (`/accounts/balance/get`) | Per-request flat fee | Low balance alert |
| Plaid Liabilities | Monthly subscription per Item | Credit card utilization, loan balances, overdue detection, debt payoff milestone |
| Plaid Investments | Monthly subscription per Item | Investment gains/losses, dividend detection, portfolio milestones |

### Third-party integrations

| Service | Cost | Gaps Closed | Priority |
|---|---|---|---|
| **Pinwheel** (payroll) | Custom pricing | Proactive payday detection (before deposit); exact pay amount/frequency; gig income | Phase 2 |
| **Argyle** (payroll, gig-focused) | Custom pricing | Same as Pinwheel; better gig economy coverage | Phase 2 alternative |
| **Spinwheel** (liabilities) | Custom pricing | Full debt picture (credit score, all loan balances) from phone + DOB; lower friction than Plaid Liabilities | Phase 2 |
| **Zerion API** | Free tier: 2K req/day; $149/mo for 250K | Crypto gains/losses, staking rewards, wallet transaction webhooks | Phase 3 |
| **CoinGecko** | Free: 10K calls/mo; Basic $35/mo | Price crypto holdings from Zerion | Phase 3 |
| **Equifax API** | Enterprise contract | Credit score monitoring | Phase 3 |

### Not closeable (fundamental constraints)

| Event | Why | Workaround |
|---|---|---|
| Cash transactions | No digital trail | None |
| Truly real-time bank transactions (< 1 min) | US banks batch-process; all aggregators poll | Issue own card via Marqeta (Phase 4+) |
| PayPal / Venmo / Cash App transaction reads | No third-party read API exists | Plaid as aggregation layer (covers these as linked accounts) |

---

## Recommended Implementation Order

### Sprint: Free wins (PFCv2 + category expansion)
1. Pass `personal_finance_category_version: "v2"` in `/transactions/sync`
2. Update `adapter.ts` mapping to full PFCv2 taxonomy
3. Add income category check to `paycheck_received` rule (fix false-positives)
4. Add rules for: tax refund, interest earned, dividends, Venmo/Zelle received, rent, all loan payments, all bank fees, savings transfer
5. Use `payment_channel` field in rule context

### Sprint: Plaid recurring (subscription detection)
6. Wire `RECURRING_TRANSACTIONS_UPDATE` webhook
7. Call `/transactions/recurring/get` on first Item link + on each `RECURRING_TRANSACTIONS_UPDATE`
8. Replace hardcoded `KNOWN_BILLERS` with recurring stream detection
9. Add subscription price-change detection (delta vs `average_amount`)

### Phase 2: Low balance + debt
10. Add Plaid Balance check after each sync (low balance alert)
11. Add Plaid Liabilities (credit utilization, overdue, debt payoff milestone)
12. Evaluate Spinwheel as a lighter alternative to Plaid Liabilities

### Phase 2: Payroll
13. Integrate Pinwheel for proactive payday reactions
14. Fall back to Plaid pattern matching for the 20% Pinwheel doesn't cover

### Phase 3: Net worth
15. Add Plaid Investments (investment gains/dividends)
16. Add Zerion API (crypto)
17. Compute composite net worth; add milestone reactions
