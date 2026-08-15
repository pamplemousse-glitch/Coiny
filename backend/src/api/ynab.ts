import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { ynabConnections } from '../db/schema.js';
import { decryptString, encryptString } from '../util/crypto.js';
import {
  exchangeCodeForTokens,
  getAccounts,
  getBudgets,
  getTotalNetWorth,
  refreshAccessToken,
} from '../ynab/client.js';
import { SYNC_LIMIT } from './rate-limits.js';

const REDIRECT_URI = 'coiny://ynab/callback';
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh when < 5 min to expiry

type YnabConnection = typeof ynabConnections.$inferSelect;

async function getTokenForConnection(userId: string, conn: YnabConnection): Promise<string> {
  // Legacy personal access token path (pre-OAuth)
  if (conn.apiKey && !conn.accessToken) return decryptString(conn.apiKey);

  if (!conn.accessToken || !conn.refreshToken) throw new Error('not connected');

  const expiresAt = conn.tokenExpiresAt?.getTime() ?? Infinity;
  if (expiresAt - Date.now() < REFRESH_BUFFER_MS) {
    if (!config.YNAB_CLIENT_ID) throw new Error('YNAB OAuth not configured — cannot refresh');
    const tokens = await refreshAccessToken(config.YNAB_CLIENT_ID, decryptString(conn.refreshToken));
    await db()
      .update(ynabConnections)
      .set({
        accessToken: encryptString(tokens.accessToken),
        refreshToken: encryptString(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
      })
      .where(eq(ynabConnections.userId, userId));
    return tokens.accessToken;
  }

  return decryptString(conn.accessToken);
}

export function registerYnabApi(app: FastifyInstance): void {
  // GET /api/ynab/connect/oauth/url — build YNAB OAuth authorization URL with caller's PKCE challenge
  app.get('/api/ynab/connect/oauth/url', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = z.object({ codeChallenge: z.string().min(1) }).safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    if (!config.YNAB_CLIENT_ID) return reply.status(503).send({ error: 'YNAB OAuth not configured' });

    const params = new URLSearchParams({
      client_id: config.YNAB_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      code_challenge: parsed.data.codeChallenge,
      code_challenge_method: 'S256',
    });
    return { url: `https://app.ynab.com/oauth/authorize?${params}` };
  });

  // POST /api/ynab/connect/oauth/callback — exchange authorization code + PKCE verifier for tokens
  app.post('/api/ynab/connect/oauth/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = z.object({ code: z.string().min(1), codeVerifier: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    if (!config.YNAB_CLIENT_ID) return reply.status(503).send({ error: 'YNAB OAuth not configured' });

    const userId = req.user!.id;
    const tokens = await exchangeCodeForTokens(
      config.YNAB_CLIENT_ID,
      parsed.data.code,
      parsed.data.codeVerifier,
      REDIRECT_URI,
    );

    await db()
      .insert(ynabConnections)
      .values({
        userId,
        accessToken: encryptString(tokens.accessToken),
        refreshToken: encryptString(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
      })
      .onConflictDoUpdate({
        target: ynabConnections.userId,
        set: {
          accessToken: encryptString(tokens.accessToken),
          refreshToken: encryptString(tokens.refreshToken),
          tokenExpiresAt: tokens.expiresAt,
        },
      });

    req.log.info({ userId }, 'ynab oauth connected');
    return { ok: true };
  });

  // GET /api/ynab/budgets — list all YNAB budgets
  app.get('/api/ynab/budgets', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(ynabConnections).where(eq(ynabConnections.userId, userId));
    if (!conn) return reply.status(404).send({ error: 'not connected' });

    const token = await getTokenForConnection(userId, conn);
    const budgets = await getBudgets(token);
    return budgets.map((b) => ({ id: b.id, name: b.name, currency: b.currency_format.iso_code }));
  });

  // GET /api/ynab/accounts — list all accounts across all budgets
  app.get('/api/ynab/accounts', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(ynabConnections).where(eq(ynabConnections.userId, userId));
    if (!conn) return reply.status(404).send({ error: 'not connected' });

    const token = await getTokenForConnection(userId, conn);
    const budgets = await getBudgets(token);
    const result: Array<{
      budgetId: string;
      budgetName: string;
      id: string;
      name: string;
      type: string;
      balanceUsd: number;
    }> = [];

    for (const budget of budgets) {
      const accounts = await getAccounts(token, budget.id);
      for (const acct of accounts) {
        result.push({
          budgetId: budget.id,
          budgetName: budget.name,
          id: acct.id,
          name: acct.name,
          type: acct.type,
          balanceUsd: acct.balance / 1000,
        });
      }
    }

    return result;
  });

  // POST /api/ynab/sync — cache total net worth from YNAB
  app.post('/api/ynab/sync', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [conn] = await db().select().from(ynabConnections).where(eq(ynabConnections.userId, userId));
    if (!conn) return reply.status(404).send({ error: 'not connected' });

    const token = await getTokenForConnection(userId, conn);
    const total = await getTotalNetWorth(token);
    await db()
      .update(ynabConnections)
      .set({ lastNetWorthUsd: total.toString(), lastSyncedAt: new Date() })
      .where(eq(ynabConnections.userId, userId));

    req.log.info({ userId }, 'ynab sync complete');
    return { total };
  });

  // DELETE /api/ynab/connect — remove connection
  app.delete('/api/ynab/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    await db().delete(ynabConnections).where(eq(ynabConnections.userId, userId));
    req.log.info({ userId }, 'ynab disconnected');
    return reply.status(204).send();
  });
}
