import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/usda/client.js', () => ({
  getFarmlandPricePerAcre: vi.fn(),
}));

import { getFarmlandPricePerAcre } from '../src/usda/client.js';

const mockedGetFarmlandPricePerAcre = vi.mocked(getFarmlandPricePerAcre);

describe('GET /api/farmland', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no parcels', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/farmland', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/farmland' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns parcel with null value before first sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { farmlandParcels } = await import('../src/db/schema.js');
    await db().insert(farmlandParcels).values({ userId: testUserId, stateCode: 'IA', acres: '100.5' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/farmland', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ stateCode: string; acres: number; valueUsd: number | null }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.stateCode).toBe('IA');
    expect(body[0]?.acres).toBeCloseTo(100.5, 1);
    expect(body[0]?.valueUsd).toBeNull();

    await app.close();
  });

  it('computes valueUsd from price per acre when synced', async () => {
    const { db } = await import('../src/db/client.js');
    const { farmlandParcels } = await import('../src/db/schema.js');
    await db().insert(farmlandParcels).values({
      userId: testUserId,
      stateCode: 'IL',
      acres: '50',
      lastPricePerAcreUsd: '9000.00',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/farmland', headers: authHeader() });
    const body = res.json<{ valueUsd: number }[]>();
    expect(body[0]?.valueUsd).toBeCloseTo(450000, 0);

    await app.close();
  });
});

describe('POST /api/farmland', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for invalid state code (wrong length)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/farmland',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ stateCode: 'IOWA', acres: 100 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for missing acres', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/farmland',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ stateCode: 'IA' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for negative acres', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/farmland',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ stateCode: 'IA', acres: -5 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('creates parcel, normalises state code to uppercase, returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/farmland',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ stateCode: 'ia', acres: 250, label: 'South field' }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true });

    const list = await app.inject({ method: 'GET', url: '/api/farmland', headers: authHeader() });
    const body = list.json<{ stateCode: string }[]>();
    expect(body[0]?.stateCode).toBe('IA');

    await app.close();
  });
});

describe('PATCH /api/farmland/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('updates acres', async () => {
    const { db } = await import('../src/db/client.js');
    const { farmlandParcels } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(farmlandParcels)
      .values({ userId: testUserId, stateCode: 'MN', acres: '100' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/farmland/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ acres: 125 }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    await app.close();
  });

  it('returns 400 when no fields provided', async () => {
    const { db } = await import('../src/db/client.js');
    const { farmlandParcels } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(farmlandParcels)
      .values({ userId: testUserId, stateCode: 'KS', acres: '50' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/farmland/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('DELETE /api/farmland/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes parcel and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { farmlandParcels } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(farmlandParcels)
      .values({ userId: testUserId, stateCode: 'NE', acres: '320' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/farmland/${row!.id}`,
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/farmland', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when parcel does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/farmland/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/farmland/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns updated: 0 when no parcels', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/farmland/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 0 });

    await app.close();
  });

  it('returns note when USDA key not configured', async () => {
    const { db } = await import('../src/db/client.js');
    const { farmlandParcels } = await import('../src/db/schema.js');
    await db().insert(farmlandParcels).values({ userId: testUserId, stateCode: 'IA', acres: '100' });

    mockedGetFarmlandPricePerAcre.mockResolvedValue(null);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/farmland/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ updated: number }>();
    expect(body.updated).toBe(0);

    await app.close();
  });

  it('updates price per acre and returns count', async () => {
    const { db } = await import('../src/db/client.js');
    const { farmlandParcels } = await import('../src/db/schema.js');
    await db().insert(farmlandParcels).values([
      { userId: testUserId, stateCode: 'IA', acres: '200' },
      { userId: testUserId, stateCode: 'IL', acres: '100' },
    ]);

    mockedGetFarmlandPricePerAcre.mockResolvedValueOnce(8500).mockResolvedValueOnce(9200);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/farmland/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 2 });

    const list = await app.inject({ method: 'GET', url: '/api/farmland', headers: authHeader() });
    const body = list.json<{ stateCode: string; lastPricePerAcreUsd: number; valueUsd: number }[]>();
    const iowa = body.find((p) => p.stateCode === 'IA');
    expect(iowa?.lastPricePerAcreUsd).toBeCloseTo(8500, 0);
    expect(iowa?.valueUsd).toBeCloseTo(1_700_000, 0);

    await app.close();
  });

  it('calls USDA API once per unique state even with multiple parcels in same state', async () => {
    const { db } = await import('../src/db/client.js');
    const { farmlandParcels } = await import('../src/db/schema.js');
    await db()
      .insert(farmlandParcels)
      .values([
        { userId: testUserId, stateCode: 'IA', acres: '100' },
        { userId: testUserId, stateCode: 'IA', acres: '50' },
      ]);

    mockedGetFarmlandPricePerAcre.mockResolvedValue(8500);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/farmland/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 2 });
    expect(mockedGetFarmlandPricePerAcre).toHaveBeenCalledTimes(1);

    await app.close();
  });
});

describe('GET /api/net-worth — farmland field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes farmland: 0 when no parcels', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ farmland: number }>().farmland).toBe(0);

    await app.close();
  });

  it('sums acres × lastPricePerAcreUsd into farmland total', async () => {
    const { db } = await import('../src/db/client.js');
    const { farmlandParcels } = await import('../src/db/schema.js');
    await db()
      .insert(farmlandParcels)
      .values([
        { userId: testUserId, stateCode: 'IA', acres: '200', lastPricePerAcreUsd: '8000.00' },
        { userId: testUserId, stateCode: 'IL', acres: '100', lastPricePerAcreUsd: '9000.00' },
        { userId: testUserId, stateCode: 'MN', acres: '50', lastPricePerAcreUsd: null },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    const body = res.json<{ farmland: number }>();
    expect(body.farmland).toBeCloseTo(1_600_000 + 900_000, 0);

    await app.close();
  });
});
