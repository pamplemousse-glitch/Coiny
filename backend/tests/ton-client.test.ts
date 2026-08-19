import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  config: {
    TONCENTER_API_KEY: 'test-toncenter-key',
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

describe('getTonBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns TON balance converted from nanoTON (÷ 1e9)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ ok: true, result: '7500000000' }));

    const { getTonBalance } = await import('../src/chains/ton.js');
    const balance = await getTonBalance('EQtest');
    expect(balance).toBeCloseTo(7.5, 9);
  });

  it('fetches from correct TonCenter endpoint with address param', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ ok: true, result: '0' }));

    const { getTonBalance } = await import('../src/chains/ton.js');
    await getTonBalance('EQabc');

    const call = vi.mocked(fetch).mock.calls[0]!;
    expect(call[0]).toContain('https://toncenter.com/api/v2/getAddressBalance');
    expect(call[0]).toContain('address=EQabc');
    expect((call[1] as RequestInit).headers).toMatchObject({ 'X-API-Key': 'test-toncenter-key' });
  });

  it('returns null when ok is false', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ ok: false, result: '0' }));

    const { getTonBalance } = await import('../src/chains/ton.js');
    const balance = await getTonBalance('EQbad');
    expect(balance).toBeNull();
  });

  it('returns 0 on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(null, 404));

    const { getTonBalance } = await import('../src/chains/ton.js');
    const balance = await getTonBalance('EQnotfound');
    expect(balance).toBe(0);
  });

  it('returns null on non-ok HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ error: 'server error' }, 500));

    const { getTonBalance } = await import('../src/chains/ton.js');
    const balance = await getTonBalance('EQfail');
    expect(balance).toBeNull();
  });

  it('returns null when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ unexpected: true }));

    const { getTonBalance } = await import('../src/chains/ton.js');
    const balance = await getTonBalance('EQbadshape');
    expect(balance).toBeNull();
  });

  it('returns null when TONCENTER_API_KEY is empty', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({ config: { TONCENTER_API_KEY: '' } }));

    const { getTonBalance } = await import('../src/chains/ton.js');
    const balance = await getTonBalance('EQsomeaddress');
    expect(balance).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
