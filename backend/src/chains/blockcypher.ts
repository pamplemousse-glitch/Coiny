import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URL = 'https://api.blockcypher.com/v1';

export class BlockcypherError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BlockcypherError';
  }
}

// `balance` = confirmed satoshis only; `final_balance` also includes unconfirmed.
// Use `balance` for net worth to avoid counting pending inbound transactions.
const BalanceSchema = z.object({
  balance: z.number(),
});

const CHAIN_PATHS: Record<string, string> = {
  doge: 'doge/main',
  ltc: 'ltc/main',
  bch: 'bch/main',
};

// Returns confirmed balance in native units for DOGE, LTC, or BCH address.
// Returns 0 for addresses not found (404). Throws BlockcypherError on API errors.
export async function getBlockcypherBalance(chain: string, address: string): Promise<number> {
  const path = CHAIN_PATHS[chain];
  if (!path) throw new BlockcypherError(0, `Unsupported chain: ${chain}`);

  const res = await fetchWithRetry(`${BASE_URL}/${path}/addrs/${encodeURIComponent(address)}/balance`);

  if (res.status === 404) return 0;
  if (!res.ok) throw new BlockcypherError(res.status, `BlockCypher API error: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = BalanceSchema.safeParse(raw);
  if (!parsed.success) return 0;

  return parsed.data.balance / 1e8;
}
