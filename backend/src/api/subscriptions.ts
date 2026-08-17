import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getRecurringStreams } from '../store/plaid-recurring.js';
import { summarize } from '../subscriptions/recurring.js';

export function registerSubscriptionsApi(app: FastifyInstance): void {
  // Reads the streams Plaid already gave us, rather than re-deriving a worse
  // answer from our own transaction table. See subscriptions/recurring.ts.
  app.get('/api/subscriptions', async (req: FastifyRequest) => {
    const streams = await getRecurringStreams(req.user!.id);
    return summarize(streams);
  });
}
