import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  config: {
    SUBSCAN_API_KEY: 'test-subscan-key',
  },
}));

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

describe('getPolkadotBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns DOT balance from data.account.balance', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({ code: 0, data: { account: { balance: '12.5' } } }),
    );

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1abc');
    expect(balance).toBeCloseTo(12.5, 6);
  });

  it('posts to Subscan search endpoint with address in body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({ code: 0, data: { account: { balance: '0' } } }),
    );

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    await getPolkadotBalance('1dotaddress');

    const call = vi.mocked(fetch).mock.calls[0]!;
    expect(call[0]).toBe('https://polkadot.api.subscan.io/api/v2/scan/search');
    expect(JSON.parse((call[1] as RequestInit).body as string)).toMatchObject({ key: '1dotaddress' });
  });

  it('returns 0 when API response code != 0', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({ code: 10004, data: null }),
    );

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1bad');
    expect(balance).toBe(0);
  });

  it('returns 0 when data is null', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ code: 0, data: null }));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1nodata');
    expect(balance).toBe(0);
  });

  it('returns 0 when data.account is null', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ code: 0, data: { account: null } }));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1noaccount');
    expect(balance).toBe(0);
  });

  it('returns 0 on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(null, 404));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1notfound');
    expect(balance).toBe(0);
  });

  it('returns 0 on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ error: 'server error' }, 500));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1fail');
    expect(balance).toBe(0);
  });

  it('returns 0 when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ unexpected: true }));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1bad');
    expect(balance).toBe(0);
  });

  it('returns 0 when SUBSCAN_API_KEY is empty', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({ config: { SUBSCAN_API_KEY: '' } }));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1someaddress');
    expect(balance).toBe(0);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
