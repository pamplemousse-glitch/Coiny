import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { categoryOverrides } from '../db/schema.js';

function key(merchant: string): string {
  return merchant.trim().toLowerCase();
}

export async function getOverride(userId: string, merchant: string | undefined): Promise<string | null> {
  if (!merchant) return null;
  const k = key(merchant);
  const rows = await db()
    .select({ category: categoryOverrides.category })
    .from(categoryOverrides)
    .where(and(eq(categoryOverrides.userId, userId), eq(categoryOverrides.merchantName, k)));
  return rows[0]?.category ?? null;
}

export async function setOverride(userId: string, merchant: string, category: string): Promise<void> {
  const k = key(merchant);
  await db()
    .insert(categoryOverrides)
    .values({ userId, merchantName: k, category })
    .onConflictDoUpdate({
      target: [categoryOverrides.userId, categoryOverrides.merchantName],
      set: { category },
    });
}

export async function deleteOverride(userId: string, merchant: string): Promise<void> {
  await db()
    .delete(categoryOverrides)
    .where(and(eq(categoryOverrides.userId, userId), eq(categoryOverrides.merchantName, key(merchant))));
}

export async function listOverrides(userId: string): Promise<{ merchantName: string; category: string }[]> {
  const rows = await db()
    .select({ merchantName: categoryOverrides.merchantName, category: categoryOverrides.category })
    .from(categoryOverrides)
    .where(eq(categoryOverrides.userId, userId));
  return rows;
}

// Test-only: no-op kept for signature compatibility.
export function _resetOverrideCache(): void {}
