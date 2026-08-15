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
const mockedGetAccounts = vi.mocked(getAccounts);
const mockedGetSpotPrices = vi.mocked(getSpotPrices);
const mockedGetPortfolio = vi.mocked(getPortfolio);
const mockedGetDebtProfile = vi.mocked(getDebtProfile);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function agoDate(ms: number): Date {
  return new Date(Date.now() - ms);
}

function defaultPlaidMocks(): void {
  mockedInvestmentsHoldingsGet.mockResolvedValue({ accounts: [], holdings: [], securities: [], request_id: 'r' });
  mockedLiabilitiesGet.mockResolvedValue({
    accounts: [],
    liabilities: { credit: null, mortgage: null, student: null },
    request_id: 'r',
  });
  mockedAccountsBalanceGet.mockResolvedValue({ accounts: [], request_id: 'r' });
}

async function seedBankBalances(itemId: string, balance: number, asOf: Date = new Date()): Promise<void> {
  const { upsertPlaidAccountBalances } = await import('../src/store/asset-cache.js');
  await upsertPlaidAccountBalances(
    testUserId,
    itemId,
    [{ accountId: `acct-${itemId}`, name: 'Checking', type: 'depository', subtype: 'checking', balance }],
    asOf,
  );
}

type ClassReading = { value: number | null; asOf: string | null; status: string };
type NetWorthBody = {
  total: number;
  bank: number;
  crypto: number;
  defi: number;
  debts: number;
  declared: number;
  investments: number;
  classes: Record<string, ClassReading>;
  excluded: { count: number; classes: string[] };
  connections: Record<string, boolean>;
  accounts: { bank: Array<{ accountId: string; asOf: string | null }> };
  generatedAt: string;
};

