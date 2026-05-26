import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URL = 'https://toncenter.com/api/v2/getAddressBalance';

const ResponseSchema = z.object({
  ok: z.boolean(),
  result: z.string(),
});

export async function getTonBalance(address: string): Promise<number> {
  if (!config.TONCENTER_API_KEY) return 0;

  const url = `${BASE_URL}?address=${encodeURIComponent(address)}`;
  const res = await fetchWithRetry(url, {
    headers: {
      'X-API-Key': config.TONCENTER_API_KEY,
    },
  });

  if (res.status === 404) return 0;
  if (!res.ok) return 0;

  const raw: unknown = await res.json();
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return 0;
  if (!parsed.data.ok) return 0;

  return parseInt(parsed.data.result, 10) / 1e9;
}
