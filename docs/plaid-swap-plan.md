# Plaid Swap — Execution Plan

**Decision date:** 2026-05-19
**Branch:** `feat/swap-to-plaid` (branched off `feat/postgres-persistence`)
**Estimated effort:** ~4-6 h of focused backend work + ~1-2 h mobile + ~30 min docs.

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
- Teller secrets in Fly + Keychain (after parity confirmed)
- `~/Documents/coiny-secrets/teller-sandbox/` (after parity confirmed)

### New
- `backend/src/plaid/client.ts` — thin `undici` wrapper around 5 endpoints we need
- `backend/src/plaid/signature.ts` — JWT verification against Plaid's JWKS
- `backend/src/plaid/types.ts` — Plaid response shapes (only what we use)
- `backend/src/plaid/adapter.ts` — Plaid transaction → internal `Transaction` shape
- `backend/src/webhook/plaid.ts` — replaces `webhook/teller.ts`
- `backend/src/api/plaid-link.ts` — `POST /api/plaid/link-token`, `POST /api/plaid/exchange-token`
- `plaid_items` table (in same Drizzle migration set) — stores `access_token`, `item_id`, `cursor`
- New Plaid migration generated and committed

### Changed
- `backend/src/config.ts` — `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `PLAID_WEBHOOK_URL`
- `backend/src/rules/definitions.ts` + `engine.ts` — no behavior change; consume the renamed `Transaction` type
- `backend/src/teller/types.ts` → renamed to `backend/src/types/transaction.ts` (vendor-neutral)
- `backend/Dockerfile` — drop mTLS cert COPY/decoding
- `backend/entrypoint.sh` — drop cert decoding, simpler exec
- `fly.toml` — env var section updated
- `bin/load-secrets.sh` — read Plaid keys from Keychain
- `backend/tests/webhook.test.ts` — Plaid JWT fixtures + `/transactions/sync` mock
- `backend/tests/rules.test.ts` — no logic change; rename import path if Transaction moves
- `mobile/app/(tabs)/link-bank.tsx` — swap Teller Connect for Plaid Link SDK (deferred to follow-up PR)

### Unchanged
- Rule engine logic (paycheck, overspending, savings, bills, large purchase) — pure functions of the abstract `Transaction` shape
- Pet state, reactions, dispatch
- Postgres persistence layer (Drizzle, all stores) — this branch sits on top of it
- Fly hosting setup (host name, region, deploy command)
- CI workflows
- Mobile UI (everything except the bank-link screen)

---

## Sequence

Phase 1: backend rewrite. Branch is `feat/swap-to-plaid`.

| # | Task | Why this order |
|---|------|----------------|
| 1 | Add deps: `undici` (already present), `jose` for JWT verification. **Skip the official `plaid` SDK** — 5 endpoints, direct HTTPS is smaller. | Establishes the toolchain. |
| 2 | Rename `TellerTransaction` → `Transaction` (vendor-neutral). Move to `src/types/transaction.ts`. Update all imports. Behavior unchanged. | De-coupling the rule engine from vendor before the swap minimizes diff churn. |
| 3 | Add `plaid_items` table to `src/db/schema.ts`. Generate migration via `pnpm db:generate`. | Webhook handler needs cursor + access_token storage. |
| 4 | Write `src/plaid/client.ts` — typed fetch wrappers for `linkTokenCreate`, `itemPublicTokenExchange`, `transactionsSync`, `accountsBalanceGet`, `webhookVerificationKeyGet`. | Foundation for everything else. |
| 5 | Write `src/plaid/signature.ts` — verify `Plaid-Verification` JWT against JWKS cached in-memory with 24h TTL. | Webhook security. Use `jose`. |
| 6 | Write `src/plaid/adapter.ts` — `plaidTxToInternal(plaidTx, accountBalance) → Transaction`. Sign-flip amount (Plaid +outflow → Teller-style -outflow). Map `personal_finance_category.detailed` → `details.category`. Map `merchant_name` → `details.counterparty.name`. | Lets the rule engine stay vendor-neutral. |
| 7 | Write `src/webhook/plaid.ts` — verify JWT, parse webhook envelope, dispatch by webhook_code. For `SYNC_UPDATES_AVAILABLE`: look up Item by `item_id`, call `/transactions/sync` with cursor, fetch balance, adapt each tx, run through rule engine, save updated cursor. | Replaces `webhook/teller.ts`. |
| 8 | Write `src/api/plaid-link.ts` — `POST /api/plaid/link-token` (creates link_token for mobile), `POST /api/plaid/exchange-token` (public_token → access_token, persists Item row). | Mobile bank-link flow. |
| 9 | Update `src/server.ts` — register the new routes, unregister the Teller webhook. | Wire it all up. |
| 10 | Update `src/config.ts` — drop `TELLER_*`, add `PLAID_*`. | Config validation. |
| 11 | Update `backend/Dockerfile` and `backend/entrypoint.sh` — remove mTLS cert decoding. | Cleaner runtime image. |
| 12 | Delete `src/teller/`, `src/webhook/teller.ts`. | Cleanup. |
| 13 | Rewrite `tests/webhook.test.ts` for Plaid (sign fixtures with a known JWKS keypair, mock `/transactions/sync` response with `undici`'s MockAgent). Keep `tests/rules.test.ts` largely as-is, just retype to vendor-neutral. | Tests must pass before merge. |
| 14 | Update `bin/load-secrets.sh` — read `coiny-plaid-client-id` + `coiny-plaid-sandbox-secret` from Keychain. | Local dev parity. |
| 15 | Update `fly.toml` env block + `fly secrets set` for `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox`, `PLAID_WEBHOOK_URL`. `fly secrets unset` Teller ones. | Production parity. |
| 16 | Deploy. Set webhook URL in Plaid dashboard. Run sandbox event from Plaid dashboard. Confirm `fly logs` show signature verified + transaction processed. | **Validation gate (see below).** |
| 17 | Open PR, squash-merge, sync main. | |

Phase 2 (follow-up PR, `feat/plaid-link-mobile`):
- `mobile/app/(tabs)/link-bank.tsx` — swap to `react-native-plaid-link-sdk`
- Mobile services for fetching `link_token` from backend
- Test on simulator with sandbox credentials (`user_good` / `pass_good`)

Phase 3 (follow-up PR, `docs/plaid-swap`):
- Update `docs/architecture.md`, `docs/security.md`, `docs/handoff.md`, `docs/aggregators.md`, `CLAUDE.md`
- Add `docs/plaid-webhook-schema.md` covering the JWT verification + `/transactions/sync` cursor pattern

---

## Validation gates

**Local (before push):**
- `pnpm --filter coiny-backend typecheck` passes
- `pnpm --filter coiny-backend test` passes — including new Plaid webhook test
- `pnpm --filter coiny-backend build` produces a clean `dist/`

**Production (after `fly deploy`):**
- `curl https://coiny-backend.fly.dev/health` → `{"ok":true}`
- `fly logs` shows backend started without Teller env var errors
- From Plaid dashboard → Webhooks → "Send test webhook" → `fly logs` shows:
  - `incoming request POST /webhooks/plaid`
  - `200` response
  - log line `Plaid webhook verified` (or equivalent)
