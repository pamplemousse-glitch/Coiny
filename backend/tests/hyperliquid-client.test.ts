import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHyperliquidState, HyperliquidError } from '../src/hyperliquid/client.js';

// The vendor circuit breaker keeps per-vendor state in a module-level Map, on
// purpose: keying on the vendor is what makes one user's failures protect every
// other user, so the state cannot be per-request. The consequence here is that
// this file's simulated vendor failures accumulate across tests and, past five
// in a row, eject the vendor so the NEXT test's fixture is never reached.
//
// Imported dynamically inside the hook rather than at the top of the file:
// circuit-breaker.js pulls in config.js, which snapshots process.env at import
// time (config.ts:407), and several test files set their env at module scope.
// Forcing that import early is how a global version of this reset broke
// zerion-breakdown.test.ts with "ZERION_API_KEY is not configured".
beforeEach(async () => {
  const { resetCircuitBreakers } = await import('../src/resilience/circuit-breaker.js');
  resetCircuitBreakers();
});

const HYPERLIQUID_URL = 'https://api.hyperliquid.xyz/info';

function makeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const emptyState = {
  marginSummary: { accountValue: '0.1', totalNtlPos: '0', totalRawUsd: '0.1', totalMarginUsed: '0' },
  crossMarginSummary: { accountValue: '0.1', totalNtlPos: '0', totalRawUsd: '0.1', totalMarginUsed: '0' },
  crossMaintenanceMarginUsed: '0',
  withdrawable: '0.1',
  assetPositions: [],
  time: 1_000_000_000,
};

const stateWithPositions = {
  ...emptyState,
  crossMarginSummary: { accountValue: '5000.0', totalNtlPos: '4000', totalRawUsd: '5000', totalMarginUsed: '800' },
  assetPositions: [
    {
      type: 'oneWay',
      position: {
        coin: 'BTC',
        szi: '0.1',
        entryPx: '40000',
        positionValue: '4200',
        unrealizedPnl: '200',
        returnOnEquity: '0.04',
        leverage: { type: 'cross', value: 5 },
        cumFunding: { allTime: '0', sinceChange: '0', sinceOpen: '0' },
        liquidationPx: '35000',
        maxLeverage: 50,
        marginUsed: '840',
      },
    },
    {
      type: 'oneWay',
      position: {
        coin: 'ETH',
        szi: '0',
        entryPx: '2000',
        positionValue: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        leverage: { type: 'cross', value: 1 },
        cumFunding: { allTime: '0', sinceChange: '0', sinceOpen: '0' },
        liquidationPx: null,
        maxLeverage: 25,
        marginUsed: '0',
      },
    },
  ],
};

describe('getHyperliquidState', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty state for address with no positions', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(emptyState));

    const state = await getHyperliquidState('0x0000000000000000000000000000000000000001');

    expect(state.accountValue).toBeCloseTo(0.1);
    expect(state.positions).toHaveLength(0);
  });

  it('parses positions and excludes szi === 0', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(stateWithPositions));

    const state = await getHyperliquidState('0xabc');

    expect(state.accountValue).toBe(5000);
    expect(state.positions).toHaveLength(1);
    const pos = state.positions[0]!;
    expect(pos.coin).toBe('BTC');
    expect(pos.size).toBeCloseTo(0.1);
    expect(pos.entryPrice).toBe(40000);
    expect(pos.unrealizedPnl).toBe(200);
  });

  it('handles null entryPx as 0', async () => {
    const withNullEntry = {
      ...emptyState,
      crossMarginSummary: { accountValue: '100', totalNtlPos: '0', totalRawUsd: '100', totalMarginUsed: '0' },
      assetPositions: [
        {
          type: 'oneWay',
          position: { coin: 'SOL', szi: '10', entryPx: null, unrealizedPnl: '-50' },
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(makeResponse(withNullEntry));

    const state = await getHyperliquidState('0xabc');

    expect(state.positions[0]?.entryPrice).toBe(0);
    expect(state.positions[0]?.unrealizedPnl).toBe(-50);
  });

  it('returns empty state when response fails schema parse', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ unexpected: true }));

    const state = await getHyperliquidState('0xabc');

    expect(state.accountValue).toBe(0);
    expect(state.positions).toHaveLength(0);
  });

  it('throws HyperliquidError on non-ok HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ error: 'server error' }, 500));

    await expect(getHyperliquidState('0xabc')).rejects.toBeInstanceOf(HyperliquidError);
  });

  it('sends POST to the correct URL with address in body', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(emptyState));

    await getHyperliquidState('0xdeadbeef');

    expect(fetch).toHaveBeenCalledWith(
      HYPERLIQUID_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'clearinghouseState', user: '0xdeadbeef' }),
      }),
    );
  });
});
