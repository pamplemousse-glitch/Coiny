// Tests for src/api/consent.ts and the consent columns it writes, plus the
// half of the fix that a client-side toggle cannot deliver: server-emitted
// events stopping too. Real SQL via PGlite; the database is never mocked.

import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

describe('GET /api/consent', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/consent' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('reports no acknowledgement and collection on for a fresh user', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/consent', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      legal_accepted_at: null,
      legal_version: null,
      analytics_opt_out: false,
    });

    await app.close();
  });
});

describe('POST /api/consent/acknowledge', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('records the version and a timestamp', async () => {
    const { buildApp } = await import('../src/server.js');
    const { getConsent } = await import('../src/store/users.js');
    const app = await buildApp();

    const before = Date.now();
    const res = await app.inject({
      method: 'POST',
      url: '/api/consent/acknowledge',
      headers: authHeader(),
      payload: { policy_version: '2026-08-13' },
    });
    expect(res.statusCode).toBe(200);

    const consent = await getConsent(testUserId);
    expect(consent?.legalVersion).toBe('2026-08-13');
    expect(consent?.legalAcceptedAt?.getTime()).toBeGreaterThanOrEqual(before - 1000);

    await app.close();
  });

  it('rejects a missing version rather than recording an empty acknowledgement', async () => {
    const { buildApp } = await import('../src/server.js');
    const { getConsent } = await import('../src/store/users.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/consent/acknowledge',
      headers: authHeader(),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect((await getConsent(testUserId))?.legalAcceptedAt).toBeNull();

    await app.close();
  });

  it('overwrites an earlier acknowledgement when a new version is shown', async () => {
    const { buildApp } = await import('../src/server.js');
    const { getConsent } = await import('../src/store/users.js');
    const app = await buildApp();

    for (const version of ['2026-08-13', '2026-09-01']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/consent/acknowledge',
        headers: authHeader(),
        payload: { policy_version: version },
      });
      expect(res.statusCode).toBe(200);
    }

    expect((await getConsent(testUserId))?.legalVersion).toBe('2026-09-01');

    await app.close();
  });
});

describe('PATCH /api/consent', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('turns usage sharing off and reports it back', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const patched = await app.inject({
      method: 'PATCH',
      url: '/api/consent',
      headers: authHeader(),
      payload: { analytics_opt_out: true },
    });
    expect(patched.statusCode).toBe(200);

    const res = await app.inject({ method: 'GET', url: '/api/consent', headers: authHeader() });
    expect(res.json().analytics_opt_out).toBe(true);

    await app.close();
  });

  it('rejects a non-boolean rather than coercing it', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/consent',
      headers: authHeader(),
      payload: { analytics_opt_out: 'yes' },
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('the opt-out stops writes the client cannot stop', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('drops a batch posted to /api/telemetry after opting out', async () => {
    const { buildApp } = await import('../src/server.js');
    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const app = await buildApp();

    await app.inject({
      method: 'PATCH',
      url: '/api/consent',
      headers: authHeader(),
      payload: { analytics_opt_out: true },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/telemetry',
      headers: authHeader(),
      payload: { events: [{ event: 'app_open', properties: { source: 'icon', days_since_signup: 0 } }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accepted).toBe(0);
    expect(await listAnalyticsEvents(testUserId, 'app_open')).toEqual([]);

    await app.close();
  });

  it('drops a server-emitted event too, which is the half a client toggle misses', async () => {
    const { setAnalyticsOptOut } = await import('../src/store/users.js');
    const { trackServerEvent, listAnalyticsEvents } = await import('../src/store/analytics.js');

    await setAnalyticsOptOut(testUserId, true);
    await trackServerEvent(testUserId, 'push_sent', { type: 'weekly_digest' });
    expect(await listAnalyticsEvents(testUserId, 'push_sent')).toEqual([]);

    // And resumes when the user turns it back on: opting out is a switch, not
    // a one-way door.
    await setAnalyticsOptOut(testUserId, false);
    await trackServerEvent(testUserId, 'push_sent', { type: 'weekly_digest' });
    expect((await listAnalyticsEvents(testUserId, 'push_sent')).map((r) => r.event)).toEqual(['push_sent']);
  });
});
