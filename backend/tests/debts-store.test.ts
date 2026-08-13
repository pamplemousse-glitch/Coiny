// Tests for src/store/debts.ts: ingestion, the R-7.13 dedupe, manual merge
// decisions, user-owned field preservation, and the rung 3 ladder feed.

import { beforeEach, describe, expect, it } from 'vitest';
import type { LiabilitiesGetResponse } from '../src/plaid/types.js';
import type { SpinwheelDebt } from '../src/spinwheel/client.js';
import {
  getDebtAccounts,
  getHighAprDebtBalances,
  ingestPlaidLiabilities,
  ingestSpinwheelDebts,
  mergeDebtAccounts,
  normalizeIssuer,
  splitDebtAccount,
  updateDebtAccount,
} from '../src/store/debts.js';
import { resetDatabase, testUserId } from './db-helper.js';

type PlaidOverrides = {
  accountId?: string;
  name?: string;
  officialName?: string | null;
  mask?: string | null;
  balance?: number | null;
  limit?: number | null;
  apr?: number | null;
  minPayment?: number | null;
};

function plaidCardResponse(over: PlaidOverrides = {}): LiabilitiesGetResponse {
  const accountId = over.accountId ?? 'plaid-card-1';
  return {
    accounts: [
      {
        account_id: accountId,
        balances: {
          available: null,
          current: over.balance !== undefined ? over.balance : 1200,
          iso_currency_code: 'USD',
          limit: over.limit !== undefined ? over.limit : 5000,
        },
        name: over.name ?? 'Chase Credit Card',
        official_name: over.officialName !== undefined ? over.officialName : 'Chase Sapphire Preferred',
        type: 'credit',
        subtype: 'credit card',
        mask: over.mask !== undefined ? over.mask : '4444',
      },
    ],
    liabilities: {
      credit: [
        {
          account_id: accountId,
          is_overdue: false,
          minimum_payment_amount: over.minPayment !== undefined ? over.minPayment : 35,
          next_payment_due_date: '2026-09-05',
          last_statement_balance: 1150,
          aprs: over.apr === null ? [] : [{ apr_percentage: over.apr ?? 19.99, apr_type: 'purchase_apr' }],
        },
      ],
      mortgage: null,
      student: null,
    },
    request_id: 'req-test',
  };
}

type SpinOverrides = Partial<SpinwheelDebt>;

function spinCard(over: SpinOverrides = {}): SpinwheelDebt {
  return {
    id: 'sw-card-1',
    type: 'CREDIT_CARD',
    balance: 1100,
    interestRate: 21.99,
    minimumPayment: 40,
    creditLimit: 5000,
    dueDate: '2026-09-03',
    accountStatus: 'OPEN',
    name: 'CHASE CARD',
    last4: '4444',
    openDate: '2019-05-01',
    ...over,
  };
}

describe('normalizeIssuer', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('canonicalizes issuer aliases so bank feed and bureau spellings meet', () => {
    expect(normalizeIssuer('American Express National Bank')).toBe(normalizeIssuer('AMEX'));
  });

  it('squashes case and punctuation', () => {
    expect(normalizeIssuer('Wells Fargo, N.A.')).toBe('wellsfargo');
  });

  it('returns null for null so unknown issuers never match each other', () => {
    expect(normalizeIssuer(null)).toBeNull();
  });

  it('returns null for strings with no matchable content', () => {
    expect(normalizeIssuer('***')).toBeNull();
  });
});

