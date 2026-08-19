import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

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
export async function getPcgsCoinFacts(
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
