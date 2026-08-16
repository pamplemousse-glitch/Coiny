import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, asc, eq, gt, inArray, ne } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';

// Rolling 30-day expiry; hard 90-day absolute cap regardless of activity.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MAX_MS = 90 * 24 * 60 * 60 * 1000;

// Sessions per user used to be unbounded (Part 1 row 1.4.5), which meant a
// user's live-session count grew with every reinstall and every simulator run
// and never came down on its own. Ten is far above what a real person holds
// (one phone, occasionally a second device mid-upgrade) and far below the
// number a scripted sign-in loop would accumulate. The oldest are dropped
// first, so the device someone is actually holding is never the one evicted.
export const MAX_SESSIONS_PER_USER = 10;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export async function createSession(userId: string): Promise<{ rawToken: string; sessionId: string }> {
  const rawToken = randomBytes(32).toString('hex');
  const sessionId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db()
    .insert(sessions)
    .values({
      id: sessionId,
      userId,
      tokenHash: hashToken(rawToken),
      createdAt: now,
      lastUsedAt: now,
      expiresAt,
    });

  await pruneOldestSessions(userId);

  return { rawToken, sessionId };
}

/** Keeps the newest MAX_SESSIONS_PER_USER rows and deletes the rest.
 *
 *  Ordered by `lastUsedAt` rather than `createdAt` so that an old session still
 *  in daily use outranks a newer one that was signed into once and abandoned. */
async function pruneOldestSessions(userId: string): Promise<void> {
  const rows = await db()
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(asc(sessions.lastUsedAt));

  const excess = rows.slice(0, Math.max(0, rows.length - MAX_SESSIONS_PER_USER));
  if (excess.length === 0) return;

  await db()
    .delete(sessions)
    .where(
      inArray(
        sessions.id,
        excess.map((r) => r.id),
      ),
    );
}

export async function validateSession(rawToken: string): Promise<string | null> {
  const hash = hashToken(rawToken);
  const now = new Date();

  const rows = await db()
    .select({ userId: sessions.userId, id: sessions.id, createdAt: sessions.createdAt })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hash), gt(sessions.expiresAt, now)));

  const row = rows[0];
  if (!row) return null;

  // Hard absolute cap — a stolen token that keeps being used never lives past 90 days.
  if (now.getTime() - row.createdAt.getTime() > SESSION_ABSOLUTE_MAX_MS) {
    await db().delete(sessions).where(eq(sessions.id, row.id));
    return null;
  }

  // Slide the expiry window on each valid use. The token itself is NOT
  // re-minted here, and that is a decision rather than an omission.
  //
  // Part 1 row 1.4.3 asks whether session tokens rotate on use and answers its
  // own question: "FAILS by design, correctly ... Accepted, no change". RFC
  // 9700's rotation guidance is about OAuth refresh tokens held by public
  // clients that the authorisation server cannot reach. Coiny's session is an
  // opaque server-side row: it is revocable individually (deleteSession), in
  // bulk (deleteOtherSessions, added for row 1.4.5), and automatically on two
  // clocks above. Rotation would buy detection of a theft that revocation
  // already remediates, and would cost a real failure mode: a phone that fires
  // several requests concurrently would rotate under its own in-flight
  // requests and sign the user out, unless the old token were kept alive on a
  // grace window, which is a second column, a header contract and a Keychain
  // write on the client.
  //
  // Revisit if a session is ever presented by anything other than a
  // first-party app holding it in the Keychain.
  await db()
    .update(sessions)
    .set({ lastUsedAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) })
    .where(eq(sessions.id, row.id));

  return row.userId;
}

export async function deleteSession(rawToken: string): Promise<void> {
  await db()
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashToken(rawToken)));
}

/** Ends every session for a user except the one making the request.
 *
 *  This is the whole answer to the stolen-phone case (Part 1 row 1.4.5). The
 *  user signs in on a replacement device, which mints a new session, and then
 *  ends every other one from there. Before this existed the only session a
 *  person could end was the one on the device they no longer had.
 *
 *  The current session is deliberately spared: the caller has just proved they
 *  hold it, and signing them out of the device they are standing in front of
 *  makes the control feel like it failed. Returns how many were ended so the
 *  client can say something true.
 *
 *  It is symmetric, in that a thief holding a live token can use it to end the
 *  owner's other sessions. That is the same trade every "sign out everywhere
 *  else" control makes, and the owner's remedy is to run it back, which the
 *  thief cannot do once the owner's run has removed their row. */
export async function deleteOtherSessions(userId: string, currentRawToken: string): Promise<number> {
  const deleted = await db()
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, hashToken(currentRawToken))))
    .returning({ id: sessions.id });

  return deleted.length;
}
