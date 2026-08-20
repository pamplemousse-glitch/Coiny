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
    /**
     * How sure the SOURCE of `category` is.
     *
     * Plaid returns `personal_finance_category.confidence_level` on every
     * transaction, from VERY_HIGH down to LOW and UNKNOWN, and it was typed
     * and read nowhere. A guess Plaid itself is unsure about was driving the
     * spending guardrails with exactly the same authority as a certain one.
     *
     * `USER` outranks all of them: a category the user set by hand is not a
     * guess, and their own override must never be second-guessed by a
     * confidence rule.
     */
    categoryConfidence?: 'USER' | 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | null;
    counterparty?: {
      name?: string;
      type?: string;
    };
    processing_status?: string;
    logo_url?: string | null;
  } | null;
};
