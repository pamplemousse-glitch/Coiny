import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase } from './db-helper.js';

vi.mock('../src/kraken/client.js', () => ({
  getBalance: vi.fn(),
  getTotalUsd: vi.fn(),
}));

import { getBalance, getTotalUsd } from '../src/kraken/client.js';

const mockedGetBalance = vi.mocked(getBalance);
const mockedGetTotalUsd = vi.mocked(getTotalUsd);

const fakeBalances: Record<string, string> = {
  XXBT: '0.5',
  ZUSD: '1000.00',
};

describe('POST /api/kraken/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('stores the credentials and returns ok', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/kraken/connect',
      headers: authHeader(),
      payload: { apiKey: 'test-api-key', privateKey: 'dGVzdC1wcml2YXRlLWtleQ==' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean }>().ok).toBe(true);

    await app.close();
  });

  it('returns 400 without apiKey', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/kraken/connect',
      headers: authHeader(),
      payload: { privateKey: 'dGVzdA==' },
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 without privateKey', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/kraken/connect',
      headers: authHeader(),
      payload: { apiKey: 'test-api-key' },
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/kraken/connect',
      payload: { apiKey: 'test-api-key', privateKey: 'dGVzdA==' },
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /api/kraken/balances', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/kraken/balances', headers: authHeader() });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('returns balances when connected', async () => {
    mockedGetBalance.mockResolvedValue(fakeBalances);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/kraken/connect',
      headers: authHeader(),
      payload: { apiKey: 'test-api-key', privateKey: 'dGVzdA==' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/kraken/balances', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<Record<string, string>>();
    expect(body['XXBT']).toBe('0.5');
    expect(body['ZUSD']).toBe('1000.00');

    await app.close();
  });
});

describe('POST /api/kraken/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/kraken/sync', headers: authHeader() });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('caches total USD and returns it', async () => {
    mockedGetTotalUsd.mockResolvedValue(42500.75);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/kraken/connect',
      headers: authHeader(),
      payload: { apiKey: 'test-api-key', privateKey: 'dGVzdA==' },
    });

    const res = await app.inject({ method: 'POST', url: '/api/kraken/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ total: number }>().total).toBe(42500.75);

    await app.close();
  });
});

describe('DELETE /api/kraken/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes the connection and returns 204', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/kraken/connect',
      headers: authHeader(),
      payload: { apiKey: 'test-api-key', privateKey: 'dGVzdA==' },
    });

    const res = await app.inject({ method: 'DELETE', url: '/api/kraken/connect', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    // verify it's gone
    const check = await app.inject({ method: 'GET', url: '/api/kraken/balances', headers: authHeader() });
    expect(check.statusCode).toBe(404);

    await app.close();
  });
});
