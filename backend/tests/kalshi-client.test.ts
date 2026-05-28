import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock node:crypto so buildHeaders doesn't require a real RSA key
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    createSign: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      sign: vi.fn().mockReturnValue('fakesig=='),
    }),
  };
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { decodePrivateKey, getPortfolioBalance, KalshiError } from '../src/kalshi/client.js';

beforeEach(() => {
  mockFetch.mockReset();
});

describe('KalshiError', () => {
  it('stores status and message', () => {
    const err = new KalshiError(401, 'unauthorized');
    expect(err.status).toBe(401);
    expect(err.message).toBe('unauthorized');
    expect(err.name).toBe('KalshiError');
  });
});

describe('decodePrivateKey', () => {
  it('round-trips base64 encoding and decoding', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nFAKE\n-----END RSA PRIVATE KEY-----\n';
    const b64 = Buffer.from(pem).toString('base64');
    expect(decodePrivateKey(b64)).toBe(pem);
  });
});

describe('getPortfolioBalance', () => {
  const KEY_ID = 'test-key-id';
  const FAKE_PEM_B64 = Buffer.from('-----BEGIN RSA PRIVATE KEY-----\nFAKE\n-----END RSA PRIVATE KEY-----\n').toString(
    'base64',
  );

  it('returns portfolio_value in USD (cents → dollars)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ portfolio_value: 50000, balance: 10000 }),
    });

    const balance = await getPortfolioBalance(KEY_ID, FAKE_PEM_B64);
    expect(balance).toBe(500); // 50000 cents → $500
  });

  it('falls back to balance field when portfolio_value absent', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ balance: 25000 }),
    });

    const balance = await getPortfolioBalance(KEY_ID, FAKE_PEM_B64);
    expect(balance).toBe(250); // 25000 cents → $250
  });

  it('returns 0 when both fields absent', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const balance = await getPortfolioBalance(KEY_ID, FAKE_PEM_B64);
    expect(balance).toBe(0);
  });

  it('throws KalshiError on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(getPortfolioBalance(KEY_ID, FAKE_PEM_B64)).rejects.toThrow(KalshiError);
  });
});
