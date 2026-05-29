import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

describe('GET /api/manual-assets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns empty array when no assets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/manual-assets', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/manual-assets' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns assets with correct fields', async () => {
    const { db } = await import('../src/db/client.js');
    const { manualAssets } = await import('../src/db/schema.js');
    await db()
      .insert(manualAssets)
      .values({ userId: testUserId, name: 'Picasso Print', category: 'art', selfReportedValueUsd: '15000.00' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/manual-assets', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ name: string; category: string; selfReportedValueUsd: number }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.name).toBe('Picasso Print');
    expect(body[0]?.category).toBe('art');
    expect(body[0]?.selfReportedValueUsd).toBeCloseTo(15000, 0);

    await app.close();
  });
});

describe('POST /api/manual-assets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates an asset and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/manual-assets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Birkin 30', category: 'luxury_handbags', selfReportedValueUsd: 22000 }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true });

    const list = await app.inject({ method: 'GET', url: '/api/manual-assets', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });

  it('accepts optional notes field', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/manual-assets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Rolex Daytona',
        category: 'watches',
        selfReportedValueUsd: 35000,
        notes: 'Purchased 2019, serial 2A123',
      }),
    });
    expect(res.statusCode).toBe(201);

    await app.close();
  });

  it('returns 400 for invalid category', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/manual-assets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Thing', category: 'not_a_category', selfReportedValueUsd: 100 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for negative value', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/manual-assets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Art', category: 'art', selfReportedValueUsd: -100 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/manual-assets',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Art', category: 'art', selfReportedValueUsd: 100 }),
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('PATCH /api/manual-assets/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('updates name and value', async () => {
    const { db } = await import('../src/db/client.js');
    const { manualAssets } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(manualAssets)
      .values({ userId: testUserId, name: 'Old Name', category: 'art', selfReportedValueUsd: '1000.00' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/manual-assets/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', selfReportedValueUsd: 2500 }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    const list = await app.inject({ method: 'GET', url: '/api/manual-assets', headers: authHeader() });
    const asset = list.json<{ name: string; selfReportedValueUsd: number }[]>()[0];
    expect(asset?.name).toBe('New Name');
    expect(asset?.selfReportedValueUsd).toBeCloseTo(2500, 0);

    await app.close();
  });

  it('returns 400 for invalid category in patch', async () => {
    const { db } = await import('../src/db/client.js');
    const { manualAssets } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(manualAssets)
      .values({ userId: testUserId, name: 'Art', category: 'art', selfReportedValueUsd: '100.00' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/manual-assets/${row!.id}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ category: 'bad_category' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('DELETE /api/manual-assets/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('removes the asset and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { manualAssets } = await import('../src/db/schema.js');
    const [row] = await db()
      .insert(manualAssets)
      .values({ userId: testUserId, name: 'Watch', category: 'watches', selfReportedValueUsd: '5000.00' })
      .returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: `/api/manual-assets/${row!.id}`, headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/manual-assets', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even for unknown id', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/manual-assets/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('GET /api/net-worth — manual field', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('includes manual: 0 when no assets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ manual: number }>().manual).toBe(0);

    await app.close();
  });

  it('sums all manual asset values', async () => {
    const { db } = await import('../src/db/client.js');
    const { manualAssets } = await import('../src/db/schema.js');
    await db()
      .insert(manualAssets)
      .values([
        { userId: testUserId, name: 'Watch', category: 'watches', selfReportedValueUsd: '10000.00' },
        { userId: testUserId, name: 'Wine cellar', category: 'wine', selfReportedValueUsd: '4500.00' },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ manual: number }>().manual).toBeCloseTo(14500, 0);

    await app.close();
  });
});
