// Tests for src/api/debts.ts via app.inject(). The database is real (PGlite);
// only the two provider HTTP clients are mocked.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiabilitiesGetResponse } from '../src/plaid/types.js';
import type { SpinwheelDebt } from '../src/spinwheel/client.js';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/plaid/client.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/plaid/client.js')>();
  return { ...original, liabilitiesGet: vi.fn() };
});
vi.mock('../src/spinwheel/client.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/spinwheel/client.js')>();
  return { ...original, getDebtProfile: vi.fn() };
});

import { liabilitiesGet } from '../src/plaid/client.js';
import { getDebtProfile } from '../src/spinwheel/client.js';
import { ingestPlaidLiabilities, ingestSpinwheelDebts } from '../src/store/debts.js';

const mockedLiabilitiesGet = vi.mocked(liabilitiesGet);
const mockedGetDebtProfile = vi.mocked(getDebtProfile);

function plaidCardResponse(): LiabilitiesGetResponse {
  return {
    accounts: [
      {
        account_id: 'plaid-card-1',
        balances: { available: null, current: 1200, iso_currency_code: 'USD', limit: 5000 },
        name: 'Chase Credit Card',
        official_name: 'Chase Sapphire Preferred',
        type: 'credit',
        subtype: 'credit card',
        mask: '4444',
      },
    ],
    liabilities: {
      credit: [
        {
          account_id: 'plaid-card-1',
          is_overdue: false,
          minimum_payment_amount: 35,
          next_payment_due_date: '2026-09-05',
          last_statement_balance: 1150,
          aprs: [{ apr_percentage: 19.99, apr_type: 'purchase_apr' }],
        },
      ],
      mortgage: null,
      student: null,
    },
    request_id: 'req-api-test',
  };
}

function spinDebts(): SpinwheelDebt[] {
  return [
    {
      id: 'sw-card-1',
      type: 'CREDIT_CARD',
      balance: 1100,
      interestRate: 21.99,
      minimumPayment: 40,
      creditLimit: 5000,
      accountStatus: 'OPEN',
      name: 'CHASE CARD',
      last4: '4444',
      openDate: '2019-05-01',
    },
  ];
}

async function buildTestApp() {
  const { buildApp } = await import('../src/server.js');
  return buildApp();
}

type DebtJson = { debtId: string; sourceIds: string[]; apr: number | null; balance: number | null };
type DebtsBody = { debts: DebtJson[]; highAprDebtBalances: number[] | null };

describe('GET /api/debts', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 401 without auth', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/debts' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns an empty list and null rung 3 feed before any sync', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/debts', headers: authHeader() });
    expect(res.json<DebtsBody>()).toEqual({ debts: [], highAprDebtBalances: null });
    await app.close();
  });

  it('returns one merged debt for a card seen through both sources', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, spinDebts());
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/debts', headers: authHeader() });
    expect(res.json<DebtsBody>().debts).toHaveLength(1);
    await app.close();
  });

  it('feeds rung 3 the deduplicated balance, not the doubled one', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, spinDebts());
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/debts', headers: authHeader() });
    expect(res.json<DebtsBody>().highAprDebtBalances).toEqual([1200]);
    await app.close();
  });

  it('headlines the 36-month clearing payment, not the minimum', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/debts', headers: authHeader() });
    const debt = res.json<{ debts: { payment36: number; minPayment: number }[] }>().debts[0];
    expect(debt?.payment36).toBeGreaterThan(debt?.minPayment ?? 0);
    await app.close();
  });
});

describe('POST /api/debts/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('pulls both providers and returns the merged records', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-1', accessToken: 'tok-1', userId: testUserId });
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    await db().insert(spinwheelConnections).values({ userId: testUserId, spinwheelUserId: 'sw-user-1' });

    mockedLiabilitiesGet.mockResolvedValue(plaidCardResponse());
    mockedGetDebtProfile.mockResolvedValue(spinDebts());

    const app = await buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/api/debts/sync', headers: authHeader() });
    const body = res.json<{ synced: { plaid: boolean; spinwheel: boolean }; debts: DebtJson[] }>();
    expect(body).toMatchObject({ synced: { plaid: true, spinwheel: true } });
    expect(body.debts).toHaveLength(1);
    await app.close();
  });

  it('fails soft when a provider is down', async () => {
    const { upsertItem } = await import('../src/store/items.js');
    await upsertItem({ itemId: 'item-1', accessToken: 'tok-1', userId: testUserId });
    mockedLiabilitiesGet.mockRejectedValue(new Error('plaid down'));

    const app = await buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/api/debts/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ synced: { plaid: boolean; spinwheel: boolean } }>().synced).toEqual({
      plaid: false,
      spinwheel: false,
    });
    await app.close();
  });
});

