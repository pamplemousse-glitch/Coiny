import { z } from 'zod';

export class AlchemyError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AlchemyError';
    this.status = status;
  }
}

// Floor price lives at contract.openSeaMetadata.floorPrice per Alchemy NFT API v3 docs.
// There is no top-level floorPrice field on the NFT object.
const AlchemyOwnedNftSchema = z.object({
  contract: z.object({
    address: z.string(),
    name: z.string().optional(),
    openSeaMetadata: z
      .object({
        floorPrice: z.number().nullable().optional(),
      })
      .optional(),
  }),
  tokenId: z.string(),
  tokenType: z.string(),
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
    // withMetadata defaults to true in the API; no extra param needed.
    // withFloorPrice is not a valid Alchemy v3 parameter — floor price is
    // returned inside contract.openSeaMetadata.floorPrice when metadata is included.
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
 * Sums contract.openSeaMetadata.floorPrice (ETH-denominated) across all NFTs,
 * then multiplies by ethPriceUsd. Returns 0 when no NFTs have floor price data.
 * Throws immediately if apiKey is empty.
 */
export async function getNftPortfolioValue(address: string, apiKey: string, ethPriceUsd: number): Promise<number> {
  if (!apiKey) {
    throw new AlchemyError('ALCHEMY_API_KEY is not configured', 400);
  }

  const nfts = await fetchNftsForOwner(address, apiKey);

  let totalEth = 0;
  for (const nft of nfts) {
    // Floor price is ETH-denominated and lives at contract.openSeaMetadata.floorPrice.
    // Alchemy only provides floor prices on ETH and Polygon mainnet; null means no data.
    const fp = nft.contract.openSeaMetadata?.floorPrice;
    if (fp != null && fp > 0) {
      totalEth += fp;
    }
  }

  return totalEth * ethPriceUsd;
}
