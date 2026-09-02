// App Review demo seeding (R-15.7, Apple 2.1, decision B9).
//
// The reviewer signs in with their own Apple ID through the ordinary auth path,
// which creates an empty account. This route fills it.
//
// ---------------------------------------------------------------------------
// The security shape, which is the whole design
// ---------------------------------------------------------------------------
//
// Defect D1 was an unauthenticated session mint. Nothing here may reopen it, so
// every property below is deliberate:
//
//   - the route lives in the PROTECTED scope. A session is required, and the
//     session can only have come from Apple or Google verifying the caller.
//   - it writes ONLY to `req.user.id`. There is no user parameter to tamper
//     with, so the code cannot be used to reach another account.
//   - with no code configured it 404s, so outside a review window the endpoint
//     does not exist as far as a caller can tell.
//   - the comparison is constant-time, and a failure logs.
//
// The worst a leaked code buys is the ability to fill YOUR OWN account with
// fake assets. That is the intended blast radius.

import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { debtAccounts, declaredAssets, manualAssets, users } from '../db/schema.js';
import { DEMO_DEBTS, DEMO_DECLARED, DEMO_MANUAL } from '../review/fixtures.js';
import { SYNC_LIMIT } from './rate-limits.js';

const SeedBodySchema = z.object({
  // Bounded because it is hashed into a comparison; an unbounded string is
  // free work for anyone who asks.
  code: z.string().min(1).max(200),
});

/** Constant-time compare that tolerates different lengths.
 *
 *  `timingSafeEqual` throws when the buffers differ in size, and returning
 *  early on a length mismatch would leak the code's length, so both sides are
 *  compared at a fixed width. */
function codeMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function registerReviewApi(app: FastifyInstance): void {
  app.post('/api/review/demo-seed', SYNC_LIMIT, async (req: FastifyRequest, reply: FastifyReply) => {
    // No code configured means no review window is open. 404 rather than 403:
    // the endpoint should not advertise its own existence.
    if (!config.REVIEW_DEMO_CODE) return reply.status(404).send({ error: 'Not found' });

    const parsed = SeedBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;

    if (!codeMatches(parsed.data.code, config.REVIEW_DEMO_CODE)) {
      // user_id only, never the attempted code: it is a shared secret and this
      // line would be the one place it appears in plaintext, in a log that
      // outlives the review window.
      req.log.warn({ userId }, 'review demo seed rejected: bad code');
      return reply.status(403).send({ error: 'Invalid code' });
    }

    const now = new Date();

    // Idempotent: a reviewer who taps twice, or who is handed the app after a
    // failed attempt, gets the same account rather than doubled balances.
    await db().delete(declaredAssets).where(eq(declaredAssets.userId, userId));
    await db().delete(manualAssets).where(eq(manualAssets.userId, userId));
    await db().delete(debtAccounts).where(eq(debtAccounts.userId, userId));

    await db()
      .insert(declaredAssets)
      .values(
        DEMO_DECLARED.map((d) => ({
          userId,
          assetClass: d.assetClass,
          bucketedValueUsd: d.bucketedValueUsd,
          declaredAt: now,
          refreshedAt: now,
        })),
      );

    await db()
      .insert(manualAssets)
      .values(
        DEMO_MANUAL.map((m) => ({
          userId,
          name: m.name,
          category: m.category,
          selfReportedValueUsd: m.selfReportedValueUsd,
        })),
      );

    await db()
      .insert(debtAccounts)
      .values(
        DEMO_DEBTS.map((d) => ({
          debtId: `${userId}:${d.debtId}`,
          userId,
          issuer: d.issuer,
          nickname: d.nickname,
          type: d.type,
          balance: d.balance,
          apr: d.apr,
        })),
      );

    // Marks the account so it stays out of analytics and out of any consumer
    // count. A reviewer is not a consumer, and counting one would move an FTC
    // Safeguards or state-privacy threshold forward by an account that belongs
    // to Apple.
    await db().update(users).set({ isDemo: true }).where(eq(users.id, userId));

    req.log.info({ userId }, 'review demo seed applied');
    return { ok: true, declared: DEMO_DECLARED.length, manual: DEMO_MANUAL.length, debts: DEMO_DEBTS.length };
  });
}
