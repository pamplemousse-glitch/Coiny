import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getSpotPrices } from '../coinbase/client.js';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { nftWallets } from '../db/schema.js';
import { getNftPortfolioValue } from '../nft/client.js';

const AddWalletBodySchema = z.object({
  address: z.string().min(1).max(200),
  label: z.string().max(100).optional(),
});

export function registerNftApi(app: FastifyInstance): void {
  // GET /api/nft/wallets — list user's NFT wallets
  app.get('/api/nft/wallets', async (req: FastifyRequest) => {
    const rows = await db().select().from(nftWallets).where(eq(nftWallets.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      address: r.address,
      label: r.label ?? null,
      lastValueUsd: r.lastValueUsd !== null ? parseFloat(r.lastValueUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/nft/wallets — add wallet
  app.post('/api/nft/wallets', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddWalletBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { address, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(nftWallets)
      .values({ userId, address, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId }, 'nft wallet added');
    return reply.status(201).send({ ok: true, address });
  });

  // DELETE /api/nft/wallets/:address — remove wallet
  app.delete(
    '/api/nft/wallets/:address',
    async (req: FastifyRequest<{ Params: { address: string } }>, reply: FastifyReply) => {
      const { address } = req.params;
      const userId = req.user!.id;

      await db()
        .delete(nftWallets)
        .where(and(eq(nftWallets.userId, userId), eq(nftWallets.address, address)));

      req.log.info({ userId }, 'nft wallet removed');
      return reply.status(204).send();
    },
  );

  // POST /api/nft/sync — sync all wallets, update lastValueUsd + lastSyncedAt
  app.post('/api/nft/sync', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(nftWallets).where(eq(nftWallets.userId, userId));

    if (rows.length === 0) return { updated: 0 };

    // Fetch ETH-USD spot price once for the whole sync.
    const prices = await getSpotPrices(['ETH']);
    const ethPriceUsd = prices.get('ETH') ?? 0;

    let updated = 0;
    const now = new Date();

    for (const row of rows) {
      try {
        const valueUsd = await getNftPortfolioValue(row.address, config.ALCHEMY_API_KEY, ethPriceUsd);
        await db()
          .update(nftWallets)
          .set({ lastValueUsd: valueUsd.toString(), lastSyncedAt: now })
          .where(and(eq(nftWallets.userId, userId), eq(nftWallets.id, row.id)));
        updated++;
      } catch (err) {
        req.log.warn({ userId, address: row.address, err }, 'nft wallet sync failed — skipping');
      }
    }

    req.log.info({ userId, updated }, 'nft wallets sync complete');
    return { updated };
  });
}
