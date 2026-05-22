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
    const userBId = await findOrCreateUser({ appleSub: 'test_user_b', email: null });
    const { rawToken: userBToken } = await createSession(userBId);
    const res = await app.inject({
      method: 'GET',
      url: '/api/pets',
      headers: { authorization: `Bearer ${userBToken}` },
    });
    expect(res.statusCode).toBe(200);

    await app.close();
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
