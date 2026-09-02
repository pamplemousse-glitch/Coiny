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

import type { SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import type {
  alpacaConnections,
  chainWallets,
  discogsConnections,
  hyperliquidAccounts,
  kalshiConnections,
  krakenConnections,
  nftWallets,
  polymarketAccounts,
  truelayerConnections,
  ynabConnections,
} from '../db/schema.js';
import type { ClassStatus } from '../networth/classes.js';
import { classifyError } from '../networth/refresh.js';
import { log } from '../util/log.js';

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

/**
 * What one vendor sync reports back.
 *
 * Exists because these syncs now have two callers with different needs. The
 * route turns `not_connected` into a 404 and `body` into its JSON response;
 * the scheduler (sync/credential-vendors.ts) needs to tell "there was nothing
 * to sync" apart from "it synced", and must never treat the first as an error.
 * Before the extraction that distinction lived in a `reply.status(404)` call,
 * which a scheduled run cannot make.
 *
 * `body` is per-vendor on purpose: each route already had a response shape its
 * client depends on (`{ total }`, `{ equity }`, `{ updated }`), and flattening
 * them into one shape here would be an API break bought for nothing.
 *
 * A vendor FAILURE is not in this union. It throws, exactly as it did from
 * inside the route, because the error itself carries what went wrong and
 * `plugins/error-handler.ts` still has to see it.
 */
export type VendorSyncResult<TBody extends object = Record<string, never>> =
  | { status: 'not_connected' }
  | { status: 'synced'; updated: number; body: TBody };

/** The connection tables that carry the 0062 health columns and are synced by a
 *  user-triggered route. A union rather than a generic `PgTable`, so `.set()`
 *  below stays type-checked against the real columns instead of being cast. */
type SyncedConnectionTable =
  | typeof alpacaConnections
  | typeof chainWallets
  | typeof discogsConnections
  | typeof hyperliquidAccounts
  | typeof kalshiConnections
  | typeof krakenConnections
  | typeof nftWallets
  | typeof polymarketAccounts
  | typeof truelayerConnections
  | typeof ynabConnections;

/**
 * Record a failed user-triggered sync against one connection row.
 *
 * Called from a route's catch, which then RETHROWS: the client must still see
 * its 500, and `plugins/error-handler.ts` must still report it to Sentry. This
 * only adds the durable per-connection fact that was missing, so the next
 * `GET /api/net-worth` can name which connection is unhealthy.
 *
 * Never throws. A failure to record a failure must not replace the vendor's
 * error with ours, which would lose the more informative of the two.
 *
 * `where` accepts undefined because Drizzle's `and()` is typed
 * `SQL | undefined`, and every caller here composes one to keep the update
 * scoped by `user_id` (.claude/rules/security.md #6) rather than by primary key
 * alone.
 */
export async function recordSyncFailure(
  table: SyncedConnectionTable,
  where: SQL | undefined,
  previousFailures: number,
  err: unknown,
): Promise<void> {
  try {
    await db()
      .update(table)
      .set(failurePatch(previousFailures, classifyError(err)))
      .where(where);
  } catch {
    log.warn('connection-health: failed to record a sync failure');
  }
}
