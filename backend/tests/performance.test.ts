import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/coinbase/client.js', () => ({
  getPortfolioSummary: vi.fn(),
  getAccounts: vi.fn(),
  getSpotPrices: vi.fn(),
  getTransactions: vi.fn(),
  classifyTransaction: vi.fn(),
}));
vi.mock('../src/zerion/client.js', () => ({
  getPnl: vi.fn(),
  getDeFiPositions: vi.fn(),
  getPortfolio: vi.fn(),
  getTransactions: vi.fn(),
  getPositions: vi.fn(),
}));

import { getPortfolioSummary } from '../src/coinbase/client.js';
import { getDeFiPositions, getPnl } from '../src/zerion/client.js';

const mockedGetPortfolioSummary = vi.mocked(getPortfolioSummary);
const mockedGetPnl = vi.mocked(getPnl);
const mockedGetDeFiPositions = vi.mocked(getDeFiPositions);

describe('GET /api/coinbase/performance', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns all nulls when getPortfolioSummary returns null', async () => {
    mockedGetPortfolioSummary.mockResolvedValue(null);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coinbase/performance', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ unrealizedPnl: null, totalCash: null, totalCrypto: null });

    await app.close();
  });

  it('returns performance data when connected', async () => {
    mockedGetPortfolioSummary.mockResolvedValue({
      unrealizedPnl: 1234.56,
      totalCash: 500.0,
      totalCrypto: 9000.0,
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coinbase/performance', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ unrealizedPnl: number; totalCash: number; totalCrypto: number }>();
    expect(body.unrealizedPnl).toBe(1234.56);
    expect(body.totalCash).toBe(500.0);
    expect(body.totalCrypto).toBe(9000.0);

    await app.close();
  });

  it('returns all nulls when getPortfolioSummary throws', async () => {
    mockedGetPortfolioSummary.mockRejectedValue(new Error('Coinbase unreachable'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coinbase/performance', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ unrealizedPnl: null, totalCash: null, totalCrypto: null });

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/coinbase/performance' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /api/zerion/pnl', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns zeroed structure when no wallets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/pnl', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ unrealizedGain: 0, realizedGain: 0, totalGain: 0, wallets: [] });

    await app.close();
  });

  it('aggregates PnL across wallets', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db()
      .insert(zerionWallets)
      .values([
        { userId: testUserId, address: '0xwlt1', label: 'Hot' },
        { userId: testUserId, address: '0xwlt2', label: null },
      ]);

    mockedGetPnl
      .mockResolvedValueOnce({ unrealized_gain: 100, realized_gain: 200, total_gain: 300 })
      .mockResolvedValueOnce({ unrealized_gain: 50, realized_gain: null, total_gain: 50 });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/pnl', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      unrealizedGain: number;
      realizedGain: number;
      totalGain: number;
      wallets: Array<{
        address: string;
        label: string | null;
        unrealizedGain: number;
        realizedGain: number;
        totalGain: number;
      }>;
    }>();
    expect(body.unrealizedGain).toBe(150);
    expect(body.realizedGain).toBe(200);
    expect(body.totalGain).toBe(350);
    expect(body.wallets).toHaveLength(2);
    expect(body.wallets[0]?.address).toBe('0xwlt1');
    expect(body.wallets[0]?.label).toBe('Hot');
    expect(body.wallets[1]?.address).toBe('0xwlt2');
    expect(body.wallets[1]?.realizedGain).toBe(0);

    await app.close();
  });

  it('treats a failed wallet pnl fetch as zeroed rather than erroring', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xfail', label: null });

    mockedGetPnl.mockRejectedValue(new Error('Zerion unreachable'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/pnl', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ unrealizedGain: number; totalGain: number }>();
    expect(body.unrealizedGain).toBe(0);
    expect(body.totalGain).toBe(0);

    await app.close();
  });
});

describe('GET /api/zerion/defi-positions', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty positions when no wallets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/defi-positions', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ positions: [] });

    await app.close();
  });

  it('returns combined positions from multiple wallets', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db()
      .insert(zerionWallets)
      .values([
        { userId: testUserId, address: '0xdefi1', label: null },
        { userId: testUserId, address: '0xdefi2', label: null },
      ]);

    mockedGetDeFiPositions
      .mockResolvedValueOnce([{ id: 'pos-1', symbol: 'ETH', name: 'Ethereum', quantity: 1.5, value_usd: 3000 }])
      .mockResolvedValueOnce([
        { id: 'pos-2', symbol: 'USDC', name: 'USD Coin', quantity: 500, value_usd: 500 },
        { id: 'pos-3', symbol: 'BTC', name: 'Bitcoin', quantity: 0.01, value_usd: 600 },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/defi-positions', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      positions: Array<{
        id: string;
        symbol: string;
        name: string;
        quantity: number;
        valueUsd: number;
        walletAddress: string;
      }>;
    }>();
    expect(body.positions).toHaveLength(3);
    expect(body.positions[0]?.id).toBe('pos-1');
    expect(body.positions[0]?.walletAddress).toBe('0xdefi1');
    expect(body.positions[0]?.valueUsd).toBe(3000);
    expect(body.positions[1]?.walletAddress).toBe('0xdefi2');
    expect(body.positions[2]?.symbol).toBe('BTC');

    await app.close();
  });

  it('skips wallets where getDeFiPositions throws', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xerr', label: null });

    mockedGetDeFiPositions.mockRejectedValue(new Error('Zerion unreachable'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/zerion/defi-positions', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ positions: unknown[] }>().positions).toHaveLength(0);

    await app.close();
  });
});
