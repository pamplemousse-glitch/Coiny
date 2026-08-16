import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { kalshiConnections } from '../db/schema.js';
import { getPortfolioBalance } from '../kalshi/client.js';
import { decryptString, encryptString } from '../util/crypto.js';
import { SYNC_LIMIT } from './rate-limits.js';

const ConnectBodySchema = z.object({
  keyId: z.string().min(1),
  privateKeyBase64: z.string().min(1),
});

export function registerKalshiConnectApi(app: FastifyInstance): void {
  // POST /api/kalshi/connect — store key pair, verify with a live balance fetch
  app.post('/api/kalshi/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ConnectBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const { keyId, privateKeyBase64 } = parsed.data;

    // Verify the credentials work before storing
    const portfolioUsd = await getPortfolioBalance(keyId, privateKeyBase64);

    await db()
      .insert(kalshiConnections)
      .values({
        userId,
        keyId,
        privateKeyBase64: encryptString(privateKeyBase64),
        lastPortfolioUsd: portfolioUsd.toString(),
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: kalshiConnections.userId,
        set: {
          keyId,
          privateKeyBase64: encryptString(privateKeyBase64),
          lastPortfolioUsd: portfolioUsd.toString(),
          lastSyncedAt: new Date(),
        },
      });

    req.log.info({ userId }, 'kalshi connected');
    return { ok: true, portfolioUsd };
  });

  // GET /api/kalshi/status
  app.get('/api/kalshi/status', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(kalshiConnections).where(eq(kalshiConnections.userId, userId));
    if (!conn) return reply.status(404).send({ connected: false });

    return {
      connected: true,
      keyId: conn.keyId,
      lastPortfolioUsd: conn.lastPortfolioUsd !== null ? parseFloat(conn.lastPortfolioUsd) : null,
      lastSyncedAt: conn.lastSyncedAt,
    };
  });

  // POST /api/kalshi/sync — refresh portfolio value
  app.post('/api/kalshi/sync', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(kalshiConnections).where(eq(kalshiConnections.userId, userId));
    if (!conn) return reply.status(404).send({ error: 'not connected' });

    const portfolioUsd = await getPortfolioBalance(conn.keyId, decryptString(conn.privateKeyBase64));

    await db()
      .update(kalshiConnections)
      .set({ lastPortfolioUsd: portfolioUsd.toString(), lastSyncedAt: new Date() })
      .where(eq(kalshiConnections.userId, userId));

    req.log.info({ userId }, 'kalshi sync complete');
    return { portfolioUsd };
  });

  // DELETE /api/kalshi/connect
  app.delete('/api/kalshi/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    await db().delete(kalshiConnections).where(eq(kalshiConnections.userId, userId));
    req.log.info({ userId }, 'kalshi disconnected');
    return reply.status(204).send();
  });
}
