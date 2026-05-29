import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/tcgapi/client.js', () => ({
  getTradingCardPrice: vi.fn(),
}));

import { getTradingCardPrice } from '../src/tcgapi/client.js';

const mockedGetTradingCardPrice = vi.mocked(getTradingCardPrice);

describe('GET /api/trading-cards', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/trading-cards', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/trading-cards' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns holding with null value before sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { tradingCardHoldings } = await import('../src/db/schema.js');
    await db().insert(tradingCardHoldings).values({
      userId: testUserId,
      game: 'pokemon',
      cardName: 'Charizard',
      quantity: 1,
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/trading-cards', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ cardName: string; valueUsd: number | null }[]>();
    expect(body[0]?.cardName).toBe('Charizard');
    expect(body[0]?.valueUsd).toBeNull();

    await app.close();
  });

  it('computes valueUsd as price × quantity', async () => {
    const { db } = await import('../src/db/client.js');
    const { tradingCardHoldings } = await import('../src/db/schema.js');
    await db().insert(tradingCardHoldings).values({
      userId: testUserId,
      game: 'pokemon',
      cardName: 'Charizard',
      quantity: 3,
      lastPriceUsd: '450.00',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/trading-cards', headers: authHeader() });
    expect(res.json<{ valueUsd: number }[]>()[0]?.valueUsd).toBeCloseTo(1350, 0);

    await app.close();
  });
});

describe('POST /api/trading-cards', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing game', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/trading-cards',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ cardName: 'Charizard' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for missing cardName', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/trading-cards',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ game: 'pokemon' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('creates holding, normalises game to lowercase, returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/trading-cards',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ game: 'Pokemon', cardName: 'Pikachu', setName: 'Base Set', isFoil: false, quantity: 2 }),
    });
    expect(res.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/trading-cards', headers: authHeader() });
    const body = list.json<{ game: string; quantity: number }[]>();
    expect(body[0]?.game).toBe('pokemon');
    expect(body[0]?.quantity).toBe(2);

    await app.close();
  });
});

describe('PATCH /api/trading-cards/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('updates quantity', async () => {
    const { db } = await import('../src/db/client.js');
    const { tradingCardHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(tradingCardHoldings)
      .values({ userId: testUserId, game: 'magic', cardName: 'Black Lotus', quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/trading-cards/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ quantity: 3 }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    await app.close();
  });

  it('returns 400 when no fields provided', async () => {
    const { db } = await import('../src/db/client.js');
    const { tradingCardHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(tradingCardHoldings)
      .values({ userId: testUserId, game: 'yugioh', cardName: 'Blue-Eyes White Dragon', quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/trading-cards/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('DELETE /api/trading-cards/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes holding and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { tradingCardHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(tradingCardHoldings)
      .values({ userId: testUserId, game: 'pokemon', cardName: 'Mewtwo', quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: `/api/trading-cards/${row!.id}`, headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/trading-cards', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when holding does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/trading-cards/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/trading-cards/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns updated: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/trading-cards/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 0 });

    await app.close();
  });

  it('updates prices and returns count', async () => {
    const { db } = await import('../src/db/client.js');
    const { tradingCardHoldings } = await import('../src/db/schema.js');
    await db().insert(tradingCardHoldings).values([
      { userId: testUserId, game: 'pokemon', cardName: 'Charizard', quantity: 2 },
      { userId: testUserId, game: 'magic', cardName: 'Black Lotus', quantity: 1 },
    ]);

    mockedGetTradingCardPrice.mockResolvedValueOnce(450).mockResolvedValueOnce(10000);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/trading-cards/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 2, errors: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/trading-cards', headers: authHeader() });
    const body = list.json<{ cardName: string; lastPriceUsd: number; valueUsd: number }[]>();
    const charizard = body.find((c) => c.cardName === 'Charizard');
    expect(charizard?.lastPriceUsd).toBeCloseTo(450, 0);
    expect(charizard?.valueUsd).toBeCloseTo(900, 0);

    await app.close();
  });

  it('counts errors for cards that fail to fetch', async () => {
    const { db } = await import('../src/db/client.js');
    const { tradingCardHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(tradingCardHoldings)
      .values([
        { userId: testUserId, game: 'pokemon', cardName: 'Rare Card', quantity: 1 },
        { userId: testUserId, game: 'pokemon', cardName: 'Common Card', quantity: 5 },
      ]);

    mockedGetTradingCardPrice.mockResolvedValueOnce(null).mockResolvedValueOnce(1.5);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/trading-cards/sync', headers: authHeader() });
    expect(res.json()).toEqual({ updated: 1, errors: 1 });

    await app.close();
  });
});

describe('GET /api/net-worth — tradingCards field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes tradingCards: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.json<{ tradingCards: number }>().tradingCards).toBe(0);

    await app.close();
  });

  it('sums price × quantity into tradingCards total', async () => {
    const { db } = await import('../src/db/client.js');
    const { tradingCardHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(tradingCardHoldings)
      .values([
        { userId: testUserId, game: 'pokemon', cardName: 'Charizard', quantity: 2, lastPriceUsd: '450.00' },
        { userId: testUserId, game: 'magic', cardName: 'Black Lotus', quantity: 1, lastPriceUsd: '10000.00' },
        { userId: testUserId, game: 'yugioh', cardName: 'Blue-Eyes', quantity: 3, lastPriceUsd: null },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.json<{ tradingCards: number }>().tradingCards).toBeCloseTo(900 + 10000, 0);

    await app.close();
  });
});
