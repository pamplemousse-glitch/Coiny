import { describe, expect, it, vi } from 'vitest';
import { cachedByKey, PRICE_TTL } from '../src/util/price-cache.js';

describe('cachedByKey', () => {
  it('calls the underlying function once for repeated identical calls', async () => {
    const fn = vi.fn(async (metal: string) => `${metal}-price`);
    const cached = cachedByKey(1000, (m: string) => m, fn);

    expect(await cached('gold')).toBe('gold-price');
    expect(await cached('gold')).toBe('gold-price');
    expect(await cached('gold')).toBe('gold-price');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('keeps different keys apart', async () => {
    const fn = vi.fn(async (metal: string) => `${metal}-price`);
    const cached = cachedByKey(1000, (m: string) => m, fn);

    expect(await cached('gold')).toBe('gold-price');
    expect(await cached('silver')).toBe('silver-price');

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('refetches once the TTL has passed', async () => {
    vi.useFakeTimers();
    try {
      let n = 0;
      const fn = vi.fn(async () => ++n);
      const cached = cachedByKey(1000, () => 'k', fn);

      expect(await cached()).toBe(1);
      vi.advanceTimersByTime(1001);
      expect(await cached()).toBe(2);

      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  // The behaviour a plain TTL map does NOT give you, and the one that actually
  // matters here: the scheduler refreshes with a concurrency of five, so five
  // users can ask for the gold price before any answer has arrived. A cache
  // that only stores settled values would miss all five and buy five prices.
  it('de-duplicates concurrent calls that arrive before the first resolves', async () => {
    let resolve: (v: number) => void = () => {};
    const fn = vi.fn(
      () =>
        new Promise<number>((r) => {
          resolve = r;
        }),
    );
    const cached = cachedByKey(1000, () => 'k', fn);

    const all = Promise.all([cached(), cached(), cached(), cached(), cached()]);
    resolve(42);

    expect(await all).toEqual([42, 42, 42, 42, 42]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // A sticky cached failure would be worse than no cache: an absent price is
  // now treated as "unknown" rather than zero, so caching a blip would suppress
  // a real holding for the whole TTL.
  it('never caches a rejection', async () => {
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('vendor blip');
      return 'ok';
    });
    const cached = cachedByKey(60_000, () => 'k', fn);

    await expect(cached()).rejects.toThrow('vendor blip');
    // Immediately after, well inside the TTL: the failure must not be serving.
    expect(await cached()).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('lets a later caller retry after a concurrent batch all failed', async () => {
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('down');
      return 'recovered';
    });
    const cached = cachedByKey(60_000, () => 'k', fn);

    const results = await Promise.allSettled([cached(), cached()]);
    expect(results.every((r) => r.status === 'rejected')).toBe(true);

    expect(await cached()).toBe('recovered');
  });

  it('evicts oldest entries rather than growing without bound', async () => {
    const fn = vi.fn(async (k: number) => k);
    const cached = cachedByKey(60_000, (k: number) => String(k), fn);

    for (let i = 0; i < 2_100; i++) await cached(i);
    expect(fn).toHaveBeenCalledTimes(2_100);

    // The most recent key is still cached.
    await cached(2_099);
    expect(fn).toHaveBeenCalledTimes(2_100);

    // The oldest was evicted, so it costs a fetch.
    await cached(0);
    expect(fn).toHaveBeenCalledTimes(2_101);
  });

  it('clear() drops everything', async () => {
    const fn = vi.fn(async () => 'v');
    const cached = cachedByKey(60_000, () => 'k', fn);

    await cached();
    cached.clear();
    await cached();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('PRICE_TTL', () => {
  // These are chosen against networth/classes.ts FRESHNESS, not against how
  // fast the market moves. SPOT matches one scheduler tick (R-16.2), which is
  // what collapses a batch of due users into a single upstream call.
  it('matches one scheduler tick for spot prices', () => {
    expect(PRICE_TTL.SPOT).toBe(15 * 60 * 1000);
  });

  it('is never fresher than it needs to be', () => {
    expect(PRICE_TTL.FX).toBeGreaterThan(PRICE_TTL.SPOT);
    expect(PRICE_TTL.COLLECTIBLE).toBeGreaterThan(PRICE_TTL.FX);
    expect(PRICE_TTL.STATISTICAL).toBeGreaterThan(PRICE_TTL.COLLECTIBLE);
  });
});

describe('a resolved failure value is not cached', () => {
  // The defect this test exists for: several clients return `null` to mean
  // "could not price this" rather than throwing. Caching that null would serve
  // "no price" for the whole TTL after one bad request — a week, at the
  // STATISTICAL tier. Rejections were already excluded; resolved nulls were
  // not, and the first version of this cache stored them.
  it('retries after a null rather than serving it for the whole TTL', async () => {
    let attempt = 0;
    const fn = vi.fn(async (): Promise<number | null> => {
      attempt += 1;
      return attempt === 1 ? null : 42;
    });
    const cached = cachedByKey(
      60_000,
      () => 'k',
      fn,
      (v) => v !== null,
    );

    expect(await cached()).toBeNull();
    expect(await cached()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('still caches a legitimate value under the same predicate', async () => {
    const fn = vi.fn(async (): Promise<number | null> => 7);
    const cached = cachedByKey(
      60_000,
      () => 'k',
      fn,
      (v) => v !== null,
    );

    expect(await cached()).toBe(7);
    expect(await cached()).toBe(7);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('the price clients expose a cache reset', () => {
  // Guards the wiring: the cache existing proves nothing if a client still
  // calls the vendor directly. Each wrapped client exports a clear seam.
  it.each([
    ['metals', () => import('../src/metals/client.js').then((m) => m.getMetalSpotPrice.clear)],
    ['eia', () => import('../src/eia/client.js').then((m) => m._clearEiaCache)],
    ['usda', () => import('../src/usda/client.js').then((m) => m._clearFarmlandCache)],
    ['tcgapi', () => import('../src/tcgapi/client.js').then((m) => m._clearTcgCache)],
    ['pcgs', () => import('../src/pcgs/client.js').then((m) => m._clearPcgsCache)],
    ['pokemonpricetracker', () => import('../src/pokemonpricetracker/client.js').then((m) => m._clearPokemonCache)],
  ])('%s exposes a clear seam', async (_name, load) => {
    expect(typeof (await load())).toBe('function');
  });
});
