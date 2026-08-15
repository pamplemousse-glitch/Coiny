// Store layer for the net-worth freshness caches (prd.md R-8.x, R-16.1, R-16.4):
// plaid_account_balances (per-account bank balances fed by the transactions-sync
// webhook) and asset_class_cache (per-class value + freshness + failure state for
// the classes refreshed by the scheduler and the explicit refresh endpoint).
//
// Every function is scoped by userId (.claude/rules/security.md #6). Nothing in
// here logs; callers own logging and must keep amounts and merchant names out of
// log sinks (#2).

import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { assetClassCache, plaidAccountBalances } from '../db/schema.js';

export type PlaidAccountBalanceRow = typeof plaidAccountBalances.$inferSelect;
export type AssetClassCacheRow = typeof assetClassCache.$inferSelect;

/** The asset classes that live in asset_class_cache. `bank` holds bookkeeping
 *  only (failure counters, manual-refresh cap); its values are per-account rows
 *  in plaid_account_balances. */
export type CachedAssetClass = 'bank' | 'investments' | 'crypto' | 'defi' | 'debts';

export type AccountBalanceInput = {
  accountId: string;
  name: string;
  type: string;
  subtype: string | null;
  balance: number | null;
};

/** Upserts the full account set for one Plaid item and removes rows for
 *  accounts the item no longer reports (closed accounts must not linger as
 *  phantom balances). Called from the webhook sync and the refresh path. */
export async function upsertPlaidAccountBalances(
  userId: string,
  itemId: string,
  accounts: AccountBalanceInput[],
  asOf: Date = new Date(),
): Promise<void> {
  const ids = accounts.map((a) => a.accountId);
  if (ids.length === 0) {
    await db()
      .delete(plaidAccountBalances)
      .where(and(eq(plaidAccountBalances.userId, userId), eq(plaidAccountBalances.itemId, itemId)));
    return;
  }

  for (const acct of accounts) {
    await db()
      .insert(plaidAccountBalances)
      .values({
        accountId: acct.accountId,
        userId,
        itemId,
        name: acct.name,
        type: acct.type,
        subtype: acct.subtype,
        balance: acct.balance !== null ? acct.balance.toString() : null,
        asOf,
      })
      .onConflictDoUpdate({
        target: plaidAccountBalances.accountId,
        set: {
          userId,
          itemId,
          name: acct.name,
          type: acct.type,
          subtype: acct.subtype,
          balance: acct.balance !== null ? acct.balance.toString() : null,
          asOf,
        },
      });
  }

  await db()
    .delete(plaidAccountBalances)
    .where(
      and(
        eq(plaidAccountBalances.userId, userId),
        eq(plaidAccountBalances.itemId, itemId),
        notInArray(plaidAccountBalances.accountId, ids),
      ),
    );
}

export async function getPlaidAccountBalances(userId: string): Promise<PlaidAccountBalanceRow[]> {
  return db().select().from(plaidAccountBalances).where(eq(plaidAccountBalances.userId, userId));
}

/** Records a successful class refresh: value, freshness, payload, and a reset
 *  of the failure counters. `valueUsd: null` is legal for the `bank`
 *  bookkeeping row, whose values live per account. */
export async function recordClassSuccess(
  userId: string,
  assetClass: CachedAssetClass,
  args: { valueUsd: number | null; payload: Record<string, unknown> | null; asOf?: Date },
): Promise<void> {
  const asOf = args.asOf ?? new Date();
  const set = {
    valueUsd: args.valueUsd !== null ? args.valueUsd.toString() : null,
    asOf,
    payload: args.payload,
    lastAttemptAt: asOf,
    lastErrorClass: null,
    consecutiveFailures: 0,
  };
  await db()
    .insert(assetClassCache)
    .values({ userId, assetClass, ...set })
    .onConflictDoUpdate({ target: [assetClassCache.userId, assetClassCache.assetClass], set });
}

/** Records a failed class refresh WITHOUT touching the last good value/asOf:
 *  the read path keeps serving the cached value with its real age, and a class
 *  that has never succeeded reads `error`, never zero (prd.md R-8.1). */
export async function recordClassFailure(
  userId: string,
  assetClass: CachedAssetClass,
  errorClass: string,
  at: Date = new Date(),
): Promise<void> {
  const [existing] = await db()
    .select()
    .from(assetClassCache)
    .where(and(eq(assetClassCache.userId, userId), eq(assetClassCache.assetClass, assetClass)));

  if (!existing) {
    await db().insert(assetClassCache).values({
      userId,
      assetClass,
      lastAttemptAt: at,
      lastErrorClass: errorClass,
      consecutiveFailures: 1,
    });
    return;
  }

  await db()
    .update(assetClassCache)
    .set({
      lastAttemptAt: at,
      lastErrorClass: errorClass,
      consecutiveFailures: existing.consecutiveFailures + 1,
    })
    .where(and(eq(assetClassCache.userId, userId), eq(assetClassCache.assetClass, assetClass)));
}

export async function getClassCache(userId: string): Promise<Map<string, AssetClassCacheRow>> {
  const rows = await db().select().from(assetClassCache).where(eq(assetClassCache.userId, userId));
  return new Map(rows.map((r) => [r.assetClass, r]));
}

export async function getClassCacheRow(
  userId: string,
  assetClass: CachedAssetClass,
): Promise<AssetClassCacheRow | null> {
  const [row] = await db()
    .select()
    .from(assetClassCache)
    .where(and(eq(assetClassCache.userId, userId), eq(assetClassCache.assetClass, assetClass)));
  return row ?? null;
}

/** Returns cache rows for one class across a set of users. Scheduler use: the
 *  caller supplies the connected-user set it derived from the provider tables,
 *  so this never widens beyond users known to have the class. */
export async function getClassCacheForUsers(
  assetClass: CachedAssetClass,
  userIds: string[],
): Promise<Map<string, AssetClassCacheRow>> {
  if (userIds.length === 0) return new Map();
  const rows = await db()
    .select()
    .from(assetClassCache)
    .where(and(eq(assetClassCache.assetClass, assetClass), inArray(assetClassCache.userId, userIds)));
  return new Map(rows.map((r) => [r.userId, r]));
}

/** Consumes one unit of the daily manual-refresh budget for the billed Plaid
 *  balance pull (engineering-budgets.md section 2: 4/day). Returns false and
 *  consumes nothing when the budget is exhausted. Tracked on the `bank` row. */
export async function tryConsumeManualRefresh(userId: string, limit: number, today: string): Promise<boolean> {
  const existing = await getClassCacheRow(userId, 'bank');

  if (!existing) {
    await db().insert(assetClassCache).values({
      userId,
      assetClass: 'bank',
      manualRefreshDate: today,
      manualRefreshCount: 1,
    });
    return true;
  }

  const count = existing.manualRefreshDate === today ? existing.manualRefreshCount : 0;
  if (count >= limit) return false;

  await db()
    .update(assetClassCache)
    .set({ manualRefreshDate: today, manualRefreshCount: count + 1 })
    .where(and(eq(assetClassCache.userId, userId), eq(assetClassCache.assetClass, 'bank')));
  return true;
}