describe('GET /api/net-worth (DB-only read)', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
    defaultPlaidMocks();
  });

  it('returns zeros with no connections', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<NetWorthBody>();
    expect(body.total).toBe(0);
    expect(body.bank).toBe(0);
    expect(body.crypto).toBe(0);
    expect(body.defi).toBe(0);
    expect(body.debts).toBe(0);
    expect(body.classes.bank?.status).toBe('not_connected');
    expect(body.excluded.count).toBe(0);
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

  it('makes no external calls even when every live-class provider is connected', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections, spinwheelConnections, zerionWallets } = await import('../src/db/schema.js');
    await upsertItem({ itemId: 'item-db-1', accessToken: 'access-db-1', userId: testUserId });
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xabc' });
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-db-1' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    expect(mockedAccountsBalanceGet).not.toHaveBeenCalled();
    expect(mockedInvestmentsHoldingsGet).not.toHaveBeenCalled();
    expect(mockedLiabilitiesGet).not.toHaveBeenCalled();
    expect(mockedGetAccounts).not.toHaveBeenCalled();
    expect(mockedGetSpotPrices).not.toHaveBeenCalled();
    expect(mockedGetPortfolio).not.toHaveBeenCalled();
    expect(mockedGetDebtProfile).not.toHaveBeenCalled();

    await app.close();
  });

  it('does not write anything: no daily point, no milestone baseline', async () => {
    const { db } = await import('../src/db/client.js');
    const { eq } = await import('drizzle-orm');
    const { chainWallets, petState } = await import('../src/db/schema.js');
    await db().update(petState).set({ lastNetWorthUsd: '9500' }).where(eq(petState.userId, testUserId));
    await db()
      .insert(chainWallets)
      .values({ userId: testUserId, chain: 'bitcoin', address: '1A1zP1', lastBalanceUsd: '11000' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<NetWorthBody>().total).toBe(11000);

    const { netWorthPointCount } = await import('../src/store/goals.js');
    expect(await netWorthPointCount(testUserId)).toBe(0);
    const [pet] = await db().select().from(petState).where(eq(petState.userId, testUserId));
    expect(pet!.lastNetWorthUsd).toBe('9500');

    await app.close();
  });

  it('serves cached bank balances with status ok and asOf', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-nw-1', accessToken: 'access-test-1', userId: testUserId });
    await seedBankBalances('item-nw-1', 6500);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<NetWorthBody>();
    expect(body.bank).toBe(6500);
    expect(body.total).toBe(6500);
    expect(body.classes.bank?.status).toBe('ok');
    expect(body.classes.bank?.asOf).not.toBeNull();
    expect(body.accounts.bank).toHaveLength(1);
    expect(body.accounts.bank[0]?.asOf).not.toBeNull();

    await app.close();
  });

  it('labels a bank balance older than a day as stale but keeps it in the total', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-stale-1', accessToken: 'access-stale-1', userId: testUserId });
    await seedBankBalances('item-stale-1', 4000, agoDate(3 * DAY));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });

    const body = res.json<NetWorthBody>();
    expect(body.classes.bank?.status).toBe('stale');
    expect(body.total).toBe(4000);
    expect(body.excluded.count).toBe(0);

    await app.close();
  });

  it('excludes a bank balance past the 7-day never-show age from the total', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-old-1', accessToken: 'access-old-1', userId: testUserId });
    await seedBankBalances('item-old-1', 4000, agoDate(8 * DAY));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<NetWorthBody>();
    expect(body.classes.bank?.status).toBe('stale_excluded');
    // The muted last value is still visible; only the total excludes it.
    expect(body.classes.bank?.value).toBe(4000);
    expect(body.bank).toBe(4000);
    expect(body.total).toBe(0);
    expect(body.excluded.count).toBe(1);
    expect(body.excluded.classes).toContain('bank');

    await app.close();
  });

  it('reports pending for a linked bank item with no synced balances yet', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-pend-1', accessToken: 'access-pend-1', userId: testUserId });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });

    const body = res.json<NetWorthBody>();
    expect(body.classes.bank?.status).toBe('pending');
    expect(body.classes.bank?.value).toBeNull();
    expect(body.total).toBe(0);
    expect(body.excluded.classes).toContain('bank');

    await app.close();
  });

  it('reports error, not zero, when the bank refresh has failed with no cache', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    const { recordClassFailure } = await import('../src/store/asset-cache.js');
    await upsertItem({ itemId: 'item-err-1', accessToken: 'access-err-1', userId: testUserId });
    await recordClassFailure(testUserId, 'bank', 'timeout');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<NetWorthBody>();
    expect(body.classes.bank?.status).toBe('error');
    expect(body.classes.bank?.value).toBeNull();
    expect(body.excluded.classes).toContain('bank');

    await app.close();
  });

  it('serves cached spinwheel debts as negative in the total', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    const { recordClassSuccess } = await import('../src/store/asset-cache.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-nw-1' });
    await recordClassSuccess(testUserId, 'debts', {
      valueUsd: 12500,
      payload: {
        items: [
          { id: 'debt-1', type: 'STUDENT_LOAN', balance: 10000, monthlyPayment: 150 },
          { id: 'debt-2', type: 'CREDIT_CARD', balance: 2500, monthlyPayment: 75 },
        ],
        debts: [],
      },
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });

    const body = res.json<NetWorthBody>();
    expect(body.debts).toBe(-12500);
    expect(body.total).toBe(-12500);
    expect(body.connections.spinwheel).toBe(true);

    await app.close();
  });

  it('falls back to plaid-visible debt when the bureau cache is past 45 days', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    const { recordClassSuccess, upsertPlaidAccountBalances } = await import('../src/store/asset-cache.js');
    const { upsertItem } = await import('../src/store/items.js');

    await upsertItem({ itemId: 'item-fb-1', accessToken: 'access-fb-1', userId: testUserId });
    await upsertPlaidAccountBalances(testUserId, 'item-fb-1', [
      { accountId: 'acct-chk', name: 'Checking', type: 'depository', subtype: 'checking', balance: 5000 },
      { accountId: 'acct-card', name: 'Visa', type: 'credit', subtype: 'credit card', balance: 1200 },
    ]);
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-fb-1' });
    await recordClassSuccess(testUserId, 'debts', {
      valueUsd: 9999,
      payload: { items: [], debts: [] },
      asOf: agoDate(46 * DAY),
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });

    const body = res.json<NetWorthBody>();
    // Bureau data past its never-show age: debts drop out of the total and
    // Plaid-visible credit folds into the bank scalar instead. Never both.
    expect(body.classes.debts?.status).toBe('stale_excluded');
    expect(body.bank).toBe(3800); // 5000 - 1200
    expect(body.total).toBe(3800);
    expect(body.debts).toBe(0);
    expect(body.excluded.classes).toContain('debts');

    await app.close();
  });

  it('feeds the declared sheet into the total as a signed net', async () => {
    const { replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const now = new Date();
    await replaceDeclaredAssets(
      testUserId,
      [
        { assetClass: 'home', bucketedValueUsd: 300000, declaredAt: now },
        { assetClass: 'credit_cards', bucketedValueUsd: 5000, declaredAt: now },
        { assetClass: 'student_loans', bucketedValueUsd: 20000, declaredAt: now },
      ],
      now,
    );

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    const body = res.json<NetWorthBody>();
    expect(body.declared).toBe(275000);
    expect(body.total).toBe(275000);
    expect(body.classes.declared?.status).toBe('ok');
    expect(body.classes.declared?.asOf).toBe(now.toISOString());

    await app.close();
  });

  it('never excludes a declared value for age (R-8.2)', async () => {
    const { replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const yearsOld = agoDate(500 * DAY);
    await replaceDeclaredAssets(
      testUserId,
      [{ assetClass: 'car', bucketedValueUsd: 12000, declaredAt: yearsOld }],
      yearsOld,
    );

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    const body = res.json<NetWorthBody>();
    expect(body.classes.declared?.status).toBe('ok');
    expect(body.total).toBe(12000);
    expect(body.excluded.count).toBe(0);

    await app.close();
  });

  it('serves an all-skipped declared sheet as null value, never zero', async () => {
    const { replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const now = new Date();
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'home', bucketedValueUsd: null, declaredAt: now }], now);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    const body = res.json<NetWorthBody>();
    expect(body.classes.declared?.value).toBeNull();
    expect(body.total).toBe(0);
    expect(body.excluded.count).toBe(0);

    await app.close();
  });

  it('computes liquidCashMonths from cached depository balance and 90-day outflows', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    const { persistTransactions } = await import('../src/store/transactions.js');
    await upsertItem({ itemId: 'item-lc-1', accessToken: 'access-lc-1', userId: testUserId });
    await seedBankBalances('item-lc-1', 6000);

    const txDate = new Date();
    txDate.setDate(txDate.getDate() - 30);
    await persistTransactions(testUserId, [
      {
        id: 'tx-1',
        account_id: 'acct-item-lc-1',
        amount: '-6000',
        date: txDate.toISOString().slice(0, 10),
        description: '',
        status: 'posted',
        type: 'debit',
        running_balance: null,
      },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });

    expect(res.json<{ liquidCashMonths: number | null }>().liquidCashMonths).toBe(3);

    await app.close();
  });

  it('returns liquidCashMonths as null when no transactions exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.json<{ liquidCashMonths: number | null }>().liquidCashMonths).toBeNull();

    await app.close();
  });
});

