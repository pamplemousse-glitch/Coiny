import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase } from './db-helper.js';

describe('POST /api/debug/react', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/debug/react?animation=celebrate' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('triggers a celebrate reaction and persists it to history', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/debug/react?animation=celebrate',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ ok: boolean; reaction: { animation: string; reason: string } }>();
    expect(body.ok).toBe(true);
    expect(body.reaction.animation).toBe('celebrate');
    expect(body.reaction.reason).toBe('(debug) celebrate');

    // The reaction must have been recorded (and encrypted) in history.
    const petRes = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    const pet = petRes.json<{ reactionHistory: { eventType: string; reaction: { animation: string } }[] }>();
    expect(pet.reactionHistory).toHaveLength(1);
    expect(pet.reactionHistory[0]?.eventType).toBe('debug');
    expect(pet.reactionHistory[0]?.reaction.animation).toBe('celebrate');

    await app.close();
  });

  it('accepts every supported animation preset', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    for (const animation of ['happy', 'sad', 'celebrate', 'concerned', 'neutral', 'sleeping']) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/debug/react?animation=${animation}`,
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ reaction: { animation: string } }>().reaction.animation).toBe(animation);
    }

    await app.close();
  });

  it('returns 400 for an unknown animation', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/debug/react?animation=explode',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when the animation query param is missing', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/debug/react', headers: authHeader() });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});
