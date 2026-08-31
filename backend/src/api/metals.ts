import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { metalHoldings } from '../db/schema.js';
import { getMetalSpotPrice } from '../metals/client.js';
import { SYNC_LIMIT } from './rate-limits.js';

const VALID_METALS = ['XAU', 'XAG', 'XPT', 'XPD'] as const;

const AddMetalBodySchema = z.object({
  metal: z.enum(VALID_METALS),
  weightOz: z.number().positive(),
  label: z.string().max(100).optional(),
});

export function registerMetalsApi(app: FastifyInstance): void {
  // GET /api/metals
  app.get('/api/metals', async (req: FastifyRequest) => {
    const rows = await db().select().from(metalHoldings).where(eq(metalHoldings.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      metal: r.metal,
      weightOz: parseFloat(r.weightOz),
      label: r.label ?? null,
      lastValueUsd: r.lastValueUsd !== null ? parseFloat(r.lastValueUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/metals
  app.post('/api/metals', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddMetalBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { metal, weightOz, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(metalHoldings)
      .values({ userId, metal, weightOz: weightOz.toString(), label: label ?? null });

    req.log.info({ userId, metal }, 'metal holding added');
    return reply.status(201).send({ ok: true, metal, weightOz });
  });

  // DELETE /api/metals/:id
  app.delete('/api/metals/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.id;

    await db()
      .delete(metalHoldings)
      .where(and(eq(metalHoldings.userId, userId), eq(metalHoldings.id, id)));

    req.log.info({ userId, id }, 'metal holding removed');
    return reply.status(204).send();
  });

  // POST /api/metals/sync
  app.post('/api/metals/sync', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await syncMetals(req.user!.id);
    if (result.unconfigured) {
      return reply.status(402).send({ error: 'GOLDAPI_API_KEY not configured' });
    }
    req.log.info({ userId: req.user!.id, synced: result.synced, errors: result.errors }, 'metals sync complete');
    return { synced: result.synced, errors: result.errors };
  });
}

/** Re-value every metal holding from the GoldAPI spot feed.
 *
 *  Extracted from the route so the scheduler can call it. See
 *  `sync/price-classes.ts`.
 *
 *  `unconfigured` rather than a thrown error, because a missing key is not a
 *  failure of this user's data: the route turns it into a 402 (the caller must
 *  supply a key) and the scheduler treats it as "skip the whole class", since
 *  running it for the next user would fail identically and burn a tick doing
 *  it. */
export async function syncMetals(userId: string): Promise<{ synced: number; errors: number; unconfigured?: true }> {
  const rows = await db().select().from(metalHoldings).where(eq(metalHoldings.userId, userId));

  // Fetch spot price once per unique metal symbol.
  const uniqueMetals = [...new Set(rows.map((r) => r.metal))];
  const spotPrices = new Map<string, { priceUsd: number; asOf: Date | null }>();

  for (const metal of uniqueMetals) {
    try {
      const spot = await getMetalSpotPrice(metal);
      spotPrices.set(metal, spot);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'GOLDAPI_API_KEY not configured') {
        return { synced: 0, errors: 0, unconfigured: true };
      }
      // Leave metal out of map; its holdings will be counted as errors below.
    }
  }

  let synced = 0;
  let errors = 0;
  const now = new Date();

  for (const row of rows) {
    const spot = spotPrices.get(row.metal);
    if (spot === undefined) {
      errors++;
      continue;
    }
    const valueUsd = spot.priceUsd * parseFloat(row.weightOz);
    await db()
      .update(metalHoldings)
      .set({
        lastValueUsd: valueUsd.toString(),
        lastSyncedAt: now,
        // The vendor's own quote time when it sent one. Null leaves the
        // freshness reader on lastSyncedAt, which is the old behaviour.
        priceAsOf: spot.asOf ?? null,
      })
      .where(and(eq(metalHoldings.userId, userId), eq(metalHoldings.id, row.id)));
    synced++;
  }

  return { synced, errors };
}
