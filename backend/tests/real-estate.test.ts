import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/realestate/client.js', () => ({
  getPropertyValue: vi.fn(),
}));

import { getPropertyValue } from '../src/realestate/client.js';

const mockedGetPropertyValue = vi.mocked(getPropertyValue);

describe('GET /api/real-estate', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no assets registered', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/real-estate', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/real-estate' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns assets with null value before first sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { realEstateAssets } = await import('../src/db/schema.js');
    await db().insert(realEstateAssets).values({ userId: testUserId, address: '123 Main St, Austin TX' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/real-estate', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ address: string; lastValueUsd: number | null }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.address).toBe('123 Main St, Austin TX');
    expect(body[0]?.lastValueUsd).toBeNull();

    await app.close();
  });
});

describe('POST /api/real-estate', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing address', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/real-estate',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'Home' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('creates asset and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/real-estate',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ address: '456 Oak Ave, Denver CO', label: 'Investment property' }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true, address: '456 Oak Ave, Denver CO' });

    const list = await app.inject({ method: 'GET', url: '/api/real-estate', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });

  it('silently ignores duplicate address for same user', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const headers = { ...authHeader(), 'content-type': 'application/json' };
    const body = JSON.stringify({ address: '789 Elm St, Chicago IL' });

    await app.inject({ method: 'POST', url: '/api/real-estate', headers, body });
    const second = await app.inject({ method: 'POST', url: '/api/real-estate', headers, body });
    expect(second.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/real-estate', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });
});

describe('DELETE /api/real-estate/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes asset and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { realEstateAssets } = await import('../src/db/schema.js');
    const [row] = await db().insert(realEstateAssets).values({ userId: testUserId, address: '111 Del St' }).returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/real-estate/${row!.id}`,
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/real-estate', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when asset does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/real-estate/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/real-estate/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns synced: 0 when no assets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/real-estate/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 0, errors: 0 });

    await app.close();
  });

  it('updates lastValueUsd and returns synced: 1', async () => {
    const { db } = await import('../src/db/client.js');
    const { realEstateAssets } = await import('../src/db/schema.js');
    await db().insert(realEstateAssets).values({ userId: testUserId, address: '123 Main St' });

    mockedGetPropertyValue.mockResolvedValue(450000);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/real-estate/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 1, errors: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/real-estate', headers: authHeader() });
    const asset = list.json<{ lastValueUsd: number }[]>()[0];
    expect(asset?.lastValueUsd).toBeCloseTo(450000, 0);

    await app.close();
  });

  it('returns 402 when API key is missing', async () => {
    const { db } = await import('../src/db/client.js');
    const { realEstateAssets } = await import('../src/db/schema.js');
    await db().insert(realEstateAssets).values({ userId: testUserId, address: '123 Main St' });

    mockedGetPropertyValue.mockRejectedValue(new Error('RENTCAST_API_KEY not configured'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/real-estate/sync', headers: authHeader() });
    expect(res.statusCode).toBe(402);
    expect(res.json()).toMatchObject({ error: 'RENTCAST_API_KEY not configured' });

    await app.close();
  });

  it('counts non-config errors and continues syncing remaining assets', async () => {
    const { db } = await import('../src/db/client.js');
    const { realEstateAssets } = await import('../src/db/schema.js');
    await db()
      .insert(realEstateAssets)
      .values([
        { userId: testUserId, address: '111 Fail St' },
        { userId: testUserId, address: '222 Ok Ave' },
      ]);

    mockedGetPropertyValue.mockRejectedValueOnce(new Error('API timeout')).mockResolvedValueOnce(300000);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/real-estate/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 1, errors: 1 });

    await app.close();
  });
});

describe('GET /api/net-worth — realEstate field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes realEstate: 0 when no assets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ realEstate: number }>().realEstate).toBe(0);

    await app.close();
  });

  it('sums lastValueUsd from real estate assets into realEstate total', async () => {
    const { db } = await import('../src/db/client.js');
    const { realEstateAssets } = await import('../src/db/schema.js');
    await db()
      .insert(realEstateAssets)
      .values([
        { userId: testUserId, address: '100 First St', lastValueUsd: '450000.00' },
        { userId: testUserId, address: '200 Second St', lastValueUsd: '320000.50' },
        { userId: testUserId, address: '300 Third St', lastValueUsd: null },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ realEstate: number }>();
    expect(body.realEstate).toBeCloseTo(770000.5, 1);

    await app.close();
  });
});
