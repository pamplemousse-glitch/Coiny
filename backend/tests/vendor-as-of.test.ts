import { describe, expect, it, vi } from 'vitest';
import type { PlaidHolding, PlaidSecurity } from '../src/plaid/types.js';

// The freshness system (networth/classes.ts) measures age against `asOf`, and
// `asOf` was always OUR fetch time. Wherever the vendor tells us when the
// number was actually struck, that is the honest input.

function holding(over: Partial<PlaidHolding> = {}): PlaidHolding {
  return {
    account_id: 'a',
    security_id: 's1',
    institution_price: 10,
    institution_value: 100,
    quantity: 10,
    cost_basis: null,
    ...over,
  };
}

const SEC: PlaidSecurity = { security_id: 's1', name: 'X', ticker_symbol: 'X', type: 'equity' };

describe('Plaid institution pricing time', () => {
  it('prefers the datetime over the date-only field', async () => {
    const { summariseHoldings } = await import('../src/goals/snapshot.js');
    const r = summariseHoldings(
      [holding({ institution_price_as_of: '2026-08-14', institution_price_datetime: '2026-08-14T20:00:00Z' })],
      [SEC],
    );

    expect(r.oldestPricedAt?.toISOString()).toBe('2026-08-14T20:00:00.000Z');
  });

  it('falls back to the date when no datetime is sent', async () => {
    const { summariseHoldings } = await import('../src/goals/snapshot.js');
    const r = summariseHoldings([holding({ institution_price_as_of: '2026-08-14' })], [SEC]);

    expect(r.oldestPricedAt?.toISOString().slice(0, 10)).toBe('2026-08-14');
  });

  // A class is only as fresh as its stalest contributor, the rule rollupRows
  // already applies across rows.
  it('takes the OLDEST pricing time across holdings', async () => {
    const { summariseHoldings } = await import('../src/goals/snapshot.js');
    const r = summariseHoldings(
      [
        holding({ security_id: 's1', institution_price_as_of: '2026-08-18' }),
        holding({ security_id: 's1', institution_price_as_of: '2026-08-11' }),
      ],
      [SEC],
    );

    expect(r.oldestPricedAt?.toISOString().slice(0, 10)).toBe('2026-08-11');
  });

  it('reports null when no holding carries a pricing time, so the caller keeps its own', async () => {
    const { summariseHoldings } = await import('../src/goals/snapshot.js');
    expect(summariseHoldings([holding()], [SEC]).oldestPricedAt).toBeNull();
  });

  it('ignores an unparseable pricing time rather than guessing at it', async () => {
    const { summariseHoldings } = await import('../src/goals/snapshot.js');
    expect(summariseHoldings([holding({ institution_price_as_of: 'not-a-date' })], [SEC]).oldestPricedAt).toBeNull();
  });
});

describe('GoldAPI quote time', () => {
  // Metals markets close at weekends: a Sunday sync returns Friday's close.
  // GoldAPI sends the instant in the same response we already pay for.
  it('reads the unix timestamp as the quote instant', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({ config: { GOLDAPI_API_KEY: 'k' } }));
    vi.doMock('../src/util/fetch.js', () => ({
      fetchWithRetry: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ price: 2400, timestamp: 1_787_000_000, datetime: '2026-08-13T00:00:00Z' }),
      }),
    }));

    const { getMetalSpotPrice } = await import('../src/metals/client.js');
    const spot = await getMetalSpotPrice('XAU');

    expect(spot.priceUsd).toBe(2400);
    expect(spot.asOf?.getTime()).toBe(1_787_000_000 * 1000);
  });

  it('falls back to datetime when no timestamp is sent', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({ config: { GOLDAPI_API_KEY: 'k' } }));
    vi.doMock('../src/util/fetch.js', () => ({
      fetchWithRetry: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ price: 30, datetime: '2026-08-13T00:00:00Z' }),
      }),
    }));

    const { getMetalSpotPrice } = await import('../src/metals/client.js');
    const spot = await getMetalSpotPrice('XAG');

    expect(spot.asOf?.toISOString()).toBe('2026-08-13T00:00:00.000Z');
  });

  // Null leaves the caller on its own fetch time, which is what it did before.
  it('reports null when the vendor sends neither, rather than inventing one', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', () => ({ config: { GOLDAPI_API_KEY: 'k' } }));
    vi.doMock('../src/util/fetch.js', () => ({
      fetchWithRetry: vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ price: 1000 }) }),
    }));

    const { getMetalSpotPrice } = await import('../src/metals/client.js');
    expect((await getMetalSpotPrice('XPT')).asOf).toBeNull();
  });
});
