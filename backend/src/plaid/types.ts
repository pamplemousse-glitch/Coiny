// Plaid response shapes — only the fields we read.
// Full taxonomy in docs/plaid-integration.md.

export type PlaidPfc = {
  primary: string;
  detailed: string;
  confidence_level?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  personal_finance_category_icon_url?: string; // PFCv2: added Dec 2023
};

export type PlaidCounterparty = {
  name?: string;
  type?: string;
  entity_id?: string;
  logo_url?: string | null;
};

export type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  amount: number; // Plaid: positive = outflow
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
  date: string; // YYYY-MM-DD
  authorized_date: string | null;
  name: string; // raw description
  merchant_name: string | null;
  pending: boolean;
  payment_channel: 'online' | 'in store' | 'other';
  personal_finance_category: PlaidPfc | null;
  counterparties?: PlaidCounterparty[];
  category?: string[] | null; // legacy taxonomy fallback
  logo_url?: string | null; // top-level merchant logo (PFCv2)
};

export type PlaidAccountBalance = {
  available: number | null;
  current: number | null;
  iso_currency_code: string | null;
  limit: number | null;
};

export type PlaidAccount = {
  account_id: string;
  balances: PlaidAccountBalance;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  // Last 2-4 characters of the displayed account number; may be non-unique
  // within an Item. Optional because older cached fixtures omit it.
  mask?: string | null;
};

export type TransactionsSyncResponse = {
  accounts: PlaidAccount[];
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string; account_id: string }[];
  next_cursor: string;
  has_more: boolean;
  transactions_update_status: 'NOT_READY' | 'INITIAL_UPDATE_COMPLETE' | 'HISTORICAL_UPDATE_COMPLETE';
  request_id: string;
};

export type LinkTokenCreateResponse = {
  link_token: string;
  expiration: string;
  request_id: string;
};

export type PublicTokenExchangeResponse = {
  access_token: string;
  item_id: string;
  request_id: string;
};

// /item/get, only the fields we read. institution_id and institution_name are
// null for items created without an institution connection (e.g. Same Day
// Micro-deposits).
export type ItemGetResponse = {
  item: {
    item_id: string;
    institution_id: string | null;
    institution_name: string | null;
    // The item's CURRENT error, null when healthy. This is what makes the
    // connection-health sweep possible: webhooks can be missed (a delivery
    // fails, a signature is rejected, the server is mid-deploy), and this field
    // is the authoritative answer that does not depend on having received one.
    // Only `error_code` is ever read; `error_message` is vendor prose.
    error: { error_code: string; error_type?: string } | null;
    // ISO 8601, or null for institutions that do not expire consent. Where
    // consent does expire, this is the seven-day warning's ground truth, again
    // without depending on a PENDING_* webhook having arrived.
    consent_expiration_time?: string | null;
  };
  request_id: string;
};

export type WebhookVerificationKey = {
  alg: 'ES256';
  crv: 'P-256';
  kid: string;
  kty: 'EC';
  use: 'sig';
  x: string;
  y: string;
  created_at: number;
  expired_at: number | null;
};

export type WebhookVerificationKeyGetResponse = {
  key: WebhookVerificationKey;
  request_id: string;
};

// Webhook envelope — outer fields are common across all webhook types.
export type PlaidWebhookEnvelope = {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: { error_type: string; error_code: string; error_message: string } | null;
  [key: string]: unknown;
};

export type PlaidErrorResponse = {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message: string | null;
  request_id: string;
  documentation_url?: string;
  suggested_action?: string;
};

export type AccountsBalanceGetResponse = {
  accounts: PlaidAccount[];
  request_id: string;
};

export type PlaidHolding = {
  account_id: string;
  security_id: string;
  institution_price: number | null;
  institution_value: number | null; // market value = quantity × price
  quantity: number;
  cost_basis: number | null;
  /**
   * The vested portion of an equity-compensation holding (RSUs, ESPP, options
   * in a `stock plan` account). Null on ordinary holdings, which is not an
   * error: a share you bought is entirely yours.
   *
   * WHY THIS MATTERS: `institution_value` is the WHOLE grant, vested and
   * unvested together. Unvested equity is not the user's money yet — leave the
   * employer before the cliff and it never becomes theirs — so counting it
   * inflates net worth in the flattering direction. Same defect class as the
   * five-year CD that #274 stopped counting as emergency cash.
   *
   * DR-22 concluded vesting was not modellable because "no integration exposes
   * it". DR-32 corrects that on the evidence of these two fields, and DR-22's
   * own closing line makes the revisit conditional on exactly this: "Revisit
   * only if an integration ever exposes the vested split."
   *
   * DR-22's other holding stands untouched: ladder rung 2 is about CAPTURE,
   * not ownership, so it must not be gated on vesting. This changes the
   * net-worth figure only.
   */
  vested_quantity?: number | null;
  vested_value?: number | null;
  /**
   * When the institution last priced this holding. `institution_price_as_of`
   * is a date (YYYY-MM-DD); `institution_price_datetime` is the same instant
   * with a time, and is preferred when present.
   *
   * The freshness system measured age from OUR fetch time, so a holding an
   * institution last priced three days ago was reported as freshly valued.
   * Markets close; brokerages lag; the vendor tells us this and we dropped it.
   */
  institution_price_as_of?: string | null;
  institution_price_datetime?: string | null;
};

