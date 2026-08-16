import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHyperliquidSpot, getHyperliquidState } from '../src/hyperliquid/client.js';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const PERPS = {
  marginSummary: { accountValue: '250', totalNtlPos: '0', totalRawUsd: '250', totalMarginUsed: '0' },
  crossMarginSummary: { accountValue: '250', totalNtlPos: '0', totalRawUsd: '250', totalMarginUsed: '0' },
  assetPositions: [],
};

/** Routes each POST by its `type`, because getHyperliquidState now makes three
 *  calls to the same URL and a single mockResolvedValue cannot tell them
 *  apart. */
function routeByType(handlers: Record<string, unknown>) {
  const mock = vi.fn(async (_url: string | URL, init?: { body?: string }) => {
    const type = JSON.parse(init?.body ?? '{}').type as string;
    const body = handlers[type];
    if (body === undefined) return json({}, 404);
    return json(body);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

describe('getHyperliquidSpot', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('values spot tokens at the mid price', async () => {
    routeByType({
      spotClearinghouseState: { balances: [{ coin: 'PURR', token: 1, hold: '0', total: '2000' }] },
      allMids: { PURR: '0.25', APE: '4.33' },
    });

    const spot = await getHyperliquidSpot('0xabc');

    expect(spot.totalUsd).toBeCloseTo(500);
    expect(spot.balances).toEqual([{ coin: 'PURR', total: 2000, valueUsd: 500 }]);
  });

  it('takes USDC at a dollar without needing a mid', async () => {
    // USDC is the quote asset. Requiring a mid for it would drop the most
    // common balance on the venue.
    routeByType({
      spotClearinghouseState: { balances: [{ coin: 'USDC', token: 0, hold: '0', total: '14.625485' }] },
      allMids: {},
    });

    const spot = await getHyperliquidSpot('0xabc');

    expect(spot.totalUsd).toBeCloseTo(14.625485);
  });

  it('excludes a token with no mid rather than valuing it at zero', async () => {
    // Counting it as zero would silently understate net worth, which is the
    // exact defect this endpoint was added to fix.
    routeByType({
      spotClearinghouseState: {
        balances: [
          { coin: 'USDC', token: 0, hold: '0', total: '100' },
          { coin: 'NOTLISTED', token: 9, hold: '0', total: '5000' },
        ],
      },
      allMids: { PURR: '0.25' },
    });

    const spot = await getHyperliquidSpot('0xabc');

    expect(spot.totalUsd).toBe(100);
    expect(spot.balances.map((b) => b.coin)).toEqual(['USDC']);
  });

  it('skips zero balances', async () => {
    routeByType({
      spotClearinghouseState: {
        balances: [
          { coin: 'USDC', token: 0, hold: '0', total: '0' },
          { coin: 'PURR', token: 1, hold: '0', total: '10' },
        ],
      },
      allMids: { PURR: '2' },
    });

    const spot = await getHyperliquidSpot('0xabc');

    expect(spot.balances.map((b) => b.coin)).toEqual(['PURR']);
  });

  it('returns nothing for an address with no spot balances', async () => {
    routeByType({ spotClearinghouseState: { balances: [] }, allMids: {} });
    await expect(getHyperliquidSpot('0xabc')).resolves.toEqual({ balances: [], totalUsd: 0 });
  });
});

describe('getHyperliquidState with spot', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('reports perps and spot separately so neither is lost in the other', async () => {
    routeByType({
      clearinghouseState: PERPS,
      spotClearinghouseState: { balances: [{ coin: 'USDC', token: 0, hold: '0', total: '750' }] },
      allMids: {},
    });

    const state = await getHyperliquidState('0xabc');

    // accountValue stays the PERPS figure, so stored history keeps meaning
    // what it meant. The caller adds them.
    expect(state.accountValue).toBe(250);
    expect(state.spotValueUsd).toBe(750);
    expect(state.spotBalances).toHaveLength(1);
  });

  it('still returns the perps value when the spot call fails', async () => {
    // A partial answer beats no answer. The alternative is that one failing
    // venue endpoint zeroes an entire connected account.
    const mock = vi.fn(async (_url: string | URL, init?: { body?: string }) => {
      const type = JSON.parse(init?.body ?? '{}').type as string;
      if (type === 'clearinghouseState') return json(PERPS);
      throw new Error('spot is down');
    });
    vi.stubGlobal('fetch', mock);

    const state = await getHyperliquidState('0xabc');

    expect(state.accountValue).toBe(250);
    expect(state.spotValueUsd).toBe(0);
  });
});
