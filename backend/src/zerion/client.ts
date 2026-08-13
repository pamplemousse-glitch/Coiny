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
      changes: z
        .object({
          absolute_1d: z.number().nullable().optional(),
          percent_1d: z.number().nullable().optional(),
        })
        .optional(),
    }),
  }),
});

export type ZerionPortfolio = {
  total_usd: number;
  change_1d_abs: number | null;
  change_1d_pct: number | null;
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
  return {
    total_usd: attrs.total.positions,
    change_1d_abs: attrs.changes?.absolute_1d ?? null,
    change_1d_pct: attrs.changes?.percent_1d ?? null,
  };
}

const ZerionPositionSchema = z.object({
  id: z.string(),
  attributes: z.object({
    value: z.number().nullable().optional(),
    quantity: z.object({ float: z.number() }).optional(),
    fungible_info: z
      .object({
        symbol: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
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
  value_usd: number;
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

  return parsed.data.data.map((item) => ({
    id: item.id,
    symbol: item.attributes.fungible_info?.symbol ?? '',
    name: item.attributes.fungible_info?.name ?? '',
    quantity: item.attributes.quantity?.float ?? 0,
    value_usd: item.attributes.value ?? 0,
  }));
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

  return parsed.data.data.map((item) => ({
    id: item.id,
    symbol: item.attributes.fungible_info?.symbol ?? '',
    name: item.attributes.fungible_info?.name ?? '',
    quantity: item.attributes.quantity?.float ?? 0,
    value_usd: item.attributes.value ?? 0,
  }));
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
