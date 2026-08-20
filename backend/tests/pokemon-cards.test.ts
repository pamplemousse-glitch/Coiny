import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/pokemonpricetracker/client.js', () => ({
  getPokemonCard: vi.fn(),
}));

import { getPokemonCard } from '../src/pokemonpricetracker/client.js';

const mockedGetPrice = vi.mocked(getPokemonCard);

describe('GET /api/pokemon-cards', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/pokemon-cards', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/pokemon-cards' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns holding with null value before sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { pokemonCardHoldings } = await import('../src/db/schema.js');
    await db().insert(pokemonCardHoldings).values({
      userId: testUserId,
      cardName: 'Charizard',
      setName: 'Base Set',
      quantity: 1,
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/pokemon-cards', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ cardName: string; valueUsd: number | null }[]>();
    expect(body[0]?.cardName).toBe('Charizard');
    expect(body[0]?.valueUsd).toBeNull();

    await app.close();
  });

  it('computes valueUsd as price × quantity', async () => {
    const { db } = await import('../src/db/client.js');
    const { pokemonCardHoldings } = await import('../src/db/schema.js');
    await db().insert(pokemonCardHoldings).values({
      userId: testUserId,
      cardName: 'Charizard',
      quantity: 3,
      lastPriceUsd: '450.00',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/pokemon-cards', headers: authHeader() });
    expect(res.json<{ valueUsd: number }[]>()[0]?.valueUsd).toBeCloseTo(1350, 0);

    await app.close();
  });
});

describe('POST /api/pokemon-cards', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing cardName', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/pokemon-cards',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ setName: 'Base Set' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('creates holding and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/pokemon-cards',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ cardName: 'Pikachu', setName: 'Base Set', variant: 'Holofoil', quantity: 2 }),
    });
    expect(res.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/pokemon-cards', headers: authHeader() });
    const body = list.json<{ cardName: string; quantity: number; variant: string }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.cardName).toBe('Pikachu');
    expect(body[0]?.quantity).toBe(2);
    expect(body[0]?.variant).toBe('Holofoil');

    await app.close();
  });
});

describe('PATCH /api/pokemon-cards/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('updates quantity and returns ok', async () => {
    const { db } = await import('../src/db/client.js');
    const { pokemonCardHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(pokemonCardHoldings)
      .values({ userId: testUserId, cardName: 'Mewtwo', quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/pokemon-cards/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ quantity: 5 }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    await app.close();
  });

  it('returns 400 when no fields provided', async () => {
    const { db } = await import('../src/db/client.js');
    const { pokemonCardHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(pokemonCardHoldings)
      .values({ userId: testUserId, cardName: 'Eevee', quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/pokemon-cards/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('DELETE /api/pokemon-cards/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes holding and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { pokemonCardHoldings } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(pokemonCardHoldings)
      .values({ userId: testUserId, cardName: 'Bulbasaur', quantity: 1 })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: `/api/pokemon-cards/${row!.id}`, headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/pokemon-cards', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when holding does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/pokemon-cards/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/pokemon-cards/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns updated: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/pokemon-cards/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 0 });

    await app.close();
  });

  it('updates prices and returns count', async () => {
    const { db } = await import('../src/db/client.js');
    const { pokemonCardHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(pokemonCardHoldings)
      .values([
        { userId: testUserId, cardName: 'Charizard', setName: 'Base Set', quantity: 2 },
        { userId: testUserId, cardName: 'Pikachu', quantity: 1 },
      ]);

    mockedGetPrice
      .mockResolvedValueOnce({ priceUsd: 450, imageUrl: null })
      .mockResolvedValueOnce({ priceUsd: 25, imageUrl: null });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/pokemon-cards/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 2, errors: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/pokemon-cards', headers: authHeader() });
    const body = list.json<{ cardName: string; lastPriceUsd: number; valueUsd: number }[]>();
    const charizard = body.find((c) => c.cardName === 'Charizard');
    expect(charizard?.lastPriceUsd).toBeCloseTo(450, 0);
    expect(charizard?.valueUsd).toBeCloseTo(900, 0);

    await app.close();
  });

  it('counts errors for cards that fail to fetch', async () => {
    const { db } = await import('../src/db/client.js');
    const { pokemonCardHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(pokemonCardHoldings)
      .values([
        { userId: testUserId, cardName: 'Rare Card', quantity: 1 },
        { userId: testUserId, cardName: 'Common Card', quantity: 5 },
      ]);

    mockedGetPrice.mockResolvedValueOnce(null).mockResolvedValueOnce({ priceUsd: 1.5, imageUrl: null });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/pokemon-cards/sync', headers: authHeader() });
    expect(res.json()).toEqual({ updated: 1, errors: 1 });

    await app.close();
  });
});

describe('GET /api/net-worth — pokemonCards field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes pokemonCards: 0 when no holdings', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.json<{ pokemonCards: number }>().pokemonCards).toBe(0);

    await app.close();
  });

  it('sums price × quantity into pokemonCards total', async () => {
    const { db } = await import('../src/db/client.js');
    const { pokemonCardHoldings } = await import('../src/db/schema.js');
    await db()
      .insert(pokemonCardHoldings)
      .values([
        { userId: testUserId, cardName: 'Charizard', quantity: 2, lastPriceUsd: '450.00' },
        { userId: testUserId, cardName: 'Black Lotus', quantity: 1, lastPriceUsd: '200.00' },
        { userId: testUserId, cardName: 'Pikachu', quantity: 3, lastPriceUsd: null },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.json<{ pokemonCards: number }>().pokemonCards).toBeCloseTo(900 + 200, 0);

    await app.close();
  });
});
