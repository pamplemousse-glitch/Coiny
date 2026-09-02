// Deletion tombstones (G1.27, audit row 2.9.4).
//
// The property under test is one sentence in the privacy policy: backups are
// never used to restore a deleted account. Nothing enforced it before this
// table, so these tests are the enforcement.

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('deletion tombstones', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('records a tombstone when a user is deleted', async () => {
    const { deleteUser } = await import('../src/store/users.js');
    const { listDeletedUserIds } = await import('../src/store/deleted-users.js');

    await deleteUser(testUserId);

    expect((await listDeletedUserIds()).map((row) => row.userId)).toEqual([testUserId]);
  });

  it('leaves no tombstone for a user who was never deleted', async () => {
    const { countTombstones } = await import('../src/store/deleted-users.js');

    expect(await countTombstones()).toBe(0);
  });

  it('keeps the original date when the same id is tombstoned twice', async () => {
    const { db } = await import('../src/db/client.js');
    const { deletedUserIds } = await import('../src/db/schema.js');
    const { recordUserDeletion, listDeletedUserIds } = await import('../src/store/deleted-users.js');

    await recordUserDeletion('user-a');
    const first = (await listDeletedUserIds())[0]?.deletedAt;
    // A replayed deletion must not slide the date forward: the FIRST deletion
    // is the one a restore has to be measured against.
    await db()
      .update(deletedUserIds)
      .set({ deletedAt: new Date(Date.now() - 10 * DAY_MS) })
      .where(eq(deletedUserIds.userId, 'user-a'));
    const backdated = (await listDeletedUserIds())[0]?.deletedAt;
    await recordUserDeletion('user-a');

    expect(first).toBeDefined();
    expect((await listDeletedUserIds())[0]?.deletedAt).toEqual(backdated);
    expect(await (await import('../src/store/deleted-users.js')).countTombstones()).toBe(1);
  });

  it('re-deletes an account that a restore brought back', async () => {
    const { db } = await import('../src/db/client.js');
    const { users } = await import('../src/db/schema.js');
    const { deleteUser } = await import('../src/store/users.js');
    const { purgeResurrectedUsers } = await import('../src/store/deleted-users.js');

    await deleteUser(testUserId);
    // What a restore does, in one statement: the row comes back and the
    // tombstone (which is in the same backup) comes back with it.
    await db().insert(users).values({ id: testUserId, appleSub: 'test_apple_sub_fixed' });
    expect(await db().select({ id: users.id }).from(users)).toHaveLength(1);

    const purged = await purgeResurrectedUsers();

    expect(purged).toEqual([testUserId]);
    expect(await db().select({ id: users.id }).from(users)).toEqual([]);
  });

  it('leaves live accounts alone', async () => {
    const { db } = await import('../src/db/client.js');
    const { users } = await import('../src/db/schema.js');
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { deleteUser } = await import('../src/store/users.js');
    const { purgeResurrectedUsers } = await import('../src/store/deleted-users.js');

    const survivor = await findOrCreateUser({ appleSub: 'survivor_sub' });
    await deleteUser(testUserId);
    await db().insert(users).values({ id: testUserId, appleSub: 'test_apple_sub_fixed' });

    const purged = await purgeResurrectedUsers();

    expect(purged).toEqual([testUserId]);
    expect((await db().select({ id: users.id }).from(users)).map((r) => r.id)).toEqual([survivor]);
  });

  it('is a no-op when nothing was ever deleted', async () => {
    const { purgeResurrectedUsers } = await import('../src/store/deleted-users.js');

    expect(await purgeResurrectedUsers()).toEqual([]);
  });

  it('is a no-op when every recorded deletion is still applied', async () => {
    const { deleteUser } = await import('../src/store/users.js');
    const { purgeResurrectedUsers } = await import('../src/store/deleted-users.js');

    await deleteUser(testUserId);

    // The expected outcome of a restore inside the window: a tombstone with no
    // matching row.
    expect(await purgeResurrectedUsers()).toEqual([]);
  });

  it('cascades the same way the original deletion did', async () => {
    const { db } = await import('../src/db/client.js');
    const { users, petState } = await import('../src/db/schema.js');
    const { deleteUser } = await import('../src/store/users.js');
    const { purgeResurrectedUsers } = await import('../src/store/deleted-users.js');

    await deleteUser(testUserId);
    await db().insert(users).values({ id: testUserId, appleSub: 'test_apple_sub_fixed' });
    await db().insert(petState).values({ userId: testUserId });

    await purgeResurrectedUsers();

    // A re-deletion that left child rows behind would be a worse outcome than
    // the resurrection: orphaned financial data with no account to delete.
    expect(await db().select({ userId: petState.userId }).from(petState)).toEqual([]);
  });

  it('prunes tombstones past the retention window and keeps the rest', async () => {
    const { db } = await import('../src/db/client.js');
    const { deletedUserIds } = await import('../src/db/schema.js');
    const { pruneExpiredTombstones, TOMBSTONE_RETENTION_DAYS, listDeletedUserIds } = await import(
      '../src/store/deleted-users.js'
    );
    const now = new Date('2026-09-02T00:00:00.000Z');

    await db()
      .insert(deletedUserIds)
      .values([
        { userId: 'old', deletedAt: new Date(now.getTime() - (TOMBSTONE_RETENTION_DAYS + 1) * DAY_MS) },
        { userId: 'recent', deletedAt: new Date(now.getTime() - 1 * DAY_MS) },
      ]);

    const pruned = await pruneExpiredTombstones(TOMBSTONE_RETENTION_DAYS, now);

    expect(pruned).toBe(1);
    expect((await listDeletedUserIds()).map((r) => r.userId)).toEqual(['recent']);
  });

  it('outlives the backup retention window it exists to cover', async () => {
    const { TOMBSTONE_RETENTION_DAYS } = await import('../src/store/deleted-users.js');

    // R-20.1 keeps dumps for 30 days. A tombstone that expired first would let
    // a still-restorable backup resurrect an account with nothing left to
    // re-delete it, which is the whole failure this table prevents.
    expect(TOMBSTONE_RETENTION_DAYS).toBeGreaterThan(30);
  });

  it('is pruned by the nightly retention pass', async () => {
    const { db } = await import('../src/db/client.js');
    const { deletedUserIds } = await import('../src/db/schema.js');
    const { runRetentionPurge, resetPurgeSchedule } = await import('../src/scheduler/purge.js');
    const { TOMBSTONE_RETENTION_DAYS } = await import('../src/store/deleted-users.js');
    resetPurgeSchedule();
    const now = new Date('2026-09-02T00:00:00.000Z');

    await db()
      .insert(deletedUserIds)
      .values({ userId: 'ancient', deletedAt: new Date(now.getTime() - (TOMBSTONE_RETENTION_DAYS + 5) * DAY_MS) });

    const summary = await runRetentionPurge(now);

    expect(summary.tombstones).toBe(1);
  });
});
