// The connection-health sweep (docs/testing-strategy.md section 8 item 3).
//
// Webhooks are the fast path and they are not a guarantee. A delivery can fail,
// a signature can be rejected, the server can be mid-deploy, and Plaid does not
// resend forever. Every one of those leaves an item broken in reality and
// `healthy` in our database, which is the worst possible combination for a net
// worth app: a confident number that is wrong, with nothing anywhere that
// disagrees.
//
// So once a day this asks Plaid directly. `/item/get` is free, is not billed
// per product, and returns both the item's current error and its consent
// expiry, which are exactly the two facts the ITEM webhooks carry. Anything the
// sweep finds is a webhook that was missed, and it is logged as such
// (`source: 'sweep'`) so that stops being an inference.
//
// It transitions through the same `transitionItemStatus` the webhook uses,
// which is why the two cannot drift: the push, the analytics event and the
// already-in-that-state suppression are all that function's, not this one's.

import { itemGet } from '../plaid/client.js';
import { type LifecycleLogger, transitionItemStatus } from '../plaid/item-lifecycle.js';
import { PlaidApiError } from '../plaid/types.js';
import { listActiveItemsForHealthCheck } from '../store/items.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How close to consent expiry counts as "expiring".
 *
 *  Seven days, matching what Plaid's own PENDING_EXPIRATION lead time gives the
 *  user, so an item the sweep catches lands in the same state on the same
 *  schedule as one a webhook caught. */
export const CONSENT_WARNING_WINDOW_MS = 7 * DAY_MS;

export const HEALTH_SWEEP_INTERVAL_MS = DAY_MS;

/** Plaid error codes that mean the user must re-authenticate. Everything else
 *  (rate limits, institution outages, product errors) is transient and must not
 *  move an item's lifecycle state: telling someone to re-link because Plaid was
 *  briefly busy trains them to ignore the message. */
const REAUTH_ERROR_CODES = new Set([
  'ITEM_LOGIN_REQUIRED',
  'ITEM_LOCKED',
  'INVALID_CREDENTIALS',
  'INVALID_MFA',
  'INVALID_UPDATED_USERNAME',
  'INSUFFICIENT_CREDENTIALS',
  'USER_PERMISSION_REVOKED',
  'USER_ACCOUNT_REVOKED',
  'PENDING_DISCONNECT',
  'PENDING_EXPIRATION',
]);

export type HealthSweepSummary = {
  /** Items asked about. */
  checked: number;
  /** Items whose stored status the sweep corrected, i.e. missed webhooks. */
  corrected: number;
  /** Items Plaid could not answer for. Never a state change. */
  failed: number;
};

let lastSweepAt: Date | null = null;

/** Test seam: the daily gate is process state, so a test running two ticks has
 *  to be able to clear it. Mirrors resetPurgeSchedule. */
export function resetHealthSweepSchedule(): void {
  lastSweepAt = null;
}

export function isHealthSweepDue(now: Date): boolean {
  return lastSweepAt === null || now.getTime() - lastSweepAt.getTime() >= HEALTH_SWEEP_INTERVAL_MS;
}

/**
 * Ask Plaid the current state of every live item and reconcile ours to it.
 *
 * Never throws: a sweep failure is an operational problem and must not cost the
 * tick its refreshes, exactly like the retention purge.
 */
export async function runConnectionHealthSweep(
  now: Date = new Date(),
  log: LifecycleLogger,
): Promise<HealthSweepSummary> {
  const summary: HealthSweepSummary = { checked: 0, corrected: 0, failed: 0 };
  const items = await listActiveItemsForHealthCheck();

  for (const item of items) {
    summary.checked += 1;
    try {
      const res = await itemGet(item.accessToken);
      const errorCode = res.item.error?.error_code ?? null;

      // An error Plaid is still reporting outranks a consent clock: an item
      // that already needs re-auth is not merely "expiring".
      if (errorCode && REAUTH_ERROR_CODES.has(errorCode)) {
        const to =
          errorCode === 'PENDING_DISCONNECT' || errorCode === 'PENDING_EXPIRATION' ? 'expiring' : 'reauth_required';
        const changed = await transitionItemStatus(log, item.itemId, to, {
          errorCode,
          // Same ordering guard the webhook uses: never soften an item that
          // already needs re-authentication down to `expiring`.
          ...(to === 'expiring' ? { onlyIfCurrent: ['healthy'] as const } : {}),
          source: 'sweep',
        });
        if (changed) summary.corrected += 1;
        continue;
      }

      // No error, but consent is running out and no PENDING_* webhook moved us.
      const expiresAt = res.item.consent_expiration_time ? Date.parse(res.item.consent_expiration_time) : Number.NaN;
      if (!Number.isNaN(expiresAt) && expiresAt - now.getTime() <= CONSENT_WARNING_WINDOW_MS) {
        const changed = await transitionItemStatus(log, item.itemId, 'expiring', {
          errorCode: 'CONSENT_EXPIRING',
          onlyIfCurrent: ['healthy'],
          source: 'sweep',
        });
        if (changed) summary.corrected += 1;
        continue;
      }

      // Plaid says the item is fine. Heal it if we thought otherwise, with the
      // same guard LOGIN_REPAIRED uses: a revoked item stays revoked, because
      // revocation is not something an absent error undoes.
      if (item.status !== 'healthy') {
        const changed = await transitionItemStatus(log, item.itemId, 'healthy', {
          onlyIfCurrent: ['reauth_required', 'expiring'],
          source: 'sweep',
        });
        if (changed) summary.corrected += 1;
      }
    } catch (err) {
      summary.failed += 1;
      // Programmatic code only, never the vendor's message (R-31.5).
      log.warn(
        {
          item_id: item.itemId,
          plaid_error_code: err instanceof PlaidApiError ? err.body.error_code : null,
        },
        'connection health check failed for item',
      );
    }
  }

  lastSweepAt = now;
  return summary;
}
