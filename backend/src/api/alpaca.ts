import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AlpacaEnv } from '../alpaca/client.js';
import { AlpacaError, getEquityUsd, getPositions } from '../alpaca/client.js';
import { db } from '../db/client.js';
import { alpacaConnections } from '../db/schema.js';
import { recordSyncFailure, successPatch } from '../store/connection-health.js';
import { decryptString, encryptString } from '../util/crypto.js';
import { SYNC_LIMIT } from './rate-limits.js';

const ConnectBodySchema = z.object({
  apiKeyId: z.string().min(1),
  apiSecretKey: z.string().min(1),
  env: z.enum(['paper', 'live']).default('paper'),
});

export function registerAlpacaApi(app: FastifyInstance): void {
  // POST /api/alpaca/connect — store encrypted credentials
  app.post('/api/alpaca/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ConnectBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { apiKeyId, apiSecretKey, env } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(alpacaConnections)
      .values({
        userId,
        apiKeyId: encryptString(apiKeyId),
        apiSecretKey: encryptString(apiSecretKey),
        env,
      })
      .onConflictDoUpdate({
        target: alpacaConnections.userId,
        set: {
          apiKeyId: encryptString(apiKeyId),
          apiSecretKey: encryptString(apiSecretKey),
          env,
        },
      });

    req.log.info({ userId, env }, 'alpaca connected');
    return { ok: true };
  });

  // GET /api/alpaca/status — check connection + return cached equity
  app.get('/api/alpaca/status', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(alpacaConnections).where(eq(alpacaConnections.userId, userId));
    if (!conn) return reply.status(404).send({ error: 'not connected' });

    return {
      env: conn.env,
      lastEquityUsd: conn.lastEquityUsd !== null ? parseFloat(conn.lastEquityUsd) : null,
      lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
    };
  });

  // POST /api/alpaca/sync — fetch live equity from Alpaca and cache it
  app.post('/api/alpaca/sync', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(alpacaConnections).where(eq(alpacaConnections.userId, userId));
    if (!conn) return reply.status(404).send({ error: 'not connected' });

    try {
      const equity = await getEquityUsd(
        decryptString(conn.apiKeyId),
        decryptString(conn.apiSecretKey),
        conn.env as AlpacaEnv,
      );

      await db()
        .update(alpacaConnections)
        .set({ lastEquityUsd: equity.toString(), ...successPatch() })
        .where(eq(alpacaConnections.userId, userId));

      req.log.info({ userId, equity }, 'alpaca sync complete');
      return { equity };
    } catch (err) {
      // Recorded before the 401 branch, not after: a rejected API key is the
      // single most user-actionable failure this route has, and it is exactly
      // the case `deriveConnectionStatus` maps to `reauth_required` and offers
      // a Reconnect button for. Returning 401 to the client is not a reason to
      // forget it happened.
      await recordSyncFailure(alpacaConnections, eq(alpacaConnections.userId, userId), conn.consecutiveFailures, err);
      if (err instanceof AlpacaError && (err.status === 401 || err.status === 403)) {
        return reply.status(401).send({ error: 'Invalid Alpaca API credentials' });
      }
      throw err;
    }
  });

  // GET /api/alpaca/positions — the individual holdings behind the equity total
  //
  // Read live rather than cached. Positions have no column to cache into, and
  // adding one would mean a migration; the equity figure that net worth reads
  // is still the cached one, so this route is additive detail for the Wealth
  // tab rather than a new source of truth for the total.
  app.get('/api/alpaca/positions', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(alpacaConnections).where(eq(alpacaConnections.userId, userId));
    if (!conn) return reply.status(404).send({ error: 'not connected' });

    try {
      const positions = await getPositions(
        decryptString(conn.apiKeyId),
        decryptString(conn.apiSecretKey),
        conn.env as AlpacaEnv,
      );
      // Count only, never the symbols: a holdings list is exactly the kind of
      // financial detail .claude/rules/security.md #2 keeps out of logs.
      req.log.info({ userId, count: positions.length }, 'alpaca positions fetched');
      return { positions };
    } catch (err) {
      if (err instanceof AlpacaError && (err.status === 401 || err.status === 403)) {
        return reply.status(401).send({ error: 'Invalid Alpaca API credentials' });
      }
      throw err;
    }
  });

  // DELETE /api/alpaca/connect — remove connection
  app.delete('/api/alpaca/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    await db().delete(alpacaConnections).where(eq(alpacaConnections.userId, userId));
    req.log.info({ userId }, 'alpaca disconnected');
    return reply.status(204).send();
  });
}
