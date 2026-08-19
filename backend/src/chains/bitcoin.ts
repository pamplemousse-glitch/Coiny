import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URL = 'https://blockstream.info/api';

export class BlockstreamError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BlockstreamError';
  }
}

const AddressSchema = z.object({
  chain_stats: z.object({
    funded_txo_sum: z.number(),
    spent_txo_sum: z.number(),
  }),
});

// Returns confirmed BTC balance for a Bitcoin address.
// Returns 0 for addresses with no history (404). Throws BlockstreamError on API errors.
export async function getBitcoinBalance(address: string): Promise<number | null> {
  const res = await fetchWithRetry(`${BASE_URL}/address/${encodeURIComponent(address)}`);

  if (res.status === 404) return 0;
  if (!res.ok) throw new BlockstreamError(res.status, `Blockstream API error: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = AddressSchema.safeParse(raw);
  if (!parsed.success) return null;

  const { funded_txo_sum, spent_txo_sum } = parsed.data.chain_stats;
  return (funded_txo_sum - spent_txo_sum) / 1e8;
}
