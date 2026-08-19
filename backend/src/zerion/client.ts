import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URL = 'https://api.zerion.io';

export class ZerionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ZerionError';
  }
}

function authHeader(): string {
  const encoded = Buffer.from(`${config.ZERION_API_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

// Handles 429 rate-limit (honours RateLimit-Org-Second-Reset header, falls back to
// exponential backoff) and 202 still-indexing (polls every 5s, up to ~30s).
async function zerionFetch(urlOrPath: string, attempt = 0): Promise<Response> {
  const url = urlOrPath.startsWith('http') ? urlOrPath : `${BASE_URL}${urlOrPath}`;
  // fetchWithRetry adds the 5 s per-attempt timeout (R-16.5). The 429 and 202
  // loops below stay: they are Zerion-specific (header-driven backoff and
  // still-indexing polls), and since the read path is DB-only they can only
  // ever run inside a background refresh, never inside a GET.
  const res = await fetchWithRetry(url, {
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
    },
  });

  if (res.status === 429 && attempt < 3) {
    const resetHeader = res.headers.get('RateLimit-Org-Second-Reset');
    const delayMs = resetHeader ? parseFloat(resetHeader) * 1000 : 2 ** attempt * 1000;
    await new Promise((r) => setTimeout(r, Math.min(delayMs, 5000)));
    return zerionFetch(urlOrPath, attempt + 1);
  }

  // 202 = wallet still being indexed; poll until 200 or give up after ~30s
  if (res.status === 202 && attempt < 6) {
    await new Promise((r) => setTimeout(r, 5000));
    return zerionFetch(urlOrPath, attempt + 1);
  }

  return res;
}

async function zerionGet(urlOrPath: string): Promise<unknown> {
  const res = await zerionFetch(urlOrPath);

  if (res.status === 404) return null;
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { errors?: Array<{ detail?: string }> };
      detail = body.errors?.[0]?.detail ?? detail;
    } catch {
      // ignore json parse failure on error body
    }
    throw new ZerionError(res.status, `Zerion API error (${res.status}): ${detail}`);
  }

  return res.json();
}

const ZerionPortfolioResponseSchema = z.object({
  data: z.object({
    attributes: z.object({
      total: z.object({
        positions: z.number(),
      }),
      // Zerion returns the portfolio split five ways and we were reading only
      // the aggregate, so a wallet with everything locked in a staking contract
      // was indistinguishable from one holding spendable tokens. All five keys
      // are `required` in Zerion's own schema (see the docs reference for
      // GET /v1/wallets/{address}/portfolio), but they are parsed optionally
      // here: a missing field must degrade the breakdown, never fail the whole
      // portfolio read and zero a user's DeFi total.
      // `.catch(undefined)` rather than `.optional()`: optional tolerates an
      // ABSENT distribution but still fails the whole parse on a present-but-
      // malformed one, and a failed parse here throws away the portfolio total
      // and zeroes the user's DeFi class. The breakdown is a nice-to-have; the
      // total is the number on the screen. Degrade the first, never the second.
      positions_distribution_by_type: z
        .object({
          wallet: z.number().optional(),
          deposited: z.number().optional(),
          borrowed: z.number().optional(),
          locked: z.number().optional(),
          staked: z.number().optional(),
        })
        .optional()
        .catch(undefined),
      changes: z
        .object({
          absolute_1d: z.number().nullable().optional(),
          percent_1d: z.number().nullable().optional(),
        })
        .optional(),
    }),
  }),
});

/**
 * How a wallet's value is actually held.
 *
 * `wallet` is spendable today. `staked`, `locked` and `deposited` are the
 * user's money but not reachable without unbonding, waiting out a lock, or
 * withdrawing from a protocol. `borrowed` is a debt secured against the rest.
 *
 * Kept as a breakdown rather than folded into one figure for the same reason
 * account subtypes are (networth/account-taxonomy.ts): "you have $40,000" and
 * "you have $2,000, and $38,000 you cannot touch until the unbonding period
 * ends" are different facts, and only one of them is an emergency fund.
 */
export type ZerionPositionBreakdown = {
  wallet: number;
  deposited: number;
  borrowed: number;
  locked: number;
  staked: number;
};

export type ZerionPortfolio = {
  total_usd: number;
  change_1d_abs: number | null;
  change_1d_pct: number | null;
  /**
   * Null when Zerion omitted the distribution, which must read as "unknown"
   * rather than as five zeroes: a breakdown of all-zero is a claim that the
   * wallet holds nothing, and that is the silent-zero failure R-8.1 bans.
   */
  breakdown: ZerionPositionBreakdown | null;
};

const ZerionTransactionSchema = z.object({
  id: z.string(),
  attributes: z.object({
    operation_type: z.string(),
    status: z.string(),
    mined_at: z.string().nullable(),
    transfers: z.array(
      z.object({
        direction: z.enum(['in', 'out']).optional(),
        value: z.number().nullable().optional(),
        fungible_info: z
          .object({
            symbol: z.string().nullable().optional(),
          })
          .optional(),
      }),
    ),
  }),
});

export type ZerionTransaction = {
  id: string;
  type: string;
  status: string;
  quantity_usd: number;
  asset_symbol: string;
  created_at: string;
  direction: 'in' | 'out';
};

const ZerionTransactionsPageSchema = z.object({
  links: z.object({
    next: z.string().nullable().optional(),
  }),
  data: z.array(ZerionTransactionSchema),
});

// Returns aggregated portfolio total and 24h change for a wallet address.
// filter[positions]=no_filter includes DeFi positions (staking, lending, LPs).
// Pass sync: true to force Zerion to aggregate fresh on-chain data (up to ~30s).
export async function getPortfolio(walletAddress: string, options: { sync?: boolean } = {}): Promise<ZerionPortfolio> {
  if (!config.ZERION_API_KEY) throw new ZerionError(0, 'ZERION_API_KEY is not configured');

  const params = new URLSearchParams({
    'filter[positions]': 'no_filter',
    currency: 'usd',
  });
  if (options.sync) params.set('sync', 'true');

  const raw = await zerionGet(`/v1/wallets/${encodeURIComponent(walletAddress)}/portfolio?${params}`);
  // A 404 or an unparseable body must throw, never read as an empty wallet:
  // converting either into total_usd: 0 is exactly the silent-zero failure
  // prd.md R-8.1 bans (a dead vendor indistinguishable from a broke user).
  if (!raw) throw new ZerionError(404, 'Zerion wallet portfolio not found');

  const parsed = ZerionPortfolioResponseSchema.safeParse(raw);
  if (!parsed.success) throw new ZerionError(200, 'Zerion portfolio response failed schema parse');

  const attrs = parsed.data.data.attributes;
  const dist = attrs.positions_distribution_by_type;

  // NOTE, and it is deliberately not acted on here: Zerion documents
  // `total.positions` as "Total value of all positions" and does not say
  // whether `borrowed` is subtracted from it. If it is not, a wallet with a
  // loan against its collateral is currently OVERSTATED in net worth by the
  // borrowed amount.
  //
  // The total is left exactly as it was rather than adjusted on a guess,
  // because guessing wrong in the other direction would understate every
  // leveraged wallet instead. Settle it with one observation against a real
  // wallet holding a loan: compare `total.positions` to
  // `wallet + deposited + locked + staked - borrowed`. The breakdown returned
  // below is what makes that check possible.
  return {
    total_usd: attrs.total.positions,
    change_1d_abs: attrs.changes?.absolute_1d ?? null,
    change_1d_pct: attrs.changes?.percent_1d ?? null,
    breakdown: dist
      ? {
          wallet: dist.wallet ?? 0,
          deposited: dist.deposited ?? 0,
          borrowed: dist.borrowed ?? 0,
          locked: dist.locked ?? 0,
          staked: dist.staked ?? 0,
        }
      : null,
  };
}

const ZerionPositionSchema = z.object({
  id: z.string(),
  attributes: z.object({
    value: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
    quantity: z.object({ float: z.number() }).optional(),
    // Zerion's own spam classification, per position. We already pass
    // `filter[trash]=only_non_trash` on the request, but the flag is also
    // returned and is worth carrying: the request filter is all-or-nothing
    // while the flag lets a caller show a junk token as junk rather than
    // silently omitting it.
    flags: z
      .object({
        displayable: z.boolean().optional(),
        is_trash: z.boolean().optional(),
      })
      .optional(),
    fungible_info: z
      .object({
        symbol: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        flags: z.object({ verified: z.boolean().optional() }).optional(),
        // The contract address, and the ONLY safe identifier for this token.
        // Symbols are neither unique nor owned, so anything that resolves a
        // holding by ticker can be pointed at an impostor token. `address` is
        // null for a chain's native asset (ETH, SOL), which is not an error.
        implementations: z
          .array(
            z.object({
              chain_id: z.string().nullable().optional(),
              address: z.string().nullable().optional(),
            }),
          )
          .optional(),
      })
      .optional(),
  }),
});

const ZerionPositionsResponseSchema = z.object({
  data: z.array(ZerionPositionSchema),
});

export type ZerionPosition = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  /**
   * Null when Zerion has no reliable price, NOT zero.
   *
   * Zerion's docs say it plainly: "price and value are null for tokens without
   * a reliable price. Guard for null before summing or formatting." This used
   * to be `?? 0`, so a token Zerion declined to price was reported to the user
   * as worthless — the same silent-zero failure R-8.1 bans, and the same one
   * fixed for Coinbase and chain wallets.
   */
  value_usd: number | null;
  /** Zerion's `verified` contract flag, null when absent. */
  verified: boolean | null;
  /** Zerion's own spam classification. */
  isTrash: boolean | null;
  /** Chain id for the token's primary implementation, e.g. `ethereum`. */
  chainId: string | null;
  /**
   * Contract address, or null for a chain's native asset.
   *
   * The only safe key for a follow-up price or liquidity lookup: symbols are
   * neither unique nor owned, so resolving by ticker lets an impostor token
   * choose the number we display. See dexscreener/client.ts.
   */
  tokenAddress: string | null;
};

const ZerionPnlSchema = z.object({
  data: z.object({
    attributes: z.object({
      unrealized_gain: z.number().nullable().optional(),
      realized_gain: z.number().nullable().optional(),
      total_gain: z.number().nullable().optional(),
    }),
  }),
});

export type ZerionPnl = {
  unrealized_gain: number | null;
  realized_gain: number | null;
  total_gain: number | null;
};

/** One position, with the fields a caller needs to price or distrust it.
 *
 *  Extracted because both list endpoints built this shape independently, which
 *  is how the two could drift: adding a field to one and not the other would
 *  produce positions that sometimes carry an address and sometimes do not. */
function toPosition(item: z.infer<typeof ZerionPositionSchema>): ZerionPosition {
  const info = item.attributes.fungible_info;
  // First implementation is the token's primary chain deployment. A token
  // bridged to several chains has several; any of them resolves the same asset
  // for a liquidity lookup, and the first is the one Zerion orders on.
  const impl = info?.implementations?.[0];
  return {
    id: item.id,
    symbol: info?.symbol ?? '',
    name: info?.name ?? '',
    quantity: item.attributes.quantity?.float ?? 0,
    value_usd: item.attributes.value ?? null,
    verified: info?.flags?.verified ?? null,
    isTrash: item.attributes.flags?.is_trash ?? null,
    chainId: impl?.chain_id ?? null,
    tokenAddress: impl?.address ?? null,
  };
}

export async function getPositions(walletAddress: string): Promise<ZerionPosition[]> {
  if (!config.ZERION_API_KEY) throw new ZerionError(0, 'ZERION_API_KEY is not configured');

  const params = new URLSearchParams({
    'filter[positions]': 'no_filter',
    'filter[trash]': 'only_non_trash',
    currency: 'usd',
  });

  const raw = await zerionGet(`/v1/wallets/${encodeURIComponent(walletAddress)}/positions/?${params}`);
  if (!raw) return [];

  const parsed = ZerionPositionsResponseSchema.safeParse(raw);
  if (!parsed.success) return [];

  return parsed.data.data.map(toPosition);
}

export async function getDeFiPositions(walletAddress: string): Promise<ZerionPosition[]> {
  if (!config.ZERION_API_KEY) throw new ZerionError(0, 'ZERION_API_KEY is not configured');

  const params = new URLSearchParams({
    'filter[positions]': 'only_complex',
    currency: 'usd',
  });

  const raw = await zerionGet(`/v1/wallets/${encodeURIComponent(walletAddress)}/positions/?${params}`);
  if (!raw) return [];

  const parsed = ZerionPositionsResponseSchema.safeParse(raw);
  if (!parsed.success) return [];

  return parsed.data.data.map(toPosition);
}

export async function getPnl(walletAddress: string): Promise<ZerionPnl> {
  if (!config.ZERION_API_KEY) throw new ZerionError(0, 'ZERION_API_KEY is not configured');

  const raw = await zerionGet(`/v1/wallets/${encodeURIComponent(walletAddress)}/pnl`);
  if (!raw) return { unrealized_gain: null, realized_gain: null, total_gain: null };

  const parsed = ZerionPnlSchema.safeParse(raw);
  if (!parsed.success) return { unrealized_gain: null, realized_gain: null, total_gain: null };

  const attrs = parsed.data.data.attributes;
  return {
    unrealized_gain: attrs.unrealized_gain ?? null,
    realized_gain: attrs.realized_gain ?? null,
    total_gain: attrs.total_gain ?? null,
  };
}

// Returns on-chain transactions for a wallet, filtered to non-spam.
// Pass the full links.next URL as cursor — Zerion cursors are opaque, never reconstruct them.
// Cap sync loops at maxPages to avoid exhausting the rate limit on large wallets.
export async function getTransactions(
  walletAddress: string,
  cursor?: string,
  options: { sync?: boolean } = {},
): Promise<{ transactions: ZerionTransaction[]; nextCursor?: string }> {
  if (!config.ZERION_API_KEY) throw new ZerionError(0, 'ZERION_API_KEY is not configured');

  let urlOrPath: string;
  if (cursor?.startsWith('http')) {
    urlOrPath = cursor; // use links.next URL as-is per Zerion docs
  } else {
    const params = new URLSearchParams({
      'filter[operation_types]': 'trade,receive,send,deposit,withdraw',
      'filter[trash]': 'only_non_trash',
      'page[size]': '100',
    });
    if (options.sync) params.set('sync', 'true');
    urlOrPath = `/v1/wallets/${encodeURIComponent(walletAddress)}/transactions/?${params}`;
  }

  const raw = await zerionGet(urlOrPath);
  if (!raw) return { transactions: [] };

  const parsed = ZerionTransactionsPageSchema.safeParse(raw);
  if (!parsed.success) return { transactions: [] };

  const transactions: ZerionTransaction[] = parsed.data.data.map((item) => {
    const inTransfer = item.attributes.transfers.find((t) => t.direction === 'in');
    const outTransfer = item.attributes.transfers.find((t) => t.direction === 'out');
    const primaryTransfer = inTransfer ?? outTransfer;

    const direction: 'in' | 'out' = inTransfer ? 'in' : 'out';
    const quantity_usd = primaryTransfer?.value ?? 0;
    const asset_symbol = primaryTransfer?.fungible_info?.symbol ?? '';
    const created_at = item.attributes.mined_at ?? new Date(0).toISOString();

    return {
      id: item.id,
      type: item.attributes.operation_type,
      status: item.attributes.status,
      quantity_usd,
      asset_symbol,
      created_at,
      direction,
    };
  });

  // Return the full links.next URL as cursor — never reconstruct it from parts
  const nextCursor = parsed.data.links.next ?? undefined;
  return {
    transactions,
    ...(nextCursor ? { nextCursor } : {}),
  };
}
