import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

describe('POST /api/devices/push-token', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('persists a new device token', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxx]', platform: 'ios' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    const { listDeviceTokens } = await import('../src/store/devices.js');
    const list = await listDeviceTokens(testUserId);
    expect(list.length).toBe(1);
    expect(list[0]?.platform).toBe('ios');

    await app.close();
  });

  it('upserts on conflict (same token re-registered)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'ExponentPushToken[duplicate-test]', platform: 'ios' }),
    });
    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'ExponentPushToken[duplicate-test]', platform: 'android' }),
    });

    const { listDeviceTokens } = await import('../src/store/devices.js');
    const list = await listDeviceTokens(testUserId);
    expect(list.length).toBe(1);
    expect(list[0]?.platform).toBe('android');

    await app.close();
  });

  it('returns 400 on invalid platform', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'ExponentPushToken[xxx]', platform: 'windows' }),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  // R-9.3: quiet hours need the device's IANA timezone, captured here.
  it('persists the timezone sent at registration', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-tz-1234567890', platform: 'ios', timezone: 'Asia/Tokyo' }),
    });

    const { latestDeviceTimezone } = await import('../src/store/devices.js');
    expect(await latestDeviceTimezone(testUserId)).toBe('Asia/Tokyo');

    await app.close();
  });

  it('rejects an invalid timezone identifier with 400', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-tz-1234567890', platform: 'ios', timezone: 'Not/AZone' }),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('reports the timezone of the most recently registered device', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-old-1234567890', platform: 'ios', timezone: 'Asia/Tokyo' }),
    });
    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-new-1234567890', platform: 'ios', timezone: 'Europe/Paris' }),
    });

    const { latestDeviceTimezone } = await import('../src/store/devices.js');
    expect(await latestDeviceTimezone(testUserId)).toBe('Europe/Paris');

    await app.close();
  });

  it('keeps the stored timezone when an older build re-registers without one', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-keep-1234567890', platform: 'ios', timezone: 'Asia/Tokyo' }),
    });
    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-keep-1234567890', platform: 'ios' }),
    });

    const { latestDeviceTimezone } = await import('../src/store/devices.js');
    expect(await latestDeviceTimezone(testUserId)).toBe('Asia/Tokyo');

    await app.close();
  });

  it('reports no timezone when no device has one', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-notz-1234567890', platform: 'ios' }),
    });

    const { latestDeviceTimezone } = await import('../src/store/devices.js');
    expect(await latestDeviceTimezone(testUserId)).toBe(null);

    await app.close();
  });
  // Migration 0070. The gateway is a property of the build that issued the
  // token, and one backend now holds both kinds at once.
  it('persists the aps environment the app reports', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-testflight-1', platform: 'ios', apsEnvironment: 'production' }),
    });

    const { listDeviceTokens } = await import('../src/store/devices.js');
    const list = await listDeviceTokens(testUserId);
    expect(list[0]?.apsEnvironment).toBe('production');

    await app.close();
  });

  it('rejects an aps environment that is not one of the two APNs values', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-bogus-env-1', platform: 'ios', apsEnvironment: 'staging' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('leaves the stored aps environment alone when an older build re-registers without it', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-mixed-1', platform: 'ios', apsEnvironment: 'production' }),
    });
    // Same device, a build that predates the field. Erasing the value here
    // would silently drop the token back to the APP_ENV fallback, which on
    // staging is the sandbox host and therefore the wrong one.
    await app.inject({
      method: 'POST',
      url: '/api/devices/push-token',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'apns-token-mixed-1', platform: 'ios' }),
    });

    const { listDeviceTokens } = await import('../src/store/devices.js');
    const list = await listDeviceTokens(testUserId);
    expect(list.length).toBe(1);
    expect(list[0]?.apsEnvironment).toBe('production');

    await app.close();
  });

  it('records both environments for one user, which is the case that motivated the column', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    for (const [token, env] of [
      ['apns-token-both-testflight', 'production'],
      ['apns-token-both-xcode', 'development'],
    ]) {
      await app.inject({
        method: 'POST',
        url: '/api/devices/push-token',
        headers: { ...authHeader(), 'content-type': 'application/json' },
        body: JSON.stringify({ token, platform: 'ios', apsEnvironment: env }),
      });
    }

    const { listDeviceTokens } = await import('../src/store/devices.js');
    const list = await listDeviceTokens(testUserId);
    expect(list.length).toBe(2);
    expect(new Set(list.map((t) => t.apsEnvironment))).toEqual(new Set(['production', 'development']));

    await app.close();
  });
});
