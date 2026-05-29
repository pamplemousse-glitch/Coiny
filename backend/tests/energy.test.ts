import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/eia/client.js', () => ({
  getAllEiaSpotPrices: vi.fn(),
  EIA_COMMODITIES: {
    wti_crude: { unit: 'barrel', displayName: 'WTI Crude Oil' },
    brent_crude: { unit: 'barrel', displayName: 'Brent Crude Oil' },
    natural_gas: { unit: 'mmbtu', displayName: 'Natural Gas (Henry Hub)' },
  },
}));

import { getAllEiaSpotPrices } from '../src/eia/client.js';

const mockedGetAllEiaSpotPrices = vi.mocked(getAllEiaSpotPrices);

describe('GET /api/energy', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no positions', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/energy', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/energy' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns position with null value before first sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { energyPositions } = await import('../src/db/schema.js');
    await db()
      .insert(energyPositions)
      .values({ userId: testUserId, commodity: 'wti_crude', quantityUnit: 'barrel', quantity: '100' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/energy', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ commodity: string; quantity: number; valueUsd: number | null }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.commodity).toBe('wti_crude');
    expect(body[0]?.quantity).toBeCloseTo(100, 1);
    expect(body[0]?.valueUsd).toBeNull();

    await app.close();
  });

  it('computes valueUsd from spot price when synced', async () => {
    const { db } = await import('../src/db/client.js');
    const { energyPositions } = await import('../src/db/schema.js');
    await db().insert(energyPositions).values({
      userId: testUserId,
      commodity: 'wti_crude',
      quantityUnit: 'barrel',
      quantity: '10',
      lastSpotPriceUsd: '75.50',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/energy', headers: authHeader() });
    const body = res.json<{ valueUsd: number }[]>();
    expect(body[0]?.valueUsd).toBeCloseTo(755, 0);

    await app.close();
  });
});

describe('POST /api/energy', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for invalid commodity', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/energy',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ commodity: 'coal', quantity: 10 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for missing quantity', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/energy',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ commodity: 'wti_crude' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('creates position and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/energy',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ commodity: 'natural_gas', quantity: 500, label: 'Henry Hub futures' }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true });

    const list = await app.inject({ method: 'GET', url: '/api/energy', headers: authHeader() });
    const body = list.json<{ commodity: string; quantityUnit: string }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.commodity).toBe('natural_gas');
    expect(body[0]?.quantityUnit).toBe('mmbtu');

    await app.close();
  });

  it('accepts all three commodity types', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    for (const commodity of ['wti_crude', 'brent_crude', 'natural_gas']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/energy',
        headers: { ...authHeader(), 'content-type': 'application/json' },
        body: JSON.stringify({ commodity, quantity: 1 }),
      });
      expect(res.statusCode).toBe(201);
    }

    const list = await app.inject({ method: 'GET', url: '/api/energy', headers: authHeader() });
    expect(list.json()).toHaveLength(3);

    await app.close();
  });
});

describe('PATCH /api/energy/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('updates quantity', async () => {
    const { db } = await import('../src/db/client.js');
    const { energyPositions } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(energyPositions)
      .values({ userId: testUserId, commodity: 'wti_crude', quantityUnit: 'barrel', quantity: '50' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/energy/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ quantity: 75 }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    await app.close();
  });

  it('returns 400 when no fields provided', async () => {
    const { db } = await import('../src/db/client.js');
    const { energyPositions } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(energyPositions)
      .values({ userId: testUserId, commodity: 'brent_crude', quantityUnit: 'barrel', quantity: '10' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/energy/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('DELETE /api/energy/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes position and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { energyPositions } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(energyPositions)
      .values({ userId: testUserId, commodity: 'wti_crude', quantityUnit: 'barrel', quantity: '100' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: `/api/energy/${row!.id}`, headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/energy', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when position does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/energy/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/energy/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns updated: 0 when no positions', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/energy/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 0 });

    await app.close();
  });

  it('returns note when EIA key not configured', async () => {
    const { db } = await import('../src/db/client.js');
    const { energyPositions } = await import('../src/db/schema.js');
    await db().insert(energyPositions).values({
      userId: testUserId,
      commodity: 'wti_crude',
      quantityUnit: 'barrel',
      quantity: '10',
    });

    mockedGetAllEiaSpotPrices.mockResolvedValue(new Map());

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/energy/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ updated: number; note?: string }>();
    expect(body.updated).toBe(0);

    await app.close();
  });

  it('updates spot prices and returns count', async () => {
    const { db } = await import('../src/db/client.js');
    const { energyPositions } = await import('../src/db/schema.js');
    await db().insert(energyPositions).values([
      { userId: testUserId, commodity: 'wti_crude', quantityUnit: 'barrel', quantity: '50' },
      { userId: testUserId, commodity: 'natural_gas', quantityUnit: 'mmbtu', quantity: '1000' },
    ]);

    mockedGetAllEiaSpotPrices.mockResolvedValue(
      new Map([
        ['wti_crude', 75.5],
        ['natural_gas', 2.8],
      ]),
    );

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/energy/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 2 });

    const list = await app.inject({ method: 'GET', url: '/api/energy', headers: authHeader() });
    const body = list.json<{ commodity: string; lastSpotPriceUsd: number; valueUsd: number }[]>();
    const wti = body.find((p) => p.commodity === 'wti_crude');
    expect(wti?.lastSpotPriceUsd).toBeCloseTo(75.5, 1);
    expect(wti?.valueUsd).toBeCloseTo(3775, 0);

    await app.close();
  });
});

describe('GET /api/net-worth — energy field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes energy: 0 when no positions', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ energy: number }>().energy).toBe(0);

    await app.close();
  });

  it('sums quantity × lastSpotPriceUsd into energy total', async () => {
    const { db } = await import('../src/db/client.js');
    const { energyPositions } = await import('../src/db/schema.js');
    await db().insert(energyPositions).values([
      { userId: testUserId, commodity: 'wti_crude', quantityUnit: 'barrel', quantity: '100', lastSpotPriceUsd: '75.00' },
      { userId: testUserId, commodity: 'natural_gas', quantityUnit: 'mmbtu', quantity: '500', lastSpotPriceUsd: '3.00' },
      { userId: testUserId, commodity: 'brent_crude', quantityUnit: 'barrel', quantity: '50', lastSpotPriceUsd: null },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    const body = res.json<{ energy: number }>();
    expect(body.energy).toBeCloseTo(7500 + 1500, 0);

    await app.close();
  });
});
