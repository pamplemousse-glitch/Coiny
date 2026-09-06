import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { isValidTimeZone } from '../push/quiet-hours.js';
import { upsertDeviceToken } from '../store/devices.js';

// `timezone` is the device's IANA identifier (R-9.3 quiet hours). Optional so
// older app builds keep registering, but when present it must be one the tz
// database accepts: rejecting a bad identifier here beats storing it and
// discovering the problem at dispatch time.
const PostBodySchema = z.object({
  token: z.string().min(10).max(200),
  platform: z.enum(['ios', 'android']),
  timezone: z
    .string()
    .min(1)
    .max(64)
    .refine(isValidTimeZone, { message: 'not a valid IANA timezone identifier' })
    .optional(),
  // The app reports its own `aps-environment` entitlement, which is the only
  // thing that decides which APNs host will accept this token. Optional because
  // builds older than migration 0070 do not send it; push/apns.ts falls back to
  // the APP_ENV heuristic for those rather than guessing a gateway.
  apsEnvironment: z.enum(['development', 'production']).optional(),
});

export function registerDevicesApi(app: FastifyInstance): void {
  app.post('/api/devices/push-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PostBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    await upsertDeviceToken({ ...parsed.data, userId: req.user!.id });
    req.log.info(
      { platform: parsed.data.platform, aps_environment: parsed.data.apsEnvironment ?? 'unreported' },
      'device push token registered',
    );
    return { ok: true };
  });
}
