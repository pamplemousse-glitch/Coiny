import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { plaidItems } from '../db/schema.js';
import { decryptString, encryptString } from '../util/crypto.js';

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
  await db().update(plaidItems).set({ disabled: true }).where(eq(plaidItems.itemId, itemId));
}
