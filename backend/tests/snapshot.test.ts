import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/plaid/client.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/plaid/client.js')>();
  return {
    ...original,
    accountsBalanceGet: vi.fn(),
    investmentsHoldingsGet: vi.fn(),
    liabilitiesGet: vi.fn(),
  };
});
vi.mock('../src/spinwheel/client.js', () => ({
  sendSmsOtp: vi.fn(),
  verifySmsOtp: vi.fn(),
  getDebtProfile: vi.fn(),
  getCreditScore: vi.fn(),
  deleteUser: vi.fn(),
}));

import { fetchDebtSnapshot, fetchPlaidSnapshot, highAprDebtBalances } from '../src/goals/snapshot.js';
import { accountsBalanceGet, investmentsHoldingsGet, liabilitiesGet } from '../src/plaid/client.js';
import { getDebtProfile } from '../src/spinwheel/client.js';

const mockedAccountsBalanceGet = vi.mocked(accountsBalanceGet);
const mockedInvestmentsHoldingsGet = vi.mocked(investmentsHoldingsGet);
const mockedLiabilitiesGet = vi.mocked(liabilitiesGet);
const mockedGetDebtProfile = vi.mocked(getDebtProfile);

function emptyPlaidMocks(): void {
  mockedInvestmentsHoldingsGet.mockResolvedValue({ accounts: [], holdings: [], securities: [], request_id: 'r' });
  mockedLiabilitiesGet.mockResolvedValue({
    accounts: [],
    liabilities: { credit: null, mortgage: null, student: null },
    request_id: 'r',
  });
}

describe('fetchPlaidSnapshot', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
    emptyPlaidMocks();
  });

  it('reports no connected account and unknown balances with no items', async () => {
    const snap = await fetchPlaidSnapshot(testUserId);
    expect(snap.hasConnectedAccount).toBe(false);
    expect(snap.balancesLoaded).toBe(false);
    expect(snap.bankTotal).toBe(0);
  });

  it('sums depository balances and counts only positive ones as liquid', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-snap-1', accessToken: 'access-snap-1', userId: testUserId });

    mockedAccountsBalanceGet.mockResolvedValue({
      accounts: [
        {
          account_id: 'a-1',
          name: 'Checking',
          type: 'depository',
          subtype: 'checking',
          official_name: null,
          balances: { current: 3000, available: 3000, iso_currency_code: 'USD', limit: null },
        },
        {
          account_id: 'a-2',
          name: 'Overdrawn',
          type: 'depository',
          subtype: 'checking',
          official_name: null,
          balances: { current: -200, available: -200, iso_currency_code: 'USD', limit: null },
        },
      ],
      request_id: 'r',
    });

    const snap = await fetchPlaidSnapshot(testUserId);
    expect(snap.hasConnectedAccount).toBe(true);
    expect(snap.balancesLoaded).toBe(true);
    expect(snap.bankTotal).toBe(2800);
    expect(snap.liquidDeposits).toBe(3000);
  });

  it('keeps credit balances out of bankTotal for later reconciliation', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-snap-2', accessToken: 'access-snap-2', userId: testUserId });

    mockedAccountsBalanceGet.mockResolvedValue({
      accounts: [
        {
          account_id: 'a-credit',
          name: 'Visa',
          type: 'credit',
          subtype: 'credit card',
          official_name: null,
          balances: { current: 1200, available: 800, iso_currency_code: 'USD', limit: null },
        },
      ],
      request_id: 'r',
    });

    const snap = await fetchPlaidSnapshot(testUserId);
    expect(snap.bankTotal).toBe(0);
    expect(snap.plaidDebtTotal).toBe(1200);
  });

  it('reports balances as not loaded when every balance call fails', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-snap-3', accessToken: 'access-snap-3', userId: testUserId });

    mockedAccountsBalanceGet.mockRejectedValue(new Error('ITEM_LOGIN_REQUIRED'));

    const snap = await fetchPlaidSnapshot(testUserId);
    expect(snap.hasConnectedAccount).toBe(true);
    expect(snap.balancesLoaded).toBe(false);
  });

  it('sums investment holdings across securities', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-snap-4', accessToken: 'access-snap-4', userId: testUserId });

    mockedAccountsBalanceGet.mockResolvedValue({ accounts: [], request_id: 'r' });
    mockedInvestmentsHoldingsGet.mockResolvedValue({
      accounts: [],
      holdings: [
        {
          account_id: 'b-1',
          security_id: 'sec-1',
          institution_value: 7000,
          quantity: 7,
          cost_basis: null,
          institution_price: null,
        },
      ],
      securities: [{ security_id: 'sec-1', name: 'Apple Inc', ticker_symbol: 'AAPL', type: 'equity' }],
      request_id: 'r',
    });

    const snap = await fetchPlaidSnapshot(testUserId);
    expect(snap.investmentsTotal).toBe(7000);
    expect(snap.investmentHoldings[0]?.ticker).toBe('AAPL');
  });
});

