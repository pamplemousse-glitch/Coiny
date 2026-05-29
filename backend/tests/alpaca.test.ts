import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/alpaca/client.js', () => ({
  getEquityUsd: vi.fn(),
  AlpacaError: class AlpacaError extends Error {
    constructor(
      message: string,
      public readonly status?: number,
    ) {
      super(message);
      this.name = 'AlpacaError';
    }
  },
}));

import { AlpacaError, getEquityUsd } from '../src/alpaca/client.js';

const mockedGetEquityUsd = vi.mocked(getEquityUsd);

describe('POST /api/alpaca/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('stores credentials and returns ok', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/alpaca/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ apiKeyId: 'PKTEST123', apiSecretKey: 'secret', env: 'paper' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    await app.close();
  });

  it('defaults env to paper when not provided', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/alpaca/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ apiKeyId: 'PKTEST123', apiSecretKey: 'secret' }),
    });
    expect(res.statusCode).toBe(200);

    await app.close();
  });

  it('returns 400 for missing credentials', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/alpaca/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ apiKeyId: 'PKTEST123' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for invalid env value', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/alpaca/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ apiKeyId: 'PKTEST123', apiSecretKey: 'secret', env: 'staging' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/alpaca/connect',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKeyId: 'PKTEST123', apiSecretKey: 'secret' }),
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /api/alpaca/status', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/alpaca/status', headers: authHeader() });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('returns status with null equity before first sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { alpacaConnections } = await import('../src/db/schema.js');
    await db()
      .insert(alpacaConnections)
      .values({ userId: testUserId, apiKeyId: 'enc_key', apiSecretKey: 'enc_secret', env: 'paper' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/alpaca/status', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ env: string; lastEquityUsd: number | null }>();
    expect(body.env).toBe('paper');
    expect(body.lastEquityUsd).toBeNull();

    await app.close();
  });
});

describe('POST /api/alpaca/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/alpaca/sync', headers: authHeader() });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('fetches equity and caches it', async () => {
    const { db } = await import('../src/db/client.js');
    const { alpacaConnections } = await import('../src/db/schema.js');
    await db()
      .insert(alpacaConnections)
      .values({ userId: testUserId, apiKeyId: 'enc_key', apiSecretKey: 'enc_secret', env: 'paper' });

    mockedGetEquityUsd.mockResolvedValue(12500.75);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/alpaca/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ equity: number }>().equity).toBeCloseTo(12500.75, 2);

    const status = await app.inject({ method: 'GET', url: '/api/alpaca/status', headers: authHeader() });
    expect(status.json<{ lastEquityUsd: number }>().lastEquityUsd).toBeCloseTo(12500.75, 2);

    await app.close();
  });

  it('returns 401 when API credentials are invalid', async () => {
    const { db } = await import('../src/db/client.js');
    const { alpacaConnections } = await import('../src/db/schema.js');
    await db()
      .insert(alpacaConnections)
      .values({ userId: testUserId, apiKeyId: 'enc_key', apiSecretKey: 'enc_secret', env: 'paper' });

    mockedGetEquityUsd.mockRejectedValue(new AlpacaError('Invalid credentials', 401));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/alpaca/sync', headers: authHeader() });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('DELETE /api/alpaca/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes connection and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { alpacaConnections } = await import('../src/db/schema.js');
    await db()
      .insert(alpacaConnections)
      .values({ userId: testUserId, apiKeyId: 'enc_key', apiSecretKey: 'enc_secret', env: 'paper' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/alpaca/connect', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const status = await app.inject({ method: 'GET', url: '/api/alpaca/status', headers: authHeader() });
    expect(status.statusCode).toBe(404);

    await app.close();
  });
});

describe('GET /api/net-worth — alpaca field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes alpaca: 0 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ alpaca: number }>().alpaca).toBe(0);

    await app.close();
  });

  it('includes cached equity in alpaca total', async () => {
    const { db } = await import('../src/db/client.js');
    const { alpacaConnections } = await import('../src/db/schema.js');
    await db()
      .insert(alpacaConnections)
      .values({ userId: testUserId, apiKeyId: 'enc', apiSecretKey: 'enc', env: 'paper', lastEquityUsd: '8750.50' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ alpaca: number }>().alpaca).toBeCloseTo(8750.5, 2);

    await app.close();
  });
});
