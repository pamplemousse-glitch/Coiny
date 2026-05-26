import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

const LCD_URLS: Record<string, string> = {
  cosmos: 'https://cosmos-rest.publicnode.com',
  osmosis: 'https://osmosis-rest.publicnode.com',
};

const NATIVE_DENOMS: Record<string, string> = {
  cosmos: 'uatom',
  osmosis: 'uosmo',
};

export class CosmosLcdError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CosmosLcdError';
  }
}

const BalancesSchema = z.object({
  balances: z.array(
    z.object({
      denom: z.string(),
      amount: z.string(),
    }),
  ),
});

// Returns native token balance (ATOM or OSMO) for a Cosmos-SDK address.
// Returns 0 for addresses not found (404) or with no native balance. Throws CosmosLcdError on API errors.
export async function getCosmosBalance(chain: string, address: string): Promise<number> {
  const baseUrl = LCD_URLS[chain];
  const denom = NATIVE_DENOMS[chain];
  if (!baseUrl || !denom) throw new CosmosLcdError(0, `Unsupported chain: ${chain}`);

  const res = await fetchWithRetry(`${baseUrl}/cosmos/bank/v1beta1/balances/${encodeURIComponent(address)}`);

  if (res.status === 404) return 0;
  if (!res.ok) throw new CosmosLcdError(res.status, `Cosmos LCD error: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = BalancesSchema.safeParse(raw);
  if (!parsed.success) return 0;

  const native = parsed.data.balances.find((b) => b.denom === denom);
  if (!native) return 0;

  return Number(native.amount) / 1e6;
}
