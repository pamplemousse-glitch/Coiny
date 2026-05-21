import { request } from 'undici';
import { config } from '../config.js';
import {
  type LinkTokenCreateResponse,
  PlaidApiError,
  type PlaidErrorResponse,
  type PublicTokenExchangeResponse,
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

async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await request(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: config.PLAID_CLIENT_ID,
      secret: config.PLAID_SECRET,
      ...body,
    }),
  });

  const text = await res.body.text();

  if (res.statusCode >= 400) {
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
    throw new PlaidApiError(res.statusCode, err);
  }

  return JSON.parse(text) as T;
}

export function linkTokenCreate(args: {
  client_user_id: string;
  products?: string[];
  language?: string;
  country_codes?: string[];
  webhook?: string;
  client_name?: string;
}): Promise<LinkTokenCreateResponse> {
  return plaidPost('/link/token/create', {
    client_name: args.client_name ?? 'Coiny',
    language: args.language ?? 'en',
    country_codes: args.country_codes ?? ['US'],
    products: args.products ?? ['transactions'],
    user: { client_user_id: args.client_user_id },
    webhook: args.webhook ?? config.PLAID_WEBHOOK_URL,
  });
}

export function itemPublicTokenExchange(publicToken: string): Promise<PublicTokenExchangeResponse> {
  return plaidPost('/item/public_token/exchange', { public_token: publicToken });
}

export function transactionsSync(args: {
  access_token: string;
  cursor?: string;
  count?: number;
}): Promise<TransactionsSyncResponse> {
  const body: Record<string, unknown> = { access_token: args.access_token, count: args.count ?? 100 };
  if (args.cursor) body['cursor'] = args.cursor;
  return plaidPost('/transactions/sync', body);
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
