// Re-applies every recorded deletion after a restore (G1.27, audit row 2.9.4).
//
//   source bin/load-secrets.sh && pnpm --filter coiny-backend exec \
//     tsx scripts/purge-resurrected-users.ts --dry-run
//   ... same command without --dry-run ...
//
// Run this as step 4 of docs/restore-runbook.md, before pointing traffic at a
// restored database. A restore brings back every account deleted since the copy
// was taken; the privacy policy says backups are never used to restore a
// deleted account, and this is the thing that makes that sentence true.
//
// Prints counts, never ids: a user id is pseudonymous but it is still the
// identifier of a person who asked to be forgotten, and it does not belong in a
// terminal scrollback or a CI log (.claude/rules/security.md #2).

import { inArray } from 'drizzle-orm';
import { db, initDb } from '../src/db/client.js';
import { users } from '../src/db/schema.js';
import { countTombstones, listDeletedUserIds, purgeResurrectedUsers } from '../src/store/deleted-users.js';

async function countResurrected(): Promise<number> {
  const tombstoned = await listDeletedUserIds();
  if (tombstoned.length === 0) return 0;
  const alive = await db()
    .select({ id: users.id })
    .from(users)
    .where(
      inArray(
        users.id,
        tombstoned.map((row) => row.userId),
      ),
    );
  return alive.length;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  await initDb();

  const tombstones = await countTombstones();
  const resurrected = await countResurrected();

  console.log(`tombstones: ${tombstones}`);
  console.log(`deleted accounts currently present in the database: ${resurrected}`);

  if (dryRun) {
    console.log('--dry-run: nothing deleted');
    return;
  }
  if (resurrected === 0) {
    // The expected outcome of a restore inside the retention window, and worth
    // saying out loud so a clean run does not read as a run that did nothing.
    console.log('nothing to purge; every recorded deletion is still applied');
    return;
  }

  const purged = await purgeResurrectedUsers();
  console.log(`re-deleted: ${purged.length}`);
  if (purged.length !== resurrected) {
    throw new Error(`expected to re-delete ${resurrected} accounts, deleted ${purged.length}`);
  }
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    console.error('purge-resurrected-users failed:', err instanceof Error ? err.name : 'unknown error');
    process.exit(1);
  },
);
