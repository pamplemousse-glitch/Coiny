import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { hyperliquidAccounts } from '../db/schema.js';
import { getHyperliquidState } from '../hyperliquid/client.js';
import { SYNC_LIMIT } from './rate-limits.js';

const AddAccountBodySchema = z.object({
  address: z.string().min(1).max(200),
  label: z.string().max(100).optional(),
});

export function registerHyperliquidApi(app: FastifyInstance): void {
  // GET /api/hyperliquid/accounts
  app.get('/api/hyperliquid/accounts', async (req: FastifyRequest) => {
    const rows = await db().select().from(hyperliquidAccounts).where(eq(hyperliquidAccounts.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      address: r.address,
      label: r.label ?? null,
      lastAccountValueUsd: r.lastAccountValueUsd !== null ? parseFloat(r.lastAccountValueUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/hyperliquid/accounts
  app.post('/api/hyperliquid/accounts', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddAccountBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { address, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(hyperliquidAccounts)
      .values({ userId, address, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId }, 'hyperliquid account added');
    return reply.status(201).send({ ok: true, address });
  });

  // DELETE /api/hyperliquid/accounts/:address
  app.delete(
    '/api/hyperliquid/accounts/:address',
    async (req: FastifyRequest<{ Params: { address: string } }>, reply: FastifyReply) => {
      const { address } = req.params;
      const userId = req.user!.id;

      await db()
        .delete(hyperliquidAccounts)
        .where(and(eq(hyperliquidAccounts.userId, userId), eq(hyperliquidAccounts.address, address)));

      req.log.info({ userId }, 'hyperliquid account removed');
      return reply.status(204).send();
    },
  );

  // POST /api/hyperliquid/sync
  // Fetches live account values from Hyperliquid and persists them.
  app.post('/api/hyperliquid/sync', SYNC_LIMIT, async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(hyperliquidAccounts).where(eq(hyperliquidAccounts.userId, userId));

    if (rows.length === 0) return { updated: 0 };

    let updated = 0;
    const now = new Date();

    for (const row of rows) {
      const state = await getHyperliquidState(row.address);
      await db()
        .update(hyperliquidAccounts)
        .set({ lastAccountValueUsd: state.accountValue.toString(), lastSyncedAt: now })
        .where(and(eq(hyperliquidAccounts.userId, userId), eq(hyperliquidAccounts.id, row.id)));
      updated++;
    }

    req.log.info({ userId, updated }, 'hyperliquid sync complete');
    return { updated };
  });
}
