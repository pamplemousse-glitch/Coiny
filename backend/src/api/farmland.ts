import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { farmlandParcels } from '../db/schema.js';
import { getFarmlandPricePerAcre } from '../usda/client.js';
import { SYNC_LIMIT } from './rate-limits.js';

const AddParcelBodySchema = z.object({
  stateCode: z.string().length(2),
  acres: z.number().positive(),
  label: z.string().max(100).optional(),
});

const UpdateParcelBodySchema = z.object({
  acres: z.number().positive().optional(),
  label: z.string().max(100).optional(),
});

export function registerFarmlandApi(app: FastifyInstance): void {
  // GET /api/farmland
  app.get('/api/farmland', async (req: FastifyRequest) => {
    const rows = await db().select().from(farmlandParcels).where(eq(farmlandParcels.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      stateCode: r.stateCode,
      acres: parseFloat(r.acres),
      label: r.label ?? null,
      lastPricePerAcreUsd: r.lastPricePerAcreUsd !== null ? parseFloat(r.lastPricePerAcreUsd) : null,
      valueUsd: r.lastPricePerAcreUsd !== null ? parseFloat(r.acres) * parseFloat(r.lastPricePerAcreUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/farmland
  app.post('/api/farmland', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddParcelBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { stateCode, acres, label } = parsed.data;
    const userId = req.user!.id;

    const [row] = await db()
      .insert(farmlandParcels)
      .values({
        userId,
        stateCode: stateCode.toUpperCase(),
        acres: acres.toString(),
        label: label ?? null,
      })
      .returning({ id: farmlandParcels.id });

    req.log.info({ userId, stateCode }, 'farmland parcel added');
    return reply.status(201).send({ ok: true, id: row!.id });
  });

  // PATCH /api/farmland/:id
  app.patch('/api/farmland/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.status(400).send({ error: 'invalid id' });

    const parsed = UpdateParcelBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const updates: Record<string, string | null> = {};
    if (parsed.data.acres !== undefined) updates.acres = parsed.data.acres.toString();
    if (parsed.data.label !== undefined) updates.label = parsed.data.label ?? null;

    if (Object.keys(updates).length === 0) return reply.status(400).send({ error: 'no fields to update' });

    await db()
      .update(farmlandParcels)
      .set(updates)
      .where(and(eq(farmlandParcels.userId, userId), eq(farmlandParcels.id, id)));

    return { ok: true };
  });

  // DELETE /api/farmland/:id
  app.delete('/api/farmland/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.status(400).send({ error: 'invalid id' });

    await db()
      .delete(farmlandParcels)
      .where(and(eq(farmlandParcels.userId, req.user!.id), eq(farmlandParcels.id, id)));

    req.log.info({ userId: req.user!.id }, 'farmland parcel removed');
    return reply.status(204).send();
  });

  // POST /api/farmland/sync
  app.post('/api/farmland/sync', SYNC_LIMIT, async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(farmlandParcels).where(eq(farmlandParcels.userId, userId));

    if (rows.length === 0) return { updated: 0 };

    let updated = 0;
    const now = new Date();
    const priceCache = new Map<string, number | null>();

    for (const row of rows) {
      const stateCode = row.stateCode.toUpperCase();

      if (!priceCache.has(stateCode)) {
        const price = await getFarmlandPricePerAcre(stateCode, config.USDA_NASS_API_KEY).catch(() => null);
        priceCache.set(stateCode, price);
      }

      const pricePerAcre = priceCache.get(stateCode) ?? null;
      if (pricePerAcre === null) continue;

      await db()
        .update(farmlandParcels)
        .set({ lastPricePerAcreUsd: pricePerAcre.toString(), lastSyncedAt: now })
        .where(and(eq(farmlandParcels.userId, userId), eq(farmlandParcels.id, row.id)));

      updated++;
    }

    req.log.info({ userId, updated }, 'farmland parcels sync complete');
    return { updated };
  });
}
