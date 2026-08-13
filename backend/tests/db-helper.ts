import { sql } from 'drizzle-orm';

let initialized = false;
export let testUserId = '';
export let testToken = '';

export async function resetDatabase(): Promise<void> {
  const { initDb, db } = await import('../src/db/client.js');
  const { runMigrations } = await import('../src/db/migrate.js');
  const { _resetOverrideCache } = await import('../src/store/overrides.js');
  const { findOrCreateUser } = await import('../src/store/users.js');
  const { createSession } = await import('../src/store/sessions.js');

  if (!initialized) {
    await initDb();
    await runMigrations();
    initialized = true;
  }

  // Truncate in FK-safe order (CASCADE handles children automatically).
  await db().execute(
    sql`TRUNCATE sessions, reaction_history, processed_events, plaid_items, category_overrides, device_tokens, transactions, pet_state, app_store_notifications, users RESTART IDENTITY CASCADE`,
  );
  _resetOverrideCache();

  // Create a fresh test user and session for each test.
  testUserId = await findOrCreateUser({ appleSub: 'test_apple_sub_fixed', email: 'test@coiny.test' });
  const { rawToken } = await createSession(testUserId);
  testToken = rawToken;
}

export function authHeader(): Record<string, string> {
  return { authorization: `Bearer ${testToken}` };
}
