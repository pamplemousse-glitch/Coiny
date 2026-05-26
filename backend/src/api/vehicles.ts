import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { vehicleAssets } from '../db/schema.js';
import { getVehicleValue } from '../vehicles/client.js';

const AddVehicleBodySchema = z.object({
  vin: z.string().min(1).max(50),
  label: z.string().max(100).optional(),
});

export function registerVehiclesApi(app: FastifyInstance): void {
  // GET /api/vehicles
  app.get('/api/vehicles', async (req: FastifyRequest) => {
    const rows = await db().select().from(vehicleAssets).where(eq(vehicleAssets.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      vin: r.vin,
      label: r.label ?? null,
      lastValueUsd: r.lastValueUsd !== null ? parseFloat(r.lastValueUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/vehicles
  app.post('/api/vehicles', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddVehicleBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { vin, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(vehicleAssets)
      .values({ userId, vin, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId }, 'vehicle asset added');
    return reply.status(201).send({ ok: true, vin });
  });

  // DELETE /api/vehicles/:id
  app.delete('/api/vehicles/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.id;

    await db()
      .delete(vehicleAssets)
      .where(and(eq(vehicleAssets.userId, userId), eq(vehicleAssets.id, id)));

    req.log.info({ userId, id }, 'vehicle asset removed');
    return reply.status(204).send();
  });

  // POST /api/vehicles/sync
  app.post('/api/vehicles/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const rows = await db().select().from(vehicleAssets).where(eq(vehicleAssets.userId, userId));

    let synced = 0;
    let errors = 0;
    const now = new Date();

    for (const row of rows) {
      try {
        const value = await getVehicleValue(row.vin);
        await db()
          .update(vehicleAssets)
          .set({ lastValueUsd: value.toString(), lastSyncedAt: now })
          .where(and(eq(vehicleAssets.userId, userId), eq(vehicleAssets.id, row.id)));
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'MARKETCHECK_API_KEY not configured') {
          return reply.status(402).send({ error: 'MARKETCHECK_API_KEY not configured' });
        }
        errors++;
      }
    }

    req.log.info({ userId, synced, errors }, 'vehicles sync complete');
    return { synced, errors };
  });
}
