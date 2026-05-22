import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { spinwheelConnections } from '../db/schema.js';
import { getDebts, sendSmsOtp, verifySmsOtp } from '../spinwheel/client.js';

const SendOtpBodySchema = z.object({
  phone: z.string().min(1),
  dateOfBirth: z.string().min(1),
});

const VerifyOtpBodySchema = z.object({
  phone: z.string().min(1),
  code: z.string().min(1),
});

export function registerSpinwheelApi(app: FastifyInstance): void {
  // GET /api/spinwheel/status
  app.get('/api/spinwheel/status', async (req: FastifyRequest) => {
    const rows = await db().select().from(spinwheelConnections).where(eq(spinwheelConnections.userId, req.user!.id));
    return { connected: rows.length > 0 };
  });

  // POST /api/spinwheel/connect/sms
  app.post('/api/spinwheel/connect/sms', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = SendOtpBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { phone, dateOfBirth } = parsed.data;
    const extUserId = req.user!.id;

    await sendSmsOtp({ phone, dateOfBirth, extUserId });

    req.log.info({ userId: extUserId }, 'spinwheel OTP sent');
    return { ok: true };
  });

  // POST /api/spinwheel/connect/sms/verify
  app.post('/api/spinwheel/connect/sms/verify', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = VerifyOtpBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { phone, code } = parsed.data;
    const userId = req.user!.id;

    const { spinwheelUserId } = await verifySmsOtp({ phone, code, extUserId: userId });

    await db().insert(spinwheelConnections).values({ userId, spinwheelUserId }).onConflictDoUpdate({
      target: spinwheelConnections.userId,
      set: { spinwheelUserId },
    });

    req.log.info({ userId }, 'spinwheel connection established');
    return { ok: true };
  });

  // GET /api/spinwheel/debts
  app.get('/api/spinwheel/debts', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const rows = await db().select().from(spinwheelConnections).where(eq(spinwheelConnections.userId, userId));

    const connection = rows[0];
    if (!connection) {
      return reply.status(409).send({ error: 'No Spinwheel connection found. Connect first.' });
    }

    const debts = await getDebts(connection.spinwheelUserId);
    return { debts };
  });

  // DELETE /api/spinwheel/connect
  app.delete('/api/spinwheel/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    await db().delete(spinwheelConnections).where(eq(spinwheelConnections.userId, req.user!.id));
    req.log.info({ userId: req.user!.id }, 'spinwheel connection removed');
    return reply.status(204).send();
  });
}
