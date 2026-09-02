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

  // Truncate in FK-safe order. CASCADE does the real work here: it truncates
  // every table holding a foreign key into the named ones, so the ~50 tables
  // that reference users.id are emptied without being listed. That is why this
  // list is short and why it does NOT need a line adding each time a table is
  // added to schema.ts. Verified empirically, not assumed: an inserted
  // analytics_events row does not survive the next resetDatabase(), and
  // RESTART IDENTITY resets the cascaded tables' sequences too (its bigserial
  // id starts again at 1 every reset).
  //
  // A table only escapes this if it has no FK path to users, in which case add
  // it by name below.
  await db().execute(
    // plaid_removal_queue is named explicitly because it is the case the
    // paragraph above describes: it holds no user_id and no foreign key, on
    // purpose (it has to survive the account-deletion cascade), so nothing
    // truncates it by association and a leftover row would leak into the next
    // test's drain.
    //
    // ops_events is the second instance, and it is here for a related reason
    // rather than the same one. It has no user column BY DESIGN (store/ops.ts:
    // a vendor outage is not a fact about a person, which is what lets the
    // table skip the analytics consent gate), so it has no FK path to users
    // and the cascade cannot reach it. The design property and the truncation
    // requirement are the same property seen from two sides.
    //
    // deleted_user_ids is the third, and the same shape again: it carries no
    // foreign key BECAUSE the row it names is already gone (store/
    // deleted-users.ts), so nothing cascades into it and a tombstone left by
    // one test would make the next test's user look deleted.
    sql`TRUNCATE sessions, reaction_history, processed_events, plaid_items, plaid_removal_queue, ops_events, deleted_user_ids, category_overrides, device_tokens, transactions, pet_state, app_store_notifications, users RESTART IDENTITY CASCADE`,
  );
  _resetOverrideCache();

  // Create a fresh test user and session for each test.
  //
  // THE TRAP, if you are here writing an analytics test: findOrCreateUser emits
  // a 'signup_completed' server event (src/store/users.ts), so every test starts
  // with exactly one analytics_events row for testUserId, id = 1. It is created
  // by this line, not left over from the previous test. Expect 1 and not 0, or
  // scope the assertion to your own event name the way the existing tests in
  // analytics-store.test.ts do. Do not "fix" it by truncating after this call:
  // the retention test in analytics-store.test.ts backdates that exact row and
  // depends on it existing.
  testUserId = await findOrCreateUser({ appleSub: 'test_apple_sub_fixed' });
  const { rawToken } = await createSession(testUserId);
  testToken = rawToken;
}

export function authHeader(): Record<string, string> {
  return { authorization: `Bearer ${testToken}` };
}

/** A second, unrelated signed-in user.
 *
 *  The attacker in every BOLA case: a real account with a real session, whose
 *  only disqualification from seeing another user's data is that the data is
 *  not theirs. Testing with an anonymous request instead proves only that
 *  authentication is on, which is a different and much weaker property.
 *
 *  Call after `resetDatabase()`, which truncates users. */
export async function createOtherUser(): Promise<{
  userId: string;
  token: string;
  authHeader: Record<string, string>;
}> {
  const { findOrCreateUser } = await import('../src/store/users.js');
  const { createSession } = await import('../src/store/sessions.js');

  const userId = await findOrCreateUser({ appleSub: 'test_apple_sub_other' });
  const { rawToken } = await createSession(userId);
  return { userId, token: rawToken, authHeader: { authorization: `Bearer ${rawToken}` } };
}