export type PlaidSecurity = {
  security_id: string;
  name: string | null;
  ticker_symbol: string | null;
  type: string | null; // 'equity' | 'mutual_fund' | 'etf' | 'fixed_income' | etc.
  /** Finer than `type`: 'etf', 'option', 'money market', and so on. */
  subtype?: string | null;
  /**
   * Plaid's own answer to "is this security really cash".
   *
   * The MIRROR of #274. That PR stopped a five-year CD counting as emergency
   * cash, using Plaid's depository account SUBTYPES
   * (networth/account-taxonomy.ts). But a money market fund held as a SECURITY
   * inside a brokerage never reaches that code: it arrives as a holding, not
   * as an account, so it lands in the investments class and counts as invested
   * when it is in fact spendable cash.
   *
   * #274 fixed the overstating direction. This is the understating one.
   */
  is_cash_equivalent?: boolean | null;
};

export type InvestmentsHoldingsGetResponse = {
  accounts: PlaidAccount[];
  holdings: PlaidHolding[];
  securities: PlaidSecurity[];
  request_id: string;
};

export type PlaidCreditLiability = {
  account_id: string;
  is_overdue: boolean | null;
  minimum_payment_amount: number | null;
  next_payment_due_date: string | null;
  last_statement_balance: number | null;
  aprs: { apr_percentage: number; apr_type: string }[] | null;
};

export type PlaidMortgageLiability = {
  account_id: string;
  outstanding_principal_balance: number | null;
  next_monthly_payment: number | null;
  next_payment_due_date: string | null;
};

export type PlaidStudentLoan = {
  account_id: string;
  minimum_payment_amount: number | null;
  next_payment_due_date: string | null;
  expected_payoff_date: string | null;
  repayment_plan: { type: string } | null;
  pslf_status: { estimated_eligibility_date: string | null } | null;
};

export type LiabilitiesGetResponse = {
  accounts: PlaidAccount[];
  liabilities: {
    credit: PlaidCreditLiability[] | null;
    mortgage: PlaidMortgageLiability[] | null;
    student: PlaidStudentLoan[] | null;
  };
  request_id: string;
};

export type RecurringStream = {
  stream_id: string;
  account_id: string;
  merchant_name: string | null;
  description: string;
  frequency: string;
  average_amount: { amount: number } | null;
  last_amount: { amount: number } | null;
  last_date: string | null;
  is_user_modified: boolean;
  status: string | null; // 'MATURE' | 'EARLY_DETECTION' | 'TOMBSTONED'
};

export type RecurringTransactionsResponse = {
  inflow_streams: RecurringStream[];
  outflow_streams: RecurringStream[];
  request_id: string;
};

export class PlaidApiError extends Error {
  public override readonly name = 'PlaidApiError';
  constructor(
    public readonly status: number,
    public readonly body: PlaidErrorResponse,
  ) {
    super(`${body.error_type}/${body.error_code}: ${body.error_message}`);
  }
}

/** One row from `/investments/transactions/get`.
 *
 *  SIGN CONVENTION, and it is the opposite of ours: Plaid uses positive when
 *  cash is DEBITED (a purchase) and negative when cash is CREDITED (a sale, a
 *  dividend, a contribution arriving). Coiny stores negative for outflow, so
 *  this must be negated on the way in, exactly as plaid/adapter.ts:133 does for
 *  bank transactions. Getting it wrong makes every contribution read as a
 *  withdrawal. */
export type PlaidInvestmentTransaction = {
  investment_transaction_id: string;
  account_id: string;
  security_id: string | null;
  date: string;
  name: string;
  quantity: number;
  amount: number;
  price: number;
  fees: number | null;
  /** `buy` | `sell` | `cancel` | `cash` | `fee` | `transfer` */
  type: string;
  /** e.g. `contribution`, `deposit`, `dividend`, `withdrawal`, `transfer`. */
  subtype: string;
  iso_currency_code: string | null;
};

export type InvestmentsTransactionsGetResponse = {
  investment_transactions: PlaidInvestmentTransaction[];
  /** Total available, which is what pagination is driven from. */
  total_investment_transactions: number;
  securities?: PlaidSecurity[];
  request_id: string;
};

/** Subset of `/institutions/get_by_id` we use: identity and branding. */
export type PlaidInstitution = {
  institution_id: string;
  name: string;
  /** Hex, e.g. "#004966". Null when the institution has none. */
  primary_color: string | null;
  /** Base64-encoded 152x152 PNG, or null. */
  logo: string | null;
  url: string | null;
};

export type InstitutionsGetByIdResponse = {
  institution: PlaidInstitution;
  request_id: string;
};
