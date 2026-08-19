import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';
import { cachedByKey, PRICE_TTL } from '../util/price-cache.js';

/**
 * DexScreener: prices for tokens that trade on decentralised exchanges, and
 * the liquidity behind those prices.
 *
 * WHY THIS EXISTS. Token prices resolved through Coinbase spot alone, which
 * prices what Coinbase lists. A meme coin is not on Coinbase, so it had no
 * price at all. DexScreener reads the liquidity pools directly, so it can
 * price a token minutes after it launches, or one that will never be listed.
 *
 * WHY IT MATTERS MORE THAN COVERAGE. `liquidity.usd` comes back in the same
 * response as the price, and that is the field that separates "this holding is
 * worth $50,000" from "this quotes at $50,000 in a pool holding $500, and
 * could never be sold at that price". Zerion's own migration docs are explicit
 * that it has no equivalent: "No direct equivalent. Zerion exposes
 * fungible_info.flags.verified and the wider spam classifier behind
 * filter[trash]; filter client-side on price/value thresholds if you need a
 * hard liquidity gate." This is that gate.
 *
 * KEYED BY CONTRACT ADDRESS, NEVER BY SYMBOL. This is a safety property, not a
 * convenience. Ticker symbols are not unique and are not owned: anyone can mint
 * a token called USDC into a thin pool. Resolving a holding by symbol would let
 * an attacker choose the price we display. The address is the only identifier
 * that means one specific token, and Zerion supplies it at
 * `fungible_info.implementations[].address`.
 *
 * No API key. 60 requests per minute. The terms permit commercial use; the only
 * carve-out is building a product that competes with DexScreener itself, which
 * a net-worth tracker is not.
 */

const BASE_URL = 'https://api.dexscreener.com';

export class DexScreenerError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DexScreenerError';
  }
}

/** One trading pair. Every value field is nullable in the vendor's own schema,
 *  which is the honest shape for a token that may barely trade. */
const PairSchema = z.object({
  chainId: z.string().optional(),
  dexId: z.string().optional(),
  pairAddress: z.string().optional(),
  priceUsd: z.string().nullable().optional(),
  liquidity: z
    .object({
      usd: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  fdv: z.number().nullable().optional(),
  marketCap: z.number().nullable().optional(),
  pairCreatedAt: z.number().nullable().optional(),
});

const PairsResponseSchema = z.array(PairSchema);

export type TokenMarket = {
  /** USD price from the deepest pool, or null when no pool quotes one. */
  priceUsd: number | null;
  /**
   * USD depth of the deepest pool backing that price.
   *
   * Null means unknown, NOT zero. A holding whose liquidity we cannot
   * establish must not be presented as confidently worthless any more than it
   * should be presented as confidently valuable.
   */
  liquidityUsd: number | null;
  fdv: number | null;
  marketCap: number | null;
  /** When the deepest pool was created. A pool minted hours ago is a different
   *  risk from one that has traded for two years, and the age is free here. */
  pairCreatedAtMs: number | null;
  /** How many pools quote this token at all. Zero means nothing trades it. */
  pairCount: number;
};

async function fetchTokenMarket(chainId: string, tokenAddress: string): Promise<TokenMarket | null> {
  const url = `${BASE_URL}/token-pairs/v1/${encodeURIComponent(chainId)}/${encodeURIComponent(tokenAddress)}`;
  const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });

  // A token nothing trades is a legitimate answer, not an error.
  if (res.status === 404) return null;
  if (!res.ok) throw new DexScreenerError(res.status, `DexScreener error: ${res.status}`);

  const parsed = PairsResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new DexScreenerError(200, 'DexScreener response failed schema parse');
  if (parsed.data.length === 0) return null;

  // The deepest pool wins. A token often trades in several pools of wildly
  // different size, and the thin ones carry prices nobody could transact at;
  // taking the first result would let pool ordering pick the number.
  const deepest = parsed.data.reduce((best, pair) => {
    const bestDepth = best.liquidity?.usd ?? -1;
    const pairDepth = pair.liquidity?.usd ?? -1;
    return pairDepth > bestDepth ? pair : best;
  });

  const price = deepest.priceUsd != null ? Number.parseFloat(deepest.priceUsd) : Number.NaN;

  return {
    // priceUsd arrives as a string and may not parse. NaN would propagate into
    // a total and store as NULL in a numeric column, turning "we could not
    // price this" into "this account is worth nothing".
    priceUsd: Number.isFinite(price) ? price : null,
    liquidityUsd: deepest.liquidity?.usd ?? null,
    fdv: deepest.fdv ?? null,
    marketCap: deepest.marketCap ?? null,
    pairCreatedAtMs: deepest.pairCreatedAt ?? null,
    pairCount: parsed.data.length,
  };
}

/**
 * Market data for one token, shared across every user who holds it.
 *
 * Cached on `chain:address`, which is both the correct identity and safe to
 * put in a cache key: a contract address is public on-chain data, unlike an
 * API key.
 */
export const getTokenMarket = cachedByKey(
  PRICE_TTL.SPOT,
  (chainId: string, tokenAddress: string) => `${chainId}:${tokenAddress}`.toLowerCase(),
  fetchTokenMarket,
  // Never cache "nothing trades this": a token can gain a pool at any moment,
  // and a cached null would hide it for the rest of the TTL.
  (v) => v !== null,
);

/**
 * Below this depth, a quoted price is not a price anyone could realise.
 *
 * Deliberately a judgement rather than a computed figure: a real answer would
 * need per-pool price-impact modelling against the specific position size,
 * which DexScreener does not return and which would be a product decision
 * rather than an arithmetic one. $10,000 is the round number below which a
 * retail-sized holding cannot exit without moving the market against itself.
 *
 * Exported so the threshold is one greppable decision rather than a literal
 * repeated at call sites.
 */
export const THIN_LIQUIDITY_USD = 10_000;

/**
 * Whether a quoted value should be trusted enough to count at face value.
 *
 * Returns `null` for "unknown" rather than guessing in either direction, which
 * matters: unknown liquidity is not the same as thin liquidity, and treating
 * it as thin would quietly discount holdings we simply failed to measure.
 */
export function isThinlyTraded(market: TokenMarket): boolean | null {
  if (market.liquidityUsd === null) return null;
  return market.liquidityUsd < THIN_LIQUIDITY_USD;
}
