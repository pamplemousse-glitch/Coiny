import { z } from 'zod';
import { config } from '../config.js';

// TCGapi (tcgapi.dev) — trading card market prices.
// Supports Magic: The Gathering, Yu-Gi-Oh, sports cards, and others.
const PriceResponseSchema = z.object({
  data: z.array(
    z.object({
      name: z.string(),
      set: z.string().optional().nullable(),
      prices: z
        .object({
          market: z.number().nullable().optional(),
          low: z.number().nullable().optional(),
          mid: z.number().nullable().optional(),
        })
        .optional(),
    }),
  ),
});

export async function getTradingCardPrice(
  cardName: string,
  game: string,
  setName: string | null,
  _isFoil: boolean,
): Promise<number | null> {
  if (!config.TCGAPI_KEY) return null;

  const params = new URLSearchParams({ name: cardName, game });
  if (setName) params.set('set', setName);

  const res = await fetch(`https://api.tcgapi.dev/v1/cards?${params}`, {
    headers: { Authorization: `Bearer ${config.TCGAPI_KEY}` },
  });

  if (!res.ok) return null;

  const parsed = PriceResponseSchema.safeParse(await res.json());
  if (!parsed.success || parsed.data.data.length === 0) return null;

  const card = parsed.data.data[0];
  const prices = card?.prices;
  if (!prices) return null;

  return prices.market ?? prices.mid ?? prices.low ?? null;
}