describe('fetchDebtSnapshot', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns an unconnected snapshot when spinwheel is not linked', async () => {
    const snap = await fetchDebtSnapshot(testUserId);
    expect(snap.spinwheelConnected).toBe(false);
    expect(snap.spinwheelDebtsLoaded).toBe(false);
  });

  it('totals debts from the bureau profile', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-snap-1' });

    mockedGetDebtProfile.mockResolvedValue([
      { id: 'd-1', type: 'CREDIT_CARD', balance: 2500, interestRate: 18, minimumPayment: 75 },
      { id: 'd-2', type: 'STUDENT_LOAN', balance: 10_000, interestRate: 5, minimumPayment: 150 },
    ]);

    const snap = await fetchDebtSnapshot(testUserId);
    expect(snap.spinwheelDebtsLoaded).toBe(true);
    expect(snap.debtsTotal).toBe(12_500);
    expect(snap.debtItems).toHaveLength(2);
  });

  it('marks connected but not loaded when the bureau fetch throws', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-snap-2' });

    mockedGetDebtProfile.mockRejectedValue(new Error('bureau timeout'));

    const snap = await fetchDebtSnapshot(testUserId);
    expect(snap.spinwheelConnected).toBe(true);
    expect(snap.spinwheelDebtsLoaded).toBe(false);
    expect(snap.debtsTotal).toBe(0);
  });
});

describe('highAprDebtBalances', () => {
  const bank = (over: Partial<Parameters<typeof highAprDebtBalances>[1][number]> = {}) => ({
    accountId: 'a',
    name: 'Card',
    type: 'credit',
    balance: 1000,
    minPayment: null,
    nextDueDate: null,
    isOverdue: null,
    primaryApr: 24.99,
    ...over,
  });

  const loadedDebts = (debts: Parameters<typeof highAprDebtBalances>[0]['debts']) => ({
    debtsTotal: 0,
    debtItems: [],
    spinwheelConnected: true,
    spinwheelDebtsLoaded: true,
    debts,
  });

  const notLoaded = {
    debtsTotal: 0,
    debtItems: [],
    spinwheelConnected: false,
    spinwheelDebtsLoaded: false,
    debts: [],
  };

  it('takes bureau balances above the threshold when spinwheel loaded', () => {
    const result = highAprDebtBalances(
      loadedDebts([
        { id: 'd-1', type: 'CREDIT_CARD', balance: 2500, interestRate: 18 },
        { id: 'd-2', type: 'STUDENT_LOAN', balance: 10_000, interestRate: 5 },
      ]),
      [bank()],
    );
    expect(result).toEqual([2500]);
  });

  it('excludes a rate exactly at the 10% threshold', () => {
    const result = highAprDebtBalances(
      loadedDebts([{ id: 'd-1', type: 'PERSONAL_LOAN', balance: 5000, interestRate: 10 }]),
      [],
    );
    expect(result).toEqual([]);
  });

  it('counts an unknown-rate credit card as high APR', () => {
    const result = highAprDebtBalances(
      loadedDebts([{ id: 'd-1', type: 'CREDIT_CARD', balance: 900, interestRate: null }]),
      [],
    );
    expect(result).toEqual([900]);
  });

  it('does not count an unknown-rate non-card loan', () => {
    const result = highAprDebtBalances(
      loadedDebts([{ id: 'd-1', type: 'HOME_LOAN', balance: 300_000, interestRate: null }]),
      [],
    );
    expect(result).toEqual([]);
  });

  it('ignores zero and negative balances', () => {
    const result = highAprDebtBalances(
      loadedDebts([{ id: 'd-1', type: 'CREDIT_CARD', balance: 0, interestRate: 25 }]),
      [],
    );
    expect(result).toEqual([]);
  });

  it('falls back to Plaid credit accounts when the bureau did not load', () => {
    const result = highAprDebtBalances(notLoaded, [
      bank({ accountId: 'a-1', balance: 1200, primaryApr: 24.99 }),
      bank({ accountId: 'a-2', balance: 800, primaryApr: 6.5 }),
      bank({ accountId: 'a-3', type: 'depository', balance: 5000, primaryApr: null }),
    ]);
    expect(result).toEqual([1200]);
  });

  it('counts an unknown-APR Plaid credit account in the fallback', () => {
    const result = highAprDebtBalances(notLoaded, [bank({ balance: 700, primaryApr: null })]);
    expect(result).toEqual([700]);
  });

  it('never mixes the two sources', () => {
    // Bureau loaded and clean; a Plaid card with a high APR must not leak in,
    // since the bureau already saw the same card.
    const result = highAprDebtBalances(loadedDebts([]), [bank({ balance: 1200, primaryApr: 24.99 })]);
    expect(result).toEqual([]);
  });
});
