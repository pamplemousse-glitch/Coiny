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

export async function getSuiBalance(address: string): Promise<number | null> {
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

  // A JSON-RPC error object is the node refusing to answer. That is unknown,
  // not zero: suix_getBalance reports an unfunded address as totalBalance "0"
  // in a normal result, so the error branch is never the empty-wallet case.
  const maybeError = z.object({ error: z.unknown() }).safeParse(raw);
  if (maybeError.success && maybeError.data.error !== undefined && maybeError.data.error !== null) {
    return null;
  }

  const parsed = BalanceSchema.safeParse(raw);
  if (!parsed.success) return null;

  return Number(parsed.data.result.totalBalance) / 1e9;
}
