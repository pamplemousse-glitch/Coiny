import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

const balancesResponse = (balance: number) => ({
  balances: [{ account: '0.0.12345', balance }],
});

describe('getHederaBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns HBAR balance converted from tinybars (÷ 1e8)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balancesResponse(500_000_000)));

    const { getHederaBalance } = await import('../src/chains/hedera.js');
    const balance = await getHederaBalance('0.0.12345');
    expect(balance).toBeCloseTo(5, 8);
  });

  it('fetches from correct Hedera mirror node URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balancesResponse(100_000_000)));

    const { getHederaBalance } = await import('../src/chains/hedera.js');
    await getHederaBalance('0.0.12345');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      'https://mainnet-public.mirrornode.hedera.com/api/v1/balances?account.id=0.0.12345',
    );
  });

  it('returns 0 when balances array is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ balances: [] }));

    const { getHederaBalance } = await import('../src/chains/hedera.js');
    const balance = await getHederaBalance('0.0.99999');
    expect(balance).toBe(0);
  });

  it('returns 0 on 404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getHederaBalance } = await import('../src/chains/hedera.js');
    const balance = await getHederaBalance('0.0.notfound');
    expect(balance).toBe(0);
  });

  it('returns null when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getHederaBalance } = await import('../src/chains/hedera.js');
    const balance = await getHederaBalance('0.0.bad');
    expect(balance).toBeNull();
  });

  it('throws HederaMirrorError on non-ok non-404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getHederaBalance, HederaMirrorError } = await import('../src/chains/hedera.js');
    await expect(getHederaBalance('0.0.fail')).rejects.toBeInstanceOf(HederaMirrorError);
  });

  it('correctly handles small tinybar amounts', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balancesResponse(100)));

    const { getHederaBalance } = await import('../src/chains/hedera.js');
    const balance = await getHederaBalance('0.0.dust');
    expect(balance).toBeCloseTo(0.000001, 8);
  });
});
