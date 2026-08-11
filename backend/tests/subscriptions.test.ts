import { beforeEach, describe, expect, it } from 'vitest';
import type { StoredTransaction } from '../src/store/transactions.js';
import { detectSubscriptions } from '../src/subscriptions/detect.js';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

function tx(overrides: Partial<StoredTransaction>): StoredTransaction {
  return {
    transactionId: overrides.transactionId ?? 'tx_x',
    userId: null,
    accountId: 'acc_1',
    merchantName: 'Spotify',
    amount: '-10.99',
    date: '2026-05-01',
    category: 'entertainment',
    createdAt: new Date(),
    ...overrides,
  } as StoredTransaction;
}

describe('detectSubscriptions', () => {
  it('returns empty for too few occurrences', () => {
    const txs = [tx({ transactionId: 't1', date: '2026-03-01' }), tx({ transactionId: 't2', date: '2026-04-01' })];
    expect(detectSubscriptions(txs)).toEqual([]);
  });

  it('detects a monthly subscription', () => {
    const txs = [
      tx({ transactionId: 't1', date: '2026-02-01' }),
      tx({ transactionId: 't2', date: '2026-03-01' }),
      tx({ transactionId: 't3', date: '2026-04-01' }),
      tx({ transactionId: 't4', date: '2026-05-01' }),
    ];
    const subs = detectSubscriptions(txs);
    expect(subs.length).toBe(1);
    expect(subs[0]?.merchantName).toBe('Spotify');
    expect(subs[0]?.cadenceDays).toBeGreaterThanOrEqual(25);
    expect(subs[0]?.cadenceDays).toBeLessThanOrEqual(35);
    expect(subs[0]?.count).toBe(4);
    expect(subs[0]?.amount).toBeCloseTo(10.99, 2);
  });

  it('rejects when amounts vary by more than tolerance', () => {
    const txs = [
      tx({ transactionId: 't1', date: '2026-02-01', amount: '-10.00' }),
      tx({ transactionId: 't2', date: '2026-03-01', amount: '-10.00' }),
      tx({ transactionId: 't3', date: '2026-04-01', amount: '-20.00' }),
    ];
    expect(detectSubscriptions(txs)).toEqual([]);
  });

  it('rejects irregular cadence (one-off purchases)', () => {
    const txs = [
      tx({ transactionId: 't1', merchantName: 'Amazon', date: '2026-01-01', amount: '-50.00' }),
      tx({ transactionId: 't2', merchantName: 'Amazon', date: '2026-01-15', amount: '-50.00' }),
      tx({ transactionId: 't3', merchantName: 'Amazon', date: '2026-04-20', amount: '-50.00' }),
    ];
    expect(detectSubscriptions(txs)).toEqual([]);
  });

  it('case-insensitive merchant grouping', () => {
    const txs = [
      tx({ transactionId: 't1', merchantName: 'NETFLIX', date: '2026-02-15' }),
      tx({ transactionId: 't2', merchantName: 'netflix', date: '2026-03-15' }),
      tx({ transactionId: 't3', merchantName: 'Netflix', date: '2026-04-15' }),
    ];
    const subs = detectSubscriptions(txs);
    expect(subs.length).toBe(1);
    expect(subs[0]?.count).toBe(3);
  });

  it('finds multiple subscriptions in one batch', () => {
    const make = (m: string, amt: string) => [
      tx({ transactionId: `${m}_1`, merchantName: m, amount: amt, date: '2026-02-15' }),
      tx({ transactionId: `${m}_2`, merchantName: m, amount: amt, date: '2026-03-15' }),
      tx({ transactionId: `${m}_3`, merchantName: m, amount: amt, date: '2026-04-15' }),
    ];
    const subs = detectSubscriptions([...make('Netflix', '-15.99'), ...make('Spotify', '-10.99')]);
    expect(subs.length).toBe(2);
    expect(subs.map((s) => s.merchantName).sort()).toEqual(['Netflix', 'Spotify']);
  });
});

describe('GET /api/subscriptions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns persisted subscriptions detected from transactions', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');
    // Dates are relative: hardcoded 2026 dates aged out of the detector's
    // lookback window and made this test fail purely with the passage of time.
    const monthsAgo = (n: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - n);
      return d.toISOString().slice(0, 10);
    };
    await persistTransactions(testUserId, [
      {
        id: 't1',
        account_id: 'a1',
        amount: '-10.99',
        date: monthsAgo(3),
        description: 'Spotify',
        status: 'posted',
        type: 'card_payment',
        running_balance: null,
        details: { counterparty: { name: 'Spotify' }, category: 'entertainment' },
      },
      {
        id: 't2',
        account_id: 'a1',
        amount: '-10.99',
        date: monthsAgo(2),
        description: 'Spotify',
        status: 'posted',
        type: 'card_payment',
        running_balance: null,
        details: { counterparty: { name: 'Spotify' }, category: 'entertainment' },
      },
      {
        id: 't3',
        account_id: 'a1',
        amount: '-10.99',
        date: monthsAgo(1),
        description: 'Spotify',
        status: 'posted',
        type: 'card_payment',
        running_balance: null,
        details: { counterparty: { name: 'Spotify' }, category: 'entertainment' },
      },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/subscriptions', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ merchantName: string; count: number }[]>();
    expect(body.length).toBe(1);
    expect(body[0]?.merchantName).toBe('Spotify');
    expect(body[0]?.count).toBe(3);

    await app.close();
  });
});
