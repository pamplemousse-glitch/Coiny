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

/** DOT held at an address, or null when the balance could not be determined.
 *
 *  See getCardanoBalance: null means unknown and preserves the stored value,
 *  0 means the account really is empty and overwrites it. Subscan needs a key
 *  and rate limits, so the unknown branches here are reachable in normal
 *  operation, not just in a disaster. */
export async function getPolkadotBalance(address: string): Promise<number | null> {
  if (!config.SUBSCAN_API_KEY) return null;

  const res = await fetchWithRetry(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.SUBSCAN_API_KEY,
    },
    body: JSON.stringify({ key: address, row: 1, page: 0 }),
  });

  if (res.status === 404) return 0;
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return null;
  // A non-zero Subscan code is an API-level error reported inside a 200.
  if (parsed.data.code !== 0) return null;
  // A successful lookup that carries no account is Subscan saying the address
  // is unknown to it, which is an empty account rather than a failed call.
  if (parsed.data.data === null) return 0;
  if (parsed.data.data.account === null) return 0;

  return parseFloat(parsed.data.data.account.balance);
}
