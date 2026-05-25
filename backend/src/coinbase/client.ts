import { createPrivateKey, randomBytes } from 'node:crypto';
import { importJWK, SignJWT } from 'jose';
import { z } from 'zod';
import { config } from '../config.js';

const BASE_URL = () => config.COINBASE_BASE_URL;

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
  // Normalize literal \n escapes (as stored in Keychain via security CLI) to real newlines.
  const pemStr = config.COINBASE_API_KEY_SECRET.replace(/\\n/g, '\n');
  // createPrivateKey handles both SEC1 (BEGIN EC PRIVATE KEY) and PKCS#8 (BEGIN PRIVATE KEY).
  const nodeKey = createPrivateKey({ key: pemStr, format: 'pem' });
  const jwk = nodeKey.export({ format: 'jwk' }) as Record<string, string>;
  const privateKey = await importJWK({ ...jwk, alg: 'ES256' }, 'ES256');
  const uri = `${method.toUpperCase()} api.coinbase.com${path}`;
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ iss: 'cdp', sub: keyName, uri })
    .setProtectedHeader({ alg: 'ES256', kid: keyName, nonce: randomHex(16) })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime('2m')
    .sign(privateKey);
}

async function coinbaseFetch(path: string, attempt = 0): Promise<Response> {
  const jwt = await makeJwt('GET', path);
  const res = await fetch(`${BASE_URL()}${path}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 429 && attempt < 3) {
    const retryAfter = res.headers.get('Retry-After');
    const delayMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 2 ** attempt * 1000;
    await new Promise((r) => setTimeout(r, Math.min(delayMs, 10000)));
    return coinbaseFetch(path, attempt + 1);
  }

  return res;
}

async function coinbaseGet<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  if (!config.COINBASE_API_KEY_ID || !config.COINBASE_API_KEY_SECRET) return null;

  const res = await coinbaseFetch(path);

  if (res.status === 404) return null;
  if (res.status === 401) throw new CoinbaseAuthError();
  if (!res.ok) throw new Error(`Coinbase API error: ${res.status}`);

  const raw: unknown = await res.json();
  return schema.parse(raw);
}

const CoinbaseAccountSchema = z.object({
  uuid: z.string(),
  currency: z.string(),
  available_balance: z.object({
    value: z.string(),
    currency: z.string(),
  }),
});

const CoinbaseAccountsResponseSchema = z.object({
  accounts: z.array(CoinbaseAccountSchema),
  has_next: z.boolean(),
  cursor: z.string().optional(),
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

// v2 API: response uses `data` array; pagination cursor is `starting_after`
const CoinbaseTransactionsResponseSchema = z.object({
  data: z.array(CoinbaseTransactionSchema),
  pagination: z
    .object({
      starting_after: z.string().nullable().optional(),
    })
    .optional(),
});

export type CoinbaseTransaction = z.infer<typeof CoinbaseTransactionSchema>;

/**
 * Returns all Coinbase accounts for the authenticated key, following pagination.
 * Returns empty array when API keys are not configured or account not found.
 */
export async function getAccounts(): Promise<CoinbaseAccount[]> {
  const all: CoinbaseAccount[] = [];
  let cursor: string | undefined;

  do {
    const path = cursor
      ? `/api/v3/brokerage/accounts?cursor=${encodeURIComponent(cursor)}`
      : '/api/v3/brokerage/accounts';

    const result = await coinbaseGet(path, CoinbaseAccountsResponseSchema);
    if (!result) break;

    all.push(...result.accounts);
    cursor = result.has_next ? result.cursor : undefined;
  } while (cursor);

  return all;
}

/**
 * Returns transactions for a specific account via the v2 API (only endpoint that exists).
 * Supports cursor-based pagination via `starting_after` query param.
 */
export async function getTransactions(
  accountId: string,
  cursor?: string,
): Promise<{ transactions: CoinbaseTransaction[]; nextCursor?: string }> {
  let path = `/v2/accounts/${encodeURIComponent(accountId)}/transactions`;
  if (cursor) {
    path += `?starting_after=${encodeURIComponent(cursor)}`;
  }

  const result = await coinbaseGet(path, CoinbaseTransactionsResponseSchema);
  if (!result) return { transactions: [] };

  const nextCursor = result.pagination?.starting_after ?? null;
  return {
    transactions: result.data,
    ...(nextCursor ? { nextCursor } : {}),
  };
}

const SpotPriceResponseSchema = z.object({
  data: z.object({ amount: z.string() }),
});

/**
 * Returns USD spot prices for the given crypto symbols (e.g. ['BTC', 'ETH']).
 * Uses the public v2 endpoint — no auth required. Symbols that fail are omitted.
 * Always hits production (api.coinbase.com) regardless of COINBASE_BASE_URL.
 */
export async function getSpotPrices(symbols: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(symbols)];
  const results = await Promise.allSettled(
    unique.map(async (sym) => {
      const res = await fetch(`https://api.coinbase.com/v2/prices/${encodeURIComponent(sym)}-USD/spot`);
      if (!res.ok) throw new Error(`spot price ${sym} failed: ${res.status}`);
      const raw: unknown = await res.json();
      const parsed = SpotPriceResponseSchema.parse(raw);
      return { sym, price: parseFloat(parsed.data.amount) };
    }),
  );

  const map = new Map<string, number>();
  for (const r of results) {
    if (r.status === 'fulfilled') map.set(r.value.sym, r.value.price);
  }
  return map;
}
