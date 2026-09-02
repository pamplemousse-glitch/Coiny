// Deliberately does NOT set REVIEW_DEMO_CODE, which is the whole point of the
// file. config.js reads process.env once at module load, so "configured" and
// "not configured" cannot coexist in one file without resetting the module
// registry, and resetting it mid-test breaks the db client (see the note at
// the top of review-demo-seed.test.ts).
//
// Outside a review window the endpoint must not advertise that it exists.

import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase } from './db-helper.js';

describe('POST /api/review/demo-seed with no code configured', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns 404 rather than 403', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/review/demo-seed',
      headers: authHeader(),
      payload: { code: 'anything' },
    });

    // 404, not 403: a 403 would confirm the route exists and invite guessing.
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('writes nothing', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/api/review/demo-seed',
      headers: authHeader(),
      payload: { code: 'anything' },
    });
    await app.close();

    const { db } = await import('../src/db/client.js');
    const { declaredAssets } = await import('../src/db/schema.js');
    expect((await db().select().from(declaredAssets)).length).toBe(0);
  });
});
