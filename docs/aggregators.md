# Coiny — Bank Data Aggregators

How Coiny gets transaction data into the backend. Recommendation, pricing,
and the rationale for choosing Teller first and adding Plaid in Phase 5.

---

## What an Aggregator Is

A middleman between Coiny and the ~11,000 US banks. We integrate once with the
aggregator's API; the aggregator handles per-bank auth, screen-scraping,
schema normalization, and the user-facing "log in to your bank" widget.

```
Coiny backend  →  Aggregator  →  11,000 banks
                  (Teller, Plaid, MX, Yodlee, Finicity)
```

Without an aggregator we'd be writing 11,000 bank integrations. With one we
write one and it works for most US banks.

---

## The Landscape

| Aggregator | Posture | Indie-friendly? | Strongest at |
|---|---|---|---|
| **Teller** | Newest, leanest, cheapest | ✅ Yes — no security questionnaire, click-wrap dev agreement | Major US banks, near-real-time webhooks |
| **Plaid** | Largest, most polished, most expensive | ⚠️ Yes but with a serious security questionnaire | Coverage, ML enrichment, dedicated subscription / income / investments APIs |
| **Finicity (Mastercard Data Connect)** | Mid-tier, post-Mastercard acquisition opaque | ⚠️ Was indie-accessible, harder now | Mortgage, asset verification |
| **MX** | Enterprise-only | ❌ $2–5K/mo minimums | Credit unions, data enrichment |
| **Yodlee (Envestnet)** | Old guard, enterprise-only | ❌ $2–5K/mo+ minimums | Used by Mint historically |

---

## Pricing (Indie-Scale Estimates)

Pricing is murky because most aggregators don't publish full price lists.
Numbers below are based on public pages, founder reports, and the Plaid /
Teller dashboards as of 2026-05.

### Per account / per month

| Aggregator | Model | 100 users / 200 accounts | 1,000 users / 2,000 accounts |
|---|---|---|---|
| **Teller** | ~$0.10–0.20 / account / mo (sandbox + dev tier free) | **~$20–40 / mo** | **~$200–400 / mo** |
| **Plaid** | Per-product, per-call + per-item / mo | **~$60–300 / mo** | **~$600–2,000 / mo** |
| **Finicity** | Per-connection, est. $0.50–2 / account / mo | **~$100–400 / mo** | **~$1–4K / mo** |
| **MX / Yodlee** | Enterprise contract | **Blocked — $2–5K+ / mo minimum** | Same |

### Plaid's per-product breakdown

Plaid charges per **product** (a Plaid term for an API capability — not Coiny's
product). Adding products multiplies the bill.

| Plaid product | What it returns | Cost (indie ballpark) |
|---|---|---|
| **Transactions** | List of bank transactions | ~$0.30–0.50 / item / mo |
| **Auth** | Account + routing numbers | ~$1.50 first call |
| **Identity** | Name / address / phone on the account | ~$1 / call |
| **Investments** | Brokerage holdings + trades | ~$0.35 / account / mo |
| **Liabilities** | Mortgage / loan / credit card balances | Similar to Investments |
| **Income** | Pay stub data | ~$15 / verification |
| **Assets** | Asset verification report | Per report |

Coiny would use **Transactions** today; **Investments** when Phase 5 adds
brokerage support.

### Third-party transaction enrichment

Optional vendors that do nothing but classify transactions (categorization,
merchant ID, recurring detection). Useful if you stay on Teller and want
Plaid-grade categorization.

| Vendor | Price | Best at |
|---|---|---|
| **Ntropy** | $0.001–0.01 / txn | Categorization + merchant ID |
| **Heron Data** | $0.001–0.005 / txn | Categorization + recurring |
| **Spade** | Custom | Subscription + categorization |

At 100 users × ~200 txns / mo (~20K txns), that's roughly **$20–200 / mo**.

---

## One-Time Costs to Add an Aggregator

- **Engineering**: 1–3 weeks per integration (sandbox → production)
- **Security questionnaire**: Plaid's is ~6 hours of work; Teller's is
  essentially nothing
- **Contract review**: $0 if you accept click-wrap; $500–1.5K if a lawyer
  reviews

---

## Coiny's Strategy

**Single aggregator until a user complaint forces a second one.**
Don't speculatively integrate.

