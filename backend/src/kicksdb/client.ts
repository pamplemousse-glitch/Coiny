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
  /** Primary product shot. A sneaker IS a visual object, and this arrives in
   *  the response we already spend a request on. */
  image: string | null;
};

type StockXProductsResponse = {
  data: StockXProduct[];
};

/** A sneaker's price and its picture, from the one product response. */
export type SneakerFacts = {
  priceUsd: number | null;
  /** Absolute CDN URL, or null when the product carries no image. */
  imageUrl: string | null;
};

// Returns the lowest ask in USD for the given SKU, plus the product image. If
// `size` is provided, returns the lowest ask for that specific size; otherwise
// returns the product min_price (cheapest size available).
export async function getSneakerFacts(sku: string, size?: string): Promise<SneakerFacts | null> {
  if (!config.KICKSDB_API_KEY) return null;

  const url = `${BASE_URL}/v3/stockx/products?query=${encodeURIComponent(sku)}&display[variants]=true&market=US`;
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

  const imageUrl = product.image ?? null;

  if (size) {
    const variant = product.variants?.find((v) => v.size === size || v.size === `M ${size}` || v.size === `W ${size}`);
    // The image belongs to the product, not the size, so it survives a variant
    // we could not match: knowing which shoe it is does not depend on knowing
    // what it sells for in a 10.5.
    return { priceUsd: variant?.lowest_ask ?? null, imageUrl };
  }

  return { priceUsd: product.min_price ?? null, imageUrl };
}

/** Price only, for callers that do not care about the picture. */
export async function getSneakerPrice(sku: string, size?: string): Promise<number | null> {
  const facts = await getSneakerFacts(sku, size);
  return facts?.priceUsd ?? null;
}
