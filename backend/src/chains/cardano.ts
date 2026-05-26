import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URL = 'https://cardano-mainnet.blockfrost.io/api/v0/addresses';

const ResponseSchema = z.object({
  amount: z.array(
    z.object({
      unit: z.string(),
      quantity: z.string(),
    }),
  ),
});

export async function getCardanoBalance(address: string): Promise<number> {
  if (!config.BLOCKFROST_PROJECT_ID) return 0;

  const res = await fetchWithRetry(`${BASE_URL}/${encodeURIComponent(address)}`, {
    headers: {
      project_id: config.BLOCKFROST_PROJECT_ID,
    },
  });

  if (res.status === 404) return 0;
  if (!res.ok) return 0;

  const raw: unknown = await res.json();
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return 0;

  const lovelace = parsed.data.amount.find((a) => a.unit === 'lovelace');
  if (!lovelace) return 0;

  return parseInt(lovelace.quantity, 10) / 1e6;
}
