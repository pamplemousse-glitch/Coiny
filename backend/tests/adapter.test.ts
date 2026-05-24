import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/store/overrides.js', () => ({
  getOverride: vi.fn().mockResolvedValue(null),
}));

import { plaidTxToInternal } from '../src/plaid/adapter.js';
import type { PlaidTransaction } from '../src/plaid/types.js';

function baseTx(overrides: Partial<PlaidTransaction> = {}): PlaidTransaction {
  return {
    transaction_id: 'tx-1',
    account_id: 'acct-1',
    amount: 50,
    iso_currency_code: 'USD',
    unofficial_currency_code: null,
    date: '2026-05-20',
    authorized_date: null,
    name: 'Test Merchant',
    merchant_name: null,
    pending: false,
    payment_channel: 'online',
    personal_finance_category: null,
    counterparties: [],
    category: null,
    ...overrides,
  };
}

describe('plaidTxToInternal — legacy category fallback', () => {
  it('uses legacy category when personal_finance_category is absent', async () => {
    const tx = await plaidTxToInternal(
      baseTx({ personal_finance_category: null, category: ['Food and Drink', 'Groceries'] }),
      null,
      'user-1',
    );
    expect(tx.details?.category).toBe('groceries');
  });

  it('maps legacy Food and Drink / Restaurants to restaurants', async () => {
    const tx = await plaidTxToInternal(
      baseTx({ personal_finance_category: null, category: ['Food and Drink', 'Restaurants'] }),
      null,
      'user-1',
    );
    expect(tx.details?.category).toBe('restaurants');
  });

  it('maps legacy Income / Payroll to paycheck', async () => {
    const tx = await plaidTxToInternal(
      baseTx({ personal_finance_category: null, category: ['Income', 'Payroll'] }),
      null,
      'user-1',
    );
    expect(tx.details?.category).toBe('paycheck');
  });

  it('maps legacy Travel / Airlines to flights', async () => {
    const tx = await plaidTxToInternal(
      baseTx({ personal_finance_category: null, category: ['Travel', 'Airlines and Aviation Services'] }),
      null,
      'user-1',
    );
    expect(tx.details?.category).toBe('flights');
  });

  it('maps legacy primary with null sub (catch-all)', async () => {
    const tx = await plaidTxToInternal(
      baseTx({ personal_finance_category: null, category: ['Healthcare'] }),
      null,
      'user-1',
    );
    expect(tx.details?.category).toBe('medical');
  });

  it('returns null category when no legacy category matches', async () => {
    const tx = await plaidTxToInternal(
      baseTx({ personal_finance_category: null, category: ['Unknown Primary', 'Unknown Sub'] }),
      null,
      'user-1',
    );
    expect(tx.details?.category).toBeNull();
  });

  it('returns null category when category array is empty', async () => {
    const tx = await plaidTxToInternal(baseTx({ personal_finance_category: null, category: [] }), null, 'user-1');
    expect(tx.details?.category).toBeNull();
  });

  it('prefers PFC over legacy category when both are present', async () => {
    const tx = await plaidTxToInternal(
      baseTx({
        personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_GROCERIES' },
        category: ['Income', 'Payroll'],
      }),
      null,
      'user-1',
    );
    expect(tx.details?.category).toBe('groceries');
  });

  it('populates running_balance when accountBalance is provided', async () => {
    const tx = await plaidTxToInternal(baseTx(), 4500.5, 'user-1');
    expect(tx.running_balance).toBe('4500.50');
  });

  it('running_balance is null when accountBalance is null', async () => {
    const tx = await plaidTxToInternal(baseTx(), null, 'user-1');
    expect(tx.running_balance).toBeNull();
  });

  it('uses merchant_name as counterparty when present', async () => {
    const tx = await plaidTxToInternal(baseTx({ merchant_name: 'Amazon', name: 'AMZN*Purchase' }), null, 'user-1');
    expect(tx.details?.counterparty?.name).toBe('Amazon');
  });

  it('marks pending transactions with status pending', async () => {
    const tx = await plaidTxToInternal(baseTx({ pending: true }), null, 'user-1');
    expect(tx.status).toBe('pending');
  });
});
