import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testToken, testUserId } from './db-helper.js';

// Session lifecycle: the cap and the revoke-all path added for Part 1 row
// 1.4.5. The sliding-expiry and absolute-cap behaviour above them is covered by
// the routes that exercise it.

async function countSessions(userId: string): Promise<number> {
  const { db } = await import('../src/db/client.js');
  const { sessions } = await import('../src/db/schema.js');
  const { eq } = await import('drizzle-orm');
  const rows = await db().select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
  return rows.length;
}

/** Stamps a session's lastUsedAt so eviction order is a fact rather than a
 *  race between two inserts in the same millisecond. */
async function stampLastUsed(sessionId: string, at: Date): Promise<void> {
  const { db } = await import('../src/db/client.js');
  const { sessions } = await import('../src/db/schema.js');
  const { eq } = await import('drizzle-orm');
  await db().update(sessions).set({ lastUsedAt: at }).where(eq(sessions.id, sessionId));
}

describe('session cap', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('keeps at most MAX_SESSIONS_PER_USER live sessions', async () => {
    const { createSession, MAX_SESSIONS_PER_USER } = await import('../src/store/sessions.js');

    // resetDatabase already minted one.
    for (let i = 0; i < MAX_SESSIONS_PER_USER + 4; i++) {
      await createSession(testUserId);
    }

    expect(await countSessions(testUserId)).toBe(MAX_SESSIONS_PER_USER);
  });

  it('evicts the least recently used session, not the most recent one', async () => {
    const { createSession, MAX_SESSIONS_PER_USER, validateSession } = await import('../src/store/sessions.js');

    const created: Array<{ rawToken: string; sessionId: string }> = [];
    for (let i = 0; i < MAX_SESSIONS_PER_USER - 1; i++) {
      created.push(await createSession(testUserId));
    }

    const stale = created[0]!;
    const active = created[1]!;
    await stampLastUsed(stale.sessionId, new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
    await stampLastUsed(active.sessionId, new Date(Date.now() + 60 * 1000));

    // One over the cap, counting the session resetDatabase minted.
    await createSession(testUserId);

    expect(await countSessions(testUserId)).toBe(MAX_SESSIONS_PER_USER);
    expect(await validateSession(stale.rawToken)).toBeNull();
    expect(await validateSession(active.rawToken)).toBe(testUserId);
  });

  it('leaves a second user with their session when pruning', async () => {
    const { createSession, MAX_SESSIONS_PER_USER } = await import('../src/store/sessions.js');
    const { findOrCreateUser } = await import('../src/store/users.js');

    const otherUserId = await findOrCreateUser({ appleSub: 'other_user_cap' });
    await createSession(otherUserId);

    for (let i = 0; i < MAX_SESSIONS_PER_USER + 4; i++) {
      await createSession(testUserId);
    }

    expect(await countSessions(otherUserId)).toBe(1);
  });
});

describe('deleteOtherSessions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('ends every session but the one presenting the request', async () => {
    const { createSession, deleteOtherSessions, validateSession } = await import('../src/store/sessions.js');

    const a = await createSession(testUserId);
    const b = await createSession(testUserId);

    // testToken plus a plus b.
    const revoked = await deleteOtherSessions(testUserId, b.rawToken);
    expect(revoked).toBe(2);

    expect(await validateSession(b.rawToken)).toBe(testUserId);
    expect(await validateSession(a.rawToken)).toBeNull();
    expect(await validateSession(testToken)).toBeNull();
  });

  it('leaves other users signed in', async () => {
    const { createSession, deleteOtherSessions, validateSession } = await import('../src/store/sessions.js');
    const { findOrCreateUser } = await import('../src/store/users.js');

    const otherUserId = await findOrCreateUser({ appleSub: 'other_user_revoke' });
    const other = await createSession(otherUserId);

    await deleteOtherSessions(testUserId, testToken);

    expect(await validateSession(other.rawToken)).toBe(otherUserId);
  });

  it('reports zero when the caller is the only session', async () => {
    const { deleteOtherSessions } = await import('../src/store/sessions.js');
    expect(await deleteOtherSessions(testUserId, testToken)).toBe(0);
  });
});
