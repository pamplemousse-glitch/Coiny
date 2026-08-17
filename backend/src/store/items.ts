import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { type PlaidItemStatus, plaidItems } from '../db/schema.js';
import { decryptString, encryptString } from '../util/crypto.js';
import { trackServerEvent } from './analytics.js';

export type PlaidItemRow = typeof plaidItems.$inferSelect;
export type { PlaidItemStatus };

// userId rides along because Plaid webhooks arrive keyed by item_id with no
// user context, and the caller needs it to emit item_state_changed (R-24.2)
// without a second lookup.
export type ItemStatusTransition = { previous: PlaidItemStatus; changed: boolean; userId: string | null };

// Item-keyed lookups (getItem, setItemStatus, setCursor, ...) exist because
// Plaid webhooks arrive keyed by item_id with no user context. Everything
// reachable from an authenticated route must go through the userId-scoped
// functions below (getItemsByUser, getItemForUser, markItemRepaired).

export async function getItem(itemId: string): Promise<(PlaidItemRow & { accessToken: string }) | null> {
  const rows = await db().select().from(plaidItems).where(eq(plaidItems.itemId, itemId));
  const row = rows[0];
  if (!row) return null;
  return { ...row, accessToken: decryptString(row.accessToken) };
}

export async function getItemsByUser(userId: string): Promise<(PlaidItemRow & { accessToken: string })[]> {
  const rows = await db().select().from(plaidItems).where(eq(plaidItems.userId, userId));
  return rows.map((row) => ({ ...row, accessToken: decryptString(row.accessToken) }));
}

export async function getItemForUser(
  userId: string,
  itemId: string,
): Promise<(PlaidItemRow & { accessToken: string }) | null> {
  const rows = await db()
    .select()
    .from(plaidItems)
    .where(and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)));
  const row = rows[0];
  if (!row) return null;
  return { ...row, accessToken: decryptString(row.accessToken) };
}

export async function upsertItem(args: {
  itemId: string;
  accessToken: string;
  userId: string;
  // From /item/get at link time (S-17: the repair prompt names the bank).
  // Omitted (not null) when the lookup failed, so a relink whose institution
  // fetch failed never erases a previously stored name.
  institutionId?: string | null;
  institutionName?: string | null;
}): Promise<void> {
  const stored = encryptString(args.accessToken);
  const institution =
    args.institutionId !== undefined || args.institutionName !== undefined
      ? { institutionId: args.institutionId ?? null, institutionName: args.institutionName ?? null }
      : {};
  await db()
    .insert(plaidItems)
    .values({ itemId: args.itemId, accessToken: stored, userId: args.userId, ...institution })
    .onConflictDoUpdate({
      target: plaidItems.itemId,
      // Relinking the same institution returns the same item_id; a fresh
      // exchange means the connection works again, so health state resets.
      set: {
        accessToken: stored,
        disabled: false,
        status: 'healthy',
        statusChangedAt: new Date(),
        lastErrorCode: null,
        newAccountsAvailable: false,
        ...institution,
      },
    });
}

/** Persist the institution identity for an existing item. Used to lazily
 *  backfill items linked before the institution columns existed. */
export async function setItemInstitution(
  itemId: string,
  institution: { institutionId: string | null; institutionName: string | null },
): Promise<void> {
  await db()
    .update(plaidItems)
    .set({ institutionId: institution.institutionId, institutionName: institution.institutionName })
    .where(eq(plaidItems.itemId, itemId));
}

/**
 * Transition an item's lifecycle status. Returns the previous status and
 * whether anything changed, or null when the item does not exist.
 *
 * `onlyIfCurrent` guards ordering: PENDING_EXPIRATION must not downgrade an
 * item that already needs re-authentication, and LOGIN_REPAIRED must not
 * resurrect a revoked item.
 */
