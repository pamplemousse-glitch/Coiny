import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/plaid/client.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/plaid/client.js')>();
  return {
    ...original,
    accountsBalanceGet: vi.fn(),
    investmentsHoldingsGet: vi.fn(),
    liabilitiesGet: vi.fn(),
  };
});
vi.mock('../src/coinbase/client.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getSpotPrices: vi.fn(),
}));
vi.mock('../src/zerion/client.js', () => ({
  getPortfolio: vi.fn(),
  getTransactions: vi.fn(),
}));
vi.mock('../src/spinwheel/client.js', () => ({
  sendSmsOtp: vi.fn(),
  verifySmsOtp: vi.fn(),
  getDebtProfile: vi.fn(),
  getCreditScore: vi.fn(),
  deleteUser: vi.fn(),
}));

import { getAccounts, getSpotPrices } from '../src/coinbase/client.js';
import { accountsBalanceGet, investmentsHoldingsGet, liabilitiesGet } from '../src/plaid/client.js';
import { getDebtProfile } from '../src/spinwheel/client.js';
import { getPortfolio } from '../src/zerion/client.js';

const mockedAccountsBalanceGet = vi.mocked(accountsBalanceGet);
const mockedInvestmentsHoldingsGet = vi.mocked(investmentsHoldingsGet);
const mockedLiabilitiesGet = vi.mocked(liabilitiesGet);
const _mockedGetAccounts = vi.mocked(getAccounts);
const _mockedGetSpotPrices = vi.mocked(getSpotPrices);
const _mockedGetPortfolio = vi.mocked(getPortfolio);
const mockedGetDebtProfile = vi.mocked(getDebtProfile);

