import type { Transaction } from '../types/transaction.js';
import type { PlaidTransaction } from './types.js';

// Plaid Personal Finance Category (detailed) → our internal category string.
// Source: docs/plaid-integration.md §8. Rules engine reads `details.category`
// and matches on the simple strings ('groceries', 'restaurants', etc).
// Order matters where prefixes overlap: more specific matches go first.
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

// Convert one Plaid transaction into our internal `Transaction` shape.
// `accountBalance` is the current balance of the source account (from the
// same /transactions/sync response). Used as an approximate running_balance —
// see docs/plaid-integration.md §5.5 for why this is acceptable.
export function plaidTxToInternal(
  plaidTx: PlaidTransaction,
  accountBalance: number | null,
): Transaction {
  // Plaid: positive = outflow. Teller convention (which our rules use):
  // negative = outflow. Flip the sign.
  const signedAmount = -plaidTx.amount;

  const counterparty = counterpartyName(plaidTx);

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
      category: mapCategory(plaidTx.personal_finance_category?.detailed),
      ...(counterparty ? { counterparty: { name: counterparty, type: 'organization' } } : {}),
    },
  };
}
