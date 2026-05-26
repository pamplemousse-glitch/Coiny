import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';

// Rolling 30-day expiry; hard 90-day absolute cap regardless of activity.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MAX_MS = 90 * 24 * 60 * 60 * 1000;

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

  return { rawToken, sessionId };
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

  // Slide the expiry window on each valid use.
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
