import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { truelayerConnections } from '../db/schema.js';
import { convertToUsd } from '../fx/client.js';
import type { TrueLayerEnv } from '../truelayer/client.js';
import { buildAuthUrl, exchangeCode, getAccounts, getBalance } from '../truelayer/client.js';
import { getTrueLayerAccessToken } from '../truelayer/tokens.js';
import { revokeTrueLayer } from '../revoke/upstream.js';
import { encryptString } from '../util/crypto.js';

const REDIRECT_URI = 'coiny://truelayer/callback';

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

  // POST /api/truelayer/sync — refresh token if needed, fetch account balances in GBP,
  // convert to USD via Frankfurter, and cache the USD total in lastBalanceGbp.
  app.post('/api/truelayer/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(truelayerConnections).where(eq(truelayerConnections.userId, userId));

    if (!conn) return reply.status(404).send({ error: 'not connected' });

    const accessToken = await getTrueLayerAccessToken(userId, conn);
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

    // Convert the raw GBP sum to USD using live ECB rates via Frankfurter.
    // lastBalanceGbp stores USD post-conversion (column name kept for schema compat).
    const totalUsd = await convertToUsd(totalGbp, 'GBP');

    await db()
      .update(truelayerConnections)
      .set({ lastBalanceGbp: totalUsd.toString() })
      .where(eq(truelayerConnections.userId, userId));

    req.log.info({ userId }, 'truelayer sync complete');
    return { balanceGbp: totalGbp, balanceUsd: totalUsd };
  });

  // DELETE /api/truelayer/connect — revoke the grant upstream, then remove the row.
  // Dropping only the row would leave Coiny sitting in the user's TrueLayer
  // connected-apps list after they explicitly disconnected it.
  app.delete('/api/truelayer/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const outcome = await revokeTrueLayer(userId, req.log);
    await db().delete(truelayerConnections).where(eq(truelayerConnections.userId, userId));
    req.log.info({ userId, revocation: outcome.result }, 'truelayer disconnected');
    return reply.status(204).send();
  });
}
