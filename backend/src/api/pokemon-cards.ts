import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { pokemonCardHoldings } from '../db/schema.js';
import { getPokemonCard } from '../pokemonpricetracker/client.js';
import { SYNC_LIMIT } from './rate-limits.js';

const CreateSchema = z.object({
  cardName: z.string().min(1),
  setName: z.string().optional(),
  variant: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  label: z.string().optional(),
});

const PatchSchema = z
  .object({
    quantity: z.number().int().positive().optional(),
    label: z.string().optional(),
    variant: z.string().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'at least one field required' });

export function registerPokemonCardsApi(app: FastifyInstance): void {
  app.get('/api/pokemon-cards', async (req) => {
    const rows = await db().select().from(pokemonCardHoldings).where(eq(pokemonCardHoldings.userId, req.user!.id));

    return rows.map((r) => ({
      id: r.id,
      cardName: r.cardName,
      setName: r.setName,
      variant: r.variant,
      quantity: r.quantity,
      label: r.label,
      lastPriceUsd: r.lastPriceUsd !== null ? parseFloat(r.lastPriceUsd) : null,
      imageUrl: r.imageUrl ?? null,
      valueUsd: r.lastPriceUsd !== null ? parseFloat(r.lastPriceUsd) * r.quantity : null,
      lastSyncedAt: r.lastSyncedAt,
    }));
  });

  app.post('/api/pokemon-cards', async (req, reply) => {
    const body = CreateSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const { cardName, setName, variant, quantity, label } = body.data;
    await db()
      .insert(pokemonCardHoldings)
      .values({
        userId: req.user!.id,
        cardName,
        setName: setName ?? null,
        variant: variant ?? null,
        quantity,
        label: label ?? null,
      });

    return reply.code(201).send({ ok: true });
  });

  app.patch('/api/pokemon-cards/:id', async (req, reply) => {
    const id = parseInt((req.params as { id: string }).id, 10);
    const body = PatchSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const updates: Partial<typeof pokemonCardHoldings.$inferInsert> = {};
    if (body.data.quantity !== undefined) updates.quantity = body.data.quantity;
    if (body.data.label !== undefined) updates.label = body.data.label;
    if (body.data.variant !== undefined) updates.variant = body.data.variant;

    await db()
      .update(pokemonCardHoldings)
      .set(updates)
      .where(and(eq(pokemonCardHoldings.id, id), eq(pokemonCardHoldings.userId, req.user!.id)));

    return { ok: true };
  });

  app.delete('/api/pokemon-cards/:id', async (req, reply) => {
    const id = parseInt((req.params as { id: string }).id, 10);
    await db()
      .delete(pokemonCardHoldings)
      .where(and(eq(pokemonCardHoldings.id, id), eq(pokemonCardHoldings.userId, req.user!.id)));

    return reply.code(204).send();
  });

  app.post('/api/pokemon-cards/sync', SYNC_LIMIT, async (req) => {
    return syncPokemonCards(req.user!.id);
  });
}

/** Re-price every Pokemon card from PokemonPriceTracker.
 *
 *  Extracted from the route so the scheduler can call it. See
 *  `sync/price-classes.ts`.
 *
 *  Note this one fans out with `Promise.all` rather than looping, unlike its
 *  siblings. Fine at a handful of cards; if a collection gets large this is the
 *  class most likely to trip a vendor rate limit, and the fix is a concurrency
 *  bound here rather than a longer interval in the registry. */
// `errors` optional and omitted when there is nothing to price: this is the
// route's response body, so the extraction had to preserve its shape exactly.
export async function syncPokemonCards(userId: string): Promise<{ updated: number; errors?: number }> {
  const apiKey = config.POKEMONPRICETRACKER_API_KEY;

  const rows = await db().select().from(pokemonCardHoldings).where(eq(pokemonCardHoldings.userId, userId));

  if (rows.length === 0) return { updated: 0 };

  let updated = 0;
  let errors = 0;

  await Promise.all(
    rows.map(async (row) => {
      const facts = await getPokemonCard(row.cardName, row.setName, row.variant, apiKey);
      const price = facts?.priceUsd ?? null;
      if (price === null) {
        errors++;
        return;
      }
      await db()
        .update(pokemonCardHoldings)
        // Image rides along in the same response; only written when present.
        .set({
          lastPriceUsd: price.toString(),
          lastSyncedAt: new Date(),
          ...(facts?.imageUrl ? { imageUrl: facts.imageUrl } : {}),
        })
        .where(eq(pokemonCardHoldings.id, row.id));
      updated++;
    }),
  );

  return { updated, errors };
}
