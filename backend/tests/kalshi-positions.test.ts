import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBalance, getPortfolioBalance, getPositions } from '../src/kalshi/client.js';

const KEY_ID = 'test-key-id';
// A real RSA key, because buildHeaders signs before any fetch happens and a
// fake one throws in node:crypto rather than reaching the code under test.
const PRIVATE_KEY_B64 = Buffer.from(
  (await import('node:crypto')).generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey,
).toString('base64');

// The parameters are declared even though the body ignores them: without them
// the mock's `calls` is typed as an empty tuple and every calls[n][m] read is a
// compile error under `strict`.
function stubJson(payloads: unknown[]) {
  let call = 0;
  const fetchMock = vi.fn(async (_url: string | URL, _init?: { headers: Record<string, string> }) => {
    const body = payloads[Math.min(call, payloads.length - 1)];
    call += 1;
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('kalshi getBalance', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('adds cash and position value instead of choosing between them', async () => {
    // The regression. `portfolio_value ?? balance` returned 500 here and the
    // $1,000 of cash vanished from net worth.
    stubJson([{ balance: 100_000, portfolio_value: 50_000 }]);

    const balance = await getBalance(KEY_ID, PRIVATE_KEY_B64);

    expect(balance.cashUsd).toBe(1000);
    expect(balance.positionsUsd).toBe(500);
    expect(balance.totalUsd).toBe(1500);
  });

  it('reports cash when no positions are open', async () => {
    stubJson([{ balance: 25_000, portfolio_value: 0 }]);
    expect(await getPortfolioBalance(KEY_ID, PRIVATE_KEY_B64)).toBe(250);
  });

  it('reports positions when no cash is left', async () => {
    stubJson([{ balance: 0, portfolio_value: 400_000 }]);
    expect(await getPortfolioBalance(KEY_ID, PRIVATE_KEY_B64)).toBe(4000);
  });

  it('treats a missing field as zero rather than NaN', async () => {
    stubJson([{ balance: 10_000 }]);
    expect(await getPortfolioBalance(KEY_ID, PRIVATE_KEY_B64)).toBe(100);
  });
});

describe('kalshi getPositions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parses the fixed-point string fields into numbers', async () => {
    stubJson([
      {
        market_positions: [
          {
            ticker: 'KXPRES-28-DEM',
            position_fp: '150',
            market_exposure_dollars: '82.5000',
            total_traded_dollars: '90.0000',
            realized_pnl_dollars: '-7.5000',
            fees_paid_dollars: '0.3500',
          },
        ],
        event_positions: [
          {
            event_ticker: 'KXPRES-28',
            total_cost_dollars: '90.0000',
            event_exposure_dollars: '82.5000',
            realized_pnl_dollars: '-7.5000',
            fees_paid_dollars: '0.3500',
          },
        ],
      },
    ]);

    const { markets, events } = await getPositions(KEY_ID, PRIVATE_KEY_B64);

    expect(markets).toHaveLength(1);
    expect(markets[0]).toEqual({
      ticker: 'KXPRES-28-DEM',
      contracts: 150,
      exposureUsd: 82.5,
      totalTradedUsd: 90,
      realizedPnlUsd: -7.5,
      feesPaidUsd: 0.35,
    });
    expect(events[0]?.eventTicker).toBe('KXPRES-28');
    expect(events[0]?.exposureUsd).toBe(82.5);
  });

  it('keeps negative positions, which are NO contracts and not an error', async () => {
    stubJson([
      {
        market_positions: [{ ticker: 'X', position_fp: '-40', market_exposure_dollars: '12.00' }],
        event_positions: [],
      },
    ]);
    const { markets } = await getPositions(KEY_ID, PRIVATE_KEY_B64);
    expect(markets[0]?.contracts).toBe(-40);
  });

  it('follows the cursor so a long holdings list is not truncated', async () => {
    const fetchMock = stubJson([
      { market_positions: [{ ticker: 'A', position_fp: '1' }], event_positions: [], cursor: 'page2' },
      { market_positions: [{ ticker: 'B', position_fp: '2' }], event_positions: [], cursor: '' },
    ]);

    const { markets } = await getPositions(KEY_ID, PRIVATE_KEY_B64);

    expect(markets.map((m) => m.ticker)).toEqual(['A', 'B']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('cursor=page2');
  });

  it('stops when the server repeats a cursor rather than looping forever', async () => {
    const fetchMock = stubJson([
      { market_positions: [{ ticker: 'A', position_fp: '1' }], event_positions: [], cursor: 'same' },
    ]);
    const { markets } = await getPositions(KEY_ID, PRIVATE_KEY_B64);
    // First page accepted, second returns the same cursor and ends the loop.
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
    expect(markets.length).toBeGreaterThan(0);
  });

  it('asks Kalshi to omit settled rows', async () => {
    const fetchMock = stubJson([{ market_positions: [], event_positions: [] }]);
    await getPositions(KEY_ID, PRIVATE_KEY_B64);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('count_filter=position');
  });
});

describe('kalshi request signing', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('signs the full trade-api path, not the path relative to the base URL', async () => {
    // Getting this wrong produces a 401 that looks like bad credentials.
    const fetchMock = stubJson([{ balance: 0, portfolio_value: 0 }]);
    await getBalance(KEY_ID, PRIVATE_KEY_B64);
    const headers = fetchMock.mock.calls[0]?.[1]?.headers ?? {};
    expect(headers['KALSHI-ACCESS-KEY']).toBe(KEY_ID);
    expect(headers['KALSHI-ACCESS-SIGNATURE']).toBeTruthy();
    expect(headers['KALSHI-ACCESS-TIMESTAMP']).toBeTruthy();
  });
});
