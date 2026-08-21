import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/coinbase/client.js', () => ({
  getSpotPrices: vi.fn(),
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
}));
vi.mock('../src/chains/bitcoin.js', () => ({
  getBitcoinBalance: vi.fn(),
}));
vi.mock('../src/chains/xrp.js', () => ({
  getXrpBalance: vi.fn(),
}));
vi.mock('../src/chains/stellar.js', () => ({
  getStellarBalance: vi.fn(),
}));
vi.mock('../src/chains/blockcypher.js', () => ({
  getBlockcypherBalance: vi.fn(),
}));
vi.mock('../src/chains/cosmos.js', () => ({
  getCosmosBalance: vi.fn(),
  getCosmosStakedBalance: vi.fn(),
}));
vi.mock('../src/chains/near.js', () => ({
  getNearBalance: vi.fn(),
}));
vi.mock('../src/chains/aptos.js', () => ({
  getAptosBalance: vi.fn(),
}));
vi.mock('../src/chains/sui.js', () => ({
  getSuiBalance: vi.fn(),
}));
vi.mock('../src/chains/polkadot.js', () => ({
  getPolkadotBalance: vi.fn(),
  getPolkadotStakedBalance: vi.fn(),
}));
vi.mock('../src/chains/hedera.js', () => ({
  getHederaBalance: vi.fn(),
}));

import { getBitcoinBalance } from '../src/chains/bitcoin.js';
import { getBlockcypherBalance } from '../src/chains/blockcypher.js';
import { getCosmosBalance, getCosmosStakedBalance } from '../src/chains/cosmos.js';
import { getPolkadotBalance, getPolkadotStakedBalance } from '../src/chains/polkadot.js';
import { getStellarBalance } from '../src/chains/stellar.js';
import { getXrpBalance } from '../src/chains/xrp.js';
import { getSpotPrices } from '../src/coinbase/client.js';

const mockedGetSpotPrices = vi.mocked(getSpotPrices);
const mockedGetBitcoinBalance = vi.mocked(getBitcoinBalance);
const mockedGetXrpBalance = vi.mocked(getXrpBalance);
const mockedGetStellarBalance = vi.mocked(getStellarBalance);
const mockedGetBlockcypherBalance = vi.mocked(getBlockcypherBalance);
const mockedGetCosmosBalance = vi.mocked(getCosmosBalance);
const mockedGetCosmosStaked = vi.mocked(getCosmosStakedBalance);
const mockedGetPolkadotBalance = vi.mocked(getPolkadotBalance);
const mockedGetPolkadotStaked = vi.mocked(getPolkadotStakedBalance);

describe('GET /api/chain-wallets', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Staking unknown by default, which is what every pre-0059 test assumed.
    mockedGetCosmosStaked.mockResolvedValue(null);
    await resetDatabase();
  });

  it('returns empty array when no wallets are registered', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/chain-wallets' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns registered wallets with null balance before first sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'bitcoin', address: 'bc1qtest' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ chain: string; address: string; lastBalanceUsd: number | null }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.chain).toBe('bitcoin');
    expect(body[0]?.address).toBe('bc1qtest');
    expect(body[0]?.lastBalanceUsd).toBeNull();

    await app.close();
  });
});

describe('POST /api/chain-wallets', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Staking unknown by default, which is what every pre-0059 test assumed.
    mockedGetCosmosStaked.mockResolvedValue(null);
    await resetDatabase();
  });

  it('returns 400 for missing chain', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/chain-wallets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'bc1qtest' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for unsupported chain', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/chain-wallets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ chain: 'unsupported_chain', address: 'SomeAddr' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 for missing address', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/chain-wallets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ chain: 'bitcoin' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('creates wallet and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/chain-wallets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ chain: 'bitcoin', address: 'bc1qtest123', label: 'Cold storage' }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true, chain: 'bitcoin', address: 'bc1qtest123' });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });

  it('silently ignores duplicate (chain, address) for same user', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const headers = { ...authHeader(), 'content-type': 'application/json' };
    const body = JSON.stringify({ chain: 'xrp', address: 'rXRPaddr' });

    await app.inject({ method: 'POST', url: '/api/chain-wallets', headers, body });
    const second = await app.inject({ method: 'POST', url: '/api/chain-wallets', headers, body });
    expect(second.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });

  it('accepts all supported chains', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const chains = [
      'bitcoin',
      'xrp',
      'stellar',
      'doge',
      'ltc',
      'bch',
      'cosmos',
      'osmosis',
      'near',
      'aptos',
      'sui',
      'hedera',
    ];
    for (const chain of chains) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/chain-wallets',
        headers: { ...authHeader(), 'content-type': 'application/json' },
        body: JSON.stringify({ chain, address: `addr-${chain}` }),
      });
      expect(res.statusCode).toBe(201);
    }

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    expect(list.json()).toHaveLength(chains.length);

    await app.close();
  });
});

