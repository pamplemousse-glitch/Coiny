import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';
import { cachedByKey, PRICE_TTL } from '../util/price-cache.js';

// TCGapi — https://tcgapi.dev
// Free tier: 100 req/day. Auth: X-API-Key header.

const TCGAPI_BASE = 'https://api.tcgapi.dev/v1';

const CardResultSchema = z.object({
  name: z.string(),
  set: z.string().optional(),
  market_price: z.number().nullable().optional(),
  low_price: z.number().nullable().optional(),
  foil_price: z.number().nullable().optional(),
  // TCGPlayer CDN URL for the card face. Free in the same response we already
  // pay a request for; a card is a picture more than it is a row of text.
  image_url: z.string().nullable().optional(),
});

const SearchResponseSchema = z.object({
  data: z.array(CardResultSchema),
});

/** A card's price and its picture, both from the one search response. */
export type TradingCardFacts = {
  priceUsd: number | null;
  /** Absolute CDN URL, or null when the vendor had no image for this card. */
  imageUrl: string | null;
};

/**
 * Returns the market price (USD) and image for the given trading card.
 * If isFoil is true, prefers foil_price over market_price.
 * If setName is provided, tries to match it before falling back to first result.
 * Returns null if the key is absent, the API errors, or no card is found.
 */
async function fetchTradingCard(
  cardName: string,
  game: string,
  setName: string | null,
  isFoil: boolean,
  apiKey: string,
): Promise<TradingCardFacts | null> {
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
  return { priceUsd: price ?? null, imageUrl: match.image_url ?? null };
}

/**
 * A product's market price is the same for every user who owns one, so this is
 * fetched once per TTL rather than once per user per refresh.
 *
 * Keyed on the product identity, NOT the API key: a secret has no business in
 * a cache key, and it is identical on every call regardless.
 *
 * A day is generous against `networth/classes.ts`, which already treats this
 * class as fresh for a week. Comps-based prices do not move intraday.
 */
const cachedTcg = cachedByKey(
  PRICE_TTL.COLLECTIBLE,
  (cardName: string, game: string, setName: string | null, isFoil: boolean, _apiKey: string) =>
    `${game}|${cardName}|${setName ?? ''}|${isFoil}`.toLowerCase(),
  fetchTradingCard,
  // Never cache a null: this client returns null for "could not price this"
  // rather than throwing, and storing it would serve "no price" for a day
  // after one bad request.
  (v) => v !== null,
);

/** Price and picture together. The image ships in the same response as the
 *  price, so fetching it costs nothing extra against the 100/day free tier. */
export async function getTradingCard(
  cardName: string,
  game: string,
  setName: string | null,
  isFoil: boolean,
  apiKey: string,
): Promise<TradingCardFacts | null> {
  if (!apiKey) return null;
  return cachedTcg(cardName, game, setName, isFoil, apiKey);
}

export async function getTradingCardPrice(
  cardName: string,
  game: string,
  setName: string | null,
  isFoil: boolean,
  apiKey: string,
): Promise<number | null> {
  // Outside the cache deliberately. A missing API key is a config state, not a
  // price, and the cache key excludes the key (a secret has no business in
  // one), so caching this would poison the real lookup.
  if (!apiKey) return null;
  const facts = await cachedTcg(cardName, game, setName, isFoil, apiKey);
  return facts?.priceUsd ?? null;
}

/** Test seam: the cache is module-level state. */
export const _clearTcgCache = cachedTcg.clear;
