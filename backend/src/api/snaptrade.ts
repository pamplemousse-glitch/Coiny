import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../db/client.js';
import { snaptradeConnections } from '../db/schema.js';
import { snapDeleteUser, snapGetAccounts, snapGetLoginUrl, snapRegisterUser } from '../snaptrade/client.js';
import { decryptString, encryptString } from '../util/crypto.js';

export function registerSnaptradeApi(app: FastifyInstance): void {
  // POST /api/snaptrade/connect
  // Registers this user with SnapTrade (once) and returns a portal URL to link their brokerage.
  app.post('/api/snaptrade/connect', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const [existing] = await db().select().from(snaptradeConnections).where(eq(snaptradeConnections.userId, userId));

    let snapUserId: string;
    let snapUserSecret: string;

    if (existing) {
      snapUserId = existing.snapUserId;
      snapUserSecret = decryptString(existing.snapUserSecret);
    } else {
      const reg = await snapRegisterUser(userId);
      snapUserId = reg.userId;
      snapUserSecret = reg.userSecret;

      await db().insert(snaptradeConnections).values({
        userId,
        snapUserId,
        snapUserSecret: encryptString(snapUserSecret),
      });

      req.log.info({ userId }, 'snaptrade user registered');
    }

    const redirectUrl = await snapGetLoginUrl(snapUserId, snapUserSecret);
    return { redirectUrl };
  });

  // GET /api/snaptrade/accounts
  // Returns live brokerage accounts from SnapTrade.
  app.get('/api/snaptrade/accounts', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [connection] = await db().select().from(snaptradeConnections).where(eq(snaptradeConnections.userId, userId));
    if (!connection) return reply.status(404).send({ error: 'not connected' });

    const accounts = await snapGetAccounts(connection.snapUserId, decryptString(connection.snapUserSecret));
    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      institution: a.institution_name,
      totalUsd: a.balance?.total?.amount ?? 0,
      currency: a.balance?.total?.currency ?? 'USD',
    }));
  });

  // POST /api/snaptrade/sync
  // Fetches live account balances and caches the total.
  app.post('/api/snaptrade/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [connection] = await db().select().from(snaptradeConnections).where(eq(snaptradeConnections.userId, userId));
    if (!connection) return reply.status(404).send({ error: 'not connected' });

    const accounts = await snapGetAccounts(connection.snapUserId, decryptString(connection.snapUserSecret));
    const total = accounts.reduce((sum, a) => sum + (a.balance?.total?.amount ?? 0), 0);

    await db()
      .update(snaptradeConnections)
      .set({ lastBrokerageTotal: total.toString(), lastSyncedAt: new Date() })
      .where(eq(snaptradeConnections.userId, userId));

    req.log.info({ userId }, 'snaptrade sync complete');
    return { total, accounts: accounts.length };
  });

  // DELETE /api/snaptrade/connect
  // Deregisters this user from SnapTrade and removes the connection.
  app.delete('/api/snaptrade/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [connection] = await db().select().from(snaptradeConnections).where(eq(snaptradeConnections.userId, userId));
    if (!connection) return reply.status(404).send({ error: 'not connected' });

    await snapDeleteUser(connection.snapUserId, decryptString(connection.snapUserSecret));
    await db().delete(snaptradeConnections).where(eq(snaptradeConnections.userId, userId));

    req.log.info({ userId }, 'snaptrade user deregistered');
    return reply.status(204).send();
  });
}
