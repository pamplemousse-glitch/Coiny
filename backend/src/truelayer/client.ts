import { fetchWithRetry } from '../util/fetch.js';

// TrueLayer Data API client.
// Sandbox auth base:  https://auth.truelayer-sandbox.com
// Sandbox data base:  https://api.truelayer-sandbox.com/data/v1
// Live auth base:     https://auth.truelayer.com
// Live data base:     https://api.truelayer.com/data/v1

const SANDBOX_AUTH_BASE = 'https://auth.truelayer-sandbox.com';
const LIVE_AUTH_BASE = 'https://auth.truelayer.com';
const SANDBOX_DATA_BASE = 'https://api.truelayer-sandbox.com/data/v1';
const LIVE_DATA_BASE = 'https://api.truelayer.com/data/v1';

export type TrueLayerEnv = 'sandbox' | 'live';

function authBase(env: TrueLayerEnv): string {
  return env === 'sandbox' ? SANDBOX_AUTH_BASE : LIVE_AUTH_BASE;
}

function dataBase(env: TrueLayerEnv): string {
  return env === 'sandbox' ? SANDBOX_DATA_BASE : LIVE_DATA_BASE;
}

// ---------------------------------------------------------------------------
// Token shapes
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ---------------------------------------------------------------------------
// Data API response shapes
// ---------------------------------------------------------------------------

interface TrueLayerAccountRaw {
  account_id: string;
  account_type: string;
  display_name: string;
  currency: string;
  provider: {
    provider_id: string;
    display_name: string;
  };
  update_timestamp: string;
}

interface TrueLayerBalanceRaw {
  currency: string;
  available: number;
  current: number;
  update_timestamp: string;
}

interface TrueLayerTransactionRaw {
  transaction_id: string;
  normalised_provider_transaction_id: string | null;
  merchant_name: string | null;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_classification: string[];
  running_balance: { currency: string; amount: number } | null;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TrueLayerAccount {
  accountId: string;
  accountType: string;
  displayName: string;
  currency: string;
  providerId: string;
  providerName: string;
}

export interface TrueLayerTransaction {
  transactionId: string;
  merchantName: string | null;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transactionType: string;
  classification: string[];
}

// ---------------------------------------------------------------------------
// Auth URL builder
// ---------------------------------------------------------------------------

export function buildAuthUrl(opts: { clientId: string; redirectUri: string; env: TrueLayerEnv }): string {
  const base = authBase(opts.env);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: opts.clientId,
    scope: 'accounts balance transactions offline_access',
    redirect_uri: opts.redirectUri,
    providers: 'uk-ob-all uk-oauth-all',
  });
  return `${base}/?${params}`;
}

// ---------------------------------------------------------------------------
// Token exchange / refresh
// ---------------------------------------------------------------------------

async function postToken(
  env: TrueLayerEnv,
  params: URLSearchParams,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetchWithRetry(`${authBase(env)}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`TrueLayer token endpoint → ${res.status}`);
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  env: TrueLayerEnv = 'sandbox',
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  return postToken(
    env,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  );
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  env: TrueLayerEnv = 'sandbox',
): Promise<{ accessToken: string; expiresIn: number }> {
  const result = await postToken(
    env,
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  );
  return { accessToken: result.accessToken, expiresIn: result.expiresIn };
}

// ---------------------------------------------------------------------------
// Data API helpers
// ---------------------------------------------------------------------------

async function tlGet<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`TrueLayer GET ${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function getAccounts(accessToken: string, env: TrueLayerEnv = 'sandbox'): Promise<TrueLayerAccount[]> {
  const data = await tlGet<{ results: TrueLayerAccountRaw[] }>(accessToken, `${dataBase(env)}/accounts`);
  return data.results.map((a) => ({
    accountId: a.account_id,
    accountType: a.account_type,
    displayName: a.display_name,
    currency: a.currency,
    providerId: a.provider.provider_id,
    providerName: a.provider.display_name,
  }));
}

// ---------------------------------------------------------------------------
// Balance — returns the "current" balance for the account (in account currency, typically GBP).
// Callers are responsible for currency conversion before storing.
// ---------------------------------------------------------------------------

export async function getBalance(
  accessToken: string,
  accountId: string,
  env: TrueLayerEnv = 'sandbox',
): Promise<number> {
  const data = await tlGet<{ results: TrueLayerBalanceRaw[] }>(
    accessToken,
    `${dataBase(env)}/accounts/${accountId}/balance`,
  );
  const result = data.results[0];
  if (!result) throw new Error(`TrueLayer: no balance result for account ${accountId}`);
  return result.current;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function getTransactions(
  accessToken: string,
  accountId: string,
  from: Date,
  to: Date,
  env: TrueLayerEnv = 'sandbox',
): Promise<TrueLayerTransaction[]> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const data = await tlGet<{ results: TrueLayerTransactionRaw[] }>(
    accessToken,
    `${dataBase(env)}/accounts/${accountId}/transactions?${params}`,
  );
  return data.results.map((t) => ({
    transactionId: t.transaction_id,
    merchantName: t.merchant_name ?? null,
    timestamp: t.timestamp,
    description: t.description,
    amount: t.amount,
    currency: t.currency,
    transactionType: t.transaction_type,
    classification: t.transaction_classification,
  }));
}

// ---------------------------------------------------------------------------
// Credential deletion
// ---------------------------------------------------------------------------

// DELETE {auth_base}/api/delete revokes the connection to the user's accounts:
// the access token, its paired refresh token, and TrueLayer's own stored
// consent all go together. Deleting only our row would leave the user
// authorized at TrueLayer with no way for them to see it from our side.
// https://docs.truelayer.com/reference/deletecredential
export async function deleteCredential(accessToken: string, env: TrueLayerEnv = 'sandbox'): Promise<void> {
  const res = await fetchWithRetry(`${authBase(env)}/api/delete`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 401 means the token is already dead, which is the state we were trying to
  // reach. Anything else is a real failure the caller should see.
  if (!res.ok && res.status !== 401) {
    throw new Error(`TrueLayer DELETE /api/delete failed with ${res.status}`);
  }
}
