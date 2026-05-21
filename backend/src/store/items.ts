import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { plaidItems } from '../db/schema.js';

export type PlaidItemRow = typeof plaidItems.$inferSelect;

// AES-256-GCM envelope: hex(iv):hex(authTag):hex(ciphertext)
function encryptToken(plaintext: string): string {
  if (!config.DATA_ENCRYPTION_KEY) return plaintext;
  const key = Buffer.from(config.DATA_ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptToken(stored: string): string {
  if (!config.DATA_ENCRYPTION_KEY || !stored.includes(':')) return stored;
  const parts = stored.split(':');
  if (parts.length !== 3) return stored;
  const [ivHex, tagHex, ctHex] = parts as [string, string, string];
  const key = Buffer.from(config.DATA_ENCRYPTION_KEY, 'hex');
  // nosemgrep: javascript.node-crypto.security.gcm-no-tag-length — authTagLength option is the Node.js equivalent
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(ctHex, 'hex')).toString('utf8') + decipher.final('utf8');
}

export async function getItem(itemId: string): Promise<(PlaidItemRow & { accessToken: string }) | null> {
  const rows = await db().select().from(plaidItems).where(eq(plaidItems.itemId, itemId));
  const row = rows[0];
  if (!row) return null;
  return { ...row, accessToken: decryptToken(row.accessToken) };
}

export async function upsertItem(args: { itemId: string; accessToken: string; userId: string }): Promise<void> {
  const stored = encryptToken(args.accessToken);
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
