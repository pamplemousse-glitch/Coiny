// How old the money behind Home's figures is (R-8.2).
//
// R-8.2 is "never an unlabelled stale value: every displayed value carries
// asOf". Wealth honoured it per class. Home did not: its rung detail line shows
// real money ("$7,440 of $12,000") and the screen carried no timestamp at all,
// and Home is the default tab. These tests cover the fact that feeds the label.

import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-02T12:00:00.000Z');

/** Both classes need a CONNECTION to count at all: without one the class reads
 *  `not_connected`, which is excluded and therefore ages nothing. Seeding them
 *  is what makes these tests about age rather than about connectivity. */
async function connectVendors() {
  const { db } = await import('../src/db/client.js');
  const { coinbaseConnections, zerionWallets } = await import('../src/db/schema.js');
  await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'oauth' });
  await db().insert(zerionWallets).values({ userId: testUserId, address: '0xabc' });
}

async function seedClass(cls: 'crypto' | 'defi', valueUsd: number | null, asOf: Date) {
  const { recordClassSuccess } = await import('../src/store/asset-cache.js');
  await recordClassSuccess(testUserId, cls, { valueUsd, payload: null, asOf });
}

async function assemble(now = NOW) {
  const { assembleNetWorth } = await import('../src/networth/read.js');
  return assembleNetWorth(testUserId, now);
}

describe('inputsAsOf', () => {
  beforeEach(async () => {
    await resetDatabase();
    await connectVendors();
  });

  it('is null when nothing has ever been fetched', async () => {
    const { inputsAsOf } = await assemble();

    // Null means UNKNOWN, and the client renders that differently from fresh.
    expect(inputsAsOf).toBeNull();
  });

  it('takes the OLDEST contributing class, so staleness is never understated', async () => {
    await seedClass('crypto', 5_000, new Date(NOW.getTime() - 1 * DAY));
    await seedClass('defi', 20_000, new Date(NOW.getTime() - 3 * DAY));

    const { inputsAsOf } = await assemble();

    // Same rule `rollupRows` applies one level down: one stale component makes
    // the whole figure stale, and taking the newest would let a recently
    // refreshed class hide an old one behind it.
    expect(inputsAsOf?.toISOString()).toBe(new Date(NOW.getTime() - 3 * DAY).toISOString());
  });

  it('is null when a contributing class has no timestamp of its own', async () => {
    await seedClass('crypto', 5_000, new Date(NOW.getTime() - 1 * DAY));
    const { db } = await import('../src/db/client.js');
    const { assetClassCache } = await import('../src/db/schema.js');
    await db().update(assetClassCache).set({ asOf: null });

    const { inputsAsOf } = await assemble();

    // Unknown beats optimistic. Reporting the other class's timestamp would
    // label the figure with an age that is not the figure's age.
    expect(inputsAsOf).toBeNull();
  });

  it('is not aged by a class that is excluded from the total', async () => {
    await seedClass('crypto', 5_000, new Date(NOW.getTime() - 1 * DAY));
    const { recordClassFailure } = await import('../src/store/asset-cache.js');
    // Connected and failing with no value ever: status `error`, excluded.
    await recordClassFailure(testUserId, 'defi', 'timeout');

    const { inputsAsOf } = await assemble();

    // An excluded class is already reported separately, in `excluded`. Letting
    // it drag the age down would double-count one problem and make a healthy
    // figure look stale.
    expect(inputsAsOf?.toISOString()).toBe(new Date(NOW.getTime() - 1 * DAY).toISOString());
  });

  it('reaches GET /api/pets as dataAsOf once the goal pipeline has run', async () => {
    await seedClass('crypto', 5_000, new Date(NOW.getTime() - 2 * DAY));
    const { runGoalRefreshFromCache } = await import('../src/networth/refresh.js');
    await runGoalRefreshFromCache(testUserId, NOW);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().dataAsOf).toBe(new Date(NOW.getTime() - 2 * DAY).toISOString());
  });

  it('reports dataAsOf null rather than absent before any refresh', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    await app.close();

    // Present-and-null is a fact the client can act on ("age unknown").
    // Absent would decode to the same thing but says nothing about whether the
    // server was ever asked.
    expect(res.json()).toHaveProperty('dataAsOf', null);
  });

  it('records the age of the money, not the age of the recomputation', async () => {
    // Three days, not ten: past seven the class is `stale_excluded` and leaves
    // the total, so it correctly ages nothing. Stale-but-included is the case
    // where the two timestamps disagree and Home was showing the wrong one.
    await seedClass('crypto', 5_000, new Date(NOW.getTime() - 3 * DAY));
    const { runGoalRefreshFromCache } = await import('../src/networth/refresh.js');
    await runGoalRefreshFromCache(testUserId, NOW);

    const { db } = await import('../src/db/client.js');
    const { ladderState } = await import('../src/db/schema.js');
    const [row] = await db().select().from(ladderState);

    // The whole point of a separate column. `updatedAt` says we recomputed just
    // now; the money is three days old, and Home showed the second as if it
    // were the first.
    expect(row?.updatedAt?.toISOString()).toBe(NOW.toISOString());
    expect(row?.inputsAsOf?.toISOString()).toBe(new Date(NOW.getTime() - 3 * DAY).toISOString());
  });
});
