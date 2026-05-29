// Steam community APIs — no API key required for public inventory + market price lookups.
// CS2 app ID is 730, context ID 2 (personal inventory).

export class SteamError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SteamError';
  }
}

interface SteamInventoryDescription {
  classid: string;
  instanceid: string;
  market_hash_name?: string;
  tradable: number;
  marketable: number;
}

interface SteamInventoryAsset {
  classid: string;
  instanceid: string;
  amount: string;
}

interface SteamInventoryResponse {
  assets?: SteamInventoryAsset[];
  descriptions?: SteamInventoryDescription[];
  success?: number;
  // Steam returns total_inventory_count when success
  total_inventory_count?: number;
  error?: string;
}

interface SteamPriceResponse {
  success: boolean;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
}

// Fetches all CS2 items from a public Steam inventory.
// Returns map of market_hash_name → quantity.
// Throws SteamError if the profile is private or the request fails.
export async function getCs2Inventory(steamId64: string): Promise<Map<string, number>> {
  const url = `https://steamcommunity.com/inventory/${steamId64}/730/2?l=english&count=5000`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Coiny/1.0 net-worth-tracker' },
  });

  if (res.status === 403) {
    throw new SteamError('Steam profile is private', 403);
  }
  if (!res.ok) {
    throw new SteamError(`Steam inventory fetch failed: ${res.status}`, res.status);
  }

  const data = (await res.json()) as SteamInventoryResponse;

  if (data.success === 0 || data.error) {
    throw new SteamError(data.error ?? 'Steam inventory returned error');
  }

  if (!data.assets || !data.descriptions) {
    return new Map();
  }

  // Build classid+instanceid → market_hash_name lookup from descriptions
  const nameMap = new Map<string, string>();
  for (const desc of data.descriptions) {
    if (desc.market_hash_name && desc.marketable === 1) {
      nameMap.set(`${desc.classid}_${desc.instanceid}`, desc.market_hash_name);
    }
  }

  // Aggregate quantities by market_hash_name
  const inventory = new Map<string, number>();
  for (const asset of data.assets) {
    const name = nameMap.get(`${asset.classid}_${asset.instanceid}`);
    if (!name) continue;
    inventory.set(name, (inventory.get(name) ?? 0) + parseInt(asset.amount, 10));
  }

  return inventory;
}

// Fetches the USD market price for a single CS2 item.
// Uses Steam Community Market price overview endpoint (no auth required).
// Returns null if the item has no market listing.
export async function getItemPriceUsd(marketHashName: string): Promise<number | null> {
  const params = new URLSearchParams({
    appid: '730',
    currency: '1', // USD
    market_hash_name: marketHashName,
  });
  const url = `https://steamcommunity.com/market/priceoverview/?${params}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Coiny/1.0 net-worth-tracker' },
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as SteamPriceResponse;
  if (!data.success) return null;

  // Prefer lowest_price (conservative), fall back to median_price
  const priceStr = data.lowest_price ?? data.median_price;
  if (!priceStr) return null;

  // Strip currency symbols and commas, parse float
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);
  return Number.isNaN(price) ? null : price;
}

// Prices a full CS2 inventory and returns total USD value.
// Deduplicates market_hash_names before fetching prices to minimize API calls.
// Adds a 1.5s delay between requests to avoid Steam rate limits.
export async function priceInventory(inventory: Map<string, number>): Promise<number> {
  const uniqueNames = [...new Set(inventory.keys())];
  const prices = new Map<string, number>();

  for (let i = 0; i < uniqueNames.length; i++) {
    if (i > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    }
    const name = uniqueNames[i]!;
    const price = await getItemPriceUsd(name);
    if (price !== null) {
      prices.set(name, price);
    }
  }

  let total = 0;
  for (const [name, qty] of inventory) {
    total += (prices.get(name) ?? 0) * qty;
  }
  return total;
}
