import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

const accountResponse = (amount: string) => ({
  jsonrpc: '2.0',
  id: 1,
  result: { amount },
});

const unknownAccountError = () => ({
  jsonrpc: '2.0',
  id: 1,
  error: {
    cause: { name: 'UNKNOWN_ACCOUNT' },
    code: -32000,
    message: 'Server error',
    name: 'HANDLER_ERROR',
  },
});

describe('getNearBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns NEAR balance converted from yoctoNEAR (÷ 1e24)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(accountResponse('5000000000000000000000000')));

    const { getNearBalance } = await import('../src/chains/near.js');
    const balance = await getNearBalance('alice.near');
    expect(balance).toBeCloseTo(5, 10);
  });

  it('posts to correct NEAR RPC URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(accountResponse('1000000000000000000000000')));

    const { getNearBalance } = await import('../src/chains/near.js');
    await getNearBalance('bob.near');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://rpc.mainnet.near.org');
  });

  it('sends view_account request body', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(accountResponse('0')));

    const { getNearBalance } = await import('../src/chains/near.js');
    await getNearBalance('test.near');

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((callArgs?.[1] as RequestInit)?.body as string);
    expect(body.method).toBe('query');
    expect(body.params.request_type).toBe('view_account');
    expect(body.params.account_id).toBe('test.near');
  });

  it('returns 0 for UNKNOWN_ACCOUNT error', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(unknownAccountError()));

    const { getNearBalance } = await import('../src/chains/near.js');
    const balance = await getNearBalance('notexist.near');
    expect(balance).toBe(0);
  });

  it('returns 0 on 404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getNearBalance } = await import('../src/chains/near.js');
    const balance = await getNearBalance('notfound.near');
    expect(balance).toBe(0);
  });

  it('returns 0 when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getNearBalance } = await import('../src/chains/near.js');
    const balance = await getNearBalance('bad.near');
    expect(balance).toBe(0);
  });

  it('throws NearRpcError on non-ok non-404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getNearBalance, NearRpcError } = await import('../src/chains/near.js');
    await expect(getNearBalance('fail.near')).rejects.toBeInstanceOf(NearRpcError);
  });

  it('correctly handles small yoctoNEAR amounts', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(accountResponse('100000000000000000000')));

    const { getNearBalance } = await import('../src/chains/near.js');
    const balance = await getNearBalance('dust.near');
    expect(balance).toBeCloseTo(0.0001, 8);
  });
});
