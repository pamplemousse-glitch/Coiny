import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getRecentOutflows } from '../store/transactions.js';
import { detectSubscriptions } from '../subscriptions/detect.js';

export function registerSubscriptionsApi(app: FastifyInstance): void {
  app.get('/api/subscriptions', async (req: FastifyRequest) => {
    const txs = await getRecentOutflows(req.user.id, 120);
    return detectSubscriptions(txs);
  });
}
