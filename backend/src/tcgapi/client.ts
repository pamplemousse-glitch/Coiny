import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

// TCGapi — https://tcgapi.dev
// Free tier: 100 req/day. Auth: X-API-Key header.

const TCGAPI_BASE = 'https://api.tcgapi.dev/v1';

const CardResultSchema = z.object({
  name: z.string(),
  set: z.string().optional(),
  market_price: z.number().nullable().optional(),
  low_price: z.number().nullable().optional(),
  foil_price: z.number().nullable().optional(),
});

const SearchResponseSchema = z.object({
  data: z.array(CardResultSchema),
});

/**
 * Returns the market price (USD) for the given trading card.
 * If isFoil is true, prefers foil_price over market_price.
 * If setName is provided, tries to match it before falling back to first result.
 * Returns null if the key is absent, the API errors, or no card is found.
 */
export async function getTradingCardPrice(
  cardName: string,
  game: string,
  setName: string | null,
  isFoil: boolean,
  apiKey: string,
): Promise<number | null> {
  if (!apiKey) return null;

  const url = new URL(`${TCGAPI_BASE}/search`);
  url.searchParams.set('q', cardName);
  url.searchParams.set('game', game);

  const res = await fetchWithRetry(url.toString(), {
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = SearchResponseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.data.length === 0) return null;

  // Prefer set match if provided, otherwise use first result
  const cards = parsed.data.data;
  const match = setName ? (cards.find((c) => c.set?.toLowerCase() === setName.toLowerCase()) ?? cards[0]!) : cards[0]!;

  const price = isFoil ? (match.foil_price ?? match.market_price) : match.market_price;
  return price ?? null;
}
