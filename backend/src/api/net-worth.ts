// GET /api/net-worth is a pure DB read (prd.md R-16.1): no external call, no
// write. Every class carries { value, asOf, status } in `classes`, failures
// and stale exclusions are counted in `excluded`, and the legacy scalar fields
// keep their names for the shipped iOS build (additive change only).
//
// POST /api/net-worth/refresh is the explicit live path: it refreshes the
// formerly-inline classes (bank, investments, crypto, defi, debts), re-derives
// the goal system, and returns the same response shape. The billed Plaid
// balance pull is capped per day (engineering-budgets.md section 2); when the
// cap is spent the free refreshes still run and `bankRefresh` says `capped`.

import type { FastifyInstance } from 'fastify';
import { assembleNetWorth } from '../networth/read.js';
import { refreshAllForUser } from '../networth/refresh.js';
import { trackServerEvent } from '../store/analytics.js';
import { tryConsumeManualRefresh } from '../store/asset-cache.js';
import { getItemsByUser } from '../store/items.js';
import { REFRESH_LIMIT } from './rate-limits.js';

/**
 * Daily ceiling on billed `/accounts/balance/get` CALLS per user, not on
 * refreshes. Held at 4 so the single-item case is unchanged: one bank, four
 * refreshes a day, exactly as before.
 *
 * A user with more banks than this still gets one refresh a day, because
 * tryConsumeManualRefresh always lets the first one of the day through. Their
 * ceiling is therefore max(4, item count) calls a day rather than 4 x items,
 * which is what it was when the budget counted refreshes: at five banks that
 * was 600 billed calls a month against an estimate written for 20.
 */
export const MANUAL_BANK_BALANCE_CALLS_PER_DAY = 4;

/** @deprecated Renamed to MANUAL_BANK_BALANCE_CALLS_PER_DAY, which says what
 *  the number actually bounds. Kept as an alias for one release because the
 *  old name is referenced in engineering-budgets.md and in tests. */
export const MANUAL_BANK_REFRESH_PER_DAY = MANUAL_BANK_BALANCE_CALLS_PER_DAY;

export function registerNetWorthApi(app: FastifyInstance): void {
  app.get('/api/net-worth', async (req, _reply) => {
    const userId = req.user!.id;
    const { response } = await assembleNetWorth(userId);
    return response;
  });

  // The most expensive route in the API, and until now the only limit on it was
  // the global 100/second. See api/rate-limits.ts for the arithmetic.
  app.post('/api/net-worth/refresh', REFRESH_LIMIT, async (req, _reply) => {
    const userId = req.user!.id;

    // The balance pull is the only per-call-billed request a user can drive
    // (plaid.com/docs/account/billing lists /accounts/balance/get under
    // per-request flat fee); consume the daily budget only when there is an
    // item to pull for.
    //
    // The budget is spent in CALLS, and one refresh costs one call PER ITEM
    // because fetchPlaidSnapshot fans out over items. Charging one unit per
    // refresh meant a user with five linked banks cost five times as much for
    // the same nominal allowance, which is the opposite of what a cost control
    // is for.
    const items = await getItemsByUser(userId);
    const today = new Date().toISOString().slice(0, 10);
    const bankAllowed =
      items.length > 0
        ? await tryConsumeManualRefresh(userId, MANUAL_BANK_BALANCE_CALLS_PER_DAY, today, items.length)
        : true;

    const result = await refreshAllForUser(userId, { bankAllowed });

    // Server-observed (R-24.2): the cap decision is made HERE, so whether a
    // user-driven refresh ran or hit the daily bank budget is recorded
    // server-side, never device-reported. The client-side wealth_refresh_pulled
    // event covers only what the server cannot see (debounced pulls).
    await trackServerEvent(userId, 'net_worth_refreshed', { bank: result.bank });

    const { response } = await assembleNetWorth(userId);
    return { ...response, bankRefresh: result.bank };
  });
}
