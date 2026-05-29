import { z } from 'zod';

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

export async function getSolanaBalance(address: string, apiKey: string): Promise<number> {
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY is required to fetch Solana balances');
  }

  const url = `${HELIUS_RPC_BASE}?api-key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
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
  if (!parsed.success) return 0;

  return parsed.data.result.value / 1e9;
}

/**
 * Returns the total lamports held across all stake accounts where
 * the given address is the authorized staker (offset 12 in stake account data).
 * Returns 0 silently on any failure — staking is additive to liquid balance.
 */
export async function getSolanaStakedBalance(address: string, apiKey: string): Promise<number> {
  if (!apiKey) return 0;

  const url = `${HELIUS_RPC_BASE}?api-key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
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

  if (!res.ok) return 0;

  const raw: unknown = await res.json();
  const parsed = StakeProgramAccountsSchema.safeParse(raw);
  if (!parsed.success) return 0;

  const totalLamports = parsed.data.result.reduce((sum, a) => sum + a.account.lamports, 0);
  return totalLamports / 1e9;
}

/**
 * Returns liquid SOL balance + staked SOL across all delegated stake accounts.
 * Staking errors are swallowed — the liquid balance is always returned.
 */
export async function getSolanaTotalBalance(address: string, apiKey: string): Promise<number> {
  const [liquid, staked] = await Promise.all([
    getSolanaBalance(address, apiKey),
    getSolanaStakedBalance(address, apiKey).catch(() => 0),
  ]);
  return liquid + staked;
}
