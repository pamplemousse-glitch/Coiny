import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/kicksdb/client.js', () => ({
  getSneakerPrice: vi.fn(),
}));

import { getSneakerPrice } from '../src/kicksdb/client.js';

const mockedGetSneakerPrice = vi.mocked(getSneakerPrice);

describe('GET /api/sneakers', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/sneakers', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/sneakers' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns holdings with null price before first sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { sneakerHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(sneakerHoldings)
      .values({ userId: testUserId, sku: 'DZ5485-612', description: 'Jordan 1 Chicago', size: '10.5', quantity: 1 });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/sneakers', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ sku: string; size: string | null; lastPriceUsd: number | null }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.sku).toBe('DZ5485-612');
    expect(body[0]?.size).toBe('10.5');
    expect(body[0]?.lastPriceUsd).toBeNull();

    await app.close();
  });
});

describe('POST /api/sneakers', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('creates a holding and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/sneakers',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({
        sku: 'DZ5485-612',
        description: 'Jordan 1 High OG Chicago Lost & Found',
        size: '10',
        quantity: 1,
      }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true, sku: 'DZ5485-612', quantity: 1 });

    const list = await app.inject({ method: 'GET', url: '/api/sneakers', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });

  it('creates a holding without optional fields', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/sneakers',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ sku: 'FD4449-105' }),
    });
    expect(res.statusCode).toBe(201);

    await app.close();
  });

  it('returns 400 for missing sku', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/sneakers',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ description: 'no sku' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/sneakers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sku: 'DZ5485-612' }),
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('DELETE /api/sneakers/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes holding and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { sneakerHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(sneakerHoldings)
      .values({ userId: testUserId, sku: 'FD4449-105', quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: `/api/sneakers/${row!.id}`, headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/sneakers', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when id does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/sneakers/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/sneakers/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns synced: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/sneakers/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 0, errors: 0 });

    await app.close();
  });

  it('fetches price and updates lastPriceUsd', async () => {
    const { db } = await import('../src/db/client.js');
    const { sneakerHoldings } = await import('../src/db/schema.js');
    await db().insert(sneakerHoldings).values({ userId: testUserId, sku: 'DZ5485-612', size: '10', quantity: 2 });

    mockedGetSneakerPrice.mockResolvedValue(450);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/sneakers/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 1, errors: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/sneakers', headers: authHeader() });
    const holding = list.json<{ lastPriceUsd: number }[]>()[0];
    expect(holding?.lastPriceUsd).toBeCloseTo(450, 0);

    expect(mockedGetSneakerPrice).toHaveBeenCalledWith('DZ5485-612', '10');

    await app.close();
  });

  it('passes undefined size when no size stored', async () => {
    const { db } = await import('../src/db/client.js');
    const { sneakerHoldings } = await import('../src/db/schema.js');
    await db().insert(sneakerHoldings).values({ userId: testUserId, sku: 'FD4449-105', quantity: 1 });

    mockedGetSneakerPrice.mockResolvedValue(200);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/sneakers/sync', headers: authHeader() });
    expect(mockedGetSneakerPrice).toHaveBeenCalledWith('FD4449-105', undefined);

    await app.close();
  });

  it('counts errors when price lookup returns null', async () => {
    const { db } = await import('../src/db/client.js');
    const { sneakerHoldings } = await import('../src/db/schema.js');
    await db().insert(sneakerHoldings).values({ userId: testUserId, sku: 'UNKNOWN-SKU', quantity: 1 });

    mockedGetSneakerPrice.mockResolvedValue(null);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/sneakers/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 0, errors: 1 });

    await app.close();
  });
});

describe('GET /api/net-worth — sneakers field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes sneakers: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ sneakers: number }>().sneakers).toBe(0);

    await app.close();
  });

  it('sums lastPriceUsd × quantity into sneakers total', async () => {
    const { db } = await import('../src/db/client.js');
    const { sneakerHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(sneakerHoldings)
      .values([
        { userId: testUserId, sku: 'DZ5485-612', quantity: 2, lastPriceUsd: '450.00' },
        { userId: testUserId, sku: 'FD4449-105', quantity: 1, lastPriceUsd: '180.00' },
        { userId: testUserId, sku: 'UNKNOWN', quantity: 3, lastPriceUsd: null },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ sneakers: number }>().sneakers).toBeCloseTo(1080, 0); // 450*2 + 180*1
    await app.close();
  });
});
