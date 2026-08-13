import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { userDeclarations } from '../db/schema.js';

/** User-declared ladder targets. Null means "use the engine default", which is
 *  distinct from a declared value: the engine substitutes
 *  DEFAULT_SHELTERED_RATE / SURPLUS_SAVINGS_RATE only when these are null. */
export type Declarations = {
  shelteredTargetRate: number | null;
  surplusTargetRate: number | null;
};

function num(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export async function getDeclarations(userId: string): Promise<Declarations> {
  const [row] = await db().select().from(userDeclarations).where(eq(userDeclarations.userId, userId));
  if (!row) return { shelteredTargetRate: null, surplusTargetRate: null };
  return {
    shelteredTargetRate: num(row.shelteredTargetRate),
    surplusTargetRate: num(row.surplusTargetRate),
  };
}

/** Partial update: absent fields are left untouched; an explicit null clears the
 *  override back to the engine default. */
export async function updateDeclarations(
  userId: string,
  patch: { shelteredTargetRate?: number | null | undefined; surplusTargetRate?: number | null | undefined },
  now: Date,
): Promise<Declarations> {
  const set: Partial<typeof userDeclarations.$inferInsert> = { updatedAt: now };
  if (patch.shelteredTargetRate !== undefined) {
    set.shelteredTargetRate = patch.shelteredTargetRate === null ? null : String(patch.shelteredTargetRate);
  }
  if (patch.surplusTargetRate !== undefined) {
    set.surplusTargetRate = patch.surplusTargetRate === null ? null : String(patch.surplusTargetRate);
  }

  await db()
    .insert(userDeclarations)
    .values({ userId, ...set })
    .onConflictDoUpdate({ target: userDeclarations.userId, set });

  return getDeclarations(userId);
}
