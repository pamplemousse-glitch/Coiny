import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { categoryOverrides } from '../db/schema.js';
import { blindIndex, blindIndexLegacy, decryptString, encryptString } from '../util/crypto.js';

// Merchant names here are the same PII as transactions.merchant_name and are
// covered by the same 0048 encryption decision (see db/schema.ts). The PK
// column stores a deterministic HMAC blind index so the per-transaction
// getOverride lookup and the upsert dedupe stay in SQL; the displayable name
// lives AES-256-GCM encrypted in merchant_name_enc.
//
// Legacy rows (written before 0048) hold the plaintext normalized merchant in
// merchant_name and null in merchant_name_enc; rows written between 0048 and
// the index-key separation hold an index keyed on the AES key itself. Reads
// match all three forms and setOverride migrates an older row on rewrite, so
// nothing breaks before the one-shot backfill (scripts/backfill-encrypt-pii.ts)
// or the rotation sweep (scripts/rotate-encryption-key.ts) has run. With
// ALLOW_PLAINTEXT_FIELDS and no key, blindIndex and encryptString pass through
// and behaviour is identical to the pre-0048 code.

function key(merchant: string): string {
  return merchant.trim().toLowerCase();
}

/** Every storable form of the lookup key: the current blind index, the index
 *  as it was computed before the index key was separated from the AES key, and
 *  the pre-0048 plaintext. Deduplicated because all three coincide when no key
 *  is configured. */
function lookupKeys(k: string): string[] {
  return [...new Set([blindIndex(k), blindIndexLegacy(k), k])];
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
  // A row stored under an older key form would not conflict with the current
  // blind-index PK and the merchant would end up with two override rows;
  // migrate them out first.
  const superseded = lookupKeys(k).filter((form) => form !== idx);
  if (superseded.length > 0) {
    await db()
      .delete(categoryOverrides)
      .where(and(eq(categoryOverrides.userId, userId), inArray(categoryOverrides.merchantName, superseded)));
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
