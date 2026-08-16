import { createPrivateKey, randomBytes } from 'node:crypto';
import { importJWK, SignJWT } from 'jose';
import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

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
    .setProtectedHeader({ alg: 'ES256', kid: keyName, nonce: randomHex(16), typ: 'JWT' })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime('2m')
    .sign(privateKey);
}

async function coinbaseFetch(path: string, attempt = 0): Promise<Response> {
  const jwt = await makeJwt('GET', path);
  // fetchWithRetry adds the 5 s per-attempt timeout (R-16.5); the 429 loop
  // below stays because it honours Coinbase's Retry-After header.
  const res = await fetchWithRetry(`${BASE_URL()}${path}`, {
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
  // "Amount that is being held for pending transfers against the available
  // balance." It is still the user's money, and summing available_balance
  // alone silently understated any account with a transfer in flight.
  // Optional because not every account object carries it.
  hold: z
    .object({
      value: z.string(),
      currency: z.string(),
    })
    .optional(),
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

// v2 API: response uses `data` array; next_uri contains starting_after cursor for the next page.
// `pagination.starting_after` reflects the cursor that was sent in the request (null on first page),
// not the next cursor — use `next_uri` instead.
const CoinbaseTransactionsResponseSchema = z.object({
  data: z.array(CoinbaseTransactionSchema),
  pagination: z
    .object({
      next_uri: z.string().nullable().optional(),
    })
    .optional(),
});

export type CoinbaseTransaction = z.infer<typeof CoinbaseTransactionSchema>;

export type CoinbaseTxClass = 'earn' | 'unstake' | 'trade' | 'defi' | 'transfer' | 'other';

export function classifyTransaction(type: string): CoinbaseTxClass {
  if (type === 'earn_payout' || type === 'staking_transfer') return 'earn';
  if (type === 'unstaking_transfer') return 'unstake';
  if (type === 'advanced_trade_fill') return 'trade';
  if (type === 'wrap_asset' || type === 'unwrap_asset') return 'defi';
  if (type === 'send' || type === 'receive') return 'transfer';
  return 'other';
}

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

  // Extract starting_after from next_uri (e.g. "/v2/accounts/.../transactions?starting_after=abc")
  let nextCursor: string | undefined;
  const nextUri = result.pagination?.next_uri;
  if (nextUri) {
    try {
      const url = new URL(nextUri, 'https://api.coinbase.com');
      const sa = url.searchParams.get('starting_after');
      if (sa) nextCursor = sa;
    } catch {
      // nextCursor stays undefined
    }
  }

  return {
    transactions: result.data,
    ...(nextCursor ? { nextCursor } : {}),
  };
}

const CoinbasePortfolioSchema = z.object({
  portfolios: z.array(
    z.object({
      portfolio_balances: z.object({
        total_cash_equivalent_balance: z.object({ value: z.string() }),
        total_crypto_balance: z.object({ value: z.string() }),
        unrealized_pnl: z.object({ value: z.string() }),
      }),
    }),
  ),
});

export async function getPortfolioSummary(): Promise<{
  totalCash: number;
  totalCrypto: number;
  unrealizedPnl: number;
} | null> {
  const result = await coinbaseGet('/api/v3/brokerage/portfolios', CoinbasePortfolioSchema);
  if (!result || result.portfolios.length === 0) return null;
  const b = result.portfolios[0]!.portfolio_balances;
  return {
    totalCash: parseFloat(b.total_cash_equivalent_balance.value),
    totalCrypto: parseFloat(b.total_crypto_balance.value),
    unrealizedPnl: parseFloat(b.unrealized_pnl.value),
  };
}

const SpotPriceResponseSchema = z.object({
  data: z.object({ amount: z.string() }),
});

const SPOT_PRICE_TTL_MS = 60_000;
const spotPriceCache = new Map<string, { price: number; fetchedAt: number }>();

/**
 * Returns USD spot prices for the given crypto symbols (e.g. ['BTC', 'ETH']).
 * Uses the public v2 endpoint — no auth required. Symbols that fail are omitted.
 * Results are cached for 60s. Always hits production regardless of COINBASE_BASE_URL.
 */
export async function getSpotPrices(symbols: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(symbols)];
  const now = Date.now();
  const toFetch = unique.filter((sym) => {
    const cached = spotPriceCache.get(sym);
    return !cached || now - cached.fetchedAt >= SPOT_PRICE_TTL_MS;
  });

  const results = await Promise.allSettled(
    toFetch.map(async (sym) => {
      const res = await fetchWithRetry(`https://api.coinbase.com/v2/prices/${encodeURIComponent(sym)}-USD/spot`);
      if (!res.ok) throw new Error(`spot price ${sym} failed: ${res.status}`);
      const raw: unknown = await res.json();
      const parsed = SpotPriceResponseSchema.parse(raw);
      return { sym, price: parseFloat(parsed.data.amount) };
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled') {
      spotPriceCache.set(r.value.sym, { price: r.value.price, fetchedAt: now });
    }
  }

  const map = new Map<string, number>();
  for (const sym of unique) {
    const cached = spotPriceCache.get(sym);
    if (cached) map.set(sym, cached.price);
  }
  return map;
}
