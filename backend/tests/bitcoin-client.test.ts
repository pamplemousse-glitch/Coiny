import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

describe('getBitcoinBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns BTC balance computed from funded minus spent satoshis', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({
        chain_stats: { funded_txo_sum: 150_000_000, spent_txo_sum: 50_000_000 },
        mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 },
      }),
    );

    const { getBitcoinBalance } = await import('../src/chains/bitcoin.js');
    const balance = await getBitcoinBalance('bc1qtest');
    expect(balance).toBeCloseTo(1.0, 8);
  });

  it('fetches from correct Blockstream Esplora URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0 } }));

    const { getBitcoinBalance } = await import('../src/chains/bitcoin.js');
    await getBitcoinBalance('bc1qabc123');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://blockstream.info/api/address/bc1qabc123');
  });

  it('returns 0 for address with no history (404)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getBitcoinBalance } = await import('../src/chains/bitcoin.js');
    const balance = await getBitcoinBalance('bc1qnotfound');
    expect(balance).toBe(0);
  });

  it('returns 0 for address with no transactions (zero sats)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0 } }));

    const { getBitcoinBalance } = await import('../src/chains/bitcoin.js');
    const balance = await getBitcoinBalance('bc1qempty');
    expect(balance).toBe(0);
  });

  it('returns 0 when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getBitcoinBalance } = await import('../src/chains/bitcoin.js');
    const balance = await getBitcoinBalance('bc1qbad');
    expect(balance).toBe(0);
  });

  it('throws BlockstreamError on non-ok non-404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getBitcoinBalance, BlockstreamError } = await import('../src/chains/bitcoin.js');
    await expect(getBitcoinBalance('bc1qfail')).rejects.toBeInstanceOf(BlockstreamError);
  });

  it('correctly handles satoshi precision for small balances', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ chain_stats: { funded_txo_sum: 546, spent_txo_sum: 0 } }));

    const { getBitcoinBalance } = await import('../src/chains/bitcoin.js');
    const balance = await getBitcoinBalance('bc1qdust');
    expect(balance).toBeCloseTo(0.00000546, 8);
  });
});
