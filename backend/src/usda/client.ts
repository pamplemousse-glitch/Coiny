import { z } from 'zod';

// USDA NASS Quick Stats API — https://quickstats.nass.usda.gov/api
// Free key: https://quickstats.nass.usda.gov/api
// Used to retrieve average land value per acre by US state.

const USDA_BASE = 'https://quickstats.nass.usda.gov/api/api_GET/';

// US state abbreviation → USDA NASS state name mapping
// NASS uses full state names in the state_name parameter.
const STATE_NAMES: Record<string, string> = {
  AL: 'ALABAMA', AK: 'ALASKA', AZ: 'ARIZONA', AR: 'ARKANSAS',
  CA: 'CALIFORNIA', CO: 'COLORADO', CT: 'CONNECTICUT', DE: 'DELAWARE',
  FL: 'FLORIDA', GA: 'GEORGIA', HI: 'HAWAII', ID: 'IDAHO',
  IL: 'ILLINOIS', IN: 'INDIANA', IA: 'IOWA', KS: 'KANSAS',
  KY: 'KENTUCKY', LA: 'LOUISIANA', ME: 'MAINE', MD: 'MARYLAND',
  MA: 'MASSACHUSETTS', MI: 'MICHIGAN', MN: 'MINNESOTA', MS: 'MISSISSIPPI',
  MO: 'MISSOURI', MT: 'MONTANA', NE: 'NEBRASKA', NV: 'NEVADA',
  NH: 'NEW HAMPSHIRE', NJ: 'NEW JERSEY', NM: 'NEW MEXICO', NY: 'NEW YORK',
  NC: 'NORTH CAROLINA', ND: 'NORTH DAKOTA', OH: 'OHIO', OK: 'OKLAHOMA',
  OR: 'OREGON', PA: 'PENNSYLVANIA', RI: 'RHODE ISLAND', SC: 'SOUTH CAROLINA',
  SD: 'SOUTH DAKOTA', TN: 'TENNESSEE', TX: 'TEXAS', UT: 'UTAH',
  VT: 'VERMONT', VA: 'VIRGINIA', WA: 'WASHINGTON', WV: 'WEST VIRGINIA',
  WI: 'WISCONSIN', WY: 'WYOMING',
};

const NassResponseSchema = z.object({
  data: z.array(
    z.object({
      Value: z.string(),
      year: z.string(),
    }),
  ),
});

/**
 * Returns the most recent average land value per acre (USD) for the given US state.
 * Uses NASS "LAND & BUILDINGS" > "LAND, CROPLAND" > "VALUE PER ACRE" survey.
 * Returns null if the key is absent, the API errors, or no data is found.
 */
export async function getFarmlandPricePerAcre(stateCode: string, apiKey: string): Promise<number | null> {
  if (!apiKey) return null;

  const stateName = STATE_NAMES[stateCode.toUpperCase()];
  if (!stateName) return null;

  const url = new URL(USDA_BASE);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('source_desc', 'SURVEY');
  url.searchParams.set('sector_desc', 'ECONOMICS');
  url.searchParams.set('group_desc', 'LAND & BUILDINGS');
  url.searchParams.set('commodity_desc', 'LAND & BUILDINGS');
  url.searchParams.set('statisticcat_desc', 'VALUE');
  url.searchParams.set('unit_desc', '$ / ACRE');
  url.searchParams.set('agg_level_desc', 'STATE');
  url.searchParams.set('state_name', stateName);
  url.searchParams.set('domain_desc', 'TOTAL');
  url.searchParams.set('short_desc', 'LAND & BUILDINGS, INCL GOVT PROGRAMS - VALUE, MEASURED IN $ / ACRE');
  url.searchParams.set('format', 'JSON');

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = NassResponseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.data.length === 0) return null;

  // Sort by year descending and take the most recent non-empty value
  const rows = parsed.data.data
    .filter((r) => r.Value && r.Value !== '(D)' && r.Value !== '(NA)')
    .sort((a, b) => parseInt(b.year, 10) - parseInt(a.year, 10));

  if (rows.length === 0) return null;

  // NASS values may include commas (e.g. "3,850")
  const raw_value = rows[0]!.Value.replace(/,/g, '');
  const price = parseFloat(raw_value);
  return isNaN(price) ? null : price;
}
