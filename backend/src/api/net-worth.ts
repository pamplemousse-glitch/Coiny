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

export const MANUAL_BANK_REFRESH_PER_DAY = 4;

export function registerNetWorthApi(app: FastifyInstance): void {
  app.get('/api/net-worth', async (req, _reply) => {
    const userId = req.user!.id;
    const { response } = await assembleNetWorth(userId);
    return response;
  });

  app.post('/api/net-worth/refresh', async (req, _reply) => {
    const userId = req.user!.id;

    // The balance pull is the only per-call-billed request a user can drive;
    // consume the daily budget only when there is an item to pull for.
    const items = await getItemsByUser(userId);
    const today = new Date().toISOString().slice(0, 10);
    const bankAllowed =
      items.length > 0 ? await tryConsumeManualRefresh(userId, MANUAL_BANK_REFRESH_PER_DAY, today) : true;

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
