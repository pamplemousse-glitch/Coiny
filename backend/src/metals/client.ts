import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const GoldApiResponseSchema = z.object({
  price: z.number(),
});

export async function getMetalSpotPrice(metal: string): Promise<number> {
  if (!config.GOLDAPI_API_KEY) throw new Error('GOLDAPI_API_KEY not configured');

  const url = `https://www.goldapi.io/api/${encodeURIComponent(metal)}/USD`;
  const res = await fetchWithRetry(url, {
    headers: { 'x-access-token': config.GOLDAPI_API_KEY },
  });

  if (!res.ok) throw new Error(`GoldAPI error: ${res.status}`);

  const parsed = GoldApiResponseSchema.parse(await res.json());
  return parsed.price;
}
