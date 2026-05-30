import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { coinHoldings } from '../db/schema.js';
import { getPcgsCoinFacts } from '../pcgs/client.js';

const AddCoinBodySchema = z.object({
  pcgsNo: z.number().int().positive(),
  gradeNo: z.number().int().min(1).max(70),
  plusGrade: z.boolean().default(false),
  quantity: z.number().int().positive().default(1),
  label: z.string().max(100).optional(),
});

const UpdateCoinBodySchema = z.object({
  quantity: z.number().int().positive().optional(),
  label: z.string().max(100).optional(),
});

export function registerCoinsApi(app: FastifyInstance): void {
  // GET /api/coins
  app.get('/api/coins', async (req: FastifyRequest) => {
    const rows = await db().select().from(coinHoldings).where(eq(coinHoldings.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      pcgsNo: r.pcgsNo,
      gradeNo: r.gradeNo,
      plusGrade: r.plusGrade,
      quantity: r.quantity,
      coinName: r.coinName ?? null,
      label: r.label ?? null,
      lastPriceGuideUsd: r.lastPriceGuideUsd !== null ? parseFloat(r.lastPriceGuideUsd) : null,
      valueUsd: r.lastPriceGuideUsd !== null ? parseFloat(r.lastPriceGuideUsd) * r.quantity : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/coins
  app.post('/api/coins', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddCoinBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { pcgsNo, gradeNo, plusGrade, quantity, label } = parsed.data;
    const userId = req.user!.id;

    const [row] = await db()
      .insert(coinHoldings)
      .values({ userId, pcgsNo, gradeNo, plusGrade, quantity, label: label ?? null })
      .returning({ id: coinHoldings.id });

    req.log.info({ userId, pcgsNo, gradeNo }, 'coin holding added');
    return reply.status(201).send({ ok: true, id: row!.id });
  });

  // PATCH /api/coins/:id
  app.patch('/api/coins/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.status(400).send({ error: 'invalid id' });

    const parsed = UpdateCoinBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const updates: Record<string, string | number | null> = {};
    if (parsed.data.quantity !== undefined) updates.quantity = parsed.data.quantity;
    if (parsed.data.label !== undefined) updates.label = parsed.data.label ?? null;

    if (Object.keys(updates).length === 0) return reply.status(400).send({ error: 'no fields to update' });

    await db()
      .update(coinHoldings)
      .set(updates)
      .where(and(eq(coinHoldings.userId, userId), eq(coinHoldings.id, id)));

    return { ok: true };
  });

  // DELETE /api/coins/:id
  app.delete('/api/coins/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.status(400).send({ error: 'invalid id' });

    await db()
      .delete(coinHoldings)
      .where(and(eq(coinHoldings.userId, req.user!.id), eq(coinHoldings.id, id)));

    req.log.info({ userId: req.user!.id }, 'coin holding removed');
    return reply.status(204).send();
  });

  // POST /api/coins/sync
  app.post('/api/coins/sync', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(coinHoldings).where(eq(coinHoldings.userId, userId));

    if (rows.length === 0) return { updated: 0 };

    let updated = 0;
    let errors = 0;
    const now = new Date();

    for (const row of rows) {
      const facts = await getPcgsCoinFacts(row.pcgsNo, row.gradeNo, row.plusGrade, config.PCGS_API_KEY).catch(
        () => null,
      );

      if (facts === null || facts.priceGuideUsd === null) {
        errors++;
        continue;
      }

      await db()
        .update(coinHoldings)
        .set({
          lastPriceGuideUsd: facts.priceGuideUsd.toString(),
          coinName: facts.name ?? row.coinName,
          lastSyncedAt: now,
        })
        .where(and(eq(coinHoldings.userId, userId), eq(coinHoldings.id, row.id)));

      updated++;
    }

    req.log.info({ userId, updated, errors }, 'coins sync complete');
    return { updated, errors };
  });
}
