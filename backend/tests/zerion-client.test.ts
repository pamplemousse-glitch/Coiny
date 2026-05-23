import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  config: {
    ZERION_API_KEY: 'test-zerion-key',
  },
}));

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 403 ? 'Forbidden' : 'OK',
    headers: new Headers(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('zerion getPortfolio', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns total_usd from portfolio response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        data: { attributes: { total: { positions: 42500.75 } } },
      }),
    );

    const { getPortfolio } = await import('../src/zerion/client.js');
    const result = await getPortfolio('0xabc123');
    expect(result.total_usd).toBe(42500.75);
    expect(result.change_1d_pct).toBeNull();
  });

  it('returns change_1d_pct when present', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        data: {
          attributes: {
            total: { positions: 10000 },
            changes: { percent_1d: 0.0325, absolute_1d: 312.5 },
          },
        },
      }),
    );

    const { getPortfolio } = await import('../src/zerion/client.js');
    const result = await getPortfolio('0xabc123');
    expect(result.total_usd).toBe(10000);
    expect(result.change_1d_pct).toBe(0.0325);
  });

  it('returns total_usd: 0 when response is 404', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getPortfolio } = await import('../src/zerion/client.js');
    const result = await getPortfolio('0xnotfound');
    expect(result.total_usd).toBe(0);
    expect(result.change_1d_pct).toBeNull();
  });

  it('returns total_usd: 0 when response shape is unexpected', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getPortfolio } = await import('../src/zerion/client.js');
    const result = await getPortfolio('0xbad');
    expect(result.total_usd).toBe(0);
  });

  it('throws ZerionError on non-ok non-404 response with structured detail', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ errors: [{ detail: 'Invalid wallet address' }] }, 403));

    const { getPortfolio, ZerionError } = await import('../src/zerion/client.js');
    await expect(getPortfolio('0xfail')).rejects.toBeInstanceOf(ZerionError);
    await expect(getPortfolio('0xfail')).rejects.toThrow('Invalid wallet address');
  });

  it('passes filter[positions]=no_filter and currency=usd to the request', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ data: { attributes: { total: { positions: 0 } } } }));

    const { getPortfolio } = await import('../src/zerion/client.js');
    await getPortfolio('0xabc');

    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(url).toContain('filter%5Bpositions%5D=no_filter');
    expect(url).toContain('currency=usd');
  });
});

describe('zerion getTransactions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty list when response is 404', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getTransactions } = await import('../src/zerion/client.js');
    const result = await getTransactions('0xnone');
    expect(result.transactions).toHaveLength(0);
  });

  it('returns empty list when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ bad: 'shape' }));

    const { getTransactions } = await import('../src/zerion/client.js');
    const result = await getTransactions('0xbad');
    expect(result.transactions).toHaveLength(0);
  });

  it('parses inbound receive transaction', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        links: { next: null },
        data: [
          {
            id: 'tx-eth-001',
            attributes: {
              operation_type: 'receive',
              status: 'confirmed',
              mined_at: '2026-01-01T00:00:00Z',
              transfers: [{ direction: 'in', value: 1500, fungible_info: { symbol: 'ETH' } }],
            },
          },
        ],
      }),
    );

    const { getTransactions } = await import('../src/zerion/client.js');
    const result = await getTransactions('0xwlt');

    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0]!;
    expect(tx.id).toBe('tx-eth-001');
    expect(tx.type).toBe('receive');
    expect(tx.direction).toBe('in');
    expect(tx.quantity_usd).toBe(1500);
    expect(tx.asset_symbol).toBe('ETH');
    expect(result.nextCursor).toBeUndefined();
  });

  it('returns full links.next URL as nextCursor (never reconstructed)', async () => {
    const nextUrl =
      'https://api.zerion.io/v1/wallets/0xwlt/transactions/?page[after]=cursor-abc&filter[trash]=only_non_trash';
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        links: { next: nextUrl },
        data: [],
      }),
    );

    const { getTransactions } = await import('../src/zerion/client.js');
    const result = await getTransactions('0xwlt');
    expect(result.nextCursor).toBe(nextUrl);
  });

  it('uses nextCursor URL directly as the next fetch URL', async () => {
    const nextUrl = 'https://api.zerion.io/v1/wallets/0xwlt/transactions/?page[after]=opaque-token';
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ links: { next: null }, data: [] }));

    const { getTransactions } = await import('../src/zerion/client.js');
    await getTransactions('0xwlt', nextUrl);

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(nextUrl);
  });

  it('includes filter[trash]=only_non_trash in first-page requests', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ links: { next: null }, data: [] }));

    const { getTransactions } = await import('../src/zerion/client.js');
    await getTransactions('0xwlt');

    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(url).toContain('filter%5Btrash%5D=only_non_trash');
  });

  it('handles transaction with no transfers gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        links: { next: null },
        data: [
          {
            id: 'tx-empty',
            attributes: {
              operation_type: 'send',
              status: 'confirmed',
              mined_at: null,
              transfers: [],
            },
          },
        ],
      }),
    );

    const { getTransactions } = await import('../src/zerion/client.js');
    const result = await getTransactions('0xwlt');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.direction).toBe('out');
    expect(result.transactions[0]?.quantity_usd).toBe(0);
  });
});
