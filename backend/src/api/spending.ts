import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getState } from '../store/pet.js';

export function registerSpendingApi(app: FastifyInstance): void {
  app.get('/api/spending', async (req: FastifyRequest) => {
    const state = await getState(req.user.id);
    return state.reactionHistory.map(({ at, eventType, reaction }) => ({
      at,
      eventType,
      reason: reaction.reason,
      amount: extractAmount(reaction.reason),
    }));
  });
}

function extractAmount(reason: string): string | null {
  const match = reason.match(/\$[\d.]+/);
  return match ? match[0] : null;
}
