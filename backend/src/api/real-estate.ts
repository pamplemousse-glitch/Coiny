import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { realEstateAssets } from '../db/schema.js';
import { getPropertyValue } from '../realestate/client.js';

const AddAssetBodySchema = z.object({
  address: z.string().min(1).max(500),
  label: z.string().max(100).optional(),
});

export function registerRealEstateApi(app: FastifyInstance): void {
  // GET /api/real-estate
  app.get('/api/real-estate', async (req: FastifyRequest) => {
    const rows = await db().select().from(realEstateAssets).where(eq(realEstateAssets.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      address: r.address,
      label: r.label ?? null,
      lastValueUsd: r.lastValueUsd !== null ? parseFloat(r.lastValueUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/real-estate
  app.post('/api/real-estate', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddAssetBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { address, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(realEstateAssets)
      .values({ userId, address, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId }, 'real estate asset added');
    return reply.status(201).send({ ok: true, address });
  });

  // DELETE /api/real-estate/:id
  app.delete('/api/real-estate/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.id;

    await db()
      .delete(realEstateAssets)
      .where(and(eq(realEstateAssets.userId, userId), eq(realEstateAssets.id, id)));

    req.log.info({ userId, id }, 'real estate asset removed');
    return reply.status(204).send();
  });

  // POST /api/real-estate/sync
  app.post('/api/real-estate/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const rows = await db().select().from(realEstateAssets).where(eq(realEstateAssets.userId, userId));

    let synced = 0;
    let errors = 0;
    const now = new Date();

    for (const row of rows) {
      try {
        const value = await getPropertyValue(row.address);
        await db()
          .update(realEstateAssets)
          .set({ lastValueUsd: value.toString(), lastSyncedAt: now })
          .where(and(eq(realEstateAssets.userId, userId), eq(realEstateAssets.id, row.id)));
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'RENTCAST_API_KEY not configured') {
          return reply.status(402).send({ error: 'RENTCAST_API_KEY not configured' });
        }
        errors++;
      }
    }

    req.log.info({ userId, synced, errors }, 'real estate sync complete');
    return { synced, errors };
  });
}