describe('dedupe across Plaid and Spinwheel', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('merges the same card from both sources into one record', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, [spinCard()]);
    const accounts = await getDebtAccounts(testUserId);
    expect(accounts).toHaveLength(1);
  });

  it('takes the balance from Plaid because the bank feed is more current', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ balance: 1200 }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ balance: 1100 })]);
    const [account] = await getDebtAccounts(testUserId);
    expect(account?.balance).toBe(1200);
  });

  it('takes the APR from Spinwheel because bureau data is more complete', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ apr: 19.99 }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ interestRate: 21.99 })]);
    const [account] = await getDebtAccounts(testUserId);
    expect(account?.apr).toBe(21.99);
  });

  it('takes the minimum payment from Plaid', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ minPayment: 35 }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ minimumPayment: 40 })]);
    const [account] = await getDebtAccounts(testUserId);
    expect(account?.minPayment).toBe(35);
  });

  it('falls back to the Plaid APR when the bureau has none', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ apr: 19.99 }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ interestRate: null })]);
    const [account] = await getDebtAccounts(testUserId);
    expect(account?.apr).toBe(19.99);
  });

  it('takes the credit limit from Spinwheel when Plaid reports none', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ limit: null }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ creditLimit: 5000 })]);
    const [account] = await getDebtAccounts(testUserId);
    expect(account?.creditLimit).toBe(5000);
  });

  it('records both source ids on the merged record', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, [spinCard()]);
    const [account] = await getDebtAccounts(testUserId);
    expect(account?.sourceIds.sort()).toEqual(['plaid:plaid-card-1', 'spinwheel:sw-card-1']);
  });

  it('does not merge cards with different last4', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ mask: '4444' }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ last4: '9999' })]);
    const accounts = await getDebtAccounts(testUserId);
    expect(accounts).toHaveLength(2);
  });

  it('does not merge when credit limits disagree beyond tolerance', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ limit: 5000 }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ creditLimit: 12000 })]);
    const accounts = await getDebtAccounts(testUserId);
    expect(accounts).toHaveLength(2);
  });

  it('does not merge when neither identity field is comparable', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ mask: null }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ last4: null, openDate: null })]);
    const accounts = await getDebtAccounts(testUserId);
    expect(accounts).toHaveLength(2);
  });

  it('falls back to open date when only one side has a last4', async () => {
    // Spinwheel tradelines often lack a last4 but carry the open date; the
    // Plaid side has no open date, so this pair is only manually mergeable.
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ mask: null }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ last4: null, openDate: '2019-05-01' })]);
    const accounts = await getDebtAccounts(testUserId);
    expect(accounts).toHaveLength(2);
  });

  it('skips closed bureau tradelines with no balance', async () => {
    await ingestSpinwheelDebts(testUserId, [spinCard({ accountStatus: 'CLOSED', balance: 0 })]);
    const accounts = await getDebtAccounts(testUserId);
    expect(accounts).toHaveLength(0);
  });
});

describe('manual merge and split', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('merge joins two records fuzzy matching missed', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ officialName: 'Chase Sapphire Preferred' }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ name: 'FIRST BANKCARD' })]);
    const before = await getDebtAccounts(testUserId);
    expect(before).toHaveLength(2);

    const ok = await mergeDebtAccounts(
      testUserId,
      (before[0] as { debtId: string }).debtId,
      (before[1] as { debtId: string }).debtId,
    );
    expect(ok).toBe(true);
    expect(await getDebtAccounts(testUserId)).toHaveLength(1);
  });

  it('a manual merge survives a re-sync', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, [spinCard({ name: 'FIRST BANKCARD' })]);
    const before = await getDebtAccounts(testUserId);
    await mergeDebtAccounts(
      testUserId,
      (before[0] as { debtId: string }).debtId,
      (before[1] as { debtId: string }).debtId,
    );

    await ingestSpinwheelDebts(testUserId, [spinCard({ name: 'FIRST BANKCARD' })]);
    expect(await getDebtAccounts(testUserId)).toHaveLength(1);
  });

  it('split undoes a wrong automatic merge', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, [spinCard()]);
    const [merged] = await getDebtAccounts(testUserId);

    const ok = await splitDebtAccount(testUserId, (merged as { debtId: string }).debtId);
    expect(ok).toBe(true);
    expect(await getDebtAccounts(testUserId)).toHaveLength(2);
  });

  it('a split survives a re-sync: the auto-match stays vetoed', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, [spinCard()]);
    const [merged] = await getDebtAccounts(testUserId);
    await splitDebtAccount(testUserId, (merged as { debtId: string }).debtId);

    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, [spinCard()]);
    expect(await getDebtAccounts(testUserId)).toHaveLength(2);
  });

  it('refuses to split a single-source record', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    const [only] = await getDebtAccounts(testUserId);
    expect(await splitDebtAccount(testUserId, (only as { debtId: string }).debtId)).toBe(false);
  });
});

