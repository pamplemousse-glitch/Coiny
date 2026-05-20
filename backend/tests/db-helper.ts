// Helper for tests that need a clean DB between cases.
// Strategy: PGlite + migrations boot once per file (first call), then each
// subsequent call TRUNCATEs the tables and re-seeds the singleton. ~5x faster
// than tearing down PGlite per test.
import { sql } from 'drizzle-orm';

let initialized = false;

export async function resetDatabase(): Promise<void> {
  const { initDb, db } = await import('../src/db/client.js');
  const { runMigrations, seedPetStateIfMissing } = await import('../src/db/migrate.js');

  if (!initialized) {
    await initDb();
    await runMigrations();
    initialized = true;
  }

  await db().execute(sql`TRUNCATE pet_state, reaction_history, processed_events RESTART IDENTITY`);
  await seedPetStateIfMissing();
}
