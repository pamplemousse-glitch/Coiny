import { z } from 'zod';
import { config } from '../config.js';

const RentcastResponseSchema = z.object({
  price: z.number(),
});

export async function getPropertyValue(address: string): Promise<number> {
  if (!config.RENTCAST_API_KEY) throw new Error('RENTCAST_API_KEY not configured');

  const url = `https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { 'X-Api-Key': config.RENTCAST_API_KEY },
  });

  if (!res.ok) throw new Error(`RentCast API error: ${res.status}`);

  const parsed = RentcastResponseSchema.parse(await res.json());
  return parsed.price;
}
