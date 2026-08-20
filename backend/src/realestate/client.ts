import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const RentcastResponseSchema = z.object({
  price: z.number(),
  // RentCast's own confidence interval, returned in the response we already
  // pay a call for. A $250,000 estimate ships with a $195,000-$304,000 band:
  // roughly plus or minus 22% on the largest asset most Americans own, and we
  // presented the midpoint as a hard number.
  priceRangeLow: z.number().nullable().optional(),
  priceRangeHigh: z.number().nullable().optional(),
  // The purchase price DR-21's derived valuation needs, which the handoff
  // records as blocked for want of a column. It arrives here for free.
  subjectProperty: z
    .object({
      lastSalePrice: z.number().nullable().optional(),
      lastSaleDate: z.string().nullable().optional(),
    })
    .optional(),
});

/** An AVM estimate, the vendor's confidence band, and the last recorded sale. */
export type PropertyValuation = {
  valueUsd: number;
  /** Null when RentCast returned no interval; never invented. */
  priceRangeLowUsd: number | null;
  priceRangeHighUsd: number | null;
  lastSalePriceUsd: number | null;
  lastSaleDate: string | null;
};

export async function getPropertyValuation(address: string): Promise<PropertyValuation> {
  if (!config.RENTCAST_API_KEY) throw new Error('RENTCAST_API_KEY not configured');

  const url = `https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(address)}`;
  const res = await fetchWithRetry(url, {
    headers: { 'X-Api-Key': config.RENTCAST_API_KEY },
  });

  if (!res.ok) throw new Error(`RentCast API error: ${res.status}`);

  const parsed = RentcastResponseSchema.parse(await res.json());
  return {
    valueUsd: parsed.price,
    priceRangeLowUsd: parsed.priceRangeLow ?? null,
    priceRangeHighUsd: parsed.priceRangeHigh ?? null,
    lastSalePriceUsd: parsed.subjectProperty?.lastSalePrice ?? null,
    lastSaleDate: parsed.subjectProperty?.lastSaleDate ?? null,
  };
}

/** Value only, for callers that do not care about the band. */
export async function getPropertyValue(address: string): Promise<number> {
  return (await getPropertyValuation(address)).valueUsd;
}
