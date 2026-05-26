import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgyUoBYUXbdcEYcobR
F1sGQtYcgIOJkPb8+A51TMIs5iGhRANCAAQA7q7yVc6kMiiOAEGLFBQ1H+aR7CsI
gB4xQ/ziC9XWhcKTZd7IJWSkQBgSLkD8FDylf775QGNWDq8m/2m0uSmP
-----END PRIVATE KEY-----`;

function makeFetch(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  const headersMap = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersMap,
    json: async () => body,
  } as unknown as Response;
}

describe('coinbase getAccounts — no keys configured', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({
      config: { COINBASE_API_KEY_ID: '', COINBASE_API_KEY_SECRET: '' },
    }));
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns empty array without making a network call', async () => {
    const { getAccounts } = await import('../src/coinbase/client.js');
    const result = await getAccounts();
    expect(result).toEqual([]);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('getTransactions returns empty without network call', async () => {
    const { getTransactions } = await import('../src/coinbase/client.js');
    const result = await getTransactions('acct-1');
    expect(result.transactions).toEqual([]);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});

describe('coinbase getAccounts — with valid keys', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({
      config: { COINBASE_API_KEY_ID: 'test-key-id', COINBASE_API_KEY_SECRET: TEST_PEM },
    }));
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns accounts from a single page', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetch({
        accounts: [{ uuid: 'acc-1', currency: 'BTC', available_balance: { value: '1.5', currency: 'BTC' } }],
        has_next: false,
      }),
    );

    const { getAccounts } = await import('../src/coinbase/client.js');
    const result = await getAccounts();
    expect(result).toHaveLength(1);
    expect(result[0]?.uuid).toBe('acc-1');
    expect(result[0]?.currency).toBe('BTC');
  });

  it('follows pagination when has_next is true', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        makeFetch({
          accounts: [{ uuid: 'acc-1', currency: 'BTC', available_balance: { value: '1', currency: 'BTC' } }],
          has_next: true,
          cursor: 'cursor-page2',
        }),
      )
      .mockResolvedValueOnce(
        makeFetch({
          accounts: [{ uuid: 'acc-2', currency: 'ETH', available_balance: { value: '5', currency: 'ETH' } }],
          has_next: false,
        }),
      );

    const { getAccounts } = await import('../src/coinbase/client.js');
    const result = await getAccounts();
    expect(result).toHaveLength(2);
    expect(result[0]?.uuid).toBe('acc-1');
    expect(result[1]?.uuid).toBe('acc-2');

    const secondCallUrl = vi.mocked(fetch).mock.calls[1]?.[0] as string;
    expect(secondCallUrl).toContain('cursor=cursor-page2');
  });

  it('returns empty array on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch(null, 404));

    const { getAccounts } = await import('../src/coinbase/client.js');
    const result = await getAccounts();
    expect(result).toEqual([]);
  });

  it('throws CoinbaseAuthError on 401', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch({ message: 'Unauthorized' }, 401));

    const { getAccounts, CoinbaseAuthError } = await import('../src/coinbase/client.js');
    await expect(getAccounts()).rejects.toBeInstanceOf(CoinbaseAuthError);
  });

  it('throws generic error on non-ok non-401 non-404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch({ error: 'server error' }, 500));

    const { getAccounts } = await import('../src/coinbase/client.js');
    await expect(getAccounts()).rejects.toThrow('Coinbase API error: 500');
  });

  it('retries on 429 and succeeds on next attempt', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetch(null, 429, { 'Retry-After': '0' }))
      .mockResolvedValueOnce(
        makeFetch({
          accounts: [{ uuid: 'acc-retry', currency: 'SOL', available_balance: { value: '10', currency: 'SOL' } }],
          has_next: false,
        }),
      );

    const { getAccounts } = await import('../src/coinbase/client.js');
    const result = await getAccounts();
    expect(result).toHaveLength(1);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('throws when response schema is invalid (missing required fields)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch({ unexpected_field: 'bad shape' }));

    const { getAccounts } = await import('../src/coinbase/client.js');
    await expect(getAccounts()).rejects.toThrow();
  });
});

describe('coinbase getTransactions — with valid keys', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({
      config: { COINBASE_API_KEY_ID: 'test-key-id', COINBASE_API_KEY_SECRET: TEST_PEM },
    }));
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('appends cursor as starting_after query param', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch({ data: [], pagination: { next_uri: null } }));

    const { getTransactions } = await import('../src/coinbase/client.js');
    await getTransactions('acct-1', 'cursor-abc');

    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(url).toContain('starting_after=cursor-abc');
  });

  it('returns transactions and nextCursor extracted from next_uri', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetch({
        data: [
          {
            id: 'tx-1',
            type: 'receive',
            status: 'completed',
            amount: { amount: '0.5', currency: 'BTC' },
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        pagination: {
          next_uri: '/v2/accounts/acct-1/transactions?starting_after=next-cursor',
        },
      }),
    );

    const { getTransactions } = await import('../src/coinbase/client.js');
    const result = await getTransactions('acct-1');
    expect(result.transactions).toHaveLength(1);
    expect(result.nextCursor).toBe('next-cursor');
  });

  it('omits nextCursor when next_uri is null', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch({ data: [], pagination: { next_uri: null } }));

    const { getTransactions } = await import('../src/coinbase/client.js');
    const result = await getTransactions('acct-1');
    expect(result.nextCursor).toBeUndefined();
  });
});

describe('coinbase classifyTransaction', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({
      config: { COINBASE_API_KEY_ID: '', COINBASE_API_KEY_SECRET: '' },
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('classifies all known transaction types correctly', async () => {
    const { classifyTransaction } = await import('../src/coinbase/client.js');
    expect(classifyTransaction('earn_payout')).toBe('earn');
    expect(classifyTransaction('staking_transfer')).toBe('earn');
    expect(classifyTransaction('unstaking_transfer')).toBe('unstake');
    expect(classifyTransaction('advanced_trade_fill')).toBe('trade');
    expect(classifyTransaction('wrap_asset')).toBe('defi');
    expect(classifyTransaction('unwrap_asset')).toBe('defi');
    expect(classifyTransaction('send')).toBe('transfer');
    expect(classifyTransaction('receive')).toBe('transfer');
    expect(classifyTransaction('some_unknown_type')).toBe('other');
  });
});

describe('coinbase getSpotPrices — TTL cache', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({
      config: { COINBASE_API_KEY_ID: '', COINBASE_API_KEY_SECRET: '' },
    }));
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('fetches price on first call and returns parsed amount', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch({ data: { amount: '50000.00' } }));

    const { getSpotPrices } = await import('../src/coinbase/client.js');
    const result = await getSpotPrices(['BTC']);
    expect(result.get('BTC')).toBe(50000);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('does not re-fetch within TTL on second call in same import', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch({ data: { amount: '50000.00' } }));

    const { getSpotPrices } = await import('../src/coinbase/client.js');
    await getSpotPrices(['BTC']);
    vi.mocked(fetch).mockClear();

    const result = await getSpotPrices(['BTC']);
    expect(result.get('BTC')).toBe(50000);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('deduplicates repeated symbols in the same call', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch({ data: { amount: '3000.00' } }));

    const { getSpotPrices } = await import('../src/coinbase/client.js');
    await getSpotPrices(['ETH', 'ETH', 'ETH']);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('omits symbols whose fetch failed', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetch({ data: { amount: '50000.00' } }))
      .mockResolvedValueOnce(makeFetch(null, 500));

    const { getSpotPrices } = await import('../src/coinbase/client.js');
    const result = await getSpotPrices(['BTC', 'UNKNOWN']);
    expect(result.has('BTC')).toBe(true);
    expect(result.has('UNKNOWN')).toBe(false);
  });
});

describe('coinbase getPortfolioSummary — with valid keys', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({
      config: { COINBASE_API_KEY_ID: 'test-key-id', COINBASE_API_KEY_SECRET: TEST_PEM },
    }));
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns parsed portfolio balances', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetch({
        portfolios: [
          {
            portfolio_balances: {
              total_cash_equivalent_balance: { value: '1000.50' },
              total_crypto_balance: { value: '5500.75' },
              unrealized_pnl: { value: '-200.25' },
            },
          },
        ],
      }),
    );

    const { getPortfolioSummary } = await import('../src/coinbase/client.js');
    const result = await getPortfolioSummary();
    expect(result?.totalCash).toBe(1000.5);
    expect(result?.totalCrypto).toBe(5500.75);
    expect(result?.unrealizedPnl).toBe(-200.25);
  });

  it('returns null when portfolios array is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetch({ portfolios: [] }));

    const { getPortfolioSummary } = await import('../src/coinbase/client.js');
    const result = await getPortfolioSummary();
    expect(result).toBeNull();
  });
});

describe('coinbase getPortfolioSummary — no keys', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({
      config: { COINBASE_API_KEY_ID: '', COINBASE_API_KEY_SECRET: '' },
    }));
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns null without making a network call', async () => {
    const { getPortfolioSummary } = await import('../src/coinbase/client.js');
    const result = await getPortfolioSummary();
    expect(result).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
