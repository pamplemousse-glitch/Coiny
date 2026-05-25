/**
 * D5 — CoinGecko integration tests
 *
 * No API key required for free tier. Run with:
 *   INTEGRATION_TEST=1 pnpm --filter coiny-backend test backend/tests/integration/coingecko.test.ts
 *
 * If COINGECKO_API_KEY is set (Pro tier), the x-cg-pro-api-key header is sent automatically.
 */
import { describe, it, expect } from 'vitest';
import { getPrices, getCoinImageUrl } from '../../src/coingecko/client.js';

const skip = !process.env.INTEGRATION_TEST;

describe('CoinGecko — prices & images', () => {
  it.skipIf(skip)('getPrices returns USD price and 24h change for bitcoin and ethereum', async () => {
    const result = await getPrices(['bitcoin', 'ethereum']);

    expect(result.size).toBe(2);

    const btc = result.get('bitcoin');
    expect(btc).toBeDefined();
    expect(typeof btc!.usd).toBe('number');
    expect(btc!.usd).toBeGreaterThan(0);
    expect(typeof btc!.change24h).toBe('number');

    const eth = result.get('ethereum');
    expect(eth).toBeDefined();
    expect(typeof eth!.usd).toBe('number');
    expect(eth!.usd).toBeGreaterThan(0);
  });

  it.skipIf(skip)('getCoinImageUrl returns a non-empty URL string for bitcoin', async () => {
    const url = await getCoinImageUrl('bitcoin');

    expect(typeof url).toBe('string');
    expect(url!.length).toBeGreaterThan(0);
    expect(url).toMatch(/^https?:\/\//);
  });

  it.skipIf(skip)('getCoinImageUrl returns null for an unknown coin ID', async () => {
    const url = await getCoinImageUrl('not-a-real-coin-xyzzy-12345');

    expect(url).toBeNull();
  });

  it.skipIf(skip)('getPrices returns empty map for empty input', async () => {
    const result = await getPrices([]);

    expect(result.size).toBe(0);
  });
});
