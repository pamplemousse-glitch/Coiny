import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { manualAssets } from '../db/schema.js';

const VALID_CATEGORIES = [
  'art',
  'life_insurance',
  'luxury_handbags',
  'watches',
  'wine',
  'annuities',
  'pension',
  'mineral_rights',
  'intellectual_property',
  'fractional_collectibles',
  'crowdfunded_equity',
  'timeshare',
  'aircraft',
  'other',
] as const;

const CreateBodySchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(VALID_CATEGORIES),
  selfReportedValueUsd: z.number().nonnegative(),
  notes: z.string().max(1000).optional(),
});

const UpdateBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  selfReportedValueUsd: z.number().nonnegative().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export function registerManualAssetsApi(app: FastifyInstance): void {
  // GET /api/manual-assets
  app.get('/api/manual-assets', async (req: FastifyRequest) => {
    const rows = await db().select().from(manualAssets).where(eq(manualAssets.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      selfReportedValueUsd: parseFloat(r.selfReportedValueUsd),
      notes: r.notes ?? null,
      lastUpdatedAt: r.lastUpdatedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/manual-assets
  app.post('/api/manual-assets', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { name, category, selfReportedValueUsd, notes } = parsed.data;
    const userId = req.user!.id;

    const [row] = await db()
      .insert(manualAssets)
      .values({
        userId,
        name,
        category,
        selfReportedValueUsd: selfReportedValueUsd.toString(),
        notes: notes ?? null,
      })
      .returning();

    req.log.info({ userId, category }, 'manual asset added');
    return reply.status(201).send({ ok: true, id: row!.id });
  });

  // PATCH /api/manual-assets/:id
  app.patch('/api/manual-assets/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const parsed = UpdateBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const id = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    const { name, category, selfReportedValueUsd, notes } = parsed.data;

    const updates: Record<string, unknown> = { lastUpdatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (selfReportedValueUsd !== undefined) updates.selfReportedValueUsd = selfReportedValueUsd.toString();
    if (notes !== undefined) updates.notes = notes;

    await db()
      .update(manualAssets)
      .set(updates)
      .where(and(eq(manualAssets.userId, userId), eq(manualAssets.id, id)));

    req.log.info({ userId, id }, 'manual asset updated');
    return { ok: true };
  });

  // DELETE /api/manual-assets/:id
  app.delete('/api/manual-assets/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.id;

    await db()
      .delete(manualAssets)
      .where(and(eq(manualAssets.userId, userId), eq(manualAssets.id, id)));

    req.log.info({ userId, id }, 'manual asset removed');
    return reply.status(204).send();
  });
}
