import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase } from './db-helper.js';

// max=100 per second. We send 101 sequential requests with app.inject (in-process,
// no network) — easily fits inside a single 1s window.
const BURST = 101;

describe('per-user rate limit', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('rate-limits the same user after max requests in the window', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    let lastStatus = 0;
    for (let i = 0; i < BURST; i++) {
      const res = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
      lastStatus = res.statusCode;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);

    await app.close();
  });

  it('does not cross-rate-limit a different user (proves per-user, not per-IP)', async () => {
    const { buildApp } = await import('../src/server.js');
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { createSession } = await import('../src/store/sessions.js');
    const app = await buildApp();

    // Burn through user A's bucket.
    for (let i = 0; i < BURST; i++) {
      const res = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
      if (res.statusCode === 429) break;
    }

    // User B (different session token, same in-process IP) should still get 200.
    const userBId = await findOrCreateUser({ appleSub: 'test_user_b' });
    const { rawToken: userBToken } = await createSession(userBId);
    const res = await app.inject({
      method: 'GET',
      url: '/api/pets',
      headers: { authorization: `Bearer ${userBToken}` },
    });
    expect(res.statusCode).toBe(200);

    await app.close();
  });

  it('caps the expensive refresh route far below the global bucket', async () => {
    const { buildApp } = await import('../src/server.js');
    const { REFRESH_LIMIT } = await import('../src/api/rate-limits.js');
    const app = await buildApp();

    // A bearer that is not a live session. The rate-limit hook runs at
    // onRequest and keys on sha256(bearer), so these requests land in the
    // route's bucket; the auth plugin then 401s at preHandler, so the 16-call
    // vendor fan-out this route exists to protect never runs. That is the only
    // way to assert the limit without making the test the thing the limit is
    // there to prevent.
    const headers = { authorization: 'Bearer refresh-limit-probe' };
    const max = REFRESH_LIMIT.config.rateLimit.max;

    const statuses: number[] = [];
    for (let i = 0; i <= max; i++) {
      const res = await app.inject({ method: 'POST', url: '/api/net-worth/refresh', headers });
      statuses.push(res.statusCode);
    }

    expect(statuses.slice(0, max)).toEqual(Array(max).fill(401));
    expect(statuses[max]).toBe(429);
    // And the global bucket alone would not have stopped any of them.
    expect(max).toBeLessThan(100);

    await app.close();
  });

  it('caps each vendor sync route', async () => {
    const { buildApp } = await import('../src/server.js');
    const { SYNC_LIMIT } = await import('../src/api/rate-limits.js');
    const app = await buildApp();

    const headers = { authorization: 'Bearer sync-limit-probe' };
    const max = SYNC_LIMIT.config.rateLimit.max;

    let last = 0;
    for (let i = 0; i <= max; i++) {
      const res = await app.inject({ method: 'POST', url: '/api/zerion/sync', headers });
      last = res.statusCode;
    }
    expect(last).toBe(429);

    await app.close();
  });

  // Each sync route is a slice of the same fan-out, so a limit on one and not
  // the others is a limit on nothing. This is the row that would notice a new
  // integration landing without one.
  it('gives every /api/*/sync route its own limit', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const dir = new URL('../src/api/', import.meta.url);

    const unlimited: string[] = [];
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts')) continue;
      const src = readFileSync(new URL(file, dir), 'utf8');
      for (const match of src.matchAll(/'(\/api\/[a-z0-9-]+\/sync)',\s*(\w+)/g)) {
        if (match[2] !== 'SYNC_LIMIT') unlimited.push(`${file}: ${match[1]}`);
      }
    }

    expect(unlimited).toEqual([]);
  });

  it('still rate-limits unauthenticated requests by IP', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    let lastStatus = 0;
    for (let i = 0; i < BURST; i++) {
      // /health is unauthenticated; keyGenerator falls back to req.ip.
      const res = await app.inject({ method: 'GET', url: '/health' });
      lastStatus = res.statusCode;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);

    await app.close();
  });
});
