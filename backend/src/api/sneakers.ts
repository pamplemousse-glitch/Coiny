import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { sneakerHoldings } from '../db/schema.js';
import { getSneakerPrice } from '../kicksdb/client.js';
import { SYNC_LIMIT } from './rate-limits.js';

const AddSneakerBodySchema = z.object({
  sku: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  size: z.string().max(20).optional(),
  quantity: z.number().int().positive().default(1),
});

export function registerSneakersApi(app: FastifyInstance): void {
  // GET /api/sneakers
  app.get('/api/sneakers', async (req: FastifyRequest) => {
    const rows = await db().select().from(sneakerHoldings).where(eq(sneakerHoldings.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      description: r.description ?? null,
      size: r.size ?? null,
      quantity: r.quantity,
      lastPriceUsd: r.lastPriceUsd !== null ? parseFloat(r.lastPriceUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/sneakers
  app.post('/api/sneakers', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddSneakerBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { sku, description, size, quantity } = parsed.data;
    const userId = req.user!.id;

    const [row] = await db()
      .insert(sneakerHoldings)
      .values({ userId, sku, description: description ?? null, size: size ?? null, quantity })
      .returning();

    req.log.info({ userId, sku }, 'sneaker holding added');
    return reply.status(201).send({ ok: true, id: row!.id, sku, quantity });
  });

  // DELETE /api/sneakers/:id
  app.delete('/api/sneakers/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.id;

    await db()
      .delete(sneakerHoldings)
      .where(and(eq(sneakerHoldings.userId, userId), eq(sneakerHoldings.id, id)));

    req.log.info({ userId, id }, 'sneaker holding removed');
    return reply.status(204).send();
  });

  // POST /api/sneakers/sync
  app.post('/api/sneakers/sync', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const rows = await db().select().from(sneakerHoldings).where(eq(sneakerHoldings.userId, userId));

    if (rows.length === 0) return { synced: 0, errors: 0 };

    let synced = 0;
    let errors = 0;
    const now = new Date();

    for (const row of rows) {
      try {
        const price = await getSneakerPrice(row.sku, row.size ?? undefined);
        if (price === null) {
          errors++;
          continue;
        }
        await db()
          .update(sneakerHoldings)
          .set({ lastPriceUsd: price.toString(), lastSyncedAt: now })
          .where(and(eq(sneakerHoldings.userId, userId), eq(sneakerHoldings.id, row.id)));
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('KICKSDB_API_KEY not configured') || msg === 'null') {
          return reply.status(402).send({ error: 'KICKSDB_API_KEY not configured' });
        }
        req.log.warn({ sku: row.sku, err }, 'sneaker price lookup failed');
        errors++;
      }
    }

    req.log.info({ userId, synced, errors }, 'sneakers sync complete');
    return { synced, errors };
  });
}
