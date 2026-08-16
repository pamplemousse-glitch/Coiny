import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real client, unlike kraken.test.ts which mocks the whole module to test
// the routes. Here the valuation logic itself is what is under test.
vi.mock('../src/fx/client.js', () => ({
  convertToUsd: vi.fn(),
}));

import { convertToUsd } from '../src/fx/client.js';
import { getTotalUsd } from '../src/kraken/client.js';

const mockedConvert = vi.mocked(convertToUsd);

/** Stub the one network call `getBalance` makes. A private key that base64
 *  decodes is required only because the signer runs before the fetch. */
function stubBalances(balances: Record<string, string>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ error: [], result: balances }),
    })),
  );
}

const KEY = 'test-api-key';
const SECRET = 'dGVzdC1wcml2YXRlLWtleQ==';

describe('kraken getTotalUsd', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts a tokenized .T balance instead of dropping it', async () => {
    // The regression. `.T` (tokenized) was absent from the suffix pattern, so
    // this normalized to "ETH.T", failed the spot-price lookup, and vanished
    // from the total with only a console.warn to show for it.
    stubBalances({ 'ETH.T': '2' });
    const total = await getTotalUsd(KEY, SECRET, async (asset) => {
      expect(asset).toBe('ETH');
      return 3000;
    });
    expect(total).toBe(6000);
  });

  it('counts every staking and rewards suffix', async () => {
    stubBalances({ 'ETH.S': '1', 'ETH.M': '1', 'ETH.B': '1', 'ETH.F': '1', 'ETH.T': '1' });
    const total = await getTotalUsd(KEY, SECRET, async () => 100);
    expect(total).toBe(500);
  });

  it('converts non-USD fiat through the FX rate, not a hardcoded constant', async () => {
    // EUR used to be `amount * 1.08`, a constant that is wrong the day after it
    // is written and drifts from then on.
    mockedConvert.mockResolvedValue(1080);
    stubBalances({ ZEUR: '1000' });

    const total = await getTotalUsd(KEY, SECRET, async () => {
      throw new Error('fiat must not be priced as a coin');
    });

    expect(mockedConvert).toHaveBeenCalledWith(1000, 'EUR');
    expect(total).toBe(1080);
  });

  it('counts the fiats other than USD and EUR that Kraken holds', async () => {
    // ZGBP and friends were in neither the asset map nor the fiat branch, so
    // they fell through to the spot-price lookup and were dropped.
    mockedConvert.mockResolvedValue(50);
    stubBalances({ ZGBP: '10', ZCAD: '10', ZJPY: '10', ZAUD: '10', ZCHF: '10' });

    const total = await getTotalUsd(KEY, SECRET, async () => {
      throw new Error('fiat must not be priced as a coin');
    });

    expect(mockedConvert).toHaveBeenCalledTimes(5);
    expect(total).toBe(250);
  });

  it('excludes a fiat balance when the FX lookup fails rather than guessing', async () => {
    mockedConvert.mockRejectedValue(new Error('frankfurter down'));
    stubBalances({ ZEUR: '1000', ZUSD: '25' });
    const total = await getTotalUsd(KEY, SECRET, async () => 0);
    // The USD still counts; the EUR is left out rather than valued at a guess.
    expect(total).toBe(25);
  });

  it('still maps Kraken internal crypto names', async () => {
    stubBalances({ XXBT: '0.5', ZUSD: '1000' });
    const total = await getTotalUsd(KEY, SECRET, async (asset) => {
      expect(asset).toBe('BTC');
      return 60_000;
    });
    expect(total).toBe(31_000);
  });
});
