import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/push/apns.js', () => ({
  sendApnsPush: vi.fn(),
}));

vi.mock('../src/store/devices.js', () => ({
  listDeviceTokens: vi.fn(),
}));

vi.mock('../src/store/notifications.js', () => ({
  canSendPush: vi.fn(),
  recordNotification: vi.fn(),
}));

import { sendApnsPush } from '../src/push/apns.js';
import { dispatchReaction } from '../src/reactions/dispatch.js';
import type { Reaction } from '../src/reactions/types.js';
import { listDeviceTokens } from '../src/store/devices.js';
import { canSendPush, recordNotification } from '../src/store/notifications.js';

const mockedSendApnsPush = vi.mocked(sendApnsPush);
const mockedListDeviceTokens = vi.mocked(listDeviceTokens);
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
  reason: 'paycheck_received (Direct Deposit $4,210.55)',
};

describe('dispatchReaction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedCanSendPush.mockResolvedValue(true);
    mockedRecordNotification.mockResolvedValue(undefined);
  });

  it('sends APNs push to all iOS device tokens', async () => {
    mockedListDeviceTokens.mockResolvedValue([
      { token: 'token-a', platform: 'ios' },
      { token: 'token-b', platform: 'ios' },
    ]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction('user-1', REACTION);
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

    dispatchReaction('user-1', REACTION);
    await flushAll();

    const body = mockedSendApnsPush.mock.calls[0]?.[2] ?? '';
    expect(body).not.toContain('Direct Deposit');
    expect(body).not.toContain('4,210.55');
  });

  it('never logs the reaction reason', async () => {
    mockedListDeviceTokens.mockResolvedValue([]);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    dispatchReaction('user-1', REACTION);
    await flushAll();

    for (const call of consoleSpy.mock.calls) {
      expect(String(call[0])).not.toContain('Direct Deposit');
    }
    consoleSpy.mockRestore();
  });

  it('does not push when the notification budget is exhausted', async () => {
    mockedCanSendPush.mockResolvedValue(false);
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);

    dispatchReaction('user-1', REACTION);
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
  });

  it('does not push for animations outside the allowlist', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);

    dispatchReaction('user-1', { ...REACTION, animation: 'happy' });
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
    expect(mockedCanSendPush).not.toHaveBeenCalled();
  });

  it('records the notification only when a push was delivered', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction('user-1', REACTION, 'paycheck_received');
    await flushAll();

    expect(mockedRecordNotification).toHaveBeenCalledWith('user-1', 'paycheck_received');
  });

  it('does not record the notification when every push fails', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'bad-token', platform: 'ios' }]);
    mockedSendApnsPush.mockRejectedValue(new Error('BadDeviceToken'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    dispatchReaction('user-1', REACTION);
    await flushAll();

    expect(mockedRecordNotification).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('does not push when there are no device tokens', async () => {
    mockedListDeviceTokens.mockResolvedValue([] as { token: string; platform: string }[]);

    dispatchReaction('user-1', REACTION);
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
  });

  it('skips non-iOS tokens', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'android-token', platform: 'android' }]);

    dispatchReaction('user-1', REACTION);
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
  });

  it('logs APNs push failures but does not throw', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'bad-token', platform: 'ios' }]);
    mockedSendApnsPush.mockRejectedValue(new Error('APNs 400 for token bad-tok…: BadDeviceToken'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    dispatchReaction('user-1', REACTION);
    await flushAll();

    expect(errorSpy).toHaveBeenCalledWith('APNs push failed:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('logs error but does not throw when listDeviceTokens fails', async () => {
    mockedListDeviceTokens.mockRejectedValue(new Error('DB connection lost'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    dispatchReaction('user-1', REACTION);
    await flushAll();

    expect(errorSpy).toHaveBeenCalledWith('Push fan-out error:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('uses unknown animation title fallback without pushing', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);

    // biome-ignore lint/suspicious/noExplicitAny: testing unknown animation fallback path
    dispatchReaction('user-1', { ...REACTION, animation: 'unknown_animation' as any });
    await flushAll();

    expect(mockedSendApnsPush).not.toHaveBeenCalled();
  });
});
