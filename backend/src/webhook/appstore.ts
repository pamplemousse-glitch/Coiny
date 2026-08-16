import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { isTransactionEnvironmentAllowed } from '../appstore/environment.js';
import { verifyAppStoreJws } from '../appstore/jws.js';
import {
  type NotificationPayload,
  notificationPayloadSchema,
  type RenewalInfoPayload,
  renewalInfoPayloadSchema,
  type TransactionPayload,
  tierForProductId,
  transactionPayloadSchema,
} from '../appstore/types.js';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { appStoreNotifications } from '../db/schema.js';
import {
  type EntitlementPatch,
  type EntitlementRow,
  findByAppAccountToken,
  findByOriginalTransactionId,
  updateEntitlement,
} from '../store/entitlements.js';

// App Store Server Notifications V2 (docs/prd.md R-25.4). This endpoint is
// unauthenticated in the session sense, in the same spirit as /webhooks/plaid:
// the only trust anchor is the JWS signature chain pinned to Apple's root,
// verified before anything is read from the payload. Without this feed the
// entitlement silently drifts from reality the moment a card fails: renewals,
// billing retry, grace periods, refunds and cancellations all land here.

const BodySchema = z.object({
  signedPayload: z.string().min(1).max(500_000),
});

export function registerAppStoreWebhook(app: FastifyInstance): void {
  app.post('/webhooks/appstore', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Bad Request' });

    const verification = verifyAppStoreJws(parsed.data.signedPayload);
    if (!verification.ok) {
      req.log.warn({ reason: verification.reason }, 'app store notification signature rejected');
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const payload = notificationPayloadSchema.safeParse(verification.payload);
    if (!payload.success) {
      req.log.warn('app store notification payload malformed');
      return reply.status(400).send({ error: 'Bad Request' });
    }

    const notification = payload.data;
    if (notification.data?.bundleId && notification.data.bundleId !== config.APPLE_BUNDLE_ID) {
      req.log.warn('app store notification bundle id mismatch');
      return reply.status(400).send({ error: 'Bad Request' });
    }

    const { tx, renewal } = decodeInnerPayloads(req, notification);

    // Same environment gate as the client-report path (appstore/environment.ts).
    // App Store Connect lets the sandbox and production notification URLs be
    // the same URL, so a production server can be handed a sandbox renewal for
    // a subscription nobody paid for. Acknowledged with 200 rather than an
    // error: Apple would otherwise retry a notification we will never apply.
    const environment = tx?.environment ?? notification.data?.environment ?? null;
    if (environment !== null && !isTransactionEnvironmentAllowed(environment)) {
      req.log.warn(
        { notification_type: notification.notificationType, environment, app_env: config.APP_ENV },
        'app store notification ignored, environment does not match this server',
      );
      return reply.status(200).send({ ok: true });
    }

    // Idempotency: Apple retries delivery, so claim the notificationUUID
    // before applying. A duplicate is acknowledged without reprocessing.
    const [claimed] = await db()
      .insert(appStoreNotifications)
      .values({
        notificationUuid: notification.notificationUUID,
        notificationType: notification.notificationType,
        subtype: notification.subtype ?? null,
        originalTransactionId: tx?.originalTransactionId ?? null,
      })
      .onConflictDoNothing({ target: appStoreNotifications.notificationUuid })
      .returning();
    if (!claimed) {
      req.log.info({ notification_type: notification.notificationType }, 'app store notification duplicate');
      return reply.status(200).send({ ok: true });
    }

    try {
      await applyNotification(req, notification, tx, renewal);
    } catch (err) {
      // Release the idempotency claim and 500 so Apple retries the delivery.
      await db()
        .delete(appStoreNotifications)
        .where(eq(appStoreNotifications.notificationUuid, notification.notificationUUID));
      req.log.error({ err }, 'app store notification processing failed');
      return reply.status(500).send({ error: 'Internal Server Error' });
    }

    return reply.status(200).send({ ok: true });
  });
}

/** Verifies and decodes the nested transaction and renewal-info JWS. Both are
 *  independently signed with the same Apple chain as the envelope. */
function decodeInnerPayloads(
  req: FastifyRequest,
  notification: NotificationPayload,
): { tx: TransactionPayload | null; renewal: RenewalInfoPayload | null } {
  let tx: TransactionPayload | null = null;
  let renewal: RenewalInfoPayload | null = null;

  if (notification.data?.signedTransactionInfo) {
    const verified = verifyAppStoreJws(notification.data.signedTransactionInfo);
    if (verified.ok) {
      const parsed = transactionPayloadSchema.safeParse(verified.payload);
      if (parsed.success) tx = parsed.data;
    }
    if (!tx) req.log.warn('app store signed transaction info unusable');
  }

  if (notification.data?.signedRenewalInfo) {
    const verified = verifyAppStoreJws(notification.data.signedRenewalInfo);
    if (verified.ok) {
      const parsed = renewalInfoPayloadSchema.safeParse(verified.payload);
      if (parsed.success) renewal = parsed.data;
    }
    if (!renewal) req.log.warn('app store signed renewal info unusable');
  }

  return { tx, renewal };
}

/** Finds the entitlement row this notification is about: by the subscription's
 *  originalTransactionId first, then by the appAccountToken the client minted
 *  before purchase (covers a purchase that completed while the app was
 *  backgrounded and was never reported by the client). */
