import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validateSession } from '../store/sessions.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string };
  }
}

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest('user', null);

  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.toLowerCase().startsWith('bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const rawToken = header.slice(7).trim();
    const userId = await validateSession(rawToken);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    req.user = { id: userId };
  });
}
