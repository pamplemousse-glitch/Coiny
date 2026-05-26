import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

const APT_COIN_TYPE = '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>';

const resourcesResponse = (value: string) => [
  {
    type: APT_COIN_TYPE,
    data: { coin: { value } },
  },
];

describe('getAptosBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns APT balance converted from octas (÷ 1e8)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(resourcesResponse('500000000')));

    const { getAptosBalance } = await import('../src/chains/aptos.js');
    const balance = await getAptosBalance('0xabc123');
    expect(balance).toBeCloseTo(5, 8);
  });

  it('fetches from correct Aptos fullnode URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(resourcesResponse('100000000')));

    const { getAptosBalance } = await import('../src/chains/aptos.js');
    await getAptosBalance('0xabc123');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      'https://fullnode.mainnet.aptoslabs.com/v1/accounts/0xabc123/resources',
    );
  });

  it('returns 0 on 404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getAptosBalance } = await import('../src/chains/aptos.js');
    const balance = await getAptosBalance('0xnotfound');
    expect(balance).toBe(0);
  });

  it('returns 0 when APT coin resource is absent', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse([{ type: '0x1::coin::CoinStore<0x1::other::Coin>', data: { coin: { value: '999' } } }]),
    );

    const { getAptosBalance } = await import('../src/chains/aptos.js');
    const balance = await getAptosBalance('0xnoatom');
    expect(balance).toBe(0);
  });

  it('returns 0 when resources array is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse([]));

    const { getAptosBalance } = await import('../src/chains/aptos.js');
    const balance = await getAptosBalance('0xempty');
    expect(balance).toBe(0);
  });

  it('returns 0 when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getAptosBalance } = await import('../src/chains/aptos.js');
    const balance = await getAptosBalance('0xbad');
    expect(balance).toBe(0);
  });

  it('throws AptosApiError on non-ok non-404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getAptosBalance, AptosApiError } = await import('../src/chains/aptos.js');
    await expect(getAptosBalance('0xfail')).rejects.toBeInstanceOf(AptosApiError);
  });

  it('correctly handles small octa amounts', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(resourcesResponse('1')));

    const { getAptosBalance } = await import('../src/chains/aptos.js');
    const balance = await getAptosBalance('0xdust');
    expect(balance).toBeCloseTo(0.00000001, 10);
  });
});
