import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { db } from './client.js';

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'drizzle');

export async function runMigrations(): Promise<void> {
  const database = db();
  const usePglite = config.NODE_ENV === 'test' || (config.NODE_ENV === 'development' && !config.DATABASE_URL);

  if (usePglite) {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    await migrate(database as never, { migrationsFolder });
  } else {
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    await migrate(database as never, { migrationsFolder });
  }
}

// Seed the singleton pet_state row if it doesn't exist yet. Idempotent.
export async function seedPetStateIfMissing(): Promise<void> {
  const { petState } = await import('./schema.js');
  await db().insert(petState).values({ id: 1 }).onConflictDoNothing();
}
