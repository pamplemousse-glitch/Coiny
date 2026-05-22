import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 403 ? 'Forbidden' : 'OK',
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
  });

  it('returns total_usd: 0 when response is 404', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getPortfolio } = await import('../src/zerion/client.js');
    const result = await getPortfolio('0xnotfound');
    expect(result.total_usd).toBe(0);
  });

  it('returns total_usd: 0 when response shape is unexpected', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getPortfolio } = await import('../src/zerion/client.js');
    const result = await getPortfolio('0xbad');
    expect(result.total_usd).toBe(0);
  });

  it('throws on non-ok non-404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({}, 403));

    const { getPortfolio } = await import('../src/zerion/client.js');
    await expect(getPortfolio('0xfail')).rejects.toThrow('403');
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

  it('extracts nextCursor from next link', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        links: { next: 'https://api.zerion.io/v1/wallets/0xwlt/transactions/?page[after]=cursor-abc' },
        data: [],
      }),
    );

    const { getTransactions } = await import('../src/zerion/client.js');
    const result = await getTransactions('0xwlt');
    expect(result.nextCursor).toBe('cursor-abc');
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
