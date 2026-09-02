import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { hyperliquidAccounts } from '../db/schema.js';
import { getHyperliquidState } from '../hyperliquid/client.js';
import type { VendorSyncResult } from '../store/connection-health.js';
import { recordSyncFailure, successPatch } from '../store/connection-health.js';
import { SYNC_LIMIT } from './rate-limits.js';

const AddAccountBodySchema = z.object({
  address: z.string().min(1).max(200),
  label: z.string().max(100).optional(),
});

export function registerHyperliquidApi(app: FastifyInstance): void {
  // GET /api/hyperliquid/accounts
  app.get('/api/hyperliquid/accounts', async (req: FastifyRequest) => {
    const rows = await db().select().from(hyperliquidAccounts).where(eq(hyperliquidAccounts.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      address: r.address,
      label: r.label ?? null,
      lastAccountValueUsd: r.lastAccountValueUsd !== null ? parseFloat(r.lastAccountValueUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/hyperliquid/accounts
  app.post('/api/hyperliquid/accounts', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddAccountBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { address, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(hyperliquidAccounts)
      .values({ userId, address, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId }, 'hyperliquid account added');
    return reply.status(201).send({ ok: true, address });
  });

  // DELETE /api/hyperliquid/accounts/:address
  app.delete(
    '/api/hyperliquid/accounts/:address',
    async (req: FastifyRequest<{ Params: { address: string } }>, reply: FastifyReply) => {
      const { address } = req.params;
      const userId = req.user!.id;

      await db()
        .delete(hyperliquidAccounts)
        .where(and(eq(hyperliquidAccounts.userId, userId), eq(hyperliquidAccounts.address, address)));

      req.log.info({ userId }, 'hyperliquid account removed');
      return reply.status(204).send();
    },
  );

  // POST /api/hyperliquid/sync
  // Fetches live account values from Hyperliquid and persists them.
  app.post('/api/hyperliquid/sync', SYNC_LIMIT, async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const result = await syncHyperliquid(userId);
    const updated = result.status === 'synced' ? result.updated : 0;

    req.log.info({ userId, updated }, 'hyperliquid sync complete');
    return { updated };
  });
}

/**
 * The Hyperliquid sync, extracted from its route so the scheduler can run it
 * unattended (sync/credential-vendors.ts).
 *
 * Per-address rather than per-user: the health columns live on the address row,
 * so a broken address is nameable instead of the whole class going degraded.
 * The first failure still ends the run and rethrows, which is what the route
 * did and what a scheduled run wants too: the addresses share a vendor, and one
 * that is refusing us is likely refusing us for all of them.
 */
export async function syncHyperliquid(userId: string): Promise<VendorSyncResult<{ updated: number }>> {
  const rows = await db().select().from(hyperliquidAccounts).where(eq(hyperliquidAccounts.userId, userId));
  if (rows.length === 0) return { status: 'not_connected' };

  let updated = 0;
  const now = new Date();

  for (const row of rows) {
    try {
      const state = await getHyperliquidState(row.address);
      // Perps account value PLUS spot token balances. This used to store the
      // perps figure alone, so an address holding spot tokens had them counted
      // nowhere: no error, no warning, simply absent from net worth.
      //
      // Deliberately reusing the existing column rather than adding one. The
      // column means "what this Hyperliquid address is worth", and it was
      // answering that question wrongly; a migration would only let both
      // answers coexist. See docs/integration-api-audit.md.
      //
      // Each term is coerced: a NaN here does not throw, it stringifies to
      // "NaN", and the numeric column stores NULL. That turns "we could not
      // price one token" into "this account is worth nothing", silently.
      const safe = (n: number): number => (Number.isFinite(n) ? n : 0);
      const totalUsd = safe(state.accountValue) + safe(state.spotValueUsd);
      await db()
        .update(hyperliquidAccounts)
        .set({ lastAccountValueUsd: totalUsd.toString(), ...successPatch(now) })
        .where(and(eq(hyperliquidAccounts.userId, userId), eq(hyperliquidAccounts.id, row.id)));
      updated++;
    } catch (err) {
      // Per-row, so the broken address is nameable rather than the whole class.
      await recordSyncFailure(
        hyperliquidAccounts,
        and(eq(hyperliquidAccounts.userId, userId), eq(hyperliquidAccounts.id, row.id)),
        row.consecutiveFailures,
        err,
      );
      throw err;
    }
  }

  return { status: 'synced', updated, body: { updated } };
}
