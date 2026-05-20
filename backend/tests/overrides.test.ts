import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from './db-helper.js';

describe('category overrides store', () => {
  beforeEach(async () => { await resetDatabase(); });

  it('returns null for an unset merchant', async () => {
    const { getOverride } = await import('../src/store/overrides.js');
    expect(await getOverride('Whole Foods')).toBeNull();
  });

  it('setOverride / getOverride roundtrip (case-insensitive)', async () => {
    const { getOverride, setOverride } = await import('../src/store/overrides.js');
    await setOverride('Whole Foods', 'groceries');
    expect(await getOverride('Whole Foods')).toBe('groceries');
    expect(await getOverride('WHOLE FOODS')).toBe('groceries');
    expect(await getOverride('  whole foods ')).toBe('groceries');
  });

  it('setOverride upserts on conflict', async () => {
    const { getOverride, setOverride } = await import('../src/store/overrides.js');
    await setOverride('Costco', 'groceries');
    await setOverride('Costco', 'household');
    expect(await getOverride('Costco')).toBe('household');
  });

  it('deleteOverride removes the row', async () => {
    const { getOverride, setOverride, deleteOverride } = await import('../src/store/overrides.js');
    await setOverride('Target', 'household');
    await deleteOverride('Target');
    expect(await getOverride('Target')).toBeNull();
  });

  it('listOverrides returns all rows', async () => {
    const { setOverride, listOverrides } = await import('../src/store/overrides.js');
    await setOverride('Whole Foods', 'groceries');
    await setOverride('Costco', 'household');
    const list = await listOverrides();
    expect(list.length).toBe(2);
    expect(list.map((r) => r.merchantName).sort()).toEqual(['costco', 'whole foods']);
  });
});

describe('PUT /api/spending/overrides', () => {
  beforeEach(async () => { await resetDatabase(); });

  it('persists an override via the API', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/spending/overrides',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ merchant_name: 'Spotify', category: 'entertainment' }),
    });
    expect(res.statusCode).toBe(200);

    const list = await app.inject({ method: 'GET', url: '/api/spending/overrides' });
    expect(list.json()).toEqual([{ merchantName: 'spotify', category: 'entertainment' }]);

    await app.close();
  });

  it('returns 400 on invalid body', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/spending/overrides',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ merchant_name: '', category: 'x' }),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
