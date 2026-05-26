import { z } from 'zod';
import { config } from '../config.js';

const MarketCheckResponseSchema = z.object({
  listing_price: z.number().optional(),
  predicted_price: z.number().optional(),
});

export async function getVehicleValue(vin: string): Promise<number> {
  if (!config.MARKETCHECK_API_KEY) throw new Error('MARKETCHECK_API_KEY not configured');

  const url = `https://mc-api.marketcheck.com/v2/predict/car/value?api_key=${config.MARKETCHECK_API_KEY}&vin=${encodeURIComponent(vin)}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`MarketCheck API error: ${res.status}`);

  const parsed = MarketCheckResponseSchema.parse(await res.json());
  const price = parsed.listing_price ?? parsed.predicted_price;
  if (price === undefined) throw new Error('MarketCheck returned no price for VIN');
  return price;
}
