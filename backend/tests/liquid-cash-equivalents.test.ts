import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

// liquidCash counted depository accounts ONLY, so someone whose emergency fund
// sits in a money market fund (SPAXX, VMFXX, SWVXX) was told they had none at
// all — and the creature worried about a person doing exactly the right thing.
//
// Every authority treats money market funds as emergency funds and none draws
// a bank-account-only line. The tax WRAPPER is what disqualifies: the same
// fund inside a 401(k) costs tax plus a 10% penalty to reach.

async function seedAccountsAndHoldings(
  accounts: Array<{ accountId: string; type: string; subtype: string | null; balance: number }>,
  holdings: Array<{ securityId: string; accountId: string; value: number; isCashEquivalent: boolean }>,
) {
  const { db } = await import('../src/db/client.js');
  const { upsertPlaidAccountBalances, recordClassSuccess } = await import('../src/store/asset-cache.js');
  const { plaidItems } = await import('../src/db/schema.js');

  await db().insert(plaidItems).values({ itemId: 'item-1', userId: testUserId, accessToken: 'enc' });
  await upsertPlaidAccountBalances(
    testUserId,
    'item-1',
    accounts.map((a) => ({
      accountId: a.accountId,
      name: a.accountId,
      type: a.type,
      subtype: a.subtype,
      balance: a.balance,
    })),
    new Date(),
  );
  await recordClassSuccess(testUserId, 'investments', {
    valueUsd: holdings.reduce((s, h) => s + h.value, 0),
    payload: { holdings: holdings.map((h) => ({ ...h, name: h.securityId, ticker: h.securityId })) },
  });
}

async function ladderCash(): Promise<number | null> {
  const { assembleNetWorth } = await import('../src/networth/read.js');
  const { response } = await assembleNetWorth(testUserId);
  return (response as unknown as { accounts: { investmentsSummary: { liquidCashEquivalentUSD: number } } }).accounts
    .investmentsSummary.liquidCashEquivalentUSD;
}

/** The ladder's own cash figure, expressed in months of burn. This is the
 *  number the emergency-fund rungs are graded against, so it is the one that
 *  proves the fix reaches the user rather than just the response shape. */
async function liquidCashMonths(): Promise<number | null> {
  const { assembleNetWorth } = await import('../src/networth/read.js');
  const { response } = await assembleNetWorth(testUserId);
  return (response as unknown as { liquidCashMonths: number | null }).liquidCashMonths;
}

describe('cash equivalents count toward liquid cash', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('counts a money market fund held in a taxable brokerage', async () => {
    await seedAccountsAndHoldings(
      [{ accountId: 'brokerage-1', type: 'investment', subtype: 'brokerage', balance: 0 }],
      [{ securityId: 'SPAXX', accountId: 'brokerage-1', value: 25_000, isCashEquivalent: true }],
    );

    expect(await ladderCash()).toBeCloseTo(25_000, 0);
  });

  // Reaching it costs tax plus a 10% penalty, so it is not emergency money.
  it('does not count the same fund inside a 401(k)', async () => {
    await seedAccountsAndHoldings(
      [{ accountId: 'ret-1', type: 'investment', subtype: '401k', balance: 0 }],
      [{ securityId: 'SPAXX', accountId: 'ret-1', value: 25_000, isCashEquivalent: true }],
    );

    expect(await ladderCash()).toBe(0);
  });

  // A Roth is deliberately excluded: counting it correctly needs contribution
  // basis we do not track, and guessing would overstate.
  it('does not count a Roth IRA holding', async () => {
    await seedAccountsAndHoldings(
      [{ accountId: 'roth-1', type: 'investment', subtype: 'roth', balance: 0 }],
      [{ securityId: 'VMFXX', accountId: 'roth-1', value: 10_000, isCashEquivalent: true }],
    );

    expect(await ladderCash()).toBe(0);
  });

  it('does not count an ordinary equity holding in a taxable account', async () => {
    await seedAccountsAndHoldings(
      [{ accountId: 'brokerage-1', type: 'investment', subtype: 'brokerage', balance: 0 }],
      [{ securityId: 'AAPL', accountId: 'brokerage-1', value: 40_000, isCashEquivalent: false }],
    );

    expect(await ladderCash()).toBe(0);
  });

  // Conservative on unknowns: we cannot show it is reachable.
  it('does not count a holding whose account cannot be classified', async () => {
    await seedAccountsAndHoldings(
      [{ accountId: 'brokerage-1', type: 'investment', subtype: 'brokerage', balance: 0 }],
      [{ securityId: 'SPAXX', accountId: 'orphan-account', value: 25_000, isCashEquivalent: true }],
    );

    expect(await ladderCash()).toBe(0);
  });
});

// The outcome that matters. liquidCashMonths grades the emergency-fund rungs,
// so this is the difference between "you have no emergency fund" and "you have
// six months of one" for the same person with the same money.
describe('the ladder sees the money', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('reports months of runway from a money market fund with an empty bank account', async () => {
    const { db } = await import('../src/db/client.js');
    const { plaidItems, transactions } = await import('../src/db/schema.js');
    const { upsertPlaidAccountBalances, recordClassSuccess } = await import('../src/store/asset-cache.js');

    await db().insert(plaidItems).values({ itemId: 'item-1', userId: testUserId, accessToken: 'enc' });
    await upsertPlaidAccountBalances(
      testUserId,
      'item-1',
      [
        { accountId: 'checking-1', name: 'Checking', type: 'depository', subtype: 'checking', balance: 500 },
        { accountId: 'brokerage-1', name: 'Brokerage', type: 'investment', subtype: 'brokerage', balance: 0 },
      ],
      new Date(),
    );

    // Six months of $2,000 burn, sitting in SPAXX rather than a savings account.
    await recordClassSuccess(testUserId, 'investments', {
      valueUsd: 12_000,
      payload: {
        holdings: [
          {
            securityId: 'SPAXX',
            name: 'Fidelity Government MMF',
            ticker: 'SPAXX',
            accountId: 'brokerage-1',
            value: 12_000,
            isCashEquivalent: true,
          },
        ],
      },
    });

    // Enough spend history for avgMonthlyBurn to be computable.
    const rows = [];
    for (let d = 0; d < 90; d++) {
      const date = new Date(Date.now() - d * 24 * 3600 * 1000).toISOString().slice(0, 10);
      rows.push({
        transactionId: `tx-${d}`,
        userId: testUserId,
        accountId: 'checking-1',
        amount: '-66.67',
        date,
        category: 'groceries',
      });
    }
    await db().insert(transactions).values(rows);

    const months = await liquidCashMonths();
    // $12,500 against roughly $2,000/month. The bank account alone is $500,
    // which would have read as a quarter of a month.
    expect(months).not.toBeNull();
    expect(months!).toBeGreaterThan(4);
  });
});
