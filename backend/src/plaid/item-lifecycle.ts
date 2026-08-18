// One place where a Plaid item changes lifecycle state, whatever noticed.
//
// Extracted from webhook/plaid.ts when the connection-health sweep landed
// (testing-strategy section 8 item 3). Two callers now observe the same facts
// from different directions: the webhook hears about a break, and the sweep
// finds the ones no webhook ever arrived for. They must agree about what
// happens next, and the way to guarantee that is to have one function rather
// than two that look similar.
//
// Everything the old inline version did is preserved: the unknown-item warning,
// the unchanged-status early return, the item_state_changed log line and
// analytics event, and the push.

import { reactionForEvent } from '../reactions/contract.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { trackServerEvent } from '../store/analytics.js';
import { type PlaidItemStatus, setItemStatus } from '../store/items.js';

/** The logging surface both callers can supply: Fastify's request/app logger
 *  and the scheduler's own. Narrow on purpose so neither has to import the
 *  other's types. */
export type LifecycleLogger = {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
};

/** Which lifecycle transitions are worth interrupting someone for.
 *
 *  `expiring` is the seven-day warning and the highest-value one: a break the
 *  user fixes before it happens is not a break. `reauth_required` and `revoked`
 *  are already-broken, where the number on screen is stale and only the user
 *  can fix it.
 *
 *  `healthy` is deliberately absent. A connection healing is not worth a buzz;
 *  it shows up in-app on next open, and spending one of two weekly pushes on
 *  good news about plumbing is the kind of thing that gets notifications turned
 *  off permanently. */
const PUSH_ON_STATUS: Partial<Record<PlaidItemStatus, 'connection_expiring' | 'connection_broken'>> = {
  expiring: 'connection_expiring',
  reauth_required: 'connection_broken',
  revoked: 'connection_broken',
};

/**
 * Persist a lifecycle transition and, when the state actually changed, emit
 * `item_state_changed` (docs/prd.md R-8.5, section 24) and tell the user.
 *
 * SEAM: this is the single place instrumentation hooks into item lifecycle
 * events, and where the user gets told.
 *
 * The push goes through `dispatchReaction` rather than calling APNs, which is
 * what keeps quiet hours, the two-a-week budget and the same-type cooldown in
 * force. What is NOT deferred is the decision to notify at all: recording a
 * broken connection and telling nobody is not budget discipline, it is the gap
 * testing-strategy.md section 8 describes, where the server knew the number on
 * screen was wrong and waited for the user to notice.
 *
 * Returns whether anything changed, so a caller that sweeps many items can
 * report how many it actually moved.
 */
export async function transitionItemStatus(
  log: LifecycleLogger,
  itemId: string,
  to: PlaidItemStatus,
  opts?: { errorCode?: string | null; onlyIfCurrent?: readonly PlaidItemStatus[]; source?: string },
): Promise<boolean> {
  const result = await setItemStatus(itemId, to, opts ?? {});
  if (!result) {
    log.warn({ item_id: itemId }, 'plaid item lifecycle update for unknown item');
    return false;
  }
  if (!result.changed) {
    log.info({ item_id: itemId, status: result.previous }, 'plaid item status unchanged');
    return false;
  }
  log.info(
    {
      event: 'item_state_changed',
      item_id: itemId,
      from: result.previous,
      to,
      error_code: opts?.errorCode ?? null,
      // Which mechanism noticed. A break found by the sweep rather than by a
      // webhook means a webhook was missed, and that is worth being able to
      // count rather than infer.
      source: opts?.source ?? 'webhook',
    },
    'plaid item state changed',
  );

  // Connection breakage is the documented number one churn cause in this
  // category, so every lifecycle transition is a measurable server-observed
  // fact (R-24.2), not just the revoked edge that disableItem already emits.
  // The Plaid error code is a closed vocabulary from Plaid, never message text.
  if (result.userId) {
    await trackServerEvent(result.userId, 'item_state_changed', {
      state: to,
      ...(opts?.errorCode ? { error_code: opts.errorCode.toLowerCase() } : {}),
    });

    // `result.changed` is guaranteed by the early return above, so a repeated
    // webhook (or a daily sweep re-observing the same broken item) pushes
    // nothing. That is the per-break rate limit section 8 asks for, with no
    // extra state to keep.
    const event = PUSH_ON_STATUS[to];
    if (event) {
      dispatchReaction(result.userId, reactionForEvent(event), event);
    }
  }

  return true;
}
