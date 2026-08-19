import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';
import { cachedByKey, PRICE_TTL } from '../util/price-cache.js';

const GoldApiResponseSchema = z.object({
  price: z.number(),
});

async function fetchMetalSpotPrice(metal: string): Promise<number> {
  if (!config.GOLDAPI_API_KEY) throw new Error('GOLDAPI_API_KEY not configured');

  const url = `https://www.goldapi.io/api/${encodeURIComponent(metal)}/USD`;
  const res = await fetchWithRetry(url, {
    headers: { 'x-access-token': config.GOLDAPI_API_KEY },
  });

  if (!res.ok) throw new Error(`GoldAPI error: ${res.status}`);

  const parsed = GoldApiResponseSchema.parse(await res.json());
  return parsed.price;
}

/**
 * Spot price per metal, shared across every user.
 *
 * Gold has one price. This was called once per user per refresh, so a thousand
 * users holding gold bought a thousand identical answers. Keyed on the metal
 * alone, deliberately not on the API key: the key is a secret and has no
 * business sitting in a cache key.
 *
 * 15 minutes is one scheduler tick, which collapses a whole batch of due users
 * into one upstream call. It costs nothing in accuracy: metals are
 * `WEEKLY_KEEP` in networth/classes.ts, so this figure is allowed to be seven
 * days old.
 */
export const getMetalSpotPrice = cachedByKey(
  PRICE_TTL.SPOT,
  (metal: string) => metal.toLowerCase(),
  fetchMetalSpotPrice,
);
