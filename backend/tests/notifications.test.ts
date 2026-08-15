import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

function hoursAgoDate(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function insertSentAt(userId: string, eventType: string, sentAt: Date): Promise<void> {
  const { db } = await import('../src/db/client.js');
  const { notificationLog } = await import('../src/db/schema.js');
  await db().insert(notificationLog).values({ userId, eventType, sentAt });
}

describe('push budget constants', () => {
  // Register row DR-1 (docs/prd.md Appendix): 2 per rolling 7 days is the
  // onboarding promise. Loosening the cap must fail here, not pass silently.
  it('pins PUSH_MAX_PER_WINDOW to 2 per register row DR-1', async () => {
    const { PUSH_MAX_PER_WINDOW } = await import('../src/store/notifications.js');
    expect(PUSH_MAX_PER_WINDOW).toBe(2);
  });

  it('pins the weekly window to 7 rolling days per register row DR-1', async () => {
    const { PUSH_WINDOW_DAYS } = await import('../src/store/notifications.js');
    expect(PUSH_WINDOW_DAYS).toBe(7);
  });

  it('pins the day cap to 1 per rolling 24 hours (R-9.2)', async () => {
    const { PUSH_MAX_PER_DAY } = await import('../src/store/notifications.js');
    expect(PUSH_MAX_PER_DAY).toBe(1);
  });
});

describe('canSendPush', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('allows a push when nothing has been sent', async () => {
    const { canSendPush } = await import('../src/store/notifications.js');
    expect(await canSendPush(testUserId, 'goal_achieved')).toBe(true);
  });

  // R-9.2: the day cap applies across event types. Before it existed, two
  // different event types could both push within the same hour.
  it('suppresses a different event type within the rolling 24 hours', async () => {
    const { canSendPush, recordNotification } = await import('../src/store/notifications.js');
    await recordNotification(testUserId, 'goal_achieved');
    expect(await canSendPush(testUserId, 'debt_cleared')).toBe(false);
  });

  it('allows a push again once the last one is older than 24 hours', async () => {
    const { canSendPush } = await import('../src/store/notifications.js');
    await insertSentAt(testUserId, 'goal_achieved', hoursAgoDate(25));
    expect(await canSendPush(testUserId, 'debt_cleared')).toBe(true);
  });

  it('allows the same event type again after the cooldown and day window', async () => {
    const { canSendPush } = await import('../src/store/notifications.js');
    await insertSentAt(testUserId, 'bill_overdue', hoursAgoDate(25));
    expect(await canSendPush(testUserId, 'bill_overdue')).toBe(true);
  });

  // R-9.1 weekly budget: two sends inside the rolling 7 days exhaust it even
  // when both are old enough to clear the day cap.
  it('suppresses when the weekly budget of 2 is exhausted', async () => {
    const { canSendPush } = await import('../src/store/notifications.js');
    await insertSentAt(testUserId, 'goal_achieved', hoursAgoDate(30));
    await insertSentAt(testUserId, 'bill_overdue', hoursAgoDate(50));
    expect(await canSendPush(testUserId, 'debt_cleared')).toBe(false);
  });

  it('scopes the budget per user', async () => {
    const { canSendPush, recordNotification } = await import('../src/store/notifications.js');
    const { findOrCreateUser } = await import('../src/store/users.js');
    const otherUserId = await findOrCreateUser({ appleSub: 'other_apple_sub', email: 'other@coiny.test' });
    await recordNotification(otherUserId, 'goal_achieved');
    expect(await canSendPush(testUserId, 'goal_achieved')).toBe(true);
  });
});