### Phase 1–4 (MVP through closed beta): Teller only
- Already integrated (mTLS cert + key in `~/Documents/coiny-secrets/`)
- Covers major US banks for the prototype use case
- Cheap, lightweight, click-wrap dev agreement
- Webhook-driven — fits Coiny's reactive architecture

### Phase 5 (public launch + investments): + Plaid Investments
- Teller's investment coverage is narrow — this is the gap that justifies
  adding a second aggregator
- Plaid is added for **one product** (Investments), not as a Teller
  replacement
- Coiny becomes a 2-aggregator system: Teller for transactions, Plaid for
  brokerage
- Estimated added cost at 500 users: ~$300 / mo

### Post-1K users with real complaints: consider Finicity / MX
- Add only if specific users report coverage gaps (credit unions are the
  usual culprit)
- Not before — operational complexity isn't worth speculative coverage

---

## Why Not Plaid Up Front?

Plaid is the default for VC-backed fintechs because they have headcount to
absorb its overhead. For Coiny:

| Friction | Teller | Plaid |
|---|---|---|
| Onboarding | mTLS cert + click-wrap | Security questionnaire (~6h), production approval gate |
| Pricing transparency | Public, single-axis | Per-product, opaque, scales fast |
| Webhook posture | First-class, real-time | Available but historically batched |
| Indie founder reports | "It just works" | "Doable but the questionnaire is real work" |
| Per-account cost at indie scale | ~$0.10–0.20 / mo | ~$0.30–0.50 / mo + per-product fees |

Trade-off: Teller has no equivalent to Plaid's `transactions/recurring/get`
endpoint (see "Smarter Signals" below). We build that ourselves.

---

## Smarter Signals for Subscription / Recurring Detection

When Coiny adds subscription detection, the algorithm choice depends on the
aggregator:

| Signal | Available in Teller? | Available in Plaid? |
|---|---|---|
| Raw transactions (group-by + cadence inference) | ✅ Always | ✅ Always |
| **MCC codes** (Merchant Category Code — `4899` streaming, `5968` continuity merchants) | ⚠️ Check API docs | ✅ Yes |
| **Card network "Recurring Payment Indicator"** (MIT flag from Visa / Mastercard) | ❌ Not surfaced | ⚠️ Sometimes |
| **Dedicated recurring API** — returns `inflowStreams` / `outflowStreams` with `frequency`, `isActive`, `status` | ❌ Not available | ✅ [`transactions/recurring/get`](https://plaid.com/docs/api/products/transactions/#transactionsrecurringget) |

**Implication for Coiny**: until Plaid is added, subscription detection is a
pattern-matching algorithm we own (group transactions by merchant + amount,
look for 3+ charges with ~30-day spacing). When Plaid is added, swap to its
recurring API for users connected via Plaid; keep the home-grown detector as
fallback for Teller-only users.

---

## COGS Implication

The aggregator bill is the structural floor for Coiny's pricing:

| Stack | Per-user / mo |
|---|---|
| Teller only | ~$0.30 |
| Teller + Plaid Investments | ~$2–4 |
| Teller + Plaid Investments + enrichment vendor | ~$3–5 |

This is why **subscription pricing (~$3.99 / mo) is structurally required**
— ads or data-resale aren't options if Coiny wants a clean compliance posture
(see `docs/security.md`).

---

## Indie Precedents (How Other Founders Built This)

Concrete examples of bootstrapped consumer PFM apps and the aggregator
choices they made:

| App | Founder | Aggregators | Notes |
|---|---|---|---|
| **Lunch Money** | Jen Yip (solo) | Plaid only | Still solo, $40K+ / yr revenue, never publicly mentioned compliance pain |
| **Copilot Money** | Andrés Ugarte (solo) | Plaid + Mastercard Data Connect (Finicity) | Bootstrapped 2018–2020; subscription model = clean compliance story |
| **PocketSmith** | Jason Leong + 2 (bootstrapped since 2008) | Open banking + Yodlee | 370K users in 190 countries, never raised |
| **Rocket Money (Truebill)** | Mokhtarzada brothers | Started with cheaper aggregators, moved to Plaid post-revenue | YC 2016, sold for $1.275B |

Pattern: **start cheap, add a second aggregator only when there's a concrete
revenue or coverage reason.** Coiny's Teller-first plan matches the indie
playbook.
