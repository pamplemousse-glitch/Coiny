// The queue of Plaid Items whose /item/remove call failed, drained by the
// scheduler until Plaid accepts the removal.
//
// Why this exists, in one paragraph: unlinking a bank must not be blocked by
// Plaid being unreachable, which is the right call for the user and was
// implemented by swallowing the /item/remove failure and deleting the item row
// anyway. That row holds the only copy of the access token. Plaid bills a
// subscription Item monthly "even if no API calls are made for the Item",
// ending it requires /item/remove, and their own docs say to "be sure to
// persist your access tokens and do not lose track of them". So the swallow
// turned an outage into an Item billed forever that we could not cancel, and
// on the Trial plan into one of ten connections burned permanently. The user's
// unlink still returns immediately; it is the ROW that has to outlive the
// failure, not the user's wait.
//
// Never logs or returns an error_message, only Plaid's programmatic
// error_code (.claude/rules/security.md #2).

import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { plaidRemovalQueue } from '../db/schema.js';
import { decryptString, encryptString } from '../util/crypto.js';

export type PendingRemoval = {
  itemId: string;
  accessToken: string;
  attempts: number;
  lastAttemptAt: Date | null;
  lastErrorCode: string | null;
};

const MINUTE_MS = 60 * 1000;

/**
 * Backoff before the next attempt, doubling from one scheduler tick to a day.
 *
 * Capped rather than abandoned: giving up would re-open the exact leak this
 * table closes, and a row costs one item id and one ciphertext. A queue that
 * is not draining is an operational signal, not a reason to drop the evidence.
 */
export function removalBackoffMs(attempts: number): number {
  const DAY_MS = 24 * 60 * MINUTE_MS;
  return Math.min(15 * MINUTE_MS * 2 ** Math.max(0, attempts - 1), DAY_MS);
}

/**
 * Record an Item whose removal did not complete.
 *
 * Upserts, because the same item can fail removal more than once: a user who
 * unlinks, relinks and unlinks again during an outage gets one row, carrying
 * the newest token, not two rows racing each other.
 */
export async function enqueueItemRemoval(args: {
  itemId: string;
  accessToken: string;
  errorCode?: string | null;
}): Promise<void> {
  const stored = encryptString(args.accessToken);
  await db()
    .insert(plaidRemovalQueue)
    .values({
      itemId: args.itemId,
      accessToken: stored,
      attempts: 1,
      lastAttemptAt: new Date(),
      lastErrorCode: args.errorCode ?? null,
    })
    .onConflictDoUpdate({
      target: plaidRemovalQueue.itemId,
      set: {
        // The freshest token is the one most likely to work: a relink issues a
        // new one for the same item_id and invalidates its predecessor.
        accessToken: stored,
        attempts: sql`${plaidRemovalQueue.attempts} + 1`,
        lastAttemptAt: new Date(),
        lastErrorCode: args.errorCode ?? null,
      },
    });
}

/** Rows whose backoff has elapsed. The table is empty in the normal case and
 *  holds single digits in the bad one, so this reads it whole rather than
 *  pushing the backoff arithmetic into SQL where it cannot be unit tested. */
export async function listDueRemovals(now: Date = new Date()): Promise<PendingRemoval[]> {
  const rows = await db().select().from(plaidRemovalQueue);
  return rows
    .filter((row) => {
      if (row.lastAttemptAt === null) return true;
      return now.getTime() - row.lastAttemptAt.getTime() >= removalBackoffMs(row.attempts);
    })
    .map((row) => ({
      itemId: row.itemId,
      accessToken: decryptString(row.accessToken),
      attempts: row.attempts,
      lastAttemptAt: row.lastAttemptAt,
      lastErrorCode: row.lastErrorCode,
    }));
}

export async function recordRemovalAttempt(itemId: string, errorCode: string | null): Promise<void> {
  await db()
    .update(plaidRemovalQueue)
    .set({
      attempts: sql`${plaidRemovalQueue.attempts} + 1`,
      lastAttemptAt: new Date(),
      lastErrorCode: errorCode,
    })
    .where(eq(plaidRemovalQueue.itemId, itemId));
}

/** Called once Plaid has confirmed the Item is gone, or told us it never was.
 *  This is the only path that destroys the token, and by then it addresses
 *  nothing. */
export async function dequeueItemRemoval(itemId: string): Promise<void> {
  await db().delete(plaidRemovalQueue).where(eq(plaidRemovalQueue.itemId, itemId));
}

/** Depth of the queue, for the scheduler log line and /health. Counts only. */
export async function countPendingRemovals(): Promise<number> {
  const rows = await db().select({ itemId: plaidRemovalQueue.itemId }).from(plaidRemovalQueue);
  return rows.length;
}