describe('DELETE /api/chain-wallets/:chain/:address', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Staking unknown by default, which is what every pre-0059 test assumed.
    mockedGetCosmosStaked.mockResolvedValue(null);
    await resetDatabase();
  });

  it('removes existing wallet and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'bitcoin', address: 'bc1qdel' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/chain-wallets/bitcoin/bc1qdel',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when wallet does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/chain-wallets/bitcoin/bc1qnotexist',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/chain-wallets/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Staking unknown by default, which is what every pre-0059 test assumed.
    mockedGetCosmosStaked.mockResolvedValue(null);
    await resetDatabase();
  });

  it('returns updated: 0 when no wallets are registered', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/chain-wallets/sync',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 0 });

    await app.close();
  });

  it('updates balance and returns updated: 1 for bitcoin wallet', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'bitcoin', address: 'bc1qtest' });

    mockedGetBitcoinBalance.mockResolvedValue(0.5);
    mockedGetSpotPrices.mockResolvedValue(new Map([['BTC', 50000]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/chain-wallets/sync',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 1, unpriced: 0, unresolved: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    const wallet = list.json<{ lastBalanceUsd: number }[]>()[0];
    expect(wallet?.lastBalanceUsd).toBeCloseTo(25000, 0);

    await app.close();
  });

  it('updates balance and returns updated: 1 for xrp wallet', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'xrp', address: 'rTestXrp' });

    mockedGetXrpBalance.mockResolvedValue(100);
    mockedGetSpotPrices.mockResolvedValue(new Map([['XRP', 0.5]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/chain-wallets/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 1, unpriced: 0, unresolved: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    const wallet = list.json<{ lastBalanceUsd: number }[]>()[0];
    expect(wallet?.lastBalanceUsd).toBeCloseTo(50, 1);

    await app.close();
  });

  it('updates balance and returns updated: 1 for stellar wallet', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'stellar', address: 'GXLMTEST' });

    mockedGetStellarBalance.mockResolvedValue(1000);
    mockedGetSpotPrices.mockResolvedValue(new Map([['XLM', 0.1]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/chain-wallets/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 1, unpriced: 0, unresolved: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    const wallet = list.json<{ lastBalanceUsd: number }[]>()[0];
    expect(wallet?.lastBalanceUsd).toBeCloseTo(100, 1);

    await app.close();
  });

  it('updates balance and returns updated: 1 for doge wallet', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'doge', address: 'DTestDoge' });

    mockedGetBlockcypherBalance.mockResolvedValue(10000);
    mockedGetSpotPrices.mockResolvedValue(new Map([['DOGE', 0.08]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/chain-wallets/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 1, unpriced: 0, unresolved: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    const wallet = list.json<{ lastBalanceUsd: number }[]>()[0];
    expect(wallet?.lastBalanceUsd).toBeCloseTo(800, 0);

    await app.close();
  });

  // The regression this whole change exists for. Every chain client used to
  // answer 0 when it could not read the balance — missing key, upstream
  // outage, unrecognised shape — and 0 multiplied by a perfectly good price
  // was persisted over the last known good value. One expired vendor key was
  // enough to zero a user's position with no error raised anywhere.
  it('leaves the stored balance alone when the balance cannot be resolved', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({
      userId: testUserId,
      chain: 'doge',
      address: 'DTestDoge',
      lastBalanceUsd: '800',
    });

    // null is the client saying "I could not tell you", not "it is empty".
    mockedGetBlockcypherBalance.mockResolvedValue(null);
    mockedGetSpotPrices.mockResolvedValue(new Map([['DOGE', 0.08]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/chain-wallets/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 0, unpriced: 0, unresolved: 1 });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    const wallet = list.json<{ lastBalanceUsd: number }[]>()[0];
    expect(wallet?.lastBalanceUsd).toBeCloseTo(800, 0);

    await app.close();
  });

  it('updates balance and returns updated: 1 for cosmos wallet', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'cosmos', address: 'cosmos1test' });

    mockedGetCosmosBalance.mockResolvedValue(50);
    mockedGetSpotPrices.mockResolvedValue(new Map([['ATOM', 8]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/chain-wallets/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 1, unpriced: 0, unresolved: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    const wallet = list.json<{ lastBalanceUsd: number }[]>()[0];
    expect(wallet?.lastBalanceUsd).toBeCloseTo(400, 0);

    await app.close();
  });
});

