import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/pcgs/client.js', () => ({
  getPcgsCoinFacts: vi.fn(),
}));

import { getPcgsCoinFacts } from '../src/pcgs/client.js';

const mockedGetPcgsCoinFacts = vi.mocked(getPcgsCoinFacts);

describe('GET /api/coins', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coins', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coins' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns holding with null value before sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinHoldings } = await import('../src/db/schema.js');
    await db().insert(coinHoldings).values({ userId: testUserId, pcgsNo: 7112, gradeNo: 65, quantity: 1 });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coins', headers: authHeader() });
    const body = res.json<{ pcgsNo: number; valueUsd: number | null }[]>();
    expect(body[0]?.pcgsNo).toBe(7112);
    expect(body[0]?.valueUsd).toBeNull();

    await app.close();
  });

  it('computes valueUsd as priceGuide × quantity', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinHoldings } = await import('../src/db/schema.js');
    await db().insert(coinHoldings).values({
      userId: testUserId,
      pcgsNo: 7112,
      gradeNo: 65,
      quantity: 3,
      lastPriceGuideUsd: '250.00',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coins', headers: authHeader() });
    expect(res.json<{ valueUsd: number }[]>()[0]?.valueUsd).toBeCloseTo(750, 0);

    await app.close();
  });
});

describe('POST /api/coins', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing pcgsNo', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/coins',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ gradeNo: 65 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for grade out of range', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/coins',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ pcgsNo: 7112, gradeNo: 71 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('creates holding and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/coins',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ pcgsNo: 7112, gradeNo: 65, plusGrade: false, quantity: 2, label: 'Morgan dollars' }),
    });
    expect(res.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/coins', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });
});

describe('PATCH /api/coins/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('updates quantity and returns ok', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(coinHoldings)
      .values({ userId: testUserId, pcgsNo: 7112, gradeNo: 65, quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/coins/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ quantity: 5 }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    await app.close();
  });

  it('returns 400 when no fields provided', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(coinHoldings)
      .values({ userId: testUserId, pcgsNo: 98836, gradeNo: 66, quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/coins/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('DELETE /api/coins/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes holding and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(coinHoldings)
      .values({ userId: testUserId, pcgsNo: 7112, gradeNo: 65, quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: `/api/coins/${row!.id}`, headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/coins', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when holding does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/coins/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/coins/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns updated: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coins/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 0 });

    await app.close();
  });

  it('updates price guide and populates coin name', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinHoldings } = await import('../src/db/schema.js');
    await db().insert(coinHoldings).values({ userId: testUserId, pcgsNo: 98836, gradeNo: 66, quantity: 2 });

    mockedGetPcgsCoinFacts.mockResolvedValue({ name: '1881-S Morgan Dollar', priceGuideUsd: 250 });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coins/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 1, errors: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/coins', headers: authHeader() });
    const body = list.json<{ coinName: string; lastPriceGuideUsd: number; valueUsd: number }[]>();
    expect(body[0]?.coinName).toBe('1881-S Morgan Dollar');
    expect(body[0]?.lastPriceGuideUsd).toBeCloseTo(250, 0);
    expect(body[0]?.valueUsd).toBeCloseTo(500, 0);

    await app.close();
  });

  it('counts errors when facts unavailable', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinHoldings } = await import('../src/db/schema.js');
    await db().insert(coinHoldings).values([
      { userId: testUserId, pcgsNo: 98836, gradeNo: 66, quantity: 1 },
      { userId: testUserId, pcgsNo: 7112, gradeNo: 65, quantity: 1 },
    ]);

    mockedGetPcgsCoinFacts
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ name: 'Morgan Dollar', priceGuideUsd: 200 });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coins/sync', headers: authHeader() });
    expect(res.json()).toEqual({ updated: 1, errors: 1 });

    await app.close();
  });

  it('counts error when priceGuideUsd is null', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinHoldings } = await import('../src/db/schema.js');
    await db().insert(coinHoldings).values({ userId: testUserId, pcgsNo: 99999, gradeNo: 70, quantity: 1 });

    mockedGetPcgsCoinFacts.mockResolvedValue({ name: 'Rare Coin', priceGuideUsd: null });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coins/sync', headers: authHeader() });
    expect(res.json()).toEqual({ updated: 0, errors: 1 });

    await app.close();
  });
});

describe('GET /api/net-worth — coins field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes coins: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.json<{ coins: number }>().coins).toBe(0);

    await app.close();
  });

  it('sums priceGuide × quantity into coins total', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinHoldings } = await import('../src/db/schema.js');
    await db().insert(coinHoldings).values([
      { userId: testUserId, pcgsNo: 98836, gradeNo: 66, quantity: 2, lastPriceGuideUsd: '250.00' },
      { userId: testUserId, pcgsNo: 7112, gradeNo: 65, quantity: 1, lastPriceGuideUsd: '180.00' },
      { userId: testUserId, pcgsNo: 12345, gradeNo: 60, quantity: 3, lastPriceGuideUsd: null },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.json<{ coins: number }>().coins).toBeCloseTo(500 + 180, 0);

    await app.close();
  });
});
