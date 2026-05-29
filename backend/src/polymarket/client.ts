import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

// Polymarket Data API — read-only, no auth required, wallet-address scoped.
// Docs: https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user
const DATA_API_BASE = 'https://data-api.polymarket.com';

export class PolymarketError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'PolymarketError';
  }
}

// Position schema — based on the Polymarket Data API response.
// currentValue is shares × current price in USDC, already USD-denominated.
const PositionSchema = z.object({
  proxyWallet: z.string(),
  asset: z.string(),
  conditionId: z.string(),
  size: z.number(),
  avgPrice: z.number(),
  initialValue: z.number(),
  currentValue: z.number(),
  cashPnl: z.number(),
  percentPnl: z.number(),
  totalBought: z.number(),
  realizedPnl: z.number(),
  percentRealizedPnl: z.number(),
  curPrice: z.number(),
  redeemable: z.boolean(),
  mergeable: z.boolean(),
  title: z.string(),
  slug: z.string(),
  icon: z.string().optional(),
  eventSlug: z.string().optional(),
  outcome: z.string(),
  outcomeIndex: z.number().int(),
  oppositeOutcome: z.string(),
  oppositeAsset: z.string(),
  endDate: z.string(),
  negativeRisk: z.boolean(),
});

const PositionsResponseSchema = z.array(PositionSchema);

export type PolymarketPosition = z.infer<typeof PositionSchema>;

// Returns open positions for a Polygon wallet address.
// Uses cursor-based pagination (next_cursor / after_cursor) to fetch all pages.
export async function getPositions(address: string): Promise<PolymarketPosition[]> {
  const all: PolymarketPosition[] = [];
  let afterCursor: string | null = null;

  // Safety cap to prevent unbounded pagination.
  const MAX_PAGES = 20;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${DATA_API_BASE}/positions`);
    url.searchParams.set('user', address);
    url.searchParams.set('sizeThreshold', '0');
    if (afterCursor !== null) {
      url.searchParams.set('after_cursor', afterCursor);
    }

    const res = await fetchWithRetry(url.toString());

    if (!res.ok) {
      throw new PolymarketError(res.status, `Polymarket API error: ${res.status}`);
    }

    const raw: unknown = await res.json();

    // The API returns a plain array (no envelope); pagination cursor comes
    // from a Link header or stops when the page is empty.
    const parsed = PositionsResponseSchema.safeParse(raw);
    if (!parsed.success) break;

    all.push(...parsed.data);

    // Stop when we get fewer results than a full page (no more data).
    if (parsed.data.length < 100) break;

    // Advance cursor if the response includes one (keyset pagination).
    const nextCursor = res.headers.get('next_cursor');
    if (!nextCursor) break;
    afterCursor = nextCursor;
  }

  return all;
}

// Returns the total USD value of all open positions for a wallet address.
// Value is computed from currentValue (shares × curPrice in USDC) per position.
export async function getPortfolioValue(address: string): Promise<number> {
  const positions = await getPositions(address);
  if (positions.length === 0) return 0;
  return positions.reduce((sum, p) => sum + p.currentValue, 0);
}
