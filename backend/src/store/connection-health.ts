// Per-connection health: which ONE of a user's connections is broken.
//
// Survey gaps 1 and 2. Only `plaid_items` carried health; everything else was
// tracked per asset CLASS in `asset_class_cache`, which is the right data at
// the wrong grain. A user with three Zerion wallets, one of which has died,
// gets a class that reads `degraded` with no way to say which wallet needs
// attention, and "prompt the user to fix it" cannot be built on top of that
// because there is nothing specific to prompt about.
//
// ---------------------------------------------------------------------------
// The asymmetry this closes
// ---------------------------------------------------------------------------
//
// Eleven of the thirteen connection tables ALREADY recorded `last_synced_at`,
// the time of the last success. Not one recorded anything about failure. So the
// problem was never that health went untracked; it was that only the happy half
// was ever written down. A timestamp with no failure history cannot distinguish
// "fresh" from "stopped being refreshed a month ago and nobody noticed".
//
// ---------------------------------------------------------------------------
// Why there is no stored `status` column
// ---------------------------------------------------------------------------
//
// This is where the generalisation departs from copying `plaid_items` wholesale,
// and it is the one design decision in the file worth arguing about.
//
// A stored lifecycle earns its place when something EXTERNAL drives the
// transitions. Plaid sends ITEM webhooks, so `healthy -> expiring ->
// reauth_required -> revoked` is a fact arriving from outside that must be
// persisted at the moment it arrives, because nothing in our own data implies
// it. No other vendor here sends one.
//
// For everyone else the state is a pure function of the columns, so storing it
// would create a value that can disagree with its own inputs. That is the same
// mistake as the `reauth_required` subtotal mismatch fixed in #309: two copies
// of one rule, in two places, drifting. `deriveConnectionStatus` is the single
// copy.

import type { ClassStatus } from '../networth/classes.js';

/** The health columns every connection table gained in migration 0062, plus
 *  the `lastSyncedAt` eleven of them already had. Structural rather than
 *  per-table, so one function serves all thirteen without a registry that can
 *  fall out of date. */
export type ConnectionHealthRow = {
  lastSyncedAt: Date | null;
  lastAttemptAt: Date | null;
  lastErrorClass: string | null;
  consecutiveFailures: number;
  disabled: boolean;
};

/** Consecutive failures before a connection reads `error` rather than merely
 *  having failed once.
 *
 *  Three, not one. Vendors fail transiently all day, and a connection that
 *  reads broken on a single blip trains the user to ignore the badge, which is
 *  the same judgement `scheduler/plaid-health.ts` makes when it refuses to move
 *  an item's lifecycle on a rate limit, and the same one
 *  `api/health-integrations.ts` makes with its own threshold. Deliberately
 *  LOWER than the scheduler's FAILURE_BACKOFF_THRESHOLD of 5: telling the user
 *  should not have to wait for the machine to give up retrying. */
export const CONNECTION_ERROR_THRESHOLD = 3;

/**
 * The connection's status, derived, never stored.
 *
 * Reuses the `ClassStatus` vocabulary from `networth/classes.ts` rather than
 * inventing a second one. The survey's verdict on that vocabulary was that it
 * is good and that nothing argues for adding states, so this maps onto the
 * subset that is meaningful for a single connection.
 *
 * Rules, in order:
 *   - `disabled`: the user removed it or we turned it off. `disconnected`.
 *   - an `auth` failure past the threshold: the credential lapsed and only the
 *     user can fix it. `reauth_required`. This is the one that earns a prompt.
 *   - any other failure past the threshold: `error`. Ours or the vendor's to
 *     fix, and prompting the user would be telling them to fix a rate limit.
 *   - never synced, no failure recorded: `pending`, the first fetch has not
 *     finished. Never `ok`, and never a zero.
 *   - otherwise `ok`.
 *
 * Note what is absent: `stale` and `stale_excluded` are NOT decided here. Age
 * is a property of the VALUE, and the freshness policy in
 * `networth/classes.ts` owns it. A connection can be perfectly healthy and hold
 * a value too old to count, and conflating those is how a working connection
 * ends up wearing a broken badge.
 */
export function deriveConnectionStatus(row: ConnectionHealthRow): ClassStatus {
  if (row.disabled) return 'disconnected';

  if (row.consecutiveFailures >= CONNECTION_ERROR_THRESHOLD) {
    return row.lastErrorClass === 'auth' ? 'reauth_required' : 'error';
  }

  if (row.lastSyncedAt === null) {
    // A recorded failure with no success ever means the first fetch failed, not
    // that it is still running. Below the threshold it is not yet worth
    // alarming about, but it is not `pending` either once it has failed enough
    // to be worth naming.
    return row.consecutiveFailures > 0 ? 'stale' : 'pending';
  }

  return 'ok';
}

/** True when the user is the only one who can fix this connection, which is the
 *  precondition for prompting them about it (survey gap 6, generalised beyond
 *  Plaid). Everything else is ours or the vendor's problem, and Plaid's own
 *  guidance plus Actual Budget's `showAuth` both draw the line here. */
export function isUserActionable(status: ClassStatus): boolean {
  return status === 'reauth_required' || status === 'disconnected';
}

/** The column updates for a successful attempt. Clears the failure history:
 *  a success means the connection works now, and a stale failure count would
 *  keep a working connection wearing a badge. */
export function successPatch(at: Date = new Date()): {
  lastSyncedAt: Date;
  lastAttemptAt: Date;
  lastErrorClass: null;
  consecutiveFailures: number;
} {
  return { lastSyncedAt: at, lastAttemptAt: at, lastErrorClass: null, consecutiveFailures: 0 };
}

/** The column updates for a failed attempt.
 *
 *  `lastSyncedAt` is deliberately untouched, exactly as `recordClassFailure`
 *  leaves the cached value alone: a failed refresh does not make the last good
 *  value wrong, it makes it un-refreshable, and the read path must keep serving
 *  it with its real age (R-8.1).
 *
 *  Takes the previous count rather than reading it, so the caller can do this
 *  in one UPDATE without a read-modify-write race. */
export function failurePatch(
  previousFailures: number,
  errorClass: string,
  at: Date = new Date(),
): { lastAttemptAt: Date; lastErrorClass: string; consecutiveFailures: number } {
  return { lastAttemptAt: at, lastErrorClass: errorClass, consecutiveFailures: previousFailures + 1 };
}
