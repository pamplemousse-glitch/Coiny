import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  config: { KICKSDB_API_KEY: 'test-key' },
}));

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('getSneakerPrice', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns min_price when no size specified', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({
        data: [{ id: '1', title: 'Jordan 1', sku: 'DZ5485-612', min_price: 350, variants: [] }],
      }),
    );

    const { getSneakerPrice } = await import('../src/kicksdb/client.js');
    const price = await getSneakerPrice('DZ5485-612');
    expect(price).toBe(350);
  });

  it('returns lowest_ask for matching size', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({
        data: [
          {
            id: '1',
            title: 'Jordan 1',
            sku: 'DZ5485-612',
            min_price: 350,
            variants: [
              { size: '10', lowest_ask: 380 },
              { size: '10.5', lowest_ask: 420 },
            ],
          },
        ],
      }),
    );

    const { getSneakerPrice } = await import('../src/kicksdb/client.js');
    const price = await getSneakerPrice('DZ5485-612', '10.5');
    expect(price).toBe(420);
  });

  it('matches "M {size}" variant format', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({
        data: [
          {
            id: '1',
            title: 'Jordan 1',
            sku: 'DZ5485-612',
            min_price: 350,
            variants: [{ size: 'M 10', lowest_ask: 395 }],
          },
        ],
      }),
    );

    const { getSneakerPrice } = await import('../src/kicksdb/client.js');
    const price = await getSneakerPrice('DZ5485-612', '10');
    expect(price).toBe(395);
  });

  it('returns null when no products found', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ data: [] }));

    const { getSneakerPrice } = await import('../src/kicksdb/client.js');
    const price = await getSneakerPrice('UNKNOWN-SKU');
    expect(price).toBeNull();
  });

  it('throws KicksDbError on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ error: 'unauthorized' }, 401));

    const { getSneakerPrice, KicksDbError } = await import('../src/kicksdb/client.js');
    await expect(getSneakerPrice('DZ5485-612')).rejects.toBeInstanceOf(KicksDbError);
  });
});
