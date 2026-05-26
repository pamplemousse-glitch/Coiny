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
  accountValue: number;
  positions: HyperliquidPosition[];
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

// Returns the Hyperliquid perp state for an Ethereum address.
// Positions with szi === '0' are excluded. Returns empty state for unknown addresses.
export async function getHyperliquidState(address: string): Promise<HyperliquidState> {
  const res = await fetchWithRetry(HYPERLIQUID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'clearinghouseState', user: address }),
  });

  if (!res.ok) throw new HyperliquidError(res.status, `Hyperliquid API error: ${res.status}`);

  const raw: unknown = await res.json();
  const parsed = ClearinghouseStateSchema.safeParse(raw);
  if (!parsed.success) return { accountValue: 0, positions: [] };

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
  };
}
