# Plaid Swap — Execution Plan

**Decision date:** 2026-05-19
**Branch:** `feat/swap-to-plaid` (branched off `feat/postgres-persistence`)
**Estimated effort:** ~4-6 h of focused backend work + ~1-2 h mobile + ~30 min docs.

> Companion doc: [docs/plaid-integration.md](./plaid-integration.md) — full
> contract reference covering JWT verification, `/transactions/sync` semantics,
> webhook codes, PFC taxonomy, error model. This plan refers back to it.

---

## Why

Original plan (`docs/aggregators.md`) was Teller now → add Plaid in Phase 5 for
Investments only. Decision reversed 2026-05-19 after explicit cost-benefit
discussion: Plaid is the industry default, the migration cost is manageable
while the surface area is still small, and we'd rather pay it once now than
maintain dual-aggregator code in Phase 5. Cost difference (~$20/mo vs ~$60/mo
at 100 users) is acceptable.

---

## What changes

### Replaced (deleted)
- `backend/src/teller/` — types, signature verification
- `backend/src/webhook/teller.ts` — webhook handler
- mTLS cert decoding in `backend/entrypoint.sh`
- `TELLER_*` env vars in `backend/src/config.ts`
- Teller secrets in Fly + Keychain (after parity confirmed, 24h soak)
- `~/Documents/coiny-secrets/teller-sandbox/` (after parity confirmed)

### New
- `backend/src/plaid/client.ts` — thin `undici` wrapper around 5 endpoints we need
- `backend/src/plaid/signature.ts` — JWT verification (`jose`), keys cached per `kid`
- `backend/src/plaid/types.ts` — Plaid response shapes (only what we use)
- `backend/src/plaid/adapter.ts` — Plaid txn → internal `Transaction` shape (uses PFC mapping from `docs/plaid-integration.md` §8)
- `backend/src/webhook/plaid.ts` — replaces `webhook/teller.ts`
- `backend/src/api/plaid-link.ts` — `POST /api/plaid/link-token`, `POST /api/plaid/exchange-token`
- `backend/src/types/transaction.ts` — vendor-neutral `Transaction` type (moved from `teller/types.ts`)
- `plaid_items` table: `item_id` (PK), `access_token`, `cursor` (nullable), `initial_sync_complete` (bool), `disabled` (bool), `created_at`
- New Drizzle migration generated and committed

