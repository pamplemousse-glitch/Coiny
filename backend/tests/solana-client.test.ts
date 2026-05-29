import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  } as unknown as Response;
}

function makeBalanceResponse(lamports: number): unknown {
  return {
    jsonrpc: '2.0',
    id: 1,
    result: { value: lamports, context: { slot: 123 } },
  };
}

describe('getSolanaBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns correct SOL amount converted from lamports (÷ 1e9)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(makeBalanceResponse(5_000_000_000)));

    const { getSolanaBalance } = await import('../src/chains/solana.js');
    const balance = await getSolanaBalance('SomeAddress123', 'test-api-key');
    expect(balance).toBeCloseTo(5, 9);
  });

  it('calls the Helius RPC endpoint with the API key in the URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(makeBalanceResponse(1_000_000_000)));

    const { getSolanaBalance } = await import('../src/chains/solana.js');
    await getSolanaBalance('SomeAddress123', 'my-key');

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('helius-rpc.com');
    expect(url).toContain('api-key=my-key');
  });

  it('sends getBalance JSON-RPC method with address as param', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(makeBalanceResponse(2_000_000_000)));

    const { getSolanaBalance } = await import('../src/chains/solana.js');
    await getSolanaBalance('MyWalletAddr', 'test-api-key');

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { method: string; params: string[] };
    expect(body.method).toBe('getBalance');
    expect(body.params[0]).toBe('MyWalletAddr');
  });

  it('throws HeliusRpcError on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 503));

    const { getSolanaBalance, HeliusRpcError } = await import('../src/chains/solana.js');
    await expect(getSolanaBalance('SomeAddress123', 'test-api-key')).rejects.toBeInstanceOf(HeliusRpcError);
  });

  it('throws when API key is empty string', async () => {
    const { getSolanaBalance } = await import('../src/chains/solana.js');
    await expect(getSolanaBalance('SomeAddress123', '')).rejects.toThrow('HELIUS_API_KEY is required');
  });

  it('returns 0 when response shape is unexpected', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getSolanaBalance } = await import('../src/chains/solana.js');
    const balance = await getSolanaBalance('SomeAddress123', 'test-api-key');
    expect(balance).toBe(0);
  });

  it('handles zero lamports balance', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(makeBalanceResponse(0)));

    const { getSolanaBalance } = await import('../src/chains/solana.js');
    const balance = await getSolanaBalance('EmptyWallet', 'test-api-key');
    expect(balance).toBe(0);
  });
});

function makeStakeAccountsResponse(lamportsList: number[]): unknown {
  return {
    jsonrpc: '2.0',
    id: 1,
    result: lamportsList.map((lamports, i) => ({
      pubkey: `StakeAccount${i}`,
      account: { lamports, owner: 'Stake11111111111111111111111111111111111111112', executable: false, rentEpoch: 0 },
    })),
  };
}

describe('getSolanaStakedBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sums lamports across all stake accounts and converts to SOL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(makeStakeAccountsResponse([1_000_000_000, 2_000_000_000])));

    const { getSolanaStakedBalance } = await import('../src/chains/solana.js');
    const balance = await getSolanaStakedBalance('MyWallet', 'test-key');
    expect(balance).toBeCloseTo(3, 9);
  });

  it('returns 0 when no stake accounts found', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(makeStakeAccountsResponse([])));

    const { getSolanaStakedBalance } = await import('../src/chains/solana.js');
    const balance = await getSolanaStakedBalance('MyWallet', 'test-key');
    expect(balance).toBe(0);
  });

  it('returns 0 when API key is empty', async () => {
    const { getSolanaStakedBalance } = await import('../src/chains/solana.js');
    const balance = await getSolanaStakedBalance('MyWallet', '');
    expect(balance).toBe(0);
  });

  it('returns 0 on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, 500));

    const { getSolanaStakedBalance } = await import('../src/chains/solana.js');
    const balance = await getSolanaStakedBalance('MyWallet', 'test-key');
    expect(balance).toBe(0);
  });

  it('returns 0 on unexpected response shape', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse({ unexpected: true }));

    const { getSolanaStakedBalance } = await import('../src/chains/solana.js');
    const balance = await getSolanaStakedBalance('MyWallet', 'test-key');
    expect(balance).toBe(0);
  });

  it('sends getProgramAccounts with staker memcmp filter at offset 12', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(makeStakeAccountsResponse([])));

    const { getSolanaStakedBalance } = await import('../src/chains/solana.js');
    await getSolanaStakedBalance('MyWalletAddr', 'test-key');

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      method: string;
      params: [string, { filters: Array<{ memcmp: { offset: number; bytes: string } }> }];
    };
    expect(body.method).toBe('getProgramAccounts');
    expect(body.params[1]!.filters[0]!.memcmp.offset).toBe(12);
    expect(body.params[1]!.filters[0]!.memcmp.bytes).toBe('MyWalletAddr');
  });
});

describe('getSolanaTotalBalance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sums liquid + staked balance', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchResponse(makeBalanceResponse(3_000_000_000))) // liquid
      .mockResolvedValueOnce(makeFetchResponse(makeStakeAccountsResponse([2_000_000_000]))); // staked

    const { getSolanaTotalBalance } = await import('../src/chains/solana.js');
    const total = await getSolanaTotalBalance('MyWallet', 'test-key');
    expect(total).toBeCloseTo(5, 9);
  });

  it('returns only liquid balance if staking call fails', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchResponse(makeBalanceResponse(4_000_000_000)))
      .mockRejectedValueOnce(new Error('network error'));

    const { getSolanaTotalBalance } = await import('../src/chains/solana.js');
    const total = await getSolanaTotalBalance('MyWallet', 'test-key');
    expect(total).toBeCloseTo(4, 9);
  });
});
