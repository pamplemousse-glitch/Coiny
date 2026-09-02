// Set before any import of config.js, which reads process.env once at module
// load. Doing it here rather than with vi.resetModules() per test is
// deliberate: resetting the module registry mid-test swaps the db client out
// from under db-helper, whose `initialized` flag then skips initDb() and the
// next db() call throws.
//
// The "no code configured" case therefore lives in its own file
// (review-demo-seed-disabled.test.ts), because it needs the opposite
// environment and a file is the smallest unit that can have one.
process.env.REVIEW_DEMO_CODE = 'demo-review-code-2026';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, createOtherUser, resetDatabase, testUserId } from './db-helper.js';

// POST /api/review/demo-seed (R-15.7, Apple 2.1, decision B9).
//
// The security properties are the point of these tests, not the fixture
// contents. Defect D1 was an unauthenticated session mint; this route must
// never become a second way to obtain a session or to reach another account.

const CODE = 'demo-review-code-2026';
/** Same length as CODE, so a rejection cannot be attributed to length alone. */
const WRONG = 'demo-review-code-XXXX';

async function seed(code: string, headers: Record<string, string> = authHeader()) {
  const { buildApp } = await import('../src/server.js');
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/review/demo-seed',
    headers,
    payload: { code },
  });
  await app.close();
  return res;
}

async function countFor(userId: string): Promise<number> {
  const { db } = await import('../src/db/client.js');
  const { declaredAssets } = await import('../src/db/schema.js');
  const rows = await db().select().from(declaredAssets).where(eq(declaredAssets.userId, userId));
  return rows.length;
}

describe('POST /api/review/demo-seed', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('seeds the caller with the correct code', async () => {
    const res = await seed(CODE);

    expect(res.statusCode).toBe(200);
  });

  it('rejects a wrong code', async () => {
    const res = await seed(WRONG);

    expect(res.statusCode).toBe(403);
  });

  // A session is required. The route sits in the protected scope precisely so
  // that the code alone is never sufficient.
  it('requires a session even with the correct code', async () => {
    const res = await seed(CODE, {});

    expect(res.statusCode).toBe(401);
  });

  it('writes assets and debts the reviewer can see', async () => {
    await seed(CODE);

    const { db } = await import('../src/db/client.js');
    const { debtAccounts, declaredAssets, manualAssets } = await import('../src/db/schema.js');
    expect((await db().select().from(declaredAssets)).length).toBeGreaterThan(0);
    expect((await db().select().from(manualAssets)).length).toBeGreaterThan(0);
    expect((await db().select().from(debtAccounts)).length).toBeGreaterThan(0);
  });

  // A reviewer is not a consumer. Counting one would move an FTC Safeguards or
  // state-privacy threshold forward by an account that belongs to Apple.
  it('marks the account as demo', async () => {
    await seed(CODE);

    const { db } = await import('../src/db/client.js');
    const { users } = await import('../src/db/schema.js');
    const [row] = await db().select().from(users).where(eq(users.id, testUserId));
    expect(row?.isDemo).toBe(true);
  });

  // A reviewer who taps twice, or is handed the app after a failed attempt,
  // must not end up with doubled balances.
  it('is idempotent across repeated calls', async () => {
    await seed(CODE);
    const afterFirst = await countFor(testUserId);

    await seed(CODE);

    expect(await countFor(testUserId)).toBe(afterFirst);
  });

  it('does not seed when the code is wrong', async () => {
    await seed(WRONG);

    expect(await countFor(testUserId)).toBe(0);
  });

  // The code is a shared secret handed to Apple. It must not come back out.
  it('never echoes the submitted code back to the caller', async () => {
    const res = await seed(WRONG);

    expect(res.body).not.toContain(WRONG);
    expect(res.body).not.toContain(CODE);
  });

  // There is no user parameter on this route, so holding the code cannot reach
  // anyone else's account. This is the BOLA case stated as a test rather than
  // left as a property of the handler's shape.
  it('seeds only the calling user, never another account', async () => {
    const other = await createOtherUser();

    await seed(CODE, other.authHeader);

    expect(await countFor(other.userId)).toBeGreaterThan(0);
    expect(await countFor(testUserId)).toBe(0);
  });
});
