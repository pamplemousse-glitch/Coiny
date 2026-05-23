import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { petState, users } from '../db/schema.js';

export type UserRow = typeof users.$inferSelect;

export async function findOrCreateUser(args: {
  appleSub: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<string> {
  const existing = await db().select({ id: users.id }).from(users).where(eq(users.appleSub, args.appleSub));
  if (existing[0]) return existing[0].id;

  const id = randomUUID();
  await db().transaction(async (tx) => {
    await tx
      .insert(users)
      .values({ id, appleSub: args.appleSub, email: args.email ?? null, displayName: args.displayName ?? null });
    // Every user gets exactly one pet row, initialized with defaults.
    await tx.insert(petState).values({ userId: id });
  });

  return id;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  await db().update(users).set({ displayName }).where(eq(users.id, userId));
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await db().select().from(users).where(eq(users.id, id));
  return rows[0] ?? null;
}

// Deletes the user row. All child tables (sessions, pet_state, plaid_items,
// transactions, reaction_history, device_tokens, category_overrides) cascade.
export async function deleteUser(id: string): Promise<void> {
  await db().delete(users).where(eq(users.id, id));
}
