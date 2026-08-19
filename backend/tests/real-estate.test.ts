import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/realestate/client.js', () => ({
  getPropertyValue: vi.fn(),
}));

vi.mock('../src/fred/client.js', () => ({
  deriveValueFromPurchase: vi.fn(),
}));

import { deriveValueFromPurchase } from '../src/fred/client.js';
import { getPropertyValue } from '../src/realestate/client.js';

const mockedGetPropertyValue = vi.mocked(getPropertyValue);
const mockedDerive = vi.mocked(deriveValueFromPurchase);

describe('GET /api/real-estate', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Default: no derived valuation available, which is the pre-0056 world and
    // keeps the existing expectations meaning what they meant.
    mockedDerive.mockResolvedValue(null);
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
    // Default: no derived valuation available, which is the pre-0056 world and
    // keeps the existing expectations meaning what they meant.
    mockedDerive.mockResolvedValue(null);
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
    // Default: no derived valuation available, which is the pre-0056 world and
    // keeps the existing expectations meaning what they meant.
    mockedDerive.mockResolvedValue(null);
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
    // Default: no derived valuation available, which is the pre-0056 world and
    // keeps the existing expectations meaning what they meant.
    mockedDerive.mockResolvedValue(null);
    await resetDatabase();
  });

  it('returns synced: 0 when no assets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/real-estate/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 0, derived: 0, errors: 0 });

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
    expect(res.json()).toEqual({ synced: 1, derived: 0, errors: 0 });

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
    expect(res.json()).toEqual({ synced: 1, derived: 0, errors: 1 });

    await app.close();
  });
});

describe('GET /api/net-worth — realEstate field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Default: no derived valuation available, which is the pre-0056 world and
    // keeps the existing expectations meaning what they meant.
    mockedDerive.mockResolvedValue(null);
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

describe('derived valuation (DR-21)', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedDerive.mockResolvedValue(null);
    await resetDatabase();
  });

  it('stores purchase price and date on add', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const add = await app.inject({
      method: 'POST',
      url: '/api/real-estate',
      headers: authHeader(),
      payload: { address: '1 Test St', purchasePriceUsd: 250000, purchaseDate: '2010-06-01' },
    });
    expect(add.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/real-estate', headers: authHeader() });
    const asset = list.json<{ purchasePriceUsd: number; purchaseDate: string }[]>()[0];
    expect(asset?.purchasePriceUsd).toBeCloseTo(250000, 0);
    expect(asset?.purchaseDate).toBe('2010-06-01');

    await app.close();
  });

  it('rejects a malformed purchase date', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/real-estate',
      headers: authHeader(),
      payload: { address: '1 Test St', purchasePriceUsd: 250000, purchaseDate: '06/01/2010' },
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  // The reason this integration exists. Property is the largest asset most
  // Americans own and it throws on every call today because the key is unset.
  it('values a property with no RentCast key when a purchase price is on file', async () => {
    const { db } = await import('../src/db/client.js');
    const { realEstateAssets } = await import('../src/db/schema.js');
    await db().insert(realEstateAssets).values({
      userId: testUserId,
      address: '1 Test St',
      purchasePriceUsd: '250000',
      purchaseDate: '2010-06-01',
    });

    mockedGetPropertyValue.mockRejectedValue(new Error('RENTCAST_API_KEY not configured'));
    mockedDerive.mockResolvedValue({
      valueUsd: 666666.67,
      purchaseIndex: { date: '2010-01-01', value: 300 },
      latestIndex: { date: '2026-01-01', value: 800 },
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/real-estate/sync', headers: authHeader() });
    // Not a 402. The key is missing but a figure was still produced.
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 0, derived: 1, errors: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/real-estate', headers: authHeader() });
    const asset = list.json<{ lastValueUsd: number; valuationSource: string }[]>()[0];
    expect(asset?.lastValueUsd).toBeCloseTo(666666.67, 1);
    // Labelled honestly: an index-tracked estimate, not an appraisal.
    expect(asset?.valuationSource).toBe('derived');

    await app.close();
  });

  it('still returns 402 when the key is missing and nothing can be derived', async () => {
    const { db } = await import('../src/db/client.js');
    const { realEstateAssets } = await import('../src/db/schema.js');
    await db().insert(realEstateAssets).values({ userId: testUserId, address: '1 Test St' });

    mockedGetPropertyValue.mockRejectedValue(new Error('RENTCAST_API_KEY not configured'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/real-estate/sync', headers: authHeader() });
    expect(res.statusCode).toBe(402);

    await app.close();
  });

  it('prefers the AVM over the derived figure when RentCast answers', async () => {
    const { db } = await import('../src/db/client.js');
    const { realEstateAssets } = await import('../src/db/schema.js');
    await db().insert(realEstateAssets).values({
      userId: testUserId,
      address: '1 Test St',
      purchasePriceUsd: '250000',
      purchaseDate: '2010-06-01',
    });

    mockedGetPropertyValue.mockResolvedValue(700000);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/real-estate/sync', headers: authHeader() });
    expect(res.json()).toEqual({ synced: 1, derived: 0, errors: 0 });
    expect(mockedDerive).not.toHaveBeenCalled();

    const list = await app.inject({ method: 'GET', url: '/api/real-estate', headers: authHeader() });
    expect(list.json<{ valuationSource: string }[]>()[0]?.valuationSource).toBe('avm');

    await app.close();
  });
});
