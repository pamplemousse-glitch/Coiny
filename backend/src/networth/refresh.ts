// The live half of the net-worth path (prd.md R-16.1): every external fetch
// lives here, behind the explicit refresh endpoint and the scheduler, never in
// the GET. Each class refresh persists on success and records an honest
// failure on error, so the DB-only read path can answer `error` instead of a
// silent zero (R-8.1). Nothing here logs amounts or merchant names
// (.claude/rules/security.md #2).

import { eq } from 'drizzle-orm';
import { getAccounts, getSpotPrices } from '../coinbase/client.js';
import { isSharedCoinbaseKeyAllowed } from '../config.js';
import { db } from '../db/client.js';
import { coinbaseConnections, petState, zerionWallets } from '../db/schema.js';
import { refreshGoalSystem } from '../goals/refresh.js';
import { fetchDebtSnapshot, fetchPlaidSnapshot } from '../goals/snapshot.js';
import { investmentsHoldingsGet, liabilitiesGet } from '../plaid/client.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { evaluateExternalEvent } from '../reactions/external.js';
import { recordClassFailure, recordClassSuccess, upsertPlaidAccountBalances } from '../store/asset-cache.js';
import { getItemsByUser } from '../store/items.js';
import { recordReaction } from '../store/pet.js';
import { cacheLiabilities, getCachedLiabilities } from '../store/plaid-liabilities.js';
import { getPortfolio } from '../zerion/client.js';
import type { CryptoPosition } from './read.js';
import { assembleNetWorth } from './read.js';

/** Buckets a vendor failure into the error-class enum used by logs and the
 *  cache row. Deliberately coarse: no message text ever leaves this function,
 *  so vendor error bodies (which can echo request detail) stay out of the DB
 *  and the logs. */
export function classifyError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'TimeoutError') return 'timeout';
  if (err && typeof err === 'object') {
    const status =
      'status' in err && typeof err.status === 'number'
        ? err.status
        : 'statusCode' in err && typeof err.statusCode === 'number'
          ? err.statusCode
          : null;
    if (status === 429) return '429';
    if (status !== null && status >= 500) return '5xx';
    if (status === 401 || status === 403) return 'auth';
    if ('name' in err && err.name === 'ZodError') return 'parse';
  }
  if (err instanceof TypeError) return 'network';
  return 'unknown';
}

export type RefreshOutcome = 'refreshed' | 'failed' | 'not_connected';

/** Manual-path Plaid refresh: balances (the one billed, user-drivable call),
 *  holdings, and the liability fallback, all via the shared live snapshot.
 *  Persists per-account balances for every item whose call succeeded. */
export async function refreshBankAndInvestments(userId: string): Promise<RefreshOutcome> {
  const items = await getItemsByUser(userId);
  if (items.length === 0) return 'not_connected';

  const snapshot = await fetchPlaidSnapshot(userId);
  const asOf = new Date();

  for (const synced of snapshot.syncedAccounts) {
    await upsertPlaidAccountBalances(userId, synced.itemId, synced.accounts, asOf);
  }

  if (snapshot.balancesLoaded) {
    await recordClassSuccess(userId, 'bank', { valueUsd: null, payload: null, asOf });
  } else {
    await recordClassFailure(userId, 'bank', classifyError(snapshot.balanceFailure), asOf);
  }

  if (snapshot.allHoldingsSucceeded) {
    await recordClassSuccess(userId, 'investments', {
      valueUsd: snapshot.investmentsTotal,
      payload: { holdings: snapshot.investmentHoldings },
      asOf,
    });
  } else {
    await recordClassFailure(userId, 'investments', classifyError(snapshot.holdingsFailure), asOf);
  }

  // Backfill the liability cache when the webhook has not populated it yet, so
  // due dates and APRs survive into the DB-only read. Liabilities ride the
  // item subscription: no per-call billing. Best effort by design.
  try {
    const cached = await getCachedLiabilities(userId);
    if (cached.length === 0) {
      const liabilityResults = await Promise.allSettled(items.map((item) => liabilitiesGet(item.accessToken)));
      for (const result of liabilityResults) {
        if (result.status === 'fulfilled') await cacheLiabilities(userId, result.value);
      }
    }
  } catch (err) {
    void err; // metadata garnish; the balances above already persisted
  }

  return snapshot.balancesLoaded || snapshot.allHoldingsSucceeded ? 'refreshed' : 'failed';
}

