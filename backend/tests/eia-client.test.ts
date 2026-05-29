import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllEiaSpotPrices, getEiaSpotPrice } from '../src/eia/client.js';

function makeFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

const okBody = {
  response: { data: [{ period: '2024-01-01', value: 75.5 }] },
};

describe('getEiaSpotPrice', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when apiKey is empty', async () => {
    expect(await getEiaSpotPrice('wti_crude', '')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns null when fetch fails', async () => {
    vi.stubGlobal('fetch', makeFetch({}, 500));
    expect(await getEiaSpotPrice('wti_crude', 'key')).toBeNull();
  });

  it('returns null when response does not match schema', async () => {
    vi.stubGlobal('fetch', makeFetch({ unexpected: true }));
    expect(await getEiaSpotPrice('wti_crude', 'key')).toBeNull();
  });

  it('returns null when data array is empty', async () => {
    vi.stubGlobal('fetch', makeFetch({ response: { data: [] } }));
    expect(await getEiaSpotPrice('wti_crude', 'key')).toBeNull();
  });

  it('returns null when value is null', async () => {
    vi.stubGlobal('fetch', makeFetch({ response: { data: [{ period: '2024-01-01', value: null }] } }));
    expect(await getEiaSpotPrice('wti_crude', 'key')).toBeNull();
  });

  it('returns the spot price for wti_crude', async () => {
    vi.stubGlobal('fetch', makeFetch(okBody));
    expect(await getEiaSpotPrice('wti_crude', 'key')).toBe(75.5);
  });

  it('returns the spot price for brent_crude', async () => {
    vi.stubGlobal('fetch', makeFetch(okBody));
    expect(await getEiaSpotPrice('brent_crude', 'key')).toBe(75.5);
  });

  it('returns the spot price for natural_gas', async () => {
    vi.stubGlobal('fetch', makeFetch(okBody));
    expect(await getEiaSpotPrice('natural_gas', 'key')).toBe(75.5);
  });
});

describe('getAllEiaSpotPrices', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns a map with all three commodity prices when all succeed', async () => {
    vi.stubGlobal('fetch', makeFetch(okBody));
    const result = await getAllEiaSpotPrices('key');
    expect(result.size).toBe(3);
    expect(result.get('wti_crude')).toBe(75.5);
    expect(result.get('brent_crude')).toBe(75.5);
    expect(result.get('natural_gas')).toBe(75.5);
  });

  it('returns empty map when apiKey is empty', async () => {
    const result = await getAllEiaSpotPrices('');
    expect(result.size).toBe(0);
  });

  it('omits entries with null prices', async () => {
    vi.stubGlobal('fetch', makeFetch({}, 500));
    const result = await getAllEiaSpotPrices('key');
    expect(result.size).toBe(0);
  });
});
