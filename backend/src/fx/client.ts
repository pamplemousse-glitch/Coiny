// Frankfurter ECB exchange rate client.
// Public API — no authentication required.
// Base URL: https://api.frankfurter.dev/v1
//
// Example: GET /latest?from=GBP&to=USD,EUR
// Response: { "amount": 1.0, "base": "GBP", "date": "2026-05-28", "rates": { "USD": 1.34, "EUR": 1.15 } }

import { z } from 'zod';

const BASE_URL = 'https://api.frankfurter.dev/v1';

export class FrankfurterError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'FrankfurterError';
  }
}

const RatesResponseSchema = z.object({
  amount: z.number(),
  base: z.string(),
  date: z.string(),
  rates: z.record(z.string(), z.number()),
});

type RatesResponse = z.infer<typeof RatesResponseSchema>;

async function fetchRates(from: string, to: string[]): Promise<RatesResponse> {
  const params = new URLSearchParams({ from, to: to.join(',') });
  const url = `${BASE_URL}/latest?${params}`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!res.ok) {
    throw new FrankfurterError(res.status, `Frankfurter API error: ${res.status} ${res.statusText}`);
  }

  const raw: unknown = await res.json();
  return RatesResponseSchema.parse(raw);
}

/**
 * Returns the exchange rate from one currency to another.
 * Throws FrankfurterError on non-2xx responses.
 * Throws if the target currency is not present in the response.
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  const data = await fetchRates(from, [to]);
  const rate = data.rates[to];
  if (rate === undefined) {
    throw new FrankfurterError(422, `Currency ${to} not found in Frankfurter response`);
  }
  return rate;
}

/**
 * Returns a map of exchange rates from one currency to multiple targets.
 * Currencies missing from the API response are omitted from the result map.
 */
export async function getExchangeRates(from: string, to: string[]): Promise<Record<string, number>> {
  const data = await fetchRates(from, to);
  return data.rates;
}

/**
 * Converts an amount in the given currency to USD using the live ECB rate.
 * Convenience wrapper around getExchangeRate.
 */
export async function convertToUsd(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === 'USD') return amount;
  const rate = await getExchangeRate(fromCurrency, 'USD');
  return amount * rate;
}
