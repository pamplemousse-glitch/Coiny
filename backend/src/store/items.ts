import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { plaidItems } from '../db/schema.js';

export type PlaidItemRow = typeof plaidItems.$inferSelect;

export async function getItem(itemId: string): Promise<PlaidItemRow | null> {
  const rows = await db().select().from(plaidItems).where(eq(plaidItems.itemId, itemId));
  return rows[0] ?? null;
}

export async function upsertItem(args: { itemId: string; accessToken: string }): Promise<void> {
  await db()
    .insert(plaidItems)
    .values({ itemId: args.itemId, accessToken: args.accessToken })
    .onConflictDoUpdate({
      target: plaidItems.itemId,
      // On re-link the access_token may change; preserve cursor + sync state.
      set: { accessToken: args.accessToken, disabled: false },
    });
}

export async function setCursor(itemId: string, cursor: string): Promise<void> {
  await db().update(plaidItems).set({ cursor }).where(eq(plaidItems.itemId, itemId));
}

export async function markInitialSyncComplete(itemId: string): Promise<void> {
  await db()
    .update(plaidItems)
    .set({ initialSyncComplete: true })
    .where(eq(plaidItems.itemId, itemId));
}

export async function disableItem(itemId: string): Promise<void> {
  await db().update(plaidItems).set({ disabled: true }).where(eq(plaidItems.itemId, itemId));
}
