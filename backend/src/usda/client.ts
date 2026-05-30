import { z } from 'zod';
import { config } from '../config.js';

// USDA NASS Quick Stats API — farmland value per acre by state.
// Returns the most-recent "Land & Buildings" survey value in USD per acre.
const NassResponseSchema = z.object({
  data: z.array(
    z.object({
      Value: z.string(),
      year: z.string(),
    }),
  ),
});

export async function getFarmlandPricePerAcre(stateCode: string): Promise<number | null> {
  if (!config.USDA_NASS_API_KEY) return null;

  const params = new URLSearchParams({
    key: config.USDA_NASS_API_KEY,
    source_desc: 'SURVEY',
    sector_desc: 'ECONOMICS',
    group_desc: 'FARMS & LAND & ASSETS',
    commodity_desc: 'LAND & BUILDINGS',
    statisticcat_desc: 'VALUE',
    unit_desc: '$ / ACRE',
    state_alpha: stateCode.toUpperCase(),
    format: 'JSON',
  });

  const res = await fetch(`https://quickstats.nass.usda.gov/api/api_GET/?${params}`);
  if (!res.ok) return null;

  const parsed = NassResponseSchema.safeParse(await res.json());
  if (!parsed.success || parsed.data.data.length === 0) return null;

  // Sort descending by year and take most recent
  const sorted = [...parsed.data.data].sort((a, b) => parseInt(b.year) - parseInt(a.year));
  const raw = sorted[0]?.Value.replace(/,/g, '');
  if (!raw) return null;

  const price = parseFloat(raw);
  return isNaN(price) ? null : price;
}
