import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.js';
import { config } from '../config.js';

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

let _db: DB | null = null;

// Lazy init so test setup can swap in PGlite before any store call.
export async function initDb(): Promise<DB> {
  if (_db) return _db;

  // Tests always use PGlite. Dev falls back to PGlite when DATABASE_URL is empty
  // so `pnpm dev` works without spinning up a Postgres locally.
  const usePglite = config.NODE_ENV === 'test'
    || (config.NODE_ENV === 'development' && !config.DATABASE_URL);

  if (usePglite) {
    const [{ drizzle }, { PGlite }] = await Promise.all([
      import('drizzle-orm/pglite'),
      import('@electric-sql/pglite'),
    ]);
    const client = new PGlite();
    _db = drizzle(client, { schema }) as unknown as DB;
  } else {
    const [{ drizzle }, postgresModule] = await Promise.all([
      import('drizzle-orm/postgres-js'),
      import('postgres'),
    ]);
    const postgres = postgresModule.default;
    const client = postgres(config.DATABASE_URL, { max: 5, idle_timeout: 20 });
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
