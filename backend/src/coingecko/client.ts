import { z } from 'zod';
import { config } from '../config.js';

// Demo keys use api.coingecko.com + x-cg-demo-api-key header.
// Pro keys use pro-api.coingecko.com + x-cg-pro-api-key header.
// Config comment says "Pro tier" but the stored key is Demo; detect by CG- prefix.
function baseUrl(): string {
  const key = config.COINGECKO_API_KEY;
  if (key && !key.startsWith('CG-')) return 'https://pro-api.coingecko.com/api/v3';
  return 'https://api.coingecko.com/api/v3';
}

export class CoinGeckoRateLimitError extends Error {
  constructor() {
    super('CoinGecko rate limit exceeded (429)');
    this.name = 'CoinGeckoRateLimitError';
  }
}

function authHeaders(): Record<string, string> {
  const key = config.COINGECKO_API_KEY;
  if (!key) return {};
  return key.startsWith('CG-') ? { 'x-cg-demo-api-key': key } : { 'x-cg-pro-api-key': key };
}

const PricesResponseSchema = z.record(
  z.string(),
  z.object({
    usd: z.number(),
    usd_24h_change: z.number().optional(),
  }),
);

const CoinDetailSchema = z.object({
  image: z.object({
    small: z.string(),
  }),
});

/**
 * Returns USD price + 24h change % for each coin ID.
 * Coins missing from the response are silently omitted from the map.
 */
export async function getPrices(coinIds: string[]): Promise<Map<string, { usd: number; change24h: number }>> {
  if (coinIds.length === 0) return new Map();

  const params = new URLSearchParams({
    ids: coinIds.join(','),
    vs_currencies: 'usd',
    include_24hr_change: 'true',
  });

  const res = await fetch(`${baseUrl()}/simple/price?${params.toString()}`, {
    headers: { ...authHeaders() },
  });

  if (res.status === 429) throw new CoinGeckoRateLimitError();
  if (!res.ok) throw new Error(`CoinGecko price fetch failed: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = PricesResponseSchema.parse(raw);

  const result = new Map<string, { usd: number; change24h: number }>();
  for (const [id, data] of Object.entries(parsed)) {
    result.set(id, { usd: data.usd, change24h: data.usd_24h_change ?? 0 });
  }
  return result;
}

/**
 * Returns the small image URL for a coin, or null if not found.
 */
export async function getCoinImageUrl(coinId: string): Promise<string | null> {
  const res = await fetch(
    `${baseUrl()}/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
    {
      headers: { ...authHeaders() },
    },
  );

  if (res.status === 404) return null;
  if (res.status === 429) throw new CoinGeckoRateLimitError();
  if (!res.ok) throw new Error(`CoinGecko coin detail fetch failed: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = CoinDetailSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data.image.small;
}
