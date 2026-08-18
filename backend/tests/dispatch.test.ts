import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/push/apns.js', () => ({
  sendApnsPush: vi.fn(),
}));

// dispatch.ts logs through pino now, not console: console bypassed the redact
// list and the err serializer entirely, which is the whole point of that
// change. These tests watch the logger they actually use.
vi.mock('../src/util/log.js', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/store/devices.js', () => ({
  listDeviceTokens: vi.fn(),
  latestDeviceTimezone: vi.fn(),
}));

vi.mock('../src/store/notifications.js', () => ({
  canSendPush: vi.fn(),
  recordNotification: vi.fn(),
}));

import { sendApnsPush } from '../src/push/apns.js';
import { dispatchReaction, PUSHABLE_EVENTS } from '../src/reactions/dispatch.js';
import type { Reaction } from '../src/reactions/types.js';
import { latestDeviceTimezone, listDeviceTokens } from '../src/store/devices.js';
import { canSendPush, recordNotification } from '../src/store/notifications.js';
import { log } from '../src/util/log.js';

const mockedSendApnsPush = vi.mocked(sendApnsPush);
const mockedLog = vi.mocked(log);
const mockedListDeviceTokens = vi.mocked(listDeviceTokens);
const mockedLatestDeviceTimezone = vi.mocked(latestDeviceTimezone);
const mockedCanSendPush = vi.mocked(canSendPush);
const mockedRecordNotification = vi.mocked(recordNotification);

const flushImmediate = () => new Promise<void>((r) => setImmediate(r));
async function flushAll() {
  for (let i = 0; i < 5; i++) await flushImmediate();
}

const REACTION: Reaction = {
  animation: 'celebrate',
  sound: 'fanfare',
  led: 'green',
  duration: 3000,
  reason: 'goal_achieved (Emergency fund $4,210.55)',
};

