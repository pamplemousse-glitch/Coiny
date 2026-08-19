import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

describe('plaid account balance cache', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('upserts and reads back balances scoped to the user', async () => {
    const { getPlaidAccountBalances, upsertPlaidAccountBalances } = await import('../src/store/asset-cache.js');
    await upsertPlaidAccountBalances(testUserId, 'item-1', [
      { accountId: 'a1', name: 'Checking', type: 'depository', subtype: 'checking', balance: 100.5 },
    ]);

    const rows = await getPlaidAccountBalances(testUserId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.accountId).toBe('a1');
    expect(parseFloat(rows[0]!.balance!)).toBeCloseTo(100.5);
    expect(rows[0]?.asOf).toBeInstanceOf(Date);
  });

  it('removes accounts the item no longer reports', async () => {
    const { getPlaidAccountBalances, upsertPlaidAccountBalances } = await import('../src/store/asset-cache.js');
    await upsertPlaidAccountBalances(testUserId, 'item-1', [
      { accountId: 'a1', name: 'Checking', type: 'depository', subtype: null, balance: 100 },
      { accountId: 'a2', name: 'Closed', type: 'depository', subtype: null, balance: 5 },
    ]);
    await upsertPlaidAccountBalances(testUserId, 'item-1', [
      { accountId: 'a1', name: 'Checking', type: 'depository', subtype: null, balance: 120 },
    ]);

    const rows = await getPlaidAccountBalances(testUserId);
    expect(rows.map((r) => r.accountId)).toEqual(['a1']);
    expect(parseFloat(rows[0]!.balance!)).toBe(120);
  });

  it("does not touch another item's accounts on upsert", async () => {
    const { getPlaidAccountBalances, upsertPlaidAccountBalances } = await import('../src/store/asset-cache.js');
    await upsertPlaidAccountBalances(testUserId, 'item-1', [
      { accountId: 'a1', name: 'Checking', type: 'depository', subtype: null, balance: 100 },
    ]);
    await upsertPlaidAccountBalances(testUserId, 'item-2', [
      { accountId: 'b1', name: 'Other Bank', type: 'depository', subtype: null, balance: 200 },
    ]);

    const rows = await getPlaidAccountBalances(testUserId);
    expect(rows.map((r) => r.accountId).sort()).toEqual(['a1', 'b1']);
  });
});

describe('asset class cache', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('records success with value, asOf, payload, and reset failure counters', async () => {
    const { getClassCacheRow, recordClassFailure, recordClassSuccess } = await import('../src/store/asset-cache.js');
    await recordClassFailure(testUserId, 'crypto', 'timeout');
    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 42.5, payload: { positions: [] } });

    const row = await getClassCacheRow(testUserId, 'crypto');
    expect(parseFloat(row!.valueUsd!)).toBeCloseTo(42.5);
    expect(row?.asOf).toBeInstanceOf(Date);
    expect(row?.lastErrorClass).toBeNull();
    expect(row?.consecutiveFailures).toBe(0);
  });

  it('keeps the last good value and asOf through a failure', async () => {
    const { getClassCacheRow, recordClassFailure, recordClassSuccess } = await import('../src/store/asset-cache.js');
    const asOf = new Date('2026-08-10T00:00:00Z');
    await recordClassSuccess(testUserId, 'defi', { valueUsd: 900, payload: null, asOf });
    await recordClassFailure(testUserId, 'defi', '5xx');
    await recordClassFailure(testUserId, 'defi', '5xx');

    const row = await getClassCacheRow(testUserId, 'defi');
    expect(parseFloat(row!.valueUsd!)).toBe(900);
    expect(row?.asOf?.toISOString()).toBe(asOf.toISOString());
    expect(row?.lastErrorClass).toBe('5xx');
    expect(row?.consecutiveFailures).toBe(2);
  });

  it('enforces the daily manual refresh budget', async () => {
    const { tryConsumeManualRefresh } = await import('../src/store/asset-cache.js');
    const today = '2026-08-13';

    expect(await tryConsumeManualRefresh(testUserId, 2, today)).toBe(true);
    expect(await tryConsumeManualRefresh(testUserId, 2, today)).toBe(true);
    expect(await tryConsumeManualRefresh(testUserId, 2, today)).toBe(false);
    // A new day resets the budget.
    expect(await tryConsumeManualRefresh(testUserId, 2, '2026-08-14')).toBe(true);
  });

  // Plaid bills /accounts/balance/get per request, and one refresh calls it
  // once per Item. A budget counting refreshes let a five-bank user spend five
  // times the money for the same nominal allowance.
  it('charges the budget per call, so a multi-item refresh costs more', async () => {
    const { tryConsumeManualRefresh } = await import('../src/store/asset-cache.js');
    const today = '2026-08-13';

    // Three items, budget of 4: the first refresh costs 3.
    expect(await tryConsumeManualRefresh(testUserId, 4, today, 3)).toBe(true);
    // A second would take it to 6, past the ceiling.
    expect(await tryConsumeManualRefresh(testUserId, 4, today, 3)).toBe(false);
    // A single-call refresh still fits in the remaining 1.
    expect(await tryConsumeManualRefresh(testUserId, 4, today, 1)).toBe(true);
  });

  // Otherwise a cost control becomes an outage for the users who linked most.
  it('always allows the first refresh of the day, even above the budget', async () => {
    const { tryConsumeManualRefresh } = await import('../src/store/asset-cache.js');
    const today = '2026-08-13';

    // Nine items against a budget of 4.
    expect(await tryConsumeManualRefresh(testUserId, 4, today, 9)).toBe(true);
    // But only the first: the allowance is now spent for the day.
    expect(await tryConsumeManualRefresh(testUserId, 4, today, 9)).toBe(false);
    expect(await tryConsumeManualRefresh(testUserId, 4, today, 1)).toBe(false);
  });

  // The defect that motivated the rewrite: read, check, write is not a budget.
  // Two refreshes arriving together both read the same count, both passed, and
  // both wrote count+1.
  it('does not overspend when refreshes arrive concurrently', async () => {
    const { tryConsumeManualRefresh, getClassCacheRow } = await import('../src/store/asset-cache.js');
    const today = '2026-08-13';
    const LIMIT = 4;

    const results = await Promise.all(
      Array.from({ length: 10 }, () => tryConsumeManualRefresh(testUserId, LIMIT, today, 1)),
    );

    // Exactly the budget, never more, however many raced.
    expect(results.filter(Boolean)).toHaveLength(LIMIT);
    const row = await getClassCacheRow(testUserId, 'bank');
    expect(row?.manualRefreshCount).toBe(LIMIT);
  });
});
