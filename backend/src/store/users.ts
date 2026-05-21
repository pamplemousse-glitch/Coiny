import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { petState, users } from '../db/schema.js';

export type UserRow = typeof users.$inferSelect;

export async function findOrCreateUser(args: { appleSub: string; email?: string | null }): Promise<string> {
  const existing = await db().select({ id: users.id }).from(users).where(eq(users.appleSub, args.appleSub));
  if (existing[0]) return existing[0].id;

  const id = randomUUID();
  await db().transaction(async (tx) => {
    await tx.insert(users).values({ id, appleSub: args.appleSub, email: args.email ?? null });
    // Every user gets exactly one pet row, initialized with defaults.
    await tx.insert(petState).values({ userId: id });
  });

  return id;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await db().select().from(users).where(eq(users.id, id));
  return rows[0] ?? null;
}
