import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { notificationLog } from '../db/schema.js';

// Rolling window and cap for user-facing push. Deliberately small: finance apps
// enjoy unusually high push opt-in, and that permission is not recoverable once
// a user revokes it. Two a week is a promise we make during onboarding.
export const PUSH_WINDOW_DAYS = 7;
export const PUSH_MAX_PER_WINDOW = 2;

// Minimum gap before the same event type may push again, so a run of similar
// events (three paychecks, five bills) cannot consume the whole weekly budget.
export const PUSH_SAME_TYPE_COOLDOWN_HOURS = 24;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// Returns true when a push for this event type is within budget.
// Callers must invoke recordNotification() only when a push is actually sent.
export async function canSendPush(userId: string, eventType: string): Promise<boolean> {
  const [{ count } = { count: 0 }] = await db()
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(notificationLog)
    .where(and(eq(notificationLog.userId, userId), gte(notificationLog.sentAt, hoursAgo(PUSH_WINDOW_DAYS * 24))));

  if (count >= PUSH_MAX_PER_WINDOW) return false;

  const [{ recent } = { recent: 0 }] = await db()
    .select({ recent: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.eventType, eventType),
        gte(notificationLog.sentAt, hoursAgo(PUSH_SAME_TYPE_COOLDOWN_HOURS)),
      ),
    );

  return recent === 0;
}

export async function recordNotification(userId: string, eventType: string): Promise<void> {
  await db().insert(notificationLog).values({ userId, eventType });
}
