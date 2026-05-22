import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/coinbase/client.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
}));

vi.mock('../src/coingecko/client.js', () => ({
  getPrices: vi.fn(),
}));

import { getAccounts, getTransactions } from '../src/coinbase/client.js';
import { getPrices } from '../src/coingecko/client.js';

const mockedGetAccounts = vi.mocked(getAccounts);
const mockedGetTransactions = vi.mocked(getTransactions);
const mockedGetPrices = vi.mocked(getPrices);

describe('GET /api/coinbase/status', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns connected: false when no connection exists', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coinbase/status', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ connected: false, mode: null });

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coinbase/status' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('POST /api/coinbase/connect/dev-key', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 409 when COINBASE_API_KEY_ID is not configured', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coinbase/connect/dev-key', headers: authHeader() });
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: string }>().error).toContain('COINBASE_API_KEY_ID');

    await app.close();
  });
});

describe('DELETE /api/coinbase/connect', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 204 even when no connection exists', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/coinbase/connect', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });

  it('removes existing connection and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const statusBefore = await app.inject({ method: 'GET', url: '/api/coinbase/status', headers: authHeader() });
    expect(statusBefore.json<{ connected: boolean }>().connected).toBe(true);

    const res = await app.inject({ method: 'DELETE', url: '/api/coinbase/connect', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    const statusAfter = await app.inject({ method: 'GET', url: '/api/coinbase/status', headers: authHeader() });
    expect(statusAfter.json<{ connected: boolean }>().connected).toBe(false);

    await app.close();
  });
});

describe('POST /api/coinbase/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns 409 when no Coinbase connection exists', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coinbase/sync', headers: authHeader() });
    expect(res.statusCode).toBe(409);

    await app.close();
  });

  it('returns { reacted: 0 } when getAccounts returns empty', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });

    mockedGetAccounts.mockResolvedValue([]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coinbase/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ reacted: 0 });

    await app.close();
  });

  it('reacts to a received transaction', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });

    mockedGetAccounts.mockResolvedValue([
      { account_id: 'acc-btc', currency: 'BTC', balance: { value: '1.0', currency: 'BTC' } },
    ]);
    mockedGetTransactions.mockResolvedValue({
      transactions: [
        { id: 'tx-001', type: 'receive', status: 'completed', amount: { amount: '0.5', currency: 'BTC' }, created_at: '2026-01-01T00:00:00Z' },
      ],
    });
    mockedGetPrices.mockResolvedValue(new Map([['bitcoin', { usd: 50000, change24h: 2 }]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coinbase/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ reacted: number }>().reacted).toBe(1);

    await app.close();
  });

  it('is idempotent — second sync for same tx returns reacted: 0', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });

    mockedGetAccounts.mockResolvedValue([
      { account_id: 'acc-btc', currency: 'BTC', balance: { value: '1.0', currency: 'BTC' } },
    ]);
    mockedGetTransactions.mockResolvedValue({
      transactions: [
        { id: 'tx-idem', type: 'receive', status: 'completed', amount: { amount: '0.1', currency: 'BTC' }, created_at: '2026-01-01T00:00:00Z' },
      ],
    });
    mockedGetPrices.mockResolvedValue(new Map());

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/coinbase/sync', headers: authHeader() });
    const second = await app.inject({ method: 'POST', url: '/api/coinbase/sync', headers: authHeader() });
    expect(second.json<{ reacted: number }>().reacted).toBe(0);

    await app.close();
  });

  it('fires a price-surge reaction when 24h change exceeds 10%', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });

    mockedGetAccounts.mockResolvedValue([
      { account_id: 'acc-sol', currency: 'SOL', balance: { value: '10', currency: 'SOL' } },
    ]);
    mockedGetTransactions.mockResolvedValue({
      transactions: [
        { id: 'tx-sol-001', type: 'buy', status: 'completed', amount: { amount: '10', currency: 'SOL' }, created_at: '2026-01-01T00:00:00Z' },
      ],
    });
    mockedGetPrices.mockResolvedValue(new Map([['solana', { usd: 200, change24h: 15 }]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coinbase/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ reacted: number }>().reacted).toBe(2);

    await app.close();
  });

  it('skips crypto_sent transactions (null reaction)', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });

    mockedGetAccounts.mockResolvedValue([
      { account_id: 'acc-eth', currency: 'ETH', balance: { value: '2', currency: 'ETH' } },
    ]);
    mockedGetTransactions.mockResolvedValue({
      transactions: [
        { id: 'tx-send-001', type: 'send', status: 'completed', amount: { amount: '-1', currency: 'ETH' }, created_at: '2026-01-01T00:00:00Z' },
      ],
    });
    mockedGetPrices.mockResolvedValue(new Map());

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coinbase/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ reacted: number }>().reacted).toBe(0);

    await app.close();
  });

  it('continues gracefully when getPrices throws', async () => {
    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });

    mockedGetAccounts.mockResolvedValue([
      { account_id: 'acc-btc2', currency: 'BTC', balance: { value: '0.1', currency: 'BTC' } },
    ]);
    mockedGetTransactions.mockResolvedValue({
      transactions: [
        { id: 'tx-noprice', type: 'receive', status: 'completed', amount: { amount: '0.1', currency: 'BTC' }, created_at: '2026-01-01T00:00:00Z' },
      ],
    });
    mockedGetPrices.mockRejectedValue(new Error('rate limit'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/coinbase/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ reacted: number }>().reacted).toBe(1);

    await app.close();
  });
});