/** Scheduled Plaid refresh: holdings only. Balance freshness rides the
 *  transactions webhook for free; /accounts/balance/get is billed per call and
 *  never runs on a schedule (engineering-budgets.md section 2). */
export async function refreshInvestments(userId: string): Promise<RefreshOutcome> {
  const items = await getItemsByUser(userId);
  if (items.length === 0) return 'not_connected';

  const results = await Promise.allSettled(items.map((item) => investmentsHoldingsGet(item.accessToken)));
  const firstFailure = results.find((r) => r.status === 'rejected');
  if (firstFailure && firstFailure.status === 'rejected') {
    // A partial success would undercount; keep the last good cache instead.
    await recordClassFailure(userId, 'investments', classifyError(firstFailure.reason));
    return 'failed';
  }

  let total = 0;
  const holdings: Array<{ securityId: string; name: string | null; ticker: string | null; value: number }> = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const secMap = new Map(result.value.securities.map((s) => [s.security_id, s]));
    for (const h of result.value.holdings) {
      const value = h.institution_value ?? 0;
      total += value;
      const sec = secMap.get(h.security_id);
      holdings.push({
        securityId: h.security_id,
        name: sec?.name ?? null,
        ticker: sec?.ticker_symbol ?? null,
        value,
      });
    }
  }

  await recordClassSuccess(userId, 'investments', { valueUsd: total, payload: { holdings } });
  return 'refreshed';
}

export async function refreshCrypto(userId: string): Promise<RefreshOutcome> {
  const [connection] = await db().select().from(coinbaseConnections).where(eq(coinbaseConnections.userId, userId));
  if (!connection || (connection.mode === 'dev_key' && !isSharedCoinbaseKeyAllowed())) return 'not_connected';

  try {
    const accounts = await getAccounts();
    const symbols = accounts.map((a) => a.currency).filter((s): s is string => typeof s === 'string');
    const prices = symbols.length > 0 ? await getSpotPrices(symbols) : new Map<string, number>();

    let total = 0;
    const positions: CryptoPosition[] = [];
    for (const acct of accounts) {
      // Available PLUS held. `hold` is money reserved against pending
      // transfers; it is still the user's, and counting only
      // available_balance understated any account with a transfer in flight.
      const available = Number.parseFloat(acct.available_balance.value);
      const held = acct.hold ? Number.parseFloat(acct.hold.value) : 0;
      const amount = (Number.isFinite(available) ? available : 0) + (Number.isFinite(held) ? held : 0);
      if (amount <= 0) continue;
      const usd = prices.get(acct.currency);
      const valueUSD = usd ? amount * usd : 0;
      total += valueUSD;
      positions.push({ id: acct.uuid, name: acct.currency, symbol: acct.currency, amount, valueUSD });
    }

    await recordClassSuccess(userId, 'crypto', { valueUsd: total, payload: { positions } });
    return 'refreshed';
  } catch (err) {
    await recordClassFailure(userId, 'crypto', classifyError(err));
    return 'failed';
  }
}

export async function refreshDefi(userId: string): Promise<RefreshOutcome> {
  const wallets = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId));
  if (wallets.length === 0) return 'not_connected';

  try {
    // Sequential on purpose: Zerion rate limits per org, and a failing wallet
    // must fail the whole refresh (a partial sum would undercount silently).
    let total = 0;
    for (const wallet of wallets) {
      const portfolio = await getPortfolio(wallet.address);
      total += portfolio.total_usd;
    }
    await recordClassSuccess(userId, 'defi', { valueUsd: total, payload: null });
    return 'refreshed';
  } catch (err) {
    await recordClassFailure(userId, 'defi', classifyError(err));
    return 'failed';
  }
}

