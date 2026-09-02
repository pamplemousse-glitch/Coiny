import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { discogsConnections, discogsPending } from '../db/schema.js';
import { getAccessToken, getRequestToken, getUsername, syncCollection } from '../discogs/client.js';
import type { VendorSyncResult } from '../store/connection-health.js';
import { recordSyncFailure, successPatch } from '../store/connection-health.js';
import { decryptString, encryptString } from '../util/crypto.js';
import { SYNC_LIMIT } from './rate-limits.js';

const VerifyBodySchema = z.object({
  oauthToken: z.string().min(1),
  oauthVerifier: z.string().min(1),
});

export function registerDiscogsApi(app: FastifyInstance): void {
  // POST /api/discogs/connect/request — begin OAuth flow, return authorize URL
  app.post('/api/discogs/connect/request', async (req: FastifyRequest, _reply: FastifyReply) => {
    const userId = req.user!.id;

    const { oauthToken, oauthTokenSecret, authorizeUrl } = await getRequestToken();

    await db()
      .insert(discogsPending)
      .values({
        userId,
        oauthToken,
        oauthTokenSecret: encryptString(oauthTokenSecret),
      })
      .onConflictDoUpdate({
        target: discogsPending.userId,
        set: { oauthToken, oauthTokenSecret: encryptString(oauthTokenSecret), createdAt: new Date() },
      });

    req.log.info({ userId }, 'discogs oauth request token issued');
    return { authorizeUrl };
  });

  // POST /api/discogs/connect/verify — complete OAuth, store access tokens
  app.post('/api/discogs/connect/verify', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = VerifyBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const { oauthToken, oauthVerifier } = parsed.data;

    const [pending] = await db().select().from(discogsPending).where(eq(discogsPending.userId, userId));
    if (!pending) return reply.status(400).send({ error: 'no pending oauth request — call /connect/request first' });
    if (pending.oauthToken !== oauthToken) {
      return reply.status(400).send({ error: 'oauth_token mismatch' });
    }

    const requestSecret = decryptString(pending.oauthTokenSecret);
    const { accessToken, accessTokenSecret } = await getAccessToken(oauthToken, requestSecret, oauthVerifier);
    const username = await getUsername(accessToken, accessTokenSecret);

    await db()
      .insert(discogsConnections)
      .values({
        userId,
        username,
        accessToken: encryptString(accessToken),
        accessTokenSecret: encryptString(accessTokenSecret),
      })
      .onConflictDoUpdate({
        target: discogsConnections.userId,
        set: {
          username,
          accessToken: encryptString(accessToken),
          accessTokenSecret: encryptString(accessTokenSecret),
        },
      });

    await db().delete(discogsPending).where(eq(discogsPending.userId, userId));

    req.log.info({ userId }, 'discogs connected');
    return { ok: true, username };
  });

  // GET /api/discogs/status — connection info + cached totals
  app.get('/api/discogs/status', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(discogsConnections).where(eq(discogsConnections.userId, userId));
    if (!conn) return reply.status(404).send({ connected: false });

    return {
      connected: true,
      username: conn.username,
      lastCollectionUsd: conn.lastCollectionUsd !== null ? parseFloat(conn.lastCollectionUsd) : null,
      lastSyncedAt: conn.lastSyncedAt,
    };
  });

  // POST /api/discogs/sync — fetch collection, price each record, store total
  app.post('/api/discogs/sync', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const result = await syncDiscogs(userId);
    if (result.status === 'not_connected') return reply.status(404).send({ error: 'not connected' });

    req.log.info(
      { userId, releaseCount: result.body.releaseCount, pricedCount: result.body.pricedCount },
      'discogs sync complete',
    );
    return result.body;
  });

  // DELETE /api/discogs/connect — remove connection + pending
  app.delete('/api/discogs/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    await db().delete(discogsPending).where(eq(discogsPending.userId, userId));
    await db().delete(discogsConnections).where(eq(discogsConnections.userId, userId));
    req.log.info({ userId }, 'discogs disconnected');
    return reply.status(204).send();
  });
}

/**
 * The Discogs sync, extracted from its route so the scheduler can run it
 * unattended (sync/credential-vendors.ts). Behaviour is unchanged.
 *
 * Per-connection health (survey gap 2). The catch RETHROWS: the caller still
 * gets its error and plugins/error-handler.ts still reports it. This only adds
 * the durable fact of WHICH connection failed, so the next GET /api/net-worth
 * can name it instead of saying the class is degraded.
 */
export async function syncDiscogs(
  userId: string,
): Promise<VendorSyncResult<{ totalUsd: number; releaseCount: number; pricedCount: number }>> {
  const [conn] = await db().select().from(discogsConnections).where(eq(discogsConnections.userId, userId));
  if (!conn) return { status: 'not_connected' };

  try {
    const { totalUsd, releaseCount, pricedCount } = await syncCollection(
      conn.username,
      decryptString(conn.accessToken),
      decryptString(conn.accessTokenSecret),
    );

    await db()
      .update(discogsConnections)
      .set({ lastCollectionUsd: totalUsd.toString(), ...successPatch() })
      .where(eq(discogsConnections.userId, userId));

    return { status: 'synced', updated: 1, body: { totalUsd, releaseCount, pricedCount } };
  } catch (err) {
    await recordSyncFailure(discogsConnections, eq(discogsConnections.userId, userId), conn.consecutiveFailures, err);
    throw err;
  }
}
