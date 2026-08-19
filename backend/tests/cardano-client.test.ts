import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  config: {
    BLOCKFROST_PROJECT_ID: 'test-blockfrost-id',
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

describe('getCardanoBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns ADA balance converted from lovelace (÷ 1e6)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ amount: [{ unit: 'lovelace', quantity: '5000000000' }] }));

    const { getCardanoBalance } = await import('../src/chains/cardano.js');
    const balance = await getCardanoBalance('addr1test');
    expect(balance).toBeCloseTo(5000, 6);
  });

  it('fetches from correct Blockfrost endpoint with project_id header', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ amount: [{ unit: 'lovelace', quantity: '0' }] }));

    const { getCardanoBalance } = await import('../src/chains/cardano.js');
    await getCardanoBalance('addr1abc');

    const call = vi.mocked(fetch).mock.calls[0]!;
    expect(call[0]).toContain('https://cardano-mainnet.blockfrost.io/api/v0/addresses/addr1abc');
    expect((call[1] as RequestInit).headers).toMatchObject({ project_id: 'test-blockfrost-id' });
  });

  it('returns 0 on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(null, 404));

    const { getCardanoBalance } = await import('../src/chains/cardano.js');
    const balance = await getCardanoBalance('addr1notfound');
    expect(balance).toBe(0);
  });

  it('returns null on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ error: 'server error' }, 500));

    const { getCardanoBalance } = await import('../src/chains/cardano.js');
    const balance = await getCardanoBalance('addr1fail');
    expect(balance).toBeNull();
  });

  it('returns 0 when lovelace unit is absent from amount array', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ amount: [{ unit: 'sometoken', quantity: '9999' }] }));

    const { getCardanoBalance } = await import('../src/chains/cardano.js');
    const balance = await getCardanoBalance('addr1nolovelace');
    expect(balance).toBe(0);
  });

  it('returns null when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ unexpected: true }));

    const { getCardanoBalance } = await import('../src/chains/cardano.js');
    const balance = await getCardanoBalance('addr1bad');
    expect(balance).toBeNull();
  });

  it('returns null when BLOCKFROST_PROJECT_ID is empty', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({ config: { BLOCKFROST_PROJECT_ID: '' } }));

    const { getCardanoBalance } = await import('../src/chains/cardano.js');
    const balance = await getCardanoBalance('addr1someaddress');
    expect(balance).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