### Changed
- `backend/src/config.ts` — `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `PLAID_WEBHOOK_URL`. **Also**: allow PGlite path for `NODE_ENV=development` when `DATABASE_URL` is empty (so `pnpm dev` works without Neon)
- `backend/src/rules/definitions.ts` + `engine.ts` — consume vendor-neutral `Transaction`. No behavioral change. Comment on `running_balance` updated to reflect Plaid's "approximate, batch-level" semantics
- `backend/Dockerfile` — drop mTLS cert COPY/decoding
- `backend/entrypoint.sh` — drop cert decoding, becomes a one-line `exec node`
- `fly.toml` — env var section updated
- `bin/load-secrets.sh` — read Plaid keys from Keychain
- `backend/tests/webhook.test.ts` — Plaid JWT fixtures (signed locally with test EC keypair; mock `webhook_verification_key/get` to return the matching public JWK) + `undici.MockAgent` for `/transactions/sync`
- `backend/tests/rules.test.ts` — retype to vendor-neutral `Transaction`, no logic change
- `CLAUDE.md` — replace Teller references with Plaid + link to integration doc. **Updated in Phase 1, not deferred to Phase 3** — this is the file every new session reads
- `docs/aggregators.md` — note the Phase-5-now-Phase-1 reversal
- `mobile/app/(tabs)/link-bank.tsx` — swap Teller Connect for Plaid Link SDK (**deferred to follow-up PR `feat/plaid-link-mobile`**)

### Unchanged
- Rule engine logic (paycheck, overspending, savings, bills, large purchase) — pure functions of the abstract `Transaction` shape
- Pet state, reactions, dispatch
- Postgres persistence layer (Drizzle, all stores) — this branch sits on top of it
- Fly hosting setup (host name, region, deploy command)
- CI workflows
- Mobile UI (everything except the bank-link screen)
- `processed_events` table — re-used for transaction-level idempotency, just keyed on Plaid `transaction_id` instead of Teller event id

---

## Sequence

Phase 1: backend rewrite. Branch is `feat/swap-to-plaid`.

| # | Task | Why this order |
|---|------|----------------|
| 1 | `pnpm add jose` (undici already present). Update `config.ts` so `NODE_ENV=development` with empty `DATABASE_URL` falls back to PGlite. | Toolchain + dev parity. |
| 2 | Move `TellerTransaction` → `src/types/transaction.ts` as `Transaction` (vendor-neutral). Update all imports. Behavior unchanged. | Decouples rule engine from vendor before the swap; minimizes diff churn. |
| 3 | Add `plaid_items` table to `src/db/schema.ts`. Schema: `item_id text PK`, `access_token text not null`, `cursor text` (nullable), `initial_sync_complete boolean default false`, `disabled boolean default false`, `created_at timestamptz default now()`. Run `pnpm db:generate`. | Webhook handler needs cursor + access_token + sync-state storage per Item. |
| 4 | Write `src/plaid/client.ts` — typed `undici.fetch` wrappers for `linkTokenCreate`, `itemPublicTokenExchange`, `transactionsSync`, `webhookVerificationKeyGet`, `sandboxItemFireWebhook`. Base URL from `PLAID_ENV`. Auth via `client_id` + `secret` in body. | Foundation for everything else. |
| 5 | Write `src/plaid/signature.ts` — verify `Plaid-Verification` JWT. Cache keys per `kid` (immutable for that `kid`; never TTL-evict). On unknown `kid`: fetch from Plaid. Verify `iat` within 5 min and `request_body_sha256` matches raw body. | Webhook security. Use `jose`. |
| 6 | Write `src/plaid/adapter.ts` — `plaidTxToInternal(plaidTx, accountBalance) → Transaction`. Sign-flip amount (Plaid +outflow → Teller-style -outflow). Map `personal_finance_category.detailed` → `details.category` using the table in `docs/plaid-integration.md` §8. Map `merchant_name` → `details.counterparty.name`. Set `running_balance` to passed-in account balance. | Lets the rule engine stay vendor-neutral. |
| 7 | Write `src/webhook/plaid.ts`. Logic flow: verify JWT → parse envelope → dispatch by `webhook_type`+`webhook_code` (full table in `docs/plaid-integration.md` §6). For `SYNC_UPDATES_AVAILABLE` + `DEFAULT_UPDATE`: look up Item by `item_id` (warn-log if unknown — race with exchange-token), bail if `disabled`. Otherwise: paginate `/transactions/sync` while `has_more`; on `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` restart from original cursor. After full sync: extract balance per account from `accounts[]`, adapt each `added` tx, **if `initial_sync_complete=false` skip rule eval and just set the flag**, otherwise `claimEvent(transaction_id)` then run rules. Persist `next_cursor`. Log+200 for `modified`/`removed`. For `USER_PERMISSION_REVOKED`: set `disabled=true`. | Replaces `webhook/teller.ts`. The hardest single file in the swap. |
| 8 | Write `src/api/plaid-link.ts` — `POST /api/plaid/link-token` builds the link_token request (params per `docs/plaid-integration.md` §9.1) and returns `{ link_token }`. `POST /api/plaid/exchange-token` accepts `{ public_token }`, exchanges via Plaid, upserts `plaid_items` row with `cursor=null`, `initial_sync_complete=false`. | Mobile bank-link flow. |
| 9 | Update `src/server.ts` — register the new routes + webhook, unregister Teller webhook. | Wire it all up. |
| 10 | Update `src/config.ts` — drop `TELLER_*`, add `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV='sandbox'`, `PLAID_WEBHOOK_URL`. | Config validation. |
| 11 | Update `backend/Dockerfile` (drop mTLS-related env, keep COPY drizzle) and `backend/entrypoint.sh` (becomes a one-line `exec node /app/backend/dist/server.js`). | Cleaner runtime image, no mTLS. |
| 12 | Delete `src/teller/`, `src/webhook/teller.ts`. Verify no remaining imports. | Cleanup. |
| 13 | Rewrite `tests/webhook.test.ts`. Use Node's `webcrypto` to generate an EC P-256 keypair at test start. Sign JWT fixtures with the private key. Mock the `webhookVerificationKeyGet` Plaid call to return the matching public JWK. Use `undici.MockAgent` to mock `/transactions/sync` responses. Test: signature verification, dispatch by code, initial-sync-no-react, normal sync runs rules, idempotency via `transaction_id`, pagination loop. | Tests must pass before merge. |
| 14 | Update `bin/load-secrets.sh` to read `coiny-plaid-client-id` and `coiny-plaid-sandbox-secret` from Keychain. Drop Teller exports. | Local dev parity. |
| 15 | Update `fly.toml` env block. Update `CLAUDE.md` (Plaid references + link to integration doc). Update `docs/aggregators.md` with the reversal note. | Docs + infra parity. |
| 16 | `pnpm typecheck && pnpm test`. Push. Open PR. | Local validation gate. |
| 17 | After merge: `fly secrets set PLAID_CLIENT_ID=... PLAID_SECRET=... PLAID_ENV=sandbox PLAID_WEBHOOK_URL=https://coiny-backend.fly.dev/webhooks/plaid` + `DATABASE_URL=<neon>`. `fly secrets unset TELLER_APPLICATION_ID TELLER_SIGNING_SECRET TELLER_CERT_B64 TELLER_KEY_B64`. `fly deploy`. **Production validation gate** (next section). | |

