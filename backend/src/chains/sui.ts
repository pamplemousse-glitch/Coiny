import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

const SUI_RPC_URL = 'https://fullnode.mainnet.sui.io';

export class SuiRpcError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'SuiRpcError';
  }
}

const BalanceSchema = z.object({
  result: z.object({
    totalBalance: z.string(),
  }),
});

export async function getSuiBalance(address: string): Promise<number> {
  const res = await fetchWithRetry(SUI_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_getBalance',
      params: [address, '0x2::sui::SUI'],
    }),
  });

  if (!res.ok) throw new SuiRpcError(res.status, `Sui RPC error: ${res.status}`);

  const raw: unknown = await res.json();

  const maybeError = z.object({ error: z.unknown() }).safeParse(raw);
  if (maybeError.success && maybeError.data.error !== undefined && maybeError.data.error !== null) {
    return 0;
  }

  const parsed = BalanceSchema.safeParse(raw);
  if (!parsed.success) return 0;

  return Number(parsed.data.result.totalBalance) / 1e9;
}
