import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

describe('category overrides store', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns null for an unset merchant', async () => {
    const { getOverride } = await import('../src/store/overrides.js');
    expect(await getOverride(testUserId, 'Whole Foods')).toBeNull();
  });

  it('setOverride / getOverride roundtrip (case-insensitive)', async () => {
    const { getOverride, setOverride } = await import('../src/store/overrides.js');
    await setOverride(testUserId, 'Whole Foods', 'groceries');
    expect(await getOverride(testUserId, 'Whole Foods')).toBe('groceries');
    expect(await getOverride(testUserId, 'WHOLE FOODS')).toBe('groceries');
    expect(await getOverride(testUserId, '  whole foods ')).toBe('groceries');
  });

  it('setOverride upserts on conflict', async () => {
    const { getOverride, setOverride } = await import('../src/store/overrides.js');
    await setOverride(testUserId, 'Costco', 'groceries');
    await setOverride(testUserId, 'Costco', 'household');
    expect(await getOverride(testUserId, 'Costco')).toBe('household');
  });

  it('deleteOverride removes the row', async () => {
    const { getOverride, setOverride, deleteOverride } = await import('../src/store/overrides.js');
    await setOverride(testUserId, 'Target', 'household');
    await deleteOverride(testUserId, 'Target');
    expect(await getOverride(testUserId, 'Target')).toBeNull();
  });

  it('listOverrides returns all rows', async () => {
    const { setOverride, listOverrides } = await import('../src/store/overrides.js');
    await setOverride(testUserId, 'Whole Foods', 'groceries');
    await setOverride(testUserId, 'Costco', 'household');
    const list = await listOverrides(testUserId);
    expect(list.length).toBe(2);
    expect(list.map((r) => r.merchantName).sort()).toEqual(['costco', 'whole foods']);
  });
});

describe('PUT /api/spending/overrides', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('persists an override via the API', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/spending/overrides',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ merchant_name: 'Spotify', category: 'entertainment' }),
    });
    expect(res.statusCode).toBe(200);

    const list = await app.inject({ method: 'GET', url: '/api/spending/overrides', headers: authHeader() });
    expect(list.json()).toEqual([{ merchantName: 'spotify', category: 'entertainment' }]);

    await app.close();
  });

  it('returns 400 on invalid body', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/spending/overrides',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ merchant_name: '', category: 'x' }),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
