import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';
import { cachedByKey, PRICE_TTL } from '../util/price-cache.js';

const BASE_URL = 'https://www.pokemonpricetracker.com';

const CardSchema = z.object({
  name: z.string(),
  setName: z.string().nullable().optional(),
  prices: z
    .object({
      market: z.number().nullable().optional(),
      variants: z
        .record(z.string(), z.record(z.string(), z.object({ price: z.number().nullable().optional() })))
        .optional(),
    })
    .optional(),
});

const SearchResponseSchema = z.object({
  data: z.array(CardSchema),
});

async function fetchPokemonCardPrice(
  cardName: string,
  setName: string | null,
  variant: string | null,
  apiKey: string,
): Promise<number | null> {
  const params = new URLSearchParams({ search: cardName, limit: '20' });
  const res = await fetchWithRetry(`${BASE_URL}/api/v2/cards?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) return null;

  const parsed = SearchResponseSchema.safeParse(await res.json());
  if (!parsed.success) return null;

  let candidates = parsed.data.data.filter((c) => c.name.toLowerCase().includes(cardName.toLowerCase()));

  if (setName) {
    const setLower = setName.toLowerCase();
    const filtered = candidates.filter((c) => c.setName?.toLowerCase().includes(setLower));
    if (filtered.length > 0) candidates = filtered;
  }

  const card = candidates[0];
  if (!card?.prices) return null;

  if (variant && card.prices.variants) {
    const variantKey = Object.keys(card.prices.variants).find((k) => k.toLowerCase() === variant.toLowerCase());
    if (variantKey) {
      const conditions = card.prices.variants[variantKey]!;
      const firstCondition = Object.values(conditions)[0];
      const price = firstCondition?.price;
      if (price != null) return price;
    }
  }

  return card.prices.market ?? null;
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
const cachedPokemon = cachedByKey(
  PRICE_TTL.COLLECTIBLE,
  (cardName: string, setName: string | null, variant: string | null, _apiKey: string) =>
    `${cardName}|${setName ?? ''}|${variant ?? ''}`.toLowerCase(),
  fetchPokemonCardPrice,
  // Never cache a null: this client returns null for "could not price this"
  // rather than throwing, and storing it would serve "no price" for a day
  // after one bad request.
  (v) => v !== null,
);

export async function getPokemonCardPrice(
  cardName: string,
  setName: string | null,
  variant: string | null,
  apiKey: string,
): Promise<number | null> {
  // Outside the cache deliberately. A missing API key is a config state, not a
  // price, and the cache key excludes the key (a secret has no business in
  // one), so caching this would poison the real lookup.
  if (!apiKey) return null;
  return cachedPokemon(cardName, setName, variant, apiKey);
}

/** Test seam: the cache is module-level state. */
export const _clearPokemonCache = cachedPokemon.clear;