describe('POST /api/net-worth/refresh (explicit live path)', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
    defaultPlaidMocks();
  });

  it('fetches, persists, and returns bank balances', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-r-1', accessToken: 'access-r-1', userId: testUserId });

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

    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<NetWorthBody & { bankRefresh: string }>();
    expect(body.bank).toBe(6500);
    expect(body.total).toBe(6500);
    expect(body.classes.bank?.status).toBe('ok');
    expect(body.accounts.bank).toHaveLength(2);
    expect(body.bankRefresh).toBe('refreshed');

    // A subsequent DB-only GET serves the same numbers without a live call.
    vi.clearAllMocks();
    const get = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(get.json<NetWorthBody>().bank).toBe(6500);
    expect(mockedAccountsBalanceGet).not.toHaveBeenCalled();

    await app.close();
  });

  it('subtracts credit accounts from the bank total when no bureau data exists', async () => {
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
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });

    const body = res.json<NetWorthBody>();
    expect(body.bank).toBe(3800);
    expect(body.total).toBe(3800);

    await app.close();
  });

  it('aggregates investment holdings and persists them for the read path', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-inv-1', accessToken: 'access-inv-1', userId: testUserId });

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
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });

    const body = res.json<
      NetWorthBody & { accounts: { investments: Array<{ securityId: string; ticker: string | null }> } }
    >();
    expect(body.investments).toBe(15000);
    expect(body.total).toBe(15000);
    expect(body.classes.investments?.status).toBe('ok');
    expect(body.accounts.investments).toHaveLength(2);
    expect(body.accounts.investments.find((h) => h.securityId === 'sec-1')?.ticker).toBe('AAPL');

    await app.close();
  });

  it('fetches spinwheel debts live and reports the connection on success', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-nw-1' });

    mockedGetDebtProfile.mockResolvedValue([
      { id: 'debt-1', type: 'STUDENT_LOAN', balance: 10000, interestRate: 5, minimumPayment: 150 },
      { id: 'debt-2', type: 'CREDIT_CARD', balance: 2500, interestRate: 18, minimumPayment: 75 },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });

    const body = res.json<NetWorthBody>();
    expect(body.debts).toBe(-12500);
    expect(body.total).toBe(-12500);
    expect(body.connections.spinwheel).toBe(true);
    expect(body.classes.debts?.status).toBe('ok');

    await app.close();
  });

  it('reports a coinbase outage as status error, never as a silent zero', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets, coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });
    // A healthy class alongside, to prove the outage stays contained.
    await db()
      .insert(chainWallets)
      .values({ userId: testUserId, chain: 'bitcoin', address: 'bc1q', lastBalanceUsd: '500' });

    mockedGetAccounts.mockRejectedValue(new Error('vendor down'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<NetWorthBody>();
    expect(body.classes.crypto?.status).toBe('error');
    expect(body.classes.crypto?.value).toBeNull();
    expect(body.crypto).toBe(0);
    expect(body.total).toBe(500);
    expect(body.excluded.classes).toContain('crypto');
    expect(body.connections.coinbase).toBe(false);

    await app.close();
  });

  it('keeps serving the last good crypto value when a later refresh fails', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    const { recordClassSuccess } = await import('../src/store/asset-cache.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });
    await recordClassSuccess(testUserId, 'crypto', {
      valueUsd: 2500,
      payload: { positions: [] },
      asOf: agoDate(2 * DAY),
    });

    mockedGetAccounts.mockRejectedValue(new Error('vendor down'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });

    const body = res.json<NetWorthBody>();
    expect(body.classes.crypto?.status).toBe('stale');
    expect(body.classes.crypto?.value).toBe(2500);
    expect(body.total).toBe(2500);

    await app.close();
  });

  it('reports a zerion outage as defi status error', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xdead' });

    mockedGetPortfolio.mockRejectedValue(new Error('zerion down'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });

    const body = res.json<NetWorthBody>();
    expect(body.classes.defi?.status).toBe('error');
    expect(body.excluded.classes).toContain('defi');

    await app.close();
  });

  it('caps the billed bank pull at 4 per day and keeps refreshing free classes', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-cap-1', accessToken: 'access-cap-1', userId: testUserId });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    for (let i = 0; i < 4; i++) {
      const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
      expect(res.json<{ bankRefresh: string }>().bankRefresh).toBe('refreshed');
    }
    expect(mockedAccountsBalanceGet).toHaveBeenCalledTimes(4);

    const fifth = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(fifth.statusCode).toBe(200);
    expect(fifth.json<{ bankRefresh: string }>().bankRefresh).toBe('capped');
    expect(mockedAccountsBalanceGet).toHaveBeenCalledTimes(4);
    // Holdings are subscription-billed, not per-call: still refreshed.
    expect(mockedInvestmentsHoldingsGet).toHaveBeenCalledTimes(5);

    // The cap decision is server-observed instrumentation (R-24.2): four
    // refreshed rows then one capped row, recorded here, never by the device.
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const events = await listAnalyticsEvents(testUserId, 'net_worth_refreshed');
    expect(events.map((e) => e.properties)).toEqual([
      { bank: 'refreshed' },
      { bank: 'refreshed' },
      { bank: 'refreshed' },
      { bank: 'refreshed' },
      { bank: 'capped' },
    ]);

    await app.close();
  });

  it('fires the milestone reaction and advances the baseline on refresh', async () => {
    const { db } = await import('../src/db/client.js');
    const { eq } = await import('drizzle-orm');
    const { chainWallets, petState } = await import('../src/db/schema.js');
    await db().update(petState).set({ lastNetWorthUsd: '9500' }).where(eq(petState.userId, testUserId));
    await db()
      .insert(chainWallets)
      .values({ userId: testUserId, chain: 'bitcoin', address: '1A1zP1', lastBalanceUsd: '11000' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<NetWorthBody>().total).toBe(11000);

    const [updated] = await db().select().from(petState).where(eq(petState.userId, testUserId));
    expect(parseFloat(updated!.lastNetWorthUsd!)).toBe(11000);

    await app.close();
  });

  it('does not advance the milestone baseline while the total is degraded', async () => {
    const { db } = await import('../src/db/client.js');
    const { eq } = await import('drizzle-orm');
    const { chainWallets, coinbaseConnections, petState } = await import('../src/db/schema.js');
    await db().update(petState).set({ lastNetWorthUsd: '9500' }).where(eq(petState.userId, testUserId));
    await db()
      .insert(chainWallets)
      .values({ userId: testUserId, chain: 'bitcoin', address: '1A1zP1', lastBalanceUsd: '11000' });
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });
    mockedGetAccounts.mockRejectedValue(new Error('vendor down'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const [pet] = await db().select().from(petState).where(eq(petState.userId, testUserId));
    // A total computed while a vendor is down must never become the baseline.
    expect(pet!.lastNetWorthUsd).toBe('9500');

    await app.close();
  });
});

