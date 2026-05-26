import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Internal Server Error',
    json: async () => body,
  } as unknown as Response;
}

const successResponse = (balanceDrops: string) => ({
  result: {
    account_data: { Balance: balanceDrops },
    status: 'success',
  },
});

const notFoundResponse = {
  result: { error: 'actNotFound', status: 'error' },
};

describe('getXrpBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns XRP balance converted from drops (÷ 1e6)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(successResponse('1000000000')));

    const { getXrpBalance } = await import('../src/chains/xrp.js');
    const balance = await getXrpBalance('rTestAddress');
    expect(balance).toBeCloseTo(1000, 6);
  });

  it('posts to the XRPL public JSON-RPC endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(successResponse('0')));

    const { getXrpBalance } = await import('../src/chains/xrp.js');
    await getXrpBalance('rSomeAddr');

    const call = vi.mocked(fetch).mock.calls[0];
    expect(call?.[0]).toBe('https://xrplcluster.com');
    expect(call?.[1]?.method).toBe('POST');
    const body = JSON.parse(call?.[1]?.body as string);
    expect(body.method).toBe('account_info');
    expect(body.params[0].account).toBe('rSomeAddr');
    expect(body.params[0].ledger_index).toBe('validated');
  });

  it('returns 0 for unfunded address (actNotFound)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(notFoundResponse));

    const { getXrpBalance } = await import('../src/chains/xrp.js');
    const balance = await getXrpBalance('rNewUnfunded');
    expect(balance).toBe(0);
  });

  it('returns 0 when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getXrpBalance } = await import('../src/chains/xrp.js');
    const balance = await getXrpBalance('rBad');
    expect(balance).toBe(0);
  });

  it('throws XrplError on non-ok HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getXrpBalance, XrplError } = await import('../src/chains/xrp.js');
    await expect(getXrpBalance('rFail')).rejects.toBeInstanceOf(XrplError);
  });

  it('correctly handles dust balance (1 drop = 0.000001 XRP)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(successResponse('1')));

    const { getXrpBalance } = await import('../src/chains/xrp.js');
    const balance = await getXrpBalance('rDust');
    expect(balance).toBeCloseTo(0.000001, 6);
  });

  it('handles the 20 XRP reserve correctly', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(successResponse('20000000')));

    const { getXrpBalance } = await import('../src/chains/xrp.js');
    const balance = await getXrpBalance('rReserve');
    expect(balance).toBeCloseTo(20, 6);
  });
});
