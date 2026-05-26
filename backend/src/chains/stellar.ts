import { z } from 'zod';

const HORIZON_URL = 'https://horizon.stellar.org';

export class HorizonError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HorizonError';
  }
}

const AccountSchema = z.object({
  balances: z.array(
    z.object({
      asset_type: z.string(),
      balance: z.string(),
    }),
  ),
});

// Returns native XLM balance for a Stellar account address.
// Returns 0 for accounts that don't exist (404). Throws HorizonError on API errors.
export async function getStellarBalance(address: string): Promise<number> {
  const res = await fetch(`${HORIZON_URL}/accounts/${encodeURIComponent(address)}`);

  if (res.status === 404) return 0;
  if (!res.ok) throw new HorizonError(res.status, `Horizon API error: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = AccountSchema.safeParse(raw);
  if (!parsed.success) return 0;

  const native = parsed.data.balances.find((b) => b.asset_type === 'native');
  if (!native) return 0;

  return parseFloat(native.balance);
}
