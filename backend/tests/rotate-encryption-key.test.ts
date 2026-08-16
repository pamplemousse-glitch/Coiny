import { createCipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

// This file runs as if a rotation had already been configured: the new key
// writes at version 2 and the outgoing key stays in the decrypt-only keyring.
// The env has to be in place before anything loads config.ts, so it is set at
// module scope; only vitest and db-helper are imported statically, and neither
// touches config. Restored in afterAll because workers outlive a file.
const KEY_OLD = '1'.repeat(64);
const KEY_NEW = '2'.repeat(64);

const savedEnv = {
  DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY,
  DATA_ENCRYPTION_KEY_VERSION: process.env.DATA_ENCRYPTION_KEY_VERSION,
  DATA_ENCRYPTION_KEYS_PREVIOUS: process.env.DATA_ENCRYPTION_KEYS_PREVIOUS,
};
process.env.DATA_ENCRYPTION_KEY = KEY_NEW;
process.env.DATA_ENCRYPTION_KEY_VERSION = '2';
process.env.DATA_ENCRYPTION_KEYS_PREVIOUS = `1:${KEY_OLD}`;

afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

/** The envelope as it was written before key versioning existed. */
function unversioned(keyHex: string, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

function versioned(version: number, keyHex: string, plaintext: string): string {
  return `v${version}:${unversioned(keyHex, plaintext)}`;
}

/** The blind index the outgoing key would have produced, computed here rather
 *  than by importing crypto.ts so the test does not assert an implementation
 *  against itself. */
function derivedIndex(keyHex: string, value: string): string {
  const indexKey = Buffer.from(
    hkdfSync('sha256', Buffer.from(keyHex, 'hex'), Buffer.alloc(0), 'coiny/blind-index/merchant/v1', 32),
  );
  return createHmac('sha256', indexKey).update(value, 'utf8').digest('hex');
}

function sharedKeyIndex(keyHex: string, value: string): string {
  return createHmac('sha256', Buffer.from(keyHex, 'hex')).update(value, 'utf8').digest('hex');
}

describe('rotateEncryptionKey', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('rewrites rows from the outgoing key onto the current one, and leaves them readable throughout', async () => {
    const { db } = await import('../src/db/client.js');
    const { plaidItems, transactions } = await import('../src/db/schema.js');
    const { decryptString, envelopeKeyVersion } = await import('../src/util/crypto.js');
    const { rotateEncryptionKey } = await import('../src/db/rotate-encryption-key.js');
    const { eq } = await import('drizzle-orm');

    await db()
      .insert(transactions)
      .values([
        {
          transactionId: 'tx_unversioned',
          userId: testUserId,
          accountId: 'acct_1',
          merchantName: unversioned(KEY_OLD, 'Starbucks #1912'),
          amount: '-4.50',
          date: '2026-08-01',
        },
        {
          transactionId: 'tx_v1',
          userId: testUserId,
          accountId: 'acct_1',
          merchantName: versioned(1, KEY_OLD, 'Pret A Manger'),
          amount: '-9.10',
          date: '2026-08-02',
        },
      ]);
    await db()
      .insert(plaidItems)
      .values({ itemId: 'item_1', userId: testUserId, accessToken: versioned(1, KEY_OLD, 'access-sandbox-old') });

    // Readable before the sweep: that is what makes the sweep optional rather
    // than an outage.
    const before = await db().select().from(transactions).where(eq(transactions.transactionId, 'tx_unversioned'));
    expect(decryptString(before[0]?.merchantName ?? '')).toBe('Starbucks #1912');

    const counts = await rotateEncryptionKey();
    expect(counts.rowsRewritten).toBe(3);
    expect(counts.valuesRewritten).toBe(3);
    expect(counts.byTable.transactions).toBe(2);
    expect(counts.byTable.plaid_items).toBe(1);

    const txRows = await db().select().from(transactions);
    for (const row of txRows) {
      expect(envelopeKeyVersion(row.merchantName ?? '')).toBe(2);
    }
    const byId = new Map(txRows.map((r) => [r.transactionId, r.merchantName ?? '']));
    expect(decryptString(byId.get('tx_unversioned') ?? '')).toBe('Starbucks #1912');
    expect(decryptString(byId.get('tx_v1') ?? '')).toBe('Pret A Manger');

    const items = await db().select().from(plaidItems);
    expect(envelopeKeyVersion(items[0]?.accessToken ?? '')).toBe(2);
    expect(decryptString(items[0]?.accessToken ?? '')).toBe('access-sandbox-old');
  });

  it('is idempotent: a second sweep rewrites nothing', async () => {
    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');
    const { rotateEncryptionKey } = await import('../src/db/rotate-encryption-key.js');

    await db()
      .insert(transactions)
      .values({
        transactionId: 'tx_1',
        userId: testUserId,
        accountId: 'acct_1',
        merchantName: versioned(1, KEY_OLD, 'Costco'),
        amount: '-80.00',
        date: '2026-08-01',
      });

    expect((await rotateEncryptionKey()).rowsRewritten).toBe(1);
    expect((await rotateEncryptionKey()).rowsRewritten).toBe(0);
  });

  it('leaves pre-0048 plaintext rows alone and counts them for the backfill', async () => {
    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');
    const { rotateEncryptionKey } = await import('../src/db/rotate-encryption-key.js');

    await db().insert(transactions).values({
      transactionId: 'tx_legacy',
      userId: testUserId,
      accountId: 'acct_1',
      merchantName: 'Legacy Cafe',
      amount: '-3.00',
      date: '2026-08-01',
    });

    const counts = await rotateEncryptionKey();
    expect(counts.rowsRewritten).toBe(0);
    expect(counts.legacyPlaintextSkipped).toBe(1);
    const rows = await db().select().from(transactions);
    expect(rows[0]?.merchantName).toBe('Legacy Cafe');
  });

  it('moves category overrides onto the index derived from the current key', async () => {
    const { db } = await import('../src/db/client.js');
    const { categoryOverrides } = await import('../src/db/schema.js');
    const { rotateEncryptionKey } = await import('../src/db/rotate-encryption-key.js');
    const { getOverride } = await import('../src/store/overrides.js');

    await db()
      .insert(categoryOverrides)
      .values([
        {
          userId: testUserId,
          merchantName: derivedIndex(KEY_OLD, 'whole foods'),
          merchantNameEnc: versioned(1, KEY_OLD, 'whole foods'),
          category: 'groceries',
        },
        {
          userId: testUserId,
          merchantName: sharedKeyIndex(KEY_OLD, 'costco'),
          merchantNameEnc: unversioned(KEY_OLD, 'costco'),
          category: 'household',
        },
      ]);

    const counts = await rotateEncryptionKey();
    expect(counts.byTable.category_overrides).toBe(2);

    const rows = await db().select().from(categoryOverrides);
    expect(rows.map((r) => r.merchantName).sort()).toEqual(
      [derivedIndex(KEY_NEW, 'costco'), derivedIndex(KEY_NEW, 'whole foods')].sort(),
    );
    expect(await getOverride(testUserId, 'Whole Foods')).toBe('groceries');
    expect(await getOverride(testUserId, 'Costco')).toBe('household');
  });

  it('skips overrides that predate 0048 entirely, leaving them to the backfill', async () => {
    const { db } = await import('../src/db/client.js');
    const { categoryOverrides } = await import('../src/db/schema.js');
    const { rotateEncryptionKey } = await import('../src/db/rotate-encryption-key.js');

    await db()
      .insert(categoryOverrides)
      .values({ userId: testUserId, merchantName: 'whole foods', merchantNameEnc: null, category: 'groceries' });

    const counts = await rotateEncryptionKey();
    expect(counts.rowsRewritten).toBe(0);
    expect(counts.legacyPlaintextSkipped).toBe(1);
    const rows = await db().select().from(categoryOverrides);
    expect(rows[0]?.merchantName).toBe('whole foods');
  });
});
