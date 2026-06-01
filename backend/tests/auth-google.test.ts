import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase } from './db-helper.js';

describe('POST /api/auth/google', () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it('returns 503 when GOOGLE_AUTH_CLIENT_ID is unset', async () => {
    delete process.env.GOOGLE_AUTH_CLIENT_ID;
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/google',
      payload: { id_token: 'irrelevant' },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: 'Google auth not configured' });

    await app.close();
  });

  it('returns 400 when id_token is missing', async () => {
    process.env.GOOGLE_AUTH_CLIENT_ID = 'test-client.apps.googleusercontent.com';
    try {
      const { buildApp } = await import('../src/server.js');
      const app = await buildApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/google',
        payload: {},
      });
      expect(res.statusCode).toBe(400);

      await app.close();
    } finally {
      delete process.env.GOOGLE_AUTH_CLIENT_ID;
    }
  });

  it('returns 401 when the id_token is not a valid Google JWT', async () => {
    process.env.GOOGLE_AUTH_CLIENT_ID = 'test-client.apps.googleusercontent.com';
    try {
      const { buildApp } = await import('../src/server.js');
      const app = await buildApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/google',
        payload: { id_token: 'not.a.real.jwt' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'Invalid identity token' });

      await app.close();
    } finally {
      delete process.env.GOOGLE_AUTH_CLIENT_ID;
    }
  });
});