describe('dispatchReaction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Fake only Date, not the task queue: the dispatcher fans out via real
    // microtasks and setImmediate. 16:00 UTC is 12:00 in America/New_York,
    // comfortably outside quiet hours, so pre-existing tests see the same
    // behavior they always did regardless of when the suite runs.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-13T16:00:00Z'));
    mockedLatestDeviceTimezone.mockResolvedValue('America/New_York');
    mockedCanSendPush.mockResolvedValue(true);
    mockedRecordNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends APNs push to all iOS device tokens for a pushable event', async () => {
    mockedListDeviceTokens.mockResolvedValue([
      { token: 'token-a', platform: 'ios' },
      { token: 'token-b', platform: 'ios' },
    ]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedSendApnsPush).toHaveBeenCalledTimes(2);
    expect(mockedSendApnsPush).toHaveBeenCalledWith(
      'token-a',
      expect.stringContaining('celebrating'),
      expect.any(String),
    );
    expect(mockedSendApnsPush).toHaveBeenCalledWith(
      'token-b',
      expect.stringContaining('celebrating'),
      expect.any(String),
    );
  });

  // The reason field carries merchant names and amounts. A push body renders on
  // the lock screen, so it must never contain them.
  it('never puts the reaction reason in the push body', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    const body = mockedSendApnsPush.mock.calls[0]?.[2] ?? '';
    expect(body).not.toContain('Emergency fund');
    expect(body).not.toContain('4,210.55');
  });

  it('never logs the reaction reason', async () => {
    mockedListDeviceTokens.mockResolvedValue([]);
    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    // Every argument of every call, not just the first: the reason could ride
    // in the structured object as easily as in the message.
    const everything = JSON.stringify([
      ...mockedLog.info.mock.calls,
      ...mockedLog.warn.mock.calls,
      ...mockedLog.error.mock.calls,
    ]);
    expect(everything).not.toContain('Emergency fund');
  });

  it('does not push when the notification budget is exhausted', async () => {
    mockedCanSendPush.mockResolvedValue(false);
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
  });

  // Pushability is the event's contract row, not the animation. A paycheck is
  // routine (push 'no') no matter what the creature does on screen.
  it('does not push for events outside the contract allowlist', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);

    dispatchReaction('user-1', { ...REACTION, animation: 'happy' }, 'paycheck_received');
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
    expect(mockedCanSendPush).not.toHaveBeenCalled();
  });

  // R-9.5: a single overspend must never reach a lock screen, even though its
  // animation (concerned) is one that other events push with. The old
  // animation-based allowlist could not express this; the event contract can.
  it('never pushes overspend_vs_plan even with a concerned animation', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);

    dispatchReaction(
      'user-1',
      { animation: 'concerned', sound: 'warning', led: 'amber', duration: 2000, reason: 'overspend_vs_plan' },
      'overspend_vs_plan',
    );
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
    expect(mockedCanSendPush).not.toHaveBeenCalled();
  });

  it('pushes bill_overdue with the same concerned animation', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction(
      'user-1',
      { animation: 'concerned', sound: 'warning', led: 'amber', duration: 2000, reason: 'bill_overdue' },
      'bill_overdue',
    );
    await flushAll();

    expect(mockedSendApnsPush).toHaveBeenCalledTimes(1);
  });

  it('does not push for an unknown event type', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);

    dispatchReaction('user-1', REACTION, 'some_future_event');
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
    expect(mockedCanSendPush).not.toHaveBeenCalled();
  });

  it('records the notification only when a push was delivered', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedRecordNotification).toHaveBeenCalledWith('user-1', 'goal_achieved');
  });

  it('does not record the notification when every push fails', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'bad-token', platform: 'ios' }]);
    mockedSendApnsPush.mockRejectedValue(new Error('BadDeviceToken'));

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedRecordNotification).not.toHaveBeenCalled();
  });

  it('does not push when there are no device tokens', async () => {
    mockedListDeviceTokens.mockResolvedValue([] as { token: string; platform: string }[]);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
  });

  it('skips non-iOS tokens', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'android-token', platform: 'android' }]);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
  });

  it('logs APNs push failures but does not throw', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'bad-token', platform: 'ios' }]);
    mockedSendApnsPush.mockRejectedValue(new Error('APNs 400 for token bad-tok…: BadDeviceToken'));

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedLog.error).toHaveBeenCalledWith({ err: expect.any(Error) }, 'APNs push failed');
  });

  it('logs error but does not throw when listDeviceTokens fails', async () => {
    mockedListDeviceTokens.mockRejectedValue(new Error('DB connection lost'));

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedLog.error).toHaveBeenCalledWith({ err: expect.any(Error) }, 'Push fan-out error');
  });

  it('falls back to a generic title for an animation with no push copy', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction('user-1', { ...REACTION, animation: 'happy' }, 'goal_achieved');
    await flushAll();

    const [, title] = mockedSendApnsPush.mock.calls[0] ?? [];
    expect(title).toBe('Coiny reacted');
  });

  // R-9.3: quiet hours are 21:00 to 08:00 in the user's own timezone.
  it('suppresses the push at 22:00 in the device timezone (Asia/Tokyo)', async () => {
    vi.setSystemTime(new Date('2026-08-13T13:00:00Z')); // 22:00 in Asia/Tokyo
    mockedLatestDeviceTimezone.mockResolvedValue('Asia/Tokyo');
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
  });

  it('delivers the push at 09:00 in the device timezone (Asia/Tokyo)', async () => {
    vi.setSystemTime(new Date('2026-08-13T00:00:00Z')); // 09:00 in Asia/Tokyo
    mockedLatestDeviceTimezone.mockResolvedValue('Asia/Tokyo');
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedSendApnsPush).toHaveBeenCalledTimes(1);
  });

  // R-9.3: with no stored timezone the dispatcher must suppress, never guess a
  // zone and never fall back to UTC or the server's zone.
  it('suppresses the push when no device timezone is stored', async () => {
    mockedLatestDeviceTimezone.mockResolvedValue(null);
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
  });

  it('logs quiet_hours_unknown_tz when no device timezone is stored', async () => {
    mockedLatestDeviceTimezone.mockResolvedValue(null);
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);
    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    const logged = JSON.stringify(mockedLog.info.mock.calls);
    expect(logged).toContain('quiet_hours_unknown_tz');
  });

  // R-9.7: no emoji in any user-facing string. The titles used to carry them.
  it('sends emoji-free push titles and bodies', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction('user-1', REACTION, 'goal_achieved');
    await flushAll();

    const [, title, body] = mockedSendApnsPush.mock.calls[0] ?? [];
    expect(`${title} ${body}`).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  // R-9.5: the event allowlist is the enforcement of the never-push list. It
  // replaced the animation allowlist deliberately: animations could not tell
  // overspend_vs_plan from bill_overdue. Pinning the exact contents means
  // widening it is a visible product decision, not a silent side effect.
  // ('debug' is sandbox-only: /api/debug/react exists to exercise the APNs
  // path and never registers in production.)
  it('pins the pushable event allowlist exactly', () => {
    expect(Array.from(PUSHABLE_EVENTS).sort()).toEqual([
      'bill_overdue',
      // Widened 2026-08-17 for the connection-notification gap
      // (testing-strategy section 8). See tests/contract.test.ts for the why.
      'connection_broken',
      'connection_expiring',
      'debt_cleared',
      'debt_missed_payment',
      'debug',
      'goal_achieved',
      'ladder_rung_completed',
      'utilization_high_pre_close',
    ]);
  });
});
