import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getSpotPrices } from '../coinbase/client.js';
import { db } from '../db/client.js';
import { chainWallets } from '../db/schema.js';
import { getBitcoinBalance } from '../chains/bitcoin.js';

// Maps chain identifier to the Coinbase spot price symbol.
export const CHAIN_SYMBOLS: Record<string, string> = {
  bitcoin: 'BTC',
  xrp: 'XRP',
  stellar: 'XLM',
  doge: 'DOGE',
  ltc: 'LTC',
  bch: 'BCH',
  cosmos: 'ATOM',
  osmosis: 'OSMO',
};

// Returns native-unit balance for the given chain and address.
// Returns null when no client is available for the chain yet — each chain PR adds a case.
export async function fetchNativeBalance(chain: string, address: string): Promise<number | null> {
  switch (chain) {
    case 'bitcoin':
      return getBitcoinBalance(address);
    // xrp: added in feat/chain-xrp
    // stellar: added in feat/chain-stellar
    // doge, ltc, bch: added in feat/chain-blockcypher
    // cosmos, osmosis: added in feat/chain-cosmos
    default:
      return null;
  }
}

const AddWalletBodySchema = z.object({
  chain: z.enum(['bitcoin', 'xrp', 'stellar', 'doge', 'ltc', 'bch', 'cosmos', 'osmosis']),
  address: z.string().min(1).max(200),
  label: z.string().max(100).optional(),
});

export function registerChainWalletsApi(app: FastifyInstance): void {
  // GET /api/chain-wallets
  app.get('/api/chain-wallets', async (req: FastifyRequest) => {
    const rows = await db().select().from(chainWallets).where(eq(chainWallets.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      chain: r.chain,
      address: r.address,
      label: r.label ?? null,
      lastBalanceUsd: r.lastBalanceUsd !== null ? parseFloat(r.lastBalanceUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/chain-wallets
  app.post('/api/chain-wallets', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddWalletBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { chain, address, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(chainWallets)
      .values({ userId, chain, address, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId, chain }, 'chain wallet added');
    return reply.status(201).send({ ok: true, chain, address });
  });

  // DELETE /api/chain-wallets/:chain/:address
  app.delete(
    '/api/chain-wallets/:chain/:address',
    async (req: FastifyRequest<{ Params: { chain: string; address: string } }>, reply: FastifyReply) => {
      const { chain, address } = req.params;
      const userId = req.user!.id;

      await db()
        .delete(chainWallets)
        .where(and(eq(chainWallets.userId, userId), eq(chainWallets.chain, chain), eq(chainWallets.address, address)));

      req.log.info({ userId, chain }, 'chain wallet removed');
      return reply.status(204).send();
    },
  );

  // POST /api/chain-wallets/sync
  // Fetches live native balances via chain-specific clients, converts to USD, and persists.
  app.post('/api/chain-wallets/sync', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(chainWallets).where(eq(chainWallets.userId, userId));

    if (rows.length === 0) return { updated: 0 };

    const symbols = [...new Set(rows.map((r) => CHAIN_SYMBOLS[r.chain]).filter((s): s is string => !!s))];
    const prices = symbols.length > 0 ? await getSpotPrices(symbols) : new Map<string, number>();

    let updated = 0;
    const now = new Date();

    for (const row of rows) {
      const nativeBalance = await fetchNativeBalance(row.chain, row.address);
      if (nativeBalance === null) continue;

      const symbol = CHAIN_SYMBOLS[row.chain];
      const price = symbol ? (prices.get(symbol) ?? 0) : 0;
      const balanceUsd = nativeBalance * price;

      await db()
        .update(chainWallets)
        .set({ lastBalanceUsd: balanceUsd.toString(), lastSyncedAt: now })
        .where(and(eq(chainWallets.userId, userId), eq(chainWallets.id, row.id)));

      updated++;
    }

    req.log.info({ userId, updated }, 'chain wallets sync complete');
    return { updated };
  });
}
