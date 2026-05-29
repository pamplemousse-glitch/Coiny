import { z } from 'zod';

const HELIUS_RPC_BASE = 'https://mainnet.helius-rpc.com/';

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
