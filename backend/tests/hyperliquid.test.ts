import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase } from './db-helper.js';

vi.mock('../src/hyperliquid/client.js', () => ({
  getHyperliquidState: vi.fn(),
}));

import { getHyperliquidState } from '../src/hyperliquid/client.js';

const mockedGetHyperliquidState = vi.mocked(getHyperliquidState);

describe('GET /api/hyperliquid/accounts', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns empty array when no accounts registered', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/hyperliquid/accounts', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/hyperliquid/accounts' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('POST /api/hyperliquid/accounts', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('adds an account and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/hyperliquid/accounts',
      headers: authHeader(),
      payload: { address: '0xabc123', label: 'main' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true, address: '0xabc123' });

    const list = await app.inject({ method: 'GET', url: '/api/hyperliquid/accounts', headers: authHeader() });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].address).toBe('0xabc123');
    expect(list.json()[0].label).toBe('main');

    await app.close();
  });

  it('silently ignores duplicate address', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/hyperliquid/accounts',
      headers: authHeader(),
      payload: { address: '0xdup' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/hyperliquid/accounts',
      headers: authHeader(),
      payload: { address: '0xdup' },
    });

    const list = await app.inject({ method: 'GET', url: '/api/hyperliquid/accounts', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });

  it('returns 400 for missing address', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/hyperliquid/accounts',
      headers: authHeader(),
      payload: {},
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe('DELETE /api/hyperliquid/accounts/:address', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('removes an account and returns 204', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/hyperliquid/accounts',
      headers: authHeader(),
      payload: { address: '0xdel' },
    });
    const del = await app.inject({ method: 'DELETE', url: '/api/hyperliquid/accounts/0xdel', headers: authHeader() });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/hyperliquid/accounts', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });
});

describe('POST /api/hyperliquid/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('returns updated: 0 when no accounts registered', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/hyperliquid/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 0 });

    await app.close();
  });

  it('persists perps account value plus spot balances', async () => {
    // The stored figure is the address's whole worth, not just perps. Spot
    // balances used to be counted nowhere.
    mockedGetHyperliquidState.mockResolvedValue({
      accountValue: 4200,
      positions: [],
      spotBalances: [{ coin: 'USDC', total: 800, valueUsd: 800 }],
      spotValueUsd: 800,
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/hyperliquid/accounts',
      headers: authHeader(),
      payload: { address: '0xabc' },
    });
    const sync = await app.inject({ method: 'POST', url: '/api/hyperliquid/sync', headers: authHeader() });
    expect(sync.json()).toEqual({ updated: 1 });

    const list = await app.inject({ method: 'GET', url: '/api/hyperliquid/accounts', headers: authHeader() });
    expect(list.json()[0].lastAccountValueUsd).toBe(5000); // 4200 perps + 800 spot
    expect(list.json()[0].lastSyncedAt).not.toBeNull();

    await app.close();
  });

  it('calls getHyperliquidState with the stored address', async () => {
    mockedGetHyperliquidState.mockResolvedValue({
      accountValue: 0,
      positions: [],
      spotBalances: [],
      spotValueUsd: 0,
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/hyperliquid/accounts',
      headers: authHeader(),
      payload: { address: '0xdeadbeef' },
    });
    await app.inject({ method: 'POST', url: '/api/hyperliquid/sync', headers: authHeader() });

    expect(mockedGetHyperliquidState).toHaveBeenCalledWith('0xdeadbeef');

    await app.close();
  });
});
