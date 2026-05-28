import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('getBudgets', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns budget list', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({ data: { budgets: [{ id: 'b1', name: 'Main', currency_format: { iso_code: 'USD' } }] } }),
    );
    const { getBudgets } = await import('../src/ynab/client.js');
    const budgets = await getBudgets('test-key');
    expect(budgets).toHaveLength(1);
    expect(budgets[0]?.name).toBe('Main');
  });

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({}, 401));
    const { getBudgets } = await import('../src/ynab/client.js');
    await expect(getBudgets('bad-key')).rejects.toThrow('401');
  });
});

describe('getAccounts', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns only open, non-deleted accounts', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        data: {
          accounts: [
            { id: 'a1', name: 'Checking', type: 'checking', balance: 100_000, closed: false, deleted: false },
            { id: 'a2', name: 'Old', type: 'savings', balance: 50_000, closed: true, deleted: false },
          ],
        },
      }),
    );
    const { getAccounts } = await import('../src/ynab/client.js');
    const accounts = await getAccounts('test-key', 'budget-1');
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.id).toBe('a1');
  });
});

describe('getTotalNetWorth', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('sums balances across all budgets and accounts', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { budgets: [{ id: 'b1', name: 'Main', currency_format: { iso_code: 'USD' } }] } }),
      )
      .mockResolvedValueOnce(
        makeFetchResponse({
          data: {
            accounts: [
              { id: 'a1', name: 'Checking', type: 'checking', balance: 500_000, closed: false, deleted: false },
            ],
          },
        }),
      );
    const { getTotalNetWorth } = await import('../src/ynab/client.js');
    const total = await getTotalNetWorth('test-key');
    expect(total).toBe(500); // 500_000 milliunits = $500
  });
});

describe('exchangeCodeForTokens', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns parsed token response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({ access_token: 'acc', refresh_token: 'ref', expires_in: 7200 }),
    );
    const { exchangeCodeForTokens } = await import('../src/ynab/client.js');
    const tokens = await exchangeCodeForTokens('client-id', 'code', 'verifier', 'coiny://callback');
    expect(tokens.accessToken).toBe('acc');
    expect(tokens.refreshToken).toBe('ref');
    expect(tokens.expiresAt).toBeInstanceOf(Date);
  });

  it('throws on non-ok token response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({}, 400));
    const { exchangeCodeForTokens } = await import('../src/ynab/client.js');
    await expect(exchangeCodeForTokens('id', 'code', 'v', 'uri')).rejects.toThrow('400');
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns refreshed tokens', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({ access_token: 'new-acc', refresh_token: 'new-ref', expires_in: 3600 }),
    );
    const { refreshAccessToken } = await import('../src/ynab/client.js');
    const tokens = await refreshAccessToken('client-id', 'old-refresh');
    expect(tokens.accessToken).toBe('new-acc');
  });
});
