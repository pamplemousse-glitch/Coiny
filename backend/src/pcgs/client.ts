import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';
import { cachedByKey, PRICE_TTL } from '../util/price-cache.js';

// PCGS Public API — https://api.pcgs.com/publicapi
// Bearer token generated at pcgs.com/publicapi. Daily limit: 1,000 calls.

const PCGS_BASE = 'https://api.pcgs.com/publicapi';

const CoinFactsResponseSchema = z.object({
  IsValidRequest: z.boolean(),
  ServerMessage: z.string(),
  PCGSNo: z.number().optional(),
  Name: z.string().optional(),
  PriceGuideValue: z.number().nullable().optional(),
  Grade: z.number().optional(),
});

export type PcgsCoinFacts = {
  name: string | null;
  priceGuideUsd: number | null;
};

/**
 * Returns coin details including price guide value for the given PCGS number and grade.
 * Returns null fields if the key is absent, the API errors, or no coin is found.
 */
async function fetchPcgsCoinFacts(
  pcgsNo: number,
  gradeNo: number,
  plusGrade: boolean,
  apiKey: string,
): Promise<PcgsCoinFacts | null> {
  if (!apiKey) return null;

  const url = new URL(`${PCGS_BASE}/coindetail/GetCoinFactsByGrade`);
  url.searchParams.set('PCGSNo', pcgsNo.toString());
  url.searchParams.set('GradeNo', gradeNo.toString());
  url.searchParams.set('PlusGrade', plusGrade.toString());

  const res = await fetchWithRetry(url.toString(), {
    headers: { authorization: `bearer ${apiKey}` },
  });
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = CoinFactsResponseSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.IsValidRequest) return null;
  if (parsed.data.ServerMessage === 'No data found') return { name: null, priceGuideUsd: null };

  return {
    name: parsed.data.Name ?? null,
    priceGuideUsd: parsed.data.PriceGuideValue ?? null,
  };
}

/**
 * A product's market price is the same for every user who owns one, so this is
 * fetched once per TTL rather than once per user per refresh.
 *
 * Keyed on the product identity, NOT the API key: a secret has no business in
 * a cache key, and it is identical on every call regardless.
 *
 * A day is generous against `networth/classes.ts`, which already treats this
 * class as fresh for a week. Comps-based prices do not move intraday.
 */
const cachedPcgs = cachedByKey(
  PRICE_TTL.COLLECTIBLE,
  (pcgsNo: number, gradeNo: number, plusGrade: boolean, _apiKey: string) => `${pcgsNo}|${gradeNo}|${plusGrade}`,
  fetchPcgsCoinFacts,
  // Never cache a null: this client returns null for "could not price this"
  // rather than throwing, and storing it would serve "no price" for a day
  // after one bad request.
  (v) => v !== null,
);

export async function getPcgsCoinFacts(
  pcgsNo: number,
  gradeNo: number,
  plusGrade: boolean,
  apiKey: string,
): Promise<PcgsCoinFacts | null> {
  // Outside the cache deliberately. A missing API key is a config state, not a
  // price, and the cache key excludes the key (a secret has no business in
  // one), so caching this would poison the real lookup.
  if (!apiKey) return null;
  return cachedPcgs(pcgsNo, gradeNo, plusGrade, apiKey);
}

/** Test seam: the cache is module-level state. */
export const _clearPcgsCache = cachedPcgs.clear;
