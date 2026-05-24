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
        accounts: [
          { uuid: 'acc-1', currency: 'BTC', available_balance: { value: '1.5', currency: 'BTC' } },
        ],
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
    vi.mocked(fetch).mockResolvedValue(
      makeFetch({ data: [], pagination: { starting_after: null } }),
    );

    const { getTransactions } = await import('../src/coinbase/client.js');
    await getTransactions('acct-1', 'cursor-abc');

    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(url).toContain('starting_after=cursor-abc');
  });

  it('returns transactions and nextCursor from paginated response', async () => {
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
        pagination: { starting_after: 'next-cursor' },
      }),
    );

    const { getTransactions } = await import('../src/coinbase/client.js');
    const result = await getTransactions('acct-1');
    expect(result.transactions).toHaveLength(1);
    expect(result.nextCursor).toBe('next-cursor');
  });

  it('omits nextCursor when starting_after is null', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetch({ data: [], pagination: { starting_after: null } }),
    );

    const { getTransactions } = await import('../src/coinbase/client.js');
    const result = await getTransactions('acct-1');
    expect(result.nextCursor).toBeUndefined();
  });
});
