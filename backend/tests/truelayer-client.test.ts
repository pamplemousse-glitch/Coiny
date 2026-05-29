import { describe, expect, it, vi } from 'vitest';
import {
  buildAuthUrl,
  exchangeCode,
  getAccounts,
  getBalance,
  getTransactions,
  refreshAccessToken,
} from '../src/truelayer/client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockJson(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 401,
    json: () => Promise.resolve(data),
  });
}

describe('buildAuthUrl', () => {
  it('constructs sandbox auth URL with required params', () => {
    const url = buildAuthUrl({ clientId: 'client_abc', redirectUri: 'https://app/cb', env: 'sandbox' });
    expect(url).toContain('auth.truelayer-sandbox.com');
    expect(url).toContain('client_id=client_abc');
    expect(url).toContain('response_type=code');
    expect(url).toContain('offline_access');
  });

  it('constructs live auth URL', () => {
    const url = buildAuthUrl({ clientId: 'live_id', redirectUri: 'https://app/cb', env: 'live' });
    expect(url).toContain('auth.truelayer.com');
    expect(url).not.toContain('sandbox');
  });
});

describe('exchangeCode', () => {
  it('returns tokens on success', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJson({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, token_type: 'Bearer' }),
    );
    const result = await exchangeCode('code', 'cid', 'csec', 'https://cb', 'sandbox');
    expect(result.accessToken).toBe('at');
    expect(result.refreshToken).toBe('rt');
    expect(result.expiresIn).toBe(3600);
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(mockJson({}, false));
    await expect(exchangeCode('bad', 'cid', 'csec', 'https://cb')).rejects.toThrow('401');
  });
});

describe('refreshAccessToken', () => {
  it('returns new access token', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJson({ access_token: 'new_at', refresh_token: 'rt2', expires_in: 7200, token_type: 'Bearer' }),
    );
    const result = await refreshAccessToken('old_rt', 'cid', 'csec', 'sandbox');
    expect(result.accessToken).toBe('new_at');
    expect(result.expiresIn).toBe(7200);
  });
});

describe('getAccounts', () => {
  it('returns mapped accounts', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJson({
        results: [
          {
            account_id: 'acc1',
            account_type: 'TRANSACTION',
            display_name: 'Current Account',
            currency: 'GBP',
            provider: { provider_id: 'monzo', display_name: 'Monzo' },
            update_timestamp: new Date().toISOString(),
          },
        ],
      }),
    );
    const accounts = await getAccounts('token', 'sandbox');
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.accountId).toBe('acc1');
    expect(accounts[0]!.providerId).toBe('monzo');
  });

  it('throws on non-OK', async () => {
    mockFetch.mockResolvedValueOnce(mockJson({}, false));
    await expect(getAccounts('bad_token')).rejects.toThrow();
  });
});

describe('getBalance', () => {
  it('returns current balance from first result', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJson({
        results: [{ currency: 'GBP', available: 900, current: 1000, update_timestamp: new Date().toISOString() }],
      }),
    );
    const balance = await getBalance('token', 'acc1', 'sandbox');
    expect(balance).toBe(1000);
  });

  it('throws when no result returned', async () => {
    mockFetch.mockResolvedValueOnce(mockJson({ results: [] }));
    await expect(getBalance('token', 'acc1')).rejects.toThrow('no balance result');
  });
});

describe('getTransactions', () => {
  it('returns mapped transactions', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJson({
        results: [
          {
            transaction_id: 'tx1',
            normalised_provider_transaction_id: null,
            merchant_name: 'Costa Coffee',
            timestamp: new Date().toISOString(),
            description: 'Coffee purchase',
            amount: -3.5,
            currency: 'GBP',
            transaction_type: 'DEBIT',
            transaction_classification: ['Food & Drink'],
            running_balance: null,
          },
        ],
      }),
    );
    const txns = await getTransactions('token', 'acc1', new Date('2024-01-01'), new Date('2024-01-31'), 'sandbox');
    expect(txns).toHaveLength(1);
    expect(txns[0]!.transactionId).toBe('tx1');
    expect(txns[0]!.merchantName).toBe('Costa Coffee');
    expect(txns[0]!.amount).toBe(-3.5);
  });
});
