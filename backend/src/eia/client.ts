import { z } from 'zod';
import { config } from '../config.js';

// EIA v2 API — weekly spot prices for energy commodities.
// Series IDs: WTI crude = RWTC, Brent = RBRTE, Henry Hub natural gas = RNGWHHD
const COMMODITY_SERIES: Record<string, { route: string; series: string }> = {
  wti_crude: { route: 'petroleum/pri/spt', series: 'RWTC' },
  brent: { route: 'petroleum/pri/spt', series: 'RBRTE' },
  natural_gas: { route: 'natural-gas/pri/fut', series: 'RNGWHHD' },
};

const EiaResponseSchema = z.object({
  response: z.object({
    data: z.array(
      z.object({
        period: z.string(),
        value: z.union([z.number(), z.string()]).nullable(),
      }),
    ),
  }),
});

export async function getEnergySpotPrice(commodity: string): Promise<number | null> {
  if (!config.EIA_API_KEY) return null;

  const meta = COMMODITY_SERIES[commodity];
  if (!meta) return null;

  const params = new URLSearchParams({
    api_key: config.EIA_API_KEY,
    'facets[series][]': meta.series,
    'data[0]': 'value',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    offset: '0',
    length: '1',
  });

  const res = await fetch(`https://api.eia.gov/v2/${meta.route}/data/?${params}`);
  if (!res.ok) return null;

  const parsed = EiaResponseSchema.safeParse(await res.json());
  if (!parsed.success) return null;

  const point = parsed.data.response.data[0];
  if (!point?.value) return null;

  const price = typeof point.value === 'string' ? parseFloat(point.value) : point.value;
  return Number.isNaN(price) ? null : price;
}
