// Spinwheel connection reads and writes that touch the encrypted credit score.
//
// This file exists so that `last_credit_score` has exactly one encode point and
// one decode point. It was a plaintext integer until migration 0065 (audit
// 1.3.1): the one readable field beside an encrypted Plaid token and encrypted
// merchant names, and the most sensitive scalar in the database.
//
// The score is a NUMBER to every caller and a ciphertext string in the column.
// Putting the conversion behind these two functions is the difference between a
// rule and a habit: a future caller cannot select the column and compare it as
// an integer without going through here, because the column no longer holds
// one.

import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { spinwheelConnections } from '../db/schema.js';
import { decryptNullable, encryptNullable } from '../util/crypto.js';

/**
 * The user's last known credit score, decrypted, or null when unknown.
 *
 * Returns null rather than throwing on a value that will not parse. A score is
 * a nice-to-have for a reaction threshold, and a corrupted one must not take
 * down the Spinwheel route that also returns the user's debts.
 */
export async function getLastCreditScore(userId: string): Promise<number | null> {
  const [row] = await db()
    .select({ score: spinwheelConnections.lastCreditScore })
    .from(spinwheelConnections)
    .where(eq(spinwheelConnections.userId, userId));

  return decodeScore(row?.score ?? null);
}

/** Store the score encrypted. */
export async function setLastCreditScore(userId: string, score: number): Promise<void> {
  await db()
    .update(spinwheelConnections)
    .set({ lastCreditScore: encryptNullable(String(score)) })
    .where(eq(spinwheelConnections.userId, userId));
}

/**
 * Decode a stored score.
 *
 * Exported for the test that pins the pre-0065 case: rows written when the
 * column was an integer decrypt as their own decimal digits, because
 * `decryptString` returns a non-envelope value as it found it under
 * ALLOW_LEGACY_PLAINTEXT_READS. Those rows re-encrypt on the next write.
 */
export function decodeScore(stored: string | null): number | null {
  if (stored === null) return null;
  let plaintext: string | null;
  try {
    plaintext = decryptNullable(stored);
  } catch {
    return null;
  }
  if (plaintext === null) return null;
  const parsed = Number.parseInt(plaintext, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
