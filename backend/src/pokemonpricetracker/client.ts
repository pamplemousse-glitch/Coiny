import { z } from 'zod';

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

export async function getPokemonCardPrice(
  cardName: string,
  setName: string | null,
  variant: string | null,
  apiKey: string,
): Promise<number | null> {
  const params = new URLSearchParams({ search: cardName, limit: '20' });
  const res = await fetch(`${BASE_URL}/api/v2/cards?${params}`, {
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
