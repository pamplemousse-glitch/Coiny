import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { ynabConnections } from '../db/schema.js';
import { getAccounts, getBudgets, getTotalNetWorth } from '../ynab/client.js';
import { decryptString, encryptString } from '../util/crypto.js';

const ConnectBodySchema = z.object({
  apiKey: z.string().min(1),
});

export function registerYnabApi(app: FastifyInstance): void {
  // POST /api/ynab/connect — store encrypted personal access token
  app.post('/api/ynab/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ConnectBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    await db()
      .insert(ynabConnections)
      .values({ userId, apiKey: encryptString(parsed.data.apiKey) })
      .onConflictDoUpdate({ target: ynabConnections.userId, set: { apiKey: encryptString(parsed.data.apiKey) } });

    req.log.info({ userId }, 'ynab connected');
    return { ok: true };
  });

  // GET /api/ynab/budgets — list all YNAB budgets
  app.get('/api/ynab/budgets', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [connection] = await db().select().from(ynabConnections).where(eq(ynabConnections.userId, userId));
    if (!connection) return reply.status(404).send({ error: 'not connected' });

    const budgets = await getBudgets(decryptString(connection.apiKey));
    return budgets.map((b) => ({ id: b.id, name: b.name, currency: b.currency_format.iso_code }));
  });

  // GET /api/ynab/accounts — list all accounts across all budgets
  app.get('/api/ynab/accounts', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [connection] = await db().select().from(ynabConnections).where(eq(ynabConnections.userId, userId));
    if (!connection) return reply.status(404).send({ error: 'not connected' });

    const apiKey = decryptString(connection.apiKey);
    const budgets = await getBudgets(apiKey);
    const result: Array<{ budgetId: string; budgetName: string; id: string; name: string; type: string; balanceUsd: number }> = [];

    for (const budget of budgets) {
      const accounts = await getAccounts(apiKey, budget.id);
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
  app.post('/api/ynab/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const [connection] = await db().select().from(ynabConnections).where(eq(ynabConnections.userId, userId));
    if (!connection) return reply.status(404).send({ error: 'not connected' });

    const total = await getTotalNetWorth(decryptString(connection.apiKey));
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
