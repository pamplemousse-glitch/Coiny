import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/steam/client.js', () => ({
  getCs2Inventory: vi.fn(),
  priceInventory: vi.fn(),
  SteamError: class SteamError extends Error {
    constructor(
      message: string,
      public readonly status?: number,
    ) {
      super(message);
      this.name = 'SteamError';
    }
  },
}));

import { getCs2Inventory, priceInventory, SteamError } from '../src/steam/client.js';

const mockedGetCs2Inventory = vi.mocked(getCs2Inventory);
const mockedPriceInventory = vi.mocked(priceInventory);

describe('GET /api/steam-accounts', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no accounts', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/steam-accounts', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/steam-accounts' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns linked account with null portfolio before first sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { steamAccounts } = await import('../src/db/schema.js');
    await db().insert(steamAccounts).values({ userId: testUserId, steamId64: '76561198012345678', label: 'Main' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/steam-accounts', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ steamId64: string; label: string | null; lastPortfolioUsd: number | null }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.steamId64).toBe('76561198012345678');
    expect(body[0]?.label).toBe('Main');
    expect(body[0]?.lastPortfolioUsd).toBeNull();

    await app.close();
  });
});

describe('POST /api/steam-accounts', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('links a steam account and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/steam-accounts',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ steamId64: '76561198012345678', label: 'Main' }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true, steamId64: '76561198012345678' });

    await app.close();
  });

  it('returns 400 for invalid steamId64', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/steam-accounts',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ steamId64: 'not-a-steam-id' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for non-17-digit steamId64', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/steam-accounts',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ steamId64: '12345' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 409 on duplicate steam account', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const body = JSON.stringify({ steamId64: '76561198012345678' });
    const headers = { ...authHeader(), 'content-type': 'application/json' };

    await app.inject({ method: 'POST', url: '/api/steam-accounts', headers, body });
    const res = await app.inject({ method: 'POST', url: '/api/steam-accounts', headers, body });

    expect(res.statusCode).toBe(409);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/steam-accounts',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ steamId64: '76561198012345678' }),
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('DELETE /api/steam-accounts/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes account and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { steamAccounts } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(steamAccounts)
      .values({ userId: testUserId, steamId64: '76561198012345678' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: `/api/steam-accounts/${row!.id}`, headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/steam-accounts', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when id does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/steam-accounts/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/steam-accounts/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns synced: 0 when no accounts', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/steam-accounts/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 0, errors: [] });

    await app.close();
  });

  it('fetches inventory, prices it, and updates lastPortfolioUsd', async () => {
    const { db } = await import('../src/db/client.js');
    const { steamAccounts } = await import('../src/db/schema.js');
    await db().insert(steamAccounts).values({ userId: testUserId, steamId64: '76561198012345678' });

    const fakeInventory = new Map([['AK-47 | Redline (Field-Tested)', 2]]);
    mockedGetCs2Inventory.mockResolvedValue(fakeInventory);
    mockedPriceInventory.mockResolvedValue(74.5);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/steam-accounts/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ synced: 1, errors: [] });

    const list = await app.inject({ method: 'GET', url: '/api/steam-accounts', headers: authHeader() });
    const account = list.json<{ lastPortfolioUsd: number }[]>()[0];
    expect(account?.lastPortfolioUsd).toBeCloseTo(74.5, 1);

    expect(mockedGetCs2Inventory).toHaveBeenCalledWith('76561198012345678');

    await app.close();
  });

  it('records error when profile is private', async () => {
    const { db } = await import('../src/db/client.js');
    const { steamAccounts } = await import('../src/db/schema.js');
    await db().insert(steamAccounts).values({ userId: testUserId, steamId64: '76561198099999999' });

    mockedGetCs2Inventory.mockRejectedValue(new SteamError('Profile is private', 403));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/steam-accounts/sync', headers: authHeader() });
    expect(res.statusCode).toBe(422);
    const body = res.json<{ synced: number; errors: string[] }>();
    expect(body.synced).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain('76561198099999999');

    await app.close();
  });
});

describe('GET /api/net-worth — steam field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes steam: 0 when no accounts', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ steam: number }>().steam).toBe(0);

    await app.close();
  });

  it('sums lastPortfolioUsd from all linked accounts', async () => {
    const { db } = await import('../src/db/client.js');
    const { steamAccounts } = await import('../src/db/schema.js');
    await db()
      .insert(steamAccounts)
      .values([
        { userId: testUserId, steamId64: '76561198012345678', lastPortfolioUsd: '300.00' },
        { userId: testUserId, steamId64: '76561198087654321', lastPortfolioUsd: '125.50' },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ steam: number }>().steam).toBeCloseTo(425.5, 1);

    await app.close();
  });
});
