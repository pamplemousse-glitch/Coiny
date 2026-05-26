import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URL = 'https://polkadot.api.subscan.io/api/v2/scan/search';

const ResponseSchema = z.object({
  code: z.number(),
  data: z
    .object({
      account: z
        .object({
          balance: z.string(),
        })
        .nullable(),
    })
    .nullable(),
});

export async function getPolkadotBalance(address: string): Promise<number> {
  if (!config.SUBSCAN_API_KEY) return 0;

  const res = await fetchWithRetry(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.SUBSCAN_API_KEY,
    },
    body: JSON.stringify({ key: address, row: 1, page: 0 }),
  });

  if (res.status === 404) return 0;
  if (!res.ok) return 0;

  const raw: unknown = await res.json();
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return 0;
  if (parsed.data.code !== 0 || parsed.data.data === null) return 0;
  if (parsed.data.data.account === null) return 0;

  return parseFloat(parsed.data.data.account.balance);
}
