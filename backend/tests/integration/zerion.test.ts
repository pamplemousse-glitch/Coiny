/**
 * D4 — Zerion integration tests
 *
 * Requires:
 *   source bin/load-secrets.sh
 *   INTEGRATION_TEST=1 pnpm --filter coiny-backend test backend/tests/integration/zerion.test.ts
 */
import { describe, expect, it } from 'vitest';
import { getPortfolio, getTransactions } from '../../src/zerion/client.js';

const skip = !process.env.INTEGRATION_TEST || !process.env.ZERION_API_KEY;

// Vitalik's public wallet — known to have holdings, safe to query in tests.
const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('Zerion — portfolio & transactions', () => {
  it.skipIf(skip)('getPortfolio returns total_usd as a number', async () => {
    const result = await getPortfolio(WALLET);

    expect(typeof result.total_usd).toBe('number');
    expect(result.total_usd).toBeGreaterThanOrEqual(0);
    // change_1d_pct may be null for wallets with no recent price data.
    expect(result.change_1d_pct === null || typeof result.change_1d_pct === 'number').toBe(true);
  });

  it.skipIf(skip)('getTransactions returns transactions array with correct shape', async () => {
    const result = await getTransactions(WALLET);

    expect(Array.isArray(result.transactions)).toBe(true);
    const tx = result.transactions[0];
    if (tx) {
      expect(typeof tx.id).toBe('string');
      expect(typeof tx.type).toBe('string');
      expect(typeof tx.status).toBe('string');
      expect(typeof tx.quantity_usd).toBe('number');
      expect(tx.direction === 'in' || tx.direction === 'out').toBe(true);
    }
    // nextCursor is optional
    expect(result.nextCursor === undefined || typeof result.nextCursor === 'string').toBe(true);
  });
});
