import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('coingecko getPrices', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty map for empty coin list', async () => {
    const { getPrices } = await import('../src/coingecko/client.js');
    const result = await getPrices([]);
    expect(result.size).toBe(0);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('parses USD prices from response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({ bitcoin: { usd: 50000, usd_24h_change: 5.2 }, ethereum: { usd: 3000, usd_24h_change: -2.1 } }),
    );

    const { getPrices } = await import('../src/coingecko/client.js');
    const result = await getPrices(['bitcoin', 'ethereum']);

    expect(result.get('bitcoin')).toEqual({ usd: 50000, change24h: 5.2 });
    expect(result.get('ethereum')).toEqual({ usd: 3000, change24h: -2.1 });
  });

  it('defaults change24h to 0 when usd_24h_change is absent', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({ solana: { usd: 200 } }),
    );

    const { getPrices } = await import('../src/coingecko/client.js');
    const result = await getPrices(['solana']);
    expect(result.get('solana')).toEqual({ usd: 200, change24h: 0 });
  });

  it('throws CoinGeckoRateLimitError on 429', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({}, 429));

    const { getPrices, CoinGeckoRateLimitError } = await import('../src/coingecko/client.js');
    await expect(getPrices(['bitcoin'])).rejects.toBeInstanceOf(CoinGeckoRateLimitError);
  });

  it('throws generic error on non-ok status', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({}, 500));

    const { getPrices } = await import('../src/coingecko/client.js');
    await expect(getPrices(['bitcoin'])).rejects.toThrow('500');
  });
});

describe('coingecko getCoinImageUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the small image URL on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({ image: { small: 'https://cdn.coingecko.com/btc.png' } }),
    );

    const { getCoinImageUrl } = await import('../src/coingecko/client.js');
    const url = await getCoinImageUrl('bitcoin');
    expect(url).toBe('https://cdn.coingecko.com/btc.png');
  });

  it('returns null for 404', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({}, 404));

    const { getCoinImageUrl } = await import('../src/coingecko/client.js');
    const url = await getCoinImageUrl('unknown-coin');
    expect(url).toBeNull();
  });

  it('throws CoinGeckoRateLimitError on 429', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({}, 429));

    const { getCoinImageUrl, CoinGeckoRateLimitError } = await import('../src/coingecko/client.js');
    await expect(getCoinImageUrl('bitcoin')).rejects.toBeInstanceOf(CoinGeckoRateLimitError);
  });

  it('returns null when response shape is unexpected', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ wrong_key: {} }));

    const { getCoinImageUrl } = await import('../src/coingecko/client.js');
    const url = await getCoinImageUrl('bitcoin');
    expect(url).toBeNull();
  });
});
