import { getOverride } from '../store/overrides.js';
import type { Transaction } from '../types/transaction.js';
import type { PlaidTransaction } from './types.js';

// Full Plaid PFC taxonomy — ordered most-specific first within each primary.
// Source: https://plaid.com/documents/transactions-personal-finance-category-taxonomy.csv
const PFC_MAP: Array<[RegExp, string]> = [
  // FOOD_AND_DRINK
  [/^FOOD_AND_DRINK_GROCERIES$/, 'groceries'],
  [/^FOOD_AND_DRINK_(RESTAURANT|FAST_FOOD)$/, 'restaurants'],
  [/^FOOD_AND_DRINK_/, 'food_and_drink'],

  // INCOME
  [/^INCOME_WAGES$/, 'paycheck'],
  [/^INCOME_/, 'income'],

  // TRANSPORTATION
  [/^TRANSPORTATION_GAS$/, 'gas_stations'],
  [/^TRANSPORTATION_TAXIS_AND_RIDE_SHARES$/, 'rideshare'],
  [/^TRANSPORTATION_PUBLIC_TRANSIT$/, 'transit'],
  [/^TRANSPORTATION_/, 'transportation'],

  // TRAVEL
  [/^TRAVEL_FLIGHTS$/, 'flights'],
  [/^TRAVEL_LODGING$/, 'lodging'],
  [/^TRAVEL_/, 'travel'],

  // ENTERTAINMENT
  [/^ENTERTAINMENT_/, 'entertainment'],

  // GENERAL_MERCHANDISE
  [/^GENERAL_MERCHANDISE_/, 'shopping'],

  // MEDICAL
  [/^MEDICAL_/, 'medical'],

  // PERSONAL_CARE
  [/^PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS$/, 'gym'],
  [/^PERSONAL_CARE_/, 'personal_care'],

  // HOME_IMPROVEMENT
  [/^HOME_IMPROVEMENT_/, 'home'],

  // GENERAL_SERVICES
  [/^GENERAL_SERVICES_AUTOMOTIVE$/, 'automotive'],
  [/^GENERAL_SERVICES_INSURANCE$/, 'insurance'],
  [/^GENERAL_SERVICES_EDUCATION$/, 'education'],
  [/^GENERAL_SERVICES_/, 'services'],

  // RENT_AND_UTILITIES — rent specific before utilities catch-all
  [/^RENT_AND_UTILITIES_RENT$/, 'rent'],
  [/^RENT_AND_UTILITIES_/, 'utilities'],

  // LOAN_PAYMENTS — mortgage specific before loan catch-all
  [/^LOAN_PAYMENTS_MORTGAGE_PAYMENT$/, 'mortgage'],
  [/^LOAN_PAYMENTS_/, 'loan_payment'],

  // BANK_FEES
  [/^BANK_FEES_/, 'bank_fees'],

  // GOVERNMENT_AND_NON_PROFIT
  [/^GOVERNMENT_AND_NON_PROFIT_DONATIONS$/, 'donations'],
  [/^GOVERNMENT_AND_NON_PROFIT_/, 'government'],

  // TRANSFERS
  [/^TRANSFER_IN_/, 'transfer'],
  [/^TRANSFER_OUT_/, 'transfer'],
];

// Legacy category fallback for banks that don't return PFC data (regional/credit unions).
// Plaid legacy field: transaction.category = [primary, sub?]
const LEGACY_MAP: Array<[string, string | null, string]> = [
  ['Food and Drink', 'Groceries', 'groceries'],
  ['Food and Drink', 'Restaurants', 'restaurants'],
  ['Food and Drink', 'Fast Food', 'restaurants'],
  ['Food and Drink', null, 'food_and_drink'],
  ['Income', 'Payroll', 'paycheck'],
  ['Income', 'Wages', 'paycheck'],
  ['Income', null, 'income'],
  ['Payment', 'Credit Card', 'loan_payment'],
  ['Payment', null, 'loan_payment'],
  ['Transfer', 'Payroll', 'paycheck'],
  ['Transfer', null, 'transfer'],
  ['Travel', 'Airlines and Aviation Services', 'flights'],
  ['Travel', 'Lodging', 'lodging'],
  ['Travel', 'Car Service', 'rideshare'],
  ['Travel', null, 'travel'],
  ['Healthcare', null, 'medical'],
  ['Recreation', null, 'entertainment'],
  ['Shops', 'Groceries', 'groceries'],
  ['Shops', null, 'shopping'],
  ['Service', 'Insurance', 'insurance'],
  ['Service', 'Automotive', 'automotive'],
  ['Service', null, 'services'],
  ['Community', null, 'government'],
  ['Bank Fees', null, 'bank_fees'],
  ['Tax', null, 'government'],
  ['Interest', null, 'income'],
  ['Cash Advance', null, 'cash'],
];

function mapCategory(detailed: string | null | undefined): string | null {
  if (!detailed) return null;
  for (const [pattern, value] of PFC_MAP) {
    if (pattern.test(detailed)) return value;
  }
  return null;
}

function mapLegacyCategory(categories: string[] | null | undefined): string | null {
  if (!categories?.length) return null;
  const [primary, sub] = categories;
  for (const [mapPrimary, mapSub, value] of LEGACY_MAP) {
    if (primary !== mapPrimary) continue;
    if (mapSub === null || mapSub === sub) return value;
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
  const category =
    override ?? mapCategory(plaidTx.personal_finance_category?.detailed) ?? mapLegacyCategory(plaidTx.category);

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
