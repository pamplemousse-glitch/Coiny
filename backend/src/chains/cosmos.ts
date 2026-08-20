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

/** `/cosmos/staking/v1beta1/delegations/{addr}`. `balance.amount` is a Coin:
 *  an INTEGER string in the base denom. */
const DelegationsSchema = z.object({
  delegation_responses: z.array(
    z.object({
      balance: z.object({ denom: z.string(), amount: z.string() }),
    }),
  ),
});

/** `/cosmos/distribution/v1beta1/delegators/{addr}/rewards`. `total` holds
 *  DecCoins, whose amount is a DECIMAL string ("1234.5678900000000000"), not
 *  an integer. Parsing it as an int would silently truncate every reward. */
const RewardsSchema = z.object({
  total: z.array(z.object({ denom: z.string(), amount: z.string() })),
});

/**
 * Delegated stake plus unclaimed rewards, in whole tokens.
 *
 * ATOM staking participation runs around two thirds of supply, so reading the
 * bank balance alone reported roughly a third of a typical holder's position
 * and called it their whole one.
 *
 * Returns null when either call could not be completed, which the caller
 * treats as "staking unknown" rather than "stakes nothing". Unbonding is NOT
 * included: `/cosmos/staking/v1beta1/delegators/{addr}/unbonding_delegations`
 * answers 501 "not implemented" on the public nodes we use, so there is no
 * honest number to add.
 */
export async function getCosmosStakedBalance(chain: string, address: string): Promise<number | null> {
  const baseUrl = LCD_URLS[chain];
  const denom = NATIVE_DENOMS[chain];
  if (!baseUrl || !denom) return null;

  const [delRes, rewRes] = await Promise.all([
    fetchWithRetry(`${baseUrl}/cosmos/staking/v1beta1/delegations/${encodeURIComponent(address)}`),
    fetchWithRetry(`${baseUrl}/cosmos/distribution/v1beta1/delegators/${encodeURIComponent(address)}/rewards`),
  ]);

  // 404 is a real answer here: the address has never delegated.
  if (delRes.status === 404 && rewRes.status === 404) return 0;
  if (!delRes.ok || !rewRes.ok) return null;

  const delegations = DelegationsSchema.safeParse(await delRes.json());
  const rewards = RewardsSchema.safeParse(await rewRes.json());
  if (!delegations.success || !rewards.success) return null;

  let base = 0;
  for (const d of delegations.data.delegation_responses) {
    if (d.balance.denom !== denom) continue;
    const amount = Number(d.balance.amount);
    if (Number.isFinite(amount)) base += amount;
  }
  for (const r of rewards.data.total) {
    if (r.denom !== denom) continue;
    // parseFloat, not Number(): these are decimal strings.
    const amount = Number.parseFloat(r.amount);
    if (Number.isFinite(amount)) base += amount;
  }

  return base / 1e6;
}

// Returns LIQUID native token balance (ATOM or OSMO) for a Cosmos-SDK address,
// or null when it could not be determined. Staked balances come from
// getCosmosStakedBalance; the caller combines them and keeps the split.
// Returns 0 for addresses not found (404) or with no native balance. Throws CosmosLcdError on API errors.
export async function getCosmosBalance(chain: string, address: string): Promise<number | null> {
  const baseUrl = LCD_URLS[chain];
  const denom = NATIVE_DENOMS[chain];
  if (!baseUrl || !denom) throw new CosmosLcdError(0, `Unsupported chain: ${chain}`);

  const res = await fetchWithRetry(`${baseUrl}/cosmos/bank/v1beta1/balances/${encodeURIComponent(address)}`);

  if (res.status === 404) return 0;
  if (!res.ok) throw new CosmosLcdError(res.status, `Cosmos LCD error: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = BalancesSchema.safeParse(raw);
  // Unrecognised shape: unknown, not empty. See getCardanoBalance.
  if (!parsed.success) return null;

  const native = parsed.data.balances.find((b) => b.denom === denom);
  // A parsed balance list without our denom really does mean none held.
  if (!native) return 0;

  return Number(native.amount) / 1e6;
}
