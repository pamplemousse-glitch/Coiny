import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { polymarketAccounts } from '../db/schema.js';
import { getPortfolioValue } from '../polymarket/client.js';

const AddAccountBodySchema = z.object({
  walletAddress: z.string().min(1).max(200),
  label: z.string().max(100).optional(),
});

export function registerPolymarketApi(app: FastifyInstance): void {
  // GET /api/polymarket/accounts
  app.get('/api/polymarket/accounts', async (req: FastifyRequest) => {
    const rows = await db().select().from(polymarketAccounts).where(eq(polymarketAccounts.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      walletAddress: r.walletAddress,
      label: r.label ?? null,
      lastValueUsd: r.lastValueUsd !== null ? parseFloat(r.lastValueUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/polymarket/accounts
  app.post('/api/polymarket/accounts', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddAccountBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { walletAddress, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(polymarketAccounts)
      .values({ userId, walletAddress, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId }, 'polymarket account added');
    return reply.status(201).send({ ok: true, walletAddress });
  });

  // DELETE /api/polymarket/accounts/:address
  app.delete(
    '/api/polymarket/accounts/:address',
    async (req: FastifyRequest<{ Params: { address: string } }>, reply: FastifyReply) => {
      const { address } = req.params;
      const userId = req.user!.id;

      await db()
        .delete(polymarketAccounts)
        .where(and(eq(polymarketAccounts.userId, userId), eq(polymarketAccounts.walletAddress, address)));

      req.log.info({ userId }, 'polymarket account removed');
      return reply.status(204).send();
    },
  );

  // POST /api/polymarket/sync
  // Fetches live position values from the Polymarket Data API and persists them.
  app.post('/api/polymarket/sync', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(polymarketAccounts).where(eq(polymarketAccounts.userId, userId));

    if (rows.length === 0) return { updated: 0 };

    let updated = 0;
    const now = new Date();

    for (const row of rows) {
      const valueUsd = await getPortfolioValue(row.walletAddress);
      await db()
        .update(polymarketAccounts)
        .set({ lastValueUsd: valueUsd.toString(), lastSyncedAt: now })
        .where(and(eq(polymarketAccounts.userId, userId), eq(polymarketAccounts.id, row.id)));
      updated++;
    }

    req.log.info({ userId, updated }, 'polymarket sync complete');
    return { updated };
  });

  // GET /api/polymarket/status
  app.get('/api/polymarket/status', async (req: FastifyRequest) => {
    const rows = await db().select().from(polymarketAccounts).where(eq(polymarketAccounts.userId, req.user!.id));
    return {
      connected: rows.length > 0,
      accounts: rows.length,
    };
  });
}
