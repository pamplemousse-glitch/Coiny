import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  config: {
    DISCOGS_CONSUMER_KEY: 'test-consumer-key',
    DISCOGS_CONSUMER_SECRET: 'test-consumer-secret',
  },
}));

import { DiscogsError, getAccessToken, getRequestToken, getUsername, syncCollection } from '../src/discogs/client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('DiscogsError', () => {
  it('stores status and message', () => {
    const err = new DiscogsError(403, 'forbidden');
    expect(err.status).toBe(403);
    expect(err.message).toBe('forbidden');
    expect(err.name).toBe('DiscogsError');
  });
});

describe('getRequestToken', () => {
  it('returns oauthToken, oauthTokenSecret, and authorizeUrl on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => 'oauth_token=tok123&oauth_token_secret=sec456',
    });

    const result = await getRequestToken();

    expect(result.oauthToken).toBe('tok123');
    expect(result.oauthTokenSecret).toBe('sec456');
    expect(result.authorizeUrl).toContain('tok123');
  });

  it('throws DiscogsError on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(getRequestToken()).rejects.toThrow(DiscogsError);
  });

  it('throws DiscogsError on malformed response missing tokens', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => 'some=other&fields=here',
    });

    await expect(getRequestToken()).rejects.toThrow(DiscogsError);
  });
});

describe('getAccessToken', () => {
  it('returns accessToken and accessTokenSecret on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => 'oauth_token=access_tok&oauth_token_secret=access_sec',
    });

    const result = await getAccessToken('req_tok', 'req_sec', 'verifier123');

    expect(result.accessToken).toBe('access_tok');
    expect(result.accessTokenSecret).toBe('access_sec');
  });

  it('throws DiscogsError on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });

    await expect(getAccessToken('tok', 'sec', 'verifier')).rejects.toThrow(DiscogsError);
  });

  it('throws DiscogsError on malformed response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => 'bad=response',
    });

    await expect(getAccessToken('tok', 'sec', 'verifier')).rejects.toThrow(DiscogsError);
  });
});

describe('getUsername', () => {
  it('returns username from identity endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'vinyl_fan' }),
    });

    const username = await getUsername('access_tok', 'access_sec');
    expect(username).toBe('vinyl_fan');
  });

  it('throws DiscogsError on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(getUsername('tok', 'sec')).rejects.toThrow(DiscogsError);
  });

  it('throws DiscogsError if username missing from response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 123 }),
    });

    await expect(getUsername('tok', 'sec')).rejects.toThrow(DiscogsError);
  });
});

describe('syncCollection', () => {
  it('returns totals for a collection with priced releases', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          releases: [
            { basic_information: { id: 101 } },
            { basic_information: { id: 102 } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ num_for_sale: 5, lowest_price: { value: 12.5, currency: 'USD' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ num_for_sale: 3, lowest_price: { value: 20.0, currency: 'USD' } }),
      });

    const result = await syncCollection('vinyl_fan', 'tok', 'sec');

    expect(result.releaseCount).toBe(2);
    expect(result.pricedCount).toBe(2);
    expect(result.totalUsd).toBeCloseTo(32.5);
  });

  it('skips releases with no USD price', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          releases: [{ basic_information: { id: 201 } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ num_for_sale: 2, lowest_price: { value: 10.0, currency: 'EUR' } }),
      });

    const result = await syncCollection('vinyl_fan', 'tok', 'sec');

    expect(result.releaseCount).toBe(1);
    expect(result.pricedCount).toBe(0);
    expect(result.totalUsd).toBe(0);
  });

  it('handles empty collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ releases: [] }),
    });

    const result = await syncCollection('vinyl_fan', 'tok', 'sec');

    expect(result.releaseCount).toBe(0);
    expect(result.pricedCount).toBe(0);
    expect(result.totalUsd).toBe(0);
  });

  it('throws DiscogsError when collection fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(syncCollection('vinyl_fan', 'tok', 'sec')).rejects.toThrow(DiscogsError);
  });

  it('counts null marketplace price as unpriced', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          releases: [{ basic_information: { id: 301 } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ num_for_sale: 0, lowest_price: null }),
      });

    const result = await syncCollection('vinyl_fan', 'tok', 'sec');

    expect(result.pricedCount).toBe(0);
    expect(result.totalUsd).toBe(0);
  });
});
