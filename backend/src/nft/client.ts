import { z } from 'zod';

export class AlchemyError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AlchemyError';
    this.status = status;
  }
}

const AlchemyFloorPriceSchema = z
  .object({
    floorPrice: z.number(),
    priceCurrency: z.string(),
  })
  .nullable()
  .optional();

const AlchemyOwnedNftSchema = z.object({
  contract: z.object({
    address: z.string(),
    name: z.string().optional(),
  }),
  tokenId: z.string(),
  tokenType: z.string(),
  floorPrice: AlchemyFloorPriceSchema,
});

const AlchemyNftsResponseSchema = z.object({
  ownedNfts: z.array(AlchemyOwnedNftSchema),
  totalCount: z.number(),
});

type AlchemyNftsResponse = z.infer<typeof AlchemyNftsResponseSchema>;

const ALCHEMY_BASE = 'https://eth-mainnet.g.alchemy.com/nft/v3';

/**
 * Fetches all NFTs for the given Ethereum address via Alchemy NFT API v3.
 * Handles pagination via pageKey. Throws AlchemyError on non-2xx responses.
 */
async function fetchNftsForOwner(address: string, apiKey: string): Promise<AlchemyNftsResponse['ownedNfts']> {
  const all: AlchemyNftsResponse['ownedNfts'] = [];
  let pageKey: string | undefined;

  do {
    const url = new URL(`${ALCHEMY_BASE}/${encodeURIComponent(apiKey)}/getNFTsForOwner`);
    url.searchParams.set('owner', address);
    url.searchParams.set('withFloorPrice', 'true');
    if (pageKey) url.searchParams.set('pageKey', pageKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new AlchemyError(`Alchemy API error: ${res.status}`, res.status);
    }

    const raw: unknown = await res.json();
    const parsed = AlchemyNftsResponseSchema.parse(raw);
    all.push(...parsed.ownedNfts);

    // Alchemy returns a pageKey field when more results are available.
    const rawObj = raw as Record<string, unknown>;
    pageKey = typeof rawObj.pageKey === 'string' ? rawObj.pageKey : undefined;
  } while (pageKey);

  return all;
}

/**
 * Returns the total USD value of the NFT portfolio for the given Ethereum address.
 * Sums floorPrice for NFTs where priceCurrency === 'ETH', then multiplies by ethPriceUsd.
 * Returns 0 when the wallet holds no NFTs with ETH floor prices.
 * Throws immediately if apiKey is empty.
 */
export async function getNftPortfolioValue(address: string, apiKey: string, ethPriceUsd: number): Promise<number> {
  if (!apiKey) {
    throw new AlchemyError('ALCHEMY_API_KEY is not configured', 400);
  }

  const nfts = await fetchNftsForOwner(address, apiKey);

  let totalEth = 0;
  for (const nft of nfts) {
    const fp = nft.floorPrice;
    if (fp && fp.priceCurrency === 'ETH') {
      totalEth += fp.floorPrice;
    }
  }

  return totalEth * ethPriceUsd;
}
