import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('exchangeCode', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns correct token shape', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        access_token: 'access-abc',
        refresh_token: 'refresh-xyz',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    );
    const { exchangeCode } = await import('../src/truelayer/client.js');
    const result = await exchangeCode('code123', 'client-id', 'client-secret', 'coiny://truelayer/callback');
    expect(result.accessToken).toBe('access-abc');
    expect(result.refreshToken).toBe('refresh-xyz');
    expect(result.expiresIn).toBe(3600);
  });

  it('posts to sandbox token endpoint by default', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({ access_token: 'a', refresh_token: 'r', expires_in: 3600, token_type: 'Bearer' }),
    );
    const { exchangeCode } = await import('../src/truelayer/client.js');
    await exchangeCode('code', 'client-id', 'client-secret', 'coiny://callback');
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, ...unknown[]];
    expect(url).toBe('https://auth.truelayer-sandbox.com/connect/token');
  });

  it('posts to live token endpoint when env=live', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({ access_token: 'a', refresh_token: 'r', expires_in: 3600, token_type: 'Bearer' }),
    );
    const { exchangeCode } = await import('../src/truelayer/client.js');
    await exchangeCode('code', 'client-id', 'client-secret', 'coiny://callback', 'live');
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, ...unknown[]];
    expect(url).toBe('https://auth.truelayer.com/connect/token');
  });

  it('throws on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ error: 'invalid_client' }, 401));
    const { exchangeCode } = await import('../src/truelayer/client.js');
    await expect(exchangeCode('bad-code', 'client-id', 'secret', 'uri')).rejects.toThrow('401');
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns refreshed access token and expiresIn', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 7200,
        token_type: 'Bearer',
      }),
    );
    const { refreshAccessToken } = await import('../src/truelayer/client.js');
    const result = await refreshAccessToken('old-refresh', 'client-id', 'client-secret');
    expect(result.accessToken).toBe('new-access');
    expect(result.expiresIn).toBe(7200);
  });

  it('throws on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ error: 'invalid_grant' }, 400));
    const { refreshAccessToken } = await import('../src/truelayer/client.js');
    await expect(refreshAccessToken('expired', 'client-id', 'secret')).rejects.toThrow('400');
  });
});

describe('getAccounts', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns parsed accounts array', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        results: [
          {
            account_id: 'acc-001',
            account_type: 'TRANSACTION',
            display_name: 'Current Account',
            currency: 'GBP',
            provider: { provider_id: 'ob-monzo', display_name: 'Monzo' },
            update_timestamp: '2026-05-01T00:00:00Z',
          },
        ],
      }),
    );
    const { getAccounts } = await import('../src/truelayer/client.js');
    const accounts = await getAccounts('bearer-token');
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.accountId).toBe('acc-001');
    expect(accounts[0]?.currency).toBe('GBP');
    expect(accounts[0]?.providerId).toBe('ob-monzo');
    expect(accounts[0]?.providerName).toBe('Monzo');
  });

  it('returns empty array when results is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ results: [] }));
    const { getAccounts } = await import('../src/truelayer/client.js');
    const accounts = await getAccounts('bearer-token');
    expect(accounts).toHaveLength(0);
  });

  it('throws on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ error: 'unauthorized' }, 401));
    const { getAccounts } = await import('../src/truelayer/client.js');
    await expect(getAccounts('bad-token')).rejects.toThrow('401');
  });
});

describe('getBalance', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns the current balance amount', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        results: [
          {
            currency: 'GBP',
            available: 1000.0,
            current: 1050.5,
            update_timestamp: '2026-05-01T00:00:00Z',
          },
        ],
      }),
    );
    const { getBalance } = await import('../src/truelayer/client.js');
    const balance = await getBalance('bearer-token', 'acc-001');
    expect(balance).toBe(1050.5);
  });

  it('throws when results array is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ results: [] }));
    const { getBalance } = await import('../src/truelayer/client.js');
    await expect(getBalance('bearer-token', 'acc-empty')).rejects.toThrow('no balance result');
  });

  it('throws on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ error: 'forbidden' }, 403));
    const { getBalance } = await import('../src/truelayer/client.js');
    await expect(getBalance('bad-token', 'acc-001')).rejects.toThrow('403');
  });
});

describe('getTransactions', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns parsed transactions array', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        results: [
          {
            transaction_id: 'tx-001',
            normalised_provider_transaction_id: 'ntx-001',
            merchant_name: 'Tesco',
            timestamp: '2026-05-01T12:00:00Z',
            description: 'Tesco Superstore',
            amount: -23.5,
            currency: 'GBP',
            transaction_type: 'DEBIT',
            transaction_classification: ['Shopping', 'Groceries'],
            running_balance: null,
          },
        ],
      }),
    );
    const { getTransactions } = await import('../src/truelayer/client.js');
    const from = new Date('2026-04-01T00:00:00Z');
    const to = new Date('2026-05-01T23:59:59Z');
    const txs = await getTransactions('bearer-token', 'acc-001', from, to);
    expect(txs).toHaveLength(1);
    expect(txs[0]?.transactionId).toBe('tx-001');
    expect(txs[0]?.merchantName).toBe('Tesco');
    expect(txs[0]?.amount).toBe(-23.5);
    expect(txs[0]?.currency).toBe('GBP');
    expect(txs[0]?.classification).toEqual(['Shopping', 'Groceries']);
  });

  it('includes from/to as ISO strings in the query URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ results: [] }));
    const { getTransactions } = await import('../src/truelayer/client.js');
    const from = new Date('2026-04-01T00:00:00.000Z');
    const to = new Date('2026-05-01T00:00:00.000Z');
    await getTransactions('bearer-token', 'acc-001', from, to);
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain('from=2026-04-01T00%3A00%3A00.000Z');
    expect(url).toContain('to=2026-05-01T00%3A00%3A00.000Z');
  });

  it('maps null merchant_name to null', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        results: [
          {
            transaction_id: 'tx-002',
            normalised_provider_transaction_id: null,
            merchant_name: null,
            timestamp: '2026-05-02T08:00:00Z',
            description: 'Direct Debit',
            amount: -100,
            currency: 'GBP',
            transaction_type: 'DEBIT',
            transaction_classification: [],
            running_balance: null,
          },
        ],
      }),
    );
    const { getTransactions } = await import('../src/truelayer/client.js');
    const txs = await getTransactions('bearer-token', 'acc-001', new Date(), new Date());
    expect(txs[0]?.merchantName).toBeNull();
  });

  it('throws on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ error: 'internal_error' }, 500));
    const { getTransactions } = await import('../src/truelayer/client.js');
    await expect(getTransactions('token', 'acc', new Date(), new Date())).rejects.toThrow('500');
  });
});

describe('buildAuthUrl', () => {
  it('builds correct sandbox auth URL with required params', async () => {
    const { buildAuthUrl } = await import('../src/truelayer/client.js');
    const url = buildAuthUrl({ clientId: 'my-client', redirectUri: 'coiny://callback', env: 'sandbox' });
    expect(url).toContain('https://auth.truelayer-sandbox.com/');
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=my-client');
    expect(url).toContain('offline_access');
    expect(url).toContain('uk-ob-all');
  });

  it('builds live auth URL for live env', async () => {
    const { buildAuthUrl } = await import('../src/truelayer/client.js');
    const url = buildAuthUrl({ clientId: 'my-client', redirectUri: 'coiny://callback', env: 'live' });
    expect(url).toContain('https://auth.truelayer.com/');
  });
});
