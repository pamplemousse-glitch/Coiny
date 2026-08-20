import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { realEstateAssets } from '../db/schema.js';
import { deriveValueFromPurchase } from '../fred/client.js';
import { getPropertyValuation } from '../realestate/client.js';
import { SYNC_LIMIT } from './rate-limits.js';

const AddAssetBodySchema = z.object({
  address: z.string().min(1).max(500),
  label: z.string().max(100).optional(),
  // Both optional, and only useful together. Supplying them enables DR-21's
  // derived valuation, which is what lets a property carry a value at all
  // while RENTCAST_API_KEY is unset — its state today.
  purchasePriceUsd: z.number().positive().optional(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
    .optional(),
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
      // The client needs this to label the figure honestly. A derived value is
      // an index-tracked estimate of what a typical home bought at that price
      // would be worth, not an appraisal of this one.
      valuationSource: r.valuationSource ?? null,
      // The vendor's confidence interval. A $250k estimate with a
      // $195k-$304k band is not the same claim as one with a $245k-$255k band,
      // and the client needs both numbers to say so.
      priceRangeLowUsd: r.priceRangeLowUsd !== null ? parseFloat(r.priceRangeLowUsd) : null,
      priceRangeHighUsd: r.priceRangeHighUsd !== null ? parseFloat(r.priceRangeHighUsd) : null,
      purchasePriceUsd: r.purchasePriceUsd !== null ? parseFloat(r.purchasePriceUsd) : null,
      purchaseDate: r.purchaseDate ?? null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/real-estate
  app.post('/api/real-estate', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddAssetBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { address, label, purchasePriceUsd, purchaseDate } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(realEstateAssets)
      .values({
        userId,
        address,
        label: label ?? null,
        purchasePriceUsd: purchasePriceUsd !== undefined ? purchasePriceUsd.toString() : null,
        purchaseDate: purchaseDate ?? null,
      })
      .onConflictDoNothing();

    // Never log the address: it identifies a home and through it a person
    // (.claude/rules/security.md #2). Whether a derived valuation is possible
    // is not identifying.
    req.log.info(
      { userId, derivable: purchasePriceUsd !== undefined && purchaseDate !== undefined },
      'real estate asset added',
    );
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
  app.post('/api/real-estate/sync', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const rows = await db().select().from(realEstateAssets).where(eq(realEstateAssets.userId, userId));

    let synced = 0;
    let derived = 0;
    let errors = 0;
    let missingKey = false;
    const now = new Date();

    // Falls back to DR-21's derived tier rather than returning 402 the moment
    // RentCast is unavailable. Property is the largest asset most Americans
    // own and it currently throws on every call because RENTCAST_API_KEY is
    // unset, so an index-tracked figure the user can see beats a correct error
    // they cannot act on. The AVM is still preferred whenever it answers.
    async function deriveFor(row: (typeof rows)[number]): Promise<boolean> {
      if (row.purchasePriceUsd === null || row.purchaseDate === null) return false;
      const valuation = await deriveValueFromPurchase(Number.parseFloat(row.purchasePriceUsd), row.purchaseDate);
      if (valuation === null) return false;

      await db()
        .update(realEstateAssets)
        .set({ lastValueUsd: valuation.valueUsd.toString(), lastSyncedAt: now, valuationSource: 'derived' })
        .where(and(eq(realEstateAssets.userId, userId), eq(realEstateAssets.id, row.id)));
      return true;
    }

    for (const row of rows) {
      try {
        const valuation = await getPropertyValuation(row.address);
        await db()
          .update(realEstateAssets)
          .set({
            lastValueUsd: valuation.valueUsd.toString(),
            lastSyncedAt: now,
            valuationSource: 'avm',
            // The vendor's own uncertainty, stored rather than replaced with
            // ours. Null stays null: a missing band is not a narrow one.
            priceRangeLowUsd: valuation.priceRangeLowUsd?.toString() ?? null,
            priceRangeHighUsd: valuation.priceRangeHighUsd?.toString() ?? null,
            // Backfills DR-21's derived-valuation input without asking the
            // user, but never overwrites a purchase price they entered.
            ...(valuation.lastSalePriceUsd !== null && row.purchasePriceUsd === null
              ? {
                  lastSalePriceUsd: valuation.lastSalePriceUsd.toString(),
                  lastSaleDate: valuation.lastSaleDate,
                  purchasePriceUsd: valuation.lastSalePriceUsd.toString(),
                  purchaseDate: valuation.lastSaleDate,
                }
              : {}),
          })
          .where(and(eq(realEstateAssets.userId, userId), eq(realEstateAssets.id, row.id)));
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'RENTCAST_API_KEY not configured') missingKey = true;

        // A derived figure needs no credential, so it is worth trying for
        // every AVM failure, not only the missing-key one.
        const ok = await deriveFor(row).catch(() => false);
        if (ok) derived++;
        else errors++;
      }
    }

    // 402 only when nothing could be valued at all. With a purchase price on
    // file the missing key is no longer a dead end, and reporting it as one
    // would hide a figure we successfully produced.
    if (missingKey && derived === 0 && synced === 0) {
      return reply.status(402).send({ error: 'RENTCAST_API_KEY not configured' });
    }

    req.log.info({ userId, synced, derived, errors }, 'real estate sync complete');
    return { synced, derived, errors };
  });
}
