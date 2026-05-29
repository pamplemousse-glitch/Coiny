import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlchemyError, getNftPortfolioValue } from '../src/nft/client.js';

const API_KEY = 'test-alchemy-key';
const ADDRESS = '0xTestWalletAddress';

function makeNftsResponse(nfts: Array<{ floorPrice?: number | null; priceCurrency?: string }>) {
  return {
    ownedNfts: nfts.map((n, i) => ({
      contract: { address: `0xContract${i}`, name: `Collection ${i}` },
      tokenId: String(i),
      tokenType: 'ERC721',
      floorPrice: n.floorPrice != null ? { floorPrice: n.floorPrice, priceCurrency: n.priceCurrency ?? 'ETH' } : null,
    })),
    totalCount: nfts.length,
  };
}

describe('getNftPortfolioValue', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns correct USD total for NFTs with ETH floor prices', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeNftsResponse([{ floorPrice: 0.5 }, { floorPrice: 1.5 }]),
    } as Response);

    // 2 ETH total floor × $3000/ETH = $6000
    const result = await getNftPortfolioValue(ADDRESS, API_KEY, 3000);
    expect(result).toBeCloseTo(6000, 2);
  });

  it('throws AlchemyError on non-2xx response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    await expect(getNftPortfolioValue(ADDRESS, API_KEY, 3000)).rejects.toThrow(AlchemyError);
  });

  it('AlchemyError carries the HTTP status code', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    await expect(getNftPortfolioValue(ADDRESS, API_KEY, 3000)).rejects.toMatchObject({ status: 403 });
  });

  it('throws AlchemyError with status 400 on empty API key', async () => {
    await expect(getNftPortfolioValue(ADDRESS, '', 3000)).rejects.toThrow(AlchemyError);
  });

  it('AlchemyError has status 400 when API key is empty', async () => {
    await expect(getNftPortfolioValue(ADDRESS, '', 3000)).rejects.toMatchObject({ status: 400 });
  });

  it('skips NFTs with non-ETH floor price currency', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeNftsResponse([
          { floorPrice: 1.0, priceCurrency: 'ETH' },
          { floorPrice: 5000, priceCurrency: 'USD' },
          { floorPrice: 0.5, priceCurrency: 'MATIC' },
        ]),
    } as Response);

    // Only the 1.0 ETH floor counts; USD and MATIC are skipped.
    const result = await getNftPortfolioValue(ADDRESS, API_KEY, 2000);
    expect(result).toBeCloseTo(2000, 2);
  });

  it('returns 0 when wallet holds no NFTs', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeNftsResponse([]),
    } as Response);

    const result = await getNftPortfolioValue(ADDRESS, API_KEY, 3000);
    expect(result).toBe(0);
  });

  it('returns 0 when all NFTs have null floor prices', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeNftsResponse([{ floorPrice: null }, { floorPrice: null }]),
    } as Response);

    const result = await getNftPortfolioValue(ADDRESS, API_KEY, 3000);
    expect(result).toBe(0);
  });
});
