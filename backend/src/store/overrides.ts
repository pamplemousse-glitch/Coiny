import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { categoryOverrides } from '../db/schema.js';
import { blindIndex, decryptString, encryptString } from '../util/crypto.js';

// Merchant names here are the same PII as transactions.merchant_name and are
// covered by the same 0048 encryption decision (see db/schema.ts). The PK
// column stores a deterministic HMAC blind index so the per-transaction
// getOverride lookup and the upsert dedupe stay in SQL; the displayable name
// lives AES-256-GCM encrypted in merchant_name_enc.
//
// Legacy rows (written before 0048) hold the plaintext normalized merchant in
// merchant_name and null in merchant_name_enc. Reads match both forms and
// setOverride migrates a legacy row on rewrite, so nothing breaks before the
// one-shot backfill (scripts/backfill-encrypt-pii.ts) has run. In dev/test
// without DATA_ENCRYPTION_KEY, blindIndex and encryptString pass through and
// behaviour is identical to the pre-0048 code.

function key(merchant: string): string {
  return merchant.trim().toLowerCase();
}

/** Both storable forms of the lookup key: blind index first, legacy plaintext
 *  second. Deduplicated because they coincide when no key is configured. */
function lookupKeys(k: string): string[] {
  const idx = blindIndex(k);
  return idx === k ? [k] : [idx, k];
}

export async function getOverride(userId: string, merchant: string | undefined): Promise<string | null> {
  if (!merchant) return null;
  const k = key(merchant);
  const rows = await db()
    .select({ category: categoryOverrides.category })
    .from(categoryOverrides)
    .where(and(eq(categoryOverrides.userId, userId), inArray(categoryOverrides.merchantName, lookupKeys(k))));
  return rows[0]?.category ?? null;
}

export async function setOverride(userId: string, merchant: string, category: string): Promise<void> {
  const k = key(merchant);
  const idx = blindIndex(k);
  // A legacy plaintext row would not conflict with the blind-index PK and the
  // merchant would end up with two override rows; migrate it out first.
  if (idx !== k) {
    await db()
      .delete(categoryOverrides)
      .where(and(eq(categoryOverrides.userId, userId), eq(categoryOverrides.merchantName, k)));
  }
  await db()
    .insert(categoryOverrides)
    .values({ userId, merchantName: idx, merchantNameEnc: encryptString(k), category })
    .onConflictDoUpdate({
      target: [categoryOverrides.userId, categoryOverrides.merchantName],
      set: { category },
    });
}

export async function deleteOverride(userId: string, merchant: string): Promise<void> {
  await db()
    .delete(categoryOverrides)
    .where(
      and(eq(categoryOverrides.userId, userId), inArray(categoryOverrides.merchantName, lookupKeys(key(merchant)))),
    );
}

export async function listOverrides(userId: string): Promise<{ merchantName: string; category: string }[]> {
  const rows = await db()
    .select({
      merchantName: categoryOverrides.merchantName,
      merchantNameEnc: categoryOverrides.merchantNameEnc,
      category: categoryOverrides.category,
    })
    .from(categoryOverrides)
    .where(eq(categoryOverrides.userId, userId));
  return rows.map((row) => ({
    // Legacy rows have no encrypted copy; their PK column is the plaintext.
    merchantName: row.merchantNameEnc !== null ? decryptString(row.merchantNameEnc) : row.merchantName,
    category: row.category,
  }));
}

// Test-only: no-op kept for signature compatibility.
export function _resetOverrideCache(): void {}
