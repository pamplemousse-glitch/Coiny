// Store layer for the net-worth freshness caches (prd.md R-8.x, R-16.1, R-16.4):
// plaid_account_balances (per-account bank balances fed by the transactions-sync
// webhook) and asset_class_cache (per-class value + freshness + failure state for
// the classes refreshed by the scheduler and the explicit refresh endpoint).
//
// Every function is scoped by userId (.claude/rules/security.md #6). Nothing in
// here logs; callers own logging and must keep amounts and merchant names out of
// log sinks (#2).

import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { assetClassCache, plaidAccountBalances } from '../db/schema.js';
import { checkValueTransition } from '../resilience/invariants.js';
import { recordInvariantViolation, recordOpsEvent } from './ops.js';

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

  // Plausibility, checked against what we had. NON-BLOCKING BY CONSTRUCTION:
  // the violation is recorded and the write proceeds unchanged below. A user
  // who genuinely sold everything must still see the truth, and from inside a
  // single account that is indistinguishable from the Polkadot bug. This raises
  // an alert to US, never an error to THEM.
  //
  // Costs one read per successful refresh, against a write that was already a
  // round trip. That is the entire price of catching the class of bug that has
  // now bitten twice.
  const [previous] = await db()
    .select({ valueUsd: assetClassCache.valueUsd })
    .from(assetClassCache)
    .where(and(eq(assetClassCache.userId, userId), eq(assetClassCache.assetClass, assetClass)));

  const violation = checkValueTransition(previous?.valueUsd != null ? Number(previous.valueUsd) : null, args.valueUsd, {
    collapseRatio: config.INVARIANT_COLLAPSE_RATIO,
    spikeRatio: config.INVARIANT_SPIKE_RATIO,
    minPreviousUsd: config.INVARIANT_MIN_PREVIOUS_USD,
  });
  if (violation !== null) {
    // Recorded through the breadth-aware path rather than straight to
    // recordOpsEvent: the same violation hitting several accounts in an hour
    // is the one signal that separates "a user sold everything" from "we
    // shipped a bug", which is the distinction invariants.ts says it cannot
    // make from inside one account.
    await recordInvariantViolation({
      assetClass,
      violation: violation.violation,
      detail: {
        drop_percent: violation.dropPercent,
        ...(violation.growthFactor !== undefined ? { growth_factor: violation.growthFactor } : {}),
      },
      breadthThreshold: config.INVARIANT_BREADTH_THRESHOLD,
      windowMinutes: config.INVARIANT_BREADTH_WINDOW_MINUTES,
    });
  }

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
 *  that has never succeeded reads `error`, never zero (prd.md R-8.1).
 *
 *  Also emits an ops event. This is the single chokepoint every vendor failure
 *  path funnels through (seven call sites in networth/refresh.ts), which is why
 *  the emission lives here rather than at each of them: one place to change,
 *  and none of the seven can be forgotten. The ops event carries the asset
 *  class and the error class and NOT the user, per store/ops.ts. */
export async function recordClassFailure(
  userId: string,
  assetClass: CachedAssetClass,
  errorClass: string,
  at: Date = new Date(),
): Promise<void> {
  await recordOpsEvent({
    severity: 'warn',
    kind: 'class_refresh_failed',
    errorClass,
    detail: { asset_class: assetClass },
  });

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

/**
 * Consumes `cost` units of the daily budget for the billed Plaid balance pull,
 * atomically. Returns false and consumes nothing when the budget is spent.
 *
 * `cost` is the number of CALLS the refresh will make, not the number of
 * refreshes. Plaid bills `/accounts/balance/get` per request
 * (plaid.com/docs/account/billing: "a flat fee is charged for each successful
 * API call to that product endpoint"), and fetchPlaidSnapshot calls it once
 * per Item. Counting refreshes therefore capped the wrong unit: a user with
 * five linked banks spent five times the money for the same "4 a day".
 *
 * WHY ONE STATEMENT. This was a read, a check, then a write. Two refreshes
 * arriving together both read the same count, both passed the check and both
 * wrote count+1, so the ceiling could be exceeded by however many requests
 * were in flight. The rate limiter bounded that to a leak rather than a flood,
 * but a budget that can be beaten by tapping twice is not a budget. The
 * conditional upsert below decides and consumes under one row lock.
 *
 * The `manual_refresh_count = 0` branch guarantees the FIRST refresh of a day
 * always runs. Without it a user with more linked banks than the daily budget
 * could never refresh at all, which would turn a cost control into an outage
 * for exactly the users who linked the most.
 */
export async function tryConsumeManualRefresh(
  userId: string,
  limit: number,
  today: string,
  cost = 1,
): Promise<boolean> {
  const result = await db().execute(sql`
    INSERT INTO asset_class_cache (user_id, asset_class, manual_refresh_date, manual_refresh_count)
    VALUES (${userId}, 'bank', ${today}, ${cost})
    ON CONFLICT (user_id, asset_class) DO UPDATE
      SET manual_refresh_date = ${today},
          manual_refresh_count = CASE
            WHEN asset_class_cache.manual_refresh_date IS DISTINCT FROM ${today} THEN ${cost}
            ELSE asset_class_cache.manual_refresh_count + ${cost}
          END
      WHERE asset_class_cache.manual_refresh_date IS DISTINCT FROM ${today}
         OR asset_class_cache.manual_refresh_count = 0
         OR asset_class_cache.manual_refresh_count + ${cost} <= ${limit}
    RETURNING manual_refresh_count
  `);

  // A row comes back only when the INSERT landed or the DO UPDATE's WHERE
  // passed. No row means the budget was already spent.
  //
  // The result shape is driver-level and differs between the PGlite adapter
  // used in tests and the Neon one used in production, so both spellings are
  // read, exactly as store/events.ts does for rowCount.
  // biome-ignore lint/suspicious/noExplicitAny: driver-level result shape varies by adapter
  const rows = (result as any).rows ?? result;
  return Array.isArray(rows) && rows.length > 0;
}
