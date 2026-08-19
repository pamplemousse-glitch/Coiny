import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URL = 'https://toncenter.com/api/v2/getAddressBalance';

const ResponseSchema = z.object({
  ok: z.boolean(),
  result: z.string(),
});

/** TON held at an address, or null when the balance could not be determined.
 *  See getCardanoBalance for why the distinction matters. */
export async function getTonBalance(address: string): Promise<number | null> {
  if (!config.TONCENTER_API_KEY) return null;

  const url = `${BASE_URL}?address=${encodeURIComponent(address)}`;
  const res = await fetchWithRetry(url, {
    headers: {
      'X-API-Key': config.TONCENTER_API_KEY,
    },
  });

  if (res.status === 404) return 0;
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return null;
  // `ok: false` is TonCenter reporting its own failure in a 200 body.
  if (!parsed.data.ok) return null;

  return parseInt(parsed.data.result, 10) / 1e9;
}
