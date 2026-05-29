import { z } from 'zod';

// EIA Open Data API v2 — https://www.eia.gov/opendata/
// Free key: https://www.eia.gov/opendata/register.php

const EIA_BASE = 'https://api.eia.gov/v2';

// Supported commodity identifiers → { route, seriesId, unit }
// WTI and Brent spot prices from EIA petroleum spot prices dataset.
// Henry Hub from natural gas spot prices dataset.
export const EIA_COMMODITIES = {
  wti_crude: {
    route: '/petroleum/pri/spt/data/',
    facets: { series: 'RWTC' },
    unit: 'barrel',
    displayName: 'WTI Crude Oil',
  },
  brent_crude: {
    route: '/petroleum/pri/spt/data/',
    facets: { series: 'RBRTE' },
    unit: 'barrel',
    displayName: 'Brent Crude Oil',
  },
  natural_gas: {
    route: '/natural-gas/pri/fut/data/',
    facets: { series: 'RNGWHHD' },
    unit: 'mmbtu',
    displayName: 'Natural Gas (Henry Hub)',
  },
} as const;

export type EiaCommodity = keyof typeof EIA_COMMODITIES;

const EiaDataResponseSchema = z.object({
  response: z.object({
    data: z.array(
      z.object({
        period: z.string(),
        value: z.number().nullable(),
      }),
    ),
  }),
});

/**
 * Fetches the latest spot price (USD per unit) for the given commodity.
 * Returns null if the key is absent, the API errors, or no data is returned.
 */
export async function getEiaSpotPrice(commodity: EiaCommodity, apiKey: string): Promise<number | null> {
  if (!apiKey) return null;

  const meta = EIA_COMMODITIES[commodity];
  const url = new URL(`${EIA_BASE}${meta.route}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('frequency', 'daily');
  url.searchParams.set('data[0]', 'value');
  url.searchParams.set('facets[series][]', meta.facets.series);
  url.searchParams.set('sort[0][column]', 'period');
  url.searchParams.set('sort[0][direction]', 'desc');
  url.searchParams.set('length', '1');

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = EiaDataResponseSchema.safeParse(raw);
  if (!parsed.success) return null;

  const row = parsed.data.response.data[0];
  return row?.value ?? null;
}

/**
 * Returns a map of commodity → spot price for all supported commodities.
 * Entries with null prices (API down or key missing) are omitted from the map.
 */
export async function getAllEiaSpotPrices(
  apiKey: string,
): Promise<Map<EiaCommodity, number>> {
  const entries = await Promise.all(
    (Object.keys(EIA_COMMODITIES) as EiaCommodity[]).map(async (commodity) => {
      const price = await getEiaSpotPrice(commodity, apiKey).catch(() => null);
      return [commodity, price] as const;
    }),
  );

  return new Map(entries.filter((e): e is [EiaCommodity, number] => e[1] !== null));
}
