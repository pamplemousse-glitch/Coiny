import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getState, updateGoals, PetGoalsSchema } from '../store/pet.js';

export function registerPetsApi(app: FastifyInstance): void {
  app.get('/api/pets', async () => {
    const { healthScore, mood, lastReactionAt, reactionHistory, goals } = getState();
    return { healthScore, mood, lastReactionAt, reactionHistory, goals };
  });

  app.put('/api/pets/goals', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PetGoalsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    updateGoals(parsed.data);
    return getState().goals;
  });
}
