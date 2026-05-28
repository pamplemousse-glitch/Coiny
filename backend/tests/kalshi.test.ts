import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase } from './db-helper.js';

vi.mock('../src/kalshi/client.js', () => ({
  getPortfolioBalance: vi.fn(),
  decodePrivateKey: vi.fn((b64: string) => Buffer.from(b64, 'base64').toString('utf8')),
  KalshiError: class KalshiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

import { getPortfolioBalance } from '../src/kalshi/client.js';

const mockedGetPortfolioBalance = vi.mocked(getPortfolioBalance);

const TEST_KEY_ID = 'test-key-id-uuid';
const TEST_PRIVATE_KEY_B64 = Buffer.from(
  '-----BEGIN RSA PRIVATE KEY-----\nFAKE\n-----END RSA PRIVATE KEY-----\n',
).toString('base64');

describe('POST /api/kalshi/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing keyId', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/kalshi/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ privateKeyBase64: TEST_PRIVATE_KEY_B64 }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('stores connection and returns portfolioUsd on success', async () => {
    mockedGetPortfolioBalance.mockResolvedValue(250.5);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/kalshi/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ keyId: TEST_KEY_ID, privateKeyBase64: TEST_PRIVATE_KEY_B64 }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean; portfolioUsd: number }>()).toMatchObject({ ok: true, portfolioUsd: 250.5 });

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/kalshi/connect',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ keyId: TEST_KEY_ID, privateKeyBase64: TEST_PRIVATE_KEY_B64 }),
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /api/kalshi/status', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/kalshi/status', headers: authHeader() });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ connected: boolean }>().connected).toBe(false);

    await app.close();
  });

  it('returns status after connect', async () => {
    mockedGetPortfolioBalance.mockResolvedValue(300);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/kalshi/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ keyId: TEST_KEY_ID, privateKeyBase64: TEST_PRIVATE_KEY_B64 }),
    });

    const res = await app.inject({ method: 'GET', url: '/api/kalshi/status', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ connected: boolean; keyId: string }>()).toMatchObject({
      connected: true,
      keyId: TEST_KEY_ID,
    });

    await app.close();
  });
});

describe('POST /api/kalshi/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 404 when not connected', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/kalshi/sync', headers: authHeader() });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('syncs and returns updated portfolioUsd', async () => {
    mockedGetPortfolioBalance.mockResolvedValueOnce(250).mockResolvedValueOnce(275);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/kalshi/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ keyId: TEST_KEY_ID, privateKeyBase64: TEST_PRIVATE_KEY_B64 }),
    });

    const res = await app.inject({ method: 'POST', url: '/api/kalshi/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ portfolioUsd: number }>().portfolioUsd).toBe(275);

    await app.close();
  });
});

describe('DELETE /api/kalshi/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes connection', async () => {
    mockedGetPortfolioBalance.mockResolvedValue(200);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/kalshi/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ keyId: TEST_KEY_ID, privateKeyBase64: TEST_PRIVATE_KEY_B64 }),
    });

    const del = await app.inject({ method: 'DELETE', url: '/api/kalshi/connect', headers: authHeader() });
    expect(del.statusCode).toBe(204);

    const status = await app.inject({ method: 'GET', url: '/api/kalshi/status', headers: authHeader() });
    expect(status.statusCode).toBe(404);

    await app.close();
  });
});

describe('GET /api/net-worth — kalshi rollup', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('includes kalshi portfolio in total', async () => {
    mockedGetPortfolioBalance.mockResolvedValue(500);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/kalshi/connect',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ keyId: TEST_KEY_ID, privateKeyBase64: TEST_PRIVATE_KEY_B64 }),
    });

    const nw = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(nw.statusCode).toBe(200);
    const body = nw.json<{ kalshi: number; connections: { kalshi: boolean } }>();
    expect(body.kalshi).toBe(500);
    expect(body.connections.kalshi).toBe(true);

    await app.close();
  });
});
