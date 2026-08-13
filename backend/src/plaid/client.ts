import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';
import {
  type AccountsBalanceGetResponse,
  type InvestmentsHoldingsGetResponse,
  type LiabilitiesGetResponse,
  type LinkTokenCreateResponse,
  PlaidApiError,
  type PlaidErrorResponse,
  type PublicTokenExchangeResponse,
  type RecurringTransactionsResponse,
  type TransactionsSyncResponse,
  type WebhookVerificationKeyGetResponse,
} from './types.js';

function baseUrl(): string {
  switch (config.PLAID_ENV) {
    case 'sandbox':
      return 'https://sandbox.plaid.com';
    case 'development':
      return 'https://development.plaid.com';
    case 'production':
      return 'https://production.plaid.com';
  }
}

// fetchWithRetry gives every Plaid call the 5 s per-attempt timeout and
// bounded retry the budgets doc mandates (R-16.5); undici's bare defaults let
// one hung vendor pin a request for minutes.
async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetchWithRetry(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'plaid-version': '2020-09-14' },
    body: JSON.stringify({
      client_id: config.PLAID_CLIENT_ID,
      secret: config.PLAID_SECRET,
      ...body,
    }),
  });

  const text = await res.text();

  if (res.status >= 400) {
    let err: PlaidErrorResponse;
    try {
      err = JSON.parse(text) as PlaidErrorResponse;
    } catch {
      err = {
        error_type: 'API_ERROR',
        error_code: 'UNKNOWN',
        error_message: text,
        display_message: null,
        request_id: '',
      };
    }
    throw new PlaidApiError(res.status, err);
  }

  return JSON.parse(text) as T;
}

export function linkTokenCreate(args: {
  client_user_id: string;
  products?: string[];
  required_if_supported_products?: string[];
  language?: string;
  country_codes?: string[];
  webhook?: string;
  client_name?: string;
}): Promise<LinkTokenCreateResponse> {
  return plaidPost('/link/token/create', {
    client_name: args.client_name ?? 'Coiny',
    language: args.language ?? 'en',
    country_codes: args.country_codes ?? ['US'],
    // Only `transactions` is required. Plaid initializes and BILLS every product
    // named in `products` at Item creation, "regardless of API calls made", and
    // a product cannot be removed from an Item once initialized with it. Listing
    // investments and liabilities here put three permanent monthly subscriptions
    // on every linked item, including a checking-only one that has neither.
    //
    // `required_if_supported_products` bills them only when the institution and
    // account type actually support the product.
    // https://plaid.com/docs/api/link/
    products: args.products ?? ['transactions'],
    required_if_supported_products: args.required_if_supported_products ?? ['investments', 'liabilities'],
    // Two years of history instead of Plaid's 90-day default. The derived
    // substrate needs 12 months for income volatility and 13 for the surplus
    // streak (derived.ts, store/goals.ts), and recurring-transaction detection
    // improves with depth; 90 days starves both for every new link.
    transactions: { days_requested: 730 },
    user: { client_user_id: args.client_user_id },
    webhook: args.webhook ?? config.PLAID_WEBHOOK_URL,
  });
}

export function itemPublicTokenExchange(publicToken: string): Promise<PublicTokenExchangeResponse> {
  return plaidPost('/item/public_token/exchange', { public_token: publicToken });
}

export function itemRemove(accessToken: string): Promise<{ request_id: string }> {
  return plaidPost('/item/remove', { access_token: accessToken });
}

export function transactionsSync(args: {
  access_token: string;
  cursor?: string;
  count?: number;
}): Promise<TransactionsSyncResponse> {
  const body: Record<string, unknown> = {
    access_token: args.access_token,
    count: args.count ?? 100,
    options: { include_personal_finance_category: true },
  };
  if (args.cursor) body.cursor = args.cursor;
  return plaidPost('/transactions/sync', body);
}

export function accountsBalanceGet(accessToken: string): Promise<AccountsBalanceGetResponse> {
  return plaidPost('/accounts/balance/get', { access_token: accessToken });
}

export function investmentsHoldingsGet(accessToken: string): Promise<InvestmentsHoldingsGetResponse> {
  return plaidPost('/investments/holdings/get', { access_token: accessToken });
}

export function liabilitiesGet(accessToken: string): Promise<LiabilitiesGetResponse> {
  return plaidPost('/liabilities/get', { access_token: accessToken });
}

export function recurringTransactionsGet(accessToken: string): Promise<RecurringTransactionsResponse> {
  return plaidPost('/transactions/recurring/get', { access_token: accessToken });
}

export function webhookVerificationKeyGet(keyId: string): Promise<WebhookVerificationKeyGetResponse> {
  return plaidPost('/webhook_verification_key/get', { key_id: keyId });
}

export function itemWebhookUpdate(args: { access_token: string; webhook: string }): Promise<{ request_id: string }> {
  return plaidPost('/item/webhook/update', {
    access_token: args.access_token,
    webhook: args.webhook,
  });
}

export function sandboxItemFireWebhook(args: {
  access_token: string;
  webhook_code: string;
  webhook_type?: string;
}): Promise<{ webhook_fired: boolean; request_id: string }> {
  return plaidPost('/sandbox/item/fire_webhook', {
    access_token: args.access_token,
    webhook_code: args.webhook_code,
    webhook_type: args.webhook_type ?? 'TRANSACTIONS',
  });
}

export function sandboxPublicTokenCreate(args: {
  institution_id: string;
  initial_products: string[];
  options?: { override_username?: string; override_password?: string };
}): Promise<{ public_token: string; request_id: string }> {
  return plaidPost('/sandbox/public_token/create', {
    institution_id: args.institution_id,
    initial_products: args.initial_products,
    options: args.options ?? { override_username: 'user_good', override_password: 'pass_good' },
  });
}
