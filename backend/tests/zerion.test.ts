import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/zerion/client.js', () => ({
  getPortfolio: vi.fn(),
  getTransactions: vi.fn(),
}));

import { getPortfolio, getTransactions } from '../src/zerion/client.js';

const mockedGetPortfolio = vi.mocked(getPortfolio);
const mockedGetTransactions = vi.mocked(getTransactions);

describe('GET /api/zerion/wallets', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no wallets are registered', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/wallets', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/wallets' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('POST /api/zerion/wallets', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 400 for missing address', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/zerion/wallets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('adds a wallet and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/zerion/wallets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ address: '0xabc123', label: 'Hot wallet' }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ ok: boolean; address: string }>().address).toBe('0xabc123');

    const list = await app.inject({ method: 'GET', url: '/api/zerion/wallets', headers: authHeader() });
    expect(list.json<unknown[]>()).toHaveLength(1);

    await app.close();
  });

  it('silently ignores duplicate wallet (onConflictDoNothing)', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const body = JSON.stringify({ address: '0xdup' });
    const headers = { ...authHeader(), 'content-type': 'application/json' };

    await app.inject({ method: 'POST', url: '/api/zerion/wallets', headers, body });
    const second = await app.inject({ method: 'POST', url: '/api/zerion/wallets', headers, body });
    expect(second.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/zerion/wallets', headers: authHeader() });
    expect(list.json<unknown[]>()).toHaveLength(1);

    await app.close();
  });
});

describe('DELETE /api/zerion/wallets/:address', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes a registered wallet and returns 204', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const headers = { ...authHeader(), 'content-type': 'application/json' };

    await app.inject({
      method: 'POST',
      url: '/api/zerion/wallets',
      headers,
      body: JSON.stringify({ address: '0xdel' }),
    });

    const res = await app.inject({ method: 'DELETE', url: '/api/zerion/wallets/0xdel', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/zerion/wallets', headers: authHeader() });
    expect(list.json<unknown[]>()).toHaveLength(0);

    await app.close();
  });
});

describe('GET /api/zerion/portfolio', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns { total_usd: 0, wallets: [] } when no wallets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/portfolio', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ total_usd: 0, wallets: [] });

    await app.close();
  });

  it('aggregates portfolio across wallets', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xwlt1', label: 'Main' });

    mockedGetPortfolio.mockResolvedValue({ total_usd: 12500, change_1d_pct: 0.015 });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/portfolio', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      total_usd: number;
      wallets: { address: string; label: string | null; total_usd: number }[];
    }>();
    expect(body.total_usd).toBe(12500);
    expect(body.wallets[0]?.address).toBe('0xwlt1');
    expect(body.wallets[0]?.label).toBe('Main');

    await app.close();
  });

  it('treats a failed wallet fetch as 0 rather than erroring', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xfail', label: null });

    mockedGetPortfolio.mockRejectedValue(new Error('Zerion unreachable'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/portfolio', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ total_usd: number }>().total_usd).toBe(0);

    await app.close();
  });
});

describe('POST /api/zerion/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns { reacted: 0 } when no wallets are registered', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/zerion/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ reacted: 0 });

    await app.close();
  });

  it('reacts to an inbound "receive" transaction', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xsync1', label: null });

    mockedGetTransactions.mockResolvedValue({
      transactions: [
        {
          id: 'ztx-001',
          type: 'receive',
          status: 'confirmed',
          quantity_usd: 500,
          asset_symbol: 'ETH',
          created_at: '2026-01-01T00:00:00Z',
          direction: 'in',
        },
      ],
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/zerion/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ reacted: number }>().reacted).toBe(1);

    await app.close();
  });

  it('reacts to a defi_yield (trade in) transaction', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xdefi', label: null });

    mockedGetTransactions.mockResolvedValue({
      transactions: [
        {
          id: 'ztx-yield-001',
          type: 'trade',
          status: 'confirmed',
          quantity_usd: 50,
          asset_symbol: 'USDC',
          created_at: '2026-01-01T00:00:00Z',
          direction: 'in',
        },
      ],
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/zerion/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ reacted: number }>().reacted).toBe(1);

    await app.close();
  });

  it('skips outbound transactions', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xout', label: null });

    mockedGetTransactions.mockResolvedValue({
      transactions: [
        {
          id: 'ztx-out-001',
          type: 'send',
          status: 'confirmed',
          quantity_usd: 100,
          asset_symbol: 'ETH',
          created_at: '2026-01-01T00:00:00Z',
          direction: 'out',
        },
      ],
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/zerion/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ reacted: number }>().reacted).toBe(0);

    await app.close();
  });

  it('is idempotent — second sync for same tx returns reacted: 0', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xidem', label: null });

    mockedGetTransactions.mockResolvedValue({
      transactions: [
        {
          id: 'ztx-idem',
          type: 'receive',
          status: 'confirmed',
          quantity_usd: 10,
          asset_symbol: 'BTC',
          created_at: '2026-01-01T00:00:00Z',
          direction: 'in',
        },
      ],
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/zerion/sync', headers: authHeader() });
    const second = await app.inject({ method: 'POST', url: '/api/zerion/sync', headers: authHeader() });
    expect(second.json<{ reacted: number }>().reacted).toBe(0);

    await app.close();
  });
});