export async function setItemStatus(
  itemId: string,
  status: PlaidItemStatus,
  opts?: { errorCode?: string | null; onlyIfCurrent?: readonly PlaidItemStatus[] },
): Promise<ItemStatusTransition | null> {
  const rows = await db()
    .select({ status: plaidItems.status, userId: plaidItems.userId })
    .from(plaidItems)
    .where(eq(plaidItems.itemId, itemId));
  const row = rows[0];
  if (!row) return null;
  const previous = row.status;
  const userId = row.userId ?? null;
  if (previous === status) return { previous, changed: false, userId };
  if (opts?.onlyIfCurrent && !opts.onlyIfCurrent.includes(previous)) return { previous, changed: false, userId };
  await db()
    .update(plaidItems)
    .set({
      status,
      statusChangedAt: new Date(),
      lastErrorCode: status === 'healthy' ? null : (opts?.errorCode ?? null),
    })
    .where(eq(plaidItems.itemId, itemId));
  return { previous, changed: true, userId };
}

export async function setNewAccountsAvailable(itemId: string, available: boolean): Promise<void> {
  await db().update(plaidItems).set({ newAccountsAvailable: available }).where(eq(plaidItems.itemId, itemId));
}

/**
 * Called after the client completes Link update mode for this item. The
 * existing access token keeps working after update mode, so this only resets
 * health state: status back to healthy, error and new-accounts flags cleared,
 * and the item re-enabled (update mode can restore a revoked item).
 * Scoped by userId: only the item's owner can mark it repaired.
 */
export async function markItemRepaired(userId: string, itemId: string): Promise<{ previous: PlaidItemStatus } | null> {
  const rows = await db()
    .select({ status: plaidItems.status })
    .from(plaidItems)
    .where(and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)));
  const row = rows[0];
  if (!row) return null;
  await db()
    .update(plaidItems)
    .set({
      status: 'healthy',
      statusChangedAt: new Date(),
      lastErrorCode: null,
      newAccountsAvailable: false,
      disabled: false,
    })
    .where(and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)));
  return { previous: row.status };
}

export async function setCursor(itemId: string, cursor: string): Promise<void> {
  await db().update(plaidItems).set({ cursor }).where(eq(plaidItems.itemId, itemId));
}

export async function markInitialSyncComplete(itemId: string): Promise<void> {
  await db().update(plaidItems).set({ initialSyncComplete: true }).where(eq(plaidItems.itemId, itemId));
}

export async function disableItem(itemId: string): Promise<void> {
  const [row] = await db()
    .select({ userId: plaidItems.userId, disabled: plaidItems.disabled })
    .from(plaidItems)
    .where(eq(plaidItems.itemId, itemId));

  await db().update(plaidItems).set({ disabled: true }).where(eq(plaidItems.itemId, itemId));

  // Connection breakage is a server-observed fact (prd.md R-24.2): today the
  // only disable paths are USER_PERMISSION_REVOKED and user-initiated removal,
  // both of which are 'revoked'. Emitted on the edge only (already-disabled
  // items stay silent). The richer lifecycle states (R-8.5) will emit through
  // the same trackServerEvent when the item status column lands.
  if (row?.userId && !row.disabled) {
    await trackServerEvent(row.userId, 'item_state_changed', { state: 'revoked' });
  }
}

/**
 * Deletes the item row, and with it the encrypted access token, the sync
 * cursor and the institution identity. Called when the user unlinks: every
 * other provider drops its credential row at disconnect, and
 * `docs/legal/data-disposal-schedule.md` says nothing retains a revoked
 * credential.
 *
 * The caller is responsible for having removed the Item at Plaid FIRST, or
 * for having queued it via `store/plaid-removal-queue.ts` when that call
 * failed. This function destroys the only copy of the token, and an Item that
 * outlives its token is billed monthly with no way left to cancel it.
 *
 * Nothing has a foreign key to `plaid_items`, so this deletes exactly one row.
 * Transactions, recurring streams and the balance cache are keyed by user, not
 * by item, and stay for their own retention window; the net-worth read already
 * ignores balances whose item is not present and not disabled, so a deleted
 * item contributes nothing to any total.
 */
export async function deleteItem(itemId: string): Promise<void> {
  await db().delete(plaidItems).where(eq(plaidItems.itemId, itemId));
}

export async function resetCursor(itemId: string): Promise<void> {
  await db().update(plaidItems).set({ cursor: null }).where(eq(plaidItems.itemId, itemId));
}
