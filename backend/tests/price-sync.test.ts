import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

// The vendor clients are mocked because this file is about the SCHEDULING
// decision (who is due, what happens when a class is unconfigured, does one
// user's failure stop the sweep), not about any vendor's wire format. The
// per-class sync bodies keep their own coverage in their own test files.
vi.mock('../src/metals/client.js', () => ({ getMetalSpotPrice: vi.fn() }));
vi.mock('../src/eia/client.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/eia/client.js')>();
  return { ...original, getAllEiaSpotPrices: vi.fn() };
});

import { getAllEiaSpotPrices } from '../src/eia/client.js';
import { getMetalSpotPrice } from '../src/metals/client.js';

const mockedSpot = vi.mocked(getMetalSpotPrice);
const mockedEia = vi.mocked(getAllEiaSpotPrices);

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-15T12:00:00.000Z');

async function addMetal(lastSyncedAt: Date | null) {
  const { db } = await import('../src/db/client.js');
  const { metalHoldings } = await import('../src/db/schema.js');
  await db().insert(metalHoldings).values({ userId: testUserId, metal: 'XAU', weightOz: '2', lastSyncedAt });
}

describe('price sync registry', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedEia.mockResolvedValue(new Map());
    await resetDatabase();
  });

  it('lists every price class with a positive interval', async () => {
    const { PRICE_SYNC_TASKS } = await import('../src/sync/price-classes.js');

    expect(PRICE_SYNC_TASKS.length).toBeGreaterThan(0);
    for (const task of PRICE_SYNC_TASKS) {
      expect(task.intervalMs).toBeGreaterThan(0);
    }
  });

  // The whole point of the change: a holding that has never been priced is the
  // most stale a value can be, and before this it waited for the user to pull
  // to refresh.
  it('treats a never-synced holding as due', async () => {
    await addMetal(null);
    const { PRICE_SYNC_TASKS, usersDueForPriceSync } = await import('../src/sync/price-classes.js');
    const metals = PRICE_SYNC_TASKS.find((t) => t.key === 'metals')!;

    const due = await usersDueForPriceSync(metals, NOW);

    expect(due).toContain(testUserId);
  });

  it('treats a holding older than the interval as due', async () => {
    await addMetal(new Date(NOW.getTime() - 3 * DAY));
    const { PRICE_SYNC_TASKS, usersDueForPriceSync } = await import('../src/sync/price-classes.js');
    const metals = PRICE_SYNC_TASKS.find((t) => t.key === 'metals')!;

    const due = await usersDueForPriceSync(metals, NOW);

    expect(due).toContain(testUserId);
  });

  it('leaves a freshly synced holding alone', async () => {
    await addMetal(new Date(NOW.getTime() - 60 * 1000));
    const { PRICE_SYNC_TASKS, usersDueForPriceSync } = await import('../src/sync/price-classes.js');
    const metals = PRICE_SYNC_TASKS.find((t) => t.key === 'metals')!;

    const due = await usersDueForPriceSync(metals, NOW);

    expect(due).not.toContain(testUserId);
  });

  // Oldest, not newest: one stale parcel in a portfolio of ten still makes the
  // total stale, and taking the newest would let a recently added holding hide
  // the old ones behind it.
  it('is due when the OLDEST holding is stale even if another is fresh', async () => {
    await addMetal(new Date(NOW.getTime() - 5 * DAY));
    await addMetal(new Date(NOW.getTime() - 60 * 1000));
    const { PRICE_SYNC_TASKS, usersDueForPriceSync } = await import('../src/sync/price-classes.js');
    const metals = PRICE_SYNC_TASKS.find((t) => t.key === 'metals')!;

    const due = await usersDueForPriceSync(metals, NOW);

    expect(due).toContain(testUserId);
  });

  it('refreshes a due holding and counts it', async () => {
    await addMetal(new Date(NOW.getTime() - 3 * DAY));
    mockedSpot.mockResolvedValue({ priceUsd: 2400, asOf: null });
    const { runPriceSync } = await import('../src/sync/price-classes.js');

    const summary = await runPriceSync(NOW);

    expect(summary.refreshed).toBeGreaterThanOrEqual(1);
    expect(summary.failed).toBe(0);
  });

  it('writes the new value back', async () => {
    await addMetal(new Date(NOW.getTime() - 3 * DAY));
    mockedSpot.mockResolvedValue({ priceUsd: 2400, asOf: null });
    const { runPriceSync } = await import('../src/sync/price-classes.js');

    await runPriceSync(NOW);

    const { db } = await import('../src/db/client.js');
    const { metalHoldings } = await import('../src/db/schema.js');
    const [row] = await db().select().from(metalHoldings);
    // 2 oz at 2400.
    expect(parseFloat(row!.lastValueUsd!)).toBe(4800);
  });

  // A missing key fails identically for every remaining user, so discovering it
  // once must be enough. Counting it as an attempt would also make the tick log
  // claim work it did not do.
  it('skips the rest of a class whose vendor key is not configured', async () => {
    await addMetal(new Date(NOW.getTime() - 3 * DAY));
    mockedSpot.mockRejectedValue(new Error('GOLDAPI_API_KEY not configured'));
    const { runPriceSync } = await import('../src/sync/price-classes.js');

    const summary = await runPriceSync(NOW);

    expect(summary.unconfigured).toContain('metals');
    expect(summary.refreshed).toBe(0);
    expect(summary.attempted).toBe(0);
  });

  // One user's vendor failure must never freeze everybody else's prices.
  it('counts a thrown failure and keeps going', async () => {
    await addMetal(new Date(NOW.getTime() - 3 * DAY));
    mockedSpot.mockRejectedValue(new Error('upstream exploded'));
    const { runPriceSync } = await import('../src/sync/price-classes.js');

    const summary = await runPriceSync(NOW);

    // The metals body swallows a non-key vendor error into its own error
    // count rather than throwing, so this run completes rather than failing.
    expect(summary.unconfigured).not.toContain('metals');
    expect(summary.attempted).toBe(1);
  });

  it('does nothing when no holdings exist at all', async () => {
    const { runPriceSync } = await import('../src/sync/price-classes.js');

    const summary = await runPriceSync(NOW);

    expect(summary).toEqual({ attempted: 0, refreshed: 0, failed: 0, unconfigured: [] });
  });
});
