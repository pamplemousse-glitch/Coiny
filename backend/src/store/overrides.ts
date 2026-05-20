import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { categoryOverrides } from '../db/schema.js';

// In-memory cache so the webhook hot path doesn't hit the DB once per tx.
// Repopulated on demand; invalidated on every write.
let cache: Map<string, string> | null = null;

function key(merchant: string): string {
  return merchant.trim().toLowerCase();
}

async function loadCache(): Promise<Map<string, string>> {
  const rows = await db().select().from(categoryOverrides);
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.merchantName, r.category);
  cache = map;
  return map;
}

export async function getOverride(merchant: string | undefined): Promise<string | null> {
  if (!merchant) return null;
  const map = cache ?? (await loadCache());
  return map.get(key(merchant)) ?? null;
}

export async function setOverride(merchant: string, category: string): Promise<void> {
  const k = key(merchant);
  await db().insert(categoryOverrides).values({ merchantName: k, category }).onConflictDoUpdate({
    target: categoryOverrides.merchantName,
    set: { category },
  });
  cache = null;
}

export async function deleteOverride(merchant: string): Promise<void> {
  await db()
    .delete(categoryOverrides)
    .where(eq(categoryOverrides.merchantName, key(merchant)));
  cache = null;
}

export async function listOverrides(): Promise<{ merchantName: string; category: string }[]> {
  const rows = await db().select().from(categoryOverrides);
  return rows.map((r) => ({ merchantName: r.merchantName, category: r.category }));
}

// Test-only.
export function _resetOverrideCache(): void {
  cache = null;
}
