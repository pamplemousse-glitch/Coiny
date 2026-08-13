import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

const DAY = 24 * 60 * 60 * 1000;

type SheetBody = {
  assets: Array<{
    assetClass: string;
    bucketedValueUsd: number | null;
    confidence: string;
    declaredAt: string;
    refreshedAt: string;
  }>;
  nudge: { assetClass: string; ageDays: number } | null;
};

const jsonHeaders = () => ({ ...authHeader(), 'content-type': 'application/json' });

describe('GET /api/declared-assets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns an empty sheet when nothing is declared', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/declared-assets', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<SheetBody>()).toEqual({ assets: [], nudge: null });

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/declared-assets' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('reports the R-5.4 nudge candidate for a line 60 days untouched', async () => {
    const { replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const old = new Date(Date.now() - 75 * DAY);
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'car', bucketedValueUsd: 12000, declaredAt: old }], old);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/declared-assets', headers: authHeader() });
    expect(res.json<SheetBody>().nudge).toEqual({ assetClass: 'car', ageDays: 75 });

    await app.close();
  });
});

describe('PUT /api/declared-assets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('replaces the sheet and returns the stored lines', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const declaredAt = new Date().toISOString();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/declared-assets',
      headers: jsonHeaders(),
      body: JSON.stringify({
        assets: [
          { assetClass: 'checking', bucketedValueUsd: 5000, declaredAt },
          { assetClass: 'credit_cards', bucketedValueUsd: 2000, declaredAt },
          { assetClass: 'home', bucketedValueUsd: null, declaredAt },
        ],
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<SheetBody>();
    expect(body.assets.map((a) => a.assetClass)).toEqual(['checking', 'credit_cards', 'home']);
    expect(body.assets[1]?.bucketedValueUsd).toBe(2000);
    expect(body.assets[2]?.bucketedValueUsd).toBeNull();

    await app.close();
  });

  it('rejects an unknown asset class', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/declared-assets',
      headers: jsonHeaders(),
      body: JSON.stringify({
        assets: [{ assetClass: 'yachts', bucketedValueUsd: 1, declaredAt: new Date().toISOString() }],
      }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('rejects a negative declared value', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/declared-assets',
      headers: jsonHeaders(),
      body: JSON.stringify({
        assets: [{ assetClass: 'credit_cards', bucketedValueUsd: -2000, declaredAt: new Date().toISOString() }],
      }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('rejects duplicate classes in one sheet', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const declaredAt = new Date().toISOString();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/declared-assets',
      headers: jsonHeaders(),
      body: JSON.stringify({
        assets: [
          { assetClass: 'checking', bucketedValueUsd: 1000, declaredAt },
          { assetClass: 'checking', bucketedValueUsd: 2000, declaredAt },
        ],
      }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('drops lines the new sheet no longer declares', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const declaredAt = new Date().toISOString();
    const put = (assets: unknown) =>
      app.inject({
        method: 'PUT',
        url: '/api/declared-assets',
        headers: jsonHeaders(),
        body: JSON.stringify({ assets }),
      });

    await put([
      { assetClass: 'checking', bucketedValueUsd: 5000, declaredAt },
      { assetClass: 'car', bucketedValueUsd: 12000, declaredAt },
    ]);
    const res = await put([{ assetClass: 'checking', bucketedValueUsd: 6000, declaredAt }]);
    expect(res.json<SheetBody>().assets.map((a) => a.assetClass)).toEqual(['checking']);

    await app.close();
  });
});

describe('PATCH /api/declared-assets/:assetClass', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('updates the value and bumps refreshedAt', async () => {
    const { replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const old = new Date(Date.now() - 90 * DAY);
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'car', bucketedValueUsd: 12000, declaredAt: old }], old);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/declared-assets/car',
      headers: jsonHeaders(),
      body: JSON.stringify({ bucketedValueUsd: 10000 }),
    });
    expect(res.statusCode).toBe(200);
    const line = res.json<{ bucketedValueUsd: number; refreshedAt: string; declaredAt: string }>();
    expect(line.bucketedValueUsd).toBe(10000);
    expect(new Date(line.refreshedAt).getTime()).toBeGreaterThan(old.getTime());
    expect(new Date(line.declaredAt).getTime()).toBe(old.getTime());

    await app.close();
  });

  it('returns 404 for a class the user never declared', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/declared-assets/brokerage',
      headers: jsonHeaders(),
      body: JSON.stringify({ bucketedValueUsd: 5000 }),
    });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('returns 400 for an unknown class name', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/declared-assets/yachts',
      headers: jsonHeaders(),
      body: JSON.stringify({ bucketedValueUsd: 5000 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('DELETE /api/declared-assets/:assetClass', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('removes the line and returns 204', async () => {
    const { listDeclaredAssets, replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const now = new Date();
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'crypto', bucketedValueUsd: 3000, declaredAt: now }], now);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/declared-assets/crypto', headers: authHeader() });
    expect(res.statusCode).toBe(204);
    expect(await listDeclaredAssets(testUserId)).toEqual([]);

    await app.close();
  });

  it('returns 404 when nothing was declared for the class', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/declared-assets/crypto', headers: authHeader() });
    expect(res.statusCode).toBe(404);

    await app.close();
  });
});
