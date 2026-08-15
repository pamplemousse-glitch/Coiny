import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

// Migration 0048: transactions.merchant_name, plaid_recurring_streams
// .merchant_name/.description and category_overrides merchant data are
// encrypted at rest. amount stays plaintext on purpose (see db/schema.ts).

// v<n> names the key that wrote the row (util/crypto.ts); rows written before
// versioning existed carry no prefix and are read at version 1.
const ENVELOPE = /^v[0-9]{1,3}:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/;

function plaidTx(overrides: Partial<{ id: string; amount: string; date: string; merchant: string }> = {}) {
  const { id = 'tx_1', amount = '-42.17', date = '2026-08-01', merchant = 'Starbucks' } = overrides;
  return {
    id,
    account_id: 'acct_1',
    amount,
    date,
    description: merchant,
    status: 'posted' as const,
    type: 'card_payment' as const,
    running_balance: null,
    details: { category: 'food_and_drink', counterparty: { name: merchant, type: 'organization' as const } },
  };
}

describe('transactions merchant_name encryption at rest', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('persistTransactions stores merchant_name as ciphertext, never plaintext', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');
    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');

    await persistTransactions(testUserId, [plaidTx({ merchant: 'Starbucks #1912' })]);

    const rows = await db().select().from(transactions).where(eq(transactions.userId, testUserId));
    expect(rows).toHaveLength(1);
    const stored = rows[0]?.merchantName ?? '';
    expect(stored).toMatch(ENVELOPE);
    expect(stored).not.toContain('Starbucks');
  });

  it('amount stays plaintext so SQL aggregation keeps working (deliberate, see schema)', async () => {
    const { persistTransactions, getWeeklySpendByCategory } = await import('../src/store/transactions.js');
    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');

    const today = new Date().toISOString().slice(0, 10);
    await persistTransactions(testUserId, [plaidTx({ date: today })]);

    const rows = await db().select().from(transactions).where(eq(transactions.userId, testUserId));
    expect(rows[0]?.amount).toBe('-42.17');
    // The SQL SUM/GROUP BY path over amount must survive the change.
    const weekly = await getWeeklySpendByCategory(testUserId);
    expect(weekly.food_and_drink).toBeCloseTo(42.17);
  });

  it('upsertModifiedTransactions re-encrypts the updated merchant_name', async () => {
    const { persistTransactions, upsertModifiedTransactions } = await import('../src/store/transactions.js');
    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');

    await persistTransactions(testUserId, [plaidTx()]);
    await upsertModifiedTransactions(testUserId, [plaidTx({ merchant: 'Starbucks Reserve' })]);

    const rows = await db().select().from(transactions).where(eq(transactions.userId, testUserId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.merchantName ?? '').toMatch(ENVELOPE);
    expect(rows[0]?.merchantName ?? '').not.toContain('Starbucks');
  });

  it('getRecentOutflows returns the decrypted merchant name', async () => {
    const { persistTransactions, getRecentOutflows } = await import('../src/store/transactions.js');

    const date = new Date();
    date.setDate(date.getDate() - 3);
    await persistTransactions(testUserId, [plaidTx({ date: date.toISOString().slice(0, 10) })]);

    const outflows = await getRecentOutflows(testUserId, 30);
    expect(outflows).toHaveLength(1);
    expect(outflows[0]?.merchantName).toBe('Starbucks');
  });

  it('a pre-existing plaintext row (written before 0048) still reads correctly', async () => {
    const { getRecentOutflows } = await import('../src/store/transactions.js');
    const { db } = await import('../src/db/client.js');
    const { transactions } = await import('../src/db/schema.js');

    const date = new Date();
    date.setDate(date.getDate() - 3);
    // Raw insert bypasses the store layer, exactly like a legacy row.
    await db()
      .insert(transactions)
      .values({
        transactionId: 'legacy_tx',
        userId: testUserId,
        accountId: 'acct_1',
        merchantName: 'Legacy Coffee: Downtown',
        amount: '-9.50',
        date: date.toISOString().slice(0, 10),
        category: 'food_and_drink',
      });

    const outflows = await getRecentOutflows(testUserId, 30);
    expect(outflows).toHaveLength(1);
    expect(outflows[0]?.merchantName).toBe('Legacy Coffee: Downtown');
  });
});

