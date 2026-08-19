import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

const HEDERA_MIRROR_URL = 'https://mainnet-public.mirrornode.hedera.com/api/v1';

export class HederaMirrorError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HederaMirrorError';
  }
}

const BalancesSchema = z.object({
  balances: z.array(
    z.object({
      balance: z.number(),
    }),
  ),
});

export async function getHederaBalance(address: string): Promise<number | null> {
  const res = await fetchWithRetry(`${HEDERA_MIRROR_URL}/balances?account.id=${encodeURIComponent(address)}`);

  if (res.status === 404) return 0;
  if (!res.ok) throw new HederaMirrorError(res.status, `Hedera mirror error: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = BalancesSchema.safeParse(raw);
  if (!parsed.success) return null;

  const first = parsed.data.balances[0];
  if (!first) return 0;

  return first.balance / 1e8;
}
