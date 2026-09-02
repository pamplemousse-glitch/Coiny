// The NFT wallet sync (src/api/nft.ts).
//
// These exist because the health recording in this route was unreachable. The
// body was `try { try { ... } catch { warn } } catch { recordSyncFailure;
// throw }`: the inner catch swallowed every error, so the outer one never ran
// and `consecutive_failures` stayed at zero forever. A wallet that had not
// priced in weeks kept deriving as `ok`, because the only evidence was a log
// line nobody reads.

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/nft/client.js', () => ({ getNftPortfolioValue: vi.fn() }));
vi.mock('../src/coinbase/client.js', () => ({
  getSpotPrices: vi.fn(async () => new Map([['ETH', 3000]])),
}));

import { getNftPortfolioValue } from '../src/nft/client.js';

const mockedValue = vi.mocked(getNftPortfolioValue);

async function addWallet(address: string) {
  const { db } = await import('../src/db/client.js');
  const { nftWallets } = await import('../src/db/schema.js');
  const [row] = await db().insert(nftWallets).values({ userId: testUserId, address }).returning({ id: nftWallets.id });
  return row!.id;
}

describe('nft wallet sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  it('reports not_connected when there are no wallets', async () => {
    const { syncNftWallets } = await import('../src/api/nft.js');

    expect(await syncNftWallets(testUserId)).toEqual({ status: 'not_connected' });
  });

  it('prices a wallet and clears its failure history', async () => {
    await addWallet('0xaaa');
    mockedValue.mockResolvedValue(1234);
    const { syncNftWallets } = await import('../src/api/nft.js');

    const result = await syncNftWallets(testUserId);

    expect(result).toMatchObject({ status: 'synced', updated: 1 });
    const { db } = await import('../src/db/client.js');
    const { nftWallets } = await import('../src/db/schema.js');
    const [row] = await db().select().from(nftWallets);
    expect(parseFloat(row!.lastValueUsd!)).toBe(1234);
    expect(row!.consecutiveFailures).toBe(0);
  });

  // The bug. Before this, the count stayed at zero no matter how often the
  // wallet failed, so `deriveConnectionStatus` never left `ok`.
  it('records the failure against the wallet that failed', async () => {
    const id = await addWallet('0xdead');
    mockedValue.mockRejectedValue(new Error('alchemy exploded'));
    const { syncNftWallets } = await import('../src/api/nft.js');

    await syncNftWallets(testUserId);

    const { db } = await import('../src/db/client.js');
    const { nftWallets } = await import('../src/db/schema.js');
    const [row] = await db().select().from(nftWallets).where(eq(nftWallets.id, id));
    expect(row!.consecutiveFailures).toBe(1);
    expect(row!.lastAttemptAt).not.toBeNull();
  });

  it('leaves the last known value in place when a wallet fails', async () => {
    await addWallet('0xaaa');
    mockedValue.mockResolvedValue(500);
    const { syncNftWallets } = await import('../src/api/nft.js');
    await syncNftWallets(testUserId);

    mockedValue.mockRejectedValue(new Error('alchemy exploded'));
    await syncNftWallets(testUserId);

    const { db } = await import('../src/db/client.js');
    const { nftWallets } = await import('../src/db/schema.js');
    const [row] = await db().select().from(nftWallets);
    // A failed refresh makes a value un-refreshable, not wrong (R-8.1). It
    // reads as stale, never as zero.
    expect(parseFloat(row!.lastValueUsd!)).toBe(500);
  });

  it('keeps pricing the other wallets after one fails', async () => {
    await addWallet('0xdead');
    await addWallet('0xgood');
    mockedValue.mockRejectedValueOnce(new Error('alchemy exploded')).mockResolvedValue(42);
    const { syncNftWallets } = await import('../src/api/nft.js');

    const result = await syncNftWallets(testUserId);

    // Unlike Hyperliquid and Polymarket, these addresses are independent: one
    // bad contract lookup says nothing about the next wallet.
    expect(result).toMatchObject({ status: 'synced', updated: 1 });
  });

  it('does not fail the request when a wallet fails', async () => {
    await addWallet('0xdead');
    mockedValue.mockRejectedValue(new Error('alchemy exploded'));
    const { syncNftWallets } = await import('../src/api/nft.js');

    // The route answered 200 with a count before and still does; only the
    // durable record changed.
    await expect(syncNftWallets(testUserId)).resolves.toMatchObject({ status: 'synced', updated: 0 });
  });

  it('drives the wallet to reauth_required after repeated auth failures', async () => {
    await addWallet('0xdead');
    const authError = Object.assign(new Error('rejected'), { status: 401 });
    mockedValue.mockRejectedValue(authError);
    const { syncNftWallets } = await import('../src/api/nft.js');
    const { CONNECTION_ERROR_THRESHOLD, deriveConnectionStatus } = await import('../src/store/connection-health.js');

    for (let i = 0; i < CONNECTION_ERROR_THRESHOLD; i++) {
      await syncNftWallets(testUserId);
    }

    const { db } = await import('../src/db/client.js');
    const { nftWallets } = await import('../src/db/schema.js');
    const [row] = await db().select().from(nftWallets);
    expect(deriveConnectionStatus(row!)).toBe('reauth_required');
  });
});
