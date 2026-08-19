import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/coinbase/client.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getSpotPrices: vi.fn(),
  getPortfolioSummary: vi.fn(),
}));

// The chain read is stubbed so the balance is a fixed input and the only
// variable under test is whether a price was available.
vi.mock('../src/chains/bitcoin.js', () => ({
  getBitcoinBalance: vi.fn(async () => 0.5),
}));

import { getAccounts, getSpotPrices } from '../src/coinbase/client.js';

const mockedGetAccounts = vi.mocked(getAccounts);
const mockedGetSpotPrices = vi.mocked(getSpotPrices);

beforeEach(async () => {
  vi.resetAllMocks();
  await resetDatabase();
});

// An asset we cannot price is not an asset worth nothing.
//
// Both sites below used to coerce a missing price to 0. `getSpotPrices` never
// throws (its contract is "symbols that fail are omitted"), so a Coinbase
// outage returns an EMPTY MAP rather than an error, and every holding priced
// through it silently became zero. This is the long-tail case too: a meme coin
// Coinbase does not list has no spot feed, and reporting it as $0 tells the
// user it is worthless rather than that we could not price it.

describe('chain wallets: an unpriced chain keeps its last known balance', () => {
  async function seedWallet(chain: string, lastBalanceUsd: string) {
    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    await db()
      .insert(chainWallets)
      .values({
        userId: testUserId,
        chain,
        address: 'addr-test',
        lastBalanceUsd,
        lastSyncedAt: new Date('2026-08-01T00:00:00Z'),
      });
  }

  it('does not overwrite a known balance with zero when the price is missing', async () => {
    await seedWallet('bitcoin', '5000');
    // The whole-vendor-outage shape: an empty map, no throw.
    mockedGetSpotPrices.mockResolvedValue(new Map());

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/chain-wallets/sync',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    await app.close();

    const { db } = await import('../src/db/client.js');
    const { chainWallets } = await import('../src/db/schema.js');
    const [row] = await db().select().from(chainWallets);

    // The value is stale, which is true and legible. Zero would have been a
    // confident lie.
    expect(row?.lastBalanceUsd).toBe('5000');
  });

  it('reports the skipped wallets rather than counting them as updated', async () => {
    await seedWallet('bitcoin', '5000');
    mockedGetSpotPrices.mockResolvedValue(new Map());

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/chain-wallets/sync',
      headers: authHeader(),
    });
    await app.close();

    expect(res.json()).toMatchObject({ updated: 0, unpriced: 1 });
  });
});

describe('coinbase refresh: an unpriced asset is omitted, not valued at zero', () => {
  it('does not show a holding worth $0 when there is no spot price', async () => {
    mockedGetAccounts.mockResolvedValue([
      { uuid: 'u-btc', currency: 'BTC', available_balance: { value: '1', currency: 'BTC' } },
      // The long tail: a token Coinbase has a balance for but no spot feed.
      { uuid: 'u-meme', currency: 'WIF', available_balance: { value: '1000000', currency: 'WIF' } },
    ]);
    mockedGetSpotPrices.mockResolvedValue(new Map([['BTC', 50_000]]));

    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });

    const { refreshCrypto } = await import('../src/networth/refresh.js');
    expect(await refreshCrypto(testUserId)).toBe('refreshed');

    const { getClassCacheRow } = await import('../src/store/asset-cache.js');
    const row = await getClassCacheRow(testUserId, 'crypto');
    const positions = (row?.payload as { positions?: Array<{ symbol: string; valueUSD: number }> } | null)?.positions;

    // Present at $0 would read as "your million WIF are worthless".
    expect(positions?.map((p) => p.symbol)).toEqual(['BTC']);
    expect(parseFloat(row!.valueUsd!)).toBe(50_000);
  });

  it('still prices everything when every symbol has a feed', async () => {
    mockedGetAccounts.mockResolvedValue([
      { uuid: 'u-btc', currency: 'BTC', available_balance: { value: '1', currency: 'BTC' } },
      { uuid: 'u-eth', currency: 'ETH', available_balance: { value: '10', currency: 'ETH' } },
    ]);
    mockedGetSpotPrices.mockResolvedValue(
      new Map([
        ['BTC', 50_000],
        ['ETH', 3_000],
      ]),
    );

    const { db } = await import('../src/db/client.js');
    const { coinbaseConnections } = await import('../src/db/schema.js');
    await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'dev_key' });

    const { refreshCrypto } = await import('../src/networth/refresh.js');
    await refreshCrypto(testUserId);

    const { getClassCacheRow } = await import('../src/store/asset-cache.js');
    const row = await getClassCacheRow(testUserId, 'crypto');
    expect(parseFloat(row!.valueUsd!)).toBe(80_000);
  });
});