describe('GET /api/net-worth', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
    // Prevent "Cannot read properties of undefined" errors in investment/liability loops
    // when a test sets up Plaid items but doesn't care about these products.
    mockedInvestmentsHoldingsGet.mockResolvedValue({
      accounts: [],
      holdings: [],
      securities: [],
      request_id: 'r',
    });
    mockedLiabilitiesGet.mockResolvedValue({
      accounts: [],
      liabilities: { credit: null, mortgage: null, student: null },
      request_id: 'r',
    });
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
        {
          account_id: 'acct-1',
          name: 'Checking',
          type: 'depository',
          subtype: 'checking',
          official_name: null,
          balances: { current: 1500, available: 1400, iso_currency_code: 'USD', limit: null },
        },
        {
          account_id: 'acct-2',
          name: 'Savings',
          type: 'depository',
          subtype: 'savings',
          official_name: null,
          balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
        },
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

  it('subtracts credit and loan accounts from bank total', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-credit-1', accessToken: 'access-credit-1', userId: testUserId });

    mockedAccountsBalanceGet.mockResolvedValue({
      accounts: [
        {
          account_id: 'acct-checking',
          name: 'Checking',
          type: 'depository',
          subtype: 'checking',
          official_name: null,
          balances: { current: 5000, available: 5000, iso_currency_code: 'USD', limit: null },
        },
        {
          account_id: 'acct-credit',
          name: 'Visa Credit',
          type: 'credit',
          subtype: 'credit card',
          official_name: null,
          balances: { current: 1200, available: 800, iso_currency_code: 'USD', limit: null },
        },
      ],
      request_id: 'req-credit',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ bank: number; total: number }>();
    expect(body.bank).toBe(3800); // 5000 - 1200
    expect(body.total).toBe(3800);

    await app.close();
  });

  it('aggregates investment holdings into investmentsTotal', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-inv-1', accessToken: 'access-inv-1', userId: testUserId });

    mockedAccountsBalanceGet.mockResolvedValue({ accounts: [], request_id: 'r' });
    mockedInvestmentsHoldingsGet.mockResolvedValue({
      accounts: [],
      holdings: [
        {
          account_id: 'acct-brokerage',
          security_id: 'sec-1',
          institution_value: 10000,
          quantity: 10,
          cost_basis: null,
          institution_price: null,
        },
        {
          account_id: 'acct-brokerage',
          security_id: 'sec-2',
          institution_value: 5000,
          quantity: 50,
          cost_basis: null,
          institution_price: null,
        },
      ],
      securities: [
        { security_id: 'sec-1', name: 'Apple Inc', ticker_symbol: 'AAPL', type: 'equity' },
        { security_id: 'sec-2', name: 'Vanguard 500', ticker_symbol: 'VFINX', type: 'mutual_fund' },
      ],
      request_id: 'r',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{
      investments: number;
      total: number;
      accounts: { investments: { securityId: string; ticker: string | null }[] };
    }>();
    expect(body.investments).toBe(15000);
    expect(body.total).toBe(15000);
    expect(body.accounts.investments).toHaveLength(2);
    const aapl = body.accounts.investments.find((h) => h.securityId === 'sec-1');
    expect(aapl?.ticker).toBe('AAPL');

    await app.close();
  });

  it('enriches credit account with liability payment metadata', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-liab-1', accessToken: 'access-liab-1', userId: testUserId });

    mockedAccountsBalanceGet.mockResolvedValue({
      accounts: [
        {
          account_id: 'acct-visa',
          name: 'Visa Card',
          type: 'credit',
          subtype: 'credit card',
          official_name: null,
          balances: { current: 2000, available: 3000, iso_currency_code: 'USD', limit: null },
        },
      ],
      request_id: 'r',
    });
    mockedLiabilitiesGet.mockResolvedValue({
      accounts: [],
      liabilities: {
        credit: [
          {
            account_id: 'acct-visa',
            is_overdue: null,
            minimum_payment_amount: 50,
            next_payment_due_date: '2026-06-15',
            last_statement_balance: null,
            aprs: null,
          },
        ],
        mortgage: null,
        student: null,
      },
      request_id: 'r',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{
      accounts: { bank: Array<{ accountId: string; minPayment: number | null; nextDueDate: string | null }> };
    }>();
    const visa = body.accounts.bank.find((a) => a.accountId === 'acct-visa');
    expect(visa?.minPayment).toBe(50);
    expect(visa?.nextDueDate).toBe('2026-06-15');

    await app.close();
  });

  it('returns liquidCashMonths as null when no transactions exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ liquidCashMonths: number | null }>();
    expect(body.liquidCashMonths).toBeNull();

    await app.close();
  });

  it('computes liquidCashMonths from depository balance and 90-day outflows', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    const { persistTransactions } = await import('../src/store/transactions.js');
    await upsertItem({ itemId: 'item-lc-1', accessToken: 'access-lc-1', userId: testUserId });

    mockedAccountsBalanceGet.mockResolvedValue({
      accounts: [
        {
          account_id: 'acct-checking',
          name: 'Checking',
          type: 'depository',
          subtype: 'checking',
          official_name: null,
          balances: { current: 6000, available: 6000, iso_currency_code: 'USD', limit: null },
        },
      ],
      request_id: 'r',
    });

    // 3 months of $6000 total outflows over 90 days → avgMonthlyBurn = $2000 → 6000/2000 = 3 months
    const txDate = new Date();
    txDate.setDate(txDate.getDate() - 30);
    const dateStr = txDate.toISOString().slice(0, 10);
    await persistTransactions(testUserId, [
      {
        id: 'tx-1',
        account_id: 'acct-checking',
        amount: '-6000',
        date: dateStr,
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
      },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ liquidCashMonths: number | null }>();
    expect(body.liquidCashMonths).toBe(3);

    await app.close();
  });

  it('includes spinwheel debts as negative in total', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-nw-1' });

    mockedGetDebtProfile.mockResolvedValue([
      { id: 'debt-1', type: 'STUDENT_LOAN', balance: 10000, interestRate: 5, minimumPayment: 150 },
      { id: 'debt-2', type: 'CREDIT_CARD', balance: 2500, interestRate: 18, minimumPayment: 75 },
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
