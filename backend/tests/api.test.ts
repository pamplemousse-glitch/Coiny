import { describe, it, expect } from 'vitest';

process.env['TELLER_APPLICATION_ID'] = 'app_test';
process.env['TELLER_CERT_PATH'] = '/dev/null';
process.env['TELLER_KEY_PATH'] = '/dev/null';
process.env['TELLER_SIGNING_SECRET'] = 'test-secret';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

describe('GET /api/pets', () => {
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
  it('returns { ok: true }', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });
});
