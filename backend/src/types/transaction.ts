// Vendor-neutral transaction shape consumed by the rule engine.
// Adapters (e.g., src/plaid/adapter.ts) convert vendor-specific shapes into this.
//
// Sign convention: negative amount = outflow (debit / purchase), positive = inflow.
// This was Teller's native convention; we preserve it across vendor swaps so the
// rule engine logic stays untouched.
export type Transaction = {
  id: string;
  account_id: string;
  amount: string; // signed decimal string
  date: string; // YYYY-MM-DD
  description: string;
  status: 'pending' | 'posted';
  type: string;
  // Approximate balance at/after this transaction. With Plaid we set this to
  // the account's current balance from the same /transactions/sync response —
  // not perfectly accurate per-tx, but the savings_milestone rule still fires
  // correctly when balance crosses a threshold.
  running_balance: string | null;
  details?: {
    category?: string | null;
    counterparty?: {
      name?: string;
      type?: string;
    };
    processing_status?: string;
  } | null;
};
