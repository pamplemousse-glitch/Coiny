import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URL = 'https://api.kicks.dev';

export class KicksDbError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'KicksDbError';
  }
}

type StockXVariant = {
  size: string;
  lowest_ask: number | null;
};

type StockXProduct = {
  id: string;
  title: string;
  sku: string;
  min_price: number | null;
  variants: StockXVariant[] | null;
};

type StockXProductsResponse = {
  data: StockXProduct[];
};

// Returns the lowest ask in USD for the given SKU. If `size` is provided,
// returns the lowest ask for that specific size; otherwise returns the product
// min_price (cheapest size available).
export async function getSneakerPrice(sku: string, size?: string): Promise<number | null> {
  if (!config.KICKSDB_API_KEY) return null;

  const url = `${BASE_URL}/v3/stockx/products?query=${encodeURIComponent(sku)}&display[variants]=true&market=USD`;
  const res = await fetchWithRetry(url, {
    headers: {
      Authorization: config.KICKSDB_API_KEY,
      'User-Agent': 'Coiny/1.0',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new KicksDbError(res.status, `KicksDB error ${res.status}: ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as StockXProductsResponse;
  const product = body.data?.[0];
  if (!product) return null;

  if (size) {
    const variant = product.variants?.find((v) => v.size === size || v.size === `M ${size}` || v.size === `W ${size}`);
    return variant?.lowest_ask ?? null;
  }

  return product.min_price ?? null;
}
