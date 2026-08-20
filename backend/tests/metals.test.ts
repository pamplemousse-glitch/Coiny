import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/metals/client.js', () => ({
  getMetalSpotPrice: vi.fn(),
}));

import { getMetalSpotPrice } from '../src/metals/client.js';

const mockedGetMetalSpotPrice = vi.mocked(getMetalSpotPrice);

describe('GET /api/metals', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no holdings registered', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/metals', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/metals' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns holdings with null value before first sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { metalHoldings } = await import('../src/db/schema.js');
    await db().insert(metalHoldings).values({ userId: testUserId, metal: 'XAU', weightOz: '5.5' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/metals', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ metal: string; weightOz: number; lastValueUsd: number | null }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.metal).toBe('XAU');
    expect(body[0]?.weightOz).toBeCloseTo(5.5, 1);
    expect(body[0]?.lastValueUsd).toBeNull();

    await app.close();
  });
});

describe('POST /api/metals', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing metal', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/metals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ weightOz: 2 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for invalid metal symbol', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/metals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ metal: 'GOLD', weightOz: 1 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for missing weightOz', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/metals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ metal: 'XAU' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('creates holding and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/metals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ metal: 'XAG', weightOz: 100, label: 'Silver bars' }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true, metal: 'XAG', weightOz: 100 });

    const list = await app.inject({ method: 'GET', url: '/api/metals', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });

  it('accepts all valid metal symbols', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const metals = ['XAU', 'XAG', 'XPT', 'XPD'];
    for (const metal of metals) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/metals',
        headers: { ...authHeader(), 'content-type': 'application/json' },
        body: JSON.stringify({ metal, weightOz: 1 }),
      });
      expect(res.statusCode).toBe(201);
    }

    const list = await app.inject({ method: 'GET', url: '/api/metals', headers: authHeader() });
    expect(list.json()).toHaveLength(metals.length);

    await app.close();
  });
});

describe('DELETE /api/metals/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes holding and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { metalHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(metalHoldings)
      .values({ userId: testUserId, metal: 'XPT', weightOz: '3' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/metals/${row!.id}`,
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/metals', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when holding does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/metals/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/metals/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns synced: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/metals/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 0, errors: 0 });

    await app.close();
  });

  it('computes price × weight and updates lastValueUsd', async () => {
    const { db } = await import('../src/db/client.js');
    const { metalHoldings } = await import('../src/db/schema.js');
    await db().insert(metalHoldings).values({ userId: testUserId, metal: 'XAU', weightOz: '2.5' });

    mockedGetMetalSpotPrice.mockResolvedValue({ priceUsd: 2000, asOf: null });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/metals/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 1, errors: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/metals', headers: authHeader() });
    const holding = list.json<{ lastValueUsd: number }[]>()[0];
    expect(holding?.lastValueUsd).toBeCloseTo(5000, 0);

    await app.close();
  });

  it('fetches spot price once for multiple holdings of the same metal', async () => {
    const { db } = await import('../src/db/client.js');
    const { metalHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(metalHoldings)
      .values([
        { userId: testUserId, metal: 'XAG', weightOz: '50' },
        { userId: testUserId, metal: 'XAG', weightOz: '25' },
      ]);

    mockedGetMetalSpotPrice.mockResolvedValue({ priceUsd: 30, asOf: null });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/metals/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 2, errors: 0 });
    expect(mockedGetMetalSpotPrice).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('returns 402 when API key is missing', async () => {
    const { db } = await import('../src/db/client.js');
    const { metalHoldings } = await import('../src/db/schema.js');
    await db().insert(metalHoldings).values({ userId: testUserId, metal: 'XAU', weightOz: '1' });

    mockedGetMetalSpotPrice.mockRejectedValue(new Error('GOLDAPI_API_KEY not configured'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/metals/sync', headers: authHeader() });
    expect(res.statusCode).toBe(402);
    expect(res.json()).toMatchObject({ error: 'GOLDAPI_API_KEY not configured' });

    await app.close();
  });

  it('counts errors for metals that fail to fetch', async () => {
    const { db } = await import('../src/db/client.js');
    const { metalHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(metalHoldings)
      .values([
        { userId: testUserId, metal: 'XPD', weightOz: '1' },
        { userId: testUserId, metal: 'XPT', weightOz: '2' },
      ]);

    mockedGetMetalSpotPrice
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValueOnce({ priceUsd: 1000, asOf: null });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/metals/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 1, errors: 1 });

    await app.close();
  });
});

describe('GET /api/net-worth — metals field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes metals: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ metals: number }>().metals).toBe(0);

    await app.close();
  });

  it('sums lastValueUsd from metal holdings into metals total', async () => {
    const { db } = await import('../src/db/client.js');
    const { metalHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(metalHoldings)
      .values([
        { userId: testUserId, metal: 'XAU', weightOz: '2', lastValueUsd: '5000.00' },
        { userId: testUserId, metal: 'XAG', weightOz: '100', lastValueUsd: '3000.75' },
        { userId: testUserId, metal: 'XPT', weightOz: '1', lastValueUsd: null },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ metals: number }>();
    expect(body.metals).toBeCloseTo(8000.75, 1);

    await app.close();
  });
});
