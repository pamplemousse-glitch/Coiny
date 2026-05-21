import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getGoals, getState, PetGoalsSchema, updateGoals } from '../store/pet.js';

export function registerPetsApi(app: FastifyInstance): void {
  app.get('/api/pets', async (req: FastifyRequest) => {
    return getState(req.user.id);
  });

  app.put('/api/pets/goals', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PetGoalsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    await updateGoals(req.user.id, parsed.data);
    return getGoals(req.user.id);
  });
}
