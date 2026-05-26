import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase } from './db-helper.js';

vi.mock('../src/ynab/client.js', () => ({
  getBudgets: vi.fn(),
  getAccounts: vi.fn(),
  getTotalNetWorth: vi.fn(),
}));

import { getAccounts, getBudgets, getTotalNetWorth } from '../src/ynab/client.js';

const mockedGetBudgets = vi.mocked(getBudgets);
const mockedGetAccounts = vi.mocked(getAccounts);
const mockedGetTotalNetWorth = vi.mocked(getTotalNetWorth);

const fakeBudget = { id: 'budget-1', name: 'My Budget', currency_format: { iso_code: 'USD' } };
const fakeAccount = {
  id: 'acct-1',
  name: 'Checking',
  type: 'checking',
  balance: 250000,
  closed: false,
  deleted: false,
};

describe('POST /api/ynab/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('stores the API key and returns ok', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/ynab/connect',
      headers: authHeader(),
      payload: { apiKey: 'test-ynab-token' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean }>().ok).toBe(true);

    await app.close();
  });

  it('returns 400 without apiKey', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/ynab/connect', headers: authHeader(), payload: {} });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/ynab/connect', payload: { apiKey: 'x' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});

describe('GET /api/ynab/budgets', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/ynab/budgets', headers: authHeader() });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('returns budget list when connected', async () => {
    mockedGetBudgets.mockResolvedValue([fakeBudget]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/ynab/connect', headers: authHeader(), payload: { apiKey: 'tok' } });
    const res = await app.inject({ method: 'GET', url: '/api/ynab/budgets', headers: authHeader() });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ id: string; name: string }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.name).toBe('My Budget');

    await app.close();
  });
});

describe('GET /api/ynab/accounts', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns accounts with USD balance', async () => {
    mockedGetBudgets.mockResolvedValue([fakeBudget]);
    mockedGetAccounts.mockResolvedValue([fakeAccount]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/ynab/connect', headers: authHeader(), payload: { apiKey: 'tok' } });
    const res = await app.inject({ method: 'GET', url: '/api/ynab/accounts', headers: authHeader() });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ balanceUsd: number }[]>();
    expect(body[0]?.balanceUsd).toBe(250); // 250000 milliunits = $250

    await app.close();
  });
});

describe('POST /api/ynab/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('caches total net worth from YNAB', async () => {
    mockedGetTotalNetWorth.mockResolvedValue(12345.67);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/ynab/connect', headers: authHeader(), payload: { apiKey: 'tok' } });
    const res = await app.inject({ method: 'POST', url: '/api/ynab/sync', headers: authHeader() });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ total: number }>().total).toBe(12345.67);

    await app.close();
  });
});

describe('DELETE /api/ynab/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes the connection', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/ynab/connect', headers: authHeader(), payload: { apiKey: 'tok' } });
    const res = await app.inject({ method: 'DELETE', url: '/api/ynab/connect', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const check = await app.inject({ method: 'GET', url: '/api/ynab/budgets', headers: authHeader() });
    expect(check.statusCode).toBe(404);

    await app.close();
  });
});
