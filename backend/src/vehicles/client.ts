import { z } from 'zod';
import { config } from '../config.js';

const MarketCheckResponseSchema = z.object({
  marketcheck_price: z.number(),
});

export async function getVehicleValue(
  vin: string,
  options: { miles?: number; zip?: string; dealerType?: 'franchise' | 'independent' } = {},
): Promise<number> {
  if (!config.MARKETCHECK_API_KEY) throw new Error('MARKETCHECK_API_KEY not configured');

  const miles = options.miles ?? 50000;
  const zip = options.zip ?? '90210';
  const dealerType = options.dealerType ?? 'franchise';

  const params = new URLSearchParams({
    api_key: config.MARKETCHECK_API_KEY,
    vin,
    miles: miles.toString(),
    dealer_type: dealerType,
    zip,
  });
  const url = `https://api.marketcheck.com/v2/predict/car/us/marketcheck_price?${params}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`MarketCheck API error: ${res.status}`);

  const parsed = MarketCheckResponseSchema.parse(await res.json());
  return parsed.marketcheck_price;
}
