import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/zerion/client.js', () => ({
  getPortfolio: vi.fn(),
  getPositionsPage: vi.fn(),
  getTransactions: vi.fn(),
}));

import { getPortfolio, getPositionsPage, getTransactions } from '../src/zerion/client.js';

const mockedGetPortfolio = vi.mocked(getPortfolio);
const mockedGetPositionsPage = vi.mocked(getPositionsPage);
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

    mockedGetPortfolio.mockResolvedValue({
      total_usd: 12500,
      change_1d_abs: null,
      change_1d_pct: 0.015,
      breakdown: null,
    });

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

describe('spam tokens do not inflate the DeFi total', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  function pos(id: string, value: number | null) {
    return {
      id,
      symbol: id.toUpperCase(),
      name: id,
      quantity: 1,
      value_usd: value,
      verified: null,
      isTrash: false,
      chainId: 'ethereum',
      tokenAddress: null,
    };
  }

  // The defect. Anyone can mint a token, name it USDC, seed a tiny pool to peg
  // it at $1, and airdrop a user 500,000 of them. Zerion's portfolio endpoint
  // takes no trash filter, so its total counts that. The positions endpoint
  // does filter it, so the total is built from there instead.
  it('uses the spam-filtered position sum, not the portfolio total', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xspam', label: null });

    // Vendor total includes $500,000 of airdropped junk.
    mockedGetPortfolio.mockResolvedValue({
      total_usd: 501_000,
      change_1d_abs: null,
      change_1d_pct: null,
      breakdown: { wallet: 1000, deposited: 0, borrowed: 0, locked: 0, staked: 0 },
    });
    // Real holdings, spam already excluded by filter[trash]=only_non_trash.
    mockedGetPositionsPage.mockResolvedValue({ positions: [pos('eth', 1000)], truncated: false });

    const { refreshDefi } = await import('../src/networth/refresh.js');
    expect(await refreshDefi(testUserId)).toBe('refreshed');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    const body = res.json<{ defi: number; accounts: { defi: { spamFilteredUSD: number } } }>();

    expect(body.defi).toBeCloseTo(1000, 0);
    expect(body.accounts.defi.spamFilteredUSD).toBeCloseTo(500_000, 0);

    await app.close();
  });

  // A short list summed as if whole undercounts. Better the vendor's complete
  // but spam-inclusive total than a silently partial one.
  it('falls back to the portfolio total when the position list is truncated', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xbig', label: null });

    mockedGetPortfolio.mockResolvedValue({
      total_usd: 25_000,
      change_1d_abs: null,
      change_1d_pct: null,
      breakdown: null,
    });
    mockedGetPositionsPage.mockResolvedValue({ positions: [pos('eth', 10)], truncated: true });

    const { refreshDefi } = await import('../src/networth/refresh.js');
    await refreshDefi(testUserId);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.json<{ defi: number }>().defi).toBeCloseTo(25_000, 0);

    await app.close();
  });

  // Caught by the scheduler suite when the positions mock was missing: the
  // whole class failed and the total read NaN. The better number being
  // unavailable must never make the figure worse than it was before spam
  // filtering existed.
  it('falls back to the portfolio total when the positions call throws', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xthrow', label: null });

    mockedGetPortfolio.mockResolvedValue({
      total_usd: 7777,
      change_1d_abs: null,
      change_1d_pct: null,
      breakdown: null,
    });
    mockedGetPositionsPage.mockRejectedValue(new Error('zerion 500'));

    const { refreshDefi } = await import('../src/networth/refresh.js');
    expect(await refreshDefi(testUserId)).toBe('refreshed');

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.json<{ defi: number }>().defi).toBeCloseTo(7777, 0);

    await app.close();
  });

  it('excludes an unpriced position rather than counting it as zero', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xun', label: null });

    mockedGetPortfolio.mockResolvedValue({
      total_usd: 100,
      change_1d_abs: null,
      change_1d_pct: null,
      breakdown: null,
    });
    mockedGetPositionsPage.mockResolvedValue({
      positions: [pos('eth', 100), pos('mystery', null)],
      truncated: false,
    });

    const { refreshDefi } = await import('../src/networth/refresh.js');
    await refreshDefi(testUserId);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    const body = res.json<{ defi: number; accounts: { defi: { unpricedCount: number } } }>();

    expect(body.defi).toBeCloseTo(100, 0);
    expect(body.accounts.defi.unpricedCount).toBe(1);

    await app.close();
  });

  // #276 parsed this and the payload was written as null, so nothing could
  // tell "$40,000" from "$2,000 and $38,000 you cannot touch".
  it('surfaces the five-way position breakdown', async () => {
    const { db } = await import('../src/db/client.js');
    const { zerionWallets } = await import('../src/db/schema.js');
    await db().insert(zerionWallets).values({ userId: testUserId, address: '0xbd', label: null });

    mockedGetPortfolio.mockResolvedValue({
      total_usd: 40_000,
      change_1d_abs: null,
      change_1d_pct: null,
      breakdown: { wallet: 2000, deposited: 0, borrowed: 0, locked: 0, staked: 38_000 },
    });
    mockedGetPositionsPage.mockResolvedValue({ positions: [pos('eth', 40_000)], truncated: false });

    const { refreshDefi } = await import('../src/networth/refresh.js');
    await refreshDefi(testUserId);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    const bd = res.json<{ accounts: { defi: { breakdown: { staked: number; wallet: number } } } }>().accounts.defi
      .breakdown;

    expect(bd).toMatchObject({ wallet: 2000, staked: 38_000 });

    await app.close();
  });
});
