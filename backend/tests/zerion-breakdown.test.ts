import { type Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// The Zerion client is exercised for real here (undici MockAgent), not mocked,
// because the thing under test is how we parse the vendor's response shape.

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeEach(() => {
  process.env.ZERION_API_KEY ??= 'test-zerion-key';
  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

function mockPortfolio(attributes: object) {
  mockAgent
    .get('https://api.zerion.io')
    .intercept({ path: (p) => p.startsWith(`/v1/wallets/${ADDRESS}/portfolio`), method: 'GET' })
    .reply(200, { data: { attributes } });
}

/** The shape Zerion documents: five required keys under
 *  `positions_distribution_by_type`, plus the aggregate total. */
function attributes(over: Partial<Record<string, unknown>> = {}) {
  return {
    total: { positions: 40_000 },
    positions_distribution_by_type: {
      wallet: 2_000,
      deposited: 5_000,
      borrowed: 1_000,
      locked: 3_000,
      staked: 30_000,
    },
    changes: { absolute_1d: 100, percent_1d: 0.01 },
    ...over,
  };
}

describe('Zerion position breakdown', () => {
  it('returns the five-way split rather than only the aggregate', async () => {
    const { getPortfolio } = await import('../src/zerion/client.js');
    mockPortfolio(attributes());

    const portfolio = await getPortfolio(ADDRESS);

    expect(portfolio.breakdown).toEqual({
      wallet: 2_000,
      deposited: 5_000,
      borrowed: 1_000,
      locked: 3_000,
      staked: 30_000,
    });
  });

  // The reason the breakdown is worth having: these two wallets report the same
  // total and are not the same financial situation.
  it('distinguishes a spendable wallet from one that is entirely staked', async () => {
    const { getPortfolio } = await import('../src/zerion/client.js');
    mockPortfolio(
      attributes({
        positions_distribution_by_type: { wallet: 40_000, deposited: 0, borrowed: 0, locked: 0, staked: 0 },
      }),
    );

    const liquid = await getPortfolio(ADDRESS);
    expect(liquid.total_usd).toBe(40_000);
    expect(liquid.breakdown?.wallet).toBe(40_000);
    expect(liquid.breakdown?.staked).toBe(0);
  });

  it('reports an absent distribution as unknown, not as five zeroes', async () => {
    const { getPortfolio } = await import('../src/zerion/client.js');
    mockPortfolio({ total: { positions: 1_234 }, changes: { absolute_1d: null, percent_1d: null } });

    const portfolio = await getPortfolio(ADDRESS);

    // A breakdown of all-zero would assert the wallet holds nothing, which is
    // the silent-zero failure R-8.1 bans. Null says "we do not know".
    expect(portfolio.breakdown).toBeNull();
    expect(portfolio.total_usd).toBe(1_234);
  });

  it('still returns the total when the distribution is malformed', async () => {
    const { getPortfolio } = await import('../src/zerion/client.js');
    mockPortfolio({
      total: { positions: 999 },
      positions_distribution_by_type: 'not an object',
      changes: { absolute_1d: null, percent_1d: null },
    });

    // Degrading the breakdown must never cost the portfolio read: a parse
    // failure here would zero the user's whole DeFi class.
    const portfolio = await getPortfolio(ADDRESS);
    expect(portfolio.total_usd).toBe(999);
    expect(portfolio.breakdown).toBeNull();
  });

  /**
   * Pins the open question rather than pretending it is answered.
   *
   * Zerion documents `total.positions` as "Total value of all positions" and
   * does not say whether `borrowed` is netted out. With this fixture the two
   * readings differ by exactly the borrowed amount:
   *
   *   gross (borrowed ignored):  2,000 + 5,000 + 3,000 + 30,000 = 40,000
   *   net   (borrowed deducted): the same, minus 1,000          = 39,000
   *
   * The client currently passes `total.positions` through untouched, so this
   * asserts the CURRENT behaviour. If a real leveraged wallet later shows the
   * total is gross, a leveraged user is overstated by their loan and this test
   * is the place that says so.
   */
  it('passes the vendor total through without adjusting for borrowed (unverified)', async () => {
    const { getPortfolio } = await import('../src/zerion/client.js');
    mockPortfolio(attributes());

    const portfolio = await getPortfolio(ADDRESS);
    const parts = portfolio.breakdown!;
    const gross = parts.wallet + parts.deposited + parts.locked + parts.staked;

    expect(portfolio.total_usd).toBe(40_000);
    expect(gross).toBe(40_000);
    expect(gross - parts.borrowed).toBe(39_000);
  });
});
