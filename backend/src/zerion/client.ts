import { z } from 'zod';
import { config } from '../config.js';

const BASE_URL = 'https://api.zerion.io';

function authHeader(): string {
  const encoded = Buffer.from(`${config.ZERION_API_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

const ZerionPortfolioResponseSchema = z.object({
  data: z.object({
    attributes: z.object({
      total: z.object({
        positions: z.number(),
      }),
    }),
  }),
});

export type ZerionPortfolio = {
  total_usd: number;
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

async function zerionGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Zerion API error: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Returns aggregated portfolio total in USD for a wallet address.
 */
export async function getPortfolio(walletAddress: string): Promise<ZerionPortfolio> {
  const raw = await zerionGet(`/v1/wallets/${encodeURIComponent(walletAddress)}/portfolio`);
  if (!raw) return { total_usd: 0 };

  const parsed = ZerionPortfolioResponseSchema.safeParse(raw);
  if (!parsed.success) return { total_usd: 0 };

  return { total_usd: parsed.data.data.attributes.total.positions };
}

/**
 * Returns DeFi/on-chain transactions for a wallet, with optional cursor for pagination.
 */
export async function getTransactions(
  walletAddress: string,
  cursor?: string,
): Promise<{ transactions: ZerionTransaction[]; nextCursor?: string }> {
  let path = `/v1/wallets/${encodeURIComponent(walletAddress)}/transactions/?filter[operation_types]=trade,receive,send,deposit,withdraw`;
  if (cursor) {
    path += `&page[after]=${encodeURIComponent(cursor)}`;
  }

  const raw = await zerionGet(path);
  if (!raw) return { transactions: [] };

  const parsed = ZerionTransactionsPageSchema.safeParse(raw);
  if (!parsed.success) return { transactions: [] };

  const transactions: ZerionTransaction[] = parsed.data.data.map((item) => {
    // Determine primary transfer direction and value.
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

  // Extract cursor from next link if present.
  const nextLink = parsed.data.links.next;
  let nextCursor: string | null = null;
  if (nextLink) {
    const url = new URL(nextLink, BASE_URL);
    const after = url.searchParams.get('page[after]');
    if (after) nextCursor = after;
  }

  return {
    transactions,
    ...(nextCursor ? { nextCursor } : {}),
  };
}
