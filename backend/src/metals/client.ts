import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';
import { cachedByKey, PRICE_TTL } from '../util/price-cache.js';

const GoldApiResponseSchema = z.object({
  price: z.number(),
  // WHEN the quote was struck, which is not when we fetched it.
  //
  // Metals markets close at weekends. A Sunday refresh returns Friday's close,
  // and stamping it with our own fetch time claims a two-day-old number is
  // seconds old. `networth/classes.ts` gives metals a seven-day freshness
  // window and was being fed the wrong input to measure against it.
  //
  // Unix seconds. `datetime` carries the same instant as a string and is read
  // only when `timestamp` is absent.
  timestamp: z.number().optional(),
  datetime: z.string().optional(),
});

/** A spot price and the moment the vendor says it was struck. */
export type MetalSpot = {
  priceUsd: number;
  /** Null when GoldAPI sent no timestamp; the caller then falls back to its
   *  own fetch time, which is the old behaviour and no worse than it was. */
  asOf: Date | null;
};

async function fetchMetalSpotPrice(metal: string): Promise<MetalSpot> {
  if (!config.GOLDAPI_API_KEY) throw new Error('GOLDAPI_API_KEY not configured');

  const url = `https://www.goldapi.io/api/${encodeURIComponent(metal)}/USD`;
  const res = await fetchWithRetry(url, {
    headers: { 'x-access-token': config.GOLDAPI_API_KEY },
  });

  if (!res.ok) throw new Error(`GoldAPI error: ${res.status}`);

  const parsed = GoldApiResponseSchema.parse(await res.json());

  let asOf: Date | null = null;
  if (parsed.timestamp !== undefined) {
    const d = new Date(parsed.timestamp * 1000);
    if (!Number.isNaN(d.getTime())) asOf = d;
  } else if (parsed.datetime !== undefined) {
    const d = new Date(parsed.datetime);
    if (!Number.isNaN(d.getTime())) asOf = d;
  }

  return { priceUsd: parsed.price, asOf };
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
