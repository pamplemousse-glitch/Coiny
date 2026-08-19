import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

const balanceResponse = (totalBalance: string) => ({
  jsonrpc: '2.0',
  id: 1,
  result: { totalBalance },
});

const rpcErrorResponse = () => ({
  jsonrpc: '2.0',
  id: 1,
  error: { code: -32000, message: 'account not found' },
});

describe('getSuiBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns SUI balance converted from MIST (÷ 1e9)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balanceResponse('5000000000')));

    const { getSuiBalance } = await import('../src/chains/sui.js');
    const balance = await getSuiBalance('0xsuiaddr');
    expect(balance).toBeCloseTo(5, 9);
  });

  it('posts to correct Sui fullnode URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balanceResponse('1000000000')));

    const { getSuiBalance } = await import('../src/chains/sui.js');
    await getSuiBalance('0xsuiaddr');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://fullnode.mainnet.sui.io');
  });

  it('sends suix_getBalance request body with correct coin type', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balanceResponse('0')));

    const { getSuiBalance } = await import('../src/chains/sui.js');
    await getSuiBalance('0xtest');

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((callArgs?.[1] as RequestInit)?.body as string);
    expect(body.method).toBe('suix_getBalance');
    expect(body.params[0]).toBe('0xtest');
    expect(body.params[1]).toBe('0x2::sui::SUI');
  });

  it('returns null when RPC returns an error', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(rpcErrorResponse()));

    const { getSuiBalance } = await import('../src/chains/sui.js');
    const balance = await getSuiBalance('0xnotfound');
    expect(balance).toBeNull();
  });

  it('returns null when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getSuiBalance } = await import('../src/chains/sui.js');
    const balance = await getSuiBalance('0xbad');
    expect(balance).toBeNull();
  });

  it('throws SuiRpcError on non-ok HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getSuiBalance, SuiRpcError } = await import('../src/chains/sui.js');
    await expect(getSuiBalance('0xfail')).rejects.toBeInstanceOf(SuiRpcError);
  });

  it('correctly handles small MIST amounts', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(balanceResponse('1000')));

    const { getSuiBalance } = await import('../src/chains/sui.js');
    const balance = await getSuiBalance('0xdust');
    expect(balance).toBeCloseTo(0.000001, 9);
  });
});
