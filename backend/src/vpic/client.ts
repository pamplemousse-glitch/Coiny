import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

// NHTSA vPIC — the US federal VIN decoder. No key, no signup, no published
// rate limit, and it is the authority every US vehicle vendor decodes against.
//
// Two jobs here, and the second is the one that pays for this file:
//
//  1. Give a vehicle a NAME. A car currently shows in the app as a raw VIN, or
//     as nothing at all while MARKETCHECK_API_KEY is unset, which is its state
//     today. Make, model, year and trim need no paid vendor.
//  2. Refuse to spend a MarketCheck call on a VIN that cannot decode.
//     MarketCheck's free tier is 500 calls/month and its next tier is
//     $299/month with no step in between (docs/handoff-2026-08-19.md), so the
//     quota is worth defending. vPIC costs nothing and answers first.
const BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';

// vPIC always answers 200 with a Results array of exactly one object, even for
// input that is not a VIN at all. Every value is a string, and a field it
// could not determine is the EMPTY STRING rather than null, which is why each
// one is normalised through `nullIfBlank` below rather than read directly.
const DecodeResultSchema = z.object({
  Results: z
    .array(
      z.object({
        ErrorCode: z.string().optional(),
        ErrorText: z.string().optional(),
        Make: z.string().optional(),
        Model: z.string().optional(),
        ModelYear: z.string().optional(),
        Trim: z.string().optional(),
        BodyClass: z.string().optional(),
        VehicleType: z.string().optional(),
      }),
    )
    .min(1),
});

export type VinDecode = {
  make: string | null;
  model: string | null;
  modelYear: number | null;
  trim: string | null;
  bodyClass: string | null;
  vehicleType: string | null;
  /** vPIC's raw code list, kept verbatim for diagnosis. */
  errorCode: string | null;
  /**
   * Whether this VIN is worth spending a paid valuation call on.
   *
   * NOT the same as "decoded perfectly". ErrorCode is a COMMA-SEPARATED list,
   * and the codes that matter here are:
   *
   *   0   decoded clean
   *   1   check digit does not calculate — almost always a typo, but the rest
   *       of the VIN still decodes, so make/model/year are still worth showing
   *   6   incomplete VIN
   *   7   manufacturer not registered with NHTSA (legitimate for some imports)
   *   11  / 400  structurally unusable input
   *
   * The test is deliberately permissive: anything that yielded a make AND a
   * model year is usable, whatever else vPIC grumbled about. Being strict here
   * would reject grey-import and kit vehicles that MarketCheck might still
   * price, and this flag's only power is to SKIP a call, so a false negative
   * costs the user a valuation while a false positive costs one free call.
   */
  usable: boolean;
};

const nullIfBlank = (v: string | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

/**
 * Decodes a VIN, or returns null when vPIC could not be reached.
 *
 * null means "unknown", exactly as the chain clients now do: a decode we could
 * not perform is not a vehicle without a make. Callers must treat null as
 * "carry on without enrichment", never as "this VIN is bad" — vPIC being down
 * is not evidence about the user's car.
 */
export async function decodeVin(vin: string): Promise<VinDecode | null> {
  const res = await fetchWithRetry(`${BASE_URL}/${encodeURIComponent(vin)}?format=json`);
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = DecodeResultSchema.safeParse(raw);
  if (!parsed.success) return null;

  const r = parsed.data.Results[0];
  if (!r) return null;

  const modelYearRaw = nullIfBlank(r.ModelYear);
  const modelYear = modelYearRaw !== null ? Number.parseInt(modelYearRaw, 10) : null;
  const make = nullIfBlank(r.Make);

  return {
    make,
    model: nullIfBlank(r.Model),
    modelYear: modelYear !== null && Number.isFinite(modelYear) ? modelYear : null,
    trim: nullIfBlank(r.Trim),
    bodyClass: nullIfBlank(r.BodyClass),
    vehicleType: nullIfBlank(r.VehicleType),
    errorCode: nullIfBlank(r.ErrorCode),
    usable: make !== null && modelYear !== null,
  };
}

/** "2003 Honda Accord EX-V6" from the parts vPIC returned, or null if there
 *  are not enough of them to name the car. Year first because that is how
 *  people say it. */
export function describeVehicle(decode: VinDecode): string | null {
  const parts = [decode.modelYear?.toString(), decode.make, decode.model, decode.trim].filter(
    (p): p is string => p !== null && p !== undefined,
  );
  return parts.length > 0 ? parts.join(' ') : null;
}
