import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearTcgCache, getTradingCard, getTradingCardPrice } from '../src/tcgapi/client.js';

function makeFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

// The price cache is module-level state, so a suite asserting on fetch
// counts has to reset it between cases.
beforeEach(() => _clearTcgCache());

describe('getTradingCardPrice', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when apiKey is empty', async () => {
    expect(await getTradingCardPrice('Charizard', 'pokemon', null, false, '')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns null when fetch fails', async () => {
    vi.stubGlobal('fetch', makeFetch({}, 500));
    expect(await getTradingCardPrice('Charizard', 'pokemon', null, false, 'key')).toBeNull();
  });

  it('returns null when data array is empty', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [] }));
    expect(await getTradingCardPrice('Charizard', 'pokemon', null, false, 'key')).toBeNull();
  });

  it('returns market_price from first result', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [{ name: 'Charizard', market_price: 450.0 }] }));
    expect(await getTradingCardPrice('Charizard', 'pokemon', null, false, 'key')).toBe(450.0);
  });

  it('prefers foil_price when isFoil is true', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [{ name: 'Charizard', market_price: 450.0, foil_price: 800.0 }] }));
    expect(await getTradingCardPrice('Charizard', 'pokemon', null, true, 'key')).toBe(800.0);
  });

  it('falls back to market_price when foil_price is null and isFoil', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [{ name: 'Charizard', market_price: 450.0, foil_price: null }] }));
    expect(await getTradingCardPrice('Charizard', 'pokemon', null, true, 'key')).toBe(450.0);
  });

  it('matches by setName case-insensitively', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        data: [
          { name: 'Charizard', set: 'Base Set', market_price: 450.0 },
          { name: 'Charizard', set: 'Jungle', market_price: 200.0 },
        ],
      }),
    );
    expect(await getTradingCardPrice('Charizard', 'pokemon', 'jungle', false, 'key')).toBe(200.0);
  });

  it('falls back to first result when setName does not match', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        data: [
          { name: 'Charizard', set: 'Base Set', market_price: 450.0 },
          { name: 'Charizard', set: 'Jungle', market_price: 200.0 },
        ],
      }),
    );
    expect(await getTradingCardPrice('Charizard', 'pokemon', 'nonexistent', false, 'key')).toBe(450.0);
  });

  it('returns null when price is null', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [{ name: 'Charizard', market_price: null }] }));
    expect(await getTradingCardPrice('Charizard', 'pokemon', null, false, 'key')).toBeNull();
  });
});

describe('image capture', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns the card image alongside the price', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        data: [{ name: 'Black Lotus', set: 'Alpha', market_price: 50000, image_url: 'https://cdn.tcg/bl.jpg' }],
      }),
    );

    const facts = await getTradingCard('Black Lotus', 'magic', 'Alpha', false, 'k');
    expect(facts).toEqual({ priceUsd: 50000, imageUrl: 'https://cdn.tcg/bl.jpg' });
  });

  // An absent image must not cost us the price that came with it.
  it('returns a null image when the vendor omits one, without losing the price', async () => {
    vi.stubGlobal('fetch', makeFetch({ data: [{ name: 'Some Card', market_price: 3 }] }));

    const facts = await getTradingCard('Some Card', 'magic', null, false, 'k');
    expect(facts).toEqual({ priceUsd: 3, imageUrl: null });
  });

  // The back-compat wrapper: existing callers still get a bare number.
  it('getTradingCardPrice still returns just the price', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({ data: [{ name: 'Black Lotus', market_price: 50000, image_url: 'https://cdn.tcg/bl.jpg' }] }),
    );

    expect(await getTradingCardPrice('Black Lotus', 'magic', null, false, 'k')).toBe(50000);
  });
});
