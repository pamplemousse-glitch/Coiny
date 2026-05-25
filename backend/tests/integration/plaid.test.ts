/**
 * D1 — Plaid sandbox integration tests
 *
 * Requires real Plaid sandbox credentials:
 *   source bin/load-secrets.sh
 *   INTEGRATION_TEST=1 pnpm --filter coiny-backend test backend/tests/integration/plaid.test.ts
 *
 * Note: /sandbox/item/create is not available on our plan.
 * We use /sandbox/public_token/create + /item/public_token/exchange instead.
 */
import { afterAll, describe, expect, it } from 'vitest';
import {
  investmentsHoldingsGet,
  itemPublicTokenExchange,
  itemRemove,
  liabilitiesGet,
  sandboxPublicTokenCreate,
} from '../../src/plaid/client.js';

const skip = !process.env.INTEGRATION_TEST || !process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET;

// First Platypus Bank — sandbox institution supporting all standard products.
const INSTITUTION_ID = 'ins_109508';

async function createSandboxAccessToken(products: string[]): Promise<string> {
  const { public_token } = await sandboxPublicTokenCreate({
    institution_id: INSTITUTION_ID,
    initial_products: products,
  });
  const { access_token } = await itemPublicTokenExchange(public_token);
  return access_token;
}

describe('Plaid sandbox — investments & liabilities', () => {
  const accessTokens: string[] = [];

  afterAll(async () => {
    await Promise.allSettled(accessTokens.map((t) => itemRemove(t)));
  });

  it.skipIf(skip)('sandboxPublicTokenCreate + exchange returns a valid access_token', async () => {
    const { public_token } = await sandboxPublicTokenCreate({
      institution_id: INSTITUTION_ID,
      initial_products: ['transactions'],
    });

    expect(typeof public_token).toBe('string');
    expect(public_token.length).toBeGreaterThan(0);

    const { access_token, item_id } = await itemPublicTokenExchange(public_token);
    expect(typeof access_token).toBe('string');
    expect(access_token.length).toBeGreaterThan(0);
    expect(typeof item_id).toBe('string');
    accessTokens.push(access_token);
  });

  it.skipIf(skip)(
    'investmentsHoldingsGet returns holdings and accounts arrays',
    async () => {
      const token = await createSandboxAccessToken(['investments']);
      accessTokens.push(token);

      const result = await investmentsHoldingsGet(token);

      expect(Array.isArray(result.holdings)).toBe(true);
      expect(Array.isArray(result.accounts)).toBe(true);
      expect(Array.isArray(result.securities)).toBe(true);
    },
    20000,
  );

  it.skipIf(skip)('liabilitiesGet returns liabilities object with accounts array', async () => {
    const token = await createSandboxAccessToken(['liabilities']);
    accessTokens.push(token);

    const result = await liabilitiesGet(token);

    expect(Array.isArray(result.accounts)).toBe(true);
    expect(result.liabilities).toBeDefined();
    expect(typeof result.liabilities).toBe('object');
  });
});