describe('plaid_recurring_streams encryption at rest', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  const stream = {
    stream_id: 'stream_1',
    account_id: 'acct_1',
    merchant_name: 'Netflix',
    description: 'Netflix subscription',
    frequency: 'MONTHLY',
    average_amount: { amount: 15.99 },
    last_amount: { amount: 15.99 },
    last_date: '2026-08-01',
    is_user_modified: false,
    status: 'MATURE' as string | null,
  };

  it('stores merchant_name and description as ciphertext', async () => {
    const { upsertRecurringStreams } = await import('../src/store/plaid-recurring.js');
    const { db } = await import('../src/db/client.js');
    const { plaidRecurringStreams } = await import('../src/db/schema.js');

    await upsertRecurringStreams(testUserId, [], [stream]);

    const rows = await db().select().from(plaidRecurringStreams).where(eq(plaidRecurringStreams.userId, testUserId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.merchantName ?? '').toMatch(ENVELOPE);
    expect(rows[0]?.description ?? '').toMatch(ENVELOPE);
    expect(rows[0]?.merchantName ?? '').not.toContain('Netflix');
    expect(rows[0]?.description ?? '').not.toContain('Netflix');
  });

  it('getRecurringStreams round-trips the plaintext, including legacy rows', async () => {
    const { upsertRecurringStreams, getRecurringStreams } = await import('../src/store/plaid-recurring.js');
    const { db } = await import('../src/db/client.js');
    const { plaidRecurringStreams } = await import('../src/db/schema.js');

    await upsertRecurringStreams(testUserId, [], [stream]);
    // Legacy plaintext row written before 0048.
    await db().insert(plaidRecurringStreams).values({
      streamId: 'legacy_stream',
      userId: testUserId,
      accountId: 'acct_1',
      direction: 'outflow',
      merchantName: 'Old Gym',
      description: 'Gym membership',
      frequency: 'MONTHLY',
      isActive: true,
    });

    const { outflow } = await getRecurringStreams(testUserId);
    const byId = new Map(outflow.map((s) => [s.streamId, s]));
    expect(byId.get('stream_1')?.merchantName).toBe('Netflix');
    expect(byId.get('stream_1')?.description).toBe('Netflix subscription');
    expect(byId.get('legacy_stream')?.merchantName).toBe('Old Gym');
    expect(byId.get('legacy_stream')?.description).toBe('Gym membership');
  });
});

describe('category_overrides encryption at rest', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('setOverride stores a blind index plus ciphertext, never the plaintext merchant', async () => {
    const { setOverride } = await import('../src/store/overrides.js');
    const { db } = await import('../src/db/client.js');
    const { categoryOverrides } = await import('../src/db/schema.js');

    await setOverride(testUserId, 'Whole Foods', 'groceries');

    const rows = await db().select().from(categoryOverrides).where(eq(categoryOverrides.userId, testUserId));
    expect(rows).toHaveLength(1);
    // PK column: 64-char HMAC hex, not the merchant.
    expect(rows[0]?.merchantName).toMatch(/^[0-9a-f]{64}$/);
    // Display column: AES envelope, not the merchant.
    expect(rows[0]?.merchantNameEnc ?? '').toMatch(ENVELOPE);
    expect(JSON.stringify(rows[0])).not.toMatch(/whole foods/i);
  });

  it('a legacy plaintext override row still matches and lists', async () => {
    const { getOverride, listOverrides } = await import('../src/store/overrides.js');
    const { db } = await import('../src/db/client.js');
    const { categoryOverrides } = await import('../src/db/schema.js');

    // Legacy row: normalized plaintext in the PK column, no encrypted copy.
    await db().insert(categoryOverrides).values({ userId: testUserId, merchantName: 'costco', category: 'household' });

    expect(await getOverride(testUserId, 'Costco')).toBe('household');
    const list = await listOverrides(testUserId);
    expect(list).toEqual([{ merchantName: 'costco', category: 'household' }]);
  });

  it('setOverride migrates a legacy plaintext row instead of duplicating it', async () => {
    const { getOverride, setOverride } = await import('../src/store/overrides.js');
    const { db } = await import('../src/db/client.js');
    const { categoryOverrides } = await import('../src/db/schema.js');

    await db().insert(categoryOverrides).values({ userId: testUserId, merchantName: 'costco', category: 'household' });
    await setOverride(testUserId, 'Costco', 'groceries');

    const rows = await db()
      .select()
      .from(categoryOverrides)
      .where(and(eq(categoryOverrides.userId, testUserId)));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.merchantName).toMatch(/^[0-9a-f]{64}$/);
    expect(await getOverride(testUserId, 'costco')).toBe('groceries');
  });
});

