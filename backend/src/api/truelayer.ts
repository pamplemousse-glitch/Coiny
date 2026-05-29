import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { truelayerConnections } from '../db/schema.js';
import type { TrueLayerEnv } from '../truelayer/client.js';
import { buildAuthUrl, exchangeCode, getAccounts, getBalance, refreshAccessToken } from '../truelayer/client.js';
import { decryptString, encryptString } from '../util/crypto.js';

const REDIRECT_URI = 'coiny://truelayer/callback';
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh when < 5 min to expiry

type TrueLayerConnection = typeof truelayerConnections.$inferSelect;

async function getAccessToken(userId: string, conn: TrueLayerConnection): Promise<string> {
  const expiresAt = conn.expiresAt.getTime();
  if (expiresAt - Date.now() >= REFRESH_BUFFER_MS) {
    return decryptString(conn.accessToken);
  }

  if (!config.TRUELAYER_CLIENT_ID || !config.TRUELAYER_CLIENT_SECRET) {
    throw new Error('TrueLayer not configured — cannot refresh');
  }

  const env = config.TRUELAYER_ENV as TrueLayerEnv;
  const tokens = await refreshAccessToken(
    decryptString(conn.refreshToken),
    config.TRUELAYER_CLIENT_ID,
    config.TRUELAYER_CLIENT_SECRET,
    env,
  );

  await db()
    .update(truelayerConnections)
    .set({
      accessToken: encryptString(tokens.accessToken),
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
    })
    .where(eq(truelayerConnections.userId, userId));

  return tokens.accessToken;
}

export function registerTruelayerApi(app: FastifyInstance): void {
  // GET /api/truelayer/auth-url — returns the OAuth authorization URL for the frontend
  app.get('/api/truelayer/auth-url', async (_req: FastifyRequest, reply: FastifyReply) => {
    if (!config.TRUELAYER_CLIENT_ID) {
      return reply.status(503).send({ error: 'TrueLayer not configured' });
    }
    const env = config.TRUELAYER_ENV as TrueLayerEnv;
    const url = buildAuthUrl({ clientId: config.TRUELAYER_CLIENT_ID, redirectUri: REDIRECT_URI, env });
    return { url };
  });

  // GET /api/truelayer/callback?code=... — exchange code, store tokens, redirect to app deep link
  app.get('/api/truelayer/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = z.object({ code: z.string().min(1) }).safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    if (!config.TRUELAYER_CLIENT_ID || !config.TRUELAYER_CLIENT_SECRET) {
      return reply.status(503).send({ error: 'TrueLayer not configured' });
    }

    const userId = req.user!.id;
    const env = config.TRUELAYER_ENV as TrueLayerEnv;

    const tokens = await exchangeCode(
      parsed.data.code,
      config.TRUELAYER_CLIENT_ID,
      config.TRUELAYER_CLIENT_SECRET,
      REDIRECT_URI,
      env,
    );

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    await db()
      .insert(truelayerConnections)
      .values({
        userId,
        accessToken: encryptString(tokens.accessToken),
        refreshToken: encryptString(tokens.refreshToken),
        expiresAt,
      })
      .onConflictDoUpdate({
        target: truelayerConnections.userId,
        set: {
          accessToken: encryptString(tokens.accessToken),
          refreshToken: encryptString(tokens.refreshToken),
          expiresAt,
        },
      });

    req.log.info({ userId }, 'truelayer connected');
    return reply.redirect('coiny://truelayer/connected');
  });

  // GET /api/truelayer/status — { connected: bool }
  app.get('/api/truelayer/status', async (req: FastifyRequest, _reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(truelayerConnections).where(eq(truelayerConnections.userId, userId));
    return { connected: !!conn };
  });

  // POST /api/truelayer/sync — refresh token if needed, fetch account balances, cache total
  app.post('/api/truelayer/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(truelayerConnections).where(eq(truelayerConnections.userId, userId));

    if (!conn) return reply.status(404).send({ error: 'not connected' });

    const accessToken = await getAccessToken(userId, conn);
    const env = config.TRUELAYER_ENV as TrueLayerEnv;

    const accounts = await getAccounts(accessToken, env);

    let totalGbp = 0;
    await Promise.allSettled(
      accounts.map(async (acct) => {
        try {
          const balance = await getBalance(accessToken, acct.accountId, env);
          totalGbp += balance;
        } catch {
          // individual account balance failure is non-fatal; skip it
        }
      }),
    );

    await db()
      .update(truelayerConnections)
      .set({ lastBalanceGbp: totalGbp.toString() })
      .where(eq(truelayerConnections.userId, userId));

    req.log.info({ userId }, 'truelayer sync complete');
    return { balanceGbp: totalGbp };
  });

  // DELETE /api/truelayer/connect — remove connection
  app.delete('/api/truelayer/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    await db().delete(truelayerConnections).where(eq(truelayerConnections.userId, userId));
    req.log.info({ userId }, 'truelayer disconnected');
    return reply.status(204).send();
  });
}
