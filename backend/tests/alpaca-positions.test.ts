import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlpacaError, getPositions } from '../src/alpaca/client.js';

// The parameters are declared even though the body ignores them: without them
// the mock's `calls` is typed as an empty tuple and every calls[n][m] read is a
// compile error under `strict`.
function stub(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string | URL, _init?: { headers: Record<string, string> }) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const RAW = [
  {
    symbol: 'AAPL',
    asset_class: 'us_equity',
    side: 'long',
    qty: '12',
    market_value: '2760.48',
    cost_basis: '2400.00',
    current_price: '230.04',
    avg_entry_price: '200.00',
    unrealized_pl: '360.48',
  },
  {
    symbol: 'BTCUSD',
    asset_class: 'crypto',
    side: 'long',
    qty: '0.045',
    market_value: '4725.00',
    cost_basis: '5000.00',
    current_price: '105000.00',
    avg_entry_price: '111111.11',
    unrealized_pl: '-275.00',
  },
];

describe('alpaca getPositions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parses every string field into a number', async () => {
    // Alpaca sends qty, prices and P/L as strings. Passing them straight
    // through gives string concatenation wherever they are summed.
    stub(RAW);
    const positions = await getPositions('key', 'secret', 'paper');

    expect(positions).toHaveLength(2);
    expect(positions[0]).toEqual({
      symbol: 'AAPL',
      assetClass: 'us_equity',
      side: 'long',
      qty: 12,
      marketValueUsd: 2760.48,
      costBasisUsd: 2400,
      currentPriceUsd: 230.04,
      avgEntryPriceUsd: 200,
      unrealizedPlUsd: 360.48,
    });
  });

  it('keeps a negative unrealized P/L rather than zeroing it', async () => {
    stub(RAW);
    const positions = await getPositions('key', 'secret', 'paper');
    expect(positions[1]?.unrealizedPlUsd).toBe(-275);
  });

  it('carries the asset class, so equities and crypto stay distinguishable', async () => {
    stub(RAW);
    const positions = await getPositions('key', 'secret', 'paper');
    expect(positions.map((p) => p.assetClass)).toEqual(['us_equity', 'crypto']);
  });

  it('treats an empty portfolio as a valid answer, not an error', async () => {
    stub([]);
    await expect(getPositions('key', 'secret', 'paper')).resolves.toEqual([]);
  });

  it('hits the paper host for a paper connection', async () => {
    const fetchMock = stub([]);
    await getPositions('key', 'secret', 'paper');
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://paper-api.alpaca.markets/v2/positions');
  });

  it('hits the live host for a live connection', async () => {
    const fetchMock = stub([]);
    await getPositions('key', 'secret', 'live');
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://api.alpaca.markets/v2/positions');
  });

  it('raises a credential error on 401 so the route can answer 401', async () => {
    stub({}, 401);
    await expect(getPositions('key', 'secret', 'paper')).rejects.toBeInstanceOf(AlpacaError);
  });

  it('defaults a missing numeric field to zero rather than NaN', async () => {
    // A NaN reaching net worth turns the whole total into NaN.
    stub([{ symbol: 'X', asset_class: 'us_equity' }]);
    const [position] = await getPositions('key', 'secret', 'paper');
    expect(position?.qty).toBe(0);
    expect(position?.marketValueUsd).toBe(0);
    expect(Number.isNaN(position?.marketValueUsd)).toBe(false);
  });
});