async function findTargetRow(tx: TransactionPayload | null): Promise<EntitlementRow | null> {
  if (!tx) return null;
  const byTransaction = await findByOriginalTransactionId(tx.originalTransactionId);
  if (byTransaction) return byTransaction;
  if (tx.appAccountToken) return findByAppAccountToken(tx.appAccountToken.toLowerCase());
  return null;
}

function toDate(msSinceEpoch: number | undefined): Date | null {
  return typeof msSinceEpoch === 'number' ? new Date(msSinceEpoch) : null;
}

async function applyNotification(
  req: FastifyRequest,
  notification: NotificationPayload,
  tx: TransactionPayload | null,
  renewal: RenewalInfoPayload | null,
): Promise<void> {
  const type = notification.notificationType;
  const subtype = notification.subtype ?? null;

  if (type === 'TEST') {
    req.log.info('app store test notification received');
    return;
  }

  const row = await findTargetRow(tx);
  if (!row) {
    // Nothing to update: either an inner payload was unusable, or the
    // subscription was never bound to a user (no appAccountToken and the
    // client has not reported the purchase yet). The client-report path will
    // bind it later. No transaction identifiers in the log line.
    req.log.warn({ notification_type: type, subtype }, 'app store notification did not match a user');
    return;
  }

  const userId = row.userId;
  const patch = patchForNotification(type, subtype, tx, renewal);
  if (!patch) {
    req.log.info({ notification_type: type, subtype }, 'app store notification no-op');
    return;
  }

  await updateEntitlement(userId, patch);
  req.log.info(
    { notification_type: type, subtype, status: patch.status ?? row.status },
    'entitlement updated from app store notification',
  );
}

/** The state machine: maps a notification to an entitlement patch. Exported
 *  for direct unit testing of the matrix. Returns null for no-op types. */
export function patchForNotification(
  type: string,
  subtype: string | null,
  tx: TransactionPayload | null,
  renewal: RenewalInfoPayload | null,
): EntitlementPatch | null {
  const now = new Date();
  const autoRenewPatch: EntitlementPatch =
    renewal?.autoRenewStatus !== undefined ? { autoRenew: renewal.autoRenewStatus === 1 } : {};
  // The signed transaction accompanying a lapse notification carries the
  // authoritative paid-through date; the stored one may be stale (for example
  // a renewal Apple later failed to bill for). Sync it whenever present.
  const expiresPatch: EntitlementPatch = tx?.expiresDate !== undefined ? { expiresAt: toDate(tx.expiresDate) } : {};

  switch (type) {
    // A (re)subscription, a successful renewal (including one that ends a
    // billing retry), an upgrade/downgrade taking effect, an offer redemption,
    // or an Apple-granted renewal extension: trust the transaction as the new
    // truth and clear any grace/retry state.
    case 'SUBSCRIBED':
    case 'DID_RENEW':
    case 'OFFER_REDEEMED':
    case 'DID_CHANGE_RENEWAL_PREF':
    case 'RENEWAL_EXTENDED': {
      if (!tx) return null;
      const tier = tierForProductId(tx.productId);
      if (!tier) return null;
      const expiresAt = toDate(tx.expiresDate);
      return {
        tier,
        status: expiresAt && expiresAt <= now ? 'expired' : 'active',
        productId: tx.productId,
        environment: tx.environment,
        expiresAt,
        graceExpiresAt: null,
        revokedAt: null,
        ...autoRenewPatch,
      };
    }

    // The user toggled auto-renew (cancel or re-enable). Entitlement is
    // untouched: a cancelled subscription runs to its paid-through date.
    case 'DID_CHANGE_RENEWAL_STATUS':
      return autoRenewPatch;

    // A renewal attempt failed. With the GRACE_PERIOD subtype the user stays
    // entitled until gracePeriodExpiresDate while Apple retries; without it,
    // entitlement lapses at the paid-through date and this row degrades to
    // free on resolution until a DID_RENEW arrives.
    case 'DID_FAIL_TO_RENEW': {
      if (subtype === 'GRACE_PERIOD') {
        return {
          status: 'grace',
          graceExpiresAt: toDate(renewal?.gracePeriodExpiresDate),
          ...expiresPatch,
          ...autoRenewPatch,
        };
      }
      return { status: 'billing_retry', graceExpiresAt: null, ...expiresPatch, ...autoRenewPatch };
    }

    case 'GRACE_PERIOD_EXPIRED':
      return { status: 'billing_retry', graceExpiresAt: null, ...expiresPatch, ...autoRenewPatch };

    case 'EXPIRED':
      return { status: 'expired', graceExpiresAt: null, ...expiresPatch, ...autoRenewPatch };

    // Apple refunded the purchase or revoked family-shared access:
    // entitlement ends immediately.
    case 'REFUND':
    case 'REVOKE':
      return {
        status: 'revoked',
        revokedAt: toDate(tx?.revocationDate) ?? now,
        graceExpiresAt: null,
        ...autoRenewPatch,
      };

    case 'REFUND_REVERSED': {
      const expiresAt = toDate(tx?.expiresDate);
      return {
        status: expiresAt && expiresAt > now ? 'active' : 'expired',
        revokedAt: null,
        ...(expiresAt ? { expiresAt } : {}),
        ...autoRenewPatch,
      };
    }

    // PRICE_INCREASE, CONSUMPTION_REQUEST, EXTERNAL_PURCHASE_TOKEN, etc.:
    // acknowledged but no entitlement consequence today.
    default:
      return null;
  }
}
