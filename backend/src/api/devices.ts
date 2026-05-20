import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { upsertDeviceToken } from '../store/devices.js';

// Expo push tokens follow the format ExponentPushToken[xxx...] or ExpoPushToken[...].
// We accept either; minimal validation since downstream APNs/FCM will reject anything malformed.
const PostBodySchema = z.object({
  token: z.string().min(10).max(200),
  platform: z.enum(['ios', 'android']),
});

export function registerDevicesApi(app: FastifyInstance): void {
  app.post('/api/devices/push-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PostBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    await upsertDeviceToken(parsed.data);
    req.log.info({ platform: parsed.data.platform }, 'device push token registered');
    return { ok: true };
  });
}
