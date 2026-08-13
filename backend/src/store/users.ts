import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { petState, users } from '../db/schema.js';
import { decryptString, encryptString } from '../util/crypto.js';
import { trackServerEvent } from './analytics.js';

export type UserRow = typeof users.$inferSelect;

export type FindOrCreateUserArgs =
  | { appleSub: string; googleSub?: never; email?: string | null; displayName?: string | null }
  | { appleSub?: never; googleSub: string; email?: string | null; displayName?: string | null };

export async function findOrCreateUser(args: FindOrCreateUserArgs): Promise<string> {
  const lookupColumn = args.appleSub ? users.appleSub : users.googleSub;
  const sub = (args.appleSub ?? args.googleSub) as string;

  const existing = await db().select({ id: users.id }).from(users).where(eq(lookupColumn, sub));
  if (existing[0]) return existing[0].id;

  const id = randomUUID();
  await db().transaction(async (tx) => {
    const encryptedEmail = args.email ? encryptString(args.email) : null;
    await tx.insert(users).values({
      id,
      appleSub: args.appleSub ?? null,
      googleSub: args.googleSub ?? null,
      email: encryptedEmail,
      displayName: args.displayName ?? null,
    });
    // Every user gets exactly one pet row, initialized with defaults.
    await tx.insert(petState).values({ userId: id });
  });

  // Cohort day 0 for every retention metric (prd.md R-2.1). Emitted only on
  // creation, never on a returning sign-in, and only after the transaction
  // committed. Method only: never the sub, never the email.
  await trackServerEvent(id, 'signup_completed', { method: args.appleSub ? 'apple' : 'google' });

  return id;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  await db().update(users).set({ displayName }).where(eq(users.id, userId));
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await db().select().from(users).where(eq(users.id, id));
  const row = rows[0];
  if (!row) return null;
  return { ...row, email: row.email ? decryptString(row.email) : null };
}

// Deletes the user row. All child tables (sessions, pet_state, plaid_items,
// transactions, reaction_history, device_tokens, category_overrides) cascade.
export async function deleteUser(id: string): Promise<void> {
  await db().delete(users).where(eq(users.id, id));
}
