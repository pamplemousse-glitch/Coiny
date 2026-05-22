import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

describe('GET /api/pets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns pet state shape', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<Record<string, unknown>>();
    expect(typeof body.healthScore).toBe('number');
    expect(typeof body.mood).toBe('number');
    expect(body).toHaveProperty('goals');
    expect(body).toHaveProperty('reactionHistory');

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/pets' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('PUT /api/pets/goals', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('updates goals and returns them', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/pets/goals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ savingsGoal: 2000, largePurchaseThreshold: 300 }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<Record<string, unknown>>();
    expect(body.savingsGoal).toBe(2000);
    expect(body.largePurchaseThreshold).toBe(300);

    await app.close();
  });

  it('persists goals across server restarts', async () => {
    const { buildApp: build1 } = await import('../src/server.js');
    const app1 = await build1();

    await app1.inject({
      method: 'PUT',
      url: '/api/pets/goals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ savingsGoal: 5000 }),
    });
    await app1.close();

    const { buildApp: build2 } = await import('../src/server.js');
    const app2 = await build2();
    const res = await app2.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    const body = res.json<Record<string, unknown>>();
    expect((body.goals as Record<string, unknown>).savingsGoal).toBe(5000);
    await app2.close();
  });

  it('returns 400 for invalid goal values', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/pets/goals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ savingsGoal: -500 }),
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('GET /api/spending', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns an array', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);

    await app.close();
  });
});

describe('GET /health', () => {
  it('returns { ok: true } without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });
});

describe('auth edge cases', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns 401 with malformed Authorization header (no Bearer prefix)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/pets',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 401 with empty Bearer token', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/pets',
      headers: { authorization: 'Bearer ' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 401 with expired/invalid token', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/pets',
      headers: { authorization: 'Bearer totally-fake-token-xyz' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});

describe('PUT /api/pets/goals — boundary values', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('accepts zero-value goals (clearing a goal)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    // savingsGoal: 0 means "no goal set" — should either accept or return a
    // validation-specific error, never a 500.
    const res = await app.inject({
      method: 'PUT',
      url: '/api/pets/goals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ savingsGoal: 0 }),
    });
    expect([200, 400]).toContain(res.statusCode);
    await app.close();
  });

  it('rejects non-numeric goal values', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/pets/goals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ savingsGoal: 'not-a-number' }),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns 400 for malformed JSON body', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/pets/goals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: '{invalid json',
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('GET /api/spending — shape correctness', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns array of objects with expected shape when reactions exist', async () => {
    // Record a reaction first so the spending history is non-empty.
    const { recordReaction } = await import('../src/store/pet.js');
    await recordReaction(testUserId, 'large_purchase', {
      animation: 'concerned',
      sound: 'warning',
      led: 'amber',
      duration: 2000,
      reason: 'large_purchase ($500.00)',
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/spending', headers: authHeader() });
    expect(res.statusCode).toBe(200);

    const body = res.json<unknown[]>();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const first = body[0] as Record<string, unknown>;
    expect(typeof first.at).toBe('string');
    expect(typeof first.eventType).toBe('string');
    expect(typeof first.reason).toBe('string');
    expect(first.amount === null || typeof first.amount === 'string').toBe(true);

    await app.close();
  });
});
