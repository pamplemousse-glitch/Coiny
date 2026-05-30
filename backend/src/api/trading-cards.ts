import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { tradingCardHoldings } from '../db/schema.js';
import { getTradingCardPrice } from '../tcgapi/client.js';

const AddCardBodySchema = z.object({
  game: z.string().min(1).max(50),
  cardName: z.string().min(1).max(200),
  setName: z.string().max(200).optional(),
  isFoil: z.boolean().default(false),
  quantity: z.number().int().positive().default(1),
  label: z.string().max(100).optional(),
});

const UpdateCardBodySchema = z.object({
  quantity: z.number().int().positive().optional(),
  label: z.string().max(100).optional(),
});

export function registerTradingCardsApi(app: FastifyInstance): void {
  // GET /api/trading-cards
  app.get('/api/trading-cards', async (req: FastifyRequest) => {
    const rows = await db().select().from(tradingCardHoldings).where(eq(tradingCardHoldings.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      game: r.game,
      cardName: r.cardName,
      setName: r.setName ?? null,
      isFoil: r.isFoil,
      quantity: r.quantity,
      label: r.label ?? null,
      lastPriceUsd: r.lastPriceUsd !== null ? parseFloat(r.lastPriceUsd) : null,
      valueUsd: r.lastPriceUsd !== null ? parseFloat(r.lastPriceUsd) * r.quantity : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/trading-cards
  app.post('/api/trading-cards', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddCardBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { game, cardName, setName, isFoil, quantity, label } = parsed.data;
    const userId = req.user!.id;

    const [row] = await db()
      .insert(tradingCardHoldings)
      .values({
        userId,
        game: game.toLowerCase(),
        cardName,
        setName: setName ?? null,
        isFoil,
        quantity,
        label: label ?? null,
      })
      .returning({ id: tradingCardHoldings.id });

    req.log.info({ userId, game, cardName }, 'trading card holding added');
    return reply.status(201).send({ ok: true, id: row!.id });
  });

  // PATCH /api/trading-cards/:id
  app.patch('/api/trading-cards/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'invalid id' });

    const parsed = UpdateCardBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const updates: Record<string, string | number | null> = {};
    if (parsed.data.quantity !== undefined) updates.quantity = parsed.data.quantity;
    if (parsed.data.label !== undefined) updates.label = parsed.data.label ?? null;

    if (Object.keys(updates).length === 0) return reply.status(400).send({ error: 'no fields to update' });

    await db()
      .update(tradingCardHoldings)
      .set(updates)
      .where(and(eq(tradingCardHoldings.userId, userId), eq(tradingCardHoldings.id, id)));

    return { ok: true };
  });

  // DELETE /api/trading-cards/:id
  app.delete('/api/trading-cards/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'invalid id' });

    await db()
      .delete(tradingCardHoldings)
      .where(and(eq(tradingCardHoldings.userId, req.user!.id), eq(tradingCardHoldings.id, id)));

    req.log.info({ userId: req.user!.id }, 'trading card holding removed');
    return reply.status(204).send();
  });

  // POST /api/trading-cards/sync
  app.post('/api/trading-cards/sync', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(tradingCardHoldings).where(eq(tradingCardHoldings.userId, userId));

    if (rows.length === 0) return { updated: 0 };

    let updated = 0;
    let errors = 0;
    const now = new Date();

    for (const row of rows) {
      const price = await getTradingCardPrice(
        row.cardName,
        row.game,
        row.setName ?? null,
        row.isFoil,
        config.TCGAPI_KEY,
      ).catch(() => null);

      if (price === null) {
        errors++;
        continue;
      }

      await db()
        .update(tradingCardHoldings)
        .set({ lastPriceUsd: price.toString(), lastSyncedAt: now })
        .where(and(eq(tradingCardHoldings.userId, userId), eq(tradingCardHoldings.id, row.id)));

      updated++;
    }

    req.log.info({ userId, updated, errors }, 'trading cards sync complete');
    return { updated, errors };
  });
}
