import { getOverride } from '../store/overrides.js';
import type { Transaction } from '../types/transaction.js';
import type { PlaidTransaction } from './types.js';

const PFC_MAP: Array<[RegExp, string]> = [
  [/^FOOD_AND_DRINK_GROCERIES$/, 'groceries'],
  [/^FOOD_AND_DRINK_(RESTAURANTS?|FAST_FOOD)$/, 'restaurants'],
  [/^FOOD_AND_DRINK_/, 'food_and_drink'],
  [/^UTILITIES_/, 'utilities'],
  [/^INCOME_WAGES$/, 'paycheck'],
  [/^INCOME_/, 'income'],
  [/^RENT_/, 'rent'],
  [/^MORTGAGE_/, 'mortgage'],
  [/^CASH_WITHDRAWAL/, 'cash'],
  [/^TRANSFER_/, 'transfer'],
  [/^TRANSPORTATION_GAS$/, 'gas_stations'],
];

function mapCategory(detailed: string | null | undefined): string | null {
  if (!detailed) return null;
  for (const [pattern, value] of PFC_MAP) {
    if (pattern.test(detailed)) return value;
  }
  return null;
}

function counterpartyName(tx: PlaidTransaction): string | undefined {
  if (tx.merchant_name) return tx.merchant_name;
  const first = tx.counterparties?.[0]?.name;
  if (first) return first;
  return tx.name || undefined;
}

export async function plaidTxToInternal(
  plaidTx: PlaidTransaction,
  accountBalance: number | null,
  userId: string,
): Promise<Transaction> {
  const signedAmount = -plaidTx.amount;

  const counterparty = counterpartyName(plaidTx);
  const override = await getOverride(userId, counterparty);
  const category = override ?? mapCategory(plaidTx.personal_finance_category?.detailed);

  return {
    id: plaidTx.transaction_id,
    account_id: plaidTx.account_id,
    amount: signedAmount.toFixed(2),
    date: plaidTx.date,
    description: plaidTx.name,
    status: plaidTx.pending ? 'pending' : 'posted',
    type: plaidTx.payment_channel === 'other' ? 'transfer' : 'card_payment',
    running_balance: accountBalance == null ? null : accountBalance.toFixed(2),
    details: {
      category,
      ...(counterparty ? { counterparty: { name: counterparty, type: 'organization' } } : {}),
    },
  };
}
