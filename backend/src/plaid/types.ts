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
};

export type PlaidSecurity = {
  security_id: string;
  name: string | null;
  ticker_symbol: string | null;
  type: string | null; // 'equity' | 'mutual_fund' | 'etf' | 'fixed_income' | etc.
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
