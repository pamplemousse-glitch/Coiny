import type { FastifyInstance } from 'fastify';
import { getRecurringStreams } from '../store/plaid-recurring.js';

export function registerPlaidRecurringApi(app: FastifyInstance): void {
  app.get('/api/plaid/recurring', async (req) => {
    const { inflow, outflow } = await getRecurringStreams(req.user!.id);
    return { inflow, outflow };
  });
}