- From Plaid sandbox: trigger a `SYNC_UPDATES_AVAILABLE` event for the test Item. `fly logs` shows transactions processed and reaction dispatched.

---

## Rollback

- Branch `feat/swap-to-plaid` is independent of `main`; if scrapped before merge, `git checkout main && git branch -D feat/swap-to-plaid` reverts cleanly.
- If merged and then needs reverting in production: previous Teller deployment image is still on Fly (one release back); `fly releases revert` brings it back. Teller cert files are still in `~/Documents/coiny-secrets/teller-sandbox/` (delete only after parity confirmed).
- Don't delete Teller Keychain entries or Fly secrets until **after** validation gate passes for at least 24h.

---

## What's still needed from Antoine

| Step | When |
|------|------|
| Neon DATABASE_URL (still pending from T2.1) | Before deploy step 16 |
| Confirm Plaid Connect / Link redirect URI when prompted | When I'm wiring step 8 |
| Test the deployed webhook from Plaid dashboard | Validation gate |

---

## Open questions / decisions deferred

- **Running balance computation:** Plaid doesn't send `running_balance` per transaction; the `savings_milestone` rule needs it. Plan: fetch current account balance once per webhook via `/accounts/balance/get` and use it as the `running_balance` for all txns in that batch. Not perfectly accurate but Phase 1 acceptable.
- **Multi-account handling:** When a user links one Item with multiple accounts (checking + savings), do we track balance per-account or aggregate? Defer to Phase 3+ — for now, single account.
- **Cursor recovery on Item re-link:** If a user re-links their bank, the access_token changes but the cursor stays valid. Plan: on `ITEM` webhook code `LOGIN_REPAIRED` or `USER_PERMISSION_REVOKED`, clear the cursor and reseed from latest. Defer until we hit it.
- **`plaid` SDK vs direct HTTPS:** Chose direct HTTPS. Revisit if endpoint count grows past 8-10.

---

## Files this plan replaces / supersedes

None. This is a new initiative not covered by existing docs.
