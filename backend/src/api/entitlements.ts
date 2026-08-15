import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifyAppStoreJws } from '../appstore/jws.js';
import { tierForProductId, transactionPayloadSchema } from '../appstore/types.js';
import { config } from '../config.js';
import {
  applyTransaction,
  ensureEntitlementRow,
  findByOriginalTransactionId,
  getEffectiveEntitlement,
  limitsForTier,
  resolveEntitlement,
} from '../store/entitlements.js';

const TransactionBodySchema = z.object({
  // The jwsRepresentation of a StoreKit 2 VerificationResult<Transaction>.
  jws: z.string().min(1).max(50_000),
});

interface EntitlementResponse {
  tier: string;
  status: string;
  entitledUntil: string | null;
  autoRenew: boolean;
  source: string | null;
  appAccountToken: string;
  limits: {
    liveConnections: number | null;
    activeGoals: number | null;
    guardrails: number | null;
    historyDays: number | null;
  };
}

async function entitlementResponse(userId: string): Promise<EntitlementResponse> {
  const row = await ensureEntitlementRow(userId);
  const effective = await getEffectiveEntitlement(userId);
  return {
    tier: effective.tier,
    status: effective.status,
    entitledUntil: effective.entitledUntil?.toISOString() ?? null,
    autoRenew: row.autoRenew,
    source: effective.source,
    appAccountToken: row.appAccountToken,
    limits: limitsForTier(effective.tier),
  };
}

export function registerEntitlementsApi(app: FastifyInstance): void {
  // The client's read path. Also mints the appAccountToken the app passes to
  // StoreKit so server notifications can be matched to this user even when the
  // client never reports the purchase itself. Server-side entitlement is what
  // makes the subscription hold across all of the user's devices (3.1.2(a)).
  app.get('/api/entitlements', async (req: FastifyRequest) => {
    return entitlementResponse(req.user!.id);
  });

  // The client reports Apple's signed transaction (purchase, renewal seen by
  // the Transaction.updates listener, or restore). The JWS signature chain is
  // verified against Apple's pinned root before anything is stored; the client
  // is never the authority on whether it has paid.
  app.post('/api/entitlements/transaction', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = TransactionBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const verification = verifyAppStoreJws(parsed.data.jws);
    if (!verification.ok) {
      req.log.warn({ reason: verification.reason }, 'app store transaction jws rejected');
      return reply.status(400).send({ error: 'invalid_transaction' });
    }

    const tx = transactionPayloadSchema.safeParse(verification.payload);
    if (!tx.success) {
      req.log.warn('app store transaction payload malformed');
      return reply.status(400).send({ error: 'invalid_transaction' });
    }

    if (tx.data.bundleId !== config.APPLE_BUNDLE_ID) {
      req.log.warn('app store transaction bundle id mismatch');
      return reply.status(400).send({ error: 'invalid_transaction' });
    }

    if (tierForProductId(tx.data.productId) === null) {
      req.log.warn('app store transaction for unknown product');
      return reply.status(400).send({ error: 'unknown_product' });
    }

    const userId = req.user!.id;

    // An Apple subscription binds to exactly one Coiny user. The same user
    // re-reporting (renewal, restore, new device) is fine; a different user
    // presenting the same subscription is rejected.
    const bound = await findByOriginalTransactionId(tx.data.originalTransactionId);
    if (bound && bound.userId !== userId) {
      req.log.warn('app store transaction already bound to another user');
      return reply.status(409).send({ error: 'transaction_bound_elsewhere' });
    }

    const row = await applyTransaction(userId, tx.data);
    const resolved = resolveEntitlement(row, new Date());
    // Deliberately no transaction identifiers in this log line.
    req.log.info({ tier: resolved.tier, status: resolved.status }, 'entitlement updated from client transaction');

    return entitlementResponse(userId);
  });
}
