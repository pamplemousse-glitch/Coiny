import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase } from './db-helper.js';

// Audit 2.2.1 found `users.email` and `users.display_name` written at every
// sign-in and read by nothing in src/. They were dropped in migration 0054.
//
// These tests are the guard against them coming back. The check is deliberately
// against the live schema and the live row rather than against the TypeScript
// types: a column can be reintroduced by a migration alone, and a type-level
// assertion would still pass while the database once again held an email
// address nobody reads.
describe('the users table', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function userColumns(): Promise<string[]> {
    const { db } = await import('../src/db/client.js');
    const result = (await db().execute(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
    )) as unknown as { rows: { column_name: string }[] };
    return result.rows.map((r) => r.column_name);
  }

  it('has no email column', async () => {
    expect(await userColumns()).not.toContain('email');
  });

  it('has no display_name column', async () => {
    expect(await userColumns()).not.toContain('display_name');
  });

  it('still has the subject identifiers it authenticates on', async () => {
    const columns = await userColumns();
    expect(columns).toContain('apple_sub');
    expect(columns).toContain('google_sub');
  });
});

describe('findOrCreateUser', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('stores the subject identifier and nothing that identifies the person', async () => {
    const { findOrCreateUser, getUserById } = await import('../src/store/users.js');

    const userId = await findOrCreateUser({ appleSub: 'sub_minimal' });
    const user = await getUserById(userId);

    expect(user?.appleSub).toBe('sub_minimal');
    // Whatever the row grows later, it must not become a place a name or an
    // address can be read back out of.
    expect(JSON.stringify(user)).not.toContain('@');
  });

  it('returns the same user for a repeat sign-in rather than a second row', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');

    const first = await findOrCreateUser({ appleSub: 'sub_repeat' });
    const second = await findOrCreateUser({ appleSub: 'sub_repeat' });

    expect(second).toBe(first);
  });
});