describe('PATCH /api/debts/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  async function seededDebtId(): Promise<string> {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    const { getDebtAccounts } = await import('../src/store/debts.js');
    const [account] = await getDebtAccounts(testUserId);
    return (account as { debtId: string }).debtId;
  }

  it('updates nickname and statement close day', async () => {
    const debtId = await seededDebtId();
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/debts/${debtId}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: 'Blue card', statementCloseDay: 12 }),
    });
    expect(res.json<{ nickname: string; statementCloseDay: number }>()).toMatchObject({
      nickname: 'Blue card',
      statementCloseDay: 12,
    });
    await app.close();
  });

  it('rejects an out-of-range statement close day', async () => {
    const debtId = await seededDebtId();
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/debts/${debtId}`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ statementCloseDay: 32 }),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns 404 for an unknown debt', async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/debts/nope',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: 'x' }),
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe('merge and split endpoints', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('merge collapses two records into one', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, [{ ...spinDebts()[0], name: 'FIRST BANKCARD' } as SpinwheelDebt]);
    const { getDebtAccounts } = await import('../src/store/debts.js');
    const before = await getDebtAccounts(testUserId);
    expect(before).toHaveLength(2);

    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/debts/${(before[0] as { debtId: string }).debtId}/merge`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ otherDebtId: (before[1] as { debtId: string }).debtId }),
    });
    expect(res.json<{ debts: DebtJson[] }>().debts).toHaveLength(1);
    await app.close();
  });

  it('split separates a merged record back into its sources', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, spinDebts());
    const { getDebtAccounts } = await import('../src/store/debts.js');
    const [merged] = await getDebtAccounts(testUserId);

    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/debts/${(merged as { debtId: string }).debtId}/split`,
      headers: authHeader(),
    });
    expect(res.json<{ debts: DebtJson[] }>().debts).toHaveLength(2);
    await app.close();
  });

  it('split of a single-source record is a 409', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    const { getDebtAccounts } = await import('../src/store/debts.js');
    const [only] = await getDebtAccounts(testUserId);

    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/debts/${(only as { debtId: string }).debtId}/split`,
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it('merge with an unknown other debt is a 404', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    const { getDebtAccounts } = await import('../src/store/debts.js');
    const [only] = await getDebtAccounts(testUserId);

    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/debts/${(only as { debtId: string }).debtId}/merge`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ otherDebtId: 'nope' }),
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe('GET and PUT /api/debts/plan', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('defaults to the blend strategy', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/debts/plan', headers: authHeader() });
    expect(res.json<{ strategy: string }>().strategy).toBe('blend');
    await app.close();
  });

  it('always includes the comparative cost of every strategy', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/debts/plan?extra=100', headers: authHeader() });
    const body = res.json<{ comparison: Record<string, unknown>; costVsAvalanche: number; costVsSnowball: number }>();
    expect(Object.keys(body.comparison).sort()).toEqual(['avalanche', 'blend', 'minimumsOnly', 'snowball']);
    await app.close();
  });

  it('rejects a negative extra payment', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/debts/plan?extra=-5', headers: authHeader() });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('persists a one-tap strategy switch', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    const app = await buildTestApp();
    const put = await app.inject({
      method: 'PUT',
      url: '/api/debts/plan',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ strategy: 'avalanche', extraMonthly: 200 }),
    });
    expect(put.statusCode).toBe(200);

    const res = await app.inject({ method: 'GET', url: '/api/debts/plan', headers: authHeader() });
    expect(res.json<{ strategy: string; extraMonthly: number }>()).toMatchObject({
      strategy: 'avalanche',
      extraMonthly: 200,
    });
    await app.close();
  });

  it('surfaces a never_pays_off finding when the minimum cannot cover interest', async () => {
    await ingestSpinwheelDebts(testUserId, [
      {
        id: 'sw-trap',
        type: 'CREDIT_CARD',
        balance: 10000,
        interestRate: 24,
        minimumPayment: 85,
        accountStatus: 'OPEN',
        name: 'TRAP CARD',
        last4: '1111',
      } as SpinwheelDebt,
    ]);
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/debts/plan?extra=0', headers: authHeader() });
    const body = res.json<{ findings: { kind: string; clearingPayment36: number }[] }>();
    expect(body.findings[0]?.kind).toBe('never_pays_off');
    await app.close();
  });
});
