import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { zerionWallets } from '../db/schema.js';
import { evaluateExternalEvent } from '../reactions/external.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { claimEvent } from '../store/events.js';
import { recordReaction } from '../store/pet.js';
import { getPortfolio, getTransactions } from '../zerion/client.js';

const AddWalletBodySchema = z.object({
  address: z.string().min(1).max(100),
  label: z.string().max(100).optional(),
});

export function registerZerionApi(app: FastifyInstance): void {
  // GET /api/zerion/wallets
  app.get('/api/zerion/wallets', async (req: FastifyRequest) => {
    const rows = await db()
      .select()
      .from(zerionWallets)
      .where(eq(zerionWallets.userId, req.user!.id));

    return rows.map((r) => ({
      id: r.id,
      address: r.address,
      label: r.label ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/zerion/wallets
  app.post('/api/zerion/wallets', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddWalletBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { address, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(zerionWallets)
      .values({ userId, address, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId }, 'zerion wallet added');
    return reply.status(201).send({ ok: true, address });
  });

  // DELETE /api/zerion/wallets/:address
  app.delete('/api/zerion/wallets/:address', async (req: FastifyRequest<{ Params: { address: string } }>, reply: FastifyReply) => {
    const { address } = req.params;
    const userId = req.user!.id;

    await db()
      .delete(zerionWallets)
      .where(and(eq(zerionWallets.userId, userId), eq(zerionWallets.address, address)));

    req.log.info({ userId }, 'zerion wallet removed');
    return reply.status(204).send();
  });

  // GET /api/zerion/portfolio
  app.get('/api/zerion/portfolio', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId));

    if (rows.length === 0) return { total_usd: 0, wallets: [] };

    const portfolios = await Promise.allSettled(rows.map((r) => getPortfolio(r.address)));

    let total_usd = 0;
    const wallets: Array<{ address: string; label: string | null; total_usd: number }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = portfolios[i];
      if (!row) continue;
      if (result?.status === 'fulfilled') {
        total_usd += result.value.total_usd;
        wallets.push({ address: row.address, label: row.label ?? null, total_usd: result.value.total_usd });
      } else {
        wallets.push({ address: row.address, label: row.label ?? null, total_usd: 0 });
      }
    }

    return { total_usd, wallets };
  });

  // POST /api/zerion/sync
  app.post('/api/zerion/sync', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, userId));

    if (rows.length === 0) return { reacted: 0 };

    let reacted = 0;

    for (const row of rows) {
      const { transactions } = await getTransactions(row.address);

      for (const tx of transactions) {
        const eventId = `zerion:${tx.id}`;
        const claimed = await claimEvent(eventId);
        if (!claimed) continue;

        let eventType: import('../reactions/external.js').ExternalEventType | null = null;
        const opType = tx.type.toLowerCase();
        const isInbound = tx.direction === 'in';

        if (isInbound || opType === 'receive' || opType === 'deposit') {
          eventType = 'wallet_receive';
        } else if (opType === 'trade' && isInbound) {
          // DeFi trade where assets flow in = yield-like
          eventType = 'defi_yield';
        }

        if (!eventType) continue;

        const amountUsd = tx.quantity_usd > 0 ? tx.quantity_usd : null;
        const symbol = tx.asset_symbol || null;

        const reaction = evaluateExternalEvent({
          id: eventId,
          userId,
          type: eventType,
          ...(amountUsd !== null ? { amountUsd } : {}),
          ...(symbol !== null ? { symbol } : {}),
          source: 'zerion',
        });

        if (reaction) {
          dispatchReaction(userId, reaction);
          await recordReaction(userId, eventType, reaction);
          reacted++;
        }
      }
    }

    req.log.info({ userId, reacted }, 'zerion sync complete');
    return { reacted };
  });
}
