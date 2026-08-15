// Integration tests for POST /api/telemetry (src/api/telemetry.ts) via
// app.inject(). Real SQL via PGlite; nothing is mocked.

import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

const jsonHeaders = () => ({ ...authHeader(), 'content-type': 'application/json' });

const appOpen = (days = 0) => ({
  event: 'app_open',
  properties: { source: 'icon', days_since_signup: days },
});

describe('POST /api/telemetry', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('requires authentication', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/telemetry',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ events: [appOpen()] }),
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('stores a valid batch and reports the accepted count', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/telemetry',
      headers: jsonHeaders(),
      body: JSON.stringify({
        events: [
          appOpen(0),
          { event: 'push_permission_changed', properties: { granted: true } },
          {
            event: 'first_number_shown',
            properties: { seconds_since_signup: 42, class_count: 3 },
            client_ts: '2026-08-13T10:00:00Z',
          },
        ],
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ accepted: 3, rejected: [] });

    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    const shown = await listAnalyticsEvents(testUserId, 'first_number_shown');
    expect(shown.length).toBe(1);
    expect(shown[0]?.clientTs?.toISOString()).toBe('2026-08-13T10:00:00.000Z');

    await app.close();
  });

  it('keeps the valid part of a partially bad batch (partial failure never sinks the batch)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/telemetry',
      headers: jsonHeaders(),
      body: JSON.stringify({
        events: [
          appOpen(2),
          { event: 'nonsense_event', properties: {} },
          { event: 'app_open', properties: { source: 'icon', days_since_signup: 2, merchant: 'Whole Foods' } },
          'not even an object',
        ],
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      accepted: 1,
      rejected: [
        { index: 1, reason: 'unknown_event' },
        { index: 2, reason: 'invalid_properties' },
        { index: 3, reason: 'malformed_event' },
      ],
    });

    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    expect((await listAnalyticsEvents(testUserId, 'app_open')).length).toBe(1);

    await app.close();
  });

  it('rejects server-only events from clients so a device cannot forge backend facts', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/telemetry',
      headers: jsonHeaders(),
      body: JSON.stringify({
        events: [{ event: 'rung_completed', properties: { rung_index: 6 } }],
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ accepted: 0, rejected: [{ index: 0, reason: 'server_only' }] });

    const { listAnalyticsEvents } = await import('../src/store/analytics.js');
    expect(await listAnalyticsEvents(testUserId, 'rung_completed')).toEqual([]);

    await app.close();
  });

  it('returns 400 when the envelope is not an events array', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/telemetry',
      headers: jsonHeaders(),
      body: JSON.stringify({ event: 'app_open' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when the batch exceeds 50 events', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/telemetry',
      headers: jsonHeaders(),
      body: JSON.stringify({ events: Array.from({ length: 51 }, () => appOpen()) }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('rejects an event with an invalid client_ts as malformed without sinking the batch', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/telemetry',
      headers: jsonHeaders(),
      body: JSON.stringify({
        events: [{ ...appOpen(1), client_ts: 'yesterday-ish' }, appOpen(1)],
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ accepted: 1, rejected: [{ index: 0, reason: 'malformed_event' }] });

    await app.close();
  });

  it('stamps events with the session user, never a payload-supplied identity', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    // user_id inside properties is an unknown key: strict schemas reject it,
    // so identity can only ever come from the session.
    const res = await app.inject({
      method: 'POST',
      url: '/api/telemetry',
      headers: jsonHeaders(),
      body: JSON.stringify({
        events: [{ event: 'app_open', properties: { source: 'icon', days_since_signup: 0, user_id: 'someone-else' } }],
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ accepted: 0, rejected: [{ index: 0, reason: 'invalid_properties' }] });

    await app.close();
  });

  it('applies the per-route rate limit of 60 requests per minute', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    let lastStatus = 0;
    for (let i = 0; i < 61; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/telemetry',
        headers: jsonHeaders(),
        body: JSON.stringify({ events: [appOpen()] }),
      });
      lastStatus = res.statusCode;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);

    await app.close();
  });
});
