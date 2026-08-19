import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTokenMarket, isThinlyTraded, THIN_LIQUIDITY_USD, type TokenMarket } from '../src/dexscreener/client.js';

const CHAIN = 'ethereum';
const TOKEN = '0xabc0000000000000000000000000000000000001';

let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeEach(() => {
  getTokenMarket.clear();
  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

function mockPairs(body: object, status = 200, token = TOKEN) {
  mockAgent
    .get('https://api.dexscreener.com')
    .intercept({ path: `/token-pairs/v1/${CHAIN}/${token}`, method: 'GET' })
    .reply(status, body);
}

function pair(over: Record<string, unknown> = {}) {
  return {
    chainId: CHAIN,
    dexId: 'uniswap',
    pairAddress: '0xpair',
    priceUsd: '1.50',
    liquidity: { usd: 250_000 },
    fdv: 5_000_000,
    marketCap: 3_000_000,
    pairCreatedAt: 1_700_000_000_000,
    ...over,
  };
}

describe('getTokenMarket', () => {
  it('returns price and liquidity for a token that trades', async () => {
    mockPairs([pair()]);

    const market = await getTokenMarket(CHAIN, TOKEN);

    expect(market).toMatchObject({
      priceUsd: 1.5,
      liquidityUsd: 250_000,
      fdv: 5_000_000,
      marketCap: 3_000_000,
      pairCount: 1,
    });
  });

  // The reason this exists at all. A token often trades in several pools of
  // wildly different size, and the thin ones quote prices nobody could
  // transact at. Taking the first result would let pool ordering choose the
  // number we show.
  it('takes the deepest pool, not the first one returned', async () => {
    mockPairs([
      pair({ priceUsd: '99.00', liquidity: { usd: 300 } }),
      pair({ priceUsd: '1.50', liquidity: { usd: 500_000 } }),
      pair({ priceUsd: '42.00', liquidity: { usd: 1_000 } }),
    ]);

    const market = await getTokenMarket(CHAIN, TOKEN);

    expect(market?.priceUsd).toBe(1.5);
    expect(market?.liquidityUsd).toBe(500_000);
    expect(market?.pairCount).toBe(3);
  });

  it('reports a token nothing trades as null rather than as an error', async () => {
    mockPairs([]);
    expect(await getTokenMarket(CHAIN, TOKEN)).toBeNull();
  });

  it('treats a 404 as "nothing trades this", not a failure', async () => {
    mockPairs({}, 404);
    expect(await getTokenMarket(CHAIN, TOKEN)).toBeNull();
  });

  // priceUsd arrives as a string. A NaN would propagate into a total and store
  // as NULL in a numeric column, turning "we could not price this" into "this
  // account is worth nothing" — the exact failure fixed elsewhere in #279.
  it('returns a null price rather than NaN when the price will not parse', async () => {
    mockPairs([pair({ priceUsd: 'not-a-number' })]);

    const market = await getTokenMarket(CHAIN, TOKEN);

    expect(market?.priceUsd).toBeNull();
    expect(Number.isNaN(market?.priceUsd as number)).toBe(false);
  });

  it('reports missing liquidity as unknown rather than zero', async () => {
    mockPairs([pair({ liquidity: null })]);

    const market = await getTokenMarket(CHAIN, TOKEN);

    expect(market?.liquidityUsd).toBeNull();
  });

  it('throws on a server error rather than reporting no market', async () => {
    // Retryable, so fetchWithRetry makes three attempts.
    mockAgent
      .get('https://api.dexscreener.com')
      .intercept({ path: `/token-pairs/v1/${CHAIN}/${TOKEN}`, method: 'GET' })
      .reply(500, {})
      .times(3);

    await expect(getTokenMarket(CHAIN, TOKEN)).rejects.toThrow(/DexScreener/);
  });

  it('serves a second identical lookup from cache', async () => {
    // Single-shot interceptor: a second upstream call would find no mock and
    // fail, so passing proves the cache served it.
    mockPairs([pair()]);

    const first = await getTokenMarket(CHAIN, TOKEN);
    const second = await getTokenMarket(CHAIN, TOKEN);

    expect(second).toEqual(first);
  });
});

describe('isThinlyTraded', () => {
  const market = (liquidityUsd: number | null): TokenMarket => ({
    priceUsd: 1,
    liquidityUsd,
    fdv: null,
    marketCap: null,
    pairCreatedAtMs: null,
    pairCount: 1,
  });

  it('flags a pool below the threshold', () => {
    expect(isThinlyTraded(market(500))).toBe(true);
  });

  it('does not flag a deep pool', () => {
    expect(isThinlyTraded(market(THIN_LIQUIDITY_USD * 10))).toBe(false);
  });

  // Unknown liquidity is not thin liquidity. Treating it as thin would quietly
  // discount holdings we merely failed to measure.
  it('returns null for unknown liquidity rather than guessing', () => {
    expect(isThinlyTraded(market(null))).toBeNull();
  });
});
