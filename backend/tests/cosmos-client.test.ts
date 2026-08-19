import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

const balancesResponse = (denom: string, amount: string) => ({
  balances: [{ denom, amount }],
});

describe('getCosmosBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ATOM balance converted from uatom (÷ 1e6)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balancesResponse('uatom', '10000000')));

    const { getCosmosBalance } = await import('../src/chains/cosmos.js');
    const balance = await getCosmosBalance('cosmos', 'cosmos1test');
    expect(balance).toBeCloseTo(10, 6);
  });

  it('returns OSMO balance converted from uosmo (÷ 1e6)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balancesResponse('uosmo', '5000000')));

    const { getCosmosBalance } = await import('../src/chains/cosmos.js');
    const balance = await getCosmosBalance('osmosis', 'osmo1test');
    expect(balance).toBeCloseTo(5, 6);
  });

  it('fetches from correct Cosmos LCD URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balancesResponse('uatom', '0')));

    const { getCosmosBalance } = await import('../src/chains/cosmos.js');
    await getCosmosBalance('cosmos', 'cosmos1abc');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      'https://cosmos-rest.publicnode.com/cosmos/bank/v1beta1/balances/cosmos1abc',
    );
  });

  it('fetches from correct Osmosis LCD URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balancesResponse('uosmo', '0')));

    const { getCosmosBalance } = await import('../src/chains/cosmos.js');
    await getCosmosBalance('osmosis', 'osmo1abc');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      'https://osmosis-rest.publicnode.com/cosmos/bank/v1beta1/balances/osmo1abc',
    );
  });

  it('returns 0 for address not found (404)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getCosmosBalance } = await import('../src/chains/cosmos.js');
    const balance = await getCosmosBalance('cosmos', 'cosmos1notfound');
    expect(balance).toBe(0);
  });

  it('returns 0 when native denom is absent from balances', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ balances: [{ denom: 'ibc/sometoken', amount: '999000' }] }));

    const { getCosmosBalance } = await import('../src/chains/cosmos.js');
    const balance = await getCosmosBalance('cosmos', 'cosmos1ibc');
    expect(balance).toBe(0);
  });

  it('returns null when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getCosmosBalance } = await import('../src/chains/cosmos.js');
    const balance = await getCosmosBalance('cosmos', 'cosmos1bad');
    expect(balance).toBeNull();
  });

  it('throws CosmosLcdError on non-ok non-404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getCosmosBalance, CosmosLcdError } = await import('../src/chains/cosmos.js');
    await expect(getCosmosBalance('cosmos', 'cosmos1fail')).rejects.toBeInstanceOf(CosmosLcdError);
  });

  it('throws CosmosLcdError for unsupported chain', async () => {
    const { getCosmosBalance, CosmosLcdError } = await import('../src/chains/cosmos.js');
    await expect(getCosmosBalance('bitcoin', 'bc1q')).rejects.toBeInstanceOf(CosmosLcdError);
  });
});
