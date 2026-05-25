/**
 * D3 — Coinbase Advanced Trade sandbox integration tests
 *
 * The sandbox at api-sandbox.coinbase.com returns static fixture data without
 * requiring auth. Tests the shape of the API response directly.
 *
 * Run with:
 *   INTEGRATION_TEST=1 pnpm --filter coiny-backend test tests/integration/coinbase.test.ts
 */
import { describe, it, expect } from 'vitest';

const SANDBOX = 'https://api-sandbox.coinbase.com';
const skip = !process.env.INTEGRATION_TEST;

describe('Coinbase Advanced Trade sandbox — accounts', () => {
  it.skipIf(skip)('GET /api/v3/brokerage/accounts returns accounts with expected shape', async () => {
    const res = await fetch(`${SANDBOX}/api/v3/brokerage/accounts`);

    expect(res.status).toBe(200);

    const body = await res.json() as { accounts: unknown[] };
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(body.accounts.length).toBeGreaterThan(0);

    const account = body.accounts[0] as Record<string, unknown>;
    expect(typeof account.uuid).toBe('string');
    expect(typeof account.currency).toBe('string');
    expect(typeof (account.available_balance as Record<string, unknown>).value).toBe('string');
  });
});
