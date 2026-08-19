/**
 * A TTL memo for vendor data that is the SAME for every user.
 *
 * The price of gold does not vary by customer. Neither does a Charizard, a
 * 1909 penny, the WTI spot price, or the GBP/USD rate. Those calls were being
 * made once per user per refresh, so a thousand users holding gold bought a
 * thousand identical answers.
 *
 * `coinbase/client.ts` already did this correctly with a 60-second module-level
 * cache; this is that idea extracted so the other price clients can share it
 * rather than each growing its own copy.
 *
 * WHAT THIS IS NOT FOR: anything scoped to a user. A balance, a holdings list,
 * a wallet. Caching those across users would serve one person's money to
 * another, which is the worst bug this codebase could have. The rule is: if the
 * answer would differ between two users given the same arguments, it does not
 * belong here.
 */

type Entry<T> = { value: T; expiresAt: number };

/** Ceiling on distinct keys per cache. Card and coin lookups are keyed by
 *  product id, so an unbounded map would grow with the catalogue rather than
 *  with the data we actually reuse. Oldest-inserted is evicted first, which is
 *  right for price data: a key nobody has asked for recently is the one least
 *  likely to be asked for next. */
const MAX_ENTRIES = 2_000;

export type CachedFn<A extends unknown[], T> = ((...args: A) => Promise<T>) & {
  /** Drops everything. Tests use this; nothing in production should need it. */
  clear: () => void;
};

/**
 * Wraps an async function so identical calls inside `ttlMs` share one result.
 *
 * Two behaviours that a plain TTL map does not give you, and both matter here:
 *
 *  - **In-flight de-duplication.** The scheduler refreshes with a concurrency of
 *    five, so five users can ask for the gold price in the same millisecond,
 *    before any answer has arrived. A cache that only stores *settled* values
 *    would miss all five and buy five prices. Storing the in-flight promise
 *    means the other four wait on the first one's request.
 *
 *  - **Failures are never cached.** A rejected promise is evicted, so a vendor
 *    blip does not become a cached error served for the whole TTL. This matters
 *    more than usual here: an absent price is now treated as "unknown" rather
 *    than zero, so a sticky failure would suppress a real holding.
 */
export function cachedByKey<A extends unknown[], T>(
  ttlMs: number,
  keyOf: (...args: A) => string,
  fn: (...args: A) => Promise<T>,
  /**
   * Whether a RESOLVED value is worth storing. Defaults to always.
   *
   * Not every failure is a rejection. Several of these clients return `null`
   * to mean "could not price this" rather than throwing, and caching that
   * null would serve "no price" for the whole TTL after a single vendor blip.
   * At the STATISTICAL TTL that is a week of a holding reading as unpriced
   * because of one bad request. Pass `(v) => v !== null` for those.
   */
  shouldCache: (value: T) => boolean = () => true,
): CachedFn<A, T> {
  const settled = new Map<string, Entry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  const wrapped = async (...args: A): Promise<T> => {
    const key = keyOf(...args);
    const now = Date.now();

    const hit = settled.get(key);
    if (hit && hit.expiresAt > now) return hit.value;

    const pending = inFlight.get(key);
    if (pending) return pending;

    const promise = fn(...args)
      .then((value) => {
        if (!shouldCache(value)) return value;
        if (settled.size >= MAX_ENTRIES) {
          const oldest = settled.keys().next();
          if (!oldest.done) settled.delete(oldest.value);
        }
        settled.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, promise);
    return promise;
  };

  wrapped.clear = () => {
    settled.clear();
    inFlight.clear();
  };

  return wrapped as CachedFn<A, T>;
}

/**
 * TTLs, chosen against `networth/classes.ts` FRESHNESS rather than against how
 * fast the underlying market moves.
 *
 * The reasoning, because it is counter-intuitive: a cache does not decide how
 * fresh a user's number is, the refresh cadence does. Metals are already
 * `WEEKLY_KEEP` (fresh for seven days, never excluded for age), so a price
 * fifteen minutes old feeds a figure that is allowed to be a week old. The
 * cache only decides whether two users refreshing in the same window buy the
 * same answer twice.
 *
 * SPOT matches one scheduler tick (R-16.2), which is what makes it effective:
 * the scheduler processes all due users inside a tick, so one tick's worth of
 * TTL collapses that entire batch into a single upstream call.
 */
export const PRICE_TTL = {
  /** Commodities, metals, crypto spot. One scheduler tick. */
  SPOT: 15 * 60 * 1000,
  /** FX. Rates are published continuously but move slowly at this scale. */
  FX: 60 * 60 * 1000,
  /** Collectibles: cards, coins, sneakers. Comps-based, they do not move
   *  intraday, and FRESHNESS already allows these a week. */
  COLLECTIBLE: 24 * 60 * 60 * 1000,
  /** Official statistical series (farmland, energy) published monthly or
   *  quarterly. Refetching sooner re-downloads an unchanged figure. */
  STATISTICAL: 7 * 24 * 60 * 60 * 1000,
} as const;
