import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { upsertDeviceToken } from '../store/devices.js';

const PostBodySchema = z.object({
  token: z.string().min(10).max(200),
  platform: z.enum(['ios', 'android']),
});

export function registerDevicesApi(app: FastifyInstance): void {
  app.post('/api/devices/push-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PostBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    await upsertDeviceToken({ ...parsed.data, userId: req.user.id });
    req.log.info({ platform: parsed.data.platform }, 'device push token registered');
    return { ok: true };
  });
}
