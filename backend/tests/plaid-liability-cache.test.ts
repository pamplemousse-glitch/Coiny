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

import { accountsBalanceGet, investmentsHoldingsGet, liabilitiesGet } from '../src/plaid/client.js';

const mockedAccountsBalanceGet = vi.mocked(accountsBalanceGet);
const mockedInvestmentsHoldingsGet = vi.mocked(investmentsHoldingsGet);
const mockedLiabilitiesGet = vi.mocked(liabilitiesGet);

describe('net-worth liability cache', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
    mockedInvestmentsHoldingsGet.mockResolvedValue({
      accounts: [],
      holdings: [],
      securities: [],
      request_id: 'r',
    });
    mockedAccountsBalanceGet.mockResolvedValue({ accounts: [], request_id: 'r' });
  });

  it('reads liability metadata from cache when cache is populated', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    const { cacheLiabilities } = await import('../src/store/plaid-liabilities.js');

    await upsertItem({ itemId: 'item-cache-1', accessToken: 'access-cache-1', userId: testUserId });

    // Populate the cache directly (simulating what the webhook does).
    await cacheLiabilities(testUserId, {
      accounts: [],
      liabilities: {
        credit: [
          {
            account_id: 'acct-visa',
            is_overdue: false,
            minimum_payment_amount: 75,
            next_payment_due_date: '2026-06-20',
            last_statement_balance: 1500,
            aprs: [{ apr_type: 'purchase_apr', apr_percentage: 22.99 }],
          },
        ],
        mortgage: null,
        student: null,
      },
      request_id: 'r',
    });

    mockedAccountsBalanceGet.mockResolvedValue({
      accounts: [
        {
          account_id: 'acct-visa',
          name: 'Visa Card',
          type: 'credit',
          subtype: 'credit card',
          official_name: null,
          balances: { current: 1500, available: 3500, iso_currency_code: 'USD', limit: null },
        },
      ],
      request_id: 'r',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{
      accounts: {
        bank: Array<{
          accountId: string;
          minPayment: number | null;
          nextDueDate: string | null;
          isOverdue: boolean | null;
          primaryApr: number | null;
        }>;
      };
    }>();

    const visa = body.accounts.bank.find((a) => a.accountId === 'acct-visa');
    expect(visa?.minPayment).toBe(75);
    expect(visa?.nextDueDate).toBe('2026-06-20');
    expect(visa?.isOverdue).toBe(false);
    expect(visa?.primaryApr).toBeCloseTo(22.99);

    // liabilitiesGet should NOT have been called: cache was warm.
    expect(mockedLiabilitiesGet).not.toHaveBeenCalled();

    await app.close();
  });

  it('falls back to live liabilitiesGet when cache is empty', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-live-1', accessToken: 'access-live-1', userId: testUserId });

    mockedLiabilitiesGet.mockResolvedValue({
      accounts: [],
      liabilities: {
        credit: [
          {
            account_id: 'acct-mc',
            is_overdue: null,
            minimum_payment_amount: 30,
            next_payment_due_date: '2026-07-01',
            last_statement_balance: null,
            aprs: null,
          },
        ],
        mortgage: null,
        student: null,
      },
      request_id: 'r',
    });

    mockedAccountsBalanceGet.mockResolvedValue({
      accounts: [
        {
          account_id: 'acct-mc',
          name: 'MasterCard',
          type: 'credit',
          subtype: 'credit card',
          official_name: null,
          balances: { current: 500, available: 4500, iso_currency_code: 'USD', limit: null },
        },
      ],
      request_id: 'r',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<{
      accounts: { bank: Array<{ accountId: string; minPayment: number | null; nextDueDate: string | null }> };
    }>();

    const mc = body.accounts.bank.find((a) => a.accountId === 'acct-mc');
    expect(mc?.minPayment).toBe(30);
    expect(mc?.nextDueDate).toBe('2026-07-01');

    // Cache was empty so the live API was called (snapshot fallback plus the
    // refresh path's cache backfill may each call it).
    expect(mockedLiabilitiesGet).toHaveBeenCalled();

    await app.close();
  });
});
