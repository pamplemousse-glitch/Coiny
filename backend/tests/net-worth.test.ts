import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/plaid/client.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/plaid/client.js')>();
  return { ...original, accountsBalanceGet: vi.fn() };
});
vi.mock('../src/coinbase/client.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
}));
vi.mock('../src/coingecko/client.js', () => ({
  getPrices: vi.fn(),
}));
vi.mock('../src/zerion/client.js', () => ({
  getPortfolio: vi.fn(),
  getTransactions: vi.fn(),
}));
vi.mock('../src/spinwheel/client.js', () => ({
  sendSmsOtp: vi.fn(),
  verifySmsOtp: vi.fn(),
  getDebts: vi.fn(),
}));

import { accountsBalanceGet } from '../src/plaid/client.js';
import { getAccounts } from '../src/coinbase/client.js';
import { getPrices } from '../src/coingecko/client.js';
import { getPortfolio } from '../src/zerion/client.js';
import { getDebts } from '../src/spinwheel/client.js';

const mockedAccountsBalanceGet = vi.mocked(accountsBalanceGet);
const mockedGetAccounts = vi.mocked(getAccounts);
const mockedGetPrices = vi.mocked(getPrices);
const mockedGetPortfolio = vi.mocked(getPortfolio);
const mockedGetDebts = vi.mocked(getDebts);

describe('GET /api/net-worth', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns zeros with no connections', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{
      total: number;
      bank: number;
      crypto: number;
      defi: number;
      debts: number;
      connections: { coinbase: boolean; zerion: boolean; spinwheel: boolean };
    }>();
    expect(body.total).toBe(0);
    expect(body.bank).toBe(0);
    expect(body.crypto).toBe(0);
    expect(body.defi).toBe(0);
    expect(body.debts).toBe(0);
    expect(body.connections.coinbase).toBe(false);
    expect(body.connections.zerion).toBe(false);
    expect(body.connections.spinwheel).toBe(false);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('aggregates bank balances from Plaid items', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-nw-1', accessToken: 'access-test-1', userId: testUserId });

    mockedAccountsBalanceGet.mockResolvedValue({
      accounts: [
        { account_id: 'acct-1', name: 'Checking', type: 'depository', subtype: 'checking', official_name: null, balances: { current: 1500, available: 1400, iso_currency_code: 'USD', limit: null } },
        { account_id: 'acct-2', name: 'Savings', type: 'depository', subtype: 'savings', official_name: null, balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null } },
      ],
      request_id: 'req-1',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ bank: number; total: number; accounts: { bank: unknown[] } }>();
    expect(body.bank).toBe(6500);
    expect(body.accounts.bank).toHaveLength(2);
    expect(body.total).toBe(6500);

    await app.close();
  });

  it('includes spinwheel debts as negative in total', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-nw-1' });

    mockedGetDebts.mockResolvedValue([
      { id: 'debt-1', type: 'student_loan', balance: 10000, interestRate: 5, minimumPayment: 150 },
      { id: 'debt-2', type: 'credit_card', balance: 2500, interestRate: 18, minimumPayment: 75 },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ debts: number; total: number; connections: { spinwheel: boolean } }>();
    expect(body.debts).toBe(-12500);
    expect(body.total).toBe(-12500);
    expect(body.connections.spinwheel).toBe(true);

    await app.close();
  });
});