export async function refreshDebts(userId: string): Promise<RefreshOutcome> {
  const snapshot = await fetchDebtSnapshot(userId);
  if (!snapshot.spinwheelConnected) return 'not_connected';

  if (!snapshot.spinwheelDebtsLoaded) {
    await recordClassFailure(userId, 'debts', classifyError(snapshot.fetchError));
    return 'failed';
  }

  await recordClassSuccess(userId, 'debts', {
    valueUsd: snapshot.debtsTotal,
    payload: { items: snapshot.debtItems, debts: snapshot.debts },
  });
  return 'refreshed';
}

export type ScheduledClass = 'investments' | 'crypto' | 'defi' | 'debts';

export function refreshScheduledClass(userId: string, cls: ScheduledClass): Promise<RefreshOutcome> {
  switch (cls) {
    case 'investments':
      return refreshInvestments(userId);
    case 'crypto':
      return refreshCrypto(userId);
    case 'defi':
      return refreshDefi(userId);
    case 'debts':
      return refreshDebts(userId);
  }
}

const NET_WORTH_MILESTONES = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

export function crossedMilestone(prev: number, current: number): number | null {
  for (let i = NET_WORTH_MILESTONES.length - 1; i >= 0; i--) {
    const m = NET_WORTH_MILESTONES[i]!;
    if (prev < m && current >= m) return m;
  }
  return null;
}

/** Re-derives the goal system and the milestone baseline from the cached
 *  snapshot. Runs after an explicit refresh and on the scheduler's daily pass,
 *  never inside GET (the read path stays pure).
 *
 *  When the assembly is degraded (any connected class excluded from the
 *  total), the daily point is still recorded (a gap would be worse) but the
 *  milestone baseline is NOT advanced: a total that shrank because a vendor
 *  died must never become the baseline that a later recovery "crosses". */
export async function runGoalRefreshFromCache(userId: string, now: Date = new Date()): Promise<void> {
  const { goalInputs, degraded } = await assembleNetWorth(userId, now);
  const total = goalInputs.netWorth?.totalUsd ?? 0;

  await refreshGoalSystem(userId, goalInputs, now);

  if (degraded) return;

  const [pet] = await db().select().from(petState).where(eq(petState.userId, userId));
  if (!pet) return;

  const prev = pet.lastNetWorthUsd !== null ? parseFloat(pet.lastNetWorthUsd) : null;
  const milestone = prev !== null ? crossedMilestone(prev, total) : null;
  if (milestone !== null) {
    const reaction = evaluateExternalEvent({
      id: `nw-milestone-${userId}-${milestone}`,
      userId,
      type: 'net_worth_milestone',
      amountUsd: milestone,
      source: 'zerion',
    });
    if (reaction) {
      await recordReaction(userId, 'net_worth_milestone', reaction);
      dispatchReaction(userId, reaction, 'net_worth_milestone');
    }
  }
  if (prev === null || Math.abs(total - prev) > 0.01) {
    await db().update(petState).set({ lastNetWorthUsd: total.toString() }).where(eq(petState.userId, userId));
  }
}

export type ManualRefreshResult = {
  /** 'capped' means the daily budget for the billed balance pull was spent;
   *  the free refreshes still ran. */
  bank: RefreshOutcome | 'capped';
};

/** The explicit user-driven refresh behind POST /api/net-worth/refresh. Every
 *  class refresh is failure-isolated; a dead vendor surfaces as that class's
 *  `error` status, never as a failed request. */
export async function refreshAllForUser(userId: string, opts: { bankAllowed: boolean }): Promise<ManualRefreshResult> {
  let bank: RefreshOutcome | 'capped';
  if (opts.bankAllowed) {
    bank = await refreshBankAndInvestments(userId);
  } else {
    bank = 'capped';
    // Holdings ride the item subscription (no per-call billing); refresh them
    // even when the balance pull is capped.
    await refreshInvestments(userId);
  }

  await refreshCrypto(userId);
  await refreshDefi(userId);
  await refreshDebts(userId);

  await runGoalRefreshFromCache(userId);
  return { bank };
}