describe('POST /api/net-worth/refresh goal system refresh', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
    defaultPlaidMocks();
  });

  it('records a net worth point and creates ladder state', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const { netWorthPointCount, getLadderState } = await import('../src/store/goals.js');
    expect(await netWorthPointCount(testUserId)).toBe(1);
    const ladder = await getLadderState(testUserId);
    expect(ladder?.currentRung).toBe(0);
    expect(ladder?.rungs['0']?.status).toBe('active');

    await app.close();
  });

  it('feeds measured liquid cash into the ladder once a bank is linked', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-goal-1', accessToken: 'access-goal-1', userId: testUserId });

    mockedAccountsBalanceGet.mockResolvedValue({
      accounts: [
        {
          account_id: 'acct-goal',
          name: 'Checking',
          type: 'depository',
          subtype: 'checking',
          official_name: null,
          balances: { current: 3000, available: 3000, iso_currency_code: 'USD', limit: null },
        },
      ],
      request_id: 'r',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const { getLadderState, getLadderInputs, getDerivedState } = await import('../src/store/goals.js');
    expect((await getLadderState(testUserId))?.rungs['0']?.status).toBe('completed');
    expect((await getLadderInputs(testUserId))?.liquidCash).toBe(3000);
    expect((await getDerivedState(testUserId))?.liquidCash).toBe(3000);

    await app.close();
  });

  it('feeds high-APR bureau debt into the ladder inputs', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-goal-1' });

    mockedGetDebtProfile.mockResolvedValue([
      { id: 'debt-hi', type: 'CREDIT_CARD', balance: 2500, interestRate: 18, minimumPayment: 75 },
      { id: 'debt-lo', type: 'STUDENT_LOAN', balance: 10_000, interestRate: 5, minimumPayment: 150 },
    ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const { getLadderInputs } = await import('../src/store/goals.js');
    expect((await getLadderInputs(testUserId))?.highAprDebtBalances).toEqual([2500]);

    await app.close();
  });
});
