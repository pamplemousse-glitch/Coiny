import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-15T12:00:00.000Z');

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

describe('retention purge', () => {
  beforeEach(async () => {
    await resetDatabase();
    const { resetPurgeSchedule } = await import('../src/scheduler/purge.js');
    resetPurgeSchedule();
  });

  it('deletes expired sessions and keeps live ones', async () => {
    const { db } = await import('../src/db/client.js');
    const { sessions } = await import('../src/db/schema.js');
    const { runRetentionPurge } = await import('../src/scheduler/purge.js');

    await db()
      .insert(sessions)
      .values({
        id: 'expired-session',
        userId: testUserId,
        tokenHash: 'hash-expired',
        expiresAt: ago(DAY),
      });

    const summary = await runRetentionPurge(NOW);
    expect(summary.sessions).toBe(1);

    const remaining = await db().select({ id: sessions.id }).from(sessions);
    // The live session created for the test user must survive.
    expect(remaining.map((r) => r.id)).not.toContain('expired-session');
    expect(remaining.length).toBe(1);
  });

  it('deletes abandoned OAuth and OTP handshake rows after 24 hours', async () => {
    const { db } = await import('../src/db/client.js');
    const { discogsPending, spinwheelPending } = await import('../src/db/schema.js');
    const { runRetentionPurge } = await import('../src/scheduler/purge.js');

    await db()
      .insert(discogsPending)
      .values({
        userId: testUserId,
        oauthToken: 'tok',
        oauthTokenSecret: 'secret',
        createdAt: ago(2 * DAY),
      });
    await db()
      .insert(spinwheelPending)
      .values({
        userId: testUserId,
        spinwheelUserId: 'sw-1',
        createdAt: ago(2 * DAY),
      });

    const summary = await runRetentionPurge(NOW);
    expect(summary.pendingHandshakes).toBe(2);
    expect(await db().select().from(discogsPending)).toEqual([]);
    expect(await db().select().from(spinwheelPending)).toEqual([]);
  });

  it('keeps a handshake row that is still inside the window', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelPending } = await import('../src/db/schema.js');
    const { runRetentionPurge } = await import('../src/scheduler/purge.js');

    await db()
      .insert(spinwheelPending)
      .values({ userId: testUserId, spinwheelUserId: 'sw-1', createdAt: ago(60 * 60 * 1000) });

    const summary = await runRetentionPurge(NOW);
    expect(summary.pendingHandshakes).toBe(0);
    expect((await db().select().from(spinwheelPending)).length).toBe(1);
  });

  it('applies the stated window to notifications, reactions and analytics', async () => {
    const { db } = await import('../src/db/client.js');
    const { analyticsEvents, notificationLog, reactionHistory } = await import('../src/db/schema.js');
    const { runRetentionPurge } = await import('../src/scheduler/purge.js');

    await db()
      .insert(notificationLog)
      .values([
        { userId: testUserId, eventType: 'old', sentAt: ago(100 * DAY) },
        { userId: testUserId, eventType: 'recent', sentAt: ago(10 * DAY) },
      ]);
    await db()
      .insert(reactionHistory)
      .values([
        { userId: testUserId, eventType: 'old', reaction: 'happy', at: ago(400 * DAY) },
        { userId: testUserId, eventType: 'recent', reaction: 'happy', at: ago(30 * DAY) },
      ]);
    await db()
      .insert(analyticsEvents)
      .values([
        { userId: testUserId, event: 'old', serverTs: ago(400 * DAY) },
        { userId: testUserId, event: 'recent', serverTs: ago(30 * DAY) },
      ]);

    const summary = await runRetentionPurge(NOW);
    expect(summary.notifications).toBe(1);
    expect(summary.reactions).toBe(1);
    expect(summary.analytics).toBe(1);

    expect((await db().select({ t: notificationLog.eventType }).from(notificationLog)).map((r) => r.t)).toEqual([
      'recent',
    ]);
    expect((await db().select({ t: reactionHistory.eventType }).from(reactionHistory)).map((r) => r.t)).toEqual([
      'recent',
    ]);
    // The fixture user's own signup_completed row is inside the window and is
    // expected to survive alongside 'recent'.
    const events = (await db().select({ e: analyticsEvents.event }).from(analyticsEvents)).map((r) => r.e);
    expect(events).toContain('recent');
    expect(events).not.toContain('old');
  });

  it('runs at most once a day', async () => {
    const { isPurgeDue, runRetentionPurge, PURGE_INTERVAL_MS } = await import('../src/scheduler/purge.js');

    expect(isPurgeDue(NOW)).toBe(true);
    await runRetentionPurge(NOW);

    expect(isPurgeDue(new Date(NOW.getTime() + 60 * 60 * 1000))).toBe(false);
    expect(isPurgeDue(new Date(NOW.getTime() + PURGE_INTERVAL_MS))).toBe(true);
  });

  it('is idempotent, so two instances racing costs nothing', async () => {
    const { db } = await import('../src/db/client.js');
    const { notificationLog } = await import('../src/db/schema.js');
    const { runRetentionPurge } = await import('../src/scheduler/purge.js');

    await db()
      .insert(notificationLog)
      .values({ userId: testUserId, eventType: 'old', sentAt: ago(100 * DAY) });

    expect((await runRetentionPurge(NOW)).notifications).toBe(1);
    expect((await runRetentionPurge(NOW)).notifications).toBe(0);
  });
});
