# Data Disposal Schedule

The written disposal schedule required by FTC Safeguards 16 CFR 314.4(c)(6)
and PRD R-22.3. The rule's requirement is disposal within two years of last
use; **two years is the ceiling, not the target** (R-22.3), so this schedule
sets shorter periods wherever the product does not need the data.

Status: this is the policy. The purge job that executes it does not exist yet;
it depends on the scheduler (PRD R-16.2), which makes the scheduler a
compliance dependency. Until the job ships, the only disposal mechanisms are
account deletion (built, R-15.5) and per-connection disconnect. That gap is
acceptable at zero production users and must close before sustained real-user
operation.

## Schedule

| Data (table) | Retained | Disposal trigger and mechanism |
|---|---|---|
| Everything, on account deletion | n/a | Immediate: cascade delete across all FK constraints + Plaid upstream revocation (built). Encrypted backups age out within 30 days (R-20.1) |
| Plaid transactions, recurring streams, liability cache | While the Plaid item is active, plus **90 days** after the item is removed or disconnected | Purge job. 90 days is proposed (open decision B7); it covers reconnect-within-a-quarter without keeping a dead item's history |
| Provider tokens and keys (Plaid, Coinbase, YNAB, Discogs, TrueLayer, Kraken, Kalshi, Alpaca) | While the connection exists | Row deleted at disconnect (built per-connection). Nothing retains a revoked credential |
| Pending handshake rows (`discogs_pending`, `spinwheel_pending`) | 24 hours | Purge job; these are dead after the OAuth/OTP flow finishes or is abandoned |
| Expired sessions | 90-day absolute cap (already enforced at validation) | Purge job deletes expired rows so the table does not accumulate; also closes the unbounded-sessions note in R-15.3 |
| Notification log | 90 days | Purge job; the push budget only ever looks back one week |
| Reaction history | 12 months | Purge job; the pet's memory does not need to outlive a year |
| Analytics events (when built, R-24.1) | 12 months | Purge job; cohort analysis at this scale never needs more |
| Daily net worth snapshots (`net_worth_daily`) | While the account is active; this is the product's history feature, tier-limited at display time (30 days free, 2 years Individual) | Account deletion only. Judgment call: the data is the user's own history and disposing of it would delete a paid feature; the two-year Safeguards clock runs from *last use*, and an active account uses its history continuously |
| Derived state, goals, ladder, pet state | While the account is active | Account deletion; these are live product state, recomputed or user-owned |
| Inactive accounts (no sign-in, no webhook-driven activity) | **15 months** after last activity | Purge job: warning email at 12 months, deletion at 15. Proposed; comfortably inside the 24-month ceiling, and an account nobody has opened in a year is a liability, not an asset |
| User identity row (email, subs) | Life of the account | Account deletion or the inactive-account rule above |

## Mechanics

- "Purge job" means the nightly pass owned by the scheduler (R-16.2) once it
  exists. Each purge logs counts only, never contents.
- Disposal means deletion from the primary database; backup media age out on
  the 30-day backup retention window (R-20.1), which is stated in the privacy
  policy.
- This schedule binds the privacy policy section 4; if a period changes here,
  change the policy in the same PR.

## Open items

1. **B7 (founder decision):** confirm 90 days post-disconnect for transaction
   data, or pick another N. The privacy policy currently says 90.
2. **Build order:** the purge job is unbuilt and scheduled behind the
   scheduler; do not let it slip past sustained real-user operation.
3. Adopted: ______________ (date) by the Qualified Individual.
