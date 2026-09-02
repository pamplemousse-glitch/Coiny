// Deletion tombstones: the record that a user was deleted, kept so that a
// restore cannot silently undo the deletion (G1.27, audit rows 2.9.4, 5.9.6).
//
// The problem in one paragraph: `docs/legal/privacy-policy.md` promises that
// backups are never used to restore a deleted account, and nothing made that
// true. Deletion cascades the user row away and leaves no trace, so any restore
// brings back every account deleted since the copy was taken, and there was no
// list to re-delete them from. Neon's six-hour window bounded the damage; the
// nightly 30-day dump (R-20.1) removes that bound, which is why the tombstone
// and the dump ship in the same change.
//
// The table carries a user id and a date. It has no foreign key, deliberately:
// the row it names is gone, so nothing could reference it, and a cascade would
// destroy exactly the record that has to survive.

import { inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { deletedUserIds, users } from '../db/schema.js';

/** Any drizzle handle: the live db, or a transaction. Deletion writes the
 *  tombstone inside the same transaction as the delete, because a tombstone
 *  written after a commit that then fails is a deletion with no record. */
type Executor = Pick<ReturnType<typeof db>, 'insert' | 'select' | 'delete'>;

/**
 * How long a tombstone is useful for. One tombstone stops being needed the
 * moment no surviving backup is old enough to resurrect that user, which is
 * the dump retention (30 days, R-20.1) plus slack for a dump taken just before
 * the deletion and restored at the very end of its life.
 *
 * The slack is not caution for its own sake: pruning early turns the tombstone
 * into a promise the system stops keeping, silently. Erring the other way only
 * retains a bare uuid.
 */
export const TOMBSTONE_RETENTION_DAYS = 45;

/** Records that `userId` was deleted. Idempotent: re-deleting an id that is
 *  already tombstoned keeps the ORIGINAL date, because the first deletion is
 *  the one a restore has to be measured against. */
export async function recordUserDeletion(userId: string, executor: Executor = db()): Promise<void> {
  await executor.insert(deletedUserIds).values({ userId }).onConflictDoNothing();
}

/** Every tombstoned id, oldest first. Read by the post-restore sweep and by
 *  tests; never exposed over the API. */
export async function listDeletedUserIds(): Promise<{ userId: string; deletedAt: Date }[]> {
  return db()
    .select({ userId: deletedUserIds.userId, deletedAt: deletedUserIds.deletedAt })
    .from(deletedUserIds)
    .orderBy(deletedUserIds.deletedAt);
}

/**
 * Re-applies every recorded deletion. This is the step that makes the privacy
 * notice true after a restore, and `scripts/purge-resurrected-users.ts` is what
 * an operator runs.
 *
 * Deletes through `users`, so every child table cascades exactly as the
 * original deletion did. Returns the ids it re-deleted, which is the number an
 * operator has to see: zero is the expected result of a restore inside the
 * window, and non-zero is the accounts that would otherwise have come back.
 *
 * Deliberately NOT automatic on boot. A sweep that runs unattended against a
 * database whose state nobody has looked at yet is a way to turn a bad restore
 * into deleted rows.
 */
export async function purgeResurrectedUsers(): Promise<string[]> {
  const tombstoned = await db().select({ userId: deletedUserIds.userId }).from(deletedUserIds);
  if (tombstoned.length === 0) return [];

  const ids = tombstoned.map((row) => row.userId);
  const removed = await db().delete(users).where(inArray(users.id, ids)).returning({ id: users.id });
  return removed.map((row) => row.id);
}

/**
 * Drops tombstones older than the retention window. Without this the table
 * becomes a permanent list of everyone who ever left, which is the opposite of
 * what a deletion is for: the id is retained to enforce a deletion, so it has
 * to stop being retained once it can no longer enforce anything.
 *
 * Returns the number pruned.
 */
export async function pruneExpiredTombstones(
  retentionDays: number = TOMBSTONE_RETENTION_DAYS,
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const pruned = await db()
    .delete(deletedUserIds)
    .where(lt(deletedUserIds.deletedAt, cutoff))
    .returning({ userId: deletedUserIds.userId });
  return pruned.length;
}

/** Count only, for the ops surface and the dump manifest. Never the ids. */
export async function countTombstones(): Promise<number> {
  const rows = await db().select({ n: sql<number>`count(*)::int` }).from(deletedUserIds);
  return rows[0]?.n ?? 0;
}
