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
      {
        id: 'tx-income-1',
        account_id: 'acct-1',
        amount: '4000',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'credit',
        running_balance: null,
        details: { category: 'paycheck' },
      },
      {
        id: 'tx-spend-1',
        account_id: 'acct-1',
        amount: '-1000',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
      },
      {
        id: 'tx-spend-2',
        account_id: 'acct-1',
        amount: '-500',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
      },
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

  it('excludes non-income credits from income', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');

    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const dateStr = recent.toISOString().slice(0, 10);

    // A refund is a credit but is not income. Counting it would overstate the
    // savings rate, which is the guardrail the pet reacts to.
    await persistTransactions(testUserId, [
      {
        id: 'tx-small-1',
        account_id: 'acct-1',
        amount: '30',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'credit',
        running_balance: null,
        details: { category: 'shopping' },
      },
      {
        id: 'tx-spend-3',
        account_id: 'acct-1',
        amount: '-200',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
      },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending/summary', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ savingsRate: number | null; monthlyIncome: number }>();
    expect(body.monthlyIncome).toBe(0); // refund excluded
    expect(body.savingsRate).toBeNull(); // no income → null

    await app.close();
  });

  // Regression: any credit ≥ $50 used to count as income, so a self-transfer,
  // a refund or a credit card payment inflated income and therefore the
  // savings rate. Only genuine income categories may count.
  it('does not count transfers between the user’s own accounts as income', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');

    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const dateStr = recent.toISOString().slice(0, 10);

    await persistTransactions(testUserId, [
      {
        id: 'tx-payroll',
        account_id: 'acct-1',
        amount: '2000',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'credit',
        running_balance: null,
        details: { category: 'paycheck' },
      },
      {
        id: 'tx-self-transfer-in',
        account_id: 'acct-1',
        amount: '5000',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'credit',
        running_balance: null,
        details: { category: 'transfer' },
      },
      {
        id: 'tx-self-transfer-out',
        account_id: 'acct-2',
        amount: '-5000',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
        details: { category: 'transfer' },
      },
      {
        id: 'tx-real-spend',
        account_id: 'acct-1',
        amount: '-1000',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
        details: { category: 'groceries' },
      },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending/summary', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ monthlyIncome: number; monthlySpend: number; savingsRate: number | null }>();
    expect(body.monthlyIncome).toBe(2000); // not 7000
    expect(body.monthlySpend).toBe(1000); // transfer out excluded
    expect(body.savingsRate).toBe(50); // round((1 - 1000/2000) * 100)

    await app.close();
  });

  it('returns spendByCategory breakdown for 30-day outflows', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');

    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const dateStr = recent.toISOString().slice(0, 10);

    await persistTransactions(testUserId, [
      {
        id: 'tx-groceries-1',
        account_id: 'acct-1',
        amount: '-80',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
        details: { category: 'groceries' },
      },
      {
        id: 'tx-groceries-2',
        account_id: 'acct-1',
        amount: '-40',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
        details: { category: 'groceries' },
      },
      {
        id: 'tx-gas-1',
        account_id: 'acct-1',
        amount: '-60',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
        details: { category: 'gas' },
      },
      {
        id: 'tx-uncategorized',
        account_id: 'acct-1',
        amount: '-25',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
      },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending/summary', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ spendByCategory: Record<string, number> }>();
    expect(body.spendByCategory['groceries']).toBe(120);
    expect(body.spendByCategory['gas']).toBe(60);
    expect(body.spendByCategory['uncategorized']).toBeUndefined();

    await app.close();
  });

  it('clamps savingsRate to 0 when spend exceeds income', async () => {
    const { persistTransactions } = await import('../src/store/transactions.js');

    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const dateStr = recent.toISOString().slice(0, 10);

    await persistTransactions(testUserId, [
      {
        id: 'tx-inc-2',
        account_id: 'acct-1',
        amount: '1000',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'credit',
        running_balance: null,
        details: { category: 'paycheck' },
      },
      {
        id: 'tx-big-spend',
        account_id: 'acct-1',
        amount: '-3000',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
      },
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
