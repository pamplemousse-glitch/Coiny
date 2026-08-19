import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { vehicleAssets } from '../db/schema.js';
import { getVehicleValue } from '../vehicles/client.js';
import { decodeVin, describeVehicle } from '../vpic/client.js';
import { SYNC_LIMIT } from './rate-limits.js';

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
      make: r.make ?? null,
      model: r.model ?? null,
      modelYear: r.modelYear ?? null,
      trim: r.trim ?? null,
      bodyClass: r.bodyClass ?? null,
      // The user's own label wins when they set one; otherwise the vPIC decode
      // names the car. Falling back to the raw VIN is the last resort, and it
      // is what every row showed before the decode existed.
      displayName:
        r.label ??
        describeVehicle({
          make: r.make ?? null,
          model: r.model ?? null,
          modelYear: r.modelYear ?? null,
          trim: r.trim ?? null,
          bodyClass: r.bodyClass ?? null,
          vehicleType: null,
          errorCode: r.vinDecodeErrorCode ?? null,
          usable: r.vinUsable ?? false,
        }) ??
        r.vin,
      vinUsable: r.vinUsable ?? null,
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

    // Best effort, and deliberately not awaited behind a guard: vPIC being
    // unreachable must not stop someone recording a car they own. A null
    // decode leaves every column null, which reads as "not decoded yet" and
    // can be filled in on a later sync.
    const decode = await decodeVin(vin).catch(() => null);

    await db()
      .insert(vehicleAssets)
      .values({
        userId,
        vin,
        label: label ?? null,
        make: decode?.make ?? null,
        model: decode?.model ?? null,
        modelYear: decode?.modelYear ?? null,
        trim: decode?.trim ?? null,
        bodyClass: decode?.bodyClass ?? null,
        vinDecodeErrorCode: decode?.errorCode ?? null,
        vinUsable: decode?.usable ?? null,
      })
      .onConflictDoNothing();

    // Never log the VIN itself: it identifies a specific vehicle and, through
    // it, a person (.claude/rules/security.md #2). The decode is generic.
    req.log.info({ userId, decoded: decode !== null, vinUsable: decode?.usable ?? null }, 'vehicle asset added');
    return reply.status(201).send({
      ok: true,
      vin,
      make: decode?.make ?? null,
      model: decode?.model ?? null,
      modelYear: decode?.modelYear ?? null,
      trim: decode?.trim ?? null,
      vinUsable: decode?.usable ?? null,
    });
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
  app.post('/api/vehicles/sync', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const rows = await db().select().from(vehicleAssets).where(eq(vehicleAssets.userId, userId));

    let synced = 0;
    let errors = 0;
    let skippedUndecodable = 0;
    const now = new Date();

    for (const row of rows) {
      // The reason vPIC is worth calling at all. MarketCheck's free tier is
      // 500 calls a month and the next tier up is $299/month with nothing in
      // between, so a call spent proving that a mistyped VIN is still mistyped
      // is a call not available for a real vehicle.
      //
      // Only an explicit false skips. null means we never got a decode — vPIC
      // was down, or the row predates 0055 — and an absent opinion is not a
      // negative one, so those still go to MarketCheck as before.
      if (row.vinUsable === false) {
        skippedUndecodable++;
        continue;
      }

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

    req.log.info({ userId, synced, errors, skippedUndecodable }, 'vehicles sync complete');
    return { synced, errors, skippedUndecodable };
  });
}
