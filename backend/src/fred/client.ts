import { fetchWithRetry } from '../util/fetch.js';
import { cachedByKey, PRICE_TTL } from '../util/price-cache.js';

// FRED — the St. Louis Fed's series database, here for exactly one series.
//
// USSTHPI is the FHFA All-Transactions House Price Index for the United
// States, quarterly, published since 1975. It is the index half of DR-21's
// derived valuation: "purchase price plus index, requires no credential and no
// maintenance". The other half, the purchase price, RentCast already hands us
// as `lastSalePrice` and we currently discard.
//
// NO API KEY. FRED's documented JSON API requires one (it answers 400 without,
// verified), but the graph CSV endpoint below does not, and returns the same
// series. That is deliberate here: this integration exists so that property —
// the largest asset most Americans own, and one that throws on every call
// today because RENTCAST_API_KEY is unset — has a valuation path needing no
// signup at all.
//
// If that endpoint ever stops serving, the supported upgrade is a free FRED
// key and `https://api.stlouisfed.org/fred/series/observations`, same series
// id, same shape after parsing. That is the only reason to add a key.
const SERIES_ID = 'USSTHPI';
const CSV_URL = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${SERIES_ID}`;

/** One quarterly observation. `date` is the first day of the quarter, which is
 *  how FRED stamps them: 1975-01-01, 1975-04-01, and so on. */
export type HpiObservation = { date: string; value: number };

/**
 * The full USSTHPI series, oldest first.
 *
 * Shared across every user — a national house price index does not vary by
 * customer — so it goes through the same cache as gold and FX. The series is
 * QUARTERLY, so a seven-day TTL still cannot serve a stale figure: at worst it
 * is six days behind a number that changes four times a year.
 */
async function fetchHpiSeries(): Promise<HpiObservation[]> {
  const res = await fetchWithRetry(CSV_URL);
  if (!res.ok) throw new Error(`FRED ${SERIES_ID} fetch failed: ${res.status}`);

  const text = await res.text();
  const lines = text.trim().split('\n');
  // Header is `observation_date,USSTHPI`. Anything else means the endpoint
  // changed shape, and guessing at a house price index is not acceptable.
  const header = lines[0]?.trim();
  if (header === undefined || !header.startsWith('observation_date,')) {
    throw new Error(`FRED ${SERIES_ID} returned an unrecognised header`);
  }

  const observations: HpiObservation[] = [];
  for (const line of lines.slice(1)) {
    const [date, rawValue] = line.split(',');
    if (date === undefined || rawValue === undefined) continue;
    // FRED writes a missing observation as `.`, which parses to NaN. Skipping
    // is correct: a gap in the series is not an index of zero.
    const value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value)) continue;
    observations.push({ date: date.trim(), value });
  }

  if (observations.length === 0) throw new Error(`FRED ${SERIES_ID} returned no usable observations`);
  return observations;
}

export const getHpiSeries = cachedByKey(PRICE_TTL.STATISTICAL, () => SERIES_ID, fetchHpiSeries);

/**
 * The index value in effect on `date`, i.e. the most recent observation at or
 * before it.
 *
 * Not the nearest observation: a purchase in February is governed by the
 * quarter that had already begun, not by the one that starts in April and
 * happens to be closer on the calendar. Returns null for a date earlier than
 * the series itself, which is a real answer about coverage rather than a
 * reason to extrapolate.
 */
export function indexAsOf(series: HpiObservation[], date: string): HpiObservation | null {
  let match: HpiObservation | null = null;
  for (const o of series) {
    if (o.date <= date) match = o;
    else break;
  }
  return match;
}

export type DerivedValuation = {
  valueUsd: number;
  /** The index at purchase and the latest index, so the number can be explained
   *  rather than merely displayed. */
  purchaseIndex: HpiObservation;
  latestIndex: HpiObservation;
};

/**
 * Values a property as `purchase price x (index now / index at purchase)`.
 *
 * This is an INDEX-TRACKED estimate, not an appraisal, and it is honest about
 * being one: it says what a typical US home bought for that price on that date
 * would be worth now. It knows nothing about this particular house — no
 * renovation, no neighbourhood, no condition. That is exactly why DR-21 wants
 * it as the no-credential tier rather than as the best available answer, and
 * why the caller records `valuation_source` alongside the figure.
 *
 * Returns null when the purchase predates the series or the index is unusable,
 * never a guess.
 */
export async function deriveValueFromPurchase(
  purchasePriceUsd: number,
  purchaseDate: string,
): Promise<DerivedValuation | null> {
  if (!Number.isFinite(purchasePriceUsd) || purchasePriceUsd <= 0) return null;

  const series = await getHpiSeries();
  const purchaseIndex = indexAsOf(series, purchaseDate);
  const latestIndex = series[series.length - 1];

  if (purchaseIndex === null || latestIndex === undefined) return null;
  // A zero or negative base would make the ratio meaningless rather than
  // merely imprecise.
  if (purchaseIndex.value <= 0) return null;

  return {
    valueUsd: purchasePriceUsd * (latestIndex.value / purchaseIndex.value),
    purchaseIndex,
    latestIndex,
  };
}