describe('user-owned fields across rebuilds', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('preserves nickname and statement close day through a re-sync', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    await ingestSpinwheelDebts(testUserId, [spinCard()]);
    const [account] = await getDebtAccounts(testUserId);
    const debtId = (account as { debtId: string }).debtId;
    await updateDebtAccount(testUserId, debtId, { nickname: 'Blue card', statementCloseDay: 12 });

    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ balance: 900 }));
    const [after] = await getDebtAccounts(testUserId);
    expect({
      debtId: after?.debtId,
      nickname: after?.nickname,
      statementCloseDay: after?.statementCloseDay,
      balance: after?.balance,
    }).toEqual({ debtId, nickname: 'Blue card', statementCloseDay: 12, balance: 900 });
  });

  it('aprOverride wins over both sources', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ apr: 19.99 }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ interestRate: 21.99 })]);
    const [account] = await getDebtAccounts(testUserId);
    const updated = await updateDebtAccount(testUserId, (account as { debtId: string }).debtId, { aprOverride: 6 });
    expect(updated?.apr).toBe(6);
  });

  it('clearing aprOverride restores the source-derived APR', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ apr: 19.99 }));
    await ingestSpinwheelDebts(testUserId, [spinCard({ interestRate: 21.99 })]);
    const [account] = await getDebtAccounts(testUserId);
    const debtId = (account as { debtId: string }).debtId;
    await updateDebtAccount(testUserId, debtId, { aprOverride: 6 });
    const cleared = await updateDebtAccount(testUserId, debtId, { aprOverride: null });
    expect(cleared?.apr).toBe(21.99);
  });
});

describe('getHighAprDebtBalances: the rung 3 feed', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns null when no source has ever reported, which is unknown not zero', async () => {
    expect(await getHighAprDebtBalances(testUserId)).toBeNull();
  });

  it('counts a card seen through both sources exactly once', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse({ balance: 1200 }));
    await ingestSpinwheelDebts(testUserId, [spinCard()]);
    expect(await getHighAprDebtBalances(testUserId)).toEqual([1200]);
  });

  it('excludes debt at or below the 10% threshold', async () => {
    await ingestSpinwheelDebts(testUserId, [
      spinCard(),
      spinCard({
        id: 'sw-loan-1',
        type: 'STUDENT_LOAN',
        name: 'NAVIENT',
        balance: 15000,
        interestRate: 5.5,
        last4: null,
      }),
    ]);
    expect(await getHighAprDebtBalances(testUserId)).toEqual([1100]);
  });

  it('counts an unknown-rate credit card as high APR', async () => {
    await ingestSpinwheelDebts(testUserId, [spinCard({ interestRate: null })]);
    expect(await getHighAprDebtBalances(testUserId)).toEqual([1100]);
  });

  it('does not count an unknown-rate non-card loan', async () => {
    await ingestSpinwheelDebts(testUserId, [
      spinCard({
        id: 'sw-loan-2',
        type: 'PERSONAL_LOAN',
        name: 'SOFI',
        balance: 8000,
        interestRate: null,
        last4: null,
      }),
    ]);
    expect(await getHighAprDebtBalances(testUserId)).toEqual([]);
  });

  it('an aprOverride below the threshold removes the debt from the feed', async () => {
    await ingestSpinwheelDebts(testUserId, [spinCard({ interestRate: 21.99 })]);
    const [account] = await getDebtAccounts(testUserId);
    await updateDebtAccount(testUserId, (account as { debtId: string }).debtId, { aprOverride: 6 });
    expect(await getHighAprDebtBalances(testUserId)).toEqual([]);
  });
});

describe('user scoping', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('one user debt set is invisible to another user', async () => {
    await ingestPlaidLiabilities(testUserId, plaidCardResponse());
    const { findOrCreateUser } = await import('../src/store/users.js');
    const otherId = await findOrCreateUser({ appleSub: 'other_apple_sub', email: 'other@coiny.test' });
    expect(await getDebtAccounts(otherId)).toHaveLength(0);
    expect(await getHighAprDebtBalances(otherId)).toBeNull();
  });
});
