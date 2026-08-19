import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

describe('getBlockcypherBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns DOGE balance converted from satoshis (÷ 1e8)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ balance: 500_000_000 }));

    const { getBlockcypherBalance } = await import('../src/chains/blockcypher.js');
    const balance = await getBlockcypherBalance('doge', 'DTestAddr');
    expect(balance).toBeCloseTo(5, 8);
  });

  it('fetches from correct BlockCypher URL for DOGE', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ balance: 0 }));

    const { getBlockcypherBalance } = await import('../src/chains/blockcypher.js');
    await getBlockcypherBalance('doge', 'DMyAddr');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://api.blockcypher.com/v1/doge/main/addrs/DMyAddr/balance');
  });

  it('fetches from correct BlockCypher URL for LTC', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ balance: 0 }));

    const { getBlockcypherBalance } = await import('../src/chains/blockcypher.js');
    await getBlockcypherBalance('ltc', 'LTestAddr');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://api.blockcypher.com/v1/ltc/main/addrs/LTestAddr/balance');
  });

  it('fetches from correct BlockCypher URL for BCH', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ balance: 0 }));

    const { getBlockcypherBalance } = await import('../src/chains/blockcypher.js');
    await getBlockcypherBalance('bch', 'qTestAddr');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://api.blockcypher.com/v1/bch/main/addrs/qTestAddr/balance');
  });

  it('returns 0 for address with no history (404)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getBlockcypherBalance } = await import('../src/chains/blockcypher.js');
    const balance = await getBlockcypherBalance('ltc', 'LNotFound');
    expect(balance).toBe(0);
  });

  it('returns null when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getBlockcypherBalance } = await import('../src/chains/blockcypher.js');
    const balance = await getBlockcypherBalance('bch', 'qBad');
    expect(balance).toBeNull();
  });

  it('throws BlockcypherError on non-ok non-404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getBlockcypherBalance, BlockcypherError } = await import('../src/chains/blockcypher.js');
    await expect(getBlockcypherBalance('doge', 'DFail')).rejects.toBeInstanceOf(BlockcypherError);
  });

  it('throws BlockcypherError for unsupported chain', async () => {
    const { getBlockcypherBalance, BlockcypherError } = await import('../src/chains/blockcypher.js');
    await expect(getBlockcypherBalance('ethereum', '0xABC')).rejects.toBeInstanceOf(BlockcypherError);
  });
});
