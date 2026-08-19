import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

const HELIUS_RPC_BASE = 'https://mainnet.helius-rpc.com/';
const STAKE_PROGRAM_ID = 'Stake11111111111111111111111111111111111111112';

export class HeliusRpcError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HeliusRpcError';
  }
}

const BalanceResponseSchema = z.object({
  result: z.object({
    value: z.number(),
  }),
});

const StakeAccountSchema = z.object({
  account: z.object({
    lamports: z.number(),
  }),
});

const StakeProgramAccountsSchema = z.object({
  result: z.array(StakeAccountSchema),
});

export async function getSolanaBalance(address: string, apiKey: string): Promise<number | null> {
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY is required to fetch Solana balances');
  }

  const url = `${HELIUS_RPC_BASE}?api-key=${encodeURIComponent(apiKey)}`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address],
    }),
  });

  if (!res.ok) {
    throw new HeliusRpcError(res.status, `Helius RPC error: ${res.status}`);
  }

  const raw: unknown = await res.json();
  const parsed = BalanceResponseSchema.safeParse(raw);
  // Unrecognised shape is unknown, not empty. See chains/cardano.ts.
  if (!parsed.success) return null;

  return parsed.data.result.value / 1e9;
}

/**
 * Returns the total SOL held across all stake accounts where the given address
 * is the authorized staker (offset 12 in stake account data), or null when
 * that could not be determined.
 *
 * This used to return 0 on any failure, described as safe because "staking is
 * additive to liquid balance". It is not safe: for a staker the delegated
 * balance is usually the larger half, so one failed call quietly reported a
 * fraction of the position as the whole of it.
 */
export async function getSolanaStakedBalance(address: string, apiKey: string): Promise<number | null> {
  if (!apiKey) return null;

  const url = `${HELIUS_RPC_BASE}?api-key=${encodeURIComponent(apiKey)}`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getProgramAccounts',
      params: [
        STAKE_PROGRAM_ID,
        {
          encoding: 'base64',
          // Only return lamports field, not full account data — smaller payload
          dataSlice: { offset: 0, length: 0 },
          filters: [
            {
              // Authorized staker pubkey starts at byte offset 12 in stake account data
              memcmp: { offset: 12, bytes: address, encoding: 'base58' },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = StakeProgramAccountsSchema.safeParse(raw);
  if (!parsed.success) return null;

  // An empty result list is a real zero: the address stakes nothing.
  const totalLamports = parsed.data.result.reduce((sum, a) => sum + a.account.lamports, 0);
  return totalLamports / 1e9;
}

/**
 * Liquid SOL plus staked SOL across all delegated stake accounts, or null when
 * either half could not be determined.
 *
 * Both halves must succeed. Returning the liquid balance alone when staking
 * fails is the partial sum that networth/refresh.ts refuses for the same
 * reason: it undercounts silently, and a number that is quietly wrong is worse
 * than one the caller knows it does not have.
 */
export async function getSolanaTotalBalance(address: string, apiKey: string): Promise<number | null> {
  const [liquid, staked] = await Promise.all([
    getSolanaBalance(address, apiKey),
    getSolanaStakedBalance(address, apiKey).catch(() => null),
  ]);
  if (liquid === null || staked === null) return null;
  return liquid + staked;
}
