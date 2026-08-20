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

import { accountsBalanceGet, investmentsHoldingsGet, liabilitiesGet } from '../src/plaid/client.js';
import type { InvestmentsHoldingsGetResponse } from '../src/plaid/types.js';

const mockedBalances = vi.mocked(accountsBalanceGet);
const mockedHoldings = vi.mocked(investmentsHoldingsGet);
const mockedLiabilities = vi.mocked(liabilitiesGet);

/** One ETF held inside a Roth IRA, and one cash sweep in the same account.
 *
 *  Annotated with the real response type rather than left to inference: from
 *  the literal alone TypeScript infers `type: string`, so the test below that
 *  overrides it with `null` (the case where Plaid cannot classify a security)
 *  fails to compile. */
function holdingsResponse(): InvestmentsHoldingsGetResponse {
  return {
    accounts: [],
    holdings: [
      {
        account_id: 'acct-roth',
        security_id: 'sec-etf',
        institution_value: 12_000,
        quantity: 40,
        cost_basis: null,
        institution_price: null,
      },
      {
        account_id: 'acct-roth',
        security_id: 'sec-cash',
        institution_value: 500,
        quantity: 500,
        cost_basis: null,
        institution_price: null,
      },
    ],
    securities: [
      { security_id: 'sec-etf', name: 'Vanguard Total Market', ticker_symbol: 'VTI', type: 'etf' },
      { security_id: 'sec-cash', name: 'Cash Sweep', ticker_symbol: null, type: 'cash' },
    ],
    request_id: 'r',
  };
}

beforeEach(async () => {
  vi.resetAllMocks();
  await resetDatabase();
  mockedBalances.mockResolvedValue({ accounts: [], request_id: 'r' });
  mockedLiabilities.mockResolvedValue({
    accounts: [],
    liabilities: { credit: null, mortgage: null, student: null },
    request_id: 'r',
  });
  const { upsertItem } = await import('../src/store/items.js');
  await upsertItem({ itemId: 'item-hold', accessToken: 'access-hold', userId: testUserId });
});

describe('holdings carry their security type and account', () => {
  // Without securityType an uninvested cash sweep and a stock ETF are the same
  // row to the client, which is the same "the label was thrown away" defect as
  // the account subtypes.
  it('records the security type from the securities list', async () => {
    mockedHoldings.mockResolvedValue(holdingsResponse());
    const { fetchPlaidSnapshot } = await import('../src/goals/snapshot.js');

    const snap = await fetchPlaidSnapshot(testUserId);
    const byId = new Map(snap.investmentHoldings.map((h) => [h.securityId, h]));

    expect(byId.get('sec-etf')?.securityType).toBe('etf');
    expect(byId.get('sec-cash')?.securityType).toBe('cash');
  });

  it('attributes each holding to the account that holds it', async () => {
    mockedHoldings.mockResolvedValue(holdingsResponse());
    const { fetchPlaidSnapshot } = await import('../src/goals/snapshot.js');

    const snap = await fetchPlaidSnapshot(testUserId);

    expect(snap.investmentHoldings.every((h) => h.accountId === 'acct-roth')).toBe(true);
  });

  it('leaves the fields null when Plaid omits them rather than inventing a type', async () => {
    const response = holdingsResponse();
    response.securities = [{ security_id: 'sec-etf', name: 'Mystery', ticker_symbol: null, type: null }];
    response.holdings = [response.holdings[0]!];
    mockedHoldings.mockResolvedValue(response);

    const { fetchPlaidSnapshot } = await import('../src/goals/snapshot.js');
    const snap = await fetchPlaidSnapshot(testUserId);

    expect(snap.investmentHoldings[0]?.securityType).toBeNull();
  });

  it('still totals correctly, so this is additive and not a behaviour change', async () => {
    mockedHoldings.mockResolvedValue(holdingsResponse());
    const { fetchPlaidSnapshot } = await import('../src/goals/snapshot.js');

    const snap = await fetchPlaidSnapshot(testUserId);
    expect(snap.investmentsTotal).toBe(12_500);
  });
});

// The scheduler refreshes investments through networth/refresh.ts, which
// assembles holdings into the SAME cache payload with its own loop. It used an
// inline structural type, so the two could drift and the compiler would not
// say anything: the scheduled path would quietly keep writing the older shape.
describe('the scheduler refresh writes the same shape', () => {
  it('caches holdings with securityType and accountId', async () => {
    mockedHoldings.mockResolvedValue(holdingsResponse());

    const { refreshScheduledClass } = await import('../src/networth/refresh.js');
    const outcome = await refreshScheduledClass(testUserId, 'investments');
    expect(outcome).toBe('refreshed');

    const { getClassCacheRow } = await import('../src/store/asset-cache.js');
    const row = await getClassCacheRow(testUserId, 'investments');
    const cached = (row?.payload as { holdings?: Array<Record<string, unknown>> } | null)?.holdings ?? [];

    expect(cached.length).toBe(2);
    expect(cached.map((h) => h.securityType).sort()).toEqual(['cash', 'etf']);
    expect(cached.every((h) => h.accountId === 'acct-roth')).toBe(true);
  });
});

// Both paths must apply vesting. The type was already shared to stop them
// drifting; the assembly logic was not, so a rule added to one would have been
// silently missing from the other. It is now one function used by both.
describe('vesting reaches the net-worth number on both paths', () => {
  function rsuGrant(): InvestmentsHoldingsGetResponse {
    return {
      accounts: [],
      holdings: [
        {
          account_id: 'acct-stockplan',
          security_id: 'sec-rsu',
          institution_price: 300,
          institution_value: 180_000,
          quantity: 600,
          cost_basis: null,
          vested_quantity: 200,
          vested_value: 60_000,
        },
      ],
      securities: [{ security_id: 'sec-rsu', name: 'Acme Inc', ticker_symbol: 'ACME', type: 'equity' }],
      request_id: 'req-rsu',
    };
  }

  it('the scheduled refresh caches only the vested value', async () => {
    mockedHoldings.mockResolvedValue(rsuGrant());

    const { refreshScheduledClass } = await import('../src/networth/refresh.js');
    await refreshScheduledClass(testUserId, 'investments');

    const { getClassCacheRow } = await import('../src/store/asset-cache.js');
    const row = await getClassCacheRow(testUserId, 'investments');

    // $180,000 granted, $60,000 vested. Only the vested part is the user's.
    expect(Number(row?.valueUsd)).toBeCloseTo(60_000, 0);
    const payload = row?.payload as { unvested?: number } | null;
    expect(payload?.unvested).toBeCloseTo(120_000, 0);
  });

  it('the manual snapshot path agrees with it', async () => {
    mockedBalances.mockResolvedValue({ accounts: [], request_id: 'r' });
    mockedLiabilities.mockRejectedValue(new Error('no liabilities'));
    mockedHoldings.mockResolvedValue(rsuGrant());

    const { fetchPlaidSnapshot } = await import('../src/goals/snapshot.js');
    const snap = await fetchPlaidSnapshot(testUserId);

    expect(snap.investmentsTotal).toBeCloseTo(60_000, 0);
  });
});
