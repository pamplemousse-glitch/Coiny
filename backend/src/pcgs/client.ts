import { z } from 'zod';
import { config } from '../config.js';

// PCGS CoinFacts API — graded coin price guide.
// pcgs.com/coinfacts/api
const PriceResponseSchema = z.object({
  gradePrice: z.number().nullable().optional(),
  pcgsNo: z.number().optional(),
});

export async function getCoinPrice(pcgsNumber: string, grade: string): Promise<number | null> {
  if (!config.PCGS_API_KEY) return null;

  const gradeNum = grade.replace(/[^0-9]/g, '');
  const url = `https://www.pcgs.com/coinfacts/api/price?pcgsNo=${encodeURIComponent(pcgsNumber)}&grade=${encodeURIComponent(gradeNum)}`;

  const res = await fetch(url, {
    headers: { 'X-API-Key': config.PCGS_API_KEY },
  });

  if (!res.ok) return null;

  const parsed = PriceResponseSchema.safeParse(await res.json());
  if (!parsed.success) return null;

  return parsed.data.gradePrice ?? null;
}