Phase 2 (follow-up PR, `feat/plaid-link-mobile`):
- `mobile/app/(tabs)/link-bank.tsx` — swap to `react-native-plaid-link-sdk`
- Mobile services for fetching `link_token` from backend
- Test on simulator with sandbox credentials (`user_good` / `pass_good`)

---

## Validation gates

**Local (before push):**
- `pnpm --filter coiny-backend typecheck` passes
- `pnpm --filter coiny-backend test` passes — including new Plaid webhook test
- `pnpm --filter coiny-backend build` produces a clean `dist/`

**Production (after `fly deploy`, this is G2-equivalent for Plaid):**

Since we can't yet test the Link flow end-to-end (mobile is Phase 2), the
validation gate uses the sandbox helper to fire a webhook against an
existing Item. Sequence:

1. Create a sandbox Item manually using `/sandbox/public_token/create` with `user_transactions_dynamic`, then `/item/public_token/exchange` to get an `access_token`. Persist it manually into `plaid_items` (via `fly ssh` + a quick `psql` insert, or a one-off admin endpoint).
2. `curl https://coiny-backend.fly.dev/health` → `{"ok":true}`
3. `fly logs` shows backend started without errors, no `TELLER_*` warnings
4. From local: call `/sandbox/item/fire_webhook` with `webhook_code=SYNC_UPDATES_AVAILABLE` for that Item's access_token
5. `fly logs` must show:
   - `incoming request POST /webhooks/plaid`
   - `200` response
   - `plaid webhook verified`
   - For first delivery: `initial sync — skipping rule evaluation` (since we just created the Item)
6. Inject test transactions via `/sandbox/transactions/create` and fire `SYNC_UPDATES_AVAILABLE` again
7. `fly logs` must show: rule matches, reactions dispatched

---

## Rollback

- Branch `feat/swap-to-plaid` is independent of `main`; if scrapped before merge, `git checkout main && git branch -D feat/swap-to-plaid` reverts cleanly.
- If merged and then needs reverting in production: previous Teller deployment image is still on Fly (one release back); `fly releases revert` brings it back. Teller cert files are still in `~/Documents/coiny-secrets/teller-sandbox/` (delete only after parity confirmed for 24h).
- Don't delete Teller Keychain entries (`coiny-teller-application-id`, `coiny-teller-signing-secret`) or Fly secrets until **after** validation gate passes for at least 24h.

---

## What's still needed from Antoine

| Step | When |
|------|------|
| Create Neon project + provide `DATABASE_URL` | Before deploy step 17 |
| Confirm Plaid Link redirect URI (only matters when OAuth banks come into scope — defer) | Phase 2 mobile |
| Fire validation webhooks from Plaid sandbox during step 17 | Deploy |

---

## Open questions / decisions deferred

- **`modified` transactions**: Plaid sends these when e.g. a pending tx posts. Phase 1 ignores them. If a pending tx triggers `large_purchase` and then re-fires on posting, the user gets two reactions — but since idempotency is keyed on `transaction_id`, the second is deduped. ✓ acceptable.
- **`removed` transactions**: ignored Phase 1. We never reverse reactions.
- **Multi-account handling:** When a user links one Item with multiple accounts (checking + savings), we still use one cursor per Item (Plaid's default). For Phase 1 we apply the same `running_balance` (account-level) to all transactions; the savings_milestone rule only fires sensibly for transactions to/from a savings account, but the rule isn't account-aware yet. Defer.
- **Cursor recovery on Item re-link:** If a user re-links their bank, the `access_token` changes but the `item_id` typically stays. Plan: on the exchange-token endpoint, upsert by `item_id` so a re-link updates the token in place. Cursor stays valid per Plaid's contract.
- **`plaid` SDK vs direct HTTPS:** Chose direct HTTPS. Revisit if endpoint count grows past 8-10.
- **OAuth banks (Chase, Capital One, Wells Fargo):** require `redirect_uri` in link_token. Sandbox doesn't exercise OAuth. Defer until production launch.

---

## Files this plan replaces / supersedes

None. This is a new initiative not covered by existing docs. `docs/aggregators.md` will be updated in step 15 to note the reversal.
