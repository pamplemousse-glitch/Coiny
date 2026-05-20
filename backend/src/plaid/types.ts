// Plaid response shapes — only the fields we read.
// Full taxonomy in docs/plaid-integration.md.

export type PlaidPfc = {
  primary: string;
  detailed: string;
  confidence_level?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
};

export type PlaidCounterparty = {
  name?: string;
  type?: string;
  entity_id?: string;
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

export class PlaidApiError extends Error {
  public override readonly name = 'PlaidApiError';
  constructor(
    public readonly status: number,
    public readonly body: PlaidErrorResponse,
  ) {
    super(`${body.error_type}/${body.error_code}: ${body.error_message}`);
  }
}
