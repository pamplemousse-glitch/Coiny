import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { deleteOverride, listOverrides, setOverride } from '../store/overrides.js';

const PutBodySchema = z.object({
  merchant_name: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
});

const DeleteBodySchema = z.object({
  merchant_name: z.string().min(1).max(200),
});

export function registerOverridesApi(app: FastifyInstance): void {
  app.get('/api/spending/overrides', async (req: FastifyRequest) => listOverrides(req.user!.id));

  app.put('/api/spending/overrides', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PutBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    await setOverride(req.user!.id, parsed.data.merchant_name, parsed.data.category);
    return { ok: true };
  });

  app.delete('/api/spending/overrides', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = DeleteBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    await deleteOverride(req.user!.id, parsed.data.merchant_name);
    return { ok: true };
  });
}
