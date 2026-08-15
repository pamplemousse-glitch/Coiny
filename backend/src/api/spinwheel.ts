import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { spinwheelConnections, spinwheelPending } from '../db/schema.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { evaluateExternalEvent } from '../reactions/external.js';
import {
  deleteUser,
  getCreditScore,
  getDebtProfile,
  sendSmsOtp,
  subscribeMonthly,
  verifySmsOtp,
} from '../spinwheel/client.js';
import { ingestSpinwheelDebts, upsertSourceDebts } from '../store/debts.js';
import { recordReaction } from '../store/pet.js';

const CREDIT_SCORE_REACTION_THRESHOLD = 20;

const SendOtpBodySchema = z.object({
  phoneNumber: z.string().min(1),
  dateOfBirth: z.string().min(1),
});

const VerifyOtpBodySchema = z.object({
  code: z.string().min(1),
});

export function registerSpinwheelApi(app: FastifyInstance): void {
  // GET /api/spinwheel/status
  app.get('/api/spinwheel/status', async (req: FastifyRequest) => {
    const rows = await db().select().from(spinwheelConnections).where(eq(spinwheelConnections.userId, req.user!.id));
    return { connected: rows.length > 0 };
  });

  // POST /api/spinwheel/connect/sms — rate-limited to 3 per minute per user
  app.post(
    '/api/spinwheel/connect/sms',
    { config: { rateLimit: { max: 3, timeWindow: '1 minute' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = SendOtpBodySchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const { phoneNumber, dateOfBirth } = parsed.data;
      const userId = req.user!.id;

      const { spinwheelUserId } = await sendSmsOtp({ phoneNumber, dateOfBirth, extUserId: userId });

      await db()
        .insert(spinwheelPending)
        .values({ userId, spinwheelUserId })
        .onConflictDoUpdate({ target: spinwheelPending.userId, set: { spinwheelUserId } });

      req.log.info({ userId }, 'spinwheel OTP sent');
      return { ok: true };
    },
  );

  // POST /api/spinwheel/connect/sms/verify
  app.post('/api/spinwheel/connect/sms/verify', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = VerifyOtpBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { code } = parsed.data;
    const userId = req.user!.id;

    const pending = await db()
      .select()
      .from(spinwheelPending)
      .where(eq(spinwheelPending.userId, userId))
      .then((rows) => rows[0]);

    if (!pending) {
      return reply.status(409).send({ error: 'No pending OTP. Call /connect/sms first.' });
    }

    await verifySmsOtp({ spinwheelUserId: pending.spinwheelUserId, code });

    await db()
      .insert(spinwheelConnections)
      .values({ userId, spinwheelUserId: pending.spinwheelUserId })
      .onConflictDoUpdate({ target: spinwheelConnections.userId, set: { spinwheelUserId: pending.spinwheelUserId } });

    await db().delete(spinwheelPending).where(eq(spinwheelPending.userId, userId));

    // Fire-and-forget: register monthly credit profile refresh. Non-fatal if it fails.
    void (async () => {
      try {
        await subscribeMonthly(pending.spinwheelUserId);
      } catch (err) {
        req.log.warn({ userId, err }, 'spinwheel monthly subscription failed — continuing');
      }
    })();

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

    const debts = await getDebtProfile(connection.spinwheelUserId);

    // Keep the merged debt layer (R-7.13) in step with every bureau fetch so
    // a card visible through both Plaid and Spinwheel is counted once.
    await ingestSpinwheelDebts(userId, debts);

    return { debts };
  });

  // GET /api/spinwheel/credit-score
  app.get('/api/spinwheel/credit-score', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const rows = await db().select().from(spinwheelConnections).where(eq(spinwheelConnections.userId, userId));
    const connection = rows[0];
    if (!connection) {
      return reply.status(409).send({ error: 'No Spinwheel connection found. Connect first.' });
    }
    const result = await getCreditScore(connection.spinwheelUserId);

    // Fire a reaction if score changed significantly since last check.
    const score =
      typeof result === 'object' && result !== null && 'score' in result
        ? ((result as { score?: number }).score ?? null)
        : null;
    if (score !== null && connection.lastCreditScore !== null && connection.lastCreditScore !== undefined) {
      const delta = score - connection.lastCreditScore;
      if (Math.abs(delta) >= CREDIT_SCORE_REACTION_THRESHOLD) {
        const type = delta > 0 ? 'credit_score_improved' : 'credit_score_dropped';
        const reaction = evaluateExternalEvent({
          id: `cs-${userId}-${Date.now()}`,
          userId,
          type,
          amountUsd: Math.abs(delta),
          source: 'spinwheel',
        });
        if (reaction) {
          await recordReaction(userId, type, reaction);
          dispatchReaction(userId, reaction, type);
        }
      }
    }
    if (score !== null) {
      await db()
        .update(spinwheelConnections)
        .set({ lastCreditScore: score })
        .where(eq(spinwheelConnections.userId, userId));
    }

    return result;
  });

  // DELETE /api/spinwheel/connect
  app.delete('/api/spinwheel/connect', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const rows = await db().select().from(spinwheelConnections).where(eq(spinwheelConnections.userId, userId));
    const connection = rows[0];

    if (connection) {
      await deleteUser(connection.spinwheelUserId);
      await db().delete(spinwheelConnections).where(eq(spinwheelConnections.userId, userId));
      // Drop the bureau's rows from the debt layer and rebuild, so merged
      // records fall back to their Plaid halves instead of going stale.
      await upsertSourceDebts(userId, 'spinwheel', []);
    }

    await db().delete(spinwheelPending).where(eq(spinwheelPending.userId, userId));

    req.log.info({ userId }, 'spinwheel connection removed');
    return reply.status(204).send();
  });
}