describe('backfillEncryptPii', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('re-encrypts plaintext rows in all three tables and is idempotent', async () => {
    const { db } = await import('../src/db/client.js');
    const { categoryOverrides, plaidRecurringStreams, transactions } = await import('../src/db/schema.js');
    const { backfillEncryptPii } = await import('../src/db/backfill-encrypt-pii.js');
    const { getRecentOutflows } = await import('../src/store/transactions.js');
    const { getOverride, listOverrides } = await import('../src/store/overrides.js');
    const { getRecurringStreams } = await import('../src/store/plaid-recurring.js');

    const date = new Date();
    date.setDate(date.getDate() - 3);
    const dateStr = date.toISOString().slice(0, 10);

    // A database seeded with pre-0048 plaintext rows.
    await db()
      .insert(transactions)
      .values([
        {
          transactionId: 'plain_1',
          userId: testUserId,
          accountId: 'acct_1',
          merchantName: 'Corner Store',
          amount: '-12.00',
          date: dateStr,
          category: 'groceries',
        },
        {
          transactionId: 'plain_2',
          userId: testUserId,
          accountId: 'acct_1',
          merchantName: null,
          amount: '-3.00',
          date: dateStr,
          category: null,
        },
      ]);
    await db().insert(plaidRecurringStreams).values({
      streamId: 'plain_stream',
      userId: testUserId,
      accountId: 'acct_1',
      direction: 'outflow',
      merchantName: 'Spotify',
      description: 'Spotify Premium',
      frequency: 'MONTHLY',
      isActive: true,
    });
    await db().insert(categoryOverrides).values({ userId: testUserId, merchantName: 'spotify', category: 'music' });

    const counts = await backfillEncryptPii();
    expect(counts).toEqual({
      transactionsEncrypted: 1,
      streamMerchantsEncrypted: 1,
      streamDescriptionsEncrypted: 1,
      overridesRewritten: 1,
    });

    // At rest: no plaintext merchant anywhere.
    const txRows = await db().select().from(transactions).where(eq(transactions.userId, testUserId));
    for (const row of txRows) {
      if (row.merchantName !== null) expect(row.merchantName).toMatch(ENVELOPE);
    }
    const streamRows = await db()
      .select()
      .from(plaidRecurringStreams)
      .where(eq(plaidRecurringStreams.userId, testUserId));
    expect(streamRows[0]?.merchantName ?? '').toMatch(ENVELOPE);
    expect(streamRows[0]?.description ?? '').toMatch(ENVELOPE);
    const overrideRows = await db().select().from(categoryOverrides).where(eq(categoryOverrides.userId, testUserId));
    expect(overrideRows[0]?.merchantName).toMatch(/^[0-9a-f]{64}$/);

    // Reads after the backfill return the original plaintext.
    const outflows = await getRecentOutflows(testUserId, 30);
    expect(outflows.map((t) => t.merchantName).sort()).toEqual([null, 'Corner Store'].sort());
    const { outflow } = await getRecurringStreams(testUserId);
    expect(outflow[0]?.merchantName).toBe('Spotify');
    expect(await getOverride(testUserId, 'Spotify')).toBe('music');
    expect(await listOverrides(testUserId)).toEqual([{ merchantName: 'spotify', category: 'music' }]);

    // Second run finds nothing left to do.
    const second = await backfillEncryptPii();
    expect(second).toEqual({
      transactionsEncrypted: 0,
      streamMerchantsEncrypted: 0,
      streamDescriptionsEncrypted: 0,
      overridesRewritten: 0,
    });
  });
});
