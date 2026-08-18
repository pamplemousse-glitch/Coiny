import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { energyPositions } from '../db/schema.js';
import { EIA_COMMODITIES, type EiaCommodity, getAllEiaSpotPrices } from '../eia/client.js';
import { SYNC_LIMIT } from './rate-limits.js';

const SUPPORTED_COMMODITIES = Object.keys(EIA_COMMODITIES) as [EiaCommodity, ...EiaCommodity[]];

const AddPositionBodySchema = z.object({
  commodity: z.enum(SUPPORTED_COMMODITIES),
  quantity: z.number().positive(),
  label: z.string().max(100).optional(),
});

const UpdatePositionBodySchema = z.object({
  quantity: z.number().positive().optional(),
  label: z.string().max(100).optional(),
});

export function registerEnergyApi(app: FastifyInstance): void {
  // GET /api/energy
  app.get('/api/energy', async (req: FastifyRequest) => {
    const rows = await db().select().from(energyPositions).where(eq(energyPositions.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      commodity: r.commodity,
      quantityUnit: r.quantityUnit,
      quantity: parseFloat(r.quantity),
      label: r.label ?? null,
      lastSpotPriceUsd: r.lastSpotPriceUsd !== null ? parseFloat(r.lastSpotPriceUsd) : null,
      valueUsd: r.lastSpotPriceUsd !== null ? parseFloat(r.quantity) * parseFloat(r.lastSpotPriceUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/energy
  app.post('/api/energy', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddPositionBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { commodity, quantity, label } = parsed.data;
    const userId = req.user!.id;
    const unit = EIA_COMMODITIES[commodity].unit;

    const [row] = await db()
      .insert(energyPositions)
      .values({ userId, commodity, quantityUnit: unit, quantity: quantity.toString(), label: label ?? null })
      .returning({ id: energyPositions.id });

    req.log.info({ userId, commodity }, 'energy position added');
    return reply.status(201).send({ ok: true, id: row!.id });
  });

  // PATCH /api/energy/:id
  app.patch('/api/energy/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'invalid id' });

    const parsed = UpdatePositionBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const updates: Record<string, string | null> = {};
    if (parsed.data.quantity !== undefined) updates.quantity = parsed.data.quantity.toString();
    if (parsed.data.label !== undefined) updates.label = parsed.data.label ?? null;

    if (Object.keys(updates).length === 0) return reply.status(400).send({ error: 'no fields to update' });

    await db()
      .update(energyPositions)
      .set(updates)
      .where(and(eq(energyPositions.userId, userId), eq(energyPositions.id, id)));

    return { ok: true };
  });

  // DELETE /api/energy/:id
  app.delete('/api/energy/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'invalid id' });

    await db()
      .delete(energyPositions)
      .where(and(eq(energyPositions.userId, req.user!.id), eq(energyPositions.id, id)));

    req.log.info({ userId: req.user!.id }, 'energy position removed');
    return reply.status(204).send();
  });

  // POST /api/energy/sync
  app.post('/api/energy/sync', SYNC_LIMIT, async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(energyPositions).where(eq(energyPositions.userId, userId));

    if (rows.length === 0) return { updated: 0 };

    const prices = await getAllEiaSpotPrices(config.EIA_API_KEY);
    if (prices.size === 0) return { updated: 0, note: 'EIA_API_KEY not configured or prices unavailable' };

    let updated = 0;
    const now = new Date();

    for (const row of rows) {
      const spotPrice = prices.get(row.commodity as EiaCommodity);
      if (spotPrice === undefined) continue;

      await db()
        .update(energyPositions)
        .set({ lastSpotPriceUsd: spotPrice.toString(), lastSyncedAt: now })
        .where(and(eq(energyPositions.userId, userId), eq(energyPositions.id, row.id)));

      updated++;
    }

    req.log.info({ userId, updated }, 'energy positions sync complete');
    return { updated };
  });
}
