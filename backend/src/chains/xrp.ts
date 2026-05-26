import { z } from 'zod';

const XRPL_URL = 'https://xrplcluster.com';

export class XrplError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'XrplError';
  }
}

const AccountInfoSchema = z.object({
  result: z.object({
    account_data: z.object({
      Balance: z.string(),
    }),
    status: z.literal('success'),
  }),
});

// Returns confirmed XRP balance for an XRPL account address.
// Returns 0 for accounts that don't exist (actNotFound). Throws XrplError on API errors.
export async function getXrpBalance(address: string): Promise<number> {
  const res = await fetch(XRPL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'account_info',
      params: [{ account: address, ledger_index: 'validated' }],
    }),
  });

  if (!res.ok) throw new XrplError('HTTP_ERROR', `XRPL request failed: ${res.status}`);

  const raw: unknown = await res.json();

  // actNotFound means the account has never been funded — treat as 0
  const maybeNotFound = z.object({ result: z.object({ error: z.string() }) }).safeParse(raw);
  if (maybeNotFound.success && maybeNotFound.data.result.error === 'actNotFound') {
    return 0;
  }

  const parsed = AccountInfoSchema.safeParse(raw);
  if (!parsed.success) return 0;

  return Number(parsed.data.result.account_data.Balance) / 1e6;
}
