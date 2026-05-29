import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { steamAccounts } from '../db/schema.js';
import { getCs2Inventory, priceInventory, SteamError } from '../steam/client.js';

const AddSteamAccountBodySchema = z.object({
  steamId64: z.string().regex(/^\d{17}$/, 'steamId64 must be a 17-digit number'),
  label: z.string().max(100).optional(),
});

export function registerSteamApi(app: FastifyInstance): void {
  // GET /api/steam-accounts
  app.get('/api/steam-accounts', async (req: FastifyRequest) => {
    const rows = await db().select().from(steamAccounts).where(eq(steamAccounts.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      steamId64: r.steamId64,
      label: r.label ?? null,
      lastPortfolioUsd: r.lastPortfolioUsd !== null ? parseFloat(r.lastPortfolioUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/steam-accounts
  app.post('/api/steam-accounts', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddSteamAccountBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { steamId64, label } = parsed.data;
    const userId = req.user!.id;

    const [existing] = await db()
      .select({ id: steamAccounts.id })
      .from(steamAccounts)
      .where(and(eq(steamAccounts.userId, userId), eq(steamAccounts.steamId64, steamId64)));
    if (existing) {
      return reply.status(409).send({ error: 'Steam account already linked' });
    }

    const [row] = await db()
      .insert(steamAccounts)
      .values({ userId, steamId64, label: label ?? null })
      .returning();

    req.log.info({ userId, steamId64 }, 'steam account added');
    return reply.status(201).send({ ok: true, id: row!.id, steamId64 });
  });

  // DELETE /api/steam-accounts/:id
  app.delete(
    '/api/steam-accounts/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.id;

      await db()
        .delete(steamAccounts)
        .where(and(eq(steamAccounts.userId, userId), eq(steamAccounts.id, id)));

      req.log.info({ userId, id }, 'steam account removed');
      return reply.status(204).send();
    },
  );

  // POST /api/steam-accounts/sync
  // Fetches CS2 inventory for all linked accounts and prices each item via Steam Market.
  app.post('/api/steam-accounts/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const rows = await db().select().from(steamAccounts).where(eq(steamAccounts.userId, userId));

    if (rows.length === 0) return { synced: 0, errors: [] };

    const errors: string[] = [];
    const now = new Date();
    let synced = 0;

    for (const row of rows) {
      try {
        const inventory = await getCs2Inventory(row.steamId64);
        const totalUsd = await priceInventory(inventory);

        await db()
          .update(steamAccounts)
          .set({ lastPortfolioUsd: totalUsd.toFixed(2), lastSyncedAt: now })
          .where(and(eq(steamAccounts.userId, userId), eq(steamAccounts.id, row.id)));

        synced++;
        req.log.info({ userId, steamId64: row.steamId64, totalUsd }, 'steam cs2 sync ok');
      } catch (err) {
        const msg =
          err instanceof SteamError && err.status === 403
            ? 'Profile is private'
            : err instanceof Error
              ? err.message
              : String(err);
        errors.push(`${row.steamId64}: ${msg}`);
        req.log.warn({ userId, steamId64: row.steamId64, err }, 'steam cs2 sync failed');
      }
    }

    return reply.status(errors.length > 0 && synced === 0 ? 422 : 200).send({ synced, errors });
  });
}