describe('GET /api/net-worth — chainWallets field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Staking unknown by default, which is what every pre-0059 test assumed.
    mockedGetCosmosStaked.mockResolvedValue(null);
    await resetDatabase();
  });

  it('includes chainWallets: 0 in net-worth response when no wallets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ chainWallets: number }>();
    expect(body.chainWallets).toBe(0);

    await app.close();
  });

  it('sums lastBalanceUsd from chain wallets into chainWallets total', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db()
      .insert(chainWallets)
      .values([
        { userId: testUserId, chain: 'bitcoin', address: 'bc1qa', lastBalanceUsd: '45000.00' },
        { userId: testUserId, chain: 'xrp', address: 'rXrpA', lastBalanceUsd: '1200.50' },
        { userId: testUserId, chain: 'stellar', address: 'GXLM1', lastBalanceUsd: null },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ chainWallets: number; total: number }>();
    expect(body.chainWallets).toBeCloseTo(46200.5, 1);

    await app.close();
  });
});

describe('staked balances are counted and kept separate', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedGetCosmosStaked.mockResolvedValue(null);
    await resetDatabase();
  });

  // The understatement: ATOM staking runs around two thirds of supply, so the
  // bank balance alone was a fraction of a typical holder's position.
  it('adds staked ATOM to the total and records the split', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'cosmos', address: 'cosmos1s' });

    mockedGetCosmosBalance.mockResolvedValue(100); // liquid
    mockedGetCosmosStaked.mockResolvedValue(300); // delegated + rewards
    mockedGetSpotPrices.mockResolvedValue(new Map([['ATOM', 5]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/chain-wallets/sync', headers: authHeader() });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    const w = list.json<{ lastBalanceUsd: number; lastStakedUsd: number }[]>()[0];

    // 400 ATOM at $5. Before this, only the 100 liquid were counted.
    expect(w?.lastBalanceUsd).toBeCloseTo(2000, 0);
    // The split survives rather than being merged away.
    expect(w?.lastStakedUsd).toBeCloseTo(1500, 0);

    await app.close();
  });

  // Unknown is not zero, the same rule as the balance itself.
  it('records staking as null when the staking call cannot answer', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'cosmos', address: 'cosmos1u' });

    mockedGetCosmosBalance.mockResolvedValue(100);
    mockedGetCosmosStaked.mockResolvedValue(null);
    mockedGetSpotPrices.mockResolvedValue(new Map([['ATOM', 5]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/chain-wallets/sync', headers: authHeader() });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    const w = list.json<{ lastBalanceUsd: number; lastStakedUsd: number | null }[]>()[0];

    // The liquid balance still stands; staking is recorded as unknown.
    expect(w?.lastBalanceUsd).toBeCloseTo(500, 0);
    expect(w?.lastStakedUsd).toBeNull();

    await app.close();
  });

  // A chain whose client cannot read staking must not report zero staked.
  it('reports staking as unknown for a chain with no staking support', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'bitcoin', address: 'bc1q' });

    mockedGetBitcoinBalance.mockResolvedValue(1);
    mockedGetSpotPrices.mockResolvedValue(new Map([['BTC', 60000]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({ method: 'POST', url: '/api/chain-wallets/sync', headers: authHeader() });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    expect(list.json<{ lastStakedUsd: number | null }[]>()[0]?.lastStakedUsd).toBeNull();

    await app.close();
  });
});

// Polkadot is the exception to the staking rule. Subscan's `balance` is
// free + reserved, and staking is a hold inside reserved, so the stake is
// ALREADY in the total. Adding it — as Cosmos and Solana correctly do — would
// count it twice.
describe('Polkadot staking is a split of the total, not an addition to it', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedGetCosmosStaked.mockResolvedValue(null);
    mockedGetPolkadotStaked.mockResolvedValue(null);
    await resetDatabase();
  });

  it('does not add bonded DOT on top of the reported balance', async () => {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db().insert(chainWallets).values({ userId: testUserId, chain: 'polkadot', address: '1dot' });

    // 33.69 total, of which 5.69 is bonded — the real figures from a live
    // Asset Hub staker.
    mockedGetPolkadotBalance.mockResolvedValue(33.69);
    mockedGetPolkadotStaked.mockResolvedValue(5.69);
    mockedGetSpotPrices.mockResolvedValue(new Map([['DOT', 10]]));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await app.inject({ method: 'POST', url: '/api/chain-wallets/sync', headers: authHeader() });

    const list = await app.inject({ method: 'GET', url: '/api/chain-wallets', headers: authHeader() });
    const w = list.json<{ lastBalanceUsd: number; lastStakedUsd: number }[]>()[0];

    // 33.69 x $10 = $336.90. NOT $393.80, which is what adding would give.
    expect(w?.lastBalanceUsd).toBeCloseTo(336.9, 1);
    // The staked figure is still reported, as a subset.
    expect(w?.lastStakedUsd).toBeCloseTo(56.9, 1);

    await app.close();
  });
});
