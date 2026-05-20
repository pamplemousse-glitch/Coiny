import type { FastifyInstance } from 'fastify';
import { getRecentOutflows } from '../store/transactions.js';
import { detectSubscriptions } from '../subscriptions/detect.js';

export function registerSubscriptionsApi(app: FastifyInstance): void {
  app.get('/api/subscriptions', async () => {
    const txs = await getRecentOutflows(120);
    return detectSubscriptions(txs);
  });
}
