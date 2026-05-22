import { randomBytes } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';
import { z } from 'zod';
import { config } from '../config.js';

const BASE_URL = 'https://api.coinbase.com';

export class CoinbaseAuthError extends Error {
  constructor() {
    super('Coinbase authentication failed (401)');
    this.name = 'CoinbaseAuthError';
  }
}

function randomHex(n: number): string {
  return randomBytes(n).toString('hex');
}

async function makeJwt(method: string, path: string): Promise<string> {
  const keyName = config.COINBASE_API_KEY_ID;
  const privateKey = await importPKCS8(config.COINBASE_API_KEY_SECRET, 'ES256');
  const uri = `${method.toUpperCase()} api.coinbase.com${path}`;
  return new SignJWT({ iss: 'cdp', sub: keyName, uri })
    .setProtectedHeader({ alg: 'ES256', kid: keyName, nonce: randomHex(16) })
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(privateKey);
}

const CoinbaseAccountSchema = z.object({
  account_id: z.string(),
  currency: z.string(),
  balance: z.object({
    value: z.string(),
    currency: z.string(),
  }),
});

const CoinbaseAccountsResponseSchema = z.object({
  accounts: z.array(CoinbaseAccountSchema),
});

export type CoinbaseAccount = z.infer<typeof CoinbaseAccountSchema>;

const CoinbaseTransactionSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  amount: z.object({
    amount: z.string(),
    currency: z.string(),
  }),
  created_at: z.string(),
});

const CoinbaseTransactionsResponseSchema = z.object({
  transactions: z.array(CoinbaseTransactionSchema),
  pagination: z
    .object({
      next_starting_after: z.string().nullable().optional(),
    })
    .optional(),
});

export type CoinbaseTransaction = z.infer<typeof CoinbaseTransactionSchema>;

async function coinbaseGet<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  if (!config.COINBASE_API_KEY_ID || !config.COINBASE_API_KEY_SECRET) return null;

  const jwt = await makeJwt('GET', path);
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) return null;
  if (res.status === 401) throw new CoinbaseAuthError();
  if (!res.ok) throw new Error(`Coinbase API error: ${res.status}`);

  const raw: unknown = await res.json();
  return schema.parse(raw);
}

/**
 * Returns all Coinbase accounts for the authenticated key.
 * Returns empty array when API keys are not configured or account not found.
 */
export async function getAccounts(): Promise<CoinbaseAccount[]> {
  const result = await coinbaseGet('/api/v3/brokerage/accounts', CoinbaseAccountsResponseSchema);
  return result?.accounts ?? [];
}

/**
 * Returns transactions for a specific account, with optional cursor for pagination.
 * Returns empty array when not found.
 */
export async function getTransactions(
  accountId: string,
  cursor?: string,
): Promise<{ transactions: CoinbaseTransaction[]; nextCursor?: string }> {
  let path = `/api/v3/brokerage/accounts/${encodeURIComponent(accountId)}/transactions`;
  if (cursor) {
    path += `?starting_after=${encodeURIComponent(cursor)}`;
  }

  const result = await coinbaseGet(path, CoinbaseTransactionsResponseSchema);
  if (!result) return { transactions: [] };

  const nextCursor = result.pagination?.next_starting_after ?? null;
  return {
    transactions: result.transactions,
    ...(nextCursor ? { nextCursor } : {}),
  };
}
