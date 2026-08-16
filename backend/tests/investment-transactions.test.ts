import { beforeEach, describe, expect, it } from 'vitest';
import type { PlaidInvestmentTransaction } from '../src/plaid/types.js';
import { resetDatabase, testUserId } from './db-helper.js';

function tx(over: Partial<PlaidInvestmentTransaction>): PlaidInvestmentTransaction {
  return {
    investment_transaction_id: 'itx-1',
    account_id: 'acct-brokerage',
    security_id: 'sec-1',
    date: '2026-08-01',
    name: 'CONTRIBUTION',
    quantity: 0,
    amount: 0,
    price: 0,
    fees: 0,
    type: 'cash',
    subtype: 'contribution',
    iso_currency_code: 'USD',
    ...over,
  };
}

describe('investment transaction storage', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('negates the amount, because Plaid signs investments the opposite way', async () => {
    // THE defect this guards. Plaid: positive when cash is DEBITED (a buy).
    // Coiny: negative for outflow. Storing Plaid's sign unchanged makes every
    // contribution read as a withdrawal and every purchase as income.
    const { upsertInvestmentTransactions, getInvestmentContributions } = await import(
      '../src/store/investment-transactions.js'
    );

    // A contribution arriving: cash credited, so Plaid sends it negative.
    await upsertInvestmentTransactions(testUserId, [tx({ amount: -500 })]);

    const rows = await getInvestmentContributions(testUserId, 'acct-brokerage', '2026-01-01');
    expect(rows).toHaveLength(1);
    // Positive in Coiny's convention: money came in.
    expect(rows[0]?.amount).toBe(500);
  });

  it('stores a purchase as an outflow', async () => {
    const { upsertInvestmentTransactions, getInvestmentContributions } = await import(
      '../src/store/investment-transactions.js'
    );

    // A buy: cash debited, so Plaid sends it positive.
    await upsertInvestmentTransactions(testUserId, [
      tx({ investment_transaction_id: 'itx-buy', amount: 1289.01, type: 'buy', subtype: 'buy' }),
    ]);

    const rows = await getInvestmentContributions(testUserId, 'acct-brokerage', '2026-01-01');
    expect(rows[0]?.amount).toBeCloseTo(-1289.01);
  });

  it('does not double count when Plaid restates a transaction', async () => {
    // Pending trades settle and corrections are reissued under the same id. A
    // plain insert would create a second row and inflate the contribution rate.
    const { upsertInvestmentTransactions, getInvestmentContributions } = await import(
      '../src/store/investment-transactions.js'
    );

    await upsertInvestmentTransactions(testUserId, [tx({ amount: -500 })]);
    await upsertInvestmentTransactions(testUserId, [tx({ amount: -600 })]);

    const rows = await getInvestmentContributions(testUserId, 'acct-brokerage', '2026-01-01');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe(600);
  });

  it('scopes reads by user, so another user account id reads empty', async () => {
    const { upsertInvestmentTransactions, getInvestmentContributions } = await import(
      '../src/store/investment-transactions.js'
    );
    const { createOtherUser } = await import('./db-helper.js');
    const other = await createOtherUser();

    await upsertInvestmentTransactions(testUserId, [tx({ amount: -500 })]);

    const rows = await getInvestmentContributions(other.userId, 'acct-brokerage', '2026-01-01');
    expect(rows).toEqual([]);
  });

  it('skips a non-finite amount rather than storing NaN', async () => {
    const { upsertInvestmentTransactions, getInvestmentContributions } = await import(
      '../src/store/investment-transactions.js'
    );

    await upsertInvestmentTransactions(testUserId, [tx({ amount: Number.NaN })]);

    expect(await getInvestmentContributions(testUserId, 'acct-brokerage', '2026-01-01')).toEqual([]);
  });

  it('reports the earliest date, so a brokerage account is not called young forever', async () => {
    const { upsertInvestmentTransactions, getEarliestInvestmentDate } = await import(
      '../src/store/investment-transactions.js'
    );

    await upsertInvestmentTransactions(testUserId, [
      tx({ investment_transaction_id: 'a', date: '2026-03-15', amount: -100 }),
      tx({ investment_transaction_id: 'b', date: '2026-01-02', amount: -100 }),
    ]);

    expect(await getEarliestInvestmentDate(testUserId, 'acct-brokerage')).toBe('2026-01-02');
  });
});

describe('goal pace sees brokerage contributions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('includes investment contributions in funding activity', async () => {
    // The point of the whole change. Before this, getFundingActivity read only
    // the `transactions` table, so a goal funded by transfers straight into a
    // brokerage showed no contributions at all and read as stalled.
    const { upsertInvestmentTransactions } = await import('../src/store/investment-transactions.js');
    const { getFundingActivity } = await import('../src/store/target-goals.js');

    const now = new Date('2026-08-16T00:00:00Z');
    await upsertInvestmentTransactions(testUserId, [
      tx({ investment_transaction_id: 'c1', date: '2026-08-01', amount: -400 }),
      tx({ investment_transaction_id: 'c2', date: '2026-07-01', amount: -400 }),
    ]);

    const activity = await getFundingActivity(testUserId, 'acct-brokerage', now, 90);

    expect(activity.transactions).toHaveLength(2);
    expect(activity.transactions.reduce((sum, t) => sum + t.amount, 0)).toBe(800);
    expect(activity.earliestTransactionDate).toBe('2026-07-01');
  });

  it('excludes activity outside the window', async () => {
    const { upsertInvestmentTransactions } = await import('../src/store/investment-transactions.js');
    const { getFundingActivity } = await import('../src/store/target-goals.js');

    await upsertInvestmentTransactions(testUserId, [
      tx({ investment_transaction_id: 'old', date: '2025-01-01', amount: -400 }),
    ]);

    const activity = await getFundingActivity(testUserId, 'acct-brokerage', new Date('2026-08-16T00:00:00Z'), 30);

    expect(activity.transactions).toEqual([]);
    // Still known to be an old account, which is the distinction the earliest
    // date exists to preserve.
    expect(activity.earliestTransactionDate).toBe('2025-01-01');
  });
});
