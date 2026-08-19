import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

const accountResponse = (xlmBalance: string, extras: { asset_type: string; balance: string }[] = []) => ({
  balances: [{ asset_type: 'native', balance: xlmBalance }, ...extras],
});

describe('getStellarBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns XLM balance from native balance entry', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(accountResponse('1500.0000000')));

    const { getStellarBalance } = await import('../src/chains/stellar.js');
    const balance = await getStellarBalance('GTEST');
    expect(balance).toBeCloseTo(1500, 7);
  });

  it('fetches from correct Horizon URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(accountResponse('0.0000000')));

    const { getStellarBalance } = await import('../src/chains/stellar.js');
    await getStellarBalance('GABCDEF123');

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://horizon.stellar.org/accounts/GABCDEF123');
  });

  it('returns 0 for account that does not exist (404)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 404));

    const { getStellarBalance } = await import('../src/chains/stellar.js');
    const balance = await getStellarBalance('GNOTFOUND');
    expect(balance).toBe(0);
  });

  it('returns 0 when native balance entry is absent', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse({ balances: [{ asset_type: 'credit_alphanum4', balance: '100.0000000' }] }),
    );

    const { getStellarBalance } = await import('../src/chains/stellar.js');
    const balance = await getStellarBalance('GNATIVE_MISSING');
    expect(balance).toBe(0);
  });

  it('returns null when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getStellarBalance } = await import('../src/chains/stellar.js');
    const balance = await getStellarBalance('GBAD');
    expect(balance).toBeNull();
  });

  it('throws HorizonError on non-ok non-404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getStellarBalance, HorizonError } = await import('../src/chains/stellar.js');
    await expect(getStellarBalance('GFAIL')).rejects.toBeInstanceOf(HorizonError);
  });

  it('ignores non-native token balances and returns only XLM', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse(accountResponse('250.5000000', [{ asset_type: 'credit_alphanum4', balance: '999.0000000' }])),
    );

    const { getStellarBalance } = await import('../src/chains/stellar.js');
    const balance = await getStellarBalance('GMULTIASSET');
    expect(balance).toBeCloseTo(250.5, 7);
  });
});
