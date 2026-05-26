import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

const APTOS_BASE_URL = 'https://fullnode.mainnet.aptoslabs.com/v1';

export class AptosApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AptosApiError';
  }
}

const CoinStoreResourceSchema = z.object({
  type: z.string(),
  data: z.object({
    coin: z.object({
      value: z.string(),
    }),
  }),
});

const ResourcesSchema = z.array(z.unknown());

const APT_COIN_TYPE = '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>';

export async function getAptosBalance(address: string): Promise<number> {
  const res = await fetchWithRetry(`${APTOS_BASE_URL}/accounts/${encodeURIComponent(address)}/resources`);

  if (res.status === 404) return 0;
  if (!res.ok) throw new AptosApiError(res.status, `Aptos API error: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = ResourcesSchema.safeParse(raw);
  if (!parsed.success) return 0;

  for (const item of parsed.data) {
    const resource = CoinStoreResourceSchema.safeParse(item);
    if (resource.success && resource.data.type === APT_COIN_TYPE) {
      return Number(resource.data.data.coin.value) / 1e8;
    }
  }

  return 0;
}
