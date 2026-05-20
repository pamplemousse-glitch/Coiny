import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase } from './db-helper.js';

describe('GET /api/pets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns pet state shape', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/pets' });
    expect(res.statusCode).toBe(200);

    const body = res.json<Record<string, unknown>>();
    expect(typeof body.healthScore).toBe('number');
    expect(typeof body.mood).toBe('number');
    expect(body).toHaveProperty('goals');
    expect(body).toHaveProperty('reactionHistory');

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
      headers: { 'content-type': 'application/json' },
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
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ savingsGoal: 5000 }),
    });
    await app1.close();

    // Simulate restart: build a fresh app against the same DB (no resetDatabase).
    const { buildApp: build2 } = await import('../src/server.js');
    const app2 = await build2();
    const res = await app2.inject({ method: 'GET', url: '/api/pets' });
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
      headers: { 'content-type': 'application/json' },
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

    const res = await app.inject({ method: 'GET', url: '/api/spending' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);

    await app.close();
  });
});

describe('GET /health', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns { ok: true }', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });
});
