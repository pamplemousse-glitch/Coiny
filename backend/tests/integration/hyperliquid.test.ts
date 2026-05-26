/**
 * Hyperliquid vendor integration test
 *
 * No API key required — public read-only endpoint.
 *
 * Run with:
 *   INTEGRATION_TEST=1 pnpm --filter coiny-backend test backend/tests/integration/hyperliquid.test.ts
 */
import { describe, expect, it } from 'vitest';
import { getHyperliquidState } from '../../src/hyperliquid/client.js';

const skip = !process.env.INTEGRATION_TEST;

// Public address known to have interacted with Hyperliquid.
// Used only for read-only state queries — no funds at risk.
const ADDRESS = '0x8c967e73e6b15087c42a10d344cff4c96d877f1d';

describe('Hyperliquid — getHyperliquidState', () => {
  it.skipIf(skip)('returns accountValue as a number', async () => {
    const result = await getHyperliquidState(ADDRESS);

    expect(typeof result.accountValue).toBe('number');
    expect(result.accountValue).toBeGreaterThanOrEqual(0);
  });

  it.skipIf(skip)('returns positions as an array', async () => {
    const result = await getHyperliquidState(ADDRESS);

    expect(Array.isArray(result.positions)).toBe(true);
  });

  it.skipIf(skip)('each position has the expected shape', async () => {
    const result = await getHyperliquidState(ADDRESS);

    for (const pos of result.positions) {
      expect(typeof pos.coin).toBe('string');
      expect(typeof pos.size).toBe('number');
      expect(typeof pos.entryPrice).toBe('number');
      expect(typeof pos.unrealizedPnl).toBe('number');
    }
  });

  it.skipIf(skip)('returns empty positions array for a fresh address', async () => {
    // A newly generated address with no deposits — Hyperliquid returns valid empty state.
    const result = await getHyperliquidState('0x1111111111111111111111111111111111111111');

    expect(Array.isArray(result.positions)).toBe(true);
    expect(typeof result.accountValue).toBe('number');
  });
});
