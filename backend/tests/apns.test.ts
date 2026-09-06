import { EventEmitter } from 'node:events';
import http2 from 'node:http2';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:http2', () => ({
  default: { connect: vi.fn() },
}));

const mockConnect = vi.mocked(http2.connect);

const TEST_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgyUoBYUXbdcEYcobR
F1sGQtYcgIOJkPb8+A51TMIs5iGhRANCAAQA7q7yVc6kMiiOAEGLFBQ1H+aR7CsI
gB4xQ/ziC9XWhcKTZd7IJWSkQBgSLkD8FDylf775QGNWDq8m/2m0uSmP
-----END PRIVATE KEY-----`;

type FakeReq = EventEmitter & {
  write: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  setEncoding: ReturnType<typeof vi.fn>;
};

type FakeSession = EventEmitter & {
  request: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

function makeSession(statusCode: number, responseBody = ''): FakeSession {
  const req = new EventEmitter() as FakeReq;
  req.write = vi.fn();
  req.setEncoding = vi.fn();
  req.end = vi.fn().mockImplementation(() => {
    setImmediate(() => {
      req.emit('response', { ':status': statusCode });
      setImmediate(() => {
        if (responseBody) req.emit('data', responseBody);
        setImmediate(() => req.emit('end'));
      });
    });
  });

  const session = new EventEmitter() as FakeSession;
  session.request = vi.fn().mockReturnValue(req);
  session.close = vi.fn();
  return session;
}

describe('sendApnsPush — guard (no config)', () => {
  afterEach(() => {
    vi.resetModules();
    mockConnect.mockReset();
  });

  it('returns immediately when APNS_KEY is empty', async () => {
    vi.doMock('../src/config.js', () => ({
      config: { APNS_KEY: '', APNS_KEY_ID: 'kid', APNS_TEAM_ID: 'tid', APNS_BUNDLE_ID: 'bundle', NODE_ENV: 'test' },
    }));
    const { sendApnsPush } = await import('../src/push/apns.js');
    await sendApnsPush('device', 'Title', 'Body');
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('returns immediately when APNS_KEY_ID is empty', async () => {
    vi.doMock('../src/config.js', () => ({
      config: { APNS_KEY: 'key', APNS_KEY_ID: '', APNS_TEAM_ID: 'tid', APNS_BUNDLE_ID: 'bundle', NODE_ENV: 'test' },
    }));
    const { sendApnsPush } = await import('../src/push/apns.js');
    await sendApnsPush('device', 'Title', 'Body');
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('returns immediately when APNS_TEAM_ID is empty', async () => {
    vi.doMock('../src/config.js', () => ({
      config: { APNS_KEY: 'key', APNS_KEY_ID: 'kid', APNS_TEAM_ID: '', APNS_BUNDLE_ID: 'bundle', NODE_ENV: 'test' },
    }));
    const { sendApnsPush } = await import('../src/push/apns.js');
    await sendApnsPush('device', 'Title', 'Body');
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

describe('sendApnsPush — send path', () => {
  afterEach(() => {
    vi.resetModules();
    mockConnect.mockReset();
  });

  async function getSender(env: { NODE_ENV?: string; APP_ENV?: string } = {}) {
    vi.doMock('../src/config.js', () => ({
      config: {
        APNS_KEY: TEST_PEM,
        APNS_KEY_ID: 'test-kid',
        APNS_TEAM_ID: 'test-team',
        APNS_BUNDLE_ID: 'app.coiny.ios',
        NODE_ENV: env.NODE_ENV ?? 'test',
        APP_ENV: env.APP_ENV ?? 'local',
      },
    }));
    const { sendApnsPush } = await import('../src/push/apns.js');
    return sendApnsPush;
  }

  it('resolves when APNs returns HTTP 200', async () => {
    mockConnect.mockReturnValue(makeSession(200) as never);
    const sendApnsPush = await getSender();
    await expect(sendApnsPush('aabbcc', 'Title', 'Body')).resolves.toBeUndefined();
  });

  it('rejects with APNs status when response is non-200', async () => {
    mockConnect.mockReturnValue(makeSession(400, 'BadDeviceToken') as never);
    const sendApnsPush = await getSender();
    await expect(sendApnsPush('aabbcc', 'Title', 'Body')).rejects.toThrow('APNs 400');
  });

  it('connects to the sandbox host when APP_ENV is local', async () => {
    mockConnect.mockReturnValue(makeSession(200) as never);
    const sendApnsPush = await getSender({ APP_ENV: 'local' });
    await sendApnsPush('aabbcc', 'Title', 'Body');
    expect(mockConnect).toHaveBeenCalledWith(expect.stringContaining('sandbox.push.apple.com'));
  });

  // The regression. NODE_ENV is 'production' on staging by design, so a
  // gateway chosen from it sent staging's pushes to the production endpoint,
  // where the sandbox tokens that development builds register are rejected
  // with 400 BadDeviceToken.
  it('connects to the sandbox host on staging, where NODE_ENV is production', async () => {
    mockConnect.mockReturnValue(makeSession(200) as never);
    const sendApnsPush = await getSender({ NODE_ENV: 'production', APP_ENV: 'staging' });
    await sendApnsPush('aabbcc', 'Title', 'Body');
    expect(mockConnect).toHaveBeenCalledWith(expect.stringContaining('sandbox.push.apple.com'));
  });

  it('connects to the production host only when APP_ENV is production', async () => {
    mockConnect.mockReturnValue(makeSession(200) as never);
    const sendApnsPush = await getSender({ NODE_ENV: 'production', APP_ENV: 'production' });
    await sendApnsPush('aabbcc', 'Title', 'Body');
    expect(mockConnect).toHaveBeenCalledWith('https://api.push.apple.com');
  });

  it('rejects when the http2 session emits an error', async () => {
    const req = new EventEmitter() as FakeReq;
    req.write = vi.fn();
    req.setEncoding = vi.fn();
    req.end = vi.fn();

    const session = new EventEmitter() as FakeSession;
    session.request = vi.fn().mockReturnValue(req);
    session.close = vi.fn();

    req.end.mockImplementation(() => {
      setImmediate(() => session.emit('error', new Error('connection refused')));
    });

    mockConnect.mockReturnValue(session as never);
    const sendApnsPush = await getSender();
    await expect(sendApnsPush('aabbcc', 'Title', 'Body')).rejects.toThrow('connection refused');
  });
});

// The correspondence "APP_ENV decides the gateway" held only while Debug builds
// talked to staging and Release builds talked to production. Pointing the
// TestFlight build at staging ended that: one backend now holds production
// tokens (TestFlight) and sandbox tokens (Xcode Debug) at the same time, and
// sending either to the other's host is a 400 BadDeviceToken that nothing
// surfaces to a user or a dashboard.
describe('apnsHostFor — per-token routing', () => {
  afterEach(() => {
    vi.resetModules();
    mockConnect.mockReset();
  });

  async function getHostFor(appEnv: string) {
    vi.doMock('../src/config.js', () => ({
      config: {
        APNS_KEY: TEST_PEM,
        APNS_KEY_ID: 'test-kid',
        APNS_TEAM_ID: 'test-team',
        APNS_BUNDLE_ID: 'app.coiny.ios',
        NODE_ENV: 'production',
        APP_ENV: appEnv,
      },
    }));
    const { apnsHostFor } = await import('../src/push/apns.js');
    return apnsHostFor;
  }

  it('sends a production token to the production host even on staging', async () => {
    const apnsHostFor = await getHostFor('staging');
    expect(apnsHostFor('production')).toBe('api.push.apple.com');
  });

  it('sends a development token to the sandbox host even on production', async () => {
    const apnsHostFor = await getHostFor('production');
    expect(apnsHostFor('development')).toBe('api.sandbox.push.apple.com');
  });

  // The whole point: both at once, from one server.
  it('routes both token kinds correctly from a single staging backend', async () => {
    const apnsHostFor = await getHostFor('staging');
    expect(apnsHostFor('production')).toBe('api.push.apple.com');
    expect(apnsHostFor('development')).toBe('api.sandbox.push.apple.com');
  });

  // Tokens predating migration 0070. They can only have come from a build made
  // while the old correspondence held, so the old heuristic is right for them.
  it('falls back to APP_ENV for a token with no recorded environment', async () => {
    expect((await getHostFor('staging'))(null)).toBe('api.sandbox.push.apple.com');
    vi.resetModules();
    expect((await getHostFor('production'))(null)).toBe('api.push.apple.com');
  });

  it('actually connects to the production host for a production token on staging', async () => {
    vi.doMock('../src/config.js', () => ({
      config: {
        APNS_KEY: TEST_PEM,
        APNS_KEY_ID: 'test-kid',
        APNS_TEAM_ID: 'test-team',
        APNS_BUNDLE_ID: 'app.coiny.ios',
        NODE_ENV: 'production',
        APP_ENV: 'staging',
      },
    }));
    mockConnect.mockReturnValue(makeSession(200) as never);
    const { sendApnsPush } = await import('../src/push/apns.js');
    await sendApnsPush('aabbcc', 'Title', 'Body', 'production');
    expect(mockConnect).toHaveBeenCalledWith('https://api.push.apple.com');
  });
});
