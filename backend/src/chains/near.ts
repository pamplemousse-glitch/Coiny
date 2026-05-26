import { z } from 'zod';
import { fetchWithRetry } from '../util/fetch.js';

const NEAR_RPC_URL = 'https://rpc.mainnet.near.org';

export class NearRpcError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'NearRpcError';
  }
}

const AccountResultSchema = z.object({
  result: z.object({
    amount: z.string(),
  }),
});

const RpcErrorSchema = z.object({
  error: z.object({
    cause: z.object({
      name: z.string(),
    }),
  }),
});

export async function getNearBalance(address: string): Promise<number> {
  const res = await fetchWithRetry(NEAR_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'query',
      params: {
        request_type: 'view_account',
        finality: 'final',
        account_id: address,
      },
    }),
  });

  if (res.status === 404) return 0;
  if (!res.ok) throw new NearRpcError(res.status, `NEAR RPC error: ${res.status}`);

  const raw: unknown = await res.json();

  const maybeError = RpcErrorSchema.safeParse(raw);
  if (maybeError.success && maybeError.data.error.cause.name === 'UNKNOWN_ACCOUNT') {
    return 0;
  }

  const parsed = AccountResultSchema.safeParse(raw);
  if (!parsed.success) return 0;

  return Number(parsed.data.result.amount) / 1e24;
}
