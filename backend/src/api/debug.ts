import type { FastifyInstance, FastifyReply } from 'fastify';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { plaidItems } from '../db/schema.js';
import { itemWebhookUpdate, sandboxItemFireWebhook } from '../plaid/client.js';

// Only registered when PLAID_ENV=sandbox — not callable in production.
export function registerDebugApi(app: FastifyInstance): void {
  app.post('/api/debug/fire-transaction', async (_, reply: FastifyReply) => {
    const [item] = await db().select().from(plaidItems).limit(1);
    if (!item) {
      return reply.status(409).send({ error: 'No linked Plaid item — link a bank first.' });
    }
    if (config.PLAID_WEBHOOK_URL) {
      await itemWebhookUpdate({ access_token: item.accessToken, webhook: config.PLAID_WEBHOOK_URL });
    }
    const result = await sandboxItemFireWebhook({
      access_token: item.accessToken,
      webhook_code: 'DEFAULT_UPDATE',
    });
    return { ok: result.webhook_fired };
  });
}
