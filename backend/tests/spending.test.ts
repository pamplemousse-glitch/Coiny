import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

describe('GET /api/spending/summary', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns zeros and null savingsRate when no transactions exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending/summary', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ monthlySpend: number; monthlyIncome: number; savingsRate: number | null }>();
    expect(body.monthlySpend).toBe(0);
    expect(body.monthlyIncome).toBe(0);
    expect(body.savingsRate).toBeNull();

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending/summary' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('computes savingsRate from recent transactions', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');

    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const dateStr = recent.toISOString().slice(0, 10);

    await persistTransactions(testUserId, [
      { id: 'tx-income-1', account_id: 'acct-1', amount: '4000', date: dateStr, description: '', status: 'posted', type: 'credit', running_balance: null },
      { id: 'tx-spend-1', account_id: 'acct-1', amount: '-1000', date: dateStr, description: '', status: 'posted', type: 'debit', running_balance: null },
      { id: 'tx-spend-2', account_id: 'acct-1', amount: '-500', date: dateStr, description: '', status: 'posted', type: 'debit', running_balance: null },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending/summary', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ monthlySpend: number; monthlyIncome: number; savingsRate: number | null }>();
    expect(body.monthlyIncome).toBe(4000);
    expect(body.monthlySpend).toBe(1500);
    // savingsRate = round((1 - 1500/4000) * 100) = round(62.5) = 63
    expect(body.savingsRate).toBe(63);

    await app.close();
  });

  it('excludes small deposits from income', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');

    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const dateStr = recent.toISOString().slice(0, 10);

    // Small deposit ($30) should be excluded; only outflows count
    await persistTransactions(testUserId, [
      { id: 'tx-small-1', account_id: 'acct-1', amount: '30', date: dateStr, description: '', status: 'posted', type: 'credit', running_balance: null },
      { id: 'tx-spend-3', account_id: 'acct-1', amount: '-200', date: dateStr, description: '', status: 'posted', type: 'debit', running_balance: null },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending/summary', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ savingsRate: number | null; monthlyIncome: number }>();
    expect(body.monthlyIncome).toBe(0); // $30 excluded
    expect(body.savingsRate).toBeNull(); // no income → null

    await app.close();
  });

  it('clamps savingsRate to 0 when spend exceeds income', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');

    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const dateStr = recent.toISOString().slice(0, 10);

    await persistTransactions(testUserId, [
      { id: 'tx-inc-2', account_id: 'acct-1', amount: '1000', date: dateStr, description: '', status: 'posted', type: 'credit', running_balance: null },
      { id: 'tx-big-spend', account_id: 'acct-1', amount: '-3000', date: dateStr, description: '', status: 'posted', type: 'debit', running_balance: null },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending/summary', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ savingsRate: number | null }>();
    expect(body.savingsRate).toBe(0);

    await app.close();
  });
});
