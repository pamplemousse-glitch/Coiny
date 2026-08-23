import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { krakenConnections } from '../db/schema.js';
import { getBalance, getTotalUsd } from '../kraken/client.js';
import { recordSyncFailure, successPatch } from '../store/connection-health.js';
import { decryptString, encryptString } from '../util/crypto.js';
import { SYNC_LIMIT } from './rate-limits.js';

const ConnectBodySchema = z.object({
  apiKey: z.string().min(1),
  privateKey: z.string().min(1),
});

export function registerKrakenApi(app: FastifyInstance): void {
  // POST /api/kraken/connect — store encrypted API key + private key
  app.post('/api/kraken/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ConnectBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    await db()
      .insert(krakenConnections)
      .values({
        userId,
        apiKey: encryptString(parsed.data.apiKey),
        privateKey: encryptString(parsed.data.privateKey),
      })
      .onConflictDoUpdate({
        target: krakenConnections.userId,
        set: {
          apiKey: encryptString(parsed.data.apiKey),
          privateKey: encryptString(parsed.data.privateKey),
        },
      });

    req.log.info({ userId }, 'kraken connected');
    return { ok: true };
  });

  // GET /api/kraken/balances — return raw balance object from Kraken
  app.get('/api/kraken/balances', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [connection] = await db().select().from(krakenConnections).where(eq(krakenConnections.userId, userId));
    if (!connection) return reply.status(404).send({ error: 'not connected' });

    const balances = await getBalance(decryptString(connection.apiKey), decryptString(connection.privateKey));
    return balances;
  });

  // POST /api/kraken/sync — compute USD total, cache it, return it
  app.post('/api/kraken/sync', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [connection] = await db().select().from(krakenConnections).where(eq(krakenConnections.userId, userId));
    if (!connection) return reply.status(404).send({ error: 'not connected' });

    // Per-connection health (survey gap 2). The catch RETHROWS: the client
    // still gets its 500 and plugins/error-handler.ts still reports it. This
    // only adds the durable fact of WHICH connection failed, so the next
    // GET /api/net-worth can name it instead of saying the class is degraded.
    try {
      // Import Coinbase spot prices as the price oracle
      const { getSpotPrices } = await import('../coinbase/client.js');
      const getSpotPrice = async (asset: string): Promise<number> => {
        const prices = await getSpotPrices([asset]);
        const price = prices.get(asset);
        if (price === undefined) throw new Error(`no price for ${asset}`);
        return price;
      };

      const total = await getTotalUsd(
        decryptString(connection.apiKey),
        decryptString(connection.privateKey),
        getSpotPrice,
      );

      await db()
        .update(krakenConnections)
        .set({ lastTotalUsd: total.toString(), ...successPatch() })
        .where(eq(krakenConnections.userId, userId));

      req.log.info({ userId }, 'kraken sync complete');
      return { total };
    } catch (err) {
      await recordSyncFailure(
        krakenConnections,
        eq(krakenConnections.userId, userId),
        connection.consecutiveFailures,
        err,
      );
      throw err;
    }
  });

  // DELETE /api/kraken/connect — remove connection
  app.delete('/api/kraken/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    await db().delete(krakenConnections).where(eq(krakenConnections.userId, userId));
    req.log.info({ userId }, 'kraken disconnected');
    return reply.status(204).send();
  });
}
