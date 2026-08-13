import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { plaidItems } from '../db/schema.js';
import { decryptString, encryptString } from '../util/crypto.js';
import { trackServerEvent } from './analytics.js';

export type PlaidItemRow = typeof plaidItems.$inferSelect;

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

export async function upsertItem(args: { itemId: string; accessToken: string; userId: string }): Promise<void> {
  const stored = encryptString(args.accessToken);
  await db()
    .insert(plaidItems)
    .values({ itemId: args.itemId, accessToken: stored, userId: args.userId })
    .onConflictDoUpdate({
      target: plaidItems.itemId,
      set: { accessToken: stored, disabled: false },
    });
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

export async function resetCursor(itemId: string): Promise<void> {
  await db().update(plaidItems).set({ cursor: null }).where(eq(plaidItems.itemId, itemId));
}
