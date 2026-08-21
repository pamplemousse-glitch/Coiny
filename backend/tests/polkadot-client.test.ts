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
    vi.mocked(fetch).mockResolvedValue(makeResponse({ code: 0, data: { account: { balance: '12.5' } } }));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1abc');
    expect(balance).toBeCloseTo(12.5, 6);
  });

  it('posts to the ASSET HUB search endpoint, not the relay chain, with address in body', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ code: 0, data: { account: { balance: '0' } } }));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    await getPolkadotBalance('1dotaddress');

    const call = vi.mocked(fetch).mock.calls[0]!;
    expect(call[0]).toBe('https://assethub-polkadot.api.subscan.io/api/v2/scan/search');
    expect(JSON.parse((call[1] as RequestInit).body as string)).toMatchObject({ key: '1dotaddress' });
  });

  it('returns null when API response code != 0', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ code: 10004, data: null }));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1bad');
    expect(balance).toBeNull();
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

  it('returns null on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ error: 'server error' }, 500));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1fail');
    expect(balance).toBeNull();
  });

  it('returns null when response shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ unexpected: true }));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1bad');
    expect(balance).toBeNull();
  });

  it('returns null when SUBSCAN_API_KEY is empty', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({ config: { SUBSCAN_API_KEY: '' } }));

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    const balance = await getPolkadotBalance('1someaddress');
    expect(balance).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();

    // Put the key BACK. The doMock above is not scoped to this test: without
    // this, every later import in the file gets an empty key and silently
    // returns null, so a suite added below fails for a reason unrelated to
    // what it tests. doUnmock is not enough either — it falls through to the
    // real config, where SUBSCAN_API_KEY defaults to empty and the symptom is
    // identical.
    vi.doMock('../src/config.js', () => ({ config: { SUBSCAN_API_KEY: 'test-subscan-key' } }));
    vi.resetModules();
  });
});

// Polkadot moved balances and staking from the Relay Chain to Asset Hub on
// 2025-11-04. Querying the relay returned residual dust — the treasury holds
// 2,226 DOT there against 24,310,025 DOT on Asset Hub — so every real holder
// read as an almost-empty wallet. An under-count, not a clean failure, which
// is why nothing caught it.
describe('staked DOT is reported for the split, never added to the total', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  // Mirrors the suites above: without resetModules the client is served from
  // the module cache, still bound to a fetch that has since been unstubbed.
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function account(fields: Record<string, string>) {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ code: 0, data: { account: fields } }));
  }

  it('sums bonded and unbonding into the staked figure', async () => {
    account({ balance: '33.6913132936', bonded: '5.6891446119', unbonding: '1.0' });

    const { getPolkadotStakedBalance } = await import('../src/chains/polkadot.js');
    expect(await getPolkadotStakedBalance('1abc')).toBeCloseTo(6.6891446119, 6);
  });

  // THE TRAP. Subscan computes `balance` as free + reserved, and staking is a
  // hold inside reserved, so `balance` already contains `bonded`.
  it('reports balance as the total, with the stake already inside it', async () => {
    account({ balance: '33.6913132936', bonded: '5.6891446119' });

    const { getPolkadotBalance, getPolkadotStakedBalance } = await import('../src/chains/polkadot.js');
    const total = await getPolkadotBalance('1abc');
    const staked = await getPolkadotStakedBalance('1abc');

    expect(total).toBeCloseTo(33.6913132936, 6);
    // The staked figure is a SUBSET, so it must never exceed the total.
    expect(staked!).toBeLessThan(total!);
  });

  it('reports zero staked for an account that has never bonded', async () => {
    account({ balance: '10.0' });

    const { getPolkadotStakedBalance } = await import('../src/chains/polkadot.js');
    expect(await getPolkadotStakedBalance('1abc')).toBe(0);
  });

  it('returns null when the balance cannot be parsed, rather than zero', async () => {
    account({ balance: 'not-a-number' });

    const { getPolkadotBalance } = await import('../src/chains/polkadot.js');
    expect(await getPolkadotBalance('1abc')).toBeNull();
  });
});
