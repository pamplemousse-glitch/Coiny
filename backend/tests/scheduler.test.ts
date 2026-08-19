import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/coinbase/client.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getSpotPrices: vi.fn(),
}));
vi.mock('../src/zerion/client.js', () => ({
  getPortfolio: vi.fn(),
  getTransactions: vi.fn(),
}));
vi.mock('../src/spinwheel/client.js', () => ({
  sendSmsOtp: vi.fn(),
  verifySmsOtp: vi.fn(),
  getDebtProfile: vi.fn(),
  getCreditScore: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('../src/plaid/client.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/plaid/client.js')>();
  return {
    ...original,
    accountsBalanceGet: vi.fn(),
    investmentsHoldingsGet: vi.fn(),
    liabilitiesGet: vi.fn(),
    itemRemove: vi.fn(),
  };
});

import { getAccounts, getSpotPrices } from '../src/coinbase/client.js';
import { itemRemove } from '../src/plaid/client.js';
import { getDebtProfile } from '../src/spinwheel/client.js';
import { getPortfolio } from '../src/zerion/client.js';

const mockedItemRemove = vi.mocked(itemRemove);
const mockedGetAccounts = vi.mocked(getAccounts);
const mockedGetSpotPrices = vi.mocked(getSpotPrices);
const mockedGetPortfolio = vi.mocked(getPortfolio);
const mockedGetDebtProfile = vi.mocked(getDebtProfile);

const HOUR = 60 * 60 * 1000;

// Late in the UTC day, so the daily pass's per-user jitter window (3h after
// UTC midnight) has always elapsed and every user is deterministically due.
const NOW = (() => {
  const d = new Date();
  d.setUTCHours(23, 0, 0, 0);
  return d;
})();

describe('runSchedulerTick', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('refreshes a due class and records the new value', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    const { recordClassSuccess, getClassCacheRow } = await import('../src/store/asset-cache.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });
    // Stale well past the 6h interval plus any jitter.
    await recordClassSuccess(testUserId, 'crypto', {
      valueUsd: 1,
      payload: { positions: [] },
      asOf: new Date(NOW.getTime() - 10 * HOUR),
    });

    mockedGetAccounts.mockResolvedValue([
      { uuid: 'u1', currency: 'BTC', available_balance: { value: '2', currency: 'BTC' } },
    ]);
    mockedGetSpotPrices.mockResolvedValue(new Map([['BTC', 50000]]));

    const { runSchedulerTick } = await import('../src/scheduler/index.js');
    const summary = await runSchedulerTick(NOW);

    expect(summary.skipped).toBe(false);
    expect(summary.refreshed).toBeGreaterThanOrEqual(1);
    const row = await getClassCacheRow(testUserId, 'crypto');
    expect(parseFloat(row!.valueUsd!)).toBe(100000);
  });

  // The queue is drained by the tick and by nothing else, so if this wiring is
  // ever dropped the leak reopens silently: the row is written, the log line
  // reads "queued for retry", and no retry ever happens.
  it('drains the Plaid removal queue every tick', async () => {
    const { enqueueItemRemoval, countPendingRemovals } = await import('../src/store/plaid-removal-queue.js');
    await enqueueItemRemoval({ itemId: 'item_stuck', accessToken: 'access-sandbox-stuck' });
    mockedItemRemove.mockResolvedValue({ request_id: 'req_rm' });

    const { runSchedulerTick } = await import('../src/scheduler/index.js');
    // An hour on, so the row's first backoff has elapsed.
    const summary = await runSchedulerTick(new Date(NOW.getTime() + HOUR));

    expect(mockedItemRemove).toHaveBeenCalledWith('access-sandbox-stuck');
    expect(summary.removals).toMatchObject({ attempted: 1, removed: 1 });
    expect(await countPendingRemovals()).toBe(0);
  });

  it('does not refresh a class that is still fresh', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    const { recordClassSuccess } = await import('../src/store/asset-cache.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });
    await recordClassSuccess(testUserId, 'crypto', {
      valueUsd: 1,
      payload: { positions: [] },
      asOf: new Date(NOW.getTime() - 1 * HOUR),
    });

    const { runSchedulerTick } = await import('../src/scheduler/index.js');
    await runSchedulerTick(NOW);

    expect(mockedGetAccounts).not.toHaveBeenCalled();
  });

  it('isolates one vendor failure from the rest of the sweep', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections, zerionWallets } = await import('../src/db/schema.js');
    const { getClassCacheRow } = await import('../src/store/asset-cache.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xabc' });

    mockedGetAccounts.mockRejectedValue(new Error('coinbase down'));
    mockedGetPortfolio.mockResolvedValue({ total_usd: 777, change_1d_abs: null, change_1d_pct: null, breakdown: null });

    const { runSchedulerTick } = await import('../src/scheduler/index.js');
    const summary = await runSchedulerTick(NOW);

    expect(summary.failed).toBeGreaterThanOrEqual(1);
    const defi = await getClassCacheRow(testUserId, 'defi');
    expect(parseFloat(defi!.valueUsd!)).toBe(777);
    const crypto = await getClassCacheRow(testUserId, 'crypto');
    expect(crypto?.lastErrorClass).toBe('unknown');
    expect(crypto?.consecutiveFailures).toBe(1);
  });

  it('backs off a class after five consecutive failures', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    const { recordClassFailure } = await import('../src/store/asset-cache.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });
    for (let i = 0; i < 5; i++) {
      await recordClassFailure(testUserId, 'crypto', '5xx', new Date(NOW.getTime() - 30 * 60 * 1000));
    }

    const { runSchedulerTick } = await import('../src/scheduler/index.js');
    await runSchedulerTick(NOW);

    // 5 failures and the last attempt is inside the 6h interval: not retried.
    expect(mockedGetAccounts).not.toHaveBeenCalled();
  });

  it('skips a tick that starts while the previous one is in flight', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-tick-1' });

    let release: () => void = () => {};
    mockedGetDebtProfile.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve([]);
        }),
    );

    const { runSchedulerTick } = await import('../src/scheduler/index.js');
    const first = runSchedulerTick(NOW);
    // Give the first tick a beat to reach the hanging vendor call.
    await new Promise((r) => setTimeout(r, 20));
    const second = await runSchedulerTick(NOW);
    expect(second.skipped).toBe(true);

    release();
    const firstSummary = await first;
    expect(firstSummary.skipped).toBe(false);
  });

  it('writes the daily net worth point for users who never opened the app', async () => {
    const { runSchedulerTick } = await import('../src/scheduler/index.js');
    const { netWorthPointCount } = await import('../src/store/goals.js');

    expect(await netWorthPointCount(testUserId)).toBe(0);
    const summary = await runSchedulerTick(NOW);
    expect(summary.goalRefreshes).toBeGreaterThanOrEqual(1);
    expect(await netWorthPointCount(testUserId)).toBe(1);

    // Idempotent per day: a second tick does not duplicate the pass.
    const again = await runSchedulerTick(NOW);
    expect(again.goalRefreshes).toBe(0);
    expect(await netWorthPointCount(testUserId)).toBe(1);
  });
});

describe('scheduler lifecycle', () => {
  it('reports enabled only between start and stop', async () => {
    vi.resetAllMocks();
    await resetDatabase();
    const { getSchedulerStatus, isSchedulerStale, startScheduler, stopScheduler } = await import(
      '../src/scheduler/index.js'
    );

    expect(getSchedulerStatus().enabled).toBe(false);
    expect(isSchedulerStale()).toBe(false);

    const silent = { info: () => {}, warn: () => {} };
    startScheduler(silent);
    expect(getSchedulerStatus().enabled).toBe(true);
    expect(isSchedulerStale()).toBe(false);

    stopScheduler();
    expect(getSchedulerStatus().enabled).toBe(false);
  });
});
