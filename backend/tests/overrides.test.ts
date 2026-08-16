import { createHmac } from 'node:crypto';
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

// Rows already in the database were indexed with an HMAC keyed on the AES key
// itself, before the index key was derived separately (audit 1.3.3). They must
// stay findable, deletable and rewritable without a migration.
describe('category overrides written under the pre-separation blind index', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function seedSharedKeyRow(merchant: string, category: string): Promise<string> {
    const { db } = await import('../src/db/client.js');
    const { categoryOverrides } = await import('../src/db/schema.js');
    const { encryptString } = await import('../src/util/crypto.js');
    const master = Buffer.from(process.env.DATA_ENCRYPTION_KEY as string, 'hex');
    const sharedIndex = createHmac('sha256', master).update(merchant, 'utf8').digest('hex');
    await db()
      .insert(categoryOverrides)
      .values({ userId: testUserId, merchantName: sharedIndex, merchantNameEnc: encryptString(merchant), category });
    return sharedIndex;
  }

  it('getOverride still finds them', async () => {
    const { getOverride } = await import('../src/store/overrides.js');
    await seedSharedKeyRow('whole foods', 'groceries');
    expect(await getOverride(testUserId, 'Whole Foods')).toBe('groceries');
  });

  it('listOverrides still decrypts their display copy', async () => {
    const { listOverrides } = await import('../src/store/overrides.js');
    await seedSharedKeyRow('whole foods', 'groceries');
    expect(await listOverrides(testUserId)).toEqual([{ merchantName: 'whole foods', category: 'groceries' }]);
  });

  it('deleteOverride still removes them', async () => {
    const { deleteOverride, getOverride } = await import('../src/store/overrides.js');
    await seedSharedKeyRow('whole foods', 'groceries');
    await deleteOverride(testUserId, 'Whole Foods');
    expect(await getOverride(testUserId, 'Whole Foods')).toBeNull();
  });

  it('setOverride migrates them to the derived index instead of duplicating', async () => {
    const { setOverride, getOverride } = await import('../src/store/overrides.js');
    const { blindIndex } = await import('../src/util/crypto.js');
    const { db } = await import('../src/db/client.js');
    const { categoryOverrides } = await import('../src/db/schema.js');

    const sharedIndex = await seedSharedKeyRow('whole foods', 'groceries');
    await setOverride(testUserId, 'Whole Foods', 'household');

    const rows = await db().select().from(categoryOverrides);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.merchantName).toBe(blindIndex('whole foods'));
    expect(rows[0]?.merchantName).not.toBe(sharedIndex);
    expect(await getOverride(testUserId, 'Whole Foods')).toBe('household');
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
