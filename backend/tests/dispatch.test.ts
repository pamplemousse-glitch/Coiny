import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/push/apns.js', () => ({
  sendApnsPush: vi.fn(),
}));

vi.mock('../src/store/devices.js', () => ({
  listDeviceTokens: vi.fn(),
}));

import { sendApnsPush } from '../src/push/apns.js';
import { dispatchReaction } from '../src/reactions/dispatch.js';
import type { Reaction } from '../src/reactions/types.js';
import { listDeviceTokens } from '../src/store/devices.js';

const mockedSendApnsPush = vi.mocked(sendApnsPush);
const mockedListDeviceTokens = vi.mocked(listDeviceTokens);

const flushImmediate = () => new Promise<void>((r) => setImmediate(r));
async function flushAll() {
  for (let i = 0; i < 5; i++) await flushImmediate();
}

const REACTION: Reaction = {
  animation: 'celebrate',
  sound: 'cheer',
  led: '#00ff00',
  duration: 3000,
  reason: 'Paycheck received',
};

describe('dispatchReaction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
      'Paycheck received',
    );
    expect(mockedSendApnsPush).toHaveBeenCalledWith(
      'token-b',
      expect.stringContaining('celebrating'),
      'Paycheck received',
    );
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

  it('uses "hold" duration label when duration is 0', async () => {
    mockedListDeviceTokens.mockResolvedValue([]);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    dispatchReaction('user-1', { ...REACTION, duration: 0 });
    await flushAll();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('hold'));
    consoleSpy.mockRestore();
  });

  it('uses unknown animation title fallback', async () => {
    mockedListDeviceTokens.mockResolvedValue([{ token: 'token-a', platform: 'ios' }]);
    mockedSendApnsPush.mockResolvedValue(undefined);

    dispatchReaction('user-1', { ...REACTION, animation: 'unknown_animation' });
    await flushAll();

    expect(mockedSendApnsPush).toHaveBeenCalledWith('token-a', '🐣 Coiny reacted', 'Paycheck received');
  });
});
