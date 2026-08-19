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

/** ADA held at an address, or null when the balance could not be determined.
 *
 *  null and 0 are different answers and the caller treats them differently: 0
 *  overwrites the stored balance, null leaves the last known one alone. A
 *  missing project id or a Blockfrost outage is not a wallet that emptied. */
export async function getCardanoBalance(address: string): Promise<number | null> {
  if (!config.BLOCKFROST_PROJECT_ID) return null;

  const res = await fetchWithRetry(`${BASE_URL}/${encodeURIComponent(address)}`, {
    headers: {
      project_id: config.BLOCKFROST_PROJECT_ID,
    },
  });

  // 404 is the one honest zero here: Blockfrost returns it for an address that
  // has never appeared on chain, which does hold nothing.
  if (res.status === 404) return 0;
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = ResponseSchema.safeParse(raw);
  // A shape we do not recognise means we did not understand the answer, which
  // is not the same as having understood it to be empty.
  if (!parsed.success) return null;

  const lovelace = parsed.data.amount.find((a) => a.unit === 'lovelace');
  // The address exists and carries no lovelace entry: genuinely zero ADA.
  if (!lovelace) return 0;

  return parseInt(lovelace.quantity, 10) / 1e6;
}
