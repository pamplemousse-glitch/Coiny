import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { config } from '../config.js';
import * as schema from './schema.js';

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

let _db: DB | null = null;

/** Which database role to connect as.
 *
 *  'runtime'  the server and the maintenance scripts. DML only: no role in a
 *             split setup may create, alter or drop a table.
 *  'migrator' the release command, and nothing else. Owns the schema.
 *
 *  In a single-role setup (MIGRATION_DATABASE_URL empty) both resolve to
 *  DATABASE_URL, which is what local, test and any environment that has not
 *  been split still do. */
export type DbRole = 'runtime' | 'migrator';

/** The connection string for a role, with the single-role fallback.
 *
 *  Exported for the test that asserts the fallback, because getting this
 *  backwards fails in the one place nothing exercises: a production release
 *  command. A migrator that silently fell back to the runtime role would
 *  restore exactly the blast radius the split removes, and it would do it
 *  quietly, since the runtime role can still read every table the migration
 *  wants to look at before it fails on the first DDL statement. */
export function connectionStringFor(role: DbRole): string {
  if (role === 'migrator' && config.MIGRATION_DATABASE_URL) return config.MIGRATION_DATABASE_URL;
  return config.DATABASE_URL;
}

// Lazy init so test setup can swap in PGlite before any store call.
export async function initDb(role: DbRole = 'runtime'): Promise<DB> {
  if (_db) return _db;

  // Tests always use PGlite. Dev falls back to PGlite when DATABASE_URL is empty
  // so `pnpm dev` works without spinning up a Postgres locally.
  const usePglite = config.NODE_ENV === 'test' || (config.NODE_ENV === 'development' && !config.DATABASE_URL);

  if (usePglite) {
    const [{ drizzle }, { PGlite }] = await Promise.all([import('drizzle-orm/pglite'), import('@electric-sql/pglite')]);
    const client = new PGlite();
    _db = drizzle(client, { schema }) as unknown as DB;
  } else {
    const [{ drizzle }, postgresModule] = await Promise.all([import('drizzle-orm/postgres-js'), import('postgres')]);
    const postgres = postgresModule.default;
    // The migrator connects for the length of one release command, so a pool of
    // five would be four idle connections against Neon's cap for no gain.
    const max = role === 'migrator' ? 1 : 5;
    const client = postgres(connectionStringFor(role), { max, idle_timeout: 20 });
    _db = drizzle(client, { schema }) as unknown as DB;
  }

  return _db;
}

export function db(): DB {
  if (!_db) throw new Error('Database not initialized — call initDb() first');
  return _db;
}

// Test-only: reset the cached connection so a fresh PGlite is created on next initDb().
export function _resetDb(): void {
  _db = null;
}
