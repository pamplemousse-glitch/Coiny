import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

const HYPERLIQUID_URL = 'https://api.hyperliquid.xyz/info';

export class HyperliquidError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HyperliquidError';
  }
}

export interface HyperliquidPosition {
  coin: string;
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
}

export interface HyperliquidState {
  /** Perps account value. Kept as the perps figure alone so existing callers
   *  and the stored history keep meaning what they meant. */
  accountValue: number;
  positions: HyperliquidPosition[];
  /** Spot token balances, valued in USD. Empty when the address holds none. */
  spotBalances: HyperliquidSpotBalance[];
  /** Total USD value of the spot balances above. */
  spotValueUsd: number;
}

export interface HyperliquidSpotBalance {
  coin: string;
  total: number;
  valueUsd: number;
}

const PositionSchema = z.object({
  position: z.object({
    coin: z.string(),
    szi: z.string(),
    entryPx: z.string().nullable().optional(),
    unrealizedPnl: z.string(),
  }),
});

const ClearinghouseStateSchema = z.object({
  crossMarginSummary: z.object({
    accountValue: z.string(),
  }),
  assetPositions: z.array(PositionSchema),
});

const SpotStateSchema = z.object({
  balances: z.array(
    z.object({
      coin: z.string(),
      total: z.string(),
    }),
  ),
});

/** `allMids` returns a map of coin to mid price, both as strings. */
const AllMidsSchema = z.record(z.string(), z.string());

async function infoPost(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetchWithRetry(HYPERLIQUID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HyperliquidError(res.status, `Hyperliquid API error: ${res.status}`);
  return res.json();
}

/**
 * Spot token balances for an address, valued in USD.
 *
 * `clearinghouseState` is the PERPS account only. An address holding spot
 * tokens had them counted nowhere: not an error, not a warning, simply absent
 * from net worth. This is the same class of defect as the Kraken suffix bug.
 *
 * USDC is the quote asset and is taken at $1. Everything else is priced from
 * `allMids`. A coin with no mid is EXCLUDED rather than valued at zero or
 * guessed, which matches the contract the rest of the app follows: a number
 * that cannot be sourced is not presented as if it could.
 */
export async function getHyperliquidSpot(
  address: string,
): Promise<{ balances: HyperliquidSpotBalance[]; totalUsd: number }> {
  const [rawState, rawMids] = await Promise.all([
    infoPost({ type: 'spotClearinghouseState', user: address }),
    infoPost({ type: 'allMids' }),
  ]);

  const state = SpotStateSchema.safeParse(rawState);
  if (!state.success) return { balances: [], totalUsd: 0 };
  const mids = AllMidsSchema.safeParse(rawMids);
  const priceOf = (coin: string): number | null => {
    if (coin === 'USDC') return 1;
    if (!mids.success) return null;
    const raw = mids.data[coin];
    if (raw === undefined) return null;
    const price = Number.parseFloat(raw);
    return Number.isFinite(price) ? price : null;
  };

  const balances: HyperliquidSpotBalance[] = [];
  let totalUsd = 0;

  for (const entry of state.data.balances) {
    const total = Number.parseFloat(entry.total);
    if (!Number.isFinite(total) || total <= 0) continue;

    const price = priceOf(entry.coin);
    if (price === null) {
      console.warn(`[hyperliquid] no mid for spot token ${entry.coin}, balance excluded`);
      continue;
    }

    const valueUsd = total * price;
    balances.push({ coin: entry.coin, total, valueUsd });
    totalUsd += valueUsd;
  }

  return { balances, totalUsd };
}

// Returns the Hyperliquid perp state for an Ethereum address, plus spot.
// Positions with szi === '0' are excluded. Returns empty state for unknown addresses.
export async function getHyperliquidState(address: string): Promise<HyperliquidState> {
  // Spot is fetched alongside, and a spot failure must not take down the perps
  // figure that already worked: a partial answer beats no answer, as long as
  // the missing part is not silently counted as zero elsewhere.
  const [rawPerps, spot] = await Promise.all([
    infoPost({ type: 'clearinghouseState', user: address }),
    getHyperliquidSpot(address).catch(() => ({ balances: [], totalUsd: 0 })),
  ]);

  const parsed = ClearinghouseStateSchema.safeParse(rawPerps);
  if (!parsed.success) {
    return { accountValue: 0, positions: [], spotBalances: spot.balances, spotValueUsd: spot.totalUsd };
  }

  const { crossMarginSummary, assetPositions } = parsed.data;

  const positions: HyperliquidPosition[] = assetPositions
    .filter((p) => p.position.szi !== '0')
    .map((p) => ({
      coin: p.position.coin,
      size: parseFloat(p.position.szi),
      entryPrice: p.position.entryPx != null ? parseFloat(p.position.entryPx) : 0,
      unrealizedPnl: parseFloat(p.position.unrealizedPnl),
    }));

  return {
    accountValue: parseFloat(crossMarginSummary.accountValue),
    positions,
    spotBalances: spot.balances,
    spotValueUsd: spot.totalUsd,
  };
}
